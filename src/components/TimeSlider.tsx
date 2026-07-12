import React, { useState, useEffect, useRef } from 'react';
import { FlightDataPoint } from '../types';
import { Play, Pause, ChevronLeft, ChevronRight, SlidersHorizontal, Eye, Navigation } from 'lucide-react';

interface TimeSliderProps {
  flightData: FlightDataPoint[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  startIndex: number;
  endIndex: number;
  onChangeRange: (start: number, end: number) => void;
  systemMode?: 'live' | 'history';
  selectedFlightId?: string;
}

export default function TimeSlider({
  flightData,
  currentIndex,
  onSelectIndex,
  startIndex,
  endIndex,
  onChangeRange,
  systemMode = 'live',
  selectedFlightId = 'MU5101'
}: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onSelectIndex((currentIndex + 1) % flightData.length);
      }, playbackSpeed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentIndex, flightData.length, playbackSpeed]);

  const handlePrev = () => {
    setIsPlaying(false);
    onSelectIndex(Math.max(0, currentIndex - 1));
  };

  const handleNext = () => {
    setIsPlaying(false);
    onSelectIndex(Math.min(flightData.length - 1, currentIndex + 1));
  };

  const setRangePreset = (preset: 'all' | 'climb' | 'cloud' | 'descent') => {
    if (flightData.length === 0) return;
    const maxIdx = flightData.length - 1;
    
    switch (preset) {
      case 'all':
        onChangeRange(0, maxIdx);
        break;
      case 'climb':
        onChangeRange(0, Math.min(15, maxIdx));
        break;
      case 'cloud':
        onChangeRange(Math.min(15, maxIdx), Math.min(42, maxIdx));
        break;
      case 'descent':
        onChangeRange(Math.min(45, maxIdx), maxIdx);
        break;
    }
  };

  const startPt = flightData[startIndex] || flightData[0];
  const endPt = flightData[endIndex] || flightData[flightData.length - 1];
  const currentPt = flightData[currentIndex] || flightData[0];

  return (
    <div className="bg-[#121214] border border-[#2A2A2C] rounded-sm p-4 space-y-4 font-mono select-none" id="time-slider-container">
      {/* Playback, Timeline Track, and Telemetry - UNIFIED INTO A SINGLE ROW */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 w-full">
        {/* Left Side: Playback Control */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 bg-black/40 p-1 border border-[#2A2A2C] rounded-sm">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="p-1 text-white/50 hover:text-white disabled:text-white/20 disabled:hover:bg-transparent hover:bg-white/10 rounded-sm transition-colors cursor-pointer"
              title="上一航步"
            >
              <ChevronLeft size={16} />
            </button>
            
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3 py-1 bg-white text-black text-xs font-bold rounded hover:bg-white/90 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              {isPlaying ? <Pause size={10} className="fill-black" /> : <Play size={10} className="fill-black" />}
              <span>{isPlaying ? '暂停' : '模拟播放'}</span>
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === flightData.length - 1}
              className="p-1 text-white/50 hover:text-white disabled:text-white/20 disabled:hover:bg-transparent hover:bg-white/10 rounded-sm transition-colors cursor-pointer"
              title="下一航步"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[12px] text-white/50 border-l border-[#2A2A2C] pl-3">
            <span>倍速:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-black/40 border border-[#2A2A2C] text-white rounded px-1.5 py-0.5 text-[12px] cursor-pointer focus:outline-none"
            >
              <option value={2000}>0.5x (2s/步)</option>
              <option value={1000}>1.0x (1s/步)</option>
              <option value={400}>2.5x (0.4s/步)</option>
              <option value={150}>5.0x (0.15s/步)</option>
            </select>
          </div>
        </div>

        {/* Middle: Custom Brushed Timeline Selector (Visual Map with Interactive Click & Ticks) */}
        <div className="flex-grow relative h-10 flex items-center min-w-[200px] mx-1 md:mx-4">
          {/* Track representation with interactive slider overlay */}
          <div className="h-2 w-full bg-black/80 rounded-full border border-[#2A2A2C] relative">
            {/* Dynamic Icing Active Cloud Zone Highlight */}
            {(() => {
              const firstIcingIdx = flightData.findIndex(pt => 
                Object.values(pt.algorithms).some(algo => algo.level !== 'None')
              );
              const lastIcingIdx = [...flightData].reverse().findIndex(pt => 
                Object.values(pt.algorithms).some(algo => algo.level !== 'None')
              );
              const actualLastIcingIdx = lastIcingIdx !== -1 ? (flightData.length - 1 - lastIcingIdx) : -1;
              
              if (firstIcingIdx !== -1 && actualLastIcingIdx !== -1 && actualLastIcingIdx >= firstIcingIdx) {
                const leftPercent = (firstIcingIdx / flightData.length) * 100;
                const widthPercent = ((actualLastIcingIdx - firstIcingIdx) / flightData.length) * 100;
                return (
                  <div 
                    className="absolute h-full bg-[#FF9F0A]/10 border-l border-r border-[#FF9F0A]/30 opacity-70"
                    style={{
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`
                    }}
                    title="微物理气流积冰区"
                  >
                    <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-[9px] text-[#FF9F0A]/60 uppercase font-mono tracking-widest whitespace-nowrap">
                      云带积冰活跃区
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Selected Active Subrange Brush Highlight */}
            <div
              className="absolute h-full bg-white opacity-10 border-l border-r border-zinc-300 pointer-events-none"
              style={{
                left: `${(startIndex / flightData.length) * 100}%`,
                right: `${100 - (endIndex / flightData.length) * 100}%`
              }}
            ></div>

            {/* Current scrubber needle */}
            <div
              className="absolute h-4 w-1 bg-[#FF3B30] top-1/2 transform -translate-y-1/2 shadow-[0_0_8px_rgba(255,59,48,0.6)] transition-all duration-100 pointer-events-none"
              style={{
                left: `${(currentIndex / (flightData.length - 1)) * 100}%`
              }}
            >
              <div className="w-2 h-2 bg-[#FF3B30] rounded-full absolute -top-1 left-1/2 transform -translate-x-1/2"></div>
            </div>

            {/* Time Ticks (Axiomatic tick scales underneath the track) */}
            {(() => {
              const tickIndices = [0, 15, 30, 45, 60];
              return tickIndices.map((idx) => {
                const tickPt = flightData[idx];
                if (!tickPt) return null;
                const percentage = (idx / (flightData.length - 1)) * 100;
                return (
                  <div
                    key={idx}
                    className="absolute top-3.5 transform -translate-x-1/2 flex flex-col items-center pointer-events-none"
                    style={{ left: `${percentage}%` }}
                  >
                    <div className="w-[1px] h-1.5 bg-white/30"></div>
                    <span className="text-[10px] text-white/50 font-mono mt-0.5 tracking-tighter">
                      {tickPt.time.substring(0, 5)}
                    </span>
                  </div>
                );
              });
            })()}

            {/* Invisible Range Input Overlay for Direct Scraping & Clicking */}
            <input
              type="range"
              min={0}
              max={flightData.length - 1}
              value={currentIndex}
              onChange={(e) => onSelectIndex(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              style={{ top: '-4px', height: '16px' }}
              title="拖动或点击调整当前飞行时刻"
            />
          </div>
        </div>

        {/* Right Side: Current Active Step Telemetry */}
        <div className="flex flex-wrap items-center gap-3 text-[12px] shrink-0">
          <div className="flex items-center gap-1.5 text-white/50">
            <Navigation size={12} className="text-white/30" />
            <span>当前时间步 (INDEX):</span>
            <span className="text-white font-bold bg-black/40 border border-[#2A2A2C] px-2 py-0.5 rounded text-[12px]">
              #{currentIndex}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-white/50">
            <span>飞行时刻 (UTC):</span>
            <span className="text-white font-bold bg-black/40 border border-[#2A2A2C] px-2 py-0.5 rounded text-[12px]">
              {currentPt?.time || '---'}
            </span>
          </div>
        </div>
      </div>

      {/* Double Range Slider Form Elements & Segment presets aligned */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 border-t border-[#2A2A2C]/40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-[12px] text-white/50">
            <span>起始点 index:</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, endIndex - 1)}
              value={startIndex}
              onChange={(e) => onChangeRange(Number(e.target.value), endIndex)}
              className="w-24 accent-white h-1 bg-[#2A2A2C] rounded-lg cursor-pointer"
            />
            <span className="text-[#E0E0E0] font-bold w-4">{startIndex}</span>
          </div>

          <div className="flex items-center gap-2 text-[12px] text-white/50">
            <span>截止点 index:</span>
            <input
              type="range"
              min={Math.min(flightData.length - 1, startIndex + 1)}
              max={flightData.length - 1}
              value={endIndex}
              onChange={(e) => onChangeRange(startIndex, Number(e.target.value))}
              className="w-24 accent-white h-1 bg-[#2A2A2C] rounded-lg cursor-pointer"
            />
            <span className="text-[#E0E0E0] font-bold w-4">{endIndex}</span>
          </div>
        </div>

        {/* Segment presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-[12px] bg-black/40 px-2.5 py-1 border border-[#2A2A2C] rounded-sm">
          <span className="text-white/40 uppercase font-bold flex items-center gap-1 text-[11px]">
            <Eye size={10} />
            <span>航空航段快捷筛选:</span>
          </span>
          <button
            onClick={() => setRangePreset('all')}
            className={`px-2 py-0.5 border rounded text-[11px] transition-colors cursor-pointer ${
              startIndex === 0 && endIndex === flightData.length - 1
                ? 'bg-[#2A2A2C] text-white border-white/20 font-bold'
                : 'border-[#2A2A2C] text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            全航线段
          </button>
          <button
            onClick={() => setRangePreset('climb')}
            className={`px-2 py-0.5 border rounded text-[11px] transition-colors cursor-pointer ${
              startIndex === 0 && endIndex === 15
                ? 'bg-[#2A2A2C] text-white border-white/20 font-bold'
                : 'border-[#2A2A2C] text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            起飞爬升段
          </button>
          <button
            onClick={() => setRangePreset('cloud')}
            className={`px-2 py-0.5 border rounded text-[11px] transition-colors cursor-pointer ${
              startIndex === 15 && endIndex === 42
                ? 'bg-[#2A2A2C] text-white border-white/20 font-bold'
                : 'border-[#2A2A2C] text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            穿越积冰段
          </button>
          <button
            onClick={() => setRangePreset('descent')}
            className={`px-2 py-0.5 border rounded text-[11px] transition-colors cursor-pointer ${
              startIndex === 45 && endIndex === flightData.length - 1
                ? 'bg-[#2A2A2C] text-white border-white/20 font-bold'
                : 'border-[#2A2A2C] text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            降落着陆段
          </button>
        </div>
      </div>
    </div>
  );
}
