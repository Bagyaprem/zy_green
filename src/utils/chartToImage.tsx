import { createRoot } from 'react-dom/client';
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

/**
 * Renders a single-series line chart off-screen and rasterizes it to a PNG
 * data URL, for embedding in a jsPDF report. Recharts renders to SVG, which
 * jsPDF can't embed directly - html2canvas bridges that gap by rasterizing
 * the rendered DOM. A fixed pixel size (not ResponsiveContainer) is used
 * because ResponsiveContainer sizes itself off a live layout/ResizeObserver,
 * which behaves unreliably against an off-screen, unattached-to-viewport node.
 */
export async function renderSensorChartPng(data: ChartPoint[], meta: ChartStyle): Promise<string | null> {
  if (!data.length) return null;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${CHART_WIDTH}px`;
  container.style.height = `${CHART_HEIGHT}px`;
  container.style.background = '#ffffff';
  document.body.appendChild(container);

  const root = createRoot(container);

  try {
    await new Promise<void>((resolve) => {
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
      // Recharts/SVG needs a couple of frames to actually paint before html2canvas reads the DOM.
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    // Dynamically imported (~200KB) so it's only ever fetched when a PDF report
    // is actually being generated, not bundled into the app's main chunk.
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(container, { backgroundColor: '#ffffff', scale: 2 });
    return canvas.toDataURL('image/png');
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
