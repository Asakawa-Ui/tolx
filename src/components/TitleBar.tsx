import React, { useState, useEffect } from 'react';
import { ShieldCheck, HardDrive, Cpu, Wifi, Maximize2, Minimize2, X, Terminal } from 'lucide-react';

interface TitleBarProps {
  onResetAll: () => void;
}

export default function TitleBar({ onResetAll }: TitleBarProps) {
  const [systemTime, setSystemTime] = useState<string>('2026-07-11 08:05:45 UTC');
  const [ramLoad, setRamLoad] = useState<number>(38.4);
  const [cpuLoad, setCpuLoad] = useState<number>(12.8);

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
    <div className="bg-[#1A1A1C] border border-[#2A2A2C] border-b-0 rounded-t-md overflow-hidden select-none" id="pc-window-titlebar">
      {/* Primary OS Window Header */}
      <div className="bg-[#1A1A1C] px-3.5 py-2 flex items-center justify-between border-b border-[#2A2A2C] text-[12px] font-mono">
        {/* Left: Client Icon & Core Label */}
        <div className="flex items-center gap-2 text-white/80 font-bold">
          <Terminal size={14} className="text-white/60" />
          <span className="tracking-tight text-[12px] uppercase">
            飞机积冰协同态势监测与预测系统 v4.2
          </span>
        </div>

        {/* Center: Live Avionics Network & Time Info */}
        <div className="flex items-center gap-6 text-[12px] text-white/40">
          <div className="flex items-center gap-1.5">
            <Cpu size={11} className="text-white/30" />
            <span>处理器负载: <strong className="text-white/70">{cpuLoad.toFixed(1)}%</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <HardDrive size={11} className="text-white/30" />
            <span>内存占用: <strong className="text-white/70">{ramLoad.toFixed(1)}GB</strong></span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-[#2A2A2C] pl-4">
            <Wifi size={11} className="text-emerald-400" />
            <span className="text-emerald-400 font-bold">卫星通信已连接</span>
          </div>
          <div className="text-white/60 font-bold border-l border-[#2A2A2C] pl-4">
            {systemTime}
          </div>
        </div>

        {/* Right: Window control buttons (PC Skin) */}
        <div className="flex items-center gap-1">
          <button 
            className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-sm transition-colors cursor-pointer"
            title="最小化"
          >
            <Minimize2 size={10} />
          </button>
          <button 
            className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 rounded-sm transition-colors cursor-pointer"
            title="最大化"
          >
            <Maximize2 size={10} />
          </button>
          <button 
            onClick={onResetAll}
            className="w-5 h-5 flex items-center justify-center text-white/40 hover:text-white hover:bg-red-600/40 hover:text-red-200 rounded-sm transition-colors cursor-pointer"
            title="重启演示与重置"
          >
            <X size={11} />
          </button>
        </div>
      </div>

      {/* Dropdown File / View Menu Bar (PC Desktop layout) */}
      <div className="bg-[#121214] px-3 py-1.5 flex items-center justify-between border-b border-[#2A2A2C] text-[12px] font-mono text-white/50">
        <div className="flex gap-2">
          <span className="hover:text-white hover:bg-white/5 px-2.5 py-1 rounded cursor-pointer transition-colors" onClick={onResetAll}>文件(F)</span>
          <span className="hover:text-white hover:bg-white/5 px-2.5 py-1 rounded cursor-pointer transition-colors">视图(V)</span>
          <span className="hover:text-white hover:bg-white/5 px-2.5 py-1 rounded cursor-pointer transition-colors">气象算法(A)</span>
          <span className="hover:text-white hover:bg-white/5 px-2.5 py-1 rounded cursor-pointer transition-colors">导出中心(E)</span>
          <span className="hover:text-white hover:bg-white/5 px-2.5 py-1 rounded cursor-pointer transition-colors">安全警告(W)</span>
          <span className="hover:text-white hover:bg-white/5 px-2.5 py-1 rounded cursor-pointer transition-colors" onClick={() => alert("本系统为PC客户端演示DEMO，采用纯离线矢量GIS技术及9套先进积冰监测算法模型，可在严苛弱网环境下提供秒级态势感知及最大航程预测。")}>帮助(H)</span>
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 text-[12px]">
          <ShieldCheck size={11} />
          <span className="font-bold">核心安全运行时就绪</span>
        </div>
      </div>
    </div>
  );
}
