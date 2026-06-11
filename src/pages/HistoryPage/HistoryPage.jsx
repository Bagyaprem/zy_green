import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import styles from './HistoryPage.module.scss';
import './HistoryPage.css';

export const HistoryPage = () => {
  const { readings, loading, loadReadings } = useAppStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  const itemsPerPage = 10;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredReadings = readings;

  // Sort readings
  const sortedReadings = [...filteredReadings].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (sortField === 'created_at') {
      return sortOrder === 'asc' 
        ? new Date(aVal) - new Date(bVal)
        : new Date(bVal) - new Date(aVal);
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return bVal > aVal ? 1 : -1;
    }
  });

  // Pagination
  const totalPages = Math.ceil(sortedReadings.length / itemsPerPage);
  const paginatedReadings = sortedReadings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className={styles.workspace}>
      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>Measurement History</h1>
            <p className={styles.subtitle}>
              {loading ? 'Loading data...' : `${readings.length} records from Supabase`}
            </p>
          </div>
          <button
            onClick={loadReadings}
            className={styles.refreshBtn}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', borderRadius: '8px', color: '#0ea5e9', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '13px' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>

        {/* Table logs */}
        <div className={styles.tableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => handleSort('created_at')}>
                    Timestamp <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => handleSort('pm1')}>
                    PM1.0 <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => handleSort('pm25')}>
                    PM2.5 <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => handleSort('pm4')}>
                    PM4.0 <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => handleSort('pm10')}>
                    PM10 <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => handleSort('co2')}>
                    CO₂ <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => handleSort('temperature')}>
                    Temp <ArrowUpDown size={12} />
                  </th>
                  <th onClick={() => handleSort('humidity')}>
                    Humidity <ArrowUpDown size={12} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyRow}>
                      Loading data from Supabase...
                    </td>
                  </tr>
                ) : paginatedReadings.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={styles.emptyRow}>
                      No records found. Make sure your ESP32 is running and sending data.
                    </td>
                  </tr>
                ) : (
                  paginatedReadings.map((reading) => (
                    <tr key={reading.id || reading.created_at}>
                      <td className={styles.timeCol}>
                        {new Date(reading.created_at).toLocaleString([], {
                          year: 'numeric', month: 'short', day: '2-digit',
                          hour: '2-digit', minute: '2-digit', second: '2-digit'
                        })}
                      </td>
                      <td>{Number(reading.pm1)}</td>
                      <td>{Number(reading.pm25)}</td>
                      <td>{Number(reading.pm4)}</td>
                      <td>{reading.pm10}</td>
                      <td>{reading.co2}</td>
                      <td>{reading.temperature}°C</td>
                      <td>{reading.humidity}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <span className={styles.pageInfo}>
                Showing page <strong>{currentPage}</strong> of {totalPages}
              </span>
              <div className={styles.paginationBtns}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={styles.pagBtn}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={styles.pagBtn}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
