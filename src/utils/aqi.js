/**
 * AQI calculation utilities following EPA guidelines
 */

export function getAQIDetails(aqi) {
  if (aqi <= 50) {
    return {
      level: aqi, label: 'Good', hex: '#22c55e', textHex: '#4ade80',
      description: 'Air quality is satisfactory, and air pollution poses little or no risk.',
      advice: ['Great day for outdoor activities.', 'Perfect time to ventilate indoor spaces.', 'No special precautions needed.']
    };
  } else if (aqi <= 100) {
    return {
      level: aqi, label: 'Moderate', hex: '#eab308', textHex: '#facc15',
      description: 'Air quality is acceptable. However, there may be a risk for unusually sensitive people.',
      advice: ['Sensitive individuals should monitor symptoms.', 'Consider reducing heavy outdoor exertion.', 'Good air quality for most people.']
    };
  } else if (aqi <= 150) {
    return {
      level: aqi, label: 'Unhealthy for Sensitive Groups', hex: '#f97316', textHex: '#fb923c',
      description: 'Members of sensitive groups may experience health effects.',
      advice: ['Sensitive groups: Reduce outdoor exertion.', 'Keep windows closed near pollution sources.', 'Asthmatics: Keep quick-relief inhaler handy.']
    };
  } else if (aqi <= 200) {
    return {
      level: aqi, label: 'Unhealthy', hex: '#ef4444', textHex: '#f87171',
      description: 'Some members of the general public may experience health effects.',
      advice: ['Avoid prolonged outdoor physical activity.', 'Wear N95 mask if outdoors.', 'Run air purifiers indoors and close windows.']
    };
  } else if (aqi <= 300) {
    return {
      level: aqi, label: 'Very Unhealthy', hex: '#9333ea', textHex: '#c084fc',
      description: 'Health alert: Increased risk for everyone.',
      advice: ['Avoid all outdoor physical exertion.', 'Remain indoors with air purifiers active.', 'Wear N95/FFP2 masks for essential outdoor travel.']
    };
  } else {
    return {
      level: aqi, label: 'Hazardous', hex: '#581c87', textHex: '#f43f5e',
      description: 'Health warning of emergency conditions.',
      advice: ['Strictly remain indoors; seal doors & windows.', 'Avoid any physical exertion.', 'Ensure air purifiers running at max speed.']
    };
  }
}

export function calculatePM25AQI(pm25) {
  const c = Math.round(pm25 * 10) / 10;
  if (c >= 0 && c <= 12.0) return calcLinear(50, 0, 12.0, 0, c);
  if (c >= 12.1 && c <= 35.4) return calcLinear(100, 51, 35.4, 12.1, c);
  if (c >= 35.5 && c <= 55.4) return calcLinear(150, 101, 55.4, 35.5, c);
  if (c >= 55.5 && c <= 150.4) return calcLinear(200, 151, 150.4, 55.5, c);
  if (c >= 150.5 && c <= 250.4) return calcLinear(300, 201, 250.4, 150.5, c);
  if (c >= 250.5 && c <= 350.4) return calcLinear(400, 301, 350.4, 250.5, c);
  if (c >= 350.5 && c <= 500.4) return calcLinear(500, 401, 500.4, 350.5, c);
  return 500;
}

function calcLinear(iHigh, iLow, cHigh, cLow, c) {
  return Math.round(((iHigh - iLow) / (cHigh - cLow)) * (c - cLow) + iLow);
}
