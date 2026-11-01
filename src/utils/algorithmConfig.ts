import { SystemAlgorithmItem, IcingLevelConfig, ProductConfig, IcingAlgorithmDef } from '../types';
import { ALGORITHMS, TURBULENCE_ALGORITHMS } from '../data/mockData';

export const SYSTEM_ALGORITHMS: SystemAlgorithmItem[] = [
  // 1.1 积冰强度算法
  {
    id: 'IC_INDEX',
    legacyId: 'ic_index',
    name: 'IC指数',
    shortName: 'IC指数',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-06-12 09:30:00',
    supportsParams: false,
    supportsThresholds: true
  },
  {
    id: 'IC_IMPROVED',
    legacyId: 'ic_improved',
    name: 'IC改进',
    shortName: 'IC改进',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-06-12 11:20:00',
    supportsParams: false,
    supportsThresholds: true
  },
  {
    id: 'TEMP_FROST',
    legacyId: 'temp_frost',
    name: '假霜点温度',
    shortName: '假霜点温度',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-05-20 14:15:00',
    supportsParams: false,
    supportsThresholds: true,
    isFrostPoint: true
  },
  {
    id: 'ICING_INDEX',
    legacyId: 'icing_index',
    name: '积冰指数',
    shortName: '积冰指数',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-06-10 16:40:00',
    supportsParams: false,
    supportsThresholds: true
  },
  {
    id: 'XGB',
    legacyId: 'xgb',
    name: 'XGB',
    shortName: 'XGB',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-06-18 10:00:00',
    supportsParams: true,
    supportsThresholds: true,
    defaultParams: {
      cdpWindowSeconds: 15
    },
    paramDefs: [
      {
        key: 'cdpWindowSeconds',
        name: 'CDP 液态水含量累计时间窗（s）',
        unit: 's',
        defaultValue: 15,
        min: 1,
        max: 120,
        step: 1,
        description: '云滴探头 (CDP) 实测液态水含量时序特征提取与滑动时间窗累计积分时长'
      }
    ]
  },
  {
    id: 'LGB',
    legacyId: 'lgb',
    name: 'LGB',
    shortName: 'LGB',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-06-18 10:00:00',
    supportsParams: true,
    supportsThresholds: true,
    defaultParams: {
      cdpWindowSeconds: 15
    },
    paramDefs: [
      {
        key: 'cdpWindowSeconds',
        name: 'CDP 液态水含量累计时间窗（s）',
        unit: 's',
        defaultValue: 15,
        min: 1,
        max: 120,
        step: 1,
        description: '云滴探头 (CDP) 实测液态水含量时序特征提取与滑动时间窗累计积分时长'
      }
    ]
  },
  {
    id: 'CATB',
    legacyId: 'catb',
    name: 'CatB',
    shortName: 'CatB',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-06-18 10:00:00',
    supportsParams: true,
    supportsThresholds: true,
    defaultParams: {
      cdpWindowSeconds: 15
    },
    paramDefs: [
      {
        key: 'cdpWindowSeconds',
        name: 'CDP 液态水含量累计时间窗（s）',
        unit: 's',
        defaultValue: 15,
        min: 1,
        max: 120,
        step: 1,
        description: '云滴探头 (CDP) 实测液态水含量时序特征提取与滑动时间窗累计积分时长'
      }
    ]
  },
  {
    id: 'RF',
    legacyId: 'rf',
    name: 'RF',
    shortName: 'RF',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-06-18 10:00:00',
    supportsParams: true,
    supportsThresholds: true,
    defaultParams: {
      cdpWindowSeconds: 15
    },
    paramDefs: [
      {
        key: 'cdpWindowSeconds',
        name: 'CDP 液态水含量累计时间窗（s）',
        unit: 's',
        defaultValue: 15,
        min: 1,
        max: 120,
        step: 1,
        description: '云滴探头 (CDP) 实测液态水含量时序特征提取与滑动时间窗累计积分时长'
      }
    ]
  },
  {
    id: 'PROBE',
    legacyId: 'probe',
    name: '积冰探头',
    shortName: '积冰探头',
    category: 'icing_intensity',
    categoryLabel: '积冰强度算法',
    version: '2026-05-15 08:30:00',
    supportsParams: false,
    supportsThresholds: true
  },

  // 1.2 最大航行距离算法
  {
    id: 'MAX_DIST_ICE',
    legacyId: 'max_dist_ice_rate',
    name: '基于积冰厚度速率的最大航行距离计算方法',
    shortName: '最大航行距离',
    category: 'max_distance',
    categoryLabel: '最大航行距离算法',
    version: '2026-06-25 15:30:00',
    supportsParams: true,
    supportsThresholds: true,
    defaultParams: {
      iceThicknessThresholdCm: 0.635
    },
    paramDefs: [
      {
        key: 'iceThicknessThresholdCm',
        name: '积冰厚度阈值（cm）',
        unit: 'cm',
        defaultValue: 0.635,
        min: 0.05,
        max: 5.0,
        step: 0.001,
        description: '临界允许积冰厚度上限，达至该厚度时航行气动性能与安全裕度受限'
      }
    ]
  },

  // 2 颠簸监测算法
  {
    id: 'ELLROD2',
    legacyId: 'ELLROD2',
    name: 'Ellrod2 指数',
    shortName: 'Ellrod2 指数',
    category: 'turbulence',
    categoryLabel: '颠簸监测算法',
    version: '2026-06-14 17:00:00',
    supportsParams: false,
    supportsThresholds: true
  },
  {
    id: 'MOS',
    legacyId: 'MOS',
    name: 'MOS 指数',
    shortName: 'MOS 指数',
    category: 'turbulence',
    categoryLabel: '颠簸监测算法',
    version: '2026-06-14 17:00:00',
    supportsParams: false,
    supportsThresholds: true
  },
  {
    id: 'HTG',
    legacyId: 'HTG',
    name: 'HTG 指数',
    shortName: 'HTG 指数',
    category: 'turbulence',
    categoryLabel: '颠簸监测算法',
    version: '2026-06-14 17:00:00',
    supportsParams: false,
    supportsThresholds: true
  },
  {
    id: 'P_INDEX',
    legacyId: 'P_INDEX',
    name: 'P 指数',
    shortName: 'P 指数',
    category: 'turbulence',
    categoryLabel: '颠簸监测算法',
    version: '2026-06-14 17:00:00',
    supportsParams: false,
    supportsThresholds: true
  }
];

// Default parameter values mapping
export const DEFAULT_ALGORITHM_PARAMS: Record<string, Record<string, number>> = {
  XGB: { cdpWindowSeconds: 15 },
  LGB: { cdpWindowSeconds: 15 },
  CATB: { cdpWindowSeconds: 15 },
  RF: { cdpWindowSeconds: 15 },
  MAX_DIST_ICE: { iceThicknessThresholdCm: 0.635 }
};

// Default threshold levels for Max Distance calculation
export const DEFAULT_MAX_DISTANCE_LEVELS: IcingLevelConfig[] = [
  { id: 'danger', name: '危险', minThreshold: 0, color: '#FF3B30', isBase: true },
  { id: 'warning', name: '警戒', minThreshold: 80, color: '#FF9F0A' },
  { id: 'notice', name: '提醒', minThreshold: 200, color: '#0A84FF' },
  { id: 'normal', name: '安全', minThreshold: 800, color: '#22C55E' }
];

export const buildDefaultLevels = (algo: IcingAlgorithmDef | SystemAlgorithmItem, cfg?: ProductConfig): IcingLevelConfig[] => {
  // 1. Max distance algorithm
  if (algo.category === 'max_distance' || algo.id === 'MAX_DIST_ICE') {
    return JSON.parse(JSON.stringify(DEFAULT_MAX_DISTANCE_LEVELS));
  }

  // 2. Resolve matching IcingAlgorithmDef if passed as SystemAlgorithmItem
  const legacyId = (algo as any).legacyId || algo.id;
  const matchedDef = [...ALGORITHMS, ...TURBULENCE_ALGORITHMS].find(a => a.id === legacyId);

  const colors = cfg?.colors || {
    none: '#6B7280',
    light: '#0A84FF',
    lightModerate: '#22D3EE',
    moderate: '#FF9F0A',
    severe: '#FF3B30'
  };

  const isTurb = algo.category === 'turbulence' || (algo as any).type === 'turbulence';

  // If turbulence and no custom levels saved yet: default thresholds are '暂无', only 1 base level exists!
  if (isTurb && (!cfg?.levels || cfg.levels.length === 0)) {
    return [
      {
        id: 'base',
        name: '无',
        minThreshold: 0,
        color: colors.none && colors.none !== '#6B7280' ? colors.none : '#0284C7',
        isBase: true
      }
    ];
  }

  const defThresholds = matchedDef ? matchedDef.defaultThresholds : { light: 0, moderate: 40, severe: 70 };
  const thresholds = { ...(cfg?.thresholds || defThresholds) };
  const labels = matchedDef?.levelLabels;

  const list: IcingLevelConfig[] = [
    {
      id: 'none',
      name: labels?.none || (isTurb ? '无颠簸' : '无积冰'),
      minThreshold: thresholds.light, // base level boundary
      color: colors.none || '#6B7280',
      isBase: true
    },
    {
      id: 'light',
      name: labels?.light || (isTurb ? '轻度颠簸' : '轻度积冰'),
      minThreshold: thresholds.light,
      color: colors.light || '#0A84FF'
    }
  ];

  if (thresholds.lightModerate !== undefined || defThresholds.lightModerate !== undefined) {
    list.push({
      id: 'lightModerate',
      name: labels?.lightModerate || (isTurb ? '轻-中度颠簸' : '轻-中度积冰'),
      minThreshold: thresholds.lightModerate ?? defThresholds.lightModerate ?? 3,
      color: colors.lightModerate || '#22D3EE'
    });
  }

  list.push({
    id: 'moderate',
    name: labels?.moderate || (isTurb ? '中度颠簸' : '中度积冰'),
    minThreshold: thresholds.moderate,
    color: colors.moderate || '#FF9F0A'
  });

  list.push({
    id: 'severe',
    name: labels?.severe || (isTurb ? '重度颠簸' : '重度积冰'),
    minThreshold: thresholds.severe,
    color: colors.severe || '#FF3B30'
  });

  return list;
};

// LocalStorage Keys
const STORAGE_KEY_PARAMS = 'tolx_algorithm_params_v1';
const STORAGE_KEY_STATUS = 'tolx_algorithm_status_v1';

// Load configured parameters from localStorage
export function loadAlgorithmParams(): Record<string, Record<string, number>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PARAMS);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_ALGORITHM_PARAMS));
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ALGORITHM_PARAMS, ...parsed };
  } catch (e) {
    console.warn('Failed to load algorithm params from storage:', e);
    return JSON.parse(JSON.stringify(DEFAULT_ALGORITHM_PARAMS));
  }
}

// Save parameters to localStorage
export function saveAlgorithmParams(params: Record<string, Record<string, number>>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PARAMS, JSON.stringify(params));
  } catch (e) {
    console.warn('Failed to save algorithm params to storage:', e);
  }
}

// Reset algorithm params to defaults
export function resetAlgorithmParams(algoId?: string): Record<string, Record<string, number>> {
  const current = loadAlgorithmParams();
  if (algoId && DEFAULT_ALGORITHM_PARAMS[algoId]) {
    current[algoId] = { ...DEFAULT_ALGORITHM_PARAMS[algoId] };
  } else if (!algoId) {
    Object.assign(current, JSON.parse(JSON.stringify(DEFAULT_ALGORITHM_PARAMS)));
  }
  saveAlgorithmParams(current);
  return current;
}

// Load algorithm enable/disable status from localStorage
export function loadAlgorithmStatus(): Record<string, boolean> {
  const initialStatus: Record<string, boolean> = {};
  SYSTEM_ALGORITHMS.forEach(algo => {
    initialStatus[algo.id] = true;
    initialStatus[algo.legacyId] = true;
  });

  try {
    const raw = localStorage.getItem(STORAGE_KEY_STATUS);
    if (!raw) return initialStatus;
    const parsed = JSON.parse(raw);
    return { ...initialStatus, ...parsed };
  } catch (e) {
    console.warn('Failed to load algorithm status from storage:', e);
    return initialStatus;
  }
}

// Save algorithm status to localStorage
export function saveAlgorithmStatus(status: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY_STATUS, JSON.stringify(status));
  } catch (e) {
    console.warn('Failed to save algorithm status to storage:', e);
  }
}
