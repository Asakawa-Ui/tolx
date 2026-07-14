import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FlightDataPoint } from '../types';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

interface TimeSliderProps {
  flightData: FlightDataPoint[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  startIndex: number;
  endIndex: number;
  onChangeRange: (start: number, end: number) => void;
  systemMode?: 'live' | 'history';
  selectedFlightId?: string;
  intervalVal: string;
  onChangeInterval: (val: string) => void;
  liveMaxIndex?: number;
}

export default function TimeSlider({
  flightData,
  currentIndex,
  onSelectIndex,
  startIndex,
  endIndex,
  onChangeRange,
  systemMode = 'live',
  selectedFlightId = 'MU5101',
  intervalVal,
  onChangeInterval,
  liveMaxIndex
}: TimeSliderProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step
  const [activeDrag, setActiveDrag] = useState<'start' | 'end' | 'current' | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Pause when entering history mode, but do not automatically play when entering live mode
  useEffect(() => {
    if (systemMode !== 'live') {
      setIsPlaying(false);
    }
  }, [systemMode]);

  const maxTimelineIndex = systemMode === 'live' && liveMaxIndex !== undefined
    ? liveMaxIndex
    : flightData.length - 1;

  // Dynamically compute the resolution step (in seconds) of the flight data points
  const stepSeconds = useMemo(() => {
    if (flightData.length < 2) return 60; // default 1 minute (60 seconds)
    const t0 = flightData[0].timestamp;
    const t1 = flightData[1].timestamp;
    const diff = Math.round((t1 - t0) / 1000);
    return diff > 0 ? diff : 60;
  }, [flightData]);

  // Compute step size (in index units) based on intervalVal selection and current data resolution
  const getStepValue = () => {
    let intervalSeconds = 60; // default '1min'
    if (intervalVal === '1s') intervalSeconds = 1;
    else if (intervalVal === '10s') intervalSeconds = 10;
    else if (intervalVal === '30s') intervalSeconds = 30;
    else if (intervalVal === '2min') intervalSeconds = 120;
    else if (intervalVal === '5min') intervalSeconds = 300;
    else if (intervalVal === '10min') intervalSeconds = 600;
    
    return intervalSeconds / stepSeconds;
  };

  const stepValue = getStepValue();

  const snapToStep = (val: number) => {
    const rounded = Math.round(val / stepValue) * stepValue;
    return Math.max(0, Math.min(maxTimelineIndex, rounded));
  };

  // Playback logic
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        let nextIndex = currentIndex + stepValue;
        const maxLimit = systemMode === 'live' ? flightData.length - 1 : maxTimelineIndex;
        if (nextIndex >= maxLimit) {
          nextIndex = 0;
        }
        onSelectIndex(nextIndex);
      }, playbackSpeed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentIndex, flightData.length, playbackSpeed, onSelectIndex, stepValue, systemMode, maxTimelineIndex]);

  // Pointer dragging logic
  useEffect(() => {
    if (activeDrag === null) return;

    let rafId: number | null = null;

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current || flightData.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const targetIndex = snapToStep(percentage * maxTimelineIndex);

      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }

      rafId = requestAnimationFrame(() => {
        if (activeDrag === 'current') {
          onSelectIndex(targetIndex);
        } else if (activeDrag === 'start') {
          const newStart = Math.max(0, Math.min(endIndex - 1, targetIndex));
          onChangeRange(newStart, endIndex);
        } else if (activeDrag === 'end') {
          const newEnd = Math.min(maxTimelineIndex, Math.max(startIndex + 1, targetIndex));
          onChangeRange(startIndex, newEnd);
        }
      });
    };

    const handlePointerUp = () => {
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [activeDrag, startIndex, endIndex, flightData.length, onSelectIndex, onChangeRange, stepValue, maxTimelineIndex]);

  const handlePrev = () => {
    setIsPlaying(false);
    onSelectIndex(Math.max(0, currentIndex - stepValue));
  };

  const handleNext = () => {
    setIsPlaying(false);
    onSelectIndex(Math.min(maxTimelineIndex, currentIndex + stepValue));
  };

  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || flightData.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const targetIndex = snapToStep(percentage * maxTimelineIndex);
    onSelectIndex(targetIndex);
    setActiveDrag('current');
  };

  // Generate high fidelity formatted current time down to second based on float currentIndex
  const startPt = flightData[0];
  let displayTime = '---';
  if (startPt) {
    const [startHour, startMin, startSec] = startPt.time.split(':').map(Number);
    const elapsedSeconds = currentIndex * stepSeconds;
    const totalSeconds = (startHour * 3600) + (startMin * 60) + (startSec || 0) + elapsedSeconds;
    
    const h = Math.floor((totalSeconds / 3600) % 24);
    const m = Math.floor((totalSeconds / 60) % 60);
    const s = Math.round(totalSeconds % 60);
    
    displayTime = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // Memoized Ticks to avoid heavy re-render of hundreds of DOM nodes on every drag frame
  const ticks = useMemo(() => {
    const startPt = flightData[0];
    if (!startPt) return null;

    const [startHour, startMin, startSec] = startPt.time.split(':').map(Number);
    const startTotalSeconds = (startHour * 3600) + (startMin * 60) + (startSec || 0);

    // Total duration of the current active timeline in seconds
    const durationSeconds = maxTimelineIndex * stepSeconds;

    if (durationSeconds <= 0) return null;

    // Define tick intervals based on total duration in seconds
    let majorIntervalSeconds = 600; // default 10 minutes
    let mediumIntervalSeconds = 120; // default 2 minutes
    let showSecondsInLabel = false;

    if (durationSeconds <= 15) {
      majorIntervalSeconds = 2;
      mediumIntervalSeconds = 1;
      showSecondsInLabel = true;
    } else if (durationSeconds <= 45) {
      majorIntervalSeconds = 5;
      mediumIntervalSeconds = 1;
      showSecondsInLabel = true;
    } else if (durationSeconds <= 90) {
      majorIntervalSeconds = 10;
      mediumIntervalSeconds = 2;
      showSecondsInLabel = true;
    } else if (durationSeconds <= 180) {
      majorIntervalSeconds = 30;
      mediumIntervalSeconds = 5;
      showSecondsInLabel = true;
    } else if (durationSeconds <= 300) { // 5 minutes
      majorIntervalSeconds = 60;
      mediumIntervalSeconds = 10;
      showSecondsInLabel = true;
    } else if (durationSeconds <= 600) { // 10 minutes
      majorIntervalSeconds = 120; // 2 min
      mediumIntervalSeconds = 30;
      showSecondsInLabel = false;
    } else if (durationSeconds <= 1800) { // 30 minutes
      majorIntervalSeconds = 300; // 5 min
      mediumIntervalSeconds = 60; // 1 min
      showSecondsInLabel = false;
    } else if (durationSeconds <= 3600) { // 1 hour
      majorIntervalSeconds = 600; // 10 min
      mediumIntervalSeconds = 120; // 2 min
      showSecondsInLabel = false;
    } else if (durationSeconds <= 10800) { // 3 hours
      majorIntervalSeconds = 1800; // 30 min
      mediumIntervalSeconds = 300; // 5 min
      showSecondsInLabel = false;
    } else { // longer flights
      majorIntervalSeconds = 3600; // 1 hour
      mediumIntervalSeconds = 900; // 15 min
      showSecondsInLabel = false;
    }

    // Generate ticks at multiples of mediumIntervalSeconds
    const tickItems: { elapsed: number; isMajor: boolean; isMedium: boolean }[] = [];
    
    // We want the ticks to start at 0 elapsed seconds and go up to durationSeconds.
    for (let elapsed = 0; elapsed <= durationSeconds; elapsed += mediumIntervalSeconds) {
      const isMajor = elapsed % majorIntervalSeconds === 0;
      const isMedium = !isMajor && elapsed % mediumIntervalSeconds === 0;
      
      tickItems.push({
        elapsed,
        isMajor,
        isMedium
      });
    }

    // Ensure the last point has a tick if it's not already covered
    const lastElapsed = durationSeconds;
    const isLastCovered = tickItems.some(t => Math.abs(t.elapsed - lastElapsed) < 0.1);
    if (!isLastCovered && durationSeconds > 0) {
      tickItems.push({
        elapsed: lastElapsed,
        isMajor: true,
        isMedium: false
      });
    }

    return tickItems.map((tick, idx) => {
      const percentage = (tick.elapsed / durationSeconds) * 100;
      const totalSecs = startTotalSeconds + tick.elapsed;
      
      const h = Math.floor((totalSecs / 3600) % 24);
      const m = Math.floor((totalSecs / 60) % 60);
      const s = Math.round(totalSecs % 60);

      const label = showSecondsInLabel
        ? `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
        : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      let tickHeight = "h-3"; // Minor: 12px
      let tickBg = "bg-white/20";
      
      if (tick.isMajor) {
        tickHeight = "h-12"; // Major: 48px
        tickBg = "bg-white/70";
      } else if (tick.isMedium) {
        tickHeight = "h-8"; // Medium: 32px
        tickBg = "bg-white/45";
      }

      return (
        <div
          key={idx}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${percentage}%` }}
        >
          <div className={`w-[1px] ${tickHeight} ${tickBg}`}></div>
          {tick.isMajor && (
            <span className="absolute top-[28px] text-[10px] text-white/60 font-mono tracking-tighter select-none whitespace-nowrap">
              {label}
            </span>
          )}
        </div>
      );
    });
  }, [flightData, maxTimelineIndex, stepSeconds]);

  return (
    <div className="bg-[#121214] border border-[#2A2A2C] rounded-sm p-4 font-mono select-none flex items-center justify-between gap-6" id="time-slider-container">
      {/* Left Side: Playback Control */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-1 bg-black/40 p-1 border border-[#2A2A2C] rounded-sm">
          <button
            onClick={handlePrev}
            disabled={currentIndex <= 0.0001}
            className="p-1 text-white/50 hover:text-white disabled:text-white/20 disabled:hover:bg-transparent hover:bg-white/10 rounded-sm transition-colors cursor-pointer"
            title="上一航步"
          >
            <ChevronLeft size={16} />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 bg-white text-black rounded hover:bg-white/90 transition-colors cursor-pointer flex items-center justify-center shadow-sm w-7 h-7"
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause size={12} className="fill-black text-black" /> : <Play size={12} className="fill-black text-black" />}
          </button>

          <button
            onClick={handleNext}
            disabled={currentIndex >= flightData.length - 1 - 0.0001}
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
            <option value={1000}>1x</option>
            <option value={500}>2x</option>
            <option value={250}>3x</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-[12px] text-white/50 border-l border-[#2A2A2C] pl-3">
          <span>间隔:</span>
          <select
            value={intervalVal}
            onChange={(e) => onChangeInterval(e.target.value)}
            className="bg-black/40 border border-[#2A2A2C] text-white rounded px-1.5 py-0.5 text-[12px] cursor-pointer focus:outline-none"
          >
            <option value="1s">1s</option>
            <option value="10s">10s</option>
            <option value="30s">30s</option>
            <option value="1min">1min</option>
            <option value="2min">2min</option>
            <option value="5min">5min</option>
            <option value="10min">10min</option>
          </select>
        </div>
      </div>

      {/* Right Side: Custom Brushed Timeline Selector (Visual Map with Direct Interactive Handle Dragging) */}
      <div className="flex-grow relative h-20 flex items-center min-w-[200px] px-10">
        {/* Track representation */}
        <div 
          ref={containerRef}
          className="h-[2px] w-full bg-[#2A2A2C] relative cursor-pointer"
          onPointerDown={handleTrackPointerDown}
        >
          {/* Selected Active Subrange Brush Highlight - Brighter, richer orange with taller height */}
          <div
            className="absolute top-1/2 -translate-y-1/2 bg-[#FF9F0A]/25 h-12 border-t border-b border-[#FF9F0A]/60 pointer-events-none"
            style={{
              left: `${(startIndex / (maxTimelineIndex || 1)) * 100}%`,
              width: `${((endIndex - startIndex) / (maxTimelineIndex || 1)) * 100}%`
            }}
          ></div>

          {/* Left Drag Handle (startIndex) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-14 flex items-center justify-center cursor-ew-resize z-30 select-none"
            style={{
              left: `${(startIndex / (maxTimelineIndex || 1)) * 100}%`
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setActiveDrag('start');
            }}
          >
            <div className="w-[3px] h-12 bg-[#FF9F0A] rounded-full shadow-[0_0_8px_rgba(255,159,10,0.8)] hover:scale-x-150 transition-transform"></div>
          </div>

          {/* Right Drag Handle (endIndex) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-14 flex items-center justify-center cursor-ew-resize z-30 select-none"
            style={{
              left: `${(endIndex / (maxTimelineIndex || 1)) * 100}%`
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setActiveDrag('end');
            }}
          >
            <div className="w-[3px] h-12 bg-[#FF9F0A] rounded-full shadow-[0_0_8px_rgba(255,159,10,0.8)] hover:scale-x-150 transition-transform"></div>
          </div>

          {/* Current scrubber needle - thin, tall red vertical line */}
          <div
            className="absolute h-14 w-[2px] bg-[#FF3B30] top-1/2 transform -translate-y-1/2 shadow-[0_0_8px_rgba(255,59,48,0.5)] pointer-events-none transition-all duration-75 z-20"
            style={{
              left: `${(currentIndex / (maxTimelineIndex || 1)) * 100}%`
            }}
          >
            {/* Sleek top cap indicator */}
            <div className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full absolute -top-0.5 left-1/2 transform -translate-x-1/2 shadow-[0_0_4px_rgba(255,59,48,0.8)]"></div>
            {/* Sleek bottom cap indicator */}
            <div className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 shadow-[0_0_4px_rgba(255,59,48,0.8)]"></div>

            {/* Floating current time label centered over needle */}
            <div className="absolute left-1/2 -top-6 -translate-x-1/2 bg-[#FF3B30] text-white text-[11px] font-mono px-1.5 py-0.5 rounded shadow-[0_2px_6px_rgba(255,59,48,0.5)] whitespace-nowrap pointer-events-none font-bold select-none flex items-center">
              {displayTime}
            </div>
          </div>

          {/* Invisible Drag Handle Target for the Red Scrubber Needle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-14 flex items-center justify-center cursor-grab active:cursor-grabbing z-40 select-none"
            style={{
              left: `${(currentIndex / (maxTimelineIndex || 1)) * 100}%`
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setActiveDrag('current');
            }}
          ></div>

          {/* Time Ticks (大小刻度尺方式 - 贯穿上下) */}
          {ticks}
        </div>
      </div>
    </div>
  );
}
