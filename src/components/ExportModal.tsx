import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Download, 
  Check, 
  Sliders, 
  FolderOpen, 
  FileText, 
  Calendar, 
  CheckSquare, 
  Square, 
  MinusSquare,
  AlertCircle, 
  Layers, 
  BarChart3, 
  Activity, 
  Save,
  RotateCcw,
  Settings,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { ProductConfig, FlightDataPoint, SystemAlgorithmItem } from '../types';
import { SYSTEM_ALGORITHMS } from '../utils/algorithmConfig';
import AlgorithmThresholdModal from './AlgorithmThresholdModal';
import ExportDirModal from './ExportDirModal';
import { 
  ExportSettings, 
  loadExportSettings, 
  saveExportSettings, 
  generateSingleAlgoFileContent, 
  generateMergedFileContent, 
  createZipArchive, 
  downloadBlob, 
  ZipEntry 
} from '../utils/exportUtils';
import { FlightSortie } from '../App';
import DateRangePicker from './DateRangePicker';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  flightDataMap: Record<string, FlightDataPoint[]>;
  availableFlights: FlightSortie[];
  productConfigs: Record<string, ProductConfig>;
  onExportSuccess?: (msg: string) => void;
}

export interface SortieExportResult {
  sortieId: string;
  sortieName: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  fileCount: number;
  error?: string;
}

export default function ExportModal({
  isOpen,
  onClose,
  flightDataMap,
  availableFlights,
  productConfigs,
  onExportSuccess
}: ExportModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [settings, setSettings] = useState<ExportSettings>(loadExportSettings);
  const [syncAsDefaultPath, setSyncAsDefaultPath] = useState<boolean>(false);
  const [thresholdAlgo, setThresholdAlgo] = useState<SystemAlgorithmItem | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<string | null>('2026-07-06');
  const [endDateFilter, setEndDateFilter] = useState<string | null>('2026-07-12');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [savedSuccessBanner, setSavedSuccessBanner] = useState<string | null>(null);

  // Export progress and feedback states
  const [exportPhase, setExportPhase] = useState<'idle' | 'exporting' | 'finished'>('idle');
  const [completedSortiesCount, setCompletedSortiesCount] = useState<number>(0);
  const [currentProcessingSortie, setCurrentProcessingSortie] = useState<string>('');
  const [currentSortieIndex, setCurrentSortieIndex] = useState<number>(0);
  const [sortieResults, setSortieResults] = useState<SortieExportResult[]>([]);
  const [isExportDirModalOpen, setIsExportDirModalOpen] = useState<boolean>(false);

  // Sync settings when opened
  useEffect(() => {
    if (isOpen) {
      setExportPhase('idle');
      setCompletedSortiesCount(0);
      setCurrentProcessingSortie('');
      setCurrentSortieIndex(0);
      setSortieResults([]);
      setErrorMsg(null);

      const loaded = loadExportSettings();
      // Ensure customThresholds has latest defaults from productConfigs if empty
      if (!loaded.customThresholds || Object.keys(loaded.customThresholds).length === 0) {
        loaded.customThresholds = JSON.parse(JSON.stringify(productConfigs));
      }
      setSettings(loaded);
      setSyncAsDefaultPath(false);
      setErrorMsg(null);
      setSavedSuccessBanner(null);
    }
  }, [isOpen, productConfigs]);

  // Format flights list with timestamps
  const formattedFlights = useMemo(() => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return availableFlights.map((f) => {
      const startHour = f.startHour;
      const startMin = f.startMin;
      const endMinutesTotal = Math.round(startHour * 60 + startMin + f.durationHours * 60);
      const endHour = Math.floor(endMinutesTotal / 60) % 24;
      const endMin = endMinutesTotal % 60;

      return {
        id: f.id,
        name: f.name,
        date: f.date,
        startTime: `${f.date} ${pad(startHour)}:${pad(startMin)}:00`,
        endTime: `${f.date} ${pad(endHour)}:${pad(endMin)}:00`,
        durationText: `${f.durationHours >= 1 ? `${Math.floor(f.durationHours)}小时` : ''}${Math.round((f.durationHours % 1) * 60)}分钟`,
        rawDuration: f.durationHours
      };
    }).sort((a, b) => b.startTime.localeCompare(a.startTime)); // Descending start time
  }, [availableFlights]);

  // Flight count map for date picker dots
  const flightCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    availableFlights.forEach(f => {
      map[f.date] = (map[f.date] || 0) + 1;
    });
    return map;
  }, [availableFlights]);

  // Filtered flights by date range
  const filteredFlights = useMemo(() => {
    return formattedFlights.filter(f => {
      if (!startDateFilter) return true;
      if (!endDateFilter) return f.date === startDateFilter;
      return f.date >= startDateFilter && f.date <= endDateFilter;
    });
  }, [formattedFlights, startDateFilter, endDateFilter]);

  // Pagination (10 per page)
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const totalPages = Math.max(1, Math.ceil(filteredFlights.length / PAGE_SIZE));

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [startDateFilter, endDateFilter]);

  // Keep currentPage valid
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Sliced items for current page
  const pagedFlights = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFlights.slice(start, start + PAGE_SIZE);
  }, [filteredFlights, currentPage]);

  // Toggle sortie selection
  const toggleSortie = (id: string) => {
    setErrorMsg(null);
    setSettings(prev => {
      const isSelected = prev.selectedSorties.includes(id);
      return {
        ...prev,
        selectedSorties: isSelected
          ? prev.selectedSorties.filter(s => s !== id)
          : [...prev.selectedSorties, id]
      };
    });
  };

  // Header checkbox: check/uncheck current page flights
  const isAllPageSelected = pagedFlights.length > 0 && pagedFlights.every(f => settings.selectedSorties.includes(f.id));
  const isSomePageSelected = pagedFlights.some(f => settings.selectedSorties.includes(f.id)) && !isAllPageSelected;

  const handleToggleSelectAllPage = () => {
    setErrorMsg(null);
    if (isAllPageSelected) {
      const pageIds = new Set(pagedFlights.map(f => f.id));
      setSettings(prev => ({
        ...prev,
        selectedSorties: prev.selectedSorties.filter(id => !pageIds.has(id))
      }));
    } else {
      const existing = new Set(settings.selectedSorties);
      pagedFlights.forEach(f => existing.add(f.id));
      setSettings(prev => ({
        ...prev,
        selectedSorties: Array.from(existing)
      }));
    }
  };

  // Toggle algorithm selection
  const toggleAlgorithm = (legacyId: string) => {
    setSettings(prev => {
      const isSelected = prev.selectedAlgorithms.includes(legacyId);
      const next = isSelected
        ? prev.selectedAlgorithms.filter(id => id !== legacyId)
        : [...prev.selectedAlgorithms, legacyId];
      return { ...prev, selectedAlgorithms: next };
    });
  };

  // Grouped algorithms
  const icingAlgorithms = useMemo(() => SYSTEM_ALGORITHMS.filter(a => a.category === 'icing_intensity'), []);
  const turbulenceAlgorithms = useMemo(() => SYSTEM_ALGORITHMS.filter(a => a.category === 'turbulence'), []);
  const selectableAlgorithms = useMemo(() => [...icingAlgorithms, ...turbulenceAlgorithms], [icingAlgorithms, turbulenceAlgorithms]);

  const icingAlgoIds = useMemo(() => icingAlgorithms.map(a => a.legacyId), [icingAlgorithms]);
  const turbulenceAlgoIds = useMemo(() => turbulenceAlgorithms.map(a => a.legacyId), [turbulenceAlgorithms]);

  const selectedIcingCount = useMemo(() => {
    return icingAlgoIds.filter(id => settings.selectedAlgorithms.includes(id)).length;
  }, [icingAlgoIds, settings.selectedAlgorithms]);

  const isAllIcingSelected = selectedIcingCount === icingAlgoIds.length && icingAlgoIds.length > 0;
  const isSomeIcingSelected = selectedIcingCount > 0 && !isAllIcingSelected;

  const handleToggleAllIcing = () => {
    setSettings(prev => {
      if (isAllIcingSelected) {
        return {
          ...prev,
          selectedAlgorithms: prev.selectedAlgorithms.filter(id => !icingAlgoIds.includes(id))
        };
      } else {
        const set = new Set(prev.selectedAlgorithms);
        icingAlgoIds.forEach(id => set.add(id));
        return {
          ...prev,
          selectedAlgorithms: Array.from(set)
        };
      }
    });
  };

  const selectedTurbulenceCount = useMemo(() => {
    return turbulenceAlgoIds.filter(id => settings.selectedAlgorithms.includes(id)).length;
  }, [turbulenceAlgoIds, settings.selectedAlgorithms]);

  const isAllTurbulenceSelected = selectedTurbulenceCount === turbulenceAlgoIds.length && turbulenceAlgoIds.length > 0;
  const isSomeTurbulenceSelected = selectedTurbulenceCount > 0 && !isAllTurbulenceSelected;

  const handleToggleAllTurbulence = () => {
    setSettings(prev => {
      if (isAllTurbulenceSelected) {
        return {
          ...prev,
          selectedAlgorithms: prev.selectedAlgorithms.filter(id => !turbulenceAlgoIds.includes(id))
        };
      } else {
        const set = new Set(prev.selectedAlgorithms);
        turbulenceAlgoIds.forEach(id => set.add(id));
        return {
          ...prev,
          selectedAlgorithms: Array.from(set)
        };
      }
    });
  };

  const totalSelectedAlgosCount = selectedIcingCount + selectedTurbulenceCount;

  // Calculate estimated total files count
  const estimatedFilesCount = settings.fileOrganization === 'merged'
    ? settings.selectedSorties.length
    : settings.selectedSorties.length * totalSelectedAlgosCount;

  // Reset all export settings to defaults (inheriting external threshold parameters)
  const handleResetSettings = () => {
    const defaultSettings: ExportSettings = {
      selectedSorties: availableFlights.length > 0 ? [availableFlights[0].id] : ['20260711_B651N_02'],
      selectedAlgorithms: selectableAlgorithms.map(a => a.legacyId),
      fileOrganization: 'split',
      exportFormat: 'csv',
      exportPath: 'D:/TOLX_Export/',
      customThresholds: JSON.parse(JSON.stringify(productConfigs))
    };
    setSettings(defaultSettings);
    setSyncAsDefaultPath(false);
    setErrorMsg(null);
    setSavedSuccessBanner('已恢复默认设置（包含继承自主界面阈值设置的默认参数）！');
    setTimeout(() => setSavedSuccessBanner(null), 3500);
  };

  // Save current settings as default
  const handleSaveAsDefault = () => {
    const prevSaved = loadExportSettings();
    const effectiveExportPath = syncAsDefaultPath ? settings.exportPath : prevSaved.exportPath;
    const settingsToSave: ExportSettings = {
      ...settings,
      exportPath: effectiveExportPath
    };
    saveExportSettings(settingsToSave);
    if (syncAsDefaultPath) {
      setSavedSuccessBanner(`已成功将当前导出参数及默认路径【${settings.exportPath}】保存为系统默认！`);
    } else {
      setSavedSuccessBanner(`已成功保存默认设置（未勾选同步保存默认路径，系统默认路径仍保持【${prevSaved.exportPath}】）！`);
    }
    setTimeout(() => setSavedSuccessBanner(null), 3000);
  };

  const successSorties = useMemo(() => sortieResults.filter(r => r.status === 'success'), [sortieResults]);
  const failedSorties = useMemo(() => sortieResults.filter(r => r.status === 'failed'), [sortieResults]);
  const totalExportedFilesCount = useMemo(() => sortieResults.reduce((acc, r) => acc + r.fileCount, 0), [sortieResults]);
  const progressPercentage = useMemo(() => {
    if (settings.selectedSorties.length === 0) return 0;
    return Math.min(100, Math.round((completedSortiesCount / settings.selectedSorties.length) * 100));
  }, [completedSortiesCount, settings.selectedSorties.length]);

  const handleOpenExportDirectory = () => {
    if (settings.exportPath) {
      navigator.clipboard?.writeText(settings.exportPath).catch(() => {});
    }
    setIsExportDirModalOpen(true);
  };

  // Execute export
  const handleExecuteExport = async () => {
    if (settings.selectedSorties.length === 0) {
      setErrorMsg('未选择任何飞行架次，无法执行导出！');
      return;
    }

    if (totalSelectedAlgosCount === 0) {
      setErrorMsg('未选择任何算法，请至少勾选一个需要导出的算法！');
      return;
    }

    setErrorMsg(null);
    setExportPhase('exporting');
    setCompletedSortiesCount(0);
    setIsExporting(true);

    const initialResults: SortieExportResult[] = settings.selectedSorties.map(id => {
      const flight = availableFlights.find(f => f.id === id);
      return {
        sortieId: id,
        sortieName: flight?.name || id,
        status: 'pending',
        fileCount: 0
      };
    });
    setSortieResults(initialResults);

    const zipEntries: ZipEntry[] = [];
    const selectedAlgoItems = selectableAlgorithms.filter(a => settings.selectedAlgorithms.includes(a.legacyId));
    const ext = settings.exportFormat === 'csv' ? 'csv' : 'txt';

    for (let i = 0; i < settings.selectedSorties.length; i++) {
      const sortieId = settings.selectedSorties[i];
      const sortieName = availableFlights.find(f => f.id === sortieId)?.name || sortieId;
      setCurrentSortieIndex(i);
      setCurrentProcessingSortie(sortieName);

      // Mark current sortie as processing
      setSortieResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'processing' } : r));

      // Small async delay so UI progress bar is visible and informative
      await new Promise(resolve => setTimeout(resolve, 380));

      try {
        const points = flightDataMap[sortieId] || [];
        if (!points || points.length === 0) {
          throw new Error('未检索到该架次的飞行轨迹与时序算法数据');
        }

        let fileCountThisSortie = 0;
        if (settings.fileOrganization === 'merged') {
          // Merged file for this sortie
          const content = generateMergedFileContent(
            sortieId,
            selectedAlgoItems,
            points,
            settings.customThresholds || productConfigs,
            settings.exportFormat
          );
          zipEntries.push({
            path: `${sortieId}/${sortieId}_全算法综合导出.${ext}`,
            content
          });
          fileCountThisSortie = 1;
        } else {
          // Split file per algorithm for this sortie
          for (const algo of selectedAlgoItems) {
            const cfg = (settings.customThresholds && settings.customThresholds[algo.legacyId]) || productConfigs[algo.legacyId];
            const content = generateSingleAlgoFileContent(
              sortieId,
              algo,
              points,
              cfg,
              settings.exportFormat
            );
            zipEntries.push({
              path: `${sortieId}/${sortieId}_${algo.id}_${algo.shortName}.${ext}`,
              content
            });
            fileCountThisSortie++;
          }
        }

        // Mark as success
        setSortieResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'success',
          fileCount: fileCountThisSortie
        } : r));
      } catch (err: any) {
        console.error(`Sortie ${sortieId} export failed:`, err);
        const errMsg = err?.message || '生成导出文件异常';
        // Single sortie failure does not stop others!
        setSortieResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: 'failed',
          fileCount: 0,
          error: errMsg
        } : r));
      }

      setCompletedSortiesCount(i + 1);
    }

    // Brief delay before switching to finished
    await new Promise(resolve => setTimeout(resolve, 250));

    // If any files were generated, create the zip package and trigger download
    if (zipEntries.length > 0) {
      try {
        const zipBlob = createZipArchive(zipEntries);
        const zipFileName = `TOLX_数据导出_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}_${Date.now().toString().slice(-4)}.zip`;
        downloadBlob(zipBlob, zipFileName);

        // Auto-save settings
        const prevSaved = loadExportSettings();
        const effectiveExportPath = syncAsDefaultPath ? settings.exportPath : prevSaved.exportPath;
        saveExportSettings({
          ...settings,
          exportPath: effectiveExportPath
        });
      } catch (archiveErr: any) {
        console.error('Zip packaging failed:', archiveErr);
      }
    }

    setIsExporting(false);
    setExportPhase('finished');

    if (zipEntries.length > 0 && onExportSuccess) {
      onExportSuccess(`数据导出处理完成！共生成 ${zipEntries.length} 个数据文件。`);
    }
  };

  if (!isOpen) return null;

  const isIdle = exportPhase === 'idle';

  const handleCloseModal = () => {
    if (isExporting) return;
    setExportPhase('idle');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none animate-in fade-in duration-100">
      <div 
        className={`${
          isIdle
            ? 'w-[1020px] max-w-[calc(100vw-32px)] h-[820px] max-h-[92vh]'
            : 'w-[460px] max-w-[calc(100vw-32px)] animate-in zoom-in-95 duration-150'
        } flex-none rounded-md border shadow-2xl overflow-hidden flex flex-col font-mono text-xs ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#141416] border-[#2A2A2C] text-white'
        }`}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b shrink-0 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm tracking-wide">
              {isIdle ? '导出' : exportPhase === 'exporting' ? '正在导出' : '导出结果'}
            </h2>
          </div>
          <button
            onClick={isExporting ? undefined : handleCloseModal}
            disabled={isExporting}
            className={`p-1 rounded transition-colors ${
              isExporting
                ? 'opacity-30 cursor-not-allowed'
                : (isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB] cursor-pointer' : 'text-white/40 hover:text-white hover:bg-white/10 cursor-pointer')
            }`}
            title={isExporting ? '正在导出数据，请稍候' : '关闭'}
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Main Body */}
        {exportPhase === 'idle' ? (
          <div 
            className="p-5 flex-1 overflow-y-auto space-y-6 custom-scrollbar"
            style={{ scrollbarGutter: 'stable' }}
          >
          {/* SECTION 1: 飞行架次选择 */}
          <div className={`p-4 rounded border space-y-3 ${
            isLight ? 'bg-white border-[#E4E3DE]' : 'bg-[#18181A] border-[#2A2A2C]'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className={`text-[12px] font-bold ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                  1. 导出架次选择
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  isLight ? 'bg-sky-50 text-[#0284C7] border border-sky-200' : 'bg-sky-950/40 text-sky-400 border border-sky-800/40'
                }`}>
                  已选 {settings.selectedSorties.length} 个
                </span>
              </div>

              {/* Date Filter via DateRangePicker */}
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold shrink-0 ${isLight ? 'text-[#52525B]' : 'text-white/70'}`}>
                  按日期筛选：
                </span>
                <div className="w-[240px]">
                  <DateRangePicker
                    startDate={startDateFilter}
                    endDate={endDateFilter}
                    onChange={(start, end) => {
                      setStartDateFilter(start);
                      setEndDateFilter(end);
                    }}
                    flightCountMap={flightCountMap}
                    popoverWidth="w-[280px]"
                  />
                </div>
              </div>
            </div>

            {/* Sorties Table */}
            <div 
              className="border rounded overflow-hidden h-[216px] overflow-y-scroll custom-scrollbar"
              style={{ scrollbarGutter: 'stable' }}
            >
              <table className="table-fixed w-full text-center border-collapse">
                <colgroup>
                  <col style={{ width: '44px' }} />
                  <col style={{ width: '40px' }} />
                  <col style={{ width: '220px' }} />
                  <col style={{ width: '210px' }} />
                  <col style={{ width: '210px' }} />
                  <col style={{ width: '140px' }} />
                </colgroup>
                <thead className="sticky top-0 z-10 shadow-xs">
                  <tr className={`border-b text-[11px] font-bold ${
                    isLight ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#52525B]' : 'bg-[#1C1C1E] border-[#2A2A2C] text-white/60'
                  }`}>
                    <th style={{ width: '44px' }} className="py-2.5 px-0 text-center">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAllPage}
                          className={`cursor-pointer inline-flex items-center justify-center transition-colors ${
                            isAllPageSelected || isSomePageSelected
                              ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]')
                              : 'text-zinc-400 hover:text-zinc-600'
                          }`}
                          title={isAllPageSelected ? '取消全选当前页' : '全选当前页'}
                        >
                          {isAllPageSelected ? (
                            <CheckSquare size={14} />
                          ) : isSomePageSelected ? (
                            <MinusSquare size={14} />
                          ) : (
                            <Square size={14} />
                          )}
                        </button>
                      </div>
                    </th>
                    <th style={{ width: '40px' }} className="py-2.5 px-0 text-center">序号</th>
                    <th style={{ width: '220px' }} className="py-2.5 px-2 text-center">飞行架次</th>
                    <th style={{ width: '210px' }} className="py-2.5 px-2 text-center">飞行开始时间</th>
                    <th style={{ width: '210px' }} className="py-2.5 px-2 text-center">飞行结束时间</th>
                    <th style={{ width: '140px' }} className="py-2.5 px-2 text-center">飞行总时长</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                  {pagedFlights.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-400">
                        所选日期范围内未找到历史飞行架次
                      </td>
                    </tr>
                  ) : (
                    pagedFlights.map((f, idx) => {
                      const isSelected = settings.selectedSorties.includes(f.id);
                      return (
                        <tr
                          key={f.id}
                          onClick={() => toggleSortie(f.id)}
                          className={`cursor-pointer transition-colors ${
                            isSelected
                              ? (isLight ? 'bg-sky-50/80' : 'bg-sky-950/20')
                              : (isLight ? 'hover:bg-zinc-50' : 'hover:bg-white/[0.02]')
                          }`}
                        >
                          <td style={{ width: '44px' }} className="py-2 px-0 text-center">
                            <div className="flex items-center justify-center">
                              <span className={isSelected ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : 'text-zinc-400'}>
                                {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                              </span>
                            </div>
                          </td>
                          <td style={{ width: '40px' }} className={`py-2 px-0 text-center font-mono font-normal text-xs ${
                            isLight ? 'text-[#71717A]' : 'text-white/60'
                          }`}>
                            {(currentPage - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          <td style={{ width: '220px' }} className="py-2 px-2 text-center font-bold font-mono text-xs">
                            <span className={isSelected ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : ''}>
                              {f.name}
                            </span>
                          </td>
                          <td style={{ width: '210px' }} className={`py-2 px-2 text-center font-mono font-normal text-xs ${
                            isLight ? 'text-[#52525B]' : 'text-white/70'
                          }`}>
                            {f.startTime}
                          </td>
                          <td style={{ width: '210px' }} className={`py-2 px-2 text-center font-mono font-normal text-xs ${
                            isLight ? 'text-[#52525B]' : 'text-white/70'
                          }`}>
                            {f.endTime}
                          </td>
                          <td style={{ width: '140px' }} className={`py-2 px-2 text-center font-mono font-normal text-xs ${
                            isLight ? 'text-[#52525B]' : 'text-white/70'
                          }`}>
                            {f.durationText}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Count & Pagination Controls */}
            <div className={`px-3 py-1.5 rounded text-[11px] flex items-center justify-between border ${
              isLight ? 'bg-[#F4F3F0] border-[#E4E3DE] text-[#71717A]' : 'bg-white/5 border-white/5 text-white/50'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold font-mono">共 {filteredFlights.length} 个</span>
              </div>

              {/* Pagination controls */}
              <div className="flex items-center gap-1 font-mono">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${
                    currentPage <= 1
                      ? 'opacity-30 cursor-not-allowed border-transparent'
                      : (isLight ? 'bg-white border-[#D5D3CE] text-[#3F3F46] hover:bg-[#E2E0DB] cursor-pointer shadow-xs' : 'bg-white/10 border-white/10 text-white/80 hover:bg-white/20 cursor-pointer')
                  }`}
                >
                  上一页
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-6 h-5.5 px-1.5 flex items-center justify-center rounded text-[11px] font-bold font-mono transition-colors cursor-pointer border ${
                        currentPage === pageNum
                          ? (isLight ? 'bg-white border-[#0284C7] text-[#0284C7] shadow-xs ring-1 ring-[#0284C7]' : 'bg-[#1F1F23] border-[#00E5FF] text-[#00E5FF] shadow-xs ring-1 ring-[#00E5FF]')
                          : (isLight ? 'bg-transparent border-transparent text-[#71717A] hover:bg-white/80' : 'bg-transparent border-transparent text-white/50 hover:bg-white/10')
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={`px-2 py-0.5 rounded text-[10px] transition-colors border ${
                    currentPage >= totalPages
                      ? 'opacity-30 cursor-not-allowed border-transparent'
                      : (isLight ? 'bg-white border-[#D5D3CE] text-[#3F3F46] hover:bg-[#E2E0DB] cursor-pointer shadow-xs' : 'bg-white/10 border-white/10 text-white/80 hover:bg-white/20 cursor-pointer')
                  }`}
                >
                  下一页
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 2: 导出算法选择 */}
          <div className={`p-4 rounded border space-y-3 ${
            isLight ? 'bg-white border-[#E4E3DE]' : 'bg-[#18181A] border-[#2A2A2C]'
          }`}>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <span className={`text-[12px] font-bold ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                  2. 导出算法选择
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                  isLight ? 'bg-zinc-100 text-[#52525B] border border-zinc-200' : 'bg-white/10 text-white/70 border border-white/10'
                }`}>
                  已选 {totalSelectedAlgosCount} / {selectableAlgorithms.length} 个算法
                </span>
              </div>
            </div>

            {/* Algorithms Grid Section */}
            <div className="space-y-3">
              {/* Icing Algorithms Grid */}
              <div className={`p-3 rounded border space-y-2 ${
                isLight ? 'bg-[#FAFAF8] border-[#E4E3DE]' : 'bg-[#141416] border-[#2A2A2C]'
              }`}>
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleToggleAllIcing}
                    className="font-bold flex items-center gap-1.5 text-[11px] text-cyan-600 dark:text-cyan-400 cursor-pointer select-none group"
                    title={isAllIcingSelected ? '点击取消全选积冰算法' : '点击全选积冰算法'}
                  >
                    <span className="shrink-0 transition-colors">
                      {isAllIcingSelected ? (
                        <CheckSquare size={13} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
                      ) : isSomeIcingSelected ? (
                        <MinusSquare size={13} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
                      ) : (
                        <Square size={13} className={isLight ? 'text-zinc-400 group-hover:text-zinc-600' : 'text-zinc-500 group-hover:text-zinc-300'} />
                      )}
                    </span>
                    <BarChart3 size={13} />
                    <span className="group-hover:underline decoration-cyan-500/50 underline-offset-2">积冰监测算法（自动关联最大航行距离）</span>
                  </button>
                  <span className="text-[10px] text-zinc-400 font-mono">已选 {selectedIcingCount} / {icingAlgorithms.length} 个</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {icingAlgorithms.map(algo => {
                    const isChecked = settings.selectedAlgorithms.includes(algo.legacyId);
                    const isCustomized = Boolean(settings.customThresholds && settings.customThresholds[algo.legacyId]);
                    return (
                      <div
                        key={algo.id}
                        onClick={() => toggleAlgorithm(algo.legacyId)}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                          isChecked
                            ? (isLight ? 'bg-white border-[#0284C7]/60 shadow-xs' : 'bg-white/5 border-[#00E5FF]/60')
                            : (isLight ? 'bg-zinc-100/50 border-zinc-200 opacity-60' : 'bg-black/30 border-zinc-800 opacity-40')
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={isChecked ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : 'text-zinc-400'}>
                            {isChecked ? <CheckSquare size={13} /> : <Square size={13} />}
                          </span>
                          <span className="font-bold truncate text-[11px]">{algo.shortName}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap ${
                              isLight ? 'bg-zinc-200/80 text-zinc-600' : 'bg-white/10 text-white/40'
                            }`}
                            title={`算法版本：${algo.version}`}
                          >
                            {algo.version}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setThresholdAlgo(algo);
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isCustomized
                                ? (isLight ? 'text-[#0284C7] bg-sky-50 hover:bg-sky-100' : 'text-[#00E5FF] bg-cyan-950/40 hover:bg-cyan-900/60')
                                : (isLight ? 'text-zinc-400 hover:text-[#0284C7] hover:bg-zinc-200/60' : 'text-white/40 hover:text-[#00E5FF] hover:bg-white/10')
                            }`}
                            title={isCustomized ? `已自定义【${algo.name}】导出阈值，点击修改` : `设置【${algo.name}】的导出阈值参数`}
                          >
                            <Settings size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Turbulence Algorithms Grid */}
              <div className={`p-3 rounded border space-y-2 ${
                isLight ? 'bg-[#FAFAF8] border-[#E4E3DE]' : 'bg-[#141416] border-[#2A2A2C]'
              }`}>
                <div className="flex items-center justify-between pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <button
                    type="button"
                    onClick={handleToggleAllTurbulence}
                    className="font-bold flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 cursor-pointer select-none group"
                    title={isAllTurbulenceSelected ? '点击取消全选颠簸算法' : '点击全选颠簸算法'}
                  >
                    <span className="shrink-0 transition-colors">
                      {isAllTurbulenceSelected ? (
                        <CheckSquare size={13} className="text-amber-500" />
                      ) : isSomeTurbulenceSelected ? (
                        <MinusSquare size={13} className="text-amber-500" />
                      ) : (
                        <Square size={13} className={isLight ? 'text-zinc-400 group-hover:text-zinc-600' : 'text-zinc-500 group-hover:text-zinc-300'} />
                      )}
                    </span>
                    <Activity size={13} />
                    <span className="group-hover:underline decoration-amber-500/50 underline-offset-2">颠簸监测算法</span>
                  </button>
                  <span className="text-[10px] text-zinc-400 font-mono">已选 {selectedTurbulenceCount} / {turbulenceAlgorithms.length} 个</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {turbulenceAlgorithms.map(algo => {
                    const isChecked = settings.selectedAlgorithms.includes(algo.legacyId);
                    const isCustomized = Boolean(settings.customThresholds && settings.customThresholds[algo.legacyId]);
                    return (
                      <div
                        key={algo.id}
                        onClick={() => toggleAlgorithm(algo.legacyId)}
                        className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                          isChecked
                            ? (isLight ? 'bg-white border-amber-500/60 shadow-xs' : 'bg-white/5 border-amber-400/60')
                            : (isLight ? 'bg-zinc-100/50 border-zinc-200 opacity-60' : 'bg-black/30 border-zinc-800 opacity-40')
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={isChecked ? 'text-amber-500' : 'text-zinc-400'}>
                            {isChecked ? <CheckSquare size={13} /> : <Square size={13} />}
                          </span>
                          <span className="font-bold truncate text-[11px]">{algo.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded whitespace-nowrap ${
                              isLight ? 'bg-zinc-200/80 text-zinc-600' : 'bg-white/10 text-white/40'
                            }`}
                            title={`算法版本：${algo.version}`}
                          >
                            {algo.version}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setThresholdAlgo(algo);
                            }}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isCustomized
                                ? (isLight ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-amber-400 bg-amber-950/40 hover:bg-amber-900/60')
                                : (isLight ? 'text-zinc-400 hover:text-amber-600 hover:bg-zinc-200/60' : 'text-white/40 hover:text-amber-400 hover:bg-white/10')
                            }`}
                            title={isCustomized ? `已自定义【${algo.name}】导出阈值，点击修改` : `设置【${algo.name}】的导出阈值参数`}
                          >
                            <Settings size={12} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: 文件格式、组织方式与导出路径（统一面板，最简无说明形式） */}
          <div className={`p-4 rounded border space-y-3.5 ${
            isLight ? 'bg-white border-[#E4E3DE]' : 'bg-[#18181A] border-[#2A2A2C]'
          }`}>
            <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <span className={`text-[12px] font-bold ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                3. 文件格式与导出路径
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 不同算法组织方式 */}
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-bold shrink-0 ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                  不同算法组织方式：
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, fileOrganization: 'split' }))}
                    className={`w-[96px] py-1.5 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center text-center ${
                      settings.fileOrganization === 'split'
                        ? (isLight ? 'bg-white border-[#0284C7] text-[#0284C7] shadow-xs ring-1 ring-[#0284C7]' : 'bg-[#1F1F23] border-[#00E5FF] text-[#00E5FF] shadow-xs ring-1 ring-[#00E5FF]')
                        : (isLight ? 'bg-[#FAFAF8] border-[#E4E3DE] text-[#52525B] hover:bg-[#ECEBE7]' : 'bg-[#141416] border-[#2A2A2C] text-white/60 hover:bg-white/5')
                    }`}
                  >
                    分文件导出
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, fileOrganization: 'merged' }))}
                    className={`w-[96px] py-1.5 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center text-center ${
                      settings.fileOrganization === 'merged'
                        ? (isLight ? 'bg-white border-[#0284C7] text-[#0284C7] shadow-xs ring-1 ring-[#0284C7]' : 'bg-[#1F1F23] border-[#00E5FF] text-[#00E5FF] shadow-xs ring-1 ring-[#00E5FF]')
                        : (isLight ? 'bg-[#FAFAF8] border-[#E4E3DE] text-[#52525B] hover:bg-[#ECEBE7]' : 'bg-[#141416] border-[#2A2A2C] text-white/60 hover:bg-white/5')
                    }`}
                  >
                    合并导出
                  </button>
                </div>
              </div>

              {/* 导出文件格式 */}
              <div className="flex items-center gap-3">
                <span className={`text-[11px] font-bold shrink-0 ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                  导出文件格式：
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, exportFormat: 'csv' }))}
                    className={`w-[108px] py-1.5 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center text-center ${
                      settings.exportFormat === 'csv'
                        ? (isLight ? 'bg-white border-[#0284C7] text-[#0284C7] shadow-xs ring-1 ring-[#0284C7]' : 'bg-[#1F1F23] border-[#00E5FF] text-[#00E5FF] shadow-xs ring-1 ring-[#00E5FF]')
                        : (isLight ? 'bg-[#FAFAF8] border-[#E4E3DE] text-[#52525B] hover:bg-[#ECEBE7]' : 'bg-[#141416] border-[#2A2A2C] text-white/60 hover:bg-white/5')
                    }`}
                  >
                    CSV (*.csv)
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings(prev => ({ ...prev, exportFormat: 'txt' }))}
                    className={`w-[108px] py-1.5 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center text-center ${
                      settings.exportFormat === 'txt'
                        ? (isLight ? 'bg-white border-[#0284C7] text-[#0284C7] shadow-xs ring-1 ring-[#0284C7]' : 'bg-[#1F1F23] border-[#00E5FF] text-[#00E5FF] shadow-xs ring-1 ring-[#00E5FF]')
                        : (isLight ? 'bg-[#FAFAF8] border-[#E4E3DE] text-[#52525B] hover:bg-[#ECEBE7]' : 'bg-[#141416] border-[#2A2A2C] text-white/60 hover:bg-white/5')
                    }`}
                  >
                    TXT (*.txt)
                  </button>
                </div>
              </div>
            </div>

            {/* 导出目标存储路径 */}
            <div className="flex items-center gap-3 pt-1">
              <span className={`text-[11px] font-bold shrink-0 ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                导出路径：
              </span>
              <div className="flex items-center gap-3 flex-1 max-w-[620px]">
                <input
                  type="text"
                  value={settings.exportPath}
                  onChange={(e) => setSettings(prev => ({ ...prev, exportPath: e.target.value }))}
                  className={`flex-1 px-2.5 py-1.5 rounded border font-mono text-xs outline-none ${
                    isLight ? 'bg-white border-[#D5D3CE] focus:border-[#0284C7]' : 'bg-black/40 border-[#2A2A2C] text-white focus:border-[#00E5FF]'
                  }`}
                  placeholder="例如 D:/TOLX_Export/"
                />
                <label 
                  className="flex items-center gap-1.5 cursor-pointer shrink-0 select-none py-1 px-1 rounded transition-colors"
                  title="勾选后点击「保存为默认设置」或执行导出时，将当前路径同步保存为系统默认路径"
                >
                  <input
                    type="checkbox"
                    checked={syncAsDefaultPath}
                    onChange={(e) => setSyncAsDefaultPath(e.target.checked)}
                    className="hidden"
                  />
                  <span className={syncAsDefaultPath ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : 'text-zinc-400'}>
                    {syncAsDefaultPath ? <CheckSquare size={14} /> : <Square size={14} />}
                  </span>
                  <span className={`text-xs ${
                    syncAsDefaultPath
                      ? (isLight ? 'text-[#0284C7] font-bold' : 'text-[#00E5FF] font-bold')
                      : (isLight ? 'text-[#52525B]' : 'text-white/60')
                  }`}>
                    同步保存为默认路径
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Validation Error Banner */}
          {errorMsg && (
            <div className="p-2.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-500 flex items-center gap-2 text-[11px] animate-in fade-in">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {savedSuccessBanner && (
            <div className="p-2.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-2 text-[11px] animate-in fade-in">
              <Check size={14} className="shrink-0" />
              <span>{savedSuccessBanner}</span>
            </div>
          )}
        </div>
      ) : (
        /* 小框主体：导出中或导出结果 */
        <div className="p-5 space-y-4">
          {exportPhase === 'exporting' ? (
            /* 导出中：显示条和信息 */
            <div className="space-y-3.5 py-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-200">
                  <Loader2 size={14} className="animate-spin text-[#0284C7] dark:text-[#00E5FF]" />
                  <span>正在导出数据，请稍候...</span>
                </span>
                <span className="font-mono font-bold text-zinc-500">
                  {completedSortiesCount} / {settings.selectedSorties.length}
                </span>
              </div>

              {/* 进度条：一根条表明当前导出架次的进度，条上显示已完成架次数、总架次数 */}
              <div className="relative w-full h-6 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 shadow-inner">
                <div
                  className={`h-full transition-all duration-300 relative ${
                    isLight ? 'bg-[#0284C7]' : 'bg-[#00E5FF]'
                  }`}
                  style={{ width: `${Math.max(progressPercentage, 4)}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[pulse_1.5s_ease-in-out_infinite]" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-bold pointer-events-none text-zinc-700 dark:text-zinc-200">
                  {completedSortiesCount} / {settings.selectedSorties.length} ({progressPercentage}%)
                </div>
              </div>

              {/* 显示当前正在处理的飞行架次 */}
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 pt-0.5 truncate">
                <span className="shrink-0">当前处理架次：</span>
                <span className="font-bold font-mono text-[#0284C7] dark:text-[#00E5FF] truncate">
                  {currentProcessingSortie || '正在准备...'}
                </span>
              </div>
            </div>
          ) : (
            /* 导出完：显示成功，或者简单列出失败架次和原因 */
            <div className="space-y-3">
              {failedSorties.length === 0 ? (
                /* 全部成功 */
                <div className="py-2.5 flex flex-col items-center text-center space-y-2.5">
                  <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 size={24} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">全部导出成功</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      共完成 <strong className="text-emerald-600 dark:text-emerald-400">{settings.selectedSorties.length}</strong> 个架次导出，数据文件已打包下载。
                    </p>
                  </div>
                </div>
              ) : (
                /* 存在失败：简单列出失败架次和原因 */
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    {successSorties.length > 0 ? (
                      <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                    ) : (
                      <XCircle size={18} className="text-rose-500 shrink-0" />
                    )}
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {successSorties.length > 0 ? '部分架次导出失败' : '全部架次导出失败'}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono ml-auto">
                      成功 {successSorties.length} / 失败 {failedSorties.length}
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-500">
                    失败架次及原因：
                  </div>

                  {/* 失败架次列表（简单列出） */}
                  <div className="max-h-[140px] overflow-y-auto rounded border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-2.5 space-y-2 custom-scrollbar">
                    {failedSorties.map(f => (
                      <div key={f.sortieId} className="flex items-start justify-between gap-3 text-xs leading-tight">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 shrink-0 font-mono">
                          • {f.sortieName}
                        </span>
                        <span className="text-rose-600 dark:text-rose-400 text-right truncate" title={f.error || '未检索到有效数据'}>
                          {f.error || '未检索到有效数据'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal Footer */}
      {(isIdle || exportPhase === 'finished') && (
        <div className={`flex items-center justify-between px-5 py-3 border-t shrink-0 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          {isIdle ? (
            /* CONFIGURATION FOOTER */
            <>
              <div className="flex items-center gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={handleResetSettings}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#52525B] hover:text-[#18181B] hover:bg-[#E2E0DB]'
                      : 'bg-black/30 border-[#2A2A2C] text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                  title="重置所有导出参数与阈值设置，恢复默认"
                >
                  <RotateCcw size={12} />
                  <span>重置设置</span>
                </button>

                <span className="font-bold">
                  {settings.selectedSorties.length} 个架次 × {totalSelectedAlgosCount} 个算法
                </span>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${
                  isLight ? 'bg-zinc-200 text-zinc-700' : 'bg-white/10 text-white/70'
                }`}>
                  预计生成 {estimatedFilesCount} 个文件
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#52525B] hover:bg-[#E2E0DB]'
                      : 'bg-white/5 border-[#2A2A2C] text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  取消
                </button>

                <button
                  type="button"
                  onClick={handleSaveAsDefault}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#52525B] hover:text-[#18181B] hover:bg-[#E2E0DB]'
                      : 'bg-black/30 border-[#2A2A2C] text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Save size={12} />
                  <span>保存设置</span>
                </button>

                <button
                  type="button"
                  disabled={isExporting || settings.selectedSorties.length === 0 || totalSelectedAlgosCount === 0}
                  onClick={handleExecuteExport}
                  className={`px-4 py-1.5 rounded text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isLight
                      ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                      : 'bg-[#0A84FF] hover:bg-[#0070E0] text-white'
                  }`}
                >
                  <Download size={13} className={isExporting ? 'animate-bounce' : ''} />
                  <span>{isExporting ? '正在导出...' : '导出'}</span>
                </button>
              </div>
            </>
          ) : (
            /* FINISHED FOOTER (小框底部：返回设置、打开导出目录、确定) */
            <div className="flex items-center justify-between w-full">
              <button
                type="button"
                onClick={() => setExportPhase('idle')}
                className={`px-3 py-1.5 rounded text-[11px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#52525B] hover:text-[#18181B] hover:bg-[#E2E0DB]'
                    : 'bg-black/30 border-[#2A2A2C] text-white/70 hover:text-white hover:bg-white/10'
                }`}
                title="返回修改导出设置"
              >
                <RotateCcw size={12} />
                <span>返回设置</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenExportDirectory}
                  className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    isLight
                      ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                      : 'bg-[#0A84FF] hover:bg-[#0070E0] text-white'
                  }`}
                  title="打开并查看系统默认导出目录及文件"
                >
                  <FolderOpen size={13} />
                  <span>打开导出目录</span>
                </button>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className={`px-4 py-1.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#52525B] hover:bg-[#E2E0DB]'
                      : 'bg-white/5 border-[#2A2A2C] text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  确定
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* 算法独立阈值参数配置弹窗（复用阈值设置组件，仅限导出模块生效） */}
      {thresholdAlgo && (
        <AlgorithmThresholdModal
          isOpen={Boolean(thresholdAlgo)}
          onClose={() => setThresholdAlgo(null)}
          algorithm={thresholdAlgo}
          hideColor={true}
          title="阈值配置"
          confirmText="确定"
          config={
            (settings.customThresholds && settings.customThresholds[thresholdAlgo.legacyId]) ||
            productConfigs[thresholdAlgo.legacyId]
          }
          onSave={(newConfig) => {
            const algoKey = thresholdAlgo.legacyId;
            setSettings(prev => ({
              ...prev,
              customThresholds: {
                ...(prev.customThresholds || {}),
                [algoKey]: newConfig
              }
            }));
            setSavedSuccessBanner(`已更新【${thresholdAlgo.name}】的导出阈值参数（仅在导出模块生效）！`);
            setTimeout(() => setSavedSuccessBanner(null), 3000);
          }}
          onReset={() => {
            const algoKey = thresholdAlgo.legacyId;
            const baseConfig = productConfigs[algoKey];
            if (baseConfig) {
              setSettings(prev => ({
                ...prev,
                customThresholds: {
                  ...(prev.customThresholds || {}),
                  [algoKey]: JSON.parse(JSON.stringify(baseConfig))
                }
              }));
            }
          }}
        />
      )}

      {/* 导出目录弹窗 (Rule 4) */}
      <ExportDirModal
        isOpen={isExportDirModalOpen}
        onClose={() => setIsExportDirModalOpen(false)}
        exportPath={settings.exportPath}
        onOpenExportSettings={() => {
          setIsExportDirModalOpen(false);
          setExportPhase('idle');
        }}
      />
    </div>
  );
}
