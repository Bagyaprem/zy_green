import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { FileText, Download, Calendar, CheckCircle, Database, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ReportsPage.module.scss';
import './ReportsPage.css';

export const ReportsPage = () => {
  const { readings, loading } = useAppStore();
  const [exporting, setExporting] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const TABLE_PAGE_SIZE = 20;
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filter records based on start and end date
  const getFilteredReadings = () => {
    const start = startDate ? new Date(startDate) : new Date(0);
    const end = endDate ? new Date(endDate) : new Date();

    return readings.filter(item => {
      const t = new Date(item.created_at).getTime();
      return t >= start.getTime() && t <= end.getTime();
    });
  };

  const activeReadings = getFilteredReadings();

  // Compute key summary statistics
  const getStats = () => {
    if (activeReadings.length === 0) return null;
    let sumCo2 = 0, minCo2 = Infinity, maxCo2 = -Infinity;
    let sumPm25 = 0, minPm25 = Infinity, maxPm25 = -Infinity;

    activeReadings.forEach(r => {
      sumCo2 += r.co2;
      if (r.co2 < minCo2) minCo2 = r.co2;
      if (r.co2 > maxCo2) maxCo2 = r.co2;

      sumPm25 += Number(r.pm25);
      if (Number(r.pm25) < minPm25) minPm25 = Number(r.pm25);
      if (Number(r.pm25) > maxPm25) maxPm25 = Number(r.pm25);
    });

    return {
      avgCo2: Math.round(sumCo2 / activeReadings.length),
      minCo2, maxCo2,
      avgPm25: Math.round(sumPm25 / activeReadings.length),
      minPm25, maxPm25,
    };
  };

  const stats = getStats();

  // Export PDF Report
  const exportPDF = () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      
      // Page 1: Branded Cover and Stats
      doc.setFillColor(34, 197, 94); // ZyGreen green
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor(255, 255, 255);
      doc.text('ZYGREEN ATMOSPHERIC AUDIT', 14, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Monitoring Air Today for a Cleaner Tomorrow', 14, 34);
      
      // Document Metadata
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`Scope Range: ${startDate ? new Date(startDate).toLocaleDateString() : 'All'} to ${endDate ? new Date(endDate).toLocaleDateString() : 'Now'}`, 14, 60);
      doc.text(`Total Telemetry Packets: ${activeReadings.length}`, 14, 68);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 76);

      if (stats) {
        // Summary stats block
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, 86, 182, 45, 3, 3, 'FD');
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Summary Statistics', 20, 93);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`CO2 Concentration:   Avg: ${stats.avgCo2} ppm  |  Min: ${stats.minCo2} ppm  |  Max: ${stats.maxCo2} ppm`, 20, 101);
        doc.text(`PM2.5 Particles:      Avg: ${stats.avgPm25} ug  |  Min: ${stats.minPm25} ug  |  Max: ${stats.maxPm25} ug`, 20, 109);

        // Insights block
        doc.roundedRect(14, 140, 182, 45, 3, 3, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text('Environmental Insights & Actionable Recommendations:', 14, 147);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        
        let rec = 'Environmental metrics are within nominal limits. Standard fresh air circulation is optimal.';
        if (stats.avgCo2 > 1000) {
          rec = 'ALERT: CO2 levels exceed fresh threshold. Action: Open ventilation inlets and increase HVAC fan flow rate.';
        }
        
        doc.text(rec, 14, 155);
      }

      // Page 2: Telemetry Data Table
      doc.addPage();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(34, 197, 94);
      doc.text('Complete Telemetry Dataset', 14, 15);

      const columns = ['Timestamp', 'PM1.0', 'PM2.5', 'PM4.0', 'PM10', 'CO2', 'Temp', 'Humidity'];
      const rows = activeReadings.map(item => [
        new Date(item.created_at).toLocaleString(),
        `${Number(item.pm1)} ug/m³`,
        `${Number(item.pm25)} ug/m³`,
        `${Number(item.pm4)} ug/m³`,
        `${item.pm10} ug/m³`,
        `${item.co2} ppm`,
        `${item.temperature}°C`,
        `${item.humidity}%`
      ]);

      autoTable(doc, {
        startY: 22,
        head: [columns],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [34, 197, 94] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        styles: { fontSize: 8, font: 'helvetica' },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Page ${data.pageNumber}`, 190, 285);
          doc.text('ZyGreen Atmospheric Data Compliance System', 14, 285);
        }
      });

      doc.save(`zygreen_environmental_audit_${startDate ? startDate.slice(0,10) : 'all'}_to_${endDate ? endDate.slice(0,10) : 'now'}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
    setExporting(false);
  };

  // Export Excel Report
  const exportExcel = () => {
    setExporting(true);
    try {
      const formatted = activeReadings.map(item => ({
        Timestamp: new Date(item.created_at).toLocaleString(),
        'PM1.0 (ug/m3)': Number(item.pm1),
        'PM2.5 (ug/m3)': Number(item.pm25),
        'PM4.0 (ug/m3)': Number(item.pm4),
        'PM10 (ug/m3)': item.pm10,
        'CO2 (ppm)': item.co2,
        'Temperature (C)': item.temperature,
        'Humidity (%)': item.humidity
      }));

      const ws = XLSX.utils.json_to_sheet(formatted);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ZyGreen Telemetry Logs');
      XLSX.writeFile(wb, `zygreen_environmental_audit_${startDate ? startDate.slice(0,10) : 'all'}_to_${endDate ? endDate.slice(0,10) : 'now'}.xlsx`);
    } catch (err) {
      console.error('Failed to export Excel:', err);
    }
    setExporting(false);
  };

  // Export CSV Format
  const exportCSV = () => {
    setExporting(true);
    try {
      const headers = ['Timestamp', 'PM1.0 (ug)', 'PM2.5 (ug)', 'PM4.0 (ug)', 'PM10 (ug)', 'CO2 (ppm)', 'Temp (C)', 'Humidity (%)'];
      const rows = activeReadings.map(item => [
        `"${new Date(item.created_at).toISOString()}"`,
        Number(item.pm1),
        Number(item.pm25),
        Number(item.pm4),
        item.pm10,
        item.co2,
        item.temperature,
        item.humidity
      ]);
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `zygreen_environmental_audit_${startDate ? startDate.slice(0,10) : 'all'}_to_${endDate ? endDate.slice(0,10) : 'now'}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
    setExporting(false);
  };

  return (
    <div className={styles.workspace}>
      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Compliance & Reports Suite</h1>
            <p className={styles.subtitle}>Generate branded environmental logs, spreadsheets, and carbon compliance audits</p>
          </div>
        </div>

        {/* Configurations grid */}
        <div className={styles.bodyGrid}>
          <div className={styles.configCard}>
            <h3 className={styles.cardTitle}>Report Configurations</h3>
            
            <div className={styles.customRangeGroup}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  <Calendar size={14} /> Start Date
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={styles.input}
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>
                  <Calendar size={14} /> End Date
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <div className={styles.statsPreview}>
              <div className={styles.statPreviewItem}>
                <Database size={14} className={styles.previewIcon} />
                <div className={styles.previewMeta}>
                  <span>Target Packets</span>
                  <strong>{activeReadings.length} measurement points</strong>
                </div>
              </div>
              <div className={styles.statPreviewItem}>
                <CheckCircle size={14} className={styles.previewIcon} />
                <div className={styles.previewMeta}>
                  <span>Audit Standard</span>
                  <strong>EPA Validated Conversions</strong>
                </div>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button
                onClick={exportPDF}
                disabled={exporting || activeReadings.length === 0}
                className={styles.pdfBtn}
              >
                <Download size={16} /> Download Branded PDF
              </button>
              
              <button
                onClick={exportExcel}
                disabled={exporting || activeReadings.length === 0}
                className={styles.excelBtn}
              >
                <Download size={16} /> Download Excel Spreadsheet
              </button>

              <button
                onClick={exportCSV}
                disabled={exporting || activeReadings.length === 0}
                className={styles.csvBtn}
              >
                <Download size={16} /> Download CSV Format
              </button>
            </div>
          </div>

          {/* Preview column */}
          <div className={styles.previewCard}>
            <h3 className={styles.cardTitle}>Live Document Preview</h3>
            <div className={styles.docMockup}>
              <div className={styles.docHeader}>
                <h4>ZYGREEN ATMOSPHERIC AUDIT REPORT</h4>
                <span>Scope: {startDate ? new Date(startDate).toLocaleDateString() : 'All'} → {endDate ? new Date(endDate).toLocaleDateString() : 'Now'} • Size: {activeReadings.length} points</span>
              </div>
              
              <div className={styles.docBody}>
                {stats && (
                  <div className={styles.mockStatsSummary}>
                    <div><strong>Avg CO₂:</strong> {stats.avgCo2} ppm</div>
                    <div><strong>Avg PM2.5:</strong> {stats.avgPm25} ug</div>
                  </div>
                )}
                <div className={styles.mockTable}>
                  <div className={styles.mockRowHeader}>
                    <span>Timestamp</span>
                    <span>PM1.0</span>
                    <span>PM2.5</span>
                    <span>PM4.0</span>
                    <span>PM10</span>
                    <span>CO2</span>
                    <span>Temp</span>
                    <span>Humidity</span>
                  </div>
                  {activeReadings.slice(0, 4).map((item, idx) => (
                    <div key={idx} className={styles.mockRow}>
                      <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                      <span>{Number(item.pm1)}</span>
                      <span>{Number(item.pm25)}</span>
                      <span>{Number(item.pm4)}</span>
                      <span>{item.pm10}</span>
                      <span>{item.co2}</span>
                      <span>{item.temperature}</span>
                      <span>{item.humidity}</span>
                    </div>
                  ))}
                  {activeReadings.length > 4 && (
                    <div className={styles.mockEllipsis}>... and {activeReadings.length - 4} more records ...</div>
                  )}
                  {activeReadings.length === 0 && (
                    <div className={styles.mockEmpty}>No records found matching date filter</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Full data table ── */}
        <div className="rp-table-section">
          <div className="rp-table-header">
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
                Today's Sensor Readings
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                {loading ? 'Loading…' : `${activeReadings.length} records`}
              </p>
            </div>
          </div>

          <div className="rp-table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  {['Timestamp','PM1.0','PM2.5','PM4.0','PM10','CO₂','Temp','Humidity'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>Loading data from Supabase…</td></tr>
                ) : activeReadings.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No data for today. Make sure your ESP32 is running.</td></tr>
                ) : (
                  [...activeReadings]
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice((tablePage - 1) * TABLE_PAGE_SIZE, tablePage * TABLE_PAGE_SIZE)
                    .map((row, i) => (
                      <tr key={row.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '9px 12px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0' }}>{Number(row.pm1)} µg</td>
                        <td style={{ padding: '9px 12px', color: '#eab308' }}>{Number(row.pm25)} µg</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0' }}>{Number(row.pm4)} µg</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0' }}>{row.pm10} µg</td>
                        <td style={{ padding: '9px 12px', color: Number(row.co2) > 1000 ? '#f97316' : '#22c55e' }}>{row.co2} ppm</td>
                        <td style={{ padding: '9px 12px', color: '#0ea5e9' }}>{row.temperature}°C</td>
                        <td style={{ padding: '9px 12px', color: '#e2e8f0' }}>{row.humidity}%</td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {activeReadings.length > TABLE_PAGE_SIZE && (
            <div className="rp-pagination">
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                Page {tablePage} of {Math.ceil(activeReadings.length / TABLE_PAGE_SIZE)}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setTablePage(p => Math.max(1, p - 1))}
                  disabled={tablePage === 1}
                  className="rp-pag-btn"
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: tablePage === 1 ? '#334155' : '#94a3b8', cursor: tablePage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setTablePage(p => Math.min(Math.ceil(activeReadings.length / TABLE_PAGE_SIZE), p + 1))}
                  disabled={tablePage === Math.ceil(activeReadings.length / TABLE_PAGE_SIZE)}
                  className="rp-pag-btn"
                  style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer' }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
