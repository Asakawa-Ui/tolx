import { IcingAlgorithmDef, FlightDataPoint, AlgorithmOutput } from '../types';

export const ALGORITHMS: IcingAlgorithmDef[] = [
  {
    id: 'lwc',
    name: 'LWC',
    type: 'sensor',
    unit: 'g/m³',
    minVal: 0,
    maxVal: 2.5,
    defaultThresholds: { light: 0.5, moderate: 1.2, severe: 1.8 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'time',
    name: 'Time',
    type: 'ordinary',
    unit: 'min',
    minVal: 0,
    maxVal: 120,
    defaultThresholds: { light: 30, moderate: 60, severe: 90 }
  },
  {
    id: 'ic_index',
    name: 'IC指数',
    type: 'ordinary',
    unit: '',
    minVal: 0,
    maxVal: 10,
    defaultThresholds: { light: 3, moderate: 6, severe: 8.5 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'ic_improved',
    name: 'IC改进',
    type: 'ordinary',
    unit: '',
    minVal: 0,
    maxVal: 10,
    defaultThresholds: { light: 3, moderate: 6, severe: 8.5 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'temp_frost',
    name: '假霜点温度',
    type: 'ordinary',
    unit: '',
    minVal: -40,
    maxVal: 10,
    defaultThresholds: { light: -15, moderate: -5, severe: 5 },
    levelLabels: { none: '无积冰', light: '有积冰', moderate: '中度以上积冰', severe: '中度以上积冰' }
  },
  {
    id: 'icing_index',
    name: '积冰指数',
    type: 'ordinary',
    unit: '',
    minVal: 0,
    maxVal: 100,
    defaultThresholds: { light: 25, moderate: 50, severe: 75 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '轻-中度积冰', severe: '重度积冰' }
  },
  {
    id: 'xgb1',
    name: 'XGB1',
    type: 'ml',
    unit: '',
    minVal: 0,
    maxVal: 1,
    defaultThresholds: { light: 0.25, moderate: 0.55, severe: 0.8 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'xgb2',
    name: 'XGB2',
    type: 'ml',
    unit: '',
    minVal: 0,
    maxVal: 1,
    defaultThresholds: { light: 0.3, moderate: 0.6, severe: 0.85 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'xgb3',
    name: 'XGB3',
    type: 'ml',
    unit: '',
    minVal: 0,
    maxVal: 1,
    defaultThresholds: { light: 0.2, moderate: 0.5, severe: 0.75 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'xgb4',
    name: 'XGB4',
    type: 'ml',
    unit: '',
    minVal: 0,
    maxVal: 1,
    defaultThresholds: { light: 0.35, moderate: 0.65, severe: 0.85 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  }
];

// Generate flight path from Shanghai Pudong (31.14N, 121.80E) to Beijing Capital (40.08N, 116.58E)
export function generateFlightData(
  startHour: number = 12,
  startMin: number = 0,
  icingSeverity: 'none' | 'light' | 'heavy' = 'heavy',
  durationHours: number = 1,
  stepSeconds: number = 60
): FlightDataPoint[] {
  const points: FlightDataPoint[] = [];
  const startLat = 31.1433;
  const startLng = 121.8053;
  const endLat = 40.0801;
  const endLng = 116.5845;
  
  const totalDurationSeconds = durationHours * 3600;
  const totalSteps = Math.floor(totalDurationSeconds / stepSeconds);

  const climbSteps = Math.round(totalSteps * 0.25);
  const descendSteps = Math.round(totalSteps * 0.20);
  const cruiseEnd = totalSteps - descendSteps;

  for (let i = 0; i <= totalSteps; i++) {
    const fraction = i / totalSteps;
    // Linear path with some minor jitter for flight realism
    const rawLat = startLat + (endLat - startLat) * fraction;
    const rawLng = startLng + (endLng - startLng) * fraction;
    
    // Add minor atmospheric wiggle (varying slightly based on start time)
    const seedOffset = (startHour * 13 + startMin * 7) % 10;
    const lat = rawLat + Math.sin(fraction * Math.PI * 6 + seedOffset) * 0.04;
    const lng = rawLng + Math.cos(fraction * Math.PI * 6 + seedOffset) * 0.04;

    const elapsedSeconds = i * stepSeconds;
    const elapsedMinutes = elapsedSeconds / 60;

    // Time generation (starts at custom hour/min, dynamic stepSeconds)
    const totalSeconds = startMin * 60 + elapsedSeconds;
    const hour = (startHour + Math.floor(totalSeconds / 3600)) % 24;
    const min = Math.floor((totalSeconds % 3600) / 60);
    const sec = totalSeconds % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    const timestamp = 1783771200000 + (startHour * 3600 + startMin * 60 + elapsedSeconds) * 1000;

    // Altitude profile: climb, cruise at 7500m, descend
    let altitude = 1500;
    if (i < climbSteps) {
      altitude = 1500 + (6000 * (i / climbSteps)); // climb to 7500m
    } else if (i <= cruiseEnd) {
      altitude = 7500 + Math.sin(elapsedMinutes * 0.5 + seedOffset) * 50; // cruise
    } else {
      altitude = 7500 - (6000 * ((i - cruiseEnd) / descendSteps)); // descend
    }

    // Speed profile: weather modification aircraft max speed between 400-500km/h (e.g. cruise at 440km/h)
    let speed = 440;
    if (i < climbSteps) {
      speed = 360 + (80 * (i / climbSteps)); // climbs from 360 to 440
    } else if (i > cruiseEnd) {
      speed = 440 - (120 * ((i - cruiseEnd) / descendSteps)); // descends from 440 to 320
    }
    // Add small realistic speed fluctuations (+- 4 km/h) during cruise
    if (i >= climbSteps && i <= cruiseEnd) {
      speed += Math.sin(elapsedMinutes * 0.8 + seedOffset) * 4;
    }

    // Heading calculation (from current point to next, approx 325 degrees)
    let heading = 325;
    if (i < totalSteps) {
      const nextFraction = (i + 1) / totalSteps;
      const nextLat = startLat + (endLat - startLat) * nextFraction;
      const nextLng = startLng + (endLng - startLng) * nextFraction;
      const dLng = (nextLng - lng) * Math.PI / 180;
      const lat1 = lat * Math.PI / 180;
      const lat2 = nextLat * Math.PI / 180;
      const y = Math.sin(dLng) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
      heading = Math.round(((Math.atan2(y, x) * 180 / Math.PI + 360) % 360));
    }

    // Build algorithm outputs representing a cloud moisture structure
    let inCloud = false;
    let cloudIntensity = 0;
    
    if (icingSeverity === 'heavy') {
      const startCloud = Math.round(totalSteps * 0.267);
      const endCloud = Math.round(totalSteps * 0.70);
      inCloud = i >= startCloud && i <= endCloud;
      if (inCloud) {
        const center = totalSteps * 0.483;
        const width = totalSteps * 0.217;
        cloudIntensity = Math.max(0, 1 - Math.pow((i - center) / width, 2));
      }
    } else if (icingSeverity === 'light') {
      const startCloud = Math.round(totalSteps * 0.333);
      const endCloud = Math.round(totalSteps * 0.633);
      inCloud = i >= startCloud && i <= endCloud;
      if (inCloud) {
        const center = totalSteps * 0.483;
        const width = totalSteps * 0.150;
        cloudIntensity = Math.max(0, 0.45 - 0.45 * Math.pow((i - center) / width, 2));
      }
    } else {
      inCloud = false;
      cloudIntensity = 0;
    }

    const algorithms: Record<string, AlgorithmOutput> = {};

    ALGORITHMS.forEach(algo => {
      // Base output value
      let value = 0;
      if (inCloud) {
        // Each algorithm responds differently to mimic real-world variance
        let noise = Math.sin(elapsedMinutes * 1.5) * 0.08; // algorithmic noise
        
        if (algo.id === 'lwc') {
          value = Math.max(0, Math.min(2.5, cloudIntensity * 2.1 + noise * 0.15));
        } else if (algo.id === 'time') {
          value = Math.min(120, (cloudIntensity * 90 + 10) + noise * 10);
        } else if (algo.id === 'ic_index') {
          value = Math.max(0, Math.min(10, cloudIntensity * 8.5 + noise * 0.5));
        } else if (algo.id === 'ic_improved') {
          value = Math.max(0, Math.min(10, cloudIntensity * 8.2 + Math.cos(elapsedMinutes) * 0.4));
        } else if (algo.id === 'temp_frost') {
          value = Math.max(-40, Math.min(10, (cloudIntensity * 40 - 35) + noise * 5));
        } else if (algo.id === 'icing_index') {
          value = Math.max(0, Math.min(100, cloudIntensity * 85 + noise * 12));
        } else if (algo.id === 'xgb1') {
          value = Math.max(0, Math.min(1, cloudIntensity * 0.88 + Math.cos(elapsedMinutes * 0.8) * 0.02));
        } else if (algo.id === 'xgb2') {
          value = Math.max(0, Math.min(1, Math.pow(cloudIntensity, 1.2) * 0.92 + noise * 0.04));
        } else if (algo.id === 'xgb3') {
          value = Math.max(0, Math.min(1, cloudIntensity * 0.85 + Math.sin(elapsedMinutes * 1.1) * 0.03));
        } else if (algo.id === 'xgb4') {
          // Keep physical sensor-like growth or simulation
          const deiceStart = Math.round(totalSteps * 0.533);
          const deiceEnd = Math.round(totalSteps * 0.567);
          const startCloud = icingSeverity === 'heavy' ? Math.round(totalSteps * 0.267) : Math.round(totalSteps * 0.333);
          if (i < deiceStart) {
            const durationInCloud = i - startCloud;
            const growthRate = 0.045 * (60 / totalSteps);
            value = Math.max(0, Math.min(0.95, (durationInCloud * growthRate) + noise * 0.02));
          } else if (i >= deiceStart && i <= deiceEnd) {
            const deiceProgress = (i - (deiceStart - 1)) / (deiceEnd - deiceStart + 1);
            value = Math.max(0.04, 0.85 - deiceProgress * 0.8);
          } else {
            value = Math.max(0.04, 0.08 + (cloudIntensity * 0.3));
          }
        }
      } else {
        // Out of cloud, very low background values or zero
        const randomNoise = Math.sin(elapsedMinutes + seedOffset);
        if (algo.id === 'lwc') value = 0.02 + Math.abs(randomNoise) * 0.04;
        else if (algo.id === 'time') value = 5 + Math.abs(randomNoise) * 5;
        else if (algo.id === 'ic_index') value = 0.1 + Math.abs(randomNoise) * 0.2;
        else if (algo.id === 'ic_improved') value = 0.1 + Math.abs(randomNoise) * 0.15;
        else if (algo.id === 'temp_frost') value = -35 + Math.abs(randomNoise) * 3;
        else if (algo.id === 'icing_index') value = 8 + Math.abs(randomNoise) * 4;
        else if (algo.id === 'xgb1') value = 0.02 + Math.abs(randomNoise) * 0.03;
        else if (algo.id === 'xgb2') value = 0.01 + Math.abs(randomNoise) * 0.02;
        else if (algo.id === 'xgb3') value = 0.02 + Math.abs(randomNoise) * 0.03;
        else if (algo.id === 'xgb4') value = 0.01 + Math.abs(randomNoise) * 0.02;
      }

      // Round to nice decimals
      value = Math.round(value * 100) / 100;

      // Determine level based on default thresholds
      let level: 'None' | 'Light' | 'Moderate' | 'Severe' = 'None';
      if (value >= algo.defaultThresholds.severe) level = 'Severe';
      else if (value >= algo.defaultThresholds.moderate) level = 'Moderate';
      else if (value >= algo.defaultThresholds.light) level = 'Light';

      algorithms[algo.id] = {
        algorithmId: algo.id,
        algorithmName: algo.name,
        value,
        level
      };
    });

    // Compute max distance (km) inversely proportional to average icing intensity
    let maxDistance = 120;
    if (inCloud) {
      maxDistance = 100 - (cloudIntensity * 85);
    }
    maxDistance = Math.round(Math.max(12, maxDistance));
    if (maxDistance > 100) maxDistance = 100;

    points.push({
      id: i,
      time: timeStr,
      timestamp,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lng * 10000) / 10000,
      altitude: Math.round(altitude),
      speed: Math.round(speed),
      heading,
      algorithms,
      maxDistance
    });
  }

  return points;
}

export const WAYPOINTS = [
  { name: '上海浦东 (ZSPD)', lat: 31.1433, lng: 121.8053 },
  { name: '南通 VORTAC', lat: 32.0722, lng: 120.9744 },
  { name: '临沂 WPT', lat: 35.0450, lng: 118.3481 },
  { name: '济南 VOR', lat: 36.8521, lng: 116.9850 },
  { name: '沧州 NDB', lat: 38.3044, lng: 116.8322 },
  { name: '北京首都 (ZBAA)', lat: 40.0801, lng: 116.5845 }
];
