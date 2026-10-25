import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, X, Terminal, Sun, Moon, Check, Palette, Plane, BarChart3, Activity, RotateCcw, FileText, Database, Wrench, HelpCircle, Layers } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface TitleBarProps {
  onResetAll: () => void;
  rightTab?: 'flight' | 'icing' | 'turbulence';
  onSelectRightTab?: (tab: 'flight' | 'icing' | 'turbulence') => void;
}

export default function TitleBar({ onResetAll, rightTab = 'icing', onSelectRightTab }: TitleBarProps) {
  const { theme, setTheme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const [activeMenu, setActiveMenu] = useState<'file' | 'view' | 'data' | 'tools' | 'help' | null>(null);
  const menuBarRef = useRef<HTMLDivElement | null>(null);

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
            className={`w-5 h-5 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="最大化"
          >
            <Maximize2 size={10} />
          </button>
          <button 
            onClick={onResetAll}
            className={`w-5 h-5 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:bg-red-100/70 hover:text-red-700' : 'text-white/40 hover:text-red-200 hover:bg-red-600/40'
            }`}
            title="重启演示与重置"
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
                className={`absolute top-full left-0 mt-1 z-50 min-w-[200px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                <button
                  onClick={() => { onResetAll(); setActiveMenu(null); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <RotateCcw size={13} />
                  <span>重置态势工作区</span>
                </button>
                <div className={`my-1 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-white/10'}`} />
                <button
                  onClick={() => setActiveMenu(null)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <FileText size={13} />
                  <span>新建航迹分析任务</span>
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
                className={`absolute top-full left-0 mt-1 z-50 min-w-[240px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                {/* Section 1: 主题颜色切换选项 */}
                <div className={`px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-[#71717A]' : 'text-white/40'
                }`}>
                  <Palette size={13} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
                  <span>主题颜色 (Theme Color)</span>
                </div>

                {/* Dark Theme Option */}
                <button
                  onClick={() => { setTheme('dark'); setActiveMenu(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? (isLight ? 'bg-[#E2E0DB] text-[#18181B] font-bold' : 'bg-white/10 text-white font-bold')
                      : (isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Moon size={14} className="text-blue-400" />
                    <span>深色主题 (当前/默认)</span>
                  </div>
                  {theme === 'dark' && <Check size={14} className="text-[#34C759]" />}
                </button>

                {/* Light Theme Option */}
                <button
                  onClick={() => { setTheme('light'); setActiveMenu(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-colors cursor-pointer ${
                    theme === 'light'
                      ? (isLight ? 'bg-[#E2E0DB] text-[#18181B] font-bold' : 'bg-white/10 text-white font-bold')
                      : (isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun size={14} className="text-amber-500" />
                    <span>复古白 (Modern Retro White)</span>
                  </div>
                  {theme === 'light' && <Check size={14} className="text-[#34C759]" />}
                </button>

                {/* Divider */}
                <div className={`my-1.5 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-white/10'}`} />

                {/* Section 2: 面板切换 */}
                <div className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-[#71717A]' : 'text-white/40'
                }`}>
                  <span>工作区视图 (Workspaces)</span>
                </div>

                <button
                  onClick={() => { onSelectRightTab?.('flight'); setActiveMenu(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    rightTab === 'flight'
                      ? (isLight ? 'bg-[#E2E0DB] font-bold text-[#18181B]' : 'bg-white/10 font-bold text-white')
                      : (isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plane size={13} className="text-[#0284C7]" />
                    <span>飞行遥测监测面板</span>
                  </div>
                  {rightTab === 'flight' && <Check size={13} className="text-[#0284C7]" />}
                </button>

                <button
                  onClick={() => { onSelectRightTab?.('icing'); setActiveMenu(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    rightTab === 'icing'
                      ? (isLight ? 'bg-[#E2E0DB] font-bold text-[#18181B]' : 'bg-white/10 font-bold text-white')
                      : (isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 size={13} className="text-[#0284C7]" />
                    <span>积冰算法监测产品网格</span>
                  </div>
                  {rightTab === 'icing' && <Check size={13} className="text-[#0284C7]" />}
                </button>

                <button
                  onClick={() => { onSelectRightTab?.('turbulence'); setActiveMenu(null); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    rightTab === 'turbulence'
                      ? (isLight ? 'bg-[#E2E0DB] font-bold text-[#18181B]' : 'bg-white/10 font-bold text-white')
                      : (isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Activity size={13} className="text-[#0284C7]" />
                    <span>颠簸算法监测产品网格</span>
                  </div>
                  {rightTab === 'turbulence' && <Check size={13} className="text-[#0284C7]" />}
                </button>

                {/* Divider */}
                <div className={`my-1.5 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-white/10'}`} />

                {/* Reset View */}
                <button
                  onClick={() => { onResetAll(); setActiveMenu(null); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <RotateCcw size={13} />
                  <span>重置所有视图与态势仿真</span>
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
                className={`absolute top-full left-0 mt-1 z-50 min-w-[210px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                <div className="px-2.5 py-1 text-[11px] font-bold text-sky-500">
                  <span>数据管理中心</span>
                </div>
                <button
                  onClick={() => setActiveMenu(null)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <Database size={13} />
                  <span>历史归档架次数据</span>
                </button>
                <button
                  onClick={() => setActiveMenu(null)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <Activity size={13} />
                  <span>气象格点场监测流</span>
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
                className={`absolute top-full left-0 mt-1 z-50 min-w-[210px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#27272A] shadow-[0_12px_32px_rgba(24,24,27,0.14)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                <div className="px-2.5 py-1 text-[11px] font-bold text-sky-500">
                  <span>飞行气象辅助工具</span>
                </div>
                <button
                  onClick={() => setActiveMenu(null)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <Wrench size={13} />
                  <span>最大航程测算标定</span>
                </button>
                <button
                  onClick={() => setActiveMenu(null)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <Layers size={13} />
                  <span>行政底图图层控制</span>
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
                    isLight ? 'hover:bg-[#ECEBE7] text-[#3F3F46]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <HelpCircle size={13} />
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

        {/* Quick Theme Toggle Pill on the right side of the menu bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border transition-colors cursor-pointer text-[11px] font-medium ${
              isLight 
                ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#3F3F46] hover:bg-[#E2E0DB]' 
                : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
            title="点击快速切换主题颜色"
          >
            {theme === 'light' ? (
              <>
                <Sun size={12} className="text-amber-600" />
                <span>复古白</span>
              </>
            ) : (
              <>
                <Moon size={12} className="text-blue-400" />
                <span>深色主题</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

