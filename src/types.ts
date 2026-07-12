export interface AlgorithmOutput {
  algorithmId: string;
  algorithmName: string;
  value: number; // Raw algorithm output value (e.g. 0 to 100)
  level: 'None' | 'Light' | 'Moderate' | 'Severe'; // Risk level
}

export interface FlightDataPoint {
  id: number;
  time: string; // HH:MM:SS
  timestamp: number; // numeric timestamp for calculations
  latitude: number;
  longitude: number;
  altitude: number; // in meters, e.g. 4500m
  speed: number; // in km/h, e.g. 450 km/h
  heading: number; // in degrees, 0-360
  algorithms: Record<string, AlgorithmOutput>; // keyed by algorithmId
  maxDistance: number; // calculated max flyable distance in km
}

export type AlgorithmType = 'ordinary' | 'ml' | 'sensor';

export interface IcingAlgorithmDef {
  id: string;
  name: string;
  type: AlgorithmType;
  unit: string;
  minVal: number;
  maxVal: number;
  defaultThresholds: {
    light: number;
    moderate: number;
    severe: number;
  };
}

export interface ProductConfig {
  algorithmId: string;
  thresholds: {
    light: number;
    moderate: number;
    severe: number;
  };
  colors: {
    none: string;
    light: string;
    moderate: string;
    severe: string;
  };
}

export interface SystemLog {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}
