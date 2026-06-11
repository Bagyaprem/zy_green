import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Sliders, Cpu, Save, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './SettingsPage.module.scss';
import './SettingsPage.css';

export const SettingsPage = () => {
  const { settings, updateThresholds, registerDevice } = useAppStore();
  
  // Local threshold form states initialized from store
  const [pm25Limit, setPm25Limit] = useState(settings.thresholds.pm2_5);
  const [co2Limit, setCo2Limit] = useState(settings.thresholds.co2);

  // Local ESP32 register form states
  const [newDevId, setNewDevId] = useState('');
  const [newDevName, setNewDevName] = useState('');

  const handleSaveThresholds = (e) => {
    e.preventDefault();
    updateThresholds({
      pm2_5: parseFloat(pm25Limit),
      co2: parseInt(co2Limit)
    });
    toast.success('Environmental thresholds updated successfully');
  };

  const handleRegisterDevice = (e) => {
    e.preventDefault();
    if (!newDevId || !newDevName) {
      toast.error('Please fill in all hardware parameters');
      return;
    }
    registerDevice({
      device_id: newDevId,
      name: newDevName
    });
    toast.success(`Registered hardware node: ${newDevId}`);
    setNewDevId('');
    setNewDevName('');
  };

  return (
    <div className={styles.workspace}>
      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <div className={styles.titleArea}>
            <h1 className={styles.title}>System Settings</h1>
            <p className={styles.subtitle}>Configure alert thresholds, device registers, and automation policies</p>
          </div>
        </div>

        {/* Configurations Forms Grid */}
        <div className={styles.formsGrid}>
          {/* Thresholds Form */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <Sliders size={18} /> Alert Thresholds
            </h3>
            <form onSubmit={handleSaveThresholds} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>PM2.5 Warning Level (µg/m³)</label>
                <input
                  type="number"
                  step="0.1"
                  value={pm25Limit}
                  onChange={(e) => setPm25Limit(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>CO₂ Critical Threshold (ppm)</label>
                <input
                  type="number"
                  value={co2Limit}
                  onChange={(e) => setCo2Limit(e.target.value)}
                  className={styles.input}
                />
              </div>


              <button type="submit" className={styles.submitBtn}>
                <Save size={16} /> Save Threshold Limits
              </button>
            </form>
          </div>

          {/* Hardware Registration Form */}
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>
              <Cpu size={18} /> Register ESP32 Device
            </h3>
            <form onSubmit={handleRegisterDevice} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Device Serial ID</label>
                <input
                  type="text"
                  placeholder="e.g. ESP32_004"
                  value={newDevId}
                  onChange={(e) => setNewDevId(e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Placement Nickname</label>
                <input
                  type="text"
                  placeholder="e.g. Office Sensor"
                  value={newDevName}
                  onChange={(e) => setNewDevName(e.target.value)}
                  className={styles.input}
                />
              </div>

              <button type="submit" className={styles.submitBtn}>
                <Plus size={16} /> Provision Hardware Node
              </button>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
};
