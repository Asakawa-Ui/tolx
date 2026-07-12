import React, { useRef, useMemo } from 'react';
import { FlightDataPoint } from '../types';
import { Plane, Compass, TrendingUp, Gauge, MapPin, Activity, HelpCircle } from 'lucide-react';

interface FlightTelemetryPanelProps {
  currentPoint: FlightDataPoint;
  flightData: FlightDataPoint[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  visibleData: FlightDataPoint[];
  startIndex: number;
  endIndex: number;
}

export default function FlightTelemetryPanel({
  currentPoint,
  flightData,
  currentIndex,
  onSelectIndex,
  visibleData,
  startIndex,
  endIndex
}: FlightTelemetryPanelProps) {
  const chartRef = useRef<SVGSVGElement | null>(null);

  // Auto-scaling Y-Axis domain based on the visible data range
  const altDomain = useMemo(() => {
    if (visibleData.length === 0) return { min: 2000, max: 8000 };
    const values = visibleData.map(pt => pt.altitude);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.1 || 500;
    return {
      min: Math.max(0, Math.round((minVal - padding) / 100) * 100),
      max: Math.round((maxVal + padding) / 100) * 100
    };
  }, [visibleData]);

  const speedDomain = useMemo(() => {
    if (visibleData.length === 0) return { min: 600, max: 950 };
    const values = visibleData.map(pt => pt.speed);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.1 || 50;
    return {
      min: Math.max(0, Math.round((minVal - padding) / 10) * 10),
      max: Math.round((maxVal + padding) / 10) * 10
    };
  }, [visibleData]);

  // Chart Dimensions
  const width = 850;
  const height = 180;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 15;
  const paddingBottom = 25;

  const innerWidth = width - paddingLeft - paddingRight;
  const innerHeight = height - paddingTop - paddingBottom;

  // Coordinate projections
  const getX = (idx: number) => {
    if (visibleData.length <= 1) return paddingLeft;
    const fraction = idx / (visibleData.length - 1);
    return paddingLeft + fraction * innerWidth;
  };

  const getAltY = (val: number) => {
    const range = altDomain.max - altDomain.min || 1;
    const fraction = (val - altDomain.min) / range;
    return height - paddingBottom - fraction * innerHeight;
  };

  const getSpeedY = (val: number) => {
    const range = speedDomain.max - speedDomain.min || 1;
    const fraction = (val - speedDomain.min) / range;
    return height - paddingBottom - fraction * innerHeight;
  };

  // Click / Scrub handler
  const handleChartInteraction = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!chartRef.current) return;
    const rect = chartRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    
    // Scale clientX to SVG width coordinates
    const svgX = (clientX / rect.width) * width;
    const plotX = svgX - paddingLeft;
    const fraction = plotX / innerWidth;
    
    const approxIdx = Math.round(fraction * (visibleData.length - 1));
    const finalIdx = Math.max(0, Math.min(visibleData.length - 1, approxIdx));
    
    const actualPoint = visibleData[finalIdx];
    if (actualPoint) {
      // Find the absolute index in main flightData array
      const absoluteIdx = flightData.findIndex(pt => pt.id === actualPoint.id);
      if (absoluteIdx !== -1) {
        onSelectIndex(absoluteIdx);
      }
    }
  };

  // Generate SVG path for Altitude Area
  const altAreaPath = useMemo(() => {
    if (visibleData.length === 0) return '';
    let d = `M ${getX(0)} ${height - paddingBottom}`;
    
    visibleData.forEach((pt, idx) => {
      d += ` L ${getX(idx)} ${getAltY(pt.altitude)}`;
    });
    
    d += ` L ${getX(visibleData.length - 1)} ${height - paddingBottom} Z`;
    return d;
  }, [visibleData, altDomain]);

  // Generate SVG path for Altitude Line
  const altLinePath = useMemo(() => {
    if (visibleData.length === 0) return '';
    return visibleData.map((pt, idx) => {
      const command = idx === 0 ? 'M' : 'L';
      return `${command} ${getX(idx)} ${getAltY(pt.altitude)}`;
    }).join(' ');
  }, [visibleData, altDomain]);

  // Generate SVG path for Speed Line
  const speedLinePath = useMemo(() => {
    if (visibleData.length === 0) return '';
    return visibleData.map((pt, idx) => {
      const command = idx === 0 ? 'M' : 'L';
      return `${command} ${getX(idx)} ${getSpeedY(pt.speed)}`;
    }).join(' ');
  }, [visibleData, speedDomain]);

  // Find relative index of currentPoint inside visibleData
  const relativeCurrentIndex = useMemo(() => {
    return visibleData.findIndex(pt => pt.id === currentPoint?.id);
  }, [visibleData, currentPoint]);

  return (
    <div className="flex flex-col h-full justify-between space-y-4 overflow-hidden">
      
      {/* 1. Real-time Telemetry Grid */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        
        {/* Card 1: Altitude */}
        <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-sm p-4 relative overflow-hidden group">
          <div className="absolute top-2 right-2 text-white/15">
            <TrendingUp size={24} />
          </div>
          <span className="text-[12px] text-white/40 font-mono uppercase font-bold tracking-wider">当前飞行高度 (ALT)</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-[28px] font-mono font-black text-[#00E5FF] tracking-tight leading-none">{currentPoint?.altitude || '---'}</span>
            <span className="text-[12px] font-mono text-white/40">米 (m)</span>
          </div>
          <div className="mt-2 text-[12px] font-mono text-white/50 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span>气压测量高度数据正常</span>
          </div>
        </div>

        {/* Card 2: Speed */}
        <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-sm p-4 relative overflow-hidden">
          <div className="absolute top-2 right-2 text-white/15">
            <Gauge size={24} />
          </div>
          <span className="text-[12px] text-white/40 font-mono uppercase font-bold tracking-wider">当前真空速 (TAS)</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-[28px] font-mono font-black text-[#34C759] tracking-tight leading-none">{currentPoint?.speed || '---'}</span>
            <span className="text-[12px] font-mono text-white/40">公里/小时 (km/h)</span>
          </div>
          <div className="mt-2 text-[12px] font-mono text-white/50 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>马赫数: {( (currentPoint?.speed || 0) / 1060 ).toFixed(2)} Mach</span>
          </div>
        </div>

        {/* Card 3: GPS Coordinates */}
        <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-sm p-4 relative overflow-hidden col-span-1">
          <div className="absolute top-2 right-2 text-white/15">
            <MapPin size={24} />
          </div>
          <span className="text-[12px] text-white/40 font-mono uppercase font-bold tracking-wider">GIS 定位坐标 (GNSS)</span>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center text-[14px] font-mono">
              <span className="text-white/40">纬度 LAT:</span>
              <span className="text-white font-bold">{currentPoint?.latitude || '---'} °N</span>
            </div>
            <div className="flex justify-between items-center text-[14px] font-mono">
              <span className="text-white/40">经度 LON:</span>
              <span className="text-white font-bold">{currentPoint?.longitude || '---'} °E</span>
            </div>
          </div>
          <div className="mt-1 text-[12px] font-mono text-white/40 flex justify-between">
            <span>坐标系: WGS-84</span>
            <span>卫星数: 16</span>
          </div>
        </div>

        {/* Card 4: Compass Heading */}
        <div className="bg-[#1A1A1C] border border-[#2A2A2C] rounded-sm p-3 flex items-center justify-between relative overflow-hidden">
          <div className="flex flex-col">
            <span className="text-[12px] text-white/40 font-mono uppercase font-bold tracking-wider">磁航向 (HDG)</span>
            <span className="text-[24px] font-mono font-black text-white mt-1 flex items-center gap-1.5 leading-none">
              {currentPoint?.heading || '0'}°
            </span>
            <span className="text-[12px] font-mono text-white/40 mt-1">
              导航姿态: 稳定
            </span>
          </div>
          {/* Visual Mini Compass Graphic */}
          <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center relative shrink-0 bg-black/40 mr-1 shadow-inner">
            <span className="text-[12px] text-white/40 absolute top-0.5 font-bold leading-none scale-75">N</span>
            <span className="text-[12px] text-white/20 absolute bottom-0.5 font-bold leading-none scale-75">S</span>
            <span className="text-[12px] text-white/20 absolute left-0.5 font-bold leading-none scale-75">W</span>
            <span className="text-[12px] text-white/20 absolute right-0.5 font-bold leading-none scale-75">E</span>
            
            <div 
              className="w-0.5 h-12 bg-white relative transition-transform duration-300"
              style={{ transform: `rotate(${currentPoint?.heading || 0}deg)` }}
            >
              {/* Needle pointer */}
              <div className="w-2.5 h-2.5 bg-[#FF3B30] rounded-full absolute -top-1 left-1/2 transform -translate-x-1/2 border border-[#1A1A1C]"></div>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Interactive Charts Section */}
      <div className="flex-grow bg-[#151518] border border-[#2A2A2C] rounded-sm p-4 flex flex-col justify-between overflow-hidden">
        
        {/* Chart Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-[#00E5FF]" />
            <h3 className="text-[16px] font-mono font-bold text-white uppercase tracking-wide">
              全航程高度 / 真空速 实时剖面趋势图
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[12px] font-mono text-white/40">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500"></span>
              <span>飞行高度 (米)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-0.5 border-t-2 border-dashed border-emerald-400"></span>
              <span>真空速 (公里/小时)</span>
            </div>
            <span className="text-[12px] text-white/30">(可点击图表快速定位点)</span>
          </div>
        </div>

        {/* Interactive SVG Rendering */}
        <div className="flex-grow flex items-center justify-center pt-2 h-0 min-h-[140px]">
          <svg
            ref={chartRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="cursor-crosshair select-none"
            onClick={handleChartInteraction}
          >
            {/* Definitions for gorgeous gradients */}
            <defs>
              <linearGradient id="altAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Grid horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
              const gridY = paddingTop + ratio * innerHeight;
              const gridAltVal = altDomain.max - ratio * (altDomain.max - altDomain.min);
              const gridSpeedVal = speedDomain.max - ratio * (speedDomain.max - speedDomain.min);
              return (
                <g key={gridIdx} className="opacity-20">
                  <line
                    x1={paddingLeft}
                    y1={gridY}
                    x2={width - paddingRight}
                    y2={gridY}
                    stroke="#2A2A2C"
                    strokeWidth={1}
                    strokeDasharray="2,2"
                  />
                  {/* Left Label: Altitude */}
                  <text
                    x={paddingLeft - 8}
                    y={gridY + 4}
                    textAnchor="end"
                    fill="#00E5FF"
                    fontSize="12"
                    fontFamily="monospace"
                  >
                    {Math.round(gridAltVal)}
                  </text>
                  {/* Right Label: Speed */}
                  <text
                    x={width - paddingRight + 8}
                    y={gridY + 4}
                    textAnchor="start"
                    fill="#34C759"
                    fontSize="12"
                    fontFamily="monospace"
                  >
                    {Math.round(gridSpeedVal)}
                  </text>
                </g>
              );
            })}

            {/* Filled Area for Altitude */}
            {altAreaPath && (
              <path
                d={altAreaPath}
                fill="url(#altAreaGrad)"
                className="transition-all duration-300"
              />
            )}

            {/* Line for Altitude */}
            {altLinePath && (
              <path
                d={altLinePath}
                fill="none"
                stroke="#00E5FF"
                strokeWidth={1.5}
                className="transition-all duration-300"
              />
            )}

            {/* Dash Line for Speed */}
            {speedLinePath && (
              <path
                d={speedLinePath}
                fill="none"
                stroke="#34C759"
                strokeWidth={1.5}
                strokeDasharray="4,3"
                className="transition-all duration-300"
              />
            )}

            {/* Active Position Indicator bar */}
            {relativeCurrentIndex !== -1 && (
              <g>
                <line
                  x1={getX(relativeCurrentIndex)}
                  y1={paddingTop}
                  x2={getX(relativeCurrentIndex)}
                  y2={height - paddingBottom}
                  stroke="#FF3B30"
                  strokeWidth={1.2}
                  strokeDasharray="3,3"
                />
                
                {/* Intersect point - Altitude */}
                <circle
                  cx={getX(relativeCurrentIndex)}
                  cy={getAltY(currentPoint.altitude)}
                  r={4}
                  fill="#00E5FF"
                  stroke="#0A0A0B"
                  strokeWidth={1.5}
                />

                {/* Intersect point - Speed */}
                <circle
                  cx={getX(relativeCurrentIndex)}
                  cy={getSpeedY(currentPoint.speed)}
                  r={4}
                  fill="#34C759"
                  stroke="#0A0A0B"
                  strokeWidth={1.5}
                />

                {/* Pulse Ring */}
                <circle
                  cx={getX(relativeCurrentIndex)}
                  cy={getAltY(currentPoint.altitude)}
                  r={8}
                  fill="none"
                  stroke="#00E5FF"
                  strokeWidth={1}
                  className="animate-ping"
                  opacity={0.5}
                />

                {/* Timestamp Label at bottom */}
                <text
                  x={getX(relativeCurrentIndex)}
                  y={height - 10}
                  textAnchor="middle"
                  fill="#FF3B30"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {currentPoint.time}
                </text>

                {/* Real-time value badge box */}
                <g transform={`translate(${Math.max(paddingLeft + 10, Math.min(width - paddingRight - 110, getX(relativeCurrentIndex) - 50))}, ${paddingTop + 10})`}>
                  <rect
                    width={100}
                    height={40}
                    fill="#1A1A1C"
                    stroke="#2A2A2C"
                    strokeWidth={1}
                    rx={2}
                  />
                  <text x={8} y={15} fill="#00E5FF" fontSize="12" fontFamily="monospace">
                    H: {currentPoint.altitude} m
                  </text>
                  <text x={8} y={30} fill="#34C759" fontSize="12" fontFamily="monospace">
                    V: {currentPoint.speed} km/h
                  </text>
                </g>
              </g>
            )}

            {/* Baseline X-axis */}
            <line
              x1={paddingLeft}
              y1={height - paddingBottom}
              x2={width - paddingRight}
              y2={height - paddingBottom}
              stroke="#2A2A2C"
              strokeWidth={1.5}
            />

            {/* Time labels under X-axis */}
            {visibleData.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((ratio, timeIdx) => {
              const dataIdx = Math.round(ratio * (visibleData.length - 1));
              const pt = visibleData[dataIdx];
              if (!pt) return null;
              return (
                <text
                  key={timeIdx}
                  x={getX(dataIdx)}
                  y={height - 10}
                  textAnchor="middle"
                  fill="#8E8E93"
                  fontSize="12"
                  fontFamily="monospace"
                >
                  {pt.time}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Dynamic Flight Progress Info Bar */}
        <div className="flex justify-between items-center bg-black/40 px-3 py-1.5 border border-white/5 rounded-xs mt-2 shrink-0">
          <div className="text-[12px] font-mono text-white/50 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span>当前段航线飞行进度: {Math.round((relativeCurrentIndex / Math.max(1, visibleData.length - 1)) * 100)}%</span>
          </div>
          <div className="text-[12px] font-mono text-white/40">
            <span>数据采样范围: {visibleData[0]?.time || '---'} 至 {visibleData[visibleData.length - 1]?.time || '---'}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
