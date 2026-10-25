export interface AlgorithmOutput {
  algorithmId: string;
  algorithmName: string;
  paramName?: string;
  paramSymbol?: string;
  value: number; // Raw algorithm output value
  level: 'None' | 'Light' | 'LightModerate' | 'Moderate' | 'Severe'; // Risk level
  levelLabel?: string;
}

export interface FlightDataPoint {
  id: number;
  time: string; // HH:MM:SS
  timestamp: number; // numeric timestamp for calculations
  latitude: number;
  longitude: number;
  altitude: number; // in meters, e.g. 4500m
  speed: number; // 真空速 (TAS), in km/h, e.g. 450 km/h
  groundSpeed: number; // 航速 (地速 GS), in km/h (不同于真空速)
  temperature: number; // 环境气温, in °C
  humidity: number; // 相对湿度, in %
  heading: number; // in degrees, 0-360
  algorithms: Record<string, AlgorithmOutput>; // keyed by algorithmId
  maxDistance: number; // calculated max flyable distance in km
}

export type AlgorithmType = 'ordinary' | 'ml' | 'sensor' | 'turbulence';

export interface InputParamDef {
  symbol: string;
  name: string;
  desc?: string;
  unit?: string;
}

export interface IcingAlgorithmDef {
  id: string;
  name: string;
  category?: 'icing' | 'turbulence';
  paramName: string; // 输出参量完整名称
  paramSymbol?: string; // 参量代号
  inputParams?: InputParamDef[]; // 输入物理参量与说明
  type: AlgorithmType;
  unit: string;
  minVal: number;
  maxVal: number;
  thresholdDesc: string; // 默认阈值规则说明
  hasDefaultThresholds?: boolean;
  defaultThresholds: {
    light: number;
    lightModerate?: number;
    moderate: number;
    severe: number;
  };
  levelLabels?: {
    none: string;
    light: string;
    lightModerate?: string;
    moderate: string;
    severe: string;
  };
}

export interface IcingLevelConfig {
  id: string;
  name: string;
  minThreshold: number;
  color: string;
  isBase?: boolean;
}

export interface ProductConfig {
  algorithmId: string;
  thresholds: {
    light: number;
    lightModerate?: number;
    moderate: number;
    severe: number;
  };
  colors: {
    none: string;
    light: string;
    lightModerate?: string;
    moderate: string;
    severe: string;
  };
  levels?: IcingLevelConfig[];
  maxDistanceLimit?: number;
}

export interface SystemLog {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}
