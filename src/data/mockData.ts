import { IcingAlgorithmDef, FlightDataPoint, AlgorithmOutput } from '../types';

export const ALGORITHMS: IcingAlgorithmDef[] = [
  {
    id: 'temp_humid',
    name: '温湿廓线法',
    type: 'ordinary',
    unit: '%',
    minVal: 0,
    maxVal: 100,
    defaultThresholds: { light: 30, moderate: 60, severe: 80 }
  },
  {
    id: 'cloud_water',
    name: '云水含量法',
    type: 'ordinary',
    unit: 'g/m³',
    minVal: 0,
    maxVal: 2.5,
    defaultThresholds: { light: 0.5, moderate: 1.2, severe: 1.8 }
  },
  {
    id: 'icing_index',
    name: '积冰指数算法',
    type: 'ordinary',
    unit: 'Idx',
    minVal: 0,
    maxVal: 10,
    defaultThresholds: { light: 3, moderate: 6, severe: 8.5 }
  },
  {
    id: 'empirical_formula',
    name: '经验公式法',
    type: 'ordinary',
    unit: 'K',
    minVal: 0,
    maxVal: 100,
    defaultThresholds: { light: 25, moderate: 55, severe: 75 }
  },
  {
    id: 'random_forest',
    name: '随机森林预测器',
    type: 'ml',
    unit: 'Prob',
    minVal: 0,
    maxVal: 1,
    defaultThresholds: { light: 0.25, moderate: 0.55, severe: 0.8 }
  },
  {
    id: 'lightgbm',
    name: 'LightGBM分类器',
    type: 'ml',
    unit: 'Prob',
    minVal: 0,
    maxVal: 1,
    defaultThresholds: { light: 0.3, moderate: 0.6, severe: 0.85 }
  },
  {
    id: 'deep_neural',
    name: '深度神经网络模型',
    type: 'ml',
    unit: 'Score',
    minVal: 0,
    maxVal: 100,
    defaultThresholds: { light: 35, moderate: 65, severe: 85 }
  },
  {
    id: 'svm',
    name: '支持向量机评估器',
    type: 'ml',
    unit: 'Score',
    minVal: 0,
    maxVal: 10,
    defaultThresholds: { light: 3, moderate: 6, severe: 8.5 }
  },
  {
    id: 'vibrating_cylinder',
    name: '振动圆柱传感器',
    type: 'sensor',
    unit: 'mm',
    minVal: 0,
    maxVal: 5,
    defaultThresholds: { light: 0.8, moderate: 2.2, severe: 3.8 }
  }
];

// Generate flight path from Shanghai Pudong (31.14N, 121.80E) to Beijing Capital (40.08N, 116.58E)
export function generateFlightData(
  startHour: number = 12,
  startMin: number = 0,
  icingSeverity: 'none' | 'light' | 'heavy' = 'heavy'
): FlightDataPoint[] {
  const points: FlightDataPoint[] = [];
  const startLat = 31.1433;
  const startLng = 121.8053;
  const endLat = 40.0801;
  const endLng = 116.5845;
  const totalSteps = 60;

  for (let i = 0; i <= totalSteps; i++) {
    const fraction = i / totalSteps;
    // Linear path with some minor jitter for flight realism
    const rawLat = startLat + (endLat - startLat) * fraction;
    const rawLng = startLng + (endLng - startLng) * fraction;
    
    // Add minor atmospheric wiggle (varying slightly based on start time)
    const seedOffset = (startHour * 13 + startMin * 7) % 10;
    const lat = rawLat + Math.sin(fraction * Math.PI * 6 + seedOffset) * 0.04;
    const lng = rawLng + Math.cos(fraction * Math.PI * 6 + seedOffset) * 0.04;

    // Time generation (starts at custom hour/min, 1-minute steps)
    const totalMinutes = startMin + i;
    const hour = (startHour + Math.floor(totalMinutes / 60)) % 24;
    const min = totalMinutes % 60;
    const timeStr = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
    const timestamp = 1783771200000 + (startHour * 3600 + totalMinutes * 60) * 1000;

    // Altitude profile: climb, cruise at 7500m, descend
    let altitude = 1500;
    if (i < 15) {
      altitude = 1500 + (6000 * (i / 15)); // climb to 7500m
    } else if (i <= 48) {
      altitude = 7500 + Math.sin(i * 0.5 + seedOffset) * 50; // cruise
    } else {
      altitude = 7500 - (6000 * ((i - 48) / (totalSteps - 48))); // descend
    }

    // Speed profile: weather modification aircraft max speed between 400-500km/h (e.g. cruise at 440km/h)
    let speed = 440;
    if (i < 15) {
      speed = 360 + (80 * (i / 15)); // climbs from 360 to 440
    } else if (i > 48) {
      speed = 440 - (120 * ((i - 48) / (totalSteps - 48))); // descends from 440 to 320
    }
    // Add small realistic speed fluctuations (+- 4 km/h) during cruise
    if (i >= 15 && i <= 48) {
      speed += Math.sin(i * 0.8 + seedOffset) * 4;
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
      inCloud = i >= 16 && i <= 42;
      if (inCloud) {
        const center = 29;
        const width = 13;
        cloudIntensity = Math.max(0, 1 - Math.pow((i - center) / width, 2));
      }
    } else if (icingSeverity === 'light') {
      inCloud = i >= 20 && i <= 38;
      if (inCloud) {
        const center = 29;
        const width = 9;
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
        let noise = Math.sin(i * 1.5) * 0.08; // algorithmic noise
        
        if (algo.id === 'temp_humid') {
          // Temperature-Humidity responds quickly and plateaus
          value = Math.min(100, (cloudIntensity * 75 + 15) + noise * 10);
        } else if (algo.id === 'cloud_water') {
          // Cloud water content matches the core concentration
          value = Math.max(0, Math.min(2.5, cloudIntensity * 2.1 + noise * 0.15));
        } else if (algo.id === 'icing_index') {
          value = Math.max(0, Math.min(10, cloudIntensity * 8.5 + noise * 0.5));
        } else if (algo.id === 'empirical_formula') {
          value = Math.max(0, Math.min(100, cloudIntensity * 80 + noise * 12));
        } else if (algo.id === 'random_forest') {
          value = Math.max(0, Math.min(1, cloudIntensity * 0.88 + Math.cos(i * 0.8) * 0.02));
        } else if (algo.id === 'lightgbm') {
          value = Math.max(0, Math.min(1, Math.pow(cloudIntensity, 1.2) * 0.92 + noise * 0.04));
        } else if (algo.id === 'deep_neural') {
          value = Math.max(0, Math.min(100, cloudIntensity * 90 + Math.sin(i) * 3));
        } else if (algo.id === 'svm') {
          value = Math.max(0, Math.min(10, cloudIntensity * 8.2 + Math.cos(i) * 0.3));
        } else if (algo.id === 'vibrating_cylinder') {
          // Physical sensor integrates/accumulates ice, then decreases when heater turns on
          if (i < 32) {
            const durationInCloud = i - (icingSeverity === 'heavy' ? 16 : 20);
            value = Math.max(0, Math.min(4.8, (durationInCloud * 0.22) + noise * 0.1));
          } else if (i >= 32 && i <= 34) {
            value = Math.max(0.2, 4.2 - (i - 31) * 1.8);
          } else {
            value = Math.max(0.2, 0.4 + (cloudIntensity * 1.5));
          }
        }
      } else {
        // Out of cloud, very low background values or zero
        const randomNoise = Math.sin(i + seedOffset);
        if (algo.id === 'temp_humid') value = 5 + Math.abs(randomNoise) * 5;
        else if (algo.id === 'cloud_water') value = 0.02 + Math.abs(randomNoise) * 0.04;
        else if (algo.id === 'icing_index') value = 0.1 + Math.abs(randomNoise) * 0.2;
        else if (algo.id === 'empirical_formula') value = 8 + Math.abs(randomNoise) * 4;
        else if (algo.id === 'random_forest') value = 0.02 + Math.abs(randomNoise) * 0.03;
        else if (algo.id === 'lightgbm') value = 0.01 + Math.abs(randomNoise) * 0.02;
        else if (algo.id === 'deep_neural') value = 4 + Math.abs(randomNoise) * 3;
        else if (algo.id === 'svm') value = 0.2 + Math.abs(randomNoise) * 0.2;
        else if (algo.id === 'vibrating_cylinder') value = 0.0;
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
