import { FlightDataPoint, ProductConfig, SystemAlgorithmItem } from '../types';
import { SYSTEM_ALGORITHMS } from './algorithmConfig';
import { ALGORITHMS, TURBULENCE_ALGORITHMS } from '../data/mockData';

export interface ExportSettings {
  selectedSorties: string[]; // flight IDs, max 10
  selectedAlgorithms: string[]; // legacy algorithm IDs, e.g. 'ic_index', 'xgb', 'ELLROD2'
  fileOrganization: 'split' | 'merged'; // 'split' (分文件) or 'merged' (合并)
  exportFormat: 'csv' | 'txt'; // 'csv' or 'txt'
  exportPath: string; // e.g. 'D:/TOLX_Export/'
  customThresholds: Record<string, ProductConfig>; // snapshot of threshold configs for export
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  selectedSorties: ['20260711_B651N_02'],
  selectedAlgorithms: SYSTEM_ALGORITHMS.map(a => a.legacyId),
  fileOrganization: 'split',
  exportFormat: 'csv',
  exportPath: 'D:/TOLX_Export/',
  customThresholds: {}
};

const STORAGE_KEY_EXPORT = 'tolx_export_settings_v1';

export function loadExportSettings(): ExportSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPORT);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_EXPORT_SETTINGS));
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_EXPORT_SETTINGS, ...parsed };
  } catch (e) {
    console.warn('Failed to load export settings:', e);
    return JSON.parse(JSON.stringify(DEFAULT_EXPORT_SETTINGS));
  }
}

export function saveExportSettings(settings: ExportSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY_EXPORT, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save export settings:', e);
  }
}

// Compute atmospheric pressure from altitude (hPa)
export function computePressure(altitudeM: number): number {
  const p0 = 1013.25;
  const p = p0 * Math.pow(1 - (0.0065 * altitudeM) / 288.15, 5.255);
  return Math.round(p * 10) / 10;
}

// Evaluate risk level for export based on custom thresholds
export function evaluateRiskForExport(
  algoLegacyId: string,
  value: number,
  config?: ProductConfig
): string {
  const matchedAlgo = [...ALGORITHMS, ...TURBULENCE_ALGORITHMS].find(a => a.id === algoLegacyId);
  const isTurb = matchedAlgo?.category === 'turbulence' || matchedAlgo?.type === 'turbulence';

  // Check custom levels first
  if (config?.levels && config.levels.length > 0) {
    const sortedLevels = [...config.levels].sort((a, b) => Number(b.minThreshold) - Number(a.minThreshold));
    for (const lvl of sortedLevels) {
      if (value >= Number(lvl.minThreshold)) {
        return lvl.name;
      }
    }
    return config.levels[0]?.name || (isTurb ? '无颠簸' : '无积冰');
  }

  // Fallback to algorithm default thresholds
  if (algoLegacyId === 'temp_frost') {
    if (value > 0) return '中度及以上积冰';
    if (value >= -5) return '轻度积冰';
    return '无积冰';
  }

  if (matchedAlgo) {
    const th = config?.thresholds || matchedAlgo.defaultThresholds;
    if (th.severe > 0 && value >= th.severe) return matchedAlgo.levelLabels?.severe || '重度';
    if (th.moderate > 0 && value >= th.moderate) return matchedAlgo.levelLabels?.moderate || '中度';
    if (th.lightModerate !== undefined && value >= th.lightModerate) return matchedAlgo.levelLabels?.lightModerate || '轻-中度';
    if (th.light > 0 && value >= th.light) return matchedAlgo.levelLabels?.light || '轻度';
    return matchedAlgo.levelLabels?.none || (isTurb ? '无颠簸' : '无积冰');
  }

  return '正常';
}

// Evaluate Max Distance risk level
export function evaluateMaxDistanceRisk(distanceKm: number, maxDistLimit = 800): string {
  if (distanceKm >= maxDistLimit) return `安全 (≥${maxDistLimit}km)`;
  if (distanceKm >= 200) return '提醒 (200~800km)';
  if (distanceKm >= 80) return '警戒 (80~200km)';
  return '危险 (<80km)';
}

// Generate CSV / TXT File Content for a single algorithm
export function generateSingleAlgoFileContent(
  sortieId: string,
  algo: SystemAlgorithmItem,
  points: FlightDataPoint[],
  config: ProductConfig | undefined,
  format: 'csv' | 'txt'
): string {
  const separator = format === 'csv' ? ',' : '\t';
  const isIcing = algo.category === 'icing_intensity';

  // Headers
  const headers = [
    '时间戳',
    '观测时间',
    '架次编号',
    '经度(°)',
    '纬度(°)',
    '海拔高度(m)',
    '气温(℃)',
    '相对湿度(%)',
    '真空速(km/h)',
    '航向(°)',
    '气压(hPa)',
    '算法唯一标识',
    '算法名称',
    '算法版本',
    '算法输出参量',
    '计算数值',
    '工程单位',
    '判定风险等级'
  ];

  if (isIcing) {
    headers.push('关联最大航行距离(km)', '航程告警等级');
  }

  const rows: string[] = [headers.join(separator)];

  points.forEach(pt => {
    const algoOut = pt.algorithms[algo.legacyId] || { value: 0, level: 'None' };
    const pressure = computePressure(pt.altitude);
    const riskLevel = evaluateRiskForExport(algo.legacyId, algoOut.value, config);

    // Format ISO date
    const dateStr = pt.timestamp ? new Date(pt.timestamp).toISOString().replace('T', ' ').substring(0, 19) : pt.time;

    const row = [
      pt.timestamp || 0,
      `"${dateStr}"`,
      `"${sortieId}"`,
      pt.longitude.toFixed(5),
      pt.latitude.toFixed(5),
      Math.round(pt.altitude),
      pt.temperature.toFixed(1),
      Math.round(pt.humidity),
      Math.round(pt.speed),
      Math.round(pt.heading),
      pressure.toFixed(1),
      `"${algo.id}"`,
      `"${algo.name}"`,
      `"${algo.version}"`,
      `"${algo.shortName}"`,
      typeof algoOut.value === 'number' ? algoOut.value.toFixed(2) : '0.00',
      `"${algo.category === 'turbulence' ? '指数' : 'g/(dm²·h)'}"`,
      `"${riskLevel}"`
    ];

    if (isIcing) {
      const maxDist = Math.round(pt.maxDistance || 100);
      const distRisk = evaluateMaxDistanceRisk(maxDist);
      row.push(String(maxDist), `"${distRisk}"`);
    }

    rows.push(row.join(separator));
  });

  return (format === 'csv' ? '\uFEFF' : '') + rows.join('\r\n');
}

// Generate Merged CSV / TXT File Content for all selected algorithms of a sortie
export function generateMergedFileContent(
  sortieId: string,
  selectedAlgos: SystemAlgorithmItem[],
  points: FlightDataPoint[],
  configs: Record<string, ProductConfig>,
  format: 'csv' | 'txt'
): string {
  const separator = format === 'csv' ? ',' : '\t';

  // Base headers
  const headers = [
    '时间戳',
    '观测时间',
    '架次编号',
    '经度(°)',
    '纬度(°)',
    '海拔高度(m)',
    '气温(℃)',
    '相对湿度(%)',
    '真空速(km/h)',
    '航向(°)',
    '气压(hPa)'
  ];

  // Append dynamic headers per selected algorithm
  selectedAlgos.forEach(algo => {
    headers.push(
      `[${algo.id}]计算值`,
      `[${algo.id}]判定等级`,
      `[${algo.id}]版本`
    );
    if (algo.category === 'icing_intensity') {
      headers.push(`[${algo.id}]关联最大航距(km)`, `[${algo.id}]航距等级`);
    }
  });

  const rows: string[] = [headers.join(separator)];

  points.forEach(pt => {
    const pressure = computePressure(pt.altitude);
    const dateStr = pt.timestamp ? new Date(pt.timestamp).toISOString().replace('T', ' ').substring(0, 19) : pt.time;

    const row = [
      pt.timestamp || 0,
      `"${dateStr}"`,
      `"${sortieId}"`,
      pt.longitude.toFixed(5),
      pt.latitude.toFixed(5),
      Math.round(pt.altitude),
      pt.temperature.toFixed(1),
      Math.round(pt.humidity),
      Math.round(pt.speed),
      Math.round(pt.heading),
      pressure.toFixed(1)
    ];

    selectedAlgos.forEach(algo => {
      const algoOut = pt.algorithms[algo.legacyId] || { value: 0, level: 'None' };
      const cfg = configs[algo.legacyId];
      const riskLevel = evaluateRiskForExport(algo.legacyId, algoOut.value, cfg);

      row.push(
        typeof algoOut.value === 'number' ? algoOut.value.toFixed(2) : '0.00',
        `"${riskLevel}"`,
        `"${algo.version}"`
      );

      if (algo.category === 'icing_intensity') {
        const maxDist = Math.round(pt.maxDistance || 100);
        const distRisk = evaluateMaxDistanceRisk(maxDist);
        row.push(String(maxDist), `"${distRisk}"`);
      }
    });

    rows.push(row.join(separator));
  });

  return (format === 'csv' ? '\uFEFF' : '') + rows.join('\r\n');
}

// -------------------------------------------------------------
// Lightweight In-Browser Zero-Dependency ZIP Archive Builder
// Follows PKWare ZIP Specification (Store mode 0, uncompressed)
// -------------------------------------------------------------
function makeCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

const CRC_TABLE = makeCrc32Table();

function crc32(buf: Uint8Array): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export interface ZipEntry {
  path: string; // e.g. "20260711_B651N_02/20260711_B651N_02_XGB.csv"
  content: string | Uint8Array;
}

export function createZipArchive(entries: ZipEntry[]): Blob {
  const textEncoder = new TextEncoder();
  const fileRecords: Array<{
    pathBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }> = [];

  let localHeadersTotalSize = 0;

  for (const entry of entries) {
    const pathBytes = textEncoder.encode(entry.path);
    const dataBytes = typeof entry.content === 'string' ? textEncoder.encode(entry.content) : entry.content;
    const crc = crc32(dataBytes);

    fileRecords.push({
      pathBytes,
      dataBytes,
      crc,
      offset: localHeadersTotalSize
    });

    // 30 bytes fixed local header + path length + data length
    localHeadersTotalSize += 30 + pathBytes.length + dataBytes.length;
  }

  // Calculate central directory size
  let centralDirSize = 0;
  for (const rec of fileRecords) {
    // 46 bytes fixed central dir header + path length
    centralDirSize += 46 + rec.pathBytes.length;
  }

  // Total zip size
  const totalZipSize = localHeadersTotalSize + centralDirSize + 22; // 22 bytes EOCD
  const out = new Uint8Array(totalZipSize);
  const view = new DataView(out.buffer);

  let pos = 0;

  // 1. Write Local File Headers + Data
  for (const rec of fileRecords) {
    // Local header signature
    view.setUint32(pos, 0x04034b50, true);
    view.setUint16(pos + 4, 20, true); // Version needed
    view.setUint16(pos + 6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(pos + 8, 0, true); // Store (no compression)
    view.setUint16(pos + 10, 0x5460, true); // Time (10:35:00)
    view.setUint16(pos + 12, 0x5cd0, true); // Date (2026-06-16)
    view.setUint32(pos + 14, rec.crc, true); // CRC32
    view.setUint32(pos + 18, rec.dataBytes.length, true); // Compressed size
    view.setUint32(pos + 22, rec.dataBytes.length, true); // Uncompressed size
    view.setUint16(pos + 26, rec.pathBytes.length, true); // Path length
    view.setUint16(pos + 28, 0, true); // Extra length
    pos += 30;

    out.set(rec.pathBytes, pos);
    pos += rec.pathBytes.length;

    out.set(rec.dataBytes, pos);
    pos += rec.dataBytes.length;
  }

  const centralDirOffset = pos;

  // 2. Write Central Directory Headers
  for (const rec of fileRecords) {
    view.setUint32(pos, 0x02014b50, true); // Central dir signature
    view.setUint16(pos + 4, 20, true); // Version made by
    view.setUint16(pos + 6, 20, true); // Version needed
    view.setUint16(pos + 8, 0x0800, true); // UTF-8 flag
    view.setUint16(pos + 10, 0, true); // Store
    view.setUint16(pos + 12, 0x5460, true); // Time
    view.setUint16(pos + 14, 0x5cd0, true); // Date
    view.setUint32(pos + 16, rec.crc, true); // CRC32
    view.setUint32(pos + 20, rec.dataBytes.length, true); // Compressed size
    view.setUint32(pos + 24, rec.dataBytes.length, true); // Uncompressed size
    view.setUint16(pos + 28, rec.pathBytes.length, true); // Path length
    view.setUint16(pos + 30, 0, true); // Extra length
    view.setUint16(pos + 32, 0, true); // Comment length
    view.setUint16(pos + 34, 0, true); // Disk start
    view.setUint16(pos + 36, 0, true); // Internal attributes
    view.setUint32(pos + 38, 0, true); // External attributes
    view.setUint32(pos + 42, rec.offset, true); // Local header offset
    pos += 46;

    out.set(rec.pathBytes, pos);
    pos += rec.pathBytes.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  view.setUint32(pos, 0x06054b50, true); // EOCD signature
  view.setUint16(pos + 4, 0, true); // Disk number
  view.setUint16(pos + 6, 0, true); // Disk with central dir
  view.setUint16(pos + 8, fileRecords.length, true); // Entries on this disk
  view.setUint16(pos + 10, fileRecords.length, true); // Total entries
  view.setUint32(pos + 12, centralDirSize, true); // Central dir size
  view.setUint32(pos + 16, centralDirOffset, true); // Central dir offset
  view.setUint16(pos + 20, 0, true); // Comment length

  return new Blob([out], { type: 'application/zip' });
}

// Trigger browser download of a Blob
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
