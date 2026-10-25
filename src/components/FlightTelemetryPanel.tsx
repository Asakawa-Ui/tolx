import React, { useRef, useState, useEffect, useMemo } from 'react';
import { FlightDataPoint } from '../types';
import { TrendingUp, Gauge, MapPin, Compass } from 'lucide-react';
import { useTheme } from '../ThemeContext';

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
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const chartRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Responsive container dimension measurement
  const [chartDimensions, setChartDimensions] = useState({ width: 850, height: 240 });

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 60) {
          setChartDimensions({
            width: Math.round(rect.width),
            height: Math.round(rect.height)
          });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const width = chartDimensions.width;
  const height = chartDimensions.height;

  // Paddings: 84px on sides provides clear separation between outer and inner axes
  const paddingLeft = 84;
  const paddingRight = 84;
  const paddingTop = 22;
  const paddingBottom = 26;

  const innerWidth = Math.max(10, width - paddingLeft - paddingRight);
  const innerHeight = Math.max(10, height - paddingTop - paddingBottom);

  // Toggle state for the 4 curves
  const [visibleCurves, setVisibleCurves] = useState({
    altitude: true,
    groundSpeed: true,
    temperature: true,
    humidity: true
  });

  // Mouse hover state for inspection guideline and tooltip
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const toggleCurve = (key: keyof typeof visibleCurves) => {
    setVisibleCurves(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 1. Altitude domain (高度, m)
  const altDomain = useMemo(() => {
    if (visibleData.length === 0) return { min: 1000, max: 8500 };
    const values = visibleData.map(pt => pt.altitude);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.1 || 500;
    return {
      min: Math.max(0, Math.round((minVal - padding) / 100) * 100),
      max: Math.round((maxVal + padding) / 100) * 100
    };
  }, [visibleData]);

  // 2. Ground Speed domain (航速 / 地速, km/h)
  const groundSpeedDomain = useMemo(() => {
    if (visibleData.length === 0) return { min: 300, max: 600 };
    const values = visibleData.map(pt => pt.groundSpeed ?? (pt.speed + 40));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = (maxVal - minVal) * 0.1 || 30;
    return {
      min: Math.max(0, Math.round((minVal - padding) / 10) * 10),
      max: Math.round((maxVal + padding) / 10) * 10
    };
  }, [visibleData]);

  // 3. Temperature domain (温度, °C)
  const tempDomain = useMemo(() => {
    if (visibleData.length === 0) return { min: -40, max: 10 };
    const values = visibleData.map(pt => pt.temperature ?? -15);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const padding = Math.max(2, (maxVal - minVal) * 0.1);
    return {
      min: Math.floor(minVal - padding),
      max: Math.ceil(maxVal + padding)
    };
  }, [visibleData]);

  // 4. Humidity domain (相对湿度, %) - 0% to 100%
  const humDomain = { min: 0, max: 100 };

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
    const range = groundSpeedDomain.max - groundSpeedDomain.min || 1;
    const fraction = (val - groundSpeedDomain.min) / range;
    return height - paddingBottom - fraction * innerHeight;
  };

  const getTempY = (val: number) => {
    const range = tempDomain.max - tempDomain.min || 1;
    const fraction = (val - tempDomain.min) / range;
    return height - paddingBottom - fraction * innerHeight;
  };

  const getHumY = (val: number) => {
    const range = humDomain.max - humDomain.min || 1;
    const fraction = (val - humDomain.min) / range;
    return height - paddingBottom - fraction * innerHeight;
  };

  // Mouse move handler for hover inspection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!chartRef.current || visibleData.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;
    const plotX = svgX - paddingLeft;
    
    if (plotX < 0 || plotX > innerWidth) {
      setHoverIndex(null);
      return;
    }
    
    const fraction = Math.max(0, Math.min(1, plotX / innerWidth));
    const approxIdx = Math.round(fraction * (visibleData.length - 1));
    setHoverIndex(approxIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Click handler to select point / seek
  const handleChartClick = () => {
    if (hoverIndex !== null && visibleData[hoverIndex]) {
      const actualPoint = visibleData[hoverIndex];
      const absoluteIdx = flightData.findIndex(pt => pt.id === actualPoint.id);
      if (absoluteIdx !== -1) {
        onSelectIndex(absoluteIdx);
      }
    }
  };

  // SVG path for Altitude Line
  const altLinePath = useMemo(() => {
    if (visibleData.length === 0 || !visibleCurves.altitude) return '';
    return visibleData.map((pt, idx) => {
      const command = idx === 0 ? 'M' : 'L';
      return `${command} ${getX(idx)} ${getAltY(pt.altitude)}`;
    }).join(' ');
  }, [visibleData, altDomain, visibleCurves.altitude, width, height]);

  // SVG path for Ground Speed Line (航速)
  const speedLinePath = useMemo(() => {
    if (visibleData.length === 0 || !visibleCurves.groundSpeed) return '';
    return visibleData.map((pt, idx) => {
      const command = idx === 0 ? 'M' : 'L';
      const spd = pt.groundSpeed ?? (pt.speed + 40);
      return `${command} ${getX(idx)} ${getSpeedY(spd)}`;
    }).join(' ');
  }, [visibleData, groundSpeedDomain, visibleCurves.groundSpeed, width, height]);

  // SVG path for Temperature Line (温度)
  const tempLinePath = useMemo(() => {
    if (visibleData.length === 0 || !visibleCurves.temperature) return '';
    return visibleData.map((pt, idx) => {
      const command = idx === 0 ? 'M' : 'L';
      const tmp = pt.temperature ?? -15;
      return `${command} ${getX(idx)} ${getTempY(tmp)}`;
    }).join(' ');
  }, [visibleData, tempDomain, visibleCurves.temperature, width, height]);

  // SVG path for Humidity Line (湿度)
  const humLinePath = useMemo(() => {
    if (visibleData.length === 0 || !visibleCurves.humidity) return '';
    return visibleData.map((pt, idx) => {
      const command = idx === 0 ? 'M' : 'L';
      const hum = pt.humidity ?? 50;
      return `${command} ${getX(idx)} ${getHumY(hum)}`;
    }).join(' ');
  }, [visibleData, humDomain, visibleCurves.humidity, width, height]);

  // Find relative index of currentPoint inside visibleData
  const relativeCurrentIndex = useMemo(() => {
    return visibleData.findIndex(pt => pt.id === currentPoint?.id);
  }, [visibleData, currentPoint]);

  return (
    <div className="flex flex-col h-full space-y-4 overflow-hidden">
      
      {/* 1. Real-time Telemetry Grid */}
      <div className="grid grid-cols-4 gap-4 shrink-0">
        
        {/* Card 1: Altitude */}
        <div className={`border rounded-sm p-4 relative overflow-hidden group transition-colors duration-200 ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] shadow-xs' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <div className={`absolute top-2 right-2 ${isLight ? 'text-[#D5D3CE]' : 'text-white/15'}`}>
            <TrendingUp size={24} />
          </div>
          <span className={`text-[12px] font-mono uppercase font-bold tracking-wider ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>当前飞行高度 (ALT)</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className={`text-[28px] font-mono font-black tracking-tight leading-none ${isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'}`}>
              {currentPoint?.altitude || '---'}
            </span>
            <span className={`text-[12px] font-mono ${isLight ? 'text-[#A1A1AA]' : 'text-white/40'}`}>米 (m)</span>
          </div>
        </div>

        {/* Card 2: Ground Speed (航速) & True Airspeed (真空速) */}
        <div className={`border rounded-sm p-4 relative overflow-hidden transition-colors duration-200 ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] shadow-xs' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <div className={`absolute top-2 right-2 ${isLight ? 'text-[#D5D3CE]' : 'text-white/15'}`}>
            <Gauge size={24} />
          </div>
          <span className={`text-[12px] font-mono uppercase font-bold tracking-wider ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>当前航速 (GS) / 真空速</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className={`text-[28px] font-mono font-black tracking-tight leading-none ${isLight ? 'text-[#16A34A]' : 'text-[#34C759]'}`}>
              {currentPoint?.groundSpeed || currentPoint?.speed || '---'}
            </span>
            <span className={`text-[12px] font-mono ${isLight ? 'text-[#A1A1AA]' : 'text-white/40'}`}>km/h</span>
          </div>
          <div className={`mt-2 text-[12px] font-mono flex items-center ${isLight ? 'text-[#71717A]' : 'text-white/50'}`}>
            <span>真空速(TAS): {currentPoint?.speed || '---'} km/h</span>
          </div>
        </div>

        {/* Card 3: GPS Coordinates */}
        <div className={`border rounded-sm p-4 relative overflow-hidden col-span-1 transition-colors duration-200 ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] shadow-xs' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <div className={`absolute top-2 right-2 ${isLight ? 'text-[#D5D3CE]' : 'text-white/15'}`}>
            <MapPin size={24} />
          </div>
          <span className={`text-[12px] font-mono uppercase font-bold tracking-wider ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>GIS 定位坐标 (GNSS)</span>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between items-center text-[14px] font-mono">
              <span className={isLight ? 'text-[#A1A1AA]' : 'text-white/40'}>纬度 LAT:</span>
              <span className={`font-bold ${isLight ? 'text-[#18181B]' : 'text-white'}`}>{currentPoint?.latitude || '---'} °N</span>
            </div>
            <div className="flex justify-between items-center text-[14px] font-mono">
              <span className={isLight ? 'text-[#A1A1AA]' : 'text-white/40'}>经度 LON:</span>
              <span className={`font-bold ${isLight ? 'text-[#18181B]' : 'text-white'}`}>{currentPoint?.longitude || '---'} °E</span>
            </div>
          </div>
        </div>

        {/* Card 4: Compass Heading */}
        <div className={`border rounded-sm p-4 relative overflow-hidden transition-colors duration-200 ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] shadow-xs' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <div className={`absolute top-2 right-2 ${isLight ? 'text-[#D5D3CE]' : 'text-white/15'}`}>
            <Compass size={24} />
          </div>
          <span className={`text-[12px] font-mono uppercase font-bold tracking-wider ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>磁航向 (HDG)</span>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className={`text-[28px] font-mono font-black tracking-tight leading-none ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
              {currentPoint?.heading || '0'}°
            </span>
          </div>
        </div>

      </div>

      {/* 2. Interactive Charts Section - Sized consistently to the top frame (~240px SVG), space below cleanly open */}
      <div className={`border rounded-sm p-3.5 flex flex-col justify-between shrink-0 transition-colors duration-200 ${
        isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] shadow-xs' : 'bg-[#151518] border-[#2A2A2C]'
      }`}>
        
        {/* Chart Header - Clean Legends */}
        <div className={`flex items-center justify-between pb-2 shrink-0 border-b ${isLight ? 'border-[#E4E3DE]' : 'border-white/5'}`}>
          <div className="flex items-center gap-2.5 text-[12px] font-mono flex-wrap">
            {/* Legend 1: Altitude */}
            <button
              onClick={() => toggleCurve('altitude')}
              className={`flex items-center gap-2 px-3 py-1 rounded-sm cursor-pointer transition-all border ${
                visibleCurves.altitude
                  ? (isLight ? 'bg-sky-100/80 border-sky-400 text-sky-950 shadow-xs' : 'bg-cyan-950/30 border-cyan-500/40 text-cyan-300')
                  : (isLight ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#A1A1AA] opacity-60 line-through' : 'bg-[#18181B] border-white/5 text-white/30 opacity-50 line-through')
              }`}
              title="点击切换显示/隐藏高度曲线"
            >
              <span className="w-3 h-0.5 rounded-full bg-[#00E5FF]"></span>
              <span className="font-semibold">高度 (km)</span>
            </button>

            {/* Legend 2: Ground Speed */}
            <button
              onClick={() => toggleCurve('groundSpeed')}
              className={`flex items-center gap-2 px-3 py-1 rounded-sm cursor-pointer transition-all border ${
                visibleCurves.groundSpeed
                  ? (isLight ? 'bg-emerald-100/80 border-emerald-400 text-emerald-950 shadow-xs' : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300')
                  : (isLight ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#A1A1AA] opacity-60 line-through' : 'bg-[#18181B] border-white/5 text-white/30 opacity-50 line-through')
              }`}
              title="点击切换显示/隐藏航速曲线"
            >
              <span className="w-3 h-0.5 rounded-full bg-[#34C759]"></span>
              <span className="font-semibold">航速 (km/h)</span>
            </button>

            {/* Legend 3: Temperature */}
            <button
              onClick={() => toggleCurve('temperature')}
              className={`flex items-center gap-2 px-3 py-1 rounded-sm cursor-pointer transition-all border ${
                visibleCurves.temperature
                  ? (isLight ? 'bg-amber-100/80 border-amber-400 text-amber-950 shadow-xs' : 'bg-amber-950/30 border-amber-500/40 text-amber-300')
                  : (isLight ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#A1A1AA] opacity-60 line-through' : 'bg-[#18181B] border-white/5 text-white/30 opacity-50 line-through')
              }`}
              title="点击切换显示/隐藏气温曲线"
            >
              <span className="w-3 h-0.5 rounded-full bg-[#FF9500]"></span>
              <span className="font-semibold">气温 (°C)</span>
            </button>

            {/* Legend 4: Humidity */}
            <button
              onClick={() => toggleCurve('humidity')}
              className={`flex items-center gap-2 px-3 py-1 rounded-sm cursor-pointer transition-all border ${
                visibleCurves.humidity
                  ? (isLight ? 'bg-purple-100/80 border-purple-400 text-purple-950 shadow-xs' : 'bg-purple-950/30 border-purple-500/40 text-purple-300')
                  : (isLight ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#A1A1AA] opacity-60 line-through' : 'bg-[#18181B] border-white/5 text-white/30 opacity-50 line-through')
              }`}
              title="点击切换显示/隐藏湿度曲线"
            >
              <span className="w-3 h-0.5 rounded-full bg-[#AF52DE]"></span>
              <span className="font-semibold">湿度 (%)</span>
            </button>
          </div>

          {/* Right: Quick Hint */}
          <span className={`text-[11px] font-mono shrink-0 hidden sm:inline ${isLight ? 'text-[#71717A]' : 'text-white/30'}`}>
            (支持悬停检视与点击定位)
          </span>
        </div>

        {/* Interactive SVG Rendering - Measured dynamically (~240px height) */}
        <div ref={containerRef} className="h-[240px] w-full flex items-center justify-center pt-2">
          <svg
            ref={chartRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="cursor-crosshair select-none w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleChartClick}
          >
            {/* Chart Background Box */}
            <rect
              x={paddingLeft}
              y={paddingTop}
              width={innerWidth}
              height={innerHeight}
              fill={isLight ? "#F2F1EE" : "#101012"}
              stroke={isLight ? "#D5D3CE" : "#26262A"}
              strokeWidth={1}
              rx={2}
            />

            {/* Axis headers with generous spatial separation */}
            {visibleCurves.temperature && (
              <text x={8} y={paddingTop - 7} textAnchor="start" fill={isLight ? "#D97706" : "#FF9500"} fontSize="10.5" fontFamily="ui-monospace, monospace" fontWeight="bold">
                温(°C)
              </text>
            )}
            {visibleCurves.altitude && (
              <text x={paddingLeft - 8} y={paddingTop - 7} textAnchor="end" fill={isLight ? "#0284C7" : "#00E5FF"} fontSize="10.5" fontFamily="ui-monospace, monospace" fontWeight="bold">
                高(km)
              </text>
            )}
            {visibleCurves.groundSpeed && (
              <text x={width - paddingRight + 8} y={paddingTop - 7} textAnchor="start" fill={isLight ? "#16A34A" : "#34C759"} fontSize="10.5" fontFamily="ui-monospace, monospace" fontWeight="bold">
                速(km/h)
              </text>
            )}
            {visibleCurves.humidity && (
              <text x={width - 8} y={paddingTop - 7} textAnchor="end" fill={isLight ? "#7C3AED" : "#AF52DE"} fontSize="10.5" fontFamily="ui-monospace, monospace" fontWeight="bold">
                湿(%)
              </text>
            )}

            {/* Horizontal Grid lines and Axis Tick Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
              const gridY = paddingTop + ratio * innerHeight;
              const gridAltVal = altDomain.max - ratio * (altDomain.max - altDomain.min);
              const gridSpeedVal = groundSpeedDomain.max - ratio * (groundSpeedDomain.max - groundSpeedDomain.min);
              const gridTempVal = tempDomain.max - ratio * (tempDomain.max - tempDomain.min);
              const gridHumVal = humDomain.max - ratio * (humDomain.max - humDomain.min);

              return (
                <g key={gridIdx}>
                  <line
                    x1={paddingLeft}
                    y1={gridY}
                    x2={width - paddingRight}
                    y2={gridY}
                    stroke={isLight ? "#E4E3DE" : "#202024"}
                    strokeWidth={1}
                    strokeDasharray={ratio === 0 || ratio === 1 ? undefined : "2,2"}
                  />

                  {/* Left Outer: Temperature */}
                  {visibleCurves.temperature && (
                    <text
                      x={8}
                      y={gridY + 3.5}
                      textAnchor="start"
                      fill={isLight ? "#D97706" : "#FF9500"}
                      fontSize="11"
                      fontFamily="ui-monospace, monospace"
                    >
                      {Math.round(gridTempVal)}°
                    </text>
                  )}

                  {/* Left Inner: Altitude (km) */}
                  {visibleCurves.altitude && (
                    <text
                      x={paddingLeft - 8}
                      y={gridY + 3.5}
                      textAnchor="end"
                      fill={isLight ? "#0284C7" : "#00E5FF"}
                      fontSize="11"
                      fontFamily="ui-monospace, monospace"
                      fontWeight="bold"
                    >
                      {(gridAltVal / 1000).toFixed(1)}
                    </text>
                  )}

                  {/* Right Inner: Ground Speed */}
                  {visibleCurves.groundSpeed && (
                    <text
                      x={width - paddingRight + 8}
                      y={gridY + 3.5}
                      textAnchor="start"
                      fill={isLight ? "#16A34A" : "#34C759"}
                      fontSize="11"
                      fontFamily="ui-monospace, monospace"
                      fontWeight="bold"
                    >
                      {Math.round(gridSpeedVal)}
                    </text>
                  )}

                  {/* Right Outer: Humidity */}
                  {visibleCurves.humidity && (
                    <text
                      x={width - 10}
                      y={gridY + 3.5}
                      textAnchor="end"
                      fill={isLight ? "#7C3AED" : "#AF52DE"}
                      fontSize="11"
                      fontFamily="ui-monospace, monospace"
                    >
                      {Math.round(gridHumVal)}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* ====== ALL FOUR CURVES ON THE SAME CHART ====== */}
            {/* 1. Altitude Curve (Cyan) */}
            {altLinePath && (
              <path
                d={altLinePath}
                fill="none"
                stroke={isLight ? "#0284C7" : "#00E5FF"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}

            {/* 2. Ground Speed Curve (Green) */}
            {speedLinePath && (
              <path
                d={speedLinePath}
                fill="none"
                stroke={isLight ? "#16A34A" : "#34C759"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}

            {/* 3. Temperature Curve (Amber) */}
            {tempLinePath && (
              <path
                d={tempLinePath}
                fill="none"
                stroke={isLight ? "#D97706" : "#FF9500"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}

            {/* 4. Humidity Curve (Purple) */}
            {humLinePath && (
              <path
                d={humLinePath}
                fill="none"
                stroke={isLight ? "#7C3AED" : "#AF52DE"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}

            {/* Playback current position dot on altitude curve */}
            {relativeCurrentIndex !== -1 && visibleCurves.altitude && (
              <circle
                cx={getX(relativeCurrentIndex)}
                cy={getAltY(currentPoint.altitude)}
                r={4}
                fill={isLight ? "#0284C7" : "#00E5FF"}
                stroke={isLight ? "#FFFFFF" : "#0A0A0B"}
                strokeWidth={2}
                className="transition-all duration-150"
              />
            )}

            {/* ====== MOUSE HOVER INSPECTION GUIDELINE & MULTI-METRIC TOOLTIP ====== */}
            {hoverIndex !== null && visibleData[hoverIndex] && (() => {
              const hoverPoint = visibleData[hoverIndex];
              const hoverX = getX(hoverIndex);
              const badgeWidth = 152;
              const badgeHeight = 90;
              const isRightSide = hoverX > width / 2;
              const tooltipX = isRightSide
                ? Math.max(paddingLeft + 8, hoverX - badgeWidth - 14)
                : Math.min(width - paddingRight - badgeWidth - 8, hoverX + 14);
              const tooltipY = paddingTop + 4;

              return (
                <g pointerEvents="none">
                  {/* Vertical red dashed inspection line following mouse cursor */}
                  <line
                    x1={hoverX}
                    y1={paddingTop}
                    x2={hoverX}
                    y2={height - paddingBottom}
                    stroke="#FF3B30"
                    strokeWidth={1.2}
                    strokeDasharray="3,3"
                  />

                  {/* Intersect point - Altitude */}
                  {visibleCurves.altitude && (
                    <circle
                      cx={hoverX}
                      cy={getAltY(hoverPoint.altitude)}
                      r={3.8}
                      fill={isLight ? "#0284C7" : "#00E5FF"}
                      stroke={isLight ? "#FFFFFF" : "#0A0A0B"}
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Intersect point - Ground Speed */}
                  {visibleCurves.groundSpeed && (
                    <circle
                      cx={hoverX}
                      cy={getSpeedY(hoverPoint.groundSpeed ?? (hoverPoint.speed + 40))}
                      r={3.8}
                      fill={isLight ? "#16A34A" : "#34C759"}
                      stroke={isLight ? "#FFFFFF" : "#0A0A0B"}
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Intersect point - Temperature */}
                  {visibleCurves.temperature && (
                    <circle
                      cx={hoverX}
                      cy={getTempY(hoverPoint.temperature ?? -15)}
                      r={3.8}
                      fill={isLight ? "#D97706" : "#FF9500"}
                      stroke={isLight ? "#FFFFFF" : "#0A0A0B"}
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Intersect point - Humidity */}
                  {visibleCurves.humidity && (
                    <circle
                      cx={hoverX}
                      cy={getHumY(hoverPoint.humidity ?? 50)}
                      r={3.8}
                      fill={isLight ? "#7C3AED" : "#AF52DE"}
                      stroke={isLight ? "#FFFFFF" : "#0A0A0B"}
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Tooltip badge box */}
                  <g transform={`translate(${tooltipX}, ${tooltipY})`}>
                    <rect
                      width={badgeWidth}
                      height={badgeHeight}
                      fill={isLight ? "#FAFAF8" : "#141418"}
                      stroke={isLight ? "#D5D3CE" : "#2E2E34"}
                      strokeWidth={1}
                      rx={3}
                      className={isLight ? "shadow-md" : "shadow-xl"}
                      opacity={0.96}
                    />
                    <text x={10} y={16} fill={isLight ? "#18181B" : "#FFFFFF"} fontSize="11" fontFamily="ui-monospace, monospace" fontWeight="bold">
                      时刻: {hoverPoint.time}
                    </text>
                    <line x1={8} y1={22} x2={badgeWidth - 8} y2={22} stroke={isLight ? "#E4E3DE" : "#26262B"} strokeWidth={1} />
                    <text x={10} y={36} fill={isLight ? "#0284C7" : "#00E5FF"} fontSize="11" fontFamily="ui-monospace, monospace">
                      高度: {(hoverPoint.altitude / 1000).toFixed(2)} km
                    </text>
                    <text x={10} y={52} fill={isLight ? "#16A34A" : "#34C759"} fontSize="11" fontFamily="ui-monospace, monospace">
                      航速: {hoverPoint.groundSpeed ?? hoverPoint.speed} km/h
                    </text>
                    <text x={10} y={68} fill={isLight ? "#D97706" : "#FF9500"} fontSize="11" fontFamily="ui-monospace, monospace">
                      气温: {hoverPoint.temperature ?? '---'} °C
                    </text>
                    <text x={10} y={84} fill={isLight ? "#7C3AED" : "#AF52DE"} fontSize="11" fontFamily="ui-monospace, monospace">
                      湿度: {hoverPoint.humidity ?? '---'} %
                    </text>
                  </g>
                </g>
              );
            })()}

            {/* ====== BASELINE X-AXIS & TIME TICKS ====== */}
            <line
              x1={paddingLeft}
              y1={height - paddingBottom}
              x2={width - paddingRight}
              y2={height - paddingBottom}
              stroke={isLight ? "#D5D3CE" : "#26262A"}
              strokeWidth={1}
            />

            {/* Time labels under X-axis, aligned cleanly */}
            {visibleData.length > 0 && [0, 0.25, 0.5, 0.75, 1].map((ratio, timeIdx) => {
              const dataIdx = Math.round(ratio * (visibleData.length - 1));
              const pt = visibleData[dataIdx];
              if (!pt) return null;

              const tickX = getX(dataIdx);
              let anchor: 'start' | 'middle' | 'end' = 'middle';
              let adjustedX = tickX;
              if (timeIdx === 0) {
                anchor = 'start';
                adjustedX = paddingLeft;
              } else if (timeIdx === 4) {
                anchor = 'end';
                adjustedX = width - paddingRight;
              }

              return (
                <text
                  key={timeIdx}
                  x={adjustedX}
                  y={height - 9}
                  textAnchor={anchor}
                  fill={isLight ? "#71717A" : "#8E8E93"}
                  fontSize="11"
                  fontFamily="ui-monospace, monospace"
                >
                  {pt.time}
                </text>
              );
            })}
          </svg>
        </div>

      </div>

      {/* Clean empty space below as requested */}
      <div className="flex-grow"></div>

    </div>
  );
}

