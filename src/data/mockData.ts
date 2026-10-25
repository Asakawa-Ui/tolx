import { IcingAlgorithmDef, FlightDataPoint, AlgorithmOutput } from '../types';

export const ALGORITHMS: IcingAlgorithmDef[] = [
  {
    id: 'ic_index',
    name: 'IC指数',
    category: 'icing',
    paramName: 'IC 指数',
    paramSymbol: 'IC',
    type: 'ordinary',
    unit: '',
    minVal: 0,
    maxVal: 100,
    thresholdDesc: '0 ≤ IC < 40 轻度；40 ≤ IC < 70 中度；70 ≤ IC 重度',
    defaultThresholds: { light: 0, moderate: 40, severe: 70 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'ic_improved',
    name: 'IC改进',
    category: 'icing',
    paramName: '改进 IC 指数',
    paramSymbol: 'H',
    type: 'ordinary',
    unit: '',
    minVal: 0,
    maxVal: 10,
    thresholdDesc: '0 ≤ H < 4 轻度；4 ≤ H < 7 中度；7 ≤ H 重度',
    defaultThresholds: { light: 0, moderate: 4, severe: 7 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'temp_frost',
    name: '假霜点温度',
    category: 'icing',
    paramName: '假霜点判别量',
    paramSymbol: 'diff',
    type: 'ordinary',
    unit: '°C',
    minVal: -20,
    maxVal: 10,
    thresholdDesc: 'thresh < diff ≤ 0 轻度；0 < diff 中度及以上',
    defaultThresholds: { light: -5, moderate: 0, severe: 5 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度及以上', severe: '重度积冰' }
  },
  {
    id: 'icing_index',
    name: '积冰指数',
    category: 'icing',
    paramName: 'LWC 积冰指数',
    paramSymbol: 'I',
    type: 'ordinary',
    unit: '',
    minVal: 0,
    maxVal: 10,
    thresholdDesc: '1 ≤ I < 3 轻度；3 ≤ I < 6 轻-中度；6 ≤ I < 8 中度；8 ≤ I 重度',
    defaultThresholds: { light: 1, lightModerate: 3, moderate: 6, severe: 8 },
    levelLabels: { none: '无积冰', light: '轻度积冰', lightModerate: '轻-中度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'xgb',
    name: 'XGB',
    category: 'icing',
    paramName: 'XGB 预测积冰速率',
    paramSymbol: 'ICR_XGB',
    type: 'ml',
    unit: 'g/(dm²·h)',
    minVal: 0,
    maxVal: 160,
    thresholdDesc: '5 ≤ ICR < 60 轻度；60 ≤ ICR < 120 中度；ICR ≥ 120 重度',
    defaultThresholds: { light: 5, moderate: 60, severe: 120 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'lgb',
    name: 'LGB',
    category: 'icing',
    paramName: 'LightGBM 预测积冰速率',
    paramSymbol: 'ICR_LGB',
    type: 'ml',
    unit: 'g/(dm²·h)',
    minVal: 0,
    maxVal: 160,
    thresholdDesc: '5 ≤ ICR < 60 轻度；60 ≤ ICR < 120 中度；ICR ≥ 120 重度',
    defaultThresholds: { light: 5, moderate: 60, severe: 120 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'catb',
    name: 'CatB',
    category: 'icing',
    paramName: 'CatBoost 预测积冰速率',
    paramSymbol: 'ICR_CatB',
    type: 'ml',
    unit: 'g/(dm²·h)',
    minVal: 0,
    maxVal: 160,
    thresholdDesc: '5 ≤ ICR < 60 轻度；60 ≤ ICR < 120 中度；ICR ≥ 120 重度',
    defaultThresholds: { light: 5, moderate: 60, severe: 120 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'rf',
    name: 'RF',
    category: 'icing',
    paramName: 'Random Forest 预测积冰速率',
    paramSymbol: 'ICR_RF',
    type: 'ml',
    unit: 'g/(dm²·h)',
    minVal: 0,
    maxVal: 160,
    thresholdDesc: '5 ≤ ICR < 60 轻度；60 ≤ ICR < 120 中度；ICR ≥ 120 重度',
    defaultThresholds: { light: 5, moderate: 60, severe: 120 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  },
  {
    id: 'probe',
    name: '积冰探头',
    category: 'icing',
    paramName: '积冰质量速率',
    paramSymbol: 'ICR_IDF',
    type: 'sensor',
    unit: 'g/(dm²·h)',
    minVal: 0,
    maxVal: 160,
    thresholdDesc: '5 ≤ ICR_IDF < 60：轻度；60 ≤ ICR_IDF < 120：中度；ICR_IDF ≥ 120：重度',
    defaultThresholds: { light: 5, moderate: 60, severe: 120 },
    levelLabels: { none: '无积冰', light: '轻度积冰', moderate: '中度积冰', severe: '重度积冰' }
  }
];

export const TURBULENCE_ALGORITHMS: IcingAlgorithmDef[] = [
  {
    id: 'ELLROD2',
    name: 'Ellrod2 指数',
    category: 'turbulence',
    paramName: 'Ellrod2 指数',
    paramSymbol: 'Ellrod2',
    inputParams: [
      { symbol: 'Sv', name: '垂直风切变（/s）' },
      { symbol: 'D_EF', name: '沿航迹水平风速梯度合成量（/s）' }
    ],
    type: 'turbulence',
    unit: '×10⁻⁷ s⁻²',
    minVal: 0,
    maxVal: 40,
    thresholdDesc: '默认阈值: ≥ 0',
    hasDefaultThresholds: false,
    defaultThresholds: { light: 0, moderate: 0, severe: 0 },
    levelLabels: { none: '无', light: '轻度颠簸', moderate: '中度颠簸', severe: '重度颠簸' }
  },
  {
    id: 'MOS',
    name: 'MOS 指数',
    category: 'turbulence',
    paramName: 'MOS 指数',
    paramSymbol: 'MOS',
    inputParams: [
      { symbol: 'V', name: '水平风速大小（m/s）' },
      { symbol: 'D_EF', name: '沿航迹水平风速梯度合成量（/s）' }
    ],
    type: 'turbulence',
    unit: '',
    minVal: 0,
    maxVal: 30,
    thresholdDesc: '默认阈值: ≥ 0',
    hasDefaultThresholds: false,
    defaultThresholds: { light: 0, moderate: 0, severe: 0 },
    levelLabels: { none: '无', light: '轻度颠簸', moderate: '中度颠簸', severe: '重度颠簸' }
  },
  {
    id: 'HTG',
    name: 'HTG 指数',
    category: 'turbulence',
    paramName: 'HTG 指数',
    paramSymbol: 'HTG',
    inputParams: [
      { symbol: 'dT_ds', name: '沿航迹温度梯度（℃/m）' }
    ],
    type: 'turbulence',
    unit: '℃/km',
    minVal: 0,
    maxVal: 15,
    thresholdDesc: '默认阈值: ≥ 0',
    hasDefaultThresholds: false,
    defaultThresholds: { light: 0, moderate: 0, severe: 0 },
    levelLabels: { none: '无', light: '轻度颠簸', moderate: '中度颠簸', severe: '重度颠簸' }
  },
  {
    id: 'P_INDEX',
    name: 'P 指数',
    category: 'turbulence',
    paramName: 'P 指数',
    paramSymbol: 'P',
    inputParams: [
      { symbol: 'du_dz', name: '北向风速垂直梯度（/s）' },
      { symbol: 'dT_ds', name: '沿航迹温度梯度（℃/m）' },
      { symbol: 'du_ds', name: '沿航迹北向风速梯度（/s）' }
    ],
    type: 'turbulence',
    unit: '',
    minVal: 0,
    maxVal: 40,
    thresholdDesc: '默认阈值: ≥ 0',
    hasDefaultThresholds: false,
    defaultThresholds: { light: 0, moderate: 0, severe: 0 },
    levelLabels: { none: '无', light: '轻度颠簸', moderate: '中度颠簸', severe: '重度颠簸' }
  }
];

export const ALL_ALGORITHMS: IcingAlgorithmDef[] = [...ALGORITHMS, ...TURBULENCE_ALGORITHMS];

export function evaluateIcingRisk(
  algoId: string,
  value: number,
  thresholds: { light: number; lightModerate?: number; moderate: number; severe: number }
): { level: 'None' | 'Light' | 'LightModerate' | 'Moderate' | 'Severe'; label: string } {
  if (algoId === 'temp_frost') {
    // 假霜点判别量 diff: thresh < diff <= 0 轻度; 0 < diff 中度及以上
    const thresh = thresholds.light;
    if (value > 0) {
      if (thresholds.severe > 0 && value >= thresholds.severe) {
        return { level: 'Severe', label: '重度积冰' };
      }
      return { level: 'Moderate', label: '中度及以上' };
    }
    if (value > thresh) {
      return { level: 'Light', label: '轻度积冰' };
    }
    return { level: 'None', label: '无积冰' };
  }

  if (algoId === 'icing_index') {
    // 1 <= I < 3 轻度；3 <= I < 6 轻-中度；6 <= I < 8 中度；8 <= I 重度
    const thLight = thresholds.light;
    const thLightMod = thresholds.lightModerate ?? 3;
    const thMod = thresholds.moderate;
    const thSev = thresholds.severe;

    if (value >= thSev) return { level: 'Severe', label: '重度积冰' };
    if (value >= thMod) return { level: 'Moderate', label: '中度积冰' };
    if (value >= thLightMod) return { level: 'LightModerate', label: '轻-中度积冰' };
    if (value >= thLight) return { level: 'Light', label: '轻度积冰' };
    return { level: 'None', label: '无积冰' };
  }

  // Turbulence or default algorithms: only trigger if threshold > 0
  if (thresholds.severe > 0 && value >= thresholds.severe) {
    return { level: 'Severe', label: '重度风险' };
  }
  if (thresholds.moderate > 0 && value >= thresholds.moderate) {
    return { level: 'Moderate', label: '中度风险' };
  }
  if (thresholds.light > 0 && value >= thresholds.light) {
    return { level: 'Light', label: '轻度风险' };
  }
  return { level: 'None', label: '正常监测' };
}

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

    // Ground Speed (航速 / 地速 GS) - differs distinctly from True Airspeed (真空速 TAS) due to aloft winds
    const windComponent = 42 + Math.sin(fraction * Math.PI * 2.2 + seedOffset) * 26 + (altitude / 7500) * 16;
    const groundSpeed = Math.round(speed + windComponent);

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

    // Temperature (°C) - standard atmospheric lapse rate (-6.5°C/1000m) + cloud latent heat variation
    const lapseTemp = 16.5 - (altitude / 1000) * 6.5;
    const cloudTempDelta = inCloud ? (1.6 + cloudIntensity * 1.2) : 0;
    const tempJitter = Math.sin(elapsedMinutes * 0.4 + seedOffset) * 0.5;
    const temperature = Math.round((lapseTemp + cloudTempDelta + tempJitter) * 10) / 10;

    // Relative Humidity (%) - dry aloft (20%-35%), surging in clouds (78%-96%)
    let humidity = 35;
    if (inCloud) {
      humidity = Math.min(98, Math.round(76 + cloudIntensity * 18 + Math.sin(elapsedMinutes * 1.5) * 3));
    } else {
      humidity = Math.max(15, Math.round(36 - (altitude / 7500) * 14 + Math.sin(elapsedMinutes * 0.6) * 4));
    }

    const algorithms: Record<string, AlgorithmOutput> = {};

    // 1. Icing Algorithms
    ALGORITHMS.forEach(algo => {
      let value = 0;
      const noise = Math.sin(elapsedMinutes * 1.5) * 0.08;
      const randomNoise = Math.sin(elapsedMinutes + seedOffset);

      if (inCloud) {
        if (algo.id === 'ic_index') {
          // 0-100 range: Light (0-40), Moderate (40-70), Severe (>=70)
          value = Math.max(0, Math.min(100, cloudIntensity * 85 + noise * 10));
        } else if (algo.id === 'ic_improved') {
          // 0-10 range: Light (0-4), Moderate (4-7), Severe (>=7)
          value = Math.max(0, Math.min(10, cloudIntensity * 8.6 + Math.cos(elapsedMinutes) * 0.4));
        } else if (algo.id === 'temp_frost') {
          // -20 to 10 range: diff = T - T_frost. In cloud, diff rises to around -2 ~ +4
          value = Math.max(-20, Math.min(10, (cloudIntensity * 12 - 7) + noise * 2));
        } else if (algo.id === 'icing_index') {
          // 0-10 range: Light (1-3), Light-Moderate (3-6), Moderate (6-8), Severe (>=8)
          value = Math.max(0, Math.min(10, cloudIntensity * 8.8 + noise * 0.6));
        } else if (algo.id === 'xgb') {
          // 0-160 range: Light (5-60), Moderate (60-120), Severe (>=120)
          value = Math.max(0, Math.min(160, cloudIntensity * 138 + Math.cos(elapsedMinutes * 0.8) * 6));
        } else if (algo.id === 'lgb') {
          // 0-160 range
          value = Math.max(0, Math.min(160, Math.pow(cloudIntensity, 1.1) * 135 + noise * 8));
        } else if (algo.id === 'catb') {
          // 0-160 range
          value = Math.max(0, Math.min(160, cloudIntensity * 132 + Math.sin(elapsedMinutes * 1.1) * 7));
        } else if (algo.id === 'rf') {
          // 0-160 range
          value = Math.max(0, Math.min(160, cloudIntensity * 126 + Math.cos(elapsedMinutes * 1.3) * 5));
        } else if (algo.id === 'probe') {
          // Physical accretion probe with de-icing cycle simulation
          const deiceStart = Math.round(totalSteps * 0.533);
          const deiceEnd = Math.round(totalSteps * 0.567);
          const startCloud = icingSeverity === 'heavy' ? Math.round(totalSteps * 0.267) : Math.round(totalSteps * 0.333);
          if (i < deiceStart) {
            const durationInCloud = i - startCloud;
            const growthRate = 6.8 * (60 / totalSteps);
            value = Math.max(0, Math.min(145, (durationInCloud * growthRate) + noise * 4));
          } else if (i >= deiceStart && i <= deiceEnd) {
            const deiceProgress = (i - (deiceStart - 1)) / (deiceEnd - deiceStart + 1);
            value = Math.max(6, 130 - deiceProgress * 120);
          } else {
            value = Math.max(6, 15 + (cloudIntensity * 45));
          }
        }
      } else {
        // Out of cloud
        if (algo.id === 'ic_index') value = Math.max(0, Math.abs(randomNoise) * 3);
        else if (algo.id === 'ic_improved') value = Math.max(0, Math.abs(randomNoise) * 0.2);
        else if (algo.id === 'temp_frost') value = -14 + Math.abs(randomNoise) * 3;
        else if (algo.id === 'icing_index') value = 0.2 + Math.abs(randomNoise) * 0.4;
        else if (algo.id === 'xgb') value = 1.2 + Math.abs(randomNoise) * 2;
        else if (algo.id === 'lgb') value = 0.8 + Math.abs(randomNoise) * 1.5;
        else if (algo.id === 'catb') value = 1.0 + Math.abs(randomNoise) * 1.8;
        else if (algo.id === 'rf') value = 0.9 + Math.abs(randomNoise) * 1.6;
        else if (algo.id === 'probe') value = 1.5 + Math.abs(randomNoise) * 1.2;
      }

      // Round to nice decimals
      value = Math.round(value * 10) / 10;

      const risk = evaluateIcingRisk(algo.id, value, algo.defaultThresholds);

      algorithms[algo.id] = {
        algorithmId: algo.id,
        algorithmName: algo.name,
        paramName: algo.paramName,
        paramSymbol: algo.paramSymbol,
        value,
        level: risk.level,
        levelLabel: risk.label
      };
    });

    // 2. Turbulence Algorithms
    TURBULENCE_ALGORITHMS.forEach(algo => {
      let val = 0;
      // High altitude clear air turbulence + frontal shear simulation
      const altitudeFactor = Math.max(0.1, (altitude - 1500) / 6000);
      const turbulenceWave = Math.sin(fraction * Math.PI * 5 + seedOffset);
      const shearZone = Math.exp(-Math.pow((fraction - 0.46) / 0.16, 2));
      const microJitter = Math.cos(elapsedMinutes * 2.2 + seedOffset) * 0.15;

      if (algo.id === 'ELLROD2') {
        // Ellrod2: Sv * D_EF. Range 0 - 35
        val = (shearZone * 25 + Math.max(0, turbulenceWave) * 8 + microJitter * 4 + 2) * altitudeFactor;
        val = Math.max(0.2, Math.min(38, val));
      } else if (algo.id === 'MOS') {
        // MOS: V & D_EF. Range 0 - 25
        val = (shearZone * 18 + (speed / 440) * 4 + Math.abs(Math.sin(elapsedMinutes * 0.8)) * 3 + 1.5) * altitudeFactor;
        val = Math.max(0.5, Math.min(26, val));
      } else if (algo.id === 'HTG') {
        // HTG: dT_ds. Range 0 - 12 (deg C/km)
        val = (shearZone * 8.2 + Math.abs(tempJitter) * 3 + 0.8) * altitudeFactor;
        val = Math.max(0.1, Math.min(12.5, val));
      } else if (algo.id === 'P_INDEX') {
        // P_INDEX: du_dz, dT_ds, du_ds. Range 0 - 32
        val = (shearZone * 24 + Math.abs(turbulenceWave) * 6 + microJitter * 3 + 1.8) * altitudeFactor;
        val = Math.max(0.3, Math.min(35, val));
      }

      val = Math.round(val * 10) / 10;

      algorithms[algo.id] = {
        algorithmId: algo.id,
        algorithmName: algo.name,
        paramName: algo.paramName,
        paramSymbol: algo.paramSymbol,
        value: val,
        level: 'None',
        levelLabel: '正常监测'
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
      groundSpeed,
      temperature,
      humidity,
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
