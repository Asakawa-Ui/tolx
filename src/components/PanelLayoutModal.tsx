import React, { useState, useEffect, useRef } from 'react';
import { X, Plane, BarChart3, Activity, CheckSquare, Square, MinusSquare, RotateCcw, Sliders, Check, GripVertical } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { PanelLayoutConfig, TabCategory } from '../types';
import { ALGORITHMS, TURBULENCE_ALGORITHMS } from '../data/mockData';
import { DEFAULT_PANEL_LAYOUT } from '../utils/layoutConfig';

interface PanelLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLayout: PanelLayoutConfig;
  onSave: (layout: PanelLayoutConfig) => void;
}

const CATEGORY_META: Record<TabCategory, { name: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  flight: { name: '飞行监测', icon: Plane },
  icing: { name: '积冰监测', icon: BarChart3 },
  turbulence: { name: '颠簸监测', icon: Activity }
};

function reorderWithInsertion<T>(list: T[], fromIndex: number, toPosition: number): T[] {
  if (fromIndex === toPosition || toPosition === fromIndex + 1) {
    return list;
  }
  const result = [...list];
  const [removed] = result.splice(fromIndex, 1);
  const targetIndex = toPosition > fromIndex ? toPosition - 1 : toPosition;
  result.splice(targetIndex, 0, removed);
  return result;
}

interface DragState {
  tab: 'category' | 'icing' | 'turbulence';
  startIndex: number;
  currentPos: { x: number; y: number };
}

export default function PanelLayoutModal({
  isOpen,
  onClose,
  currentLayout,
  onSave
}: PanelLayoutModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [activeTab, setActiveTab] = useState<'category' | 'icing' | 'turbulence'>('category');
  const [draft, setDraft] = useState<PanelLayoutConfig>(currentLayout);

  // Modern Drag-and-drop state (music player style: floating card + insertion line)
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [targetDropIndex, setTargetDropIndex] = useState<number | null>(null);
  const dragPointerStartRef = useRef<{ tab: 'category' | 'icing' | 'turbulence'; index: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(JSON.parse(JSON.stringify(currentLayout)));
      setActiveTab('category');
      setDragState(null);
      setTargetDropIndex(null);
    }
  }, [isOpen, currentLayout]);

  // Reset drag states when tab changes
  useEffect(() => {
    setDragState(null);
    setTargetDropIndex(null);
    dragPointerStartRef.current = null;
  }, [activeTab]);

  // Global pointermove and pointerup listener for responsive drag reordering
  useEffect(() => {
    if (!isOpen) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!dragPointerStartRef.current) return;

      if (!dragState) {
        const dist = Math.hypot(e.clientX - dragPointerStartRef.current.x, e.clientY - dragPointerStartRef.current.y);
        if (dist > 4) {
          setDragState({
            tab: dragPointerStartRef.current.tab,
            startIndex: dragPointerStartRef.current.index,
            currentPos: { x: e.clientX, y: e.clientY }
          });
          setTargetDropIndex(dragPointerStartRef.current.index);
        }
        return;
      }

      // Drag is actively moving
      setDragState(prev => prev ? { ...prev, currentPos: { x: e.clientX, y: e.clientY } } : null);

      // Find list row under pointer
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const rowEl = elements.find(el => el.hasAttribute('data-layout-row-index')) as HTMLElement | undefined;
      if (rowEl) {
        const rIndex = parseInt(rowEl.getAttribute('data-layout-row-index') || '0', 10);
        const rect = rowEl.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const dropIndex = e.clientY < midY ? rIndex : rIndex + 1;
        setTargetDropIndex(dropIndex);
      }
    };

    const handleGlobalPointerUp = () => {
      if (dragState && targetDropIndex !== null && targetDropIndex !== dragState.startIndex && targetDropIndex !== dragState.startIndex + 1) {
        if (dragState.tab === 'category') {
          setDraft(prev => ({
            ...prev,
            categoryOrder: reorderWithInsertion(prev.categoryOrder, dragState.startIndex, targetDropIndex)
          }));
        } else if (dragState.tab === 'icing') {
          setDraft(prev => ({
            ...prev,
            icingOrder: reorderWithInsertion(prev.icingOrder, dragState.startIndex, targetDropIndex)
          }));
        } else if (dragState.tab === 'turbulence') {
          setDraft(prev => ({
            ...prev,
            turbulenceOrder: reorderWithInsertion(prev.turbulenceOrder, dragState.startIndex, targetDropIndex)
          }));
        }
      }

      dragPointerStartRef.current = null;
      setDragState(null);
      setTargetDropIndex(null);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [isOpen, dragState, targetDropIndex]);

  if (!isOpen) return null;

  const handleRowPointerDown = (index: number, e: React.PointerEvent) => {
    // Ignore clicks on interactive buttons (checkboxes, etc.)
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive="true"]')) {
      return;
    }
    dragPointerStartRef.current = {
      tab: activeTab,
      index,
      x: e.clientX,
      y: e.clientY
    };
  };

  const toggleIcingVisibility = (id: string) => {
    setDraft(prev => ({
      ...prev,
      icingVisibility: {
        ...prev.icingVisibility,
        [id]: !prev.icingVisibility[id]
      }
    }));
  };

  const setAllIcingVisibility = (visible: boolean) => {
    const nextVis: Record<string, boolean> = {};
    draft.icingOrder.forEach(id => {
      nextVis[id] = visible;
    });
    setDraft(prev => ({ ...prev, icingVisibility: nextVis }));
  };

  const toggleTurbulenceVisibility = (id: string) => {
    setDraft(prev => ({
      ...prev,
      turbulenceVisibility: {
        ...prev.turbulenceVisibility,
        [id]: !prev.turbulenceVisibility[id]
      }
    }));
  };

  const setAllTurbulenceVisibility = (visible: boolean) => {
    const nextVis: Record<string, boolean> = {};
    draft.turbulenceOrder.forEach(id => {
      nextVis[id] = visible;
    });
    setDraft(prev => ({ ...prev, turbulenceVisibility: nextVis }));
  };

  const handleResetToDefault = () => {
    setDraft(JSON.parse(JSON.stringify(DEFAULT_PANEL_LAYOUT)));
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const icingVisibleCount = draft.icingOrder.filter(id => draft.icingVisibility[id] !== false).length;
  const turbulenceVisibleCount = draft.turbulenceOrder.filter(id => draft.turbulenceVisibility[id] !== false).length;

  const isAllIcingVisible = icingVisibleCount === draft.icingOrder.length;
  const isSomeIcingVisible = icingVisibleCount > 0 && !isAllIcingVisible;

  const isAllTurbulenceVisible = turbulenceVisibleCount === draft.turbulenceOrder.length;
  const isSomeTurbulenceVisible = turbulenceVisibleCount > 0 && !isAllTurbulenceVisible;

  // Floating Ghost Card Info (music player style drag preview)
  let floatingIcon = <BarChart3 size={16} />;
  let floatingTitle = '';
  let floatingSubtitle = '';

  if (dragState) {
    if (dragState.tab === 'category') {
      const catKey = draft.categoryOrder[dragState.startIndex];
      const meta = CATEGORY_META[catKey];
      if (meta) {
        const Icon = meta.icon;
        floatingIcon = <Icon size={16} />;
        floatingTitle = meta.name;
        floatingSubtitle = '产品面板';
      }
    } else if (dragState.tab === 'icing') {
      const algoId = draft.icingOrder[dragState.startIndex];
      const algo = ALGORITHMS.find(a => a.id === algoId);
      if (algo) {
        floatingIcon = <BarChart3 size={16} />;
        floatingTitle = algo.name;
        floatingSubtitle = algo.paramSymbol ? `参数代号: ${algo.paramSymbol}` : '积冰监测算法';
      }
    } else if (dragState.tab === 'turbulence') {
      const algoId = draft.turbulenceOrder[dragState.startIndex];
      const algo = TURBULENCE_ALGORITHMS.find(a => a.id === algoId);
      if (algo) {
        floatingIcon = <Activity size={16} />;
        floatingTitle = algo.name;
        floatingSubtitle = algo.paramSymbol ? `参数代号: ${algo.paramSymbol}` : '颠簸监测算法';
      }
    }
  }

  const isDraggingCurrentTab = dragState?.tab === activeTab;

  const renderInsertionLine = (positionIndex: number) => {
    if (!isDraggingCurrentTab || targetDropIndex !== positionIndex) return null;
    return (
      <div className="py-1 -my-1 flex items-center gap-2.5 select-none pointer-events-none animate-in fade-in duration-75">
        <div className="w-7 shrink-0 flex items-center justify-center">
          <div className={`w-2 h-2 rounded-full shadow-xs ${
            isLight ? 'bg-[#0284C7]' : 'bg-[#00E5FF]'
          }`} />
        </div>
        <div className={`flex-1 h-[2.5px] rounded-full shadow-sm ${
          isLight ? 'bg-[#0284C7] shadow-sky-300' : 'bg-[#00E5FF] shadow-cyan-400'
        }`} />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-150">
      <div 
        className={`w-[640px] max-w-[calc(100vw-32px)] h-[540px] min-h-[540px] max-h-[540px] flex-none rounded-md border shadow-2xl overflow-hidden flex flex-col font-mono text-xs ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#141416] border-[#2A2A2C] text-white'
        }`}
        style={{
          width: '640px',
          minWidth: '640px',
          maxWidth: 'calc(100vw - 32px)',
          height: '540px',
          minHeight: '540px',
          maxHeight: '540px'
        }}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <div className="flex items-center gap-2">
            <Sliders size={15} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
            <h2 className="font-bold text-sm tracking-wide">面板布局设置</h2>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="关闭"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Sub Tabs */}
        <div className={`grid grid-cols-3 p-1.5 border-b text-[12px] gap-1.5 shrink-0 ${
          isLight ? 'bg-[#F4F3F0] border-[#E4E3DE]' : 'bg-[#17171A] border-[#2A2A2C]'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('category')}
            className={`h-8 px-2 rounded-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border box-border ${
              activeTab === 'category'
                ? (isLight ? 'bg-[#FAFAF8] text-[#0284C7] shadow-xs border-[#D5D3CE]' : 'bg-[#2A2A2C] text-[#00E5FF] shadow-sm border-white/10')
                : (isLight ? 'text-[#71717A] hover:text-[#18181B] border-transparent hover:bg-black/[0.03]' : 'text-white/40 hover:text-white border-transparent hover:bg-white/[0.03]')
            }`}
          >
            <span>产品面板 (3)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('icing')}
            className={`h-8 px-2 rounded-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border box-border ${
              activeTab === 'icing'
                ? (isLight ? 'bg-[#FAFAF8] text-[#0284C7] shadow-xs border-[#D5D3CE]' : 'bg-[#2A2A2C] text-[#00E5FF] shadow-sm border-white/10')
                : (isLight ? 'text-[#71717A] hover:text-[#18181B] border-transparent hover:bg-black/[0.03]' : 'text-white/40 hover:text-white border-transparent hover:bg-white/[0.03]')
            }`}
          >
            <span>积冰子面板 ({icingVisibleCount}/9)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('turbulence')}
            className={`h-8 px-2 rounded-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 border box-border ${
              activeTab === 'turbulence'
                ? (isLight ? 'bg-[#FAFAF8] text-[#0284C7] shadow-xs border-[#D5D3CE]' : 'bg-[#2A2A2C] text-[#00E5FF] shadow-sm border-white/10')
                : (isLight ? 'text-[#71717A] hover:text-[#18181B] border-transparent hover:bg-black/[0.03]' : 'text-white/40 hover:text-white border-transparent hover:bg-white/[0.03]')
            }`}
          >
            <span>颠簸子面板 ({turbulenceVisibleCount}/4)</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div 
          className="p-4 flex-1 overflow-y-scroll custom-scrollbar"
          style={{ scrollbarGutter: 'stable' }}
        >
          {/* Tab 1: Product Categories Order */}
          {activeTab === 'category' && (
            <div className="space-y-2">
              <div className={`text-[11px] pb-1 ${isLight ? 'text-[#71717A]' : 'text-white/50'}`}>
                提示：拖动长条可调整排序
              </div>

              {renderInsertionLine(0)}

              {draft.categoryOrder.map((catKey, index) => {
                const meta = CATEGORY_META[catKey];
                const Icon = meta.icon;
                const isBeingDragged = isDraggingCurrentTab && dragState?.startIndex === index;

                return (
                  <React.Fragment key={catKey}>
                    <div
                      data-layout-row-index={index}
                      onPointerDown={(e) => handleRowPointerDown(index, e)}
                      className={`flex items-center gap-2.5 transition-all select-none ${
                        isBeingDragged ? 'opacity-35 scale-[0.99]' : ''
                      }`}
                    >
                      {/* 序号放在长条外，保持固定不变 */}
                      <div className={`w-7 text-center font-bold font-mono text-xs select-none shrink-0 ${
                        isLight ? 'text-[#71717A]' : 'text-white/40'
                      }`}>
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      {/* 可拖动长条 */}
                      <div
                        className={`flex-1 flex items-center justify-between p-2.5 rounded border select-none transition-colors cursor-grab active:cursor-grabbing ${
                          isBeingDragged
                            ? (isLight ? 'bg-sky-50/80 border-[#0284C7] border-dashed ring-1 ring-[#0284C7]' : 'bg-sky-950/30 border-[#00E5FF] border-dashed ring-1 ring-[#00E5FF]')
                            : (isLight ? 'bg-[#FAFAF8] border-[#E4E3DE] hover:border-[#0284C7]/50 hover:shadow-xs' : 'bg-[#1A1A1C] border-[#2A2A2C] hover:border-[#00E5FF]/40')
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <GripVertical size={14} className={`shrink-0 ${isBeingDragged ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : (isLight ? 'text-zinc-400' : 'text-zinc-600')}`} />
                          <div className={`p-1.5 rounded ${
                            isLight ? 'bg-[#ECEBE7] text-[#52525B]' : 'bg-white/10 text-white/70'
                          }`}>
                            <Icon size={14} />
                          </div>
                          <div className="font-bold text-[12px]">{meta.name}</div>
                        </div>
                      </div>
                    </div>

                    {renderInsertionLine(index + 1)}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Tab 2: Icing Algorithm Sub-panels */}
          {activeTab === 'icing' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] pb-1">
                <span className={isLight ? 'text-[#71717A]' : 'text-white/50'}>
                  提示：拖动长条可调整排序
                </span>
                <button
                  type="button"
                  onClick={() => setAllIcingVisibility(!isAllIcingVisible)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors select-none ${
                    isAllIcingVisible || isSomeIcingVisible
                      ? (isLight ? 'text-[#0284C7] hover:bg-sky-50' : 'text-[#00E5FF] hover:bg-white/5')
                      : (isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5')
                  }`}
                  title={isAllIcingVisible ? '点击全部取消显示' : '点击全部显示'}
                >
                  <span className="shrink-0">
                    {isAllIcingVisible ? (
                      <CheckSquare size={14} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
                    ) : isSomeIcingVisible ? (
                      <MinusSquare size={14} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
                    ) : (
                      <Square size={14} className={isLight ? 'text-zinc-400' : 'text-white/30'} />
                    )}
                  </span>
                  <span className="text-[11px] font-bold">全部显示</span>
                </button>
              </div>

              {renderInsertionLine(0)}

              {draft.icingOrder.map((algoId, index) => {
                const algo = ALGORITHMS.find(a => a.id === algoId);
                if (!algo) return null;
                const isVisible = draft.icingVisibility[algoId] !== false;
                const isBeingDragged = isDraggingCurrentTab && dragState?.startIndex === index;

                return (
                  <React.Fragment key={algoId}>
                    <div
                      data-layout-row-index={index}
                      onPointerDown={(e) => handleRowPointerDown(index, e)}
                      className={`flex items-center gap-2.5 transition-all select-none ${
                        isBeingDragged ? 'opacity-35 scale-[0.99]' : ''
                      }`}
                    >
                      {/* 序号放在长条外，保持固定不变 */}
                      <div className={`w-7 text-center font-bold font-mono text-xs select-none shrink-0 ${
                        isLight ? 'text-[#71717A]' : 'text-white/40'
                      }`}>
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      {/* 可拖动长条 */}
                      <div
                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded border select-none transition-colors cursor-grab active:cursor-grabbing ${
                          isBeingDragged
                            ? (isLight ? 'bg-sky-50/80 border-[#0284C7] border-dashed ring-1 ring-[#0284C7]' : 'bg-sky-950/30 border-[#00E5FF] border-dashed ring-1 ring-[#00E5FF]')
                            : isVisible
                              ? (isLight ? 'bg-[#FAFAF8] border-[#E4E3DE] hover:border-[#0284C7]/50' : 'bg-[#1A1A1C] border-[#2A2A2C] hover:border-[#00E5FF]/40')
                              : (isLight ? 'bg-[#F2F1EE]/60 border-[#E4E3DE]/60 opacity-60' : 'bg-black/30 border-[#2A2A2C]/40 opacity-40')
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            data-interactive="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleIcingVisibility(algoId);
                            }}
                            className={`cursor-pointer flex items-center transition-colors ${
                              isVisible ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : (isLight ? 'text-[#A1A1AA]' : 'text-white/30')
                            }`}
                            title={isVisible ? '点击隐藏' : '点击显示'}
                          >
                            {isVisible ? <CheckSquare size={15} /> : <Square size={15} />}
                          </button>

                          <GripVertical size={14} className={`shrink-0 ${isBeingDragged ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : (isLight ? 'text-zinc-400' : 'text-zinc-600')}`} />

                          <div className="font-bold flex items-center gap-1.5 text-xs">
                            <span>{algo.name}</span>
                            {algo.paramSymbol && (
                              <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                                isLight ? 'bg-[#ECEBE7] text-[#52525B]' : 'bg-white/10 text-white/60'
                              }`}>
                                {algo.paramSymbol}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {renderInsertionLine(index + 1)}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Tab 3: Turbulence Algorithm Sub-panels */}
          {activeTab === 'turbulence' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] pb-1">
                <span className={isLight ? 'text-[#71717A]' : 'text-white/50'}>
                  提示：拖动长条可调整排序
                </span>
                <button
                  type="button"
                  onClick={() => setAllTurbulenceVisibility(!isAllTurbulenceVisible)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded cursor-pointer transition-colors select-none ${
                    isAllTurbulenceVisible || isSomeTurbulenceVisible
                      ? (isLight ? 'text-[#0284C7] hover:bg-sky-50' : 'text-[#00E5FF] hover:bg-white/5')
                      : (isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-black/5' : 'text-white/40 hover:text-white hover:bg-white/5')
                  }`}
                  title={isAllTurbulenceVisible ? '点击全部取消显示' : '点击全部显示'}
                >
                  <span className="shrink-0">
                    {isAllTurbulenceVisible ? (
                      <CheckSquare size={14} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
                    ) : isSomeTurbulenceVisible ? (
                      <MinusSquare size={14} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
                    ) : (
                      <Square size={14} className={isLight ? 'text-zinc-400' : 'text-white/30'} />
                    )}
                  </span>
                  <span className="text-[11px] font-bold">全部显示</span>
                </button>
              </div>

              {renderInsertionLine(0)}

              {draft.turbulenceOrder.map((algoId, index) => {
                const algo = TURBULENCE_ALGORITHMS.find(a => a.id === algoId);
                if (!algo) return null;
                const isVisible = draft.turbulenceVisibility[algoId] !== false;
                const isBeingDragged = isDraggingCurrentTab && dragState?.startIndex === index;

                return (
                  <React.Fragment key={algoId}>
                    <div
                      data-layout-row-index={index}
                      onPointerDown={(e) => handleRowPointerDown(index, e)}
                      className={`flex items-center gap-2.5 transition-all select-none ${
                        isBeingDragged ? 'opacity-35 scale-[0.99]' : ''
                      }`}
                    >
                      {/* 序号放在长条外，保持固定不变 */}
                      <div className={`w-7 text-center font-bold font-mono text-xs select-none shrink-0 ${
                        isLight ? 'text-[#71717A]' : 'text-white/40'
                      }`}>
                        {String(index + 1).padStart(2, '0')}
                      </div>

                      {/* 可拖动长条 */}
                      <div
                        className={`flex-1 flex items-center justify-between px-3 py-2 rounded border select-none transition-colors cursor-grab active:cursor-grabbing ${
                          isBeingDragged
                            ? (isLight ? 'bg-sky-50/80 border-[#0284C7] border-dashed ring-1 ring-[#0284C7]' : 'bg-sky-950/30 border-[#00E5FF] border-dashed ring-1 ring-[#00E5FF]')
                            : isVisible
                              ? (isLight ? 'bg-[#FAFAF8] border-[#E4E3DE] hover:border-[#0284C7]/50' : 'bg-[#1A1A1C] border-[#2A2A2C] hover:border-[#00E5FF]/40')
                              : (isLight ? 'bg-[#F2F1EE]/60 border-[#E4E3DE]/60 opacity-60' : 'bg-black/30 border-[#2A2A2C]/40 opacity-40')
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            data-interactive="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTurbulenceVisibility(algoId);
                            }}
                            className={`cursor-pointer flex items-center transition-colors ${
                              isVisible ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : (isLight ? 'text-[#A1A1AA]' : 'text-white/30')
                            }`}
                            title={isVisible ? '点击隐藏' : '点击显示'}
                          >
                            {isVisible ? <CheckSquare size={15} /> : <Square size={15} />}
                          </button>

                          <GripVertical size={14} className={`shrink-0 ${isBeingDragged ? (isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]') : (isLight ? 'text-zinc-400' : 'text-zinc-600')}`} />

                          <div className="font-bold flex items-center gap-1.5 text-xs">
                            <span>{algo.name}</span>
                            {algo.paramSymbol && (
                              <span className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                                isLight ? 'bg-[#ECEBE7] text-[#52525B]' : 'bg-white/10 text-white/60'
                              }`}>
                                {algo.paramSymbol}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {renderInsertionLine(index + 1)}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-between px-4 py-3 border-t shrink-0 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <button
            type="button"
            onClick={handleResetToDefault}
            className={`px-2.5 py-1.5 rounded text-[11px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#52525B] hover:text-[#18181B] hover:bg-[#E2E0DB]'
                : 'bg-black/30 border-[#2A2A2C] text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <RotateCcw size={12} />
            <span>重置</span>
          </button>

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
              onClick={handleSave}
              className={`px-3.5 py-1.5 rounded text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                  : 'bg-[#0A84FF] hover:bg-[#0070E0] text-white'
              }`}
            >
              <Check size={12} />
              <span>应用</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Ghost Card (跟随光标的拖拽预览卡片，音乐列表风格) */}
      {dragState && (
        <div
          style={{
            left: `${dragState.currentPos.x + 14}px`,
            top: `${dragState.currentPos.y + 14}px`
          }}
          className={`fixed pointer-events-none z-[9999] px-3.5 py-2.5 rounded-lg border shadow-2xl flex items-center gap-3 select-none animate-in fade-in duration-75 ${
            isLight
              ? 'bg-white/98 border-[#0284C7] text-[#18181B] shadow-[0_16px_36px_rgba(2,132,199,0.25)] ring-1 ring-[#0284C7]/20'
              : 'bg-[#1C1C1E]/98 border-[#00E5FF] text-white shadow-[0_16px_36px_rgba(0,229,255,0.25)] ring-1 ring-[#00E5FF]/20'
          }`}
        >
          <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${
            isLight ? 'bg-sky-50 text-[#0284C7] border border-sky-200' : 'bg-cyan-950/60 text-[#00E5FF] border border-cyan-800/60'
          }`}>
            {floatingIcon}
          </div>
          <div className="flex flex-col min-w-0 pr-1">
            <span className="font-bold text-xs truncate max-w-[200px]">
              {floatingTitle}
            </span>
            <span className={`text-[10px] font-mono truncate max-w-[200px] ${
              isLight ? 'text-zinc-500' : 'text-white/60'
            }`}>
              {floatingSubtitle}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
