/**
 * ZyGreen IoT Simulator - ESP32 Telemetry Generator
 * 
 * This script simulates an ESP32 hardware device pushing sensor readings
 * directly to the Supabase Database REST API.
 * 
 * Usage:
 *   node simulate_esp32.js <SUPABASE_URL> <SUPABASE_ANON_KEY> [DEVICE_ID]
 */

if (process.argv.length < 4) {
  console.log('🌱 ZyGreen ESP32 Simulator');
  console.log('-------------------------');
  console.log('Error: Missing credentials.');
  console.log('Usage: node simulate_esp32.js <SUPABASE_URL> <SUPABASE_ANON_KEY> [DEVICE_ID]');
  process.exit(1);
}

const supabaseUrl = process.argv[2];
const supabaseKey = process.argv[3];
const deviceId = process.argv[4] || 'ESP32_001';

const endpoint = `${supabaseUrl}/rest/v1/sensor_readings`;

console.log(`🚀 Starting ESP32 Telemetry stream...`);
console.log(`📍 Endpoint: ${endpoint}`);
console.log(`🔑 Client Node ID: ${deviceId}`);
console.log(`⏱️ Interval: 10 seconds (Ctrl+C to stop)`);

let basePm25 = 15;
let baseCo2 = 415;

const calculateAQI = (pm25) => {
  // Simple linear AQI calculation PM2.5
  if (pm25 <= 12) return Math.round((50 / 12) * pm25);
  if (pm25 <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm25 - 12.1) + 51);
  if (pm25 <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm25 - 35.5) + 101);
  if (pm25 <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm25 - 55.5) + 151);
  return 201;
};

const sendPayload = async () => {
  // Generate random walks
  basePm25 = Math.max(3, Math.min(220, basePm25 + (Math.random() - 0.48) * 6));
  baseCo2 = Math.max(380, Math.min(1500, baseCo2 + (Math.random() - 0.48) * 30));
  
  const pm2_5 = Math.round(basePm25);
  const pm1_0 = Math.round(pm2_5 * 0.75);
  const pm4_0 = Math.round(pm2_5 * 1.12);
  const pm10 = Math.round(pm2_5 * 1.4);
  const co2 = Math.round(baseCo2);
  const temperature = Math.round((24 + Math.sin(Date.now() / 100000) * 4 + (Math.random() - 0.5)) * 10) / 10;
  const humidity = Math.round(55 + Math.cos(Date.now() / 100000) * 10 + (Math.random() - 0.5) * 4);
  const aqi = calculateAQI(pm2_5);

  const payload = {
    device_id: deviceId,
    pm1_0,
    pm2_5,
    pm4_0,
    pm10,
    co2,
    temperature,
    humidity,
    aqi
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`[${new Date().toLocaleTimeString()}] HTTP 201 Created | PM2.5: ${pm2_5} ug/m³, CO2: ${co2} ppm, AQI: ${aqi} (${aqi > 100 ? 'Breach Alert' : 'Normal'})`);
    } else {
      const errText = await response.text();
      console.error(`[${new Date().toLocaleTimeString()}] Error ${response.status}: ${errText}`);
    }
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Network connection error:`, error.message);
  }
};

// Start ticking
sendPayload();
setInterval(sendPayload, 10000);
