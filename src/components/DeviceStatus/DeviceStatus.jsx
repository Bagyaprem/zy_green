import React from 'react';
import { Radio, Battery, Wifi, ShieldAlert } from 'lucide-react';
import styles from './DeviceStatus.module.scss';
import './DeviceStatus.css';

export const DeviceStatus = ({ devices }) => {
  const getSignalStrength = (rssi) => {
    if (!rssi) return 'Unknown';
    if (rssi >= -67) return 'Excellent';
    if (rssi >= -75) return 'Good';
    if (rssi >= -85) return 'Fair';
    return 'Weak';
  };

  return (
    <div className={styles.deviceContainer}>
      <h3 className={styles.title}>Physical Hardware Nodes</h3>
      
      <div className={styles.list}>
        {devices.map(device => (
          <div key={device.device_id} className={styles.deviceItem}>
            {/* Left side node title & state */}
            <div className={styles.meta}>
              <div className={styles.info}>
                <span className={styles.name}>{device.name}</span>
                <span className={styles.id}>{device.device_id}</span>
              </div>
              <div className={`${styles.statusBadge} ${styles[device.status]}`}>
                <Radio size={12} className={styles.pulseIcon} />
                <span>{device.status}</span>
              </div>
            </div>

            {/* Right side diagnostics stats */}
            <div className={styles.diagnostics}>
              <div className={styles.metric}>
                <Battery size={14} className={device.battery < 20 ? styles.batteryCritical : ''} />
                <span>{device.battery ?? 100}%</span>
              </div>
              
              <div className={styles.metric}>
                <Wifi size={14} />
                <span>{getSignalStrength(device.signal)}</span>
              </div>

              <div className={styles.metric}>
                <span className={styles.label}>Last Seen:</span>
                <span className={styles.time}>
                  {new Date(device.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
