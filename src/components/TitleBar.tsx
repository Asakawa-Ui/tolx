import React, { useState, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  X, 
  Terminal, 
  Sun, 
  Moon, 
  Check, 
  Plane, 
  BarChart3, 
  Activity, 
  RotateCcw, 
  FileText, 
  Database, 
  Wrench, 
  HelpCircle, 
  Layers, 
  Sliders, 
  Cpu, 
  Download, 
  FolderOpen, 
  LogOut,
  Zap
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { PanelLayoutConfig, ProductConfig, FlightDataPoint } from '../types';
import PanelLayoutModal from './PanelLayoutModal';
import AlgorithmConfigModal from './AlgorithmConfigModal';
import ExportModal from './ExportModal';
import ExitModal from './ExitModal';
import ExportDirModal from './ExportDirModal';
import { 
  loadExportSettings, 
  generateSingleAlgoFileContent, 
  generateMergedFileContent, 
  createZipArchive, 
  downloadBlob, 
  ZipEntry 
} from '../utils/exportUtils';
import { SYSTEM_ALGORITHMS } from '../utils/algorithmConfig';
import { FlightSortie } from '../App';

interface TitleBarProps {
  onResetAll: () => void;
  rightTab?: 'flight' | 'icing' | 'turbulence';
  onSelectRightTab?: (tab: 'flight' | 'icing' | 'turbulence') => void;
  panelLayout: PanelLayoutConfig;
  onUpdatePanelLayout: (newLayout: PanelLayoutConfig) => void;
  onResetPanelLayout: () => void;
  productConfigs: Record<string, ProductConfig>;
  onUpdateProductConfig: (algoLegacyId: string, updatedConfig: ProductConfig) => void;
  algoStatus: Record<string, boolean>;
  onUpdateAlgoStatus: (newStatus: Record<string, boolean>) => void;
  algoParams: Record<string, Record<string, number>>;
  onUpdateAlgoParams: (newParams: Record<string, Record<string, number>>) => void;
  flightDataMap: Record<string, FlightDataPoint[]>;
  availableFlights: FlightSortie[];
  selectedFlightId: string;
  systemMode?: 'live' | 'history';
  onExitSoftware?: () => void;
}

export default function TitleBar({
  onResetAll,
  rightTab = 'icing',
  onSelectRightTab,
  panelLayout,
  onUpdatePanelLayout,
  onResetPanelLayout,
  productConfigs,
  onUpdateProductConfig,
  algoStatus,
  onUpdateAlgoStatus,
  algoParams,
  onUpdateAlgoParams,
  flightDataMap,
  availableFlights,
  selectedFlightId,
  systemMode = 'live',
  onExitSoftware
}: TitleBarProps) {
  const { theme, setTheme } = useTheme();
  const isLight = theme === 'light';

  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'data' | 'tools' | 'help' | null>(null);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState<boolean>(false);
  const [isAlgoConfigOpen, setIsAlgoConfigOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [isExportDirModalOpen, setIsExportDirModalOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));

  const menuBarRef = useRef<HTMLDivElement | null>(null);

  // Quick Export handler
  const handleQuickExport = () => {
    try {
      const currentSettings = loadExportSettings();
      const currentSortieId = selectedFlightId || '20260711_B651N_02';
      const points = flightDataMap[currentSortieId] || [];

      if (points.length === 0) {
        setToastMessage('⚠️ 当前架次暂无可用飞行数据点，无法执行导出。');
        setTimeout(() => setToastMessage(null), 3500);
        setActiveMenu(null);
        return;
      }

      const selectedAlgoItems = SYSTEM_ALGORITHMS.filter(a => 
        currentSettings.selectedAlgorithms.includes(a.legacyId)
      );
      const ext = currentSettings.exportFormat === 'csv' ? 'csv' : 'txt';
      const zipEntries: ZipEntry[] = [];

      if (currentSettings.fileOrganization === 'merged') {
        const content = generateMergedFileContent(
          currentSortieId,
          selectedAlgoItems,
          points,
          currentSettings.customThresholds || productConfigs,
          currentSettings.exportFormat
        );
        zipEntries.push({
          path: `${currentSortieId}/${currentSortieId}_全算法综合导出.${ext}`,
          content
        });
      } else {
        for (const algo of selectedAlgoItems) {
          const cfg = (currentSettings.customThresholds && currentSettings.customThresholds[algo.legacyId]) || productConfigs[algo.legacyId];
          const content = generateSingleAlgoFileContent(
            currentSortieId,
            algo,
            points,
            cfg,
            currentSettings.exportFormat
          );
          zipEntries.push({
            path: `${currentSortieId}/${currentSortieId}_${algo.id}_${algo.shortName}.${ext}`,
            content
          });
        }
      }

      const zipBlob = createZipArchive(zipEntries);
      const zipFileName = `TOLX_快速导出_${currentSortieId}_${Date.now().toString().slice(-4)}.zip`;
      downloadBlob(zipBlob, zipFileName);

      setToastMessage(`✅ 快速导出完成！已导出架次【${currentSortieId}】的 ${zipEntries.length} 个文件，保存至【${currentSettings.exportPath}${currentSortieId}/】`);
      setTimeout(() => setToastMessage(null), 4500);
      setActiveMenu(null);
    } catch (err: any) {
      console.error('Quick export error:', err);
      setToastMessage(`❌ 导出失败: ${err?.message || '未知错误'}`);
      setTimeout(() => setToastMessage(null), 3500);
      setActiveMenu(null);
    }
  };

  const handleOpenExportDir = () => {
    setIsExportDirModalOpen(true);
    setActiveMenu(null);
  };

  // Sync fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Error attempting to exit fullscreen:', err);
      });
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className={`border border-b-0 rounded-t-md overflow-visible select-none transition-colors duration-200 ${
        isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
      }`} 
      id="pc-window-titlebar"
    >
      {/* Primary OS Window Header */}
      <div 
        className={`px-3.5 py-2 flex items-center justify-between border-b text-[12px] font-mono transition-colors duration-200 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#27272A]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/80'
        }`}
      >
        {/* Left: Client Icon & Core Label */}
        <div className="flex items-center gap-2 font-bold">
          <Terminal size={14} className={isLight ? 'text-[#52525B]' : 'text-white/60'} />
          <span className={`tracking-tight text-[12px] uppercase ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
            飞机积冰协同态势监测与预测系统 v4.2
          </span>
        </div>

        {/* Right: Window control buttons (PC Skin) */}
        <div className="flex items-center gap-1">
          <button 
            className={`w-5 h-5 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="最小化"
          >
            <Minimize2 size={10} />
          </button>
          <button 
            onClick={toggleFullscreen}
            className={`w-5 h-5 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title={isFullscreen ? '切换窗口' : '切换全屏'}
          >
            {isFullscreen ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
          </button>
          <button 
            onClick={() => setIsExitModalOpen(true)}
            className={`w-5 h-5 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:bg-rose-100/70 hover:text-rose-700' : 'text-white/40 hover:text-rose-200 hover:bg-rose-600/40'
            }`}
            title="退出软件"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Dropdown File / View Menu Bar (PC Desktop layout) */}
      <div 
        className={`px-3 py-1.5 flex items-center justify-between border-b text-[12px] font-mono transition-colors duration-200 ${
          isLight ? 'bg-[#F5F4F1] border-[#E4E3DE] text-[#52525B]' : 'bg-[#121214] border-[#2A2A2C] text-white/50'
        }`}
        ref={menuBarRef}
      >
        <div className="flex gap-2 items-center">
          {/* 文件 Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(prev => prev === 'file' ? null : 'file')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeMenu === 'file'
                  ? (isLight ? 'bg-[#ECEBE7] text-[#18181B] font-bold' : 'bg-white/15 text-white font-bold')
                  : (isLight ? 'hover:text-[#18181B] hover:bg-[#ECEBE7]' : 'hover:text-white hover:bg-white/5')
              }`}
            >
              文件
            </button>
            {activeMenu === 'file' && (
              <div 
                className={`absolute top-full left-0 mt-1 z-50 min-w-[210px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                {/* 1.1 快速导出 */}
                <button
                  type="button"
                  onClick={handleQuickExport}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                  title="直接按最近保存设置导出当前正在展示的飞行架次"
                >
                  <div className="flex items-center gap-2">
                    <Zap size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                    <span>快速导出</span>
                  </div>
                  <span className={`text-[10px] font-mono font-normal ${isLight ? 'text-zinc-400' : 'text-white/40'}`}>
                    当前架次
                  </span>
                </button>

                {/* 1.2 导出... */}
                <button
                  type="button"
                  onClick={() => {
                    setIsExportModalOpen(true);
                    setActiveMenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Download size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                    <span>导出...</span>
                  </div>
                  <span className={`text-[10px] font-mono font-normal ${isLight ? 'text-zinc-400' : 'text-white/40'}`}>
                    自定义
                  </span>
                </button>

                {/* 分隔线 */}
                <div className={`my-1 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-white/10'}`} />

                {/* 2. 算法配置... */}
                <button
                  type="button"
                  onClick={() => {
                    setIsAlgoConfigOpen(true);
                    setActiveMenu(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <Cpu size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                  <span>算法配置...</span>
                </button>

                {/* 3. 打开导出目录 */}
                <button
                  type="button"
                  onClick={handleOpenExportDir}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <FolderOpen size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                  <span>打开导出目录</span>
                </button>

                <div className={`my-1 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-white/10'}`} />

                {/* 4. 退出软件 */}
                <button
                  type="button"
                  onClick={() => {
                    setIsExitModalOpen(true);
                    setActiveMenu(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left cursor-pointer ${
                    isLight ? 'hover:bg-rose-50 text-rose-600' : 'hover:bg-rose-500/10 text-rose-400'
                  }`}
                >
                  <LogOut size={13} className="text-rose-600 dark:text-rose-400" />
                  <span>退出软件</span>
                </button>
              </div>
            )}
          </div>

          {/* 视图 Dropdown Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(prev => prev === 'view' ? null : 'view')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                activeMenu === 'view' 
                  ? (isLight ? 'bg-[#ECEBE7] text-[#18181B] font-bold' : 'bg-white/15 text-white font-bold') 
                  : (isLight ? 'hover:text-[#18181B] hover:bg-[#ECEBE7]' : 'hover:text-white hover:bg-white/5')
              }`}
            >
              <span>视图</span>
            </button>

            {activeMenu === 'view' && (
              <div 
                className={`absolute top-full left-0 mt-1 z-50 min-w-[210px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                {/* 1. 面板布局设置 */}
                <button
                  onClick={() => {
                    setIsLayoutModalOpen(true);
                    setActiveMenu(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <Sliders size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                  <span>面板布局设置...</span>
                </button>

                {/* 2. 恢复默认面板布局 */}
                <button
                  onClick={() => {
                    setIsResetConfirmOpen(true);
                    setActiveMenu(null);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <RotateCcw size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                  <span>恢复默认面板布局</span>
                </button>

                {/* 分隔线 */}
                <div className={`my-1.5 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-white/10'}`} />

                {/* 3. 外观主题 */}
                <div className={`px-2.5 py-1 text-[11px] ${
                  isLight ? 'text-[#71717A]' : 'text-white/40'
                }`}>
                  <span>外观主题</span>
                </div>

                {/* 浅色主题 */}
                <button
                  onClick={() => { setTheme('light'); setActiveMenu(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    theme === 'light'
                      ? (isLight ? 'bg-[#E2E0DB] text-[#18181B]' : 'bg-white/10 text-white')
                      : (isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                    <span>浅色主题</span>
                  </div>
                  {theme === 'light' && <Check size={14} className={isLight ? 'text-[#71717A]' : 'text-white/70'} />}
                </button>

                {/* 深色主题 */}
                <button
                  onClick={() => { setTheme('dark'); setActiveMenu(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? (isLight ? 'bg-[#E2E0DB] text-[#18181B]' : 'bg-white/10 text-white')
                      : (isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                    <span>深色主题</span>
                  </div>
                  {theme === 'dark' && <Check size={14} className={isLight ? 'text-[#71717A]' : 'text-white/70'} />}
                </button>

                {/* 分隔线 */}
                <div className={`my-1.5 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-white/10'}`} />

                {/* 4. 切换全屏/切换窗口 */}
                <button
                  onClick={() => {
                    toggleFullscreen();
                    setActiveMenu(null);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isFullscreen ? (
                      <Minimize2 size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                    ) : (
                      <Maximize2 size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                    )}
                    <span>{isFullscreen ? '切换窗口' : '切换全屏'}</span>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 数据 Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(prev => prev === 'data' ? null : 'data')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeMenu === 'data'
                  ? (isLight ? 'bg-[#ECEBE7] text-[#18181B] font-bold' : 'bg-white/15 text-white font-bold')
                  : (isLight ? 'hover:text-[#18181B] hover:bg-[#ECEBE7]' : 'hover:text-white hover:bg-white/5')
              }`}
            >
              数据
            </button>
            {activeMenu === 'data' && (
              <div 
                className={`absolute top-full left-0 mt-1 z-50 min-w-[150px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveMenu(null)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <Database size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                  <span>数据接入</span>
                </button>
              </div>
            )}
          </div>

          {/* 工具 Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(prev => prev === 'tools' ? null : 'tools')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeMenu === 'tools'
                  ? (isLight ? 'bg-[#ECEBE7] text-[#18181B] font-bold' : 'bg-white/15 text-white font-bold')
                  : (isLight ? 'hover:text-[#18181B] hover:bg-[#ECEBE7]' : 'hover:text-white hover:bg-white/5')
              }`}
            >
              工具
            </button>
            {activeMenu === 'tools' && (
              <div 
                className={`absolute top-full left-0 mt-1 z-50 min-w-[150px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveMenu(null)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <Activity size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                  <span>运行监控</span>
                </button>
              </div>
            )}
          </div>

          {/* 帮助 Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(prev => prev === 'help' ? null : 'help')}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                activeMenu === 'help'
                  ? (isLight ? 'bg-[#ECEBE7] text-[#18181B] font-bold' : 'bg-white/15 text-white font-bold')
                  : (isLight ? 'hover:text-[#18181B] hover:bg-[#ECEBE7]' : 'hover:text-white hover:bg-white/5')
              }`}
            >
              帮助
            </button>
            {activeMenu === 'help' && (
              <div 
                className={`absolute top-full left-0 mt-1 z-50 min-w-[230px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                <button
                  onClick={() => setActiveMenu(null)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#27272A]' : 'hover:bg-white/10 text-white/90'
                  }`}
                >
                  <HelpCircle size={13} className={isLight ? 'text-[#71717A]' : 'text-white/60'} />
                  <span>系统操作指南</span>
                </button>
                <div className={`my-1 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-white/10'}`} />
                <div className={`px-2.5 py-1 text-[11px] ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>
                  飞机积冰协同态势监测与预测系统 v4.2
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 面板布局设置弹窗 */}
      <PanelLayoutModal
        isOpen={isLayoutModalOpen}
        onClose={() => setIsLayoutModalOpen(false)}
        currentLayout={panelLayout}
        onSave={onUpdatePanelLayout}
      />

      {/* 算法配置中心弹窗 */}
      <AlgorithmConfigModal
        isOpen={isAlgoConfigOpen}
        onClose={() => setIsAlgoConfigOpen(false)}
        productConfigs={productConfigs}
        onUpdateProductConfig={onUpdateProductConfig}
        algoStatus={algoStatus}
        onUpdateAlgoStatus={onUpdateAlgoStatus}
        algoParams={algoParams}
        onUpdateAlgoParams={onUpdateAlgoParams}
      />

      {/* 数据导出设置弹窗 */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        flightDataMap={flightDataMap}
        availableFlights={availableFlights}
        productConfigs={productConfigs}
        onExportSuccess={(msg) => {
          setToastMessage(msg);
          setTimeout(() => setToastMessage(null), 5000);
        }}
      />

      {/* 恢复默认面板布局 二次确认弹窗 */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-100">
          <div className={`w-[360px] p-5 rounded-md border shadow-2xl font-mono text-xs ${
            isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#141416] border-[#2A2A2C] text-white'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-2 text-amber-500">
              <RotateCcw size={15} />
              <span>恢复默认面板布局</span>
            </div>
            <p className={`mb-4 leading-relaxed ${isLight ? 'text-[#52525B]' : 'text-white/60'}`}>
              确定要恢复默认面板布局吗？<br />
              飞行监测、积冰监测、颠簸监测的产品分类顺序以及各算法子面板的显示与排列将重置为初始状态。
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className={`px-3 py-1.5 rounded text-xs cursor-pointer border ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#3F3F46] hover:bg-[#E2E0DB]' : 'bg-white/5 border-[#2A2A2C] text-white/80 hover:bg-white/10'
                }`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetPanelLayout();
                  setIsResetConfirmOpen(false);
                }}
                className="px-3.5 py-1.5 rounded text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer transition-colors shadow-xs"
              >
                确认恢复
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Directory Explorer / Error Modal */}
      <ExportDirModal
        isOpen={isExportDirModalOpen}
        onClose={() => setIsExportDirModalOpen(false)}
        exportPath={loadExportSettings().exportPath}
        onOpenExportSettings={() => {
          setIsExportModalOpen(true);
        }}
      />

      {/* Software Exit Confirmation Modal */}
      <ExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        isLive={systemMode === 'live'}
        countdownSeconds={5}
        onConfirmExit={() => {
          setIsExitModalOpen(false);
          if (onExitSoftware) {
            onExitSoftware();
          } else {
            setToastMessage('系统已安全退出。');
            setTimeout(() => {
              window.close();
            }, 800);
          }
        }}
      />

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded shadow-2xl font-mono text-xs border border-[#0284C7]/50 bg-[#18181B] text-white flex items-center gap-2.5 animate-in fade-in duration-150">
          <Check size={15} className="text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-white/40 hover:text-white cursor-pointer"
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
}

