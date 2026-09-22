import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

interface ChartPoint {
  recordedAt: string;
  value: number;
}

interface ChartStyle {
  label: string;
  unit: string;
  color: string;
}

const CHART_WIDTH = 720;
const CHART_HEIGHT = 300;

/** Rasterize at 2x so axis text stays crisp once jsPDF scales the image down to the page width. */
const RASTER_SCALE = 2;

/**
 * Matches the PDF's body font (jsPDF's built-in helvetica). The serialized SVG
 * is rendered detached from the document, so it inherits nothing from the page
 * and has to name its own font or the browser falls back to a serif default
 * that looks nothing like the rest of the report.
 */
const CHART_FONT = 'Helvetica, Arial, sans-serif';

/**
 * Renders a single-series line chart off-screen and rasterizes it to a PNG
 * data URL, for embedding in a jsPDF report.
 *
 * Recharts renders to SVG, which jsPDF can't embed directly. This used to
 * bridge that gap with html2canvas, waiting two requestAnimationFrame ticks
 * for the chart to paint first. Both halves of that were unsound:
 *
 *   - `root.render()` does not commit synchronously in React 18 - it schedules
 *     concurrent work. Two rAF ticks was a guess at when the commit landed,
 *     and under load (a month of readings in memory, eight charts in a row) it
 *     lost the race and html2canvas captured an empty div: a blank chart page.
 *   - requestAnimationFrame does not fire at all in a backgrounded tab, so
 *     tabbing away mid-generation left this promise permanently unresolved.
 *     Report generation hung rather than failing, which meant the caller's
 *     Failed-status fallback never ran and the request sat on Pending forever.
 *
 * So don't wait for a paint at all. flushSync forces the commit to complete
 * before it returns, and the SVG recharts produced is then serialized and
 * decoded straight into a canvas - neither step is frame-driven, so both work
 * identically in a foreground and a background tab.
 */
export async function renderSensorChartPng(data: ChartPoint[], meta: ChartStyle): Promise<string | null> {
  if (!data.length) return null;

  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${CHART_WIDTH}px`;
  container.style.height = `${CHART_HEIGHT}px`;
  container.style.background = '#ffffff';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    // Synchronous commit: the SVG below is in the DOM by the time this returns.
    flushSync(() => {
      root.render(
        <LineChart width={CHART_WIDTH} height={CHART_HEIGHT} data={data} margin={{ top: 10, right: 24, left: 4, bottom: 10 }}>
          <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
          <XAxis
            dataKey="recordedAt"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v: string) => new Date(v).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            minTickGap={60}
          />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} width={44} label={{ value: meta.unit, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6b7280' }} />
          <Line type="natural" dataKey="value" stroke={meta.color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      );
    });

    const svg = await waitForChartSvg(container);
    // Never hand back a blank image: a missing SVG means the chart genuinely
    // didn't render, and the caller states that omission rather than printing
    // an empty white card.
    if (!svg) return null;

    return await svgToPng(svg);
  } finally {
    root.unmount();
    container.remove();
  }
}

/**
 * Returns the chart's <svg> once it actually holds a plotted line, or null if
 * it never does.
 *
 * flushSync above should make this a single synchronous hit - explicit
 * width/height (no ResponsiveContainer, so no ResizeObserver) and
 * isAnimationActive={false} mean recharts has everything it needs to emit the
 * finished chart in one commit. This bounded retry only covers the case where
 * some future recharts version defers part of that to a second commit.
 *
 * Deliberately setTimeout and not requestAnimationFrame: rAF is exactly what
 * made the previous implementation hang forever in a backgrounded tab. Timers
 * are throttled when hidden but they do still fire, so this terminates either
 * way - it returns null and the caller prints a stated omission.
 */
async function waitForChartSvg(container: HTMLElement): Promise<SVGSVGElement | null> {
  const ATTEMPTS = 20;
  const DELAY_MS = 25;

  for (let i = 0; i < ATTEMPTS; i++) {
    const svg = container.querySelector('svg');
    // The <path> is the plotted line itself. An <svg> with axes but no path
    // is a half-committed chart, which would rasterize into an empty grid.
    if (svg?.querySelector('path')) return svg;
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
  }

  return container.querySelector('svg');
}

/** Serializes an on-DOM <svg> and draws it into a canvas at RASTER_SCALE, returning a PNG data URL. */
async function svgToPng(svg: SVGSVGElement): Promise<string | null> {
  const width = Number(svg.getAttribute('width')) || CHART_WIDTH;
  const height = Number(svg.getAttribute('height')) || CHART_HEIGHT;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.style.fontFamily = CHART_FONT;

  // encodeURIComponent, not btoa: axis and unit labels carry non-ASCII
  // (µg/m³, °C, CO₂) and btoa throws on any byte above U+00FF.
  const serialized = new XMLSerializer().serializeToString(clone);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;

  const img = new Image();
  img.src = svgUrl;
  // decode() resolves off the frame clock, so this still completes while the
  // tab is in the background - unlike the rAF wait it replaces.
  await img.decode();

  const canvas = document.createElement('canvas');
  canvas.width = width * RASTER_SCALE;
  canvas.height = height * RASTER_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // The SVG itself is transparent; the PDF page behind it is white.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // A data: URL SVG with no external references doesn't taint the canvas,
  // so toDataURL is safe here.
  return canvas.toDataURL('image/png');
}
