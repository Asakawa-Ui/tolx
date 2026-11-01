import React, { useState, useEffect } from 'react';
import { Trash2, Plus, RotateCcw, Check, X } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { IcingAlgorithmDef, ProductConfig, IcingLevelConfig, SystemAlgorithmItem } from '../types';
import { buildDefaultLevels } from '../utils/algorithmConfig';

export interface AlgorithmThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  algorithm: IcingAlgorithmDef | SystemAlgorithmItem | null;
  config?: ProductConfig;
  productConfig?: ProductConfig;
  onSave: (newConfig: ProductConfig) => void;
  onReset?: () => void;
  hideColor?: boolean;
  title?: string;
  confirmText?: string;
}

const EXTRA_PALETTE = ['#A855F7', '#EC4899', '#F43F5E', '#14B8A6', '#6366F1', '#EAB308', '#22C55E', '#0284C7'];

export default function AlgorithmThresholdModal({
  isOpen,
  onClose,
  algorithm,
  config,
  productConfig,
  onSave,
  onReset,
  hideColor = false,
  title,
  confirmText
}: AlgorithmThresholdModalProps) {
  const currentConfig = config || productConfig;
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [levels, setLevels] = useState<IcingLevelConfig[]>([]);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen && algorithm) {
      if (currentConfig?.levels && currentConfig.levels.length > 0) {
        setLevels(JSON.parse(JSON.stringify(currentConfig.levels)));
      } else {
        setLevels(buildDefaultLevels(algorithm, currentConfig));
      }
    }
  }, [isOpen, currentConfig, algorithm]);

  if (!isOpen || !algorithm) return null;

  const legacyId = (algorithm as any).legacyId || algorithm.id;
  const isFrostPoint = Boolean((algorithm as any).isFrostPoint || algorithm.id === 'TEMP_FROST' || legacyId === 'temp_frost');
  const isTurb = algorithm.category === 'turbulence' || (algorithm as any).type === 'turbulence';
  const isMaxDistance = algorithm.category === 'max_distance' || algorithm.id === 'MAX_DIST_ICE';
  const maxVal = (algorithm as any).maxVal ?? 100;

  const handleLevelColorChange = (index: number, newColor: string) => {
    setLevels(prev => {
      const next = [...prev];
      next[index] = { ...next[index], color: newColor };
      return next;
    });
  };

  const handleLevelNameChange = (index: number, newName: string) => {
    setLevels(prev => {
      const next = [...prev];
      next[index] = { ...next[index], name: newName };
      return next;
    });
  };

  const handleLevelThresholdChange = (index: number, newVal: number) => {
    if (isFrostPoint) return;
    setLevels(prev => {
      const next = [...prev];
      next[index] = { ...next[index], minThreshold: newVal };
      return next;
    });
  };

  const handleRemoveLevel = (index: number) => {
    if (index === 0 || isFrostPoint) return; // Base level or frost point cannot be deleted
    setLevels(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLevel = () => {
    if (isFrostPoint) return;

    // Turbulence incremental presets
    if (isTurb && levels.length === 1) {
      const step = legacyId === 'HTG' ? 3 : legacyId === 'MOS' ? 8 : 10;
      setLevels(prev => [
        { ...prev[0], name: '无' },
        {
          id: 'light',
          name: '轻度颠簸',
          minThreshold: step,
          color: '#0A84FF',
          isBase: false
        }
      ]);
      return;
    }

    if (isTurb && levels.length === 2) {
      const step = legacyId === 'HTG' ? 3 : legacyId === 'MOS' ? 8 : 10;
      setLevels(prev => [
        ...prev,
        {
          id: 'moderate',
          name: '中度颠簸',
          minThreshold: step * 2,
          color: '#FF9F0A',
          isBase: false
        }
      ]);
      return;
    }

    if (isTurb && levels.length === 3) {
      const step = legacyId === 'HTG' ? 3 : legacyId === 'MOS' ? 8 : 10;
      setLevels(prev => [
        ...prev,
        {
          id: 'severe',
          name: '重度颠簸',
          minThreshold: step * 3,
          color: '#FF3B30',
          isBase: false
        }
      ]);
      return;
    }

    // General new level
    const lastLevel = levels[levels.length - 1];
    const step = maxVal <= 10 ? 1 : 20;
    const nextVal = lastLevel ? Number(lastLevel.minThreshold) + step : 100;
    const colorIndex = (levels.length - 4 + EXTRA_PALETTE.length) % EXTRA_PALETTE.length;
    const newColor = EXTRA_PALETTE[colorIndex] || '#A855F7';

    const defaultLevelName = isMaxDistance
      ? `告警分级 ${levels.length + 1}`
      : isTurb
        ? '极重度颠簸'
        : '极重度积冰';

    const newLevel: IcingLevelConfig = {
      id: `custom_${Date.now()}`,
      name: defaultLevelName,
      minThreshold: nextVal,
      color: newColor,
      isBase: false
    };

    setLevels(prev => [...prev, newLevel]);
  };

  const handleResetToDefault = () => {
    const defaults = buildDefaultLevels(algorithm);
    setLevels(defaults);
    if (onReset) {
      onReset();
    }
  };

  const handleSaveAndApply = () => {
    const baseLvl = levels[0];
    const lightLvl = levels.find(l => l.id === 'light') || levels[1];
    const lightModLvl = levels.find(l => l.id === 'lightModerate');
    const modLvl = levels.find(l => l.id === 'moderate') || levels[levels.length > 2 ? 2 : 1];
    const severeLvl = levels.find(l => l.id === 'severe') || levels[levels.length - 1];

    const updatedConfig: ProductConfig = {
      algorithmId: legacyId,
      thresholds: {
        light: lightLvl ? Number(lightLvl.minThreshold) : 0,
        ...(lightModLvl ? { lightModerate: Number(lightModLvl.minThreshold) } : {}),
        moderate: modLvl ? Number(modLvl.minThreshold) : 40,
        severe: severeLvl ? Number(severeLvl.minThreshold) : 70
      },
      colors: {
        none: baseLvl ? baseLvl.color : '#6B7280',
        light: lightLvl ? lightLvl.color : '#0A84FF',
        ...(lightModLvl ? { lightModerate: lightModLvl.color } : {}),
        moderate: modLvl ? modLvl.color : '#FF9F0A',
        severe: severeLvl ? severeLvl.color : '#FF3B30'
      },
      levels: levels,
      maxDistanceLimit: config?.maxDistanceLimit || 100
    };

    onSave(updatedConfig);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[580px] rounded-lg shadow-2xl border flex flex-col overflow-hidden transition-colors duration-200 ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#141416] border-[#2A2A2C] text-[#E0E0E0]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部标题栏 */}
        <div
          className={`px-5 py-3.5 flex items-center justify-between border-b ${
            isLight ? 'border-[#D5D3CE] bg-[#ECEBE7]' : 'border-[#262629] bg-[#17171A]'
          }`}
        >
          <h2 className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
            {title || (hideColor ? '阈值配置' : '阈值与颜色配置')}
          </h2>
          <button
            onClick={onClose}
            className={`w-7 h-7 flex items-center justify-center rounded-sm transition-colors cursor-pointer text-sm font-semibold ${
              isLight
                ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="关闭 (✕)"
          >
            <X size={15} />
          </button>
        </div>

        {/* 内容主体 */}
        <div className="p-5 flex flex-col gap-3">
          {/* 表头：颜色、分级名称、分级阈值、操作 */}
          <div
            className={`grid grid-cols-12 px-2 py-1.5 text-xs font-semibold border-b ${
              isLight ? 'border-[#D5D3CE] text-[#71717A]' : 'border-[#262629] text-white/50'
            }`}
          >
            {!hideColor && <div className="col-span-2 text-center">颜色</div>}
            <div className={`${hideColor ? 'col-span-5' : 'col-span-4'} pl-1`}>分级名称</div>
            <div className={`${hideColor ? 'col-span-5' : 'col-span-4'} text-center`}>分级阈值</div>
            <div className="col-span-2 text-center">操作</div>
          </div>

          {/* 分级行列表 */}
          <div
            className={`divide-y max-h-[320px] overflow-y-auto custom-scrollbar ${
              isLight ? 'divide-[#E4E3DE]' : 'divide-[#262629]/60'
            }`}
          >
            {levels.map((level, idx) => {
              const isBase = idx === 0;

              return (
                <div
                  key={level.id || `lvl-${idx}`}
                  className={`grid grid-cols-12 items-center px-2 py-2.5 transition-colors ${
                    isLight
                      ? 'hover:bg-[#ECEBE7]/50 border-b border-[#E4E3DE] last:border-b-0'
                      : 'hover:bg-white/[0.03] border-b border-[#222225] last:border-b-0'
                  }`}
                >
                  {/* 颜色色块：点击调出色板选色 */}
                  {!hideColor && (
                    <div className="col-span-2 flex items-center justify-center">
                      <div
                        className="w-8 h-6 rounded-md shadow-xs border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden group"
                        style={{ backgroundColor: level.color }}
                        title="点击选择颜色"
                      >
                        <input
                          type="color"
                          value={level.color}
                          onChange={(e) => handleLevelColorChange(idx, e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {/* 分级名称 */}
                  <div className={`${hideColor ? 'col-span-5' : 'col-span-4'} pr-2`}>
                    <input
                      type="text"
                      value={level.name}
                      onChange={(e) => handleLevelNameChange(idx, e.target.value)}
                      style={{ color: level.color }}
                      className={`w-full px-2.5 py-1 text-xs font-bold rounded-sm border focus:outline-none transition-colors ${
                        isLight
                          ? 'bg-[#FAFAF8] border-[#D5D3CE] focus:border-[#71717A] text-[#18181B]'
                          : 'bg-[#18181B] border-[#2A2A2C] focus:border-white/30'
                      }`}
                      placeholder="分级名称"
                    />
                  </div>

                  {/* 分级阈值 */}
                  <div className={`${hideColor ? 'col-span-5' : 'col-span-4'} flex items-center justify-center gap-1.5`}>
                    {isBase ? (
                      <div
                        className={`font-mono font-bold text-xs px-3 py-1 rounded-sm text-center ${
                          isLight ? 'bg-[#ECEBE7] text-[#71717A]' : 'bg-white/5 text-white/50'
                        }`}
                      >
                        {levels.length > 1 ? `< ${levels[1].minThreshold}` : '≥ 0'}
                      </div>
                    ) : (
                      <>
                        <span className={`text-xs font-bold ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>
                          &ge;
                        </span>
                        <input
                          type="number"
                          step={maxVal <= 10 ? '0.1' : '1'}
                          disabled={isFrostPoint}
                          value={level.minThreshold}
                          onChange={(e) => handleLevelThresholdChange(idx, parseFloat(e.target.value) || 0)}
                          className={`w-20 font-mono font-bold text-center px-1.5 py-1 text-xs rounded-sm border focus:outline-none transition-colors ${
                            isFrostPoint ? 'opacity-60 cursor-not-allowed' : ''
                          } ${
                            isLight
                              ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B] focus:border-[#71717A]'
                              : 'bg-[#18181B] border-[#2A2A2C] text-white focus:border-white/30'
                          }`}
                        />
                      </>
                    )}
                  </div>

                  {/* 操作列 */}
                  <div className="col-span-2 flex items-center justify-center">
                    {!isBase && !isFrostPoint ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveLevel(idx)}
                        className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                          isLight
                            ? 'text-[#71717A] hover:text-red-600 hover:bg-red-50'
                            : 'text-white/35 hover:text-red-400 hover:bg-red-500/10'
                        }`}
                        title="删除该分级"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <div className="w-5 h-5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 增级按钮与统计行 */}
          <div className="pt-2 flex items-center justify-between">
            {!isFrostPoint ? (
              <button
                type="button"
                onClick={handleAddLevel}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-[#D5D3CE] bg-[#ECEBE7] text-[#18181B] hover:bg-[#E2E0DB] shadow-2xs'
                    : 'border-[#333338] bg-[#1C1C20] text-white/80 hover:bg-[#25252A] hover:text-white'
                }`}
              >
                <Plus size={13} className="text-emerald-500" />
                <span>+ 添加分级</span>
              </button>
            ) : (
              <span className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-white/40'}`}>
                假霜点算法分级固定，仅支持调整颜色和名称
              </span>
            )}

            <div className={`text-xs font-mono ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>
              当前共 <strong className={isLight ? 'text-[#18181B]' : 'text-white/80'}>{levels.length}</strong> 个分级
            </div>
          </div>
        </div>

        {/* 底部操作栏 - 最大航程上限已移除 */}
        <div
          className={`px-5 py-3.5 flex items-center justify-between gap-4 border-t ${
            isLight ? 'border-[#D5D3CE] bg-[#ECEBE7]/60' : 'border-[#262629] bg-[#17171A]'
          }`}
        >
          <div />

          {/* 右侧：⟳ 重置 与高对比 ✓ 保存并应用 按钮 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetToDefault}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-sm border transition-colors cursor-pointer ${
                isLight
                  ? 'border-[#D5D3CE] bg-[#FAFAF8] text-[#52525B] hover:bg-[#ECEBE7] hover:text-[#18181B]'
                  : 'border-[#333338] bg-[#18181B] text-white/60 hover:bg-[#222226] hover:text-white'
              }`}
            >
              <RotateCcw size={12} />
              <span>重置</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndApply}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-sm shadow-xs transition-colors cursor-pointer ${
                isLight
                  ? 'bg-[#18181B] text-[#FAFAF8] hover:bg-[#27272A]'
                  : 'bg-white text-black hover:bg-white/90'
              }`}
            >
              <Check size={13} strokeWidth={2.5} />
              <span>{confirmText || '保存并应用'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
