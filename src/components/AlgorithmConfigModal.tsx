import React, { useState, useEffect } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronDown, 
  Sliders, 
  SlidersHorizontal, 
  Power, 
  RotateCcw, 
  Check, 
  AlertTriangle, 
  Layers, 
  ShieldAlert, 
  Activity,
  BarChart3
} from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { SystemAlgorithmItem, AlgorithmTreeCategory, ProductConfig } from '../types';
import { 
  SYSTEM_ALGORITHMS, 
  loadAlgorithmParams, 
  saveAlgorithmParams, 
  loadAlgorithmStatus, 
  saveAlgorithmStatus 
} from '../utils/algorithmConfig';
import AlgorithmParamModal from './AlgorithmParamModal';
import AlgorithmThresholdModal from './AlgorithmThresholdModal';

interface AlgorithmConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  productConfigs: Record<string, ProductConfig>;
  onUpdateProductConfig: (algoLegacyId: string, updatedConfig: ProductConfig) => void;
  algoStatus: Record<string, boolean>;
  onUpdateAlgoStatus: (newStatus: Record<string, boolean>) => void;
  algoParams: Record<string, Record<string, number>>;
  onUpdateAlgoParams: (newParams: Record<string, Record<string, number>>) => void;
}

export default function AlgorithmConfigModal({
  isOpen,
  onClose,
  productConfigs,
  onUpdateProductConfig,
  algoStatus,
  onUpdateAlgoStatus,
  algoParams,
  onUpdateAlgoParams
}: AlgorithmConfigModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  // Tree category selection
  const [selectedCategory, setSelectedCategory] = useState<AlgorithmTreeCategory>('icing_intensity');
  const [expandedNodes, setExpandedNodes] = useState<{ icing: boolean; turbulence: boolean }>({
    icing: true,
    turbulence: true
  });

  // Secondary modals state
  const [paramAlgo, setParamAlgo] = useState<SystemAlgorithmItem | null>(null);
  const [thresholdAlgo, setThresholdAlgo] = useState<SystemAlgorithmItem | null>(null);
  const [statusConfirmAlgo, setStatusConfirmAlgo] = useState<SystemAlgorithmItem | null>(null);

  if (!isOpen) return null;

  const toggleNode = (node: 'icing' | 'turbulence') => {
    setExpandedNodes(prev => ({ ...prev, [node]: !prev[node] }));
  };

  // Filter algorithms based on selected left tree node
  const filteredAlgorithms = SYSTEM_ALGORITHMS.filter(algo => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'icing') {
      return algo.category === 'icing_intensity' || algo.category === 'max_distance';
    }
    return algo.category === selectedCategory;
  });

  // Category counts
  const icingIntensityCount = SYSTEM_ALGORITHMS.filter(a => a.category === 'icing_intensity').length;
  const maxDistanceCount = SYSTEM_ALGORITHMS.filter(a => a.category === 'max_distance').length;
  const totalIcingCount = icingIntensityCount + maxDistanceCount;
  const turbulenceCount = SYSTEM_ALGORITHMS.filter(a => a.category === 'turbulence').length;

  // Handle parameter save
  const handleSaveParams = (algoId: string, newParams: Record<string, number>) => {
    const next = { ...algoParams, [algoId]: newParams };
    onUpdateAlgoParams(next);
    saveAlgorithmParams(next);
  };

  // Handle enable/disable execution
  const handleExecuteStatusToggle = () => {
    if (!statusConfirmAlgo) return;
    const currentEnabled = algoStatus[statusConfirmAlgo.id] !== false && algoStatus[statusConfirmAlgo.legacyId] !== false;
    const nextEnabled = !currentEnabled;

    const nextStatus = {
      ...algoStatus,
      [statusConfirmAlgo.id]: nextEnabled,
      [statusConfirmAlgo.legacyId]: nextEnabled
    };

    onUpdateAlgoStatus(nextStatus);
    saveAlgorithmStatus(nextStatus);
    setStatusConfirmAlgo(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-100">
      <div 
        className={`w-[1140px] max-w-[calc(100vw-32px)] h-[640px] min-h-[640px] max-h-[640px] flex-none rounded-md border shadow-2xl overflow-hidden flex flex-col font-mono text-xs ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#141416] border-[#2A2A2C] text-white'
        }`}
        style={{
          width: '1140px',
          minWidth: '1140px',
          height: '640px',
          minHeight: '640px',
          maxHeight: '640px'
        }}
      >
        {/* Window Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-sm tracking-wide">算法配置中心</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="关闭窗口"
          >
            <X size={15} />
          </button>
        </div>

        {/* Window Main Split View (Left Tree + Right Table) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Directory Tree Sidebar */}
          <div className={`w-[230px] shrink-0 border-r flex flex-col p-3 select-none ${
            isLight ? 'bg-[#F4F3F0] border-[#E4E3DE]' : 'bg-[#17171A] border-[#2A2A2C]'
          }`}>
            <div className={`text-[11px] font-bold pb-2 mb-2 border-b flex items-center justify-between ${
              isLight ? 'text-[#71717A] border-[#E4E3DE]' : 'text-white/50 border-white/10'
            }`}>
              <span>目录</span>
              <span className="text-[10px] opacity-75">{SYSTEM_ALGORITHMS.length} 个算法</span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {/* Node 1: 积冰监测 */}
              <div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => toggleNode('icing')}
                    className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 cursor-pointer`}
                  >
                    {expandedNodes.icing ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('icing')}
                    className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors text-left font-bold ${
                      selectedCategory === 'icing'
                        ? (isLight ? 'bg-[#FAFAF8] text-[#0284C7] shadow-xs border border-[#D5D3CE]' : 'bg-[#2A2A2C] text-[#00E5FF] shadow-xs border border-white/10')
                        : (isLight ? 'text-[#3F3F46] hover:bg-[#E2E0DB]' : 'text-white/80 hover:bg-white/5')
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <BarChart3 size={13} className="text-cyan-500" />
                      <span>积冰监测</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isLight ? 'bg-zinc-200 text-zinc-600' : 'bg-white/10 text-white/50'
                    }`}>
                      {totalIcingCount}
                    </span>
                  </button>
                </div>

                {/* Sub-tree */}
                {expandedNodes.icing && (
                  <div className="pl-5 pt-1 space-y-1 border-l border-zinc-300 dark:border-zinc-800 ml-3 mt-1">
                    {/* Node 1.1: 积冰强度算法 */}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('icing_intensity')}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors text-left ${
                        selectedCategory === 'icing_intensity'
                          ? (isLight ? 'bg-[#FAFAF8] text-[#0284C7] font-bold shadow-xs border border-[#D5D3CE]' : 'bg-[#2A2A2C] text-[#00E5FF] font-bold shadow-xs border border-white/10')
                          : (isLight ? 'text-[#52525B] hover:bg-[#E2E0DB]' : 'text-white/70 hover:bg-white/5')
                      }`}
                    >
                      <span className="truncate">积冰强度算法</span>
                      <span className={`text-[10px] px-1 rounded font-mono ${
                        isLight ? 'bg-zinc-200 text-zinc-600' : 'bg-white/10 text-white/50'
                      }`}>
                        {icingIntensityCount}
                      </span>
                    </button>

                    {/* Node 1.2: 最大航行距离算法 */}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('max_distance')}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors text-left ${
                        selectedCategory === 'max_distance'
                          ? (isLight ? 'bg-[#FAFAF8] text-[#0284C7] font-bold shadow-xs border border-[#D5D3CE]' : 'bg-[#2A2A2C] text-[#00E5FF] font-bold shadow-xs border border-white/10')
                          : (isLight ? 'text-[#52525B] hover:bg-[#E2E0DB]' : 'text-white/70 hover:bg-white/5')
                      }`}
                    >
                      <span className="truncate">最大航行距离算法</span>
                      <span className={`text-[10px] px-1 rounded font-mono ${
                        isLight ? 'bg-zinc-200 text-zinc-600' : 'bg-white/10 text-white/50'
                      }`}>
                        {maxDistanceCount}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Node 2: 颠簸监测 */}
              <div className="pt-1">
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => toggleNode('turbulence')}
                    className={`p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-zinc-400 cursor-pointer`}
                  >
                    {expandedNodes.turbulence ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('turbulence')}
                    className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors text-left font-bold ${
                      selectedCategory === 'turbulence'
                        ? (isLight ? 'bg-[#FAFAF8] text-[#0284C7] shadow-xs border border-[#D5D3CE]' : 'bg-[#2A2A2C] text-[#00E5FF] shadow-xs border border-white/10')
                        : (isLight ? 'text-[#3F3F46] hover:bg-[#E2E0DB]' : 'text-white/80 hover:bg-white/5')
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Activity size={13} className="text-amber-500" />
                      <span>颠簸监测</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      isLight ? 'bg-zinc-200 text-zinc-600' : 'bg-white/10 text-white/50'
                    }`}>
                      {turbulenceCount}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Algorithm List Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Filter Info Bar */}
            <div className={`px-4 py-2.5 border-b flex items-center justify-between shrink-0 text-[11px] ${
              isLight ? 'bg-[#F4F3F0] border-[#E4E3DE]' : 'bg-[#17171A] border-[#2A2A2C]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs">
                  {selectedCategory === 'icing' ? '积冰监测'
                    : selectedCategory === 'icing_intensity' ? '积冰强度算法'
                    : selectedCategory === 'max_distance' ? '最大航行距离算法'
                    : '颠簸监测'}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  isLight ? 'bg-[#ECEBE7] text-[#52525B]' : 'bg-white/10 text-white/60'
                }`}>
                  共 {filteredAlgorithms.length} 个
                </span>
              </div>
            </div>

            {/* Table Content Body */}
            <div 
              className="flex-1 overflow-y-scroll custom-scrollbar p-4"
              style={{ scrollbarGutter: 'stable' }}
            >
              <table className="w-full text-left border-collapse table-fixed">
                <colgroup>
                  <col className="w-14" />
                  <col className="w-20" />
                  <col className="w-32" />
                  <col />
                  <col className="w-48" />
                  <col className="w-64" />
                </colgroup>
                <thead className="sticky top-0 z-10">
                  <tr className={`border-b text-[11px] ${
                    isLight ? 'bg-[#FAFAF8] border-[#E4E3DE] text-[#71717A]' : 'bg-[#141416] border-[#2A2A2C] text-white/50'
                  }`}>
                    <th className={`py-2.5 px-3 text-center ${isLight ? 'bg-[#FAFAF8]' : 'bg-[#141416]'}`}>序号</th>
                    <th className={`py-2.5 px-3 text-center ${isLight ? 'bg-[#FAFAF8]' : 'bg-[#141416]'}`}>状态</th>
                    <th className={`py-2.5 px-3 text-center ${isLight ? 'bg-[#FAFAF8]' : 'bg-[#141416]'}`}>算法 ID</th>
                    <th className={`py-2.5 px-3 text-left ${isLight ? 'bg-[#FAFAF8]' : 'bg-[#141416]'}`}>算法名称</th>
                    <th className={`py-2.5 px-3 text-center ${isLight ? 'bg-[#FAFAF8]' : 'bg-[#141416]'}`}>当前版本</th>
                    <th className={`py-2.5 px-3 text-center ${isLight ? 'bg-[#FAFAF8]' : 'bg-[#141416]'}`}>操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
                  {filteredAlgorithms.map((algo, index) => {
                    const isEnabled = algoStatus[algo.id] !== false && algoStatus[algo.legacyId] !== false;

                    return (
                      <tr 
                        key={algo.id}
                        className={`transition-colors ${
                          isLight 
                            ? (isEnabled ? 'hover:bg-zinc-50' : 'bg-zinc-100/50 opacity-65 hover:bg-zinc-100')
                            : (isEnabled ? 'hover:bg-white/[0.02]' : 'bg-white/[0.01] opacity-50 hover:bg-white/[0.03]')
                        }`}
                      >
                        {/* 序号 */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-zinc-400 whitespace-nowrap">
                          {index + 1}
                        </td>

                        {/* 状态 */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isEnabled ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              启用
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-500/10 text-zinc-500 border border-zinc-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                              停用
                            </span>
                          )}
                        </td>

                        {/* 算法 ID */}
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] border break-all ${
                            isLight ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#3F3F46]' : 'bg-white/5 border-white/10 text-white/80'
                          }`}>
                            {algo.id}
                          </span>
                        </td>

                        {/* 算法名称 - 保持左对齐，允许超出行宽时换行 */}
                        <td className="py-3 px-3 text-left font-bold text-xs whitespace-normal break-words leading-relaxed">
                          <span>{algo.name}</span>
                        </td>

                        {/* 当前版本 - 居中 */}
                        <td className={`py-3 px-3 text-center font-mono text-[11px] whitespace-nowrap ${
                          isLight ? 'text-[#71717A]' : 'text-white/50'
                        }`}>
                          {algo.version}
                        </td>

                        {/* 操作栏 - 居中 */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 算法配置 (参数配置) */}
                            <button
                              type="button"
                              disabled={!algo.supportsParams}
                              onClick={() => setParamAlgo(algo)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                                isLight
                                  ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#0284C7] hover:bg-[#E2E0DB]'
                                  : 'bg-black/30 border-[#2A2A2C] text-[#00E5FF] hover:bg-white/10'
                              }`}
                              title={algo.supportsParams ? '调整算法内部物理模型与累计窗口参数' : '该算法无开放外部调整的物理参数'}
                            >
                              <Sliders size={11} />
                              <span>算法配置</span>
                            </button>

                            {/* 阈值配置 */}
                            <button
                              type="button"
                              disabled={!algo.supportsThresholds}
                              onClick={() => setThresholdAlgo(algo)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30 ${
                                isLight
                                  ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#3F3F46] hover:bg-[#E2E0DB]'
                                  : 'bg-black/30 border-[#2A2A2C] text-white/80 hover:bg-white/10'
                              }`}
                              title={algo.supportsThresholds ? '配置该算法的风险分级阈值、等级名称与显示颜色' : '该算法不支持阈值配置'}
                            >
                              <SlidersHorizontal size={11} />
                              <span>阈值配置</span>
                            </button>

                            {/* 启用/停用 */}
                            <button
                              type="button"
                              onClick={() => setStatusConfirmAlgo(algo)}
                              className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
                                isEnabled
                                  ? (isLight 
                                      ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                                      : 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20')
                                  : (isLight 
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100' 
                                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20')
                              }`}
                              title={isEnabled ? '点击停用算法' : '点击启用算法'}
                            >
                              <Power size={11} />
                              <span>{isEnabled ? '停用' : '启用'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Modal 1: 算法参数配置 */}
      <AlgorithmParamModal
        isOpen={Boolean(paramAlgo)}
        onClose={() => setParamAlgo(null)}
        algorithm={paramAlgo}
        currentParams={paramAlgo ? (algoParams[paramAlgo.id] || algoParams[paramAlgo.legacyId] || paramAlgo.defaultParams || {}) : {}}
        onSave={handleSaveParams}
      />

      {/* Secondary Modal 2: 阈值配置 */}
      <AlgorithmThresholdModal
        isOpen={Boolean(thresholdAlgo)}
        onClose={() => setThresholdAlgo(null)}
        algorithm={thresholdAlgo}
        config={thresholdAlgo ? productConfigs[thresholdAlgo.legacyId] : undefined}
        onSave={(newCfg) => {
          if (thresholdAlgo) {
            onUpdateProductConfig(thresholdAlgo.legacyId, newCfg);
          }
        }}
      />

      {/* Secondary Modal 3: 启停二次确认弹窗 */}
      {statusConfirmAlgo && (
        <div 
          onClick={() => setStatusConfirmAlgo(null)}
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none animate-in fade-in duration-100"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`w-[420px] p-5 rounded-md border shadow-2xl font-mono text-xs ${
              isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#141416] border-[#2A2A2C] text-white'
            }`}
          >
            <div className={`flex items-center gap-2 font-bold text-sm mb-2.5 ${
              algoStatus[statusConfirmAlgo.id] !== false ? 'text-rose-500' : 'text-emerald-500'
            }`}>
              <AlertTriangle size={16} className="shrink-0" />
              <span>
                确定要<span className="underline mx-1">{algoStatus[statusConfirmAlgo.id] !== false ? '停用' : '启用'}</span>算法【{statusConfirmAlgo.name}】吗？
              </span>
            </div>

            <div className={`text-[11px] mb-5 leading-relaxed ${isLight ? 'text-[#71717A]' : 'text-white/60'}`}>
              {algoStatus[statusConfirmAlgo.id] !== false
                ? '停用后，系统将在态势监控主工作区与各子面板中隐藏该算法，并暂停实时监测计算。'
                : '启用后，系统将在态势监控主工作区与各子面板中恢复该算法的数据计算与展示。'}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusConfirmAlgo(null)}
                className={`px-3 py-1.5 rounded text-xs cursor-pointer border ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#3F3F46] hover:bg-[#E2E0DB]' : 'bg-white/5 border-[#2A2A2C] text-white/80 hover:bg-white/10'
                }`}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExecuteStatusToggle}
                className={`px-3.5 py-1.5 rounded text-xs font-bold text-white cursor-pointer transition-colors shadow-xs ${
                  algoStatus[statusConfirmAlgo.id] !== false
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {algoStatus[statusConfirmAlgo.id] !== false ? '确认停用' : '确认启用'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
