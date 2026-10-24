import React, { useState, useEffect, useRef } from 'react';
import { HardDrive, Cpu, Maximize2, Minimize2, X, Terminal, Sun, Moon, Check, Palette, Plane, BarChart3, RotateCcw } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface TitleBarProps {
  onResetAll: () => void;
  rightTab?: 'flight' | 'icing';
  onSelectRightTab?: (tab: 'flight' | 'icing') => void;
}

export default function TitleBar({ onResetAll, rightTab = 'icing', onSelectRightTab }: TitleBarProps) {
  const { theme, setTheme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const [systemTime, setSystemTime] = useState<string>('2026-07-11 08:05:45 UTC');
  const [ramLoad, setRamLoad] = useState<number>(38.4);
  const [cpuLoad, setCpuLoad] = useState<number>(12.8);
  const [viewMenuOpen, setViewMenuOpen] = useState<boolean>(false);

  const viewMenuRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tick the clock realistically starting from 2026-07-11
  useEffect(() => {
    let seconds = 45;
    let minutes = 5;
    let hours = 8;

    const interval = setInterval(() => {
      seconds++;
      if (seconds >= 60) {
        seconds = 0;
        minutes++;
        if (minutes >= 60) {
          minutes = 0;
          hours++;
          if (hours >= 24) {
            hours = 0;
          }
        }
      }
      
      // Simulate slight fluctuations in CPU and RAM load
      setCpuLoad(prev => {
        const delta = (Math.random() - 0.5) * 2;
        return Math.max(5, Math.min(45, prev + delta));
      });
      setRamLoad(prev => {
        const delta = (Math.random() - 0.5) * 0.4;
        return Math.max(35, Math.min(42, prev + delta));
      });

      const hStr = hours.toString().padStart(2, '0');
      const mStr = minutes.toString().padStart(2, '0');
      const sStr = seconds.toString().padStart(2, '0');
      setSystemTime(`2026-07-11 ${hStr}:${mStr}:${sStr} UTC`);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`border border-b-0 rounded-t-md overflow-visible select-none transition-colors duration-200 ${
        isLight ? 'bg-[#EAE4D6] border-[#CDC5B4]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
      }`} 
      id="pc-window-titlebar"
    >
      {/* Primary OS Window Header */}
      <div 
        className={`px-3.5 py-2 flex items-center justify-between border-b text-[12px] font-mono transition-colors duration-200 ${
          isLight ? 'bg-[#EAE4D6] border-[#CDC5B4] text-[#292524]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/80'
        }`}
      >
        {/* Left: Client Icon & Core Label */}
        <div className="flex items-center gap-2 font-bold">
          <Terminal size={14} className={isLight ? 'text-[#57534E]' : 'text-white/60'} />
          <span className={`tracking-tight text-[12px] uppercase ${isLight ? 'text-[#1C1917]' : 'text-white'}`}>
            飞机积冰协同态势监测与预测系统 v4.2
          </span>
        </div>

        {/* Center: Live Avionics Network & Time Info */}
        <div className={`flex items-center gap-6 text-[12px] ${isLight ? 'text-[#78716C]' : 'text-white/40'}`}>
          <div className="flex items-center gap-1.5">
            <Cpu size={11} className={isLight ? 'text-[#A8A29E]' : 'text-white/30'} />
            <span>处理器负载: <strong className={isLight ? 'text-[#1C1917]' : 'text-white/70'}>{cpuLoad.toFixed(1)}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive size={11} className={isLight ? 'text-[#A8A29E]' : 'text-white/30'} />
            <span>内存占用: <strong className={isLight ? 'text-[#1C1917]' : 'text-white/70'}>{ramLoad.toFixed(1)}GB</strong></span>
          </div>
          <div className={`font-bold border-l pl-4 ${isLight ? 'text-[#44403C] border-[#CDC5B4]' : 'text-white/60 border-[#2A2A2C]'}`}>
            {systemTime}
          </div>
        </div>

        {/* Right: Window control buttons (PC Skin) */}
        <div className="flex items-center gap-1">
          <button 
            className={`w-5 h-5 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#DDD6C5]' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="最小化"
          >
            <Minimize2 size={10} />
          </button>
          <button 
            className={`w-5 h-5 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#DDD6C5]' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="最大化"
          >
            <Maximize2 size={10} />
          </button>
          <button 
            onClick={onResetAll}
            className={`w-5 h-5 flex items-center justify-center rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#78716C] hover:bg-red-100/70 hover:text-red-700' : 'text-white/40 hover:text-red-200 hover:bg-red-600/40'
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
          isLight ? 'bg-[#F6F3EB] border-[#DDD7C8] text-[#57534E]' : 'bg-[#121214] border-[#2A2A2C] text-white/50'
        }`}
      >
        <div className="flex gap-2 items-center">
          <span 
            className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
              isLight ? 'hover:text-[#1C1917] hover:bg-[#EAE4D6]' : 'hover:text-white hover:bg-white/5'
            }`} 
            onClick={onResetAll}
          >
            文件(F)
          </span>

          {/* 视图(V) Dropdown Menu */}
          <div className="relative" ref={viewMenuRef}>
            <button
              onClick={() => setViewMenuOpen(prev => !prev)}
              className={`px-2.5 py-1 rounded cursor-pointer transition-colors flex items-center gap-1 ${
                viewMenuOpen 
                  ? (isLight ? 'bg-[#EAE4D6] text-[#1C1917] font-bold' : 'bg-white/15 text-white font-bold') 
                  : (isLight ? 'hover:text-[#1C1917] hover:bg-[#EAE4D6]' : 'hover:text-white hover:bg-white/5')
              }`}
            >
              <span>视图(V)</span>
            </button>

            {viewMenuOpen && (
              <div 
                className={`absolute top-full left-0 mt-1 z-50 min-w-[240px] rounded-md shadow-2xl p-1.5 border font-mono text-xs select-none animate-in fade-in zoom-in-95 duration-100 ${
                  isLight ? 'bg-[#FAF7F0] border-[#CDC5B4] text-[#292524] shadow-[0_12px_32px_rgba(40,30,20,0.18)]' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/90 shadow-black/80'
                }`}
              >
                {/* Section 1: 主题颜色切换选项 */}
                <div className={`px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-[#78716C]' : 'text-white/40'
                }`}>
                  <Palette size={13} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
                  <span>主题颜色 (Theme Color)</span>
                </div>

                {/* Dark Theme Option */}
                <button
                  onClick={() => { setTheme('dark'); setViewMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-colors cursor-pointer ${
                    theme === 'dark'
                      ? (isLight ? 'bg-[#ECE5D8] text-[#1C1917] font-bold' : 'bg-white/10 text-white font-bold')
                      : (isLight ? 'hover:bg-[#EAE4D6] text-[#44403C]' : 'hover:bg-white/5 text-white/70')
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
                  onClick={() => { setTheme('light'); setViewMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded text-left transition-colors cursor-pointer ${
                    theme === 'light'
                      ? (isLight ? 'bg-[#ECE5D8] text-[#1C1917] font-bold' : 'bg-white/10 text-white font-bold')
                      : (isLight ? 'hover:bg-[#EAE4D6] text-[#44403C]' : 'hover:bg-white/5 text-white/70')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Sun size={14} className="text-amber-500" />
                    <span>复古白 (Modern Retro White)</span>
                  </div>
                  {theme === 'light' && <Check size={14} className="text-[#34C759]" />}
                </button>

                {/* Divider */}
                <div className={`my-1.5 border-t ${isLight ? 'border-[#DDD7C8]' : 'border-white/10'}`} />

                {/* Section 2: 面板切换 */}
                <div className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  isLight ? 'text-[#78716C]' : 'text-white/40'
                }`}>
                  <span>工作区视图 (Workspaces)</span>
                </div>

                <button
                  onClick={() => { onSelectRightTab?.('flight'); setViewMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    rightTab === 'flight'
                      ? (isLight ? 'bg-[#ECE5D8] font-bold text-[#1C1917]' : 'bg-white/10 font-bold text-white')
                      : (isLight ? 'hover:bg-[#EAE4D6] text-[#44403C]' : 'hover:bg-white/5 text-white/70')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Plane size={13} className="text-[#0284C7]" />
                    <span>飞行遥测监测面板</span>
                  </div>
                  {rightTab === 'flight' && <Check size={13} className="text-[#0284C7]" />}
                </button>

                <button
                  onClick={() => { onSelectRightTab?.('icing'); setViewMenuOpen(false); }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    rightTab === 'icing'
                      ? (isLight ? 'bg-[#ECE5D8] font-bold text-[#1C1917]' : 'bg-white/10 font-bold text-white')
                      : (isLight ? 'hover:bg-[#EAE4D6] text-[#44403C]' : 'hover:bg-white/5 text-white/70')
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <BarChart3 size={13} className="text-[#D97706]" />
                    <span>积冰算法监测产品网格</span>
                  </div>
                  {rightTab === 'icing' && <Check size={13} className="text-[#D97706]" />}
                </button>

                {/* Divider */}
                <div className={`my-1.5 border-t ${isLight ? 'border-[#DDD7C8]' : 'border-white/10'}`} />

                {/* Reset View */}
                <button
                  onClick={() => { onResetAll(); setViewMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors cursor-pointer ${
                    isLight ? 'hover:bg-[#EAE4D6] text-[#44403C]' : 'hover:bg-white/5 text-white/70'
                  }`}
                >
                  <RotateCcw size={13} />
                  <span>重置所有视图与态势仿真</span>
                </button>
              </div>
            )}
          </div>

          <span className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
            isLight ? 'hover:text-[#1C1917] hover:bg-[#EAE4D6]' : 'hover:text-white hover:bg-white/5'
          }`}>
            气象算法(A)
          </span>
          <span className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
            isLight ? 'hover:text-[#1C1917] hover:bg-[#EAE4D6]' : 'hover:text-white hover:bg-white/5'
          }`}>
            导出中心(E)
          </span>
          <span className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
            isLight ? 'hover:text-[#1C1917] hover:bg-[#EAE4D6]' : 'hover:text-white hover:bg-white/5'
          }`}>
            安全警告(W)
          </span>
          <span 
            className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
              isLight ? 'hover:text-[#1C1917] hover:bg-[#EAE4D6]' : 'hover:text-white hover:bg-white/5'
            }`} 
            title="离线矢量GIS与9套积冰监测算法模型控制台"
          >
            帮助(H)
          </span>
        </div>

        {/* Quick Theme Toggle Pill on the right side of the menu bar */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded border transition-colors cursor-pointer text-[11px] font-medium ${
              isLight 
                ? 'bg-[#EAE4D6] border-[#CDC5B4] text-[#44403C] hover:bg-[#E0D9C8]' 
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

