import React, { useState, useEffect } from 'react';
import { IcingAlgorithmDef, ProductConfig, IcingLevelConfig } from '../types';
import { Trash2, Plus, RotateCcw, Check, X } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface IcingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  algorithm: IcingAlgorithmDef;
  config: ProductConfig;
  maxDistanceLimit: number;
  onSave: (newConfig: ProductConfig, newMaxDistanceLimit: number) => void;
  onReset: () => void;
}

export const buildDefaultLevels = (algo: IcingAlgorithmDef, cfg?: ProductConfig): IcingLevelConfig[] => {
  const colors = cfg?.colors || {
    none: '#6B7280',
    light: '#0A84FF',
    lightModerate: '#22D3EE',
    moderate: '#FF9F0A',
    severe: '#FF3B30'
  };
  const thresholds = cfg?.thresholds || algo.defaultThresholds;
  const labels = algo.levelLabels;

  const list: IcingLevelConfig[] = [
    {
      id: 'none',
      name: labels?.none || '无积冰',
      minThreshold: thresholds.light, // base level boundary
      color: colors.none || '#6B7280',
      isBase: true
    },
    {
      id: 'light',
      name: labels?.light || '轻度积冰',
      minThreshold: thresholds.light,
      color: colors.light || '#0A84FF'
    }
  ];

  if (thresholds.lightModerate !== undefined || algo.defaultThresholds.lightModerate !== undefined) {
    list.push({
      id: 'lightModerate',
      name: labels?.lightModerate || '轻-中度积冰',
      minThreshold: thresholds.lightModerate ?? algo.defaultThresholds.lightModerate ?? 3,
      color: colors.lightModerate || '#22D3EE'
    });
  }

  list.push({
    id: 'moderate',
    name: labels?.moderate || '中度积冰',
    minThreshold: thresholds.moderate,
    color: colors.moderate || '#FF9F0A'
  });

  list.push({
    id: 'severe',
    name: labels?.severe || '重度积冰',
    minThreshold: thresholds.severe,
    color: colors.severe || '#FF3B30'
  });

  return list;
};

const EXTRA_PALETTE = ['#A855F7', '#EC4899', '#F43F5E', '#14B8A6', '#6366F1', '#EAB308'];

export default function IcingConfigModal({
  isOpen,
  onClose,
  algorithm,
  config,
  maxDistanceLimit: initialMaxDistanceLimit,
  onSave,
  onReset
}: IcingConfigModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [levels, setLevels] = useState<IcingLevelConfig[]>(() => {
    if (config.levels && config.levels.length > 0) {
      return JSON.parse(JSON.stringify(config.levels));
    }
    return buildDefaultLevels(algorithm, config);
  });

  const [maxDistanceLimit, setMaxDistanceLimit] = useState<number>(initialMaxDistanceLimit || 100);

  // Sync state whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (config.levels && config.levels.length > 0) {
        setLevels(JSON.parse(JSON.stringify(config.levels)));
      } else {
        setLevels(buildDefaultLevels(algorithm, config));
      }
      setMaxDistanceLimit(initialMaxDistanceLimit || 100);
    }
  }, [isOpen, config, algorithm, initialMaxDistanceLimit]);

  if (!isOpen) return null;

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
    setLevels(prev => {
      const next = [...prev];
      next[index] = { ...next[index], minThreshold: newVal };
      return next;
    });
  };

  const handleRemoveLevel = (index: number) => {
    if (index === 0) return; // Base level cannot be deleted
    setLevels(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddLevel = () => {
    const lastLevel = levels[levels.length - 1];
    const step = algorithm.maxVal <= 10 ? 1 : 20;
    const nextVal = lastLevel ? lastLevel.minThreshold + step : 100;
    const colorIndex = (levels.length - 4 + EXTRA_PALETTE.length) % EXTRA_PALETTE.length;
    const newColor = EXTRA_PALETTE[colorIndex] || '#A855F7';

    const newLevel: IcingLevelConfig = {
      id: `custom_${Date.now()}`,
      name: `极重度积冰`,
      minThreshold: nextVal,
      color: newColor,
      isBase: false
    };

    setLevels(prev => [...prev, newLevel]);
  };

  const handleResetToDefault = () => {
    const defaults = buildDefaultLevels(algorithm);
    setLevels(defaults);
    setMaxDistanceLimit(100);
    onReset();
  };

  const handleSaveAndApply = () => {
    // Reconstruct backwards-compatible thresholds & colors
    const lightLvl = levels.find(l => l.id === 'light') || levels[1];
    const lightModLvl = levels.find(l => l.id === 'lightModerate');
    const modLvl = levels.find(l => l.id === 'moderate') || levels[levels.length > 2 ? 2 : 1];
    const severeLvl = levels.find(l => l.id === 'severe') || levels[levels.length - 1];
    const baseLvl = levels[0];

    const updatedConfig: ProductConfig = {
      algorithmId: algorithm.id,
      thresholds: {
        light: lightLvl ? lightLvl.minThreshold : algorithm.defaultThresholds.light,
        ...(lightModLvl ? { lightModerate: lightModLvl.minThreshold } : {}),
        moderate: modLvl ? modLvl.minThreshold : algorithm.defaultThresholds.moderate,
        severe: severeLvl ? severeLvl.minThreshold : algorithm.defaultThresholds.severe
      },
      colors: {
        none: baseLvl ? baseLvl.color : '#6B7280',
        light: lightLvl ? lightLvl.color : '#0A84FF',
        ...(lightModLvl ? { lightModerate: lightModLvl.color } : {}),
        moderate: modLvl ? modLvl.color : '#FF9F0A',
        severe: severeLvl ? severeLvl.color : '#FF3B30'
      },
      levels: levels,
      maxDistanceLimit: maxDistanceLimit
    };

    onSave(updatedConfig, maxDistanceLimit);
    onClose();
  };

  const firstThresholdValue = levels[1]?.minThreshold ?? (algorithm.defaultThresholds.light ?? 0);

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-[580px] rounded-lg shadow-2xl border flex flex-col overflow-hidden transition-colors duration-200 ${
          isLight ? 'bg-[#FAF7F0] border-[#CDC5B4] text-[#1C1917]' : 'bg-[#141416] border-[#2A2A2C] text-[#E0E0E0]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* 顶部标题栏：简化统一为「阈值与颜色配置」，右侧设有 ✕ 关闭按钮 */}
        <div
          className={`px-5 py-3.5 flex items-center justify-between border-b ${
            isLight ? 'border-[#CDC5B4] bg-[#EAE4D6]' : 'border-[#262629] bg-[#17171A]'
          }`}
        >
          <h2 className={`text-sm font-bold tracking-tight ${isLight ? 'text-[#1C1917]' : 'text-white'}`}>
            阈值与颜色配置
          </h2>
          <button
            onClick={onClose}
            className={`w-7 h-7 flex items-center justify-center rounded-sm transition-colors cursor-pointer text-sm font-semibold ${
              isLight
                ? 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#DDD5C5]'
                : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="关闭 (✕)"
          >
            <X size={15} />
          </button>
        </div>

        {/* 内层分级列表面板 */}
        <div className="p-5 space-y-4">
          <div
            className={`border rounded-md overflow-hidden ${
              isLight ? 'border-[#CDC5B4] bg-[#FAF7F0]' : 'border-[#262629] bg-[#0E0E10]'
            }`}
          >
            {/* 表头：颜色、分级名称、分级阈值、操作 */}
            <div
              className={`grid grid-cols-12 px-3.5 py-2 text-xs font-semibold border-b ${
                isLight ? 'bg-[#EAE4D6] border-[#CDC5B4] text-[#78716C]' : 'bg-[#18181B] border-[#262629] text-white/50'
              }`}
            >
              <div className="col-span-2 text-center">颜色</div>
              <div className="col-span-4 pl-1">分级名称</div>
              <div className="col-span-4 text-center">分级阈值</div>
              <div className="col-span-2 text-center">操作</div>
            </div>

            {/* 分级行列表 */}
            <div className={`divide-y max-h-[310px] overflow-y-auto custom-scrollbar ${
              isLight ? 'divide-[#DDD7C8]' : 'divide-[#262629]/60'
            }`}>
              {levels.map((level, idx) => {
                const isBase = idx === 0;

                return (
                  <div
                    key={level.id || `lvl-${idx}`}
                    className={`grid grid-cols-12 items-center px-3.5 py-2.5 transition-colors ${
                      isLight
                        ? 'hover:bg-[#F2EFE8] border-b border-[#DDD7C8] last:border-b-0'
                        : 'hover:bg-white/[0.02] border-b border-[#222225] last:border-b-0'
                    }`}
                  >
                    {/* 颜色色块：采用圆角矩形色块展示（灰、蓝、橙、红等），点击色块可直接调出调色板即时选色 */}
                    <div className="col-span-2 flex items-center justify-center">
                      <div
                        className="w-8 h-6 rounded-md shadow-xs border border-white/20 transition-all hover:scale-105 active:scale-95 cursor-pointer relative overflow-hidden group"
                        style={{ backgroundColor: level.color }}
                        title="点击选择颜色"
                      >
                        {/* Native color picker overlaid with opacity-0 for instant click response */}
                        <input
                          type="color"
                          value={level.color}
                          onChange={(e) => handleLevelColorChange(idx, e.target.value)}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* 分级名称：输入框内字体颜色与对应等级颜色联动（如「轻度积冰」为蓝色粗体、「中度积冰」为橙色粗体、「重度积冰」为红色粗体） */}
                    <div className="col-span-4 pr-2">
                      <input
                        type="text"
                        value={level.name}
                        onChange={(e) => handleLevelNameChange(idx, e.target.value)}
                        style={{ color: level.color }}
                        className={`w-full px-2.5 py-1 text-xs font-bold rounded-sm border focus:outline-none transition-colors ${
                          isLight
                            ? 'bg-[#FAF7F0] border-[#CDC5B4] focus:border-[#78716C] text-[#1C1917]'
                            : 'bg-[#18181B] border-[#2A2A2C] focus:border-white/30'
                        }`}
                        placeholder="分级名称"
                      />
                    </div>

                    {/* 分级阈值：首行显示 < 0，后续分级显示 ≥ 0、≥ 40、≥ 70 等居中加粗数值输入框 */}
                    <div className="col-span-4 flex items-center justify-center gap-1.5">
                      {isBase ? (
                        <div
                          className={`font-mono font-bold text-xs px-3 py-1 rounded-sm ${
                            isLight ? 'bg-[#EAE4D6] text-[#78716C]' : 'bg-white/5 text-white/50'
                          }`}
                        >
                          &lt; {firstThresholdValue}
                        </div>
                      ) : (
                        <>
                          <span className={`text-xs font-bold ${isLight ? 'text-[#78716C]' : 'text-white/40'}`}>
                            &ge;
                          </span>
                          <input
                            type="number"
                            step={algorithm.maxVal <= 10 ? "0.1" : "1"}
                            value={level.minThreshold}
                            onChange={(e) => handleLevelThresholdChange(idx, parseFloat(e.target.value) || 0)}
                            className={`w-20 font-mono font-bold text-center px-1.5 py-1 text-xs rounded-sm border focus:outline-none transition-colors ${
                              isLight
                                ? 'bg-[#FAF7F0] border-[#CDC5B4] text-[#1C1917] focus:border-[#78716C]'
                                : 'bg-[#18181B] border-[#2A2A2C] text-white focus:border-white/30'
                            }`}
                          />
                        </>
                      )}
                    </div>

                    {/* 操作列：首行保留空白，后续分级右侧提供垃圾桶图标，支持删除对应分级 */}
                    <div className="col-span-2 flex items-center justify-center">
                      {!isBase ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveLevel(idx)}
                          className={`p-1.5 rounded-sm transition-colors cursor-pointer ${
                            isLight
                              ? 'text-[#78716C] hover:text-red-600 hover:bg-red-50'
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

            {/* 虚线分割与增级统计：底部虚线分隔，左侧提供 + 添加分级 按钮，右侧显示实时的 当前共 X 个分级 计数 */}
            <div
              className={`px-3.5 py-2.5 flex items-center justify-between border-t border-dashed ${
                isLight ? 'border-[#CDC5B4] bg-[#EAE4D6]' : 'border-[#2A2A2C] bg-[#121214]'
              }`}
            >
              <button
                type="button"
                onClick={handleAddLevel}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-sm text-xs font-medium border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-[#CDC5B4] bg-[#FAF7F0] text-[#1C1917] hover:bg-[#EAE4D6] shadow-2xs'
                    : 'border-[#333338] bg-[#1C1C20] text-white/80 hover:bg-[#25252A] hover:text-white'
                }`}
              >
                <Plus size={13} className="text-emerald-500" />
                <span>+ 添加分级</span>
              </button>

              <div className={`text-xs font-mono ${isLight ? 'text-[#78716C]' : 'text-white/40'}`}>
                当前共 <strong className={isLight ? 'text-[#1C1917]' : 'text-white/80'}>{levels.length}</strong> 个分级
              </div>
            </div>
          </div>

          {/* 底部操作栏 */}
          <div
            className={`pt-3 flex items-center justify-between gap-4 border-t ${
              isLight ? 'border-[#CDC5B4]' : 'border-[#262629]'
            }`}
          >
            {/* 左侧：最大航程上限: [ 100 ] km 输入项 */}
            <div className={`flex items-center gap-1.5 text-xs font-sans ${isLight ? 'text-[#44403C]' : 'text-white/70'}`}>
              <span>最大航程上限:</span>
              <div
                className={`flex items-center border rounded-sm px-1.5 py-0.5 ${
                  isLight ? 'bg-[#FAF7F0] border-[#CDC5B4]' : 'bg-[#0E0E10] border-[#2A2A2C]'
                }`}
              >
                <span className="text-[11px] opacity-40 mr-1">[</span>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={maxDistanceLimit}
                  onChange={(e) => setMaxDistanceLimit(Math.max(1, parseInt(e.target.value) || 100))}
                  className={`w-12 text-center font-bold font-mono text-xs focus:outline-none bg-transparent ${
                    isLight ? 'text-[#1C1917]' : 'text-white'
                  }`}
                />
                <span className="text-[11px] opacity-40 ml-1">]</span>
              </div>
              <span className="font-mono">km</span>
            </div>

            {/* 右侧：⟳ 重置 与高对比白底黑字 ✓ 保存并应用 按钮 */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-[#EAE4D6] border-[#CDC5B4] text-[#44403C] hover:bg-[#DDD5C5] hover:text-[#1C1917]'
                    : 'bg-[#202024] border-[#333338] text-white/80 hover:bg-[#28282D] hover:text-white'
                }`}
              >
                <RotateCcw size={12} />
                <span>重置</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAndApply}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-sm transition-colors shadow-md cursor-pointer ${
                  isLight
                    ? 'bg-[#1C1917] text-[#FAF7F0] hover:bg-[#292524]'
                    : 'bg-white text-black hover:bg-neutral-200'
                }`}
              >
                <Check size={13} className="stroke-[3]" />
                <span>保存并应用</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
