import React, { useState, useMemo, useRef } from 'react';
import { FlightDataPoint, IcingAlgorithmDef, ProductConfig } from '../types';
import { LineChart, BarChart2, Check, Download, MapPin, Eye, Sliders, Layers, RefreshCw, ChevronDown } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import IcingConfigModal from './IcingConfigModal';

interface ProductCardProps {
  key?: React.Key | string;
  algorithm: IcingAlgorithmDef;
  flightData: FlightDataPoint[];
  visibleData: FlightDataPoint[];
  currentIndex: number;
  hoveredIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  onSelectIndex: (index: number) => void;
  config: ProductConfig;
  onChangeConfig: (newConfig: ProductConfig) => void;
  isMappedOnMap: boolean;
  onMapToTrajectory: () => void;
  systemMode: 'live' | 'history';
}

export default function ProductCard({
  algorithm,
  flightData,
  visibleData,
  currentIndex,
  hoveredIndex,
  onHoverIndex,
  onSelectIndex,
  config,
  onChangeConfig,
  isMappedOnMap,
  onMapToTrajectory,
  systemMode
}: ProductCardProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [chartMode, setChartMode] = useState<'line' | 'scatter'>('scatter');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [maxDistanceLimit, setMaxDistanceLimit] = useState<number>(100);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Configuration forms
  const [thLight, setThLight] = useState<number>(config.thresholds.light);
  const [thLightModerate, setThLightModerate] = useState<number>(config.thresholds.lightModerate ?? 3);
  const [thModerate, setThModerate] = useState<number>(config.thresholds.moderate);
  const [thSevere, setThSevere] = useState<number>(config.thresholds.severe);
  const [colorNone, setColorNone] = useState<string>(config.colors.none);
  const [colorLight, setColorLight] = useState<string>(config.colors.light);
  const [colorLightModerate, setColorLightModerate] = useState<string>(config.colors.lightModerate || '#22D3EE');
  const [colorModerate, setColorModerate] = useState<string>(config.colors.moderate);
  const [colorSevere, setColorSevere] = useState<string>(config.colors.severe);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync state with updated config prop (e.g. parent reset)
  React.useEffect(() => {
    setThLight(config.thresholds.light);
    if (config.thresholds.lightModerate !== undefined) {
      setThLightModerate(config.thresholds.lightModerate);
    }
    setThModerate(config.thresholds.moderate);
    setThSevere(config.thresholds.severe);
    setColorNone(config.colors.none);
    setColorLight(config.colors.light);
    if (config.colors.lightModerate) {
      setColorLightModerate(config.colors.lightModerate);
    }
    setColorModerate(config.colors.moderate);
    setColorSevere(config.colors.severe);
  }, [
    config.thresholds.light,
    config.thresholds.lightModerate,
    config.thresholds.moderate,
    config.thresholds.severe,
    config.colors.none,
    config.colors.light,
    config.colors.lightModerate,
    config.colors.moderate,
    config.colors.severe
  ]);

  // Unified evaluation logic matching user requirements
  const getPointColorAndLabel = (val: number) => {
    if (config.levels && config.levels.length > 0) {
      const nonBase = config.levels.filter(l => !l.isBase).sort((a, b) => b.minThreshold - a.minThreshold);
      for (const lvl of nonBase) {
        if (val >= lvl.minThreshold) {
          return { color: lvl.color, label: lvl.name };
        }
      }
      const baseLevel = config.levels[0] || { color: colorNone, name: algorithm.levelLabels?.none || '无积冰' };
      return { color: baseLevel.color, label: baseLevel.name };
    }

    if (algorithm.id === 'temp_frost') {
      const thresh = thLight;
      if (val > 0) {
        if (thSevere > 0 && val >= thSevere) {
          return { color: colorSevere, label: algorithm.levelLabels?.severe || '重度积冰' };
        }
        return { color: colorModerate, label: algorithm.levelLabels?.moderate || '中度及以上' };
      }
      if (val > thresh) {
        return { color: colorLight, label: algorithm.levelLabels?.light || '轻度积冰' };
      }
      return { color: colorNone, label: algorithm.levelLabels?.none || '无积冰' };
    }

    if (algorithm.id === 'icing_index') {
      if (val >= thSevere) return { color: colorSevere, label: algorithm.levelLabels?.severe || '重度积冰' };
      if (val >= thModerate) return { color: colorModerate, label: algorithm.levelLabels?.moderate || '中度积冰' };
      if (val >= thLightModerate) return { color: colorLightModerate, label: algorithm.levelLabels?.lightModerate || '轻-中度积冰' };
      if (val >= thLight) return { color: colorLight, label: algorithm.levelLabels?.light || '轻度积冰' };
      return { color: colorNone, label: algorithm.levelLabels?.none || '无积冰' };
    }

    // Default algorithms (ic_index, ic_improved, xgb, lgb, catb, rf, probe, turbulence)
    const hasThresholds = (thSevere > 0 || thModerate > 0 || thLight > 0);
    if (!hasThresholds && (!config.levels || config.levels.length === 0)) {
      return {
        color: isLight ? '#0284C7' : '#00E5FF',
        label: '实时监测值'
      };
    }

    if (thSevere > 0 && val >= thSevere) return { color: colorSevere, label: algorithm.levelLabels?.severe || '重度' };
    if (thModerate > 0 && val >= thModerate) return { color: colorModerate, label: algorithm.levelLabels?.moderate || '中度' };
    if (thLight > 0 && val >= thLight) return { color: colorLight, label: algorithm.levelLabels?.light || '轻度' };
    return { color: colorNone, label: algorithm.levelLabels?.none || '正常' };
  };

  // Apply configs
  const handleSaveConfig = () => {
    onChangeConfig({
      algorithmId: algorithm.id,
      thresholds: {
        light: Number(thLight),
        ...(algorithm.defaultThresholds.lightModerate !== undefined ? { lightModerate: Number(thLightModerate) } : {}),
        moderate: Number(thModerate),
        severe: Number(thSevere)
      },
      colors: {
        none: colorNone,
        light: colorLight,
        ...(algorithm.defaultThresholds.lightModerate !== undefined ? { lightModerate: colorLightModerate } : {}),
        moderate: colorModerate,
        severe: colorSevere
      }
    });
    setShowConfig(false);
  };

  const handleResetConfig = () => {
    setThLight(algorithm.defaultThresholds.light);
    if (algorithm.defaultThresholds.lightModerate !== undefined) {
      setThLightModerate(algorithm.defaultThresholds.lightModerate);
    }
    setThModerate(algorithm.defaultThresholds.moderate);
    setThSevere(algorithm.defaultThresholds.severe);
    setColorNone('#6B7280');
    setColorLight('#0A84FF');
    setColorLightModerate('#22D3EE');
    setColorModerate('#FF9F0A');
    setColorSevere('#FF3B30');
    onChangeConfig({
      algorithmId: algorithm.id,
      thresholds: algorithm.defaultThresholds,
      colors: {
        none: '#6B7280',
        light: '#0A84FF',
        lightModerate: '#22D3EE',
        moderate: '#FF9F0A',
        severe: '#FF3B30'
      }
    });
  };

  // Slice or filter data up to current time in live mode
  const chartData = useMemo(() => {
    if (systemMode === 'live') {
      return visibleData.filter(pt => pt.id <= currentIndex);
    }
    return visibleData;
  }, [visibleData, systemMode, currentIndex]);

  // Auto-scaling Y-Axis domain & clean multiples-of-5 integer ticks
  const yScale = useMemo(() => {
    const NICE_STEPS = [5, 10, 15, 20, 25, 30, 40, 50, 100];

    let rawMin = algorithm.minVal;
    let rawMax = algorithm.maxVal;

    if (chartData.length > 0) {
      const values = chartData.map(pt => pt.algorithms[algorithm.id]?.value ?? 0);
      const dataMin = Math.min(...values);
      const dataMax = Math.max(...values);
      const span = Math.max(dataMax - dataMin, 1);
      const pad = span * 0.06;

      rawMin = algorithm.minVal >= 0 && dataMin < 10
        ? 0
        : Math.max(algorithm.minVal, dataMin - pad);
      rawMax = Math.min(algorithm.maxVal, dataMax + pad);
    }

    let chosenStep = 5;
    let niceMin = 0;
    let niceMax = 10;

    for (const step of NICE_STEPS) {
      let cMin = Math.floor(rawMin / step) * step;
      if (algorithm.minVal >= 0 && cMin < 0) cMin = 0;
      let cMax = Math.ceil(rawMax / step) * step;

      if (cMax <= cMin) {
        cMax = cMin + step * 2;
      } else if ((cMax - cMin) / step === 1) {
        if (cMax + step <= algorithm.maxVal) {
          cMax += step;
        } else if (cMin - step >= algorithm.minVal) {
          cMin -= step;
        } else {
          cMax += step;
        }
      }

      const intervals = Math.round((cMax - cMin) / step);
      if (intervals <= 4) {
        chosenStep = step;
        niceMin = cMin;
        niceMax = cMax;
        break;
      }
    }

    const ticks: number[] = [];
    for (let v = niceMin; v <= niceMax + chosenStep * 0.1; v += chosenStep) {
      ticks.push(Math.round(v));
    }

    return {
      min: niceMin,
      max: niceMax,
      ticks
    };
  }, [chartData, algorithm.id, algorithm.minVal, algorithm.maxVal]);

  const yDomain = yScale;

  // Chart Dimensions
  const isTurbulence = Boolean(
    algorithm.category === 'turbulence' ||
    algorithm.type === 'turbulence' ||
    ['ELLROD2', 'MOS', 'HTG', 'P_INDEX', 'ellrod2', 'mos', 'htg', 'p_index'].includes(algorithm.id)
  );
  const chartWidth = 500;
  const chartHeight = 140;
  const paddingLeft = 35;
  const paddingRight = isTurbulence ? 25 : 110;
  const paddingTop = 15;
  const paddingBottom = 20;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  // Projection utilities
  const getX = (idx: number) => {
    if (chartData.length <= 1) return paddingLeft;
    const fraction = idx / (chartData.length - 1);
    return paddingLeft + fraction * innerWidth;
  };

  const getY = (val: number) => {
    const range = yDomain.max - yDomain.min || 1;
    const fraction = (val - yDomain.min) / range;
    return chartHeight - paddingBottom - fraction * innerHeight;
  };

  // Convert the index in chartData to coordinate X
  const getXCoordFromDataIndex = (ptId: number) => {
    const idx = chartData.findIndex(pt => pt.id === ptId);
    if (idx === -1) return null;
    return getX(idx);
  };

  // Find nearest data point from client X in SVG
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    
    // Scale clientX to SVG width coords
    const svgX = (clientX / rect.width) * chartWidth;
    
    // Map svgX back to closest data point index
    const plotX = svgX - paddingLeft;
    const fraction = plotX / innerWidth;
    const approxIdx = Math.round(fraction * (chartData.length - 1));
    const finalIdx = Math.max(0, Math.min(chartData.length - 1, approxIdx));
    
    if (chartData[finalIdx]) {
      onHoverIndex(chartData[finalIdx].id);
    }
  };

  const handleMouseLeave = () => {
    onHoverIndex(null);
  };

  const handleChartClick = (ptId: number) => {
    onSelectIndex(ptId);
  };

  // Calculations for Maximum Flyable Distance projection
  const latestVisiblePt = useMemo(() => {
    // Find latest data point in visible data that is <= current timestamp or simply currentAircraft
    const roundedIndex = Math.round(currentIndex);
    return chartData.find(pt => pt.id === roundedIndex) || chartData[chartData.length - 1];
  }, [chartData, currentIndex]);

  const maxDistanceLineData = useMemo(() => {
    if (isTurbulence || !latestVisiblePt) return null;
    
    const yVal = latestVisiblePt.algorithms[algorithm.id]?.value ?? 0;
    const startX = getXCoordFromDataIndex(latestVisiblePt.id);
    if (startX === null) return null;

    // Convert Max Flyable Distance (km) to Minutes of Flight
    // Speed is in km/h. Distance is in km.
    // Time = Distance / Speed hours = (Distance / Speed) * 60 minutes.
    const speed = latestVisiblePt.speed || 800;
    const effectiveDistance = Math.min(latestVisiblePt.maxDistance, maxDistanceLimit);
    const flightTimeMinutes = (effectiveDistance / speed) * 60;
    
    // Dynamically compute the resolution step (in seconds) of the flight data points
    const stepSeconds = (() => {
      if (chartData.length < 2) return 60;
      const t0 = chartData[0].timestamp;
      const t1 = chartData[1].timestamp;
      const diff = Math.round((t1 - t0) / 1000);
      return diff > 0 ? diff : 60;
    })();

    // Map this flight time forward to X-axis
    // Find how many pixels the flight duration represents based on the data resolution
    const flightTimeSteps = (flightTimeMinutes * 60) / stepSeconds;
    const chartSteps = chartData.length || 1;
    const lineLengthPx = (flightTimeSteps / chartSteps) * innerWidth;

    const endX = Math.min(chartWidth - 12, startX + lineLengthPx);

    return {
      startX,
      endX,
      y: getY(yVal),
      val: yVal,
      distance: latestVisiblePt.maxDistance,
      duration: flightTimeMinutes,
      capped: latestVisiblePt.maxDistance >= maxDistanceLimit
    };
  }, [isTurbulence, latestVisiblePt, chartData, algorithm.id, yDomain, maxDistanceLimit]);

  // SVG Paths
  const linePathD = useMemo(() => {
    if (chartData.length === 0) return '';
    return chartData.map((pt, idx) => {
      const val = pt.algorithms[algorithm.id]?.value ?? 0;
      return `${idx === 0 ? 'M' : 'L'} ${getX(idx)} ${getY(val)}`;
    }).join(' ');
  }, [chartData, algorithm.id, yDomain]);

  // Export functions
  const exportToCSV = () => {
    const headers = isTurbulence
      ? ['航迹点ID', '时刻', '经度', '纬度', '高度(m)', '航速(km/h)', `${algorithm.name}输出值`, '颠簸风险等级']
      : ['航迹点ID', '时刻', '经度', '纬度', '高度(m)', '航速(km/h)', `${algorithm.name}输出值`, '积冰风险等级', '最大可航行距离(km)'];
    const rows = visibleData.map(pt => {
      const output = pt.algorithms[algorithm.id];
      const baseRow = [
        pt.id,
        pt.time,
        pt.longitude,
        pt.latitude,
        pt.altitude,
        pt.speed,
        output?.value ?? 0,
        output?.level ?? 'None'
      ];
      if (!isTurbulence) {
        baseRow.push(pt.maxDistance);
      }
      return baseRow;
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `FlightIcing_${algorithm.id}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToSVGImage = () => {
    const svgElement = document.getElementById(`svg-chart-${algorithm.id}`);
    if (!svgElement) return;

    // We can make a taller canvas to fit:
    // - Title at the top (y: 20px)
    // - The SVG chart itself (y: 35px)
    // - Legends at the bottom (y: 185px)
    const extraTop = 30;
    const extraBottom = 30;
    const canvasWidth = chartWidth;
    const canvasHeight = chartHeight + extraTop + extraBottom;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = window.URL.createObjectURL(blob);
    
    const image = document.createElement('img');
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth * 2; // high resolution scale
      canvas.height = canvasHeight * 2;
      const context = canvas.getContext('2d');
      if (context) {
        context.scale(2, 2);
        
        // Background
        context.fillStyle = '#09090b'; // dark bg
        context.fillRect(0, 0, canvasWidth, canvasHeight);
        
        // Draw the Title (Algorithm Name) at the top
        context.fillStyle = '#E0E0E0';
        context.font = 'bold 12px "Inter", "Helvetica Neue", sans-serif';
        context.fillText(algorithm.name.toUpperCase(), 12, 18);
        
        // Draw the SVG chart in the middle
        context.drawImage(image, 0, extraTop);
        
        // Draw the Legends at the bottom
        let startX = 12;
        const legendY = canvasHeight - 12;
        context.font = '10px "Inter", "Helvetica Neue", monospace';
        
        // Helper to draw a circle for color indicators
        const drawCircle = (color: string, text: string) => {
          context.fillStyle = color;
          context.beginPath();
          context.arc(startX + 4, legendY - 3, 3, 0, 2 * Math.PI);
          context.fill();
          
          context.fillStyle = 'rgba(255, 255, 255, 0.4)';
          context.fillText(text, startX + 12, legendY);
          startX += context.measureText(text).width + 24;
        };
        
        const labelNone = (algorithm.levelLabels?.none || '无风险').replace('积冰', '');
        const labelLight = (algorithm.levelLabels?.light || '轻度').replace('积冰', '');
        const labelModerate = (algorithm.levelLabels?.moderate || '中度').replace('积冰', '');
        const labelSevere = (algorithm.levelLabels?.severe || '重度').replace('积冰', '');

        drawCircle(colorNone, labelNone);
        drawCircle(colorLight, labelLight);
        drawCircle(colorModerate, labelModerate);
        drawCircle(colorSevere, labelSevere);
        
        // Draw "最大航行距离" legend
        if (maxDistanceLineData) {
          context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
          context.lineWidth = 1;
          context.beginPath();
          // Draw a small vertical line (前一竖) and arrow
          context.moveTo(startX, legendY - 8);
          context.lineTo(startX, legendY);
          context.moveTo(startX, legendY - 4);
          context.lineTo(startX + 8, legendY - 4);
          context.lineTo(startX + 5, legendY - 7);
          context.moveTo(startX + 8, legendY - 4);
          context.lineTo(startX + 5, legendY - 1);
          context.stroke();
          
          context.fillStyle = 'rgba(255, 255, 255, 0.6)';
          context.fillText(`最大航行距离 ${maxDistanceLineData.capped ? `(≥${maxDistanceLimit}km)` : ''}`, startX + 14, legendY);
        }
        
        const pngURL = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngURL;
        downloadLink.download = `IcingChart_${algorithm.id}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      window.URL.revokeObjectURL(blobURL);
    };
    image.src = blobURL;
  };

  return (
    <div
      ref={containerRef}
      className={`border rounded-sm p-3.5 space-y-3 relative flex flex-col h-fit transition-all duration-200 ${
        isLight
          ? (isMappedOnMap ? 'bg-[#FAFAF8] border-[#0284C7] shadow-md ring-2 ring-[#0284C7]/20' : 'bg-[#FAFAF8] border-[#DFDDD8] shadow-xs')
          : (isMappedOnMap ? 'bg-[#121214] border-white shadow-lg' : 'bg-[#121214] border-[#2A2A2C]')
      }`}
      id={`product-card-${algorithm.id}`}
    >
      {/* Header info */}
      <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-[#E4E3DE]' : 'border-[#2A2A2C]'}`}>
        <h3 className={`text-[16px] font-sans font-bold flex items-center gap-1.5 uppercase ${isLight ? 'text-[#18181B]' : 'text-[#E0E0E0]'}`}>
          {algorithm.name}
        </h3>

        {/* Header actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartMode(prev => prev === 'line' ? 'scatter' : 'line')}
            className={`p-1 border rounded-sm transition-colors text-[12px] flex items-center gap-1 cursor-pointer ${
              isLight ? 'text-[#52525B] hover:text-[#18181B] hover:bg-[#ECEBE7] border-[#DFDDD8]' : 'text-white/50 hover:text-white hover:bg-white/10 border-[#2A2A2C]'
            }`}
            title="切换 折线图/散点图"
          >
            {chartMode === 'line' ? <LineChart size={12} /> : <BarChart2 size={12} />}
            <span>{chartMode === 'line' ? '折线图' : '散点图'}</span>
          </button>
          
          <button
            onClick={() => setShowConfig(true)}
            className={`p-1 border rounded-sm transition-colors text-[12px] flex items-center gap-1 cursor-pointer ${
              isLight ? 'text-[#52525B] hover:text-[#18181B] hover:bg-[#ECEBE7] border-[#DFDDD8]' : 'text-white/50 hover:text-white hover:bg-white/10 border-[#2A2A2C]'
            }`}
            title="配置显示阈值与颜色"
          >
            <Sliders size={12} />
            <span>配置参数</span>
          </button>

          <button
            onClick={onMapToTrajectory}
            className={`p-1 border text-[12px] flex items-center gap-1 rounded-sm transition-colors cursor-pointer ${
              isMappedOnMap 
              ? (isLight ? 'bg-[#18181B] border-[#18181B] text-[#FAFAF8] font-bold shadow-xs' : 'bg-white border-white text-black font-bold shadow-sm')
              : (isLight ? 'text-[#52525B] border-[#DFDDD8] hover:text-[#18181B] hover:bg-[#ECEBE7]' : 'text-white/50 border-[#2A2A2C] hover:text-white hover:bg-white/10')
            }`}
            title="将该算法渲染到主飞行地图轨迹"
          >
            <MapPin size={12} />
            <span>地图映射</span>
          </button>
        </div>
      </div>

      {/* 积冰监测配置界面（阈值与颜色配置） */}
      <IcingConfigModal
        isOpen={showConfig}
        onClose={() => setShowConfig(false)}
        algorithm={algorithm}
        config={config}
        maxDistanceLimit={maxDistanceLimit}
        onSave={(newCfg, newMaxDist) => {
          setMaxDistanceLimit(newMaxDist);
          onChangeConfig(newCfg);
        }}
        onReset={handleResetConfig}
      />

      {/* Embedded Chart Body */}
      <div className={`relative border rounded-sm transition-colors duration-200 ${
        isLight ? 'bg-[#F2F1EE] border-[#E4E3DE]' : 'bg-[#0A0A0B] border-[#2A2A2C]'
      }`}>
        <svg
          id={`svg-chart-${algorithm.id}`}
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="overflow-visible select-none"
        >
          {/* Chart Background Fills for Threshold Levels (Removed for transparent background) */}

          {/* Gridlines: strictly 1-to-1 with Y-axis labels, unified neutral color */}
          <g>
            {yScale.ticks.map((val, i) => {
              const y = getY(val);
              return (
                <g key={`y-grid-${i}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke={isLight ? "#D4D3CE" : "#27272A"}
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={paddingLeft - 6}
                    y={y + 4}
                    textAnchor="end"
                    fill={isLight ? "#71717A" : "rgba(255, 255, 255, 0.45)"}
                    fontSize={11}
                    fontFamily="monospace"
                  >
                    {Math.round(val)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Vertical Separator & Range Projection Zone Shading */}
          {!isTurbulence && maxDistanceLineData && (
            <g>
              <line
                x1={chartWidth - paddingRight}
                y1={paddingTop}
                x2={chartWidth - paddingRight}
                y2={chartHeight - paddingBottom}
                stroke={isLight ? "rgba(100, 116, 139, 0.3)" : "rgba(255, 255, 255, 0.15)"}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              {/* Shaded background for redundant projection zone */}
              <rect
                x={chartWidth - paddingRight}
                y={paddingTop}
                width={paddingRight}
                height={innerHeight}
                fill={isLight ? "rgba(0, 0, 0, 0.03)" : "rgba(255, 255, 255, 0.02)"}
                pointerEvents="none"
              />
            </g>
          )}

          {/* Chart Core Lines / Dots */}
          {chartMode === 'line' ? (
            <g>
              {chartData.map((pt, idx) => {
                if (idx === 0) return null;

                const prevPt = chartData[idx - 1];
                const prevVal = prevPt.algorithms[algorithm.id]?.value ?? 0;
                const val = pt.algorithms[algorithm.id]?.value ?? 0;
                
                const segmentVal = Math.max(prevVal, val);
                const { color } = getPointColorAndLabel(segmentVal);

                return (
                  <line
                    key={`line-seg-${pt.id}`}
                    x1={getX(idx - 1)}
                    y1={getY(prevVal)}
                    x2={getX(idx)}
                    y2={getY(val)}
                    stroke={color}
                    strokeWidth={1.5}
                    strokeLinecap="round"
                  />
                );
              })}
            </g>
          ) : (
            <g>
              {chartData.map((pt, idx) => {
                const val = pt.algorithms[algorithm.id]?.value ?? 0;
                const { color } = getPointColorAndLabel(val);

                return (
                  <circle
                    key={`dot-${pt.id}`}
                    cx={getX(idx)}
                    cy={getY(val)}
                    r={2.5}
                    fill={color}
                    opacity={0.8}
                  />
                );
              })}
            </g>
          )}

          {/* Synchronized Vertical Hover Line & Interactive Overlay */}
          {hoveredIndex !== null && (
            <g>
              {(() => {
                const xCoord = getXCoordFromDataIndex(hoveredIndex);
                if (xCoord === null) return null;
                return (
                  <line
                    x1={xCoord}
                    y1={paddingTop}
                    x2={xCoord}
                    y2={chartHeight - paddingBottom}
                    stroke={isLight ? "#2563EB" : "#ffffff"}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                  />
                );
              })()}
            </g>
          )}

          {/* Timeline current point marker */}
          {(() => {
            const roundedIndex = Math.round(currentIndex);
            const xCoord = getXCoordFromDataIndex(roundedIndex);
            const pt = chartData.find(p => p.id === roundedIndex);
            if (xCoord === null || !pt) return null;
            const val = pt.algorithms[algorithm.id]?.value ?? 0;
            return (
              <g>
                {/* Vertical slider sync bar */}
                <line
                  x1={xCoord}
                  y1={paddingTop}
                  x2={xCoord}
                  y2={chartHeight - paddingBottom}
                  stroke={isLight ? "#0284C7" : "#ffffff"}
                  strokeWidth={1.5}
                  opacity={0.4}
                />
                <circle
                  cx={xCoord}
                  cy={getY(val)}
                  r={5}
                  fill={isLight ? "#0284C7" : "#ffffff"}
                  stroke={isLight ? "#ffffff" : "#000000"}
                  strokeWidth={1.5}
                />
              </g>
            );
          })()}

          {/* Maximum Flyable Distance projection Segment in Chart */}
          {!isTurbulence && maxDistanceLineData && (
            <g>
              {/* Horizontal projection line (solid line) */}
              <line
                x1={maxDistanceLineData.startX}
                y1={maxDistanceLineData.y}
                x2={maxDistanceLineData.endX}
                y2={maxDistanceLineData.y}
                stroke={isLight ? "#475569" : "#ffffff"}
                strokeWidth={1.5}
              />
              
              {/* Arrow head pointing right, ending at endX */}
              <polygon
                points={`${maxDistanceLineData.endX - 6},${maxDistanceLineData.y - 4} ${maxDistanceLineData.endX},${maxDistanceLineData.y} ${maxDistanceLineData.endX - 6},${maxDistanceLineData.y + 4}`}
                fill={isLight ? "#475569" : "#ffffff"}
              />

              {/* Vertical line/cap at the end point */}
              <line
                x1={maxDistanceLineData.endX}
                y1={maxDistanceLineData.y - 6}
                x2={maxDistanceLineData.endX}
                y2={maxDistanceLineData.y + 6}
                stroke={isLight ? "#475569" : "#ffffff"}
                strokeWidth={1.5}
              />

              {/* Text Tag placed in between start and end point */}
              {(() => {
                const midX = (maxDistanceLineData.startX + maxDistanceLineData.endX) / 2;
                const tagWidth = 50;
                const tagHeight = 15;
                return (
                  <g>
                    <rect
                      x={midX - tagWidth / 2}
                      y={maxDistanceLineData.y - 18}
                      width={tagWidth}
                      height={tagHeight}
                      fill={isLight ? "#ffffff" : "#000000"}
                      stroke={isLight ? "#CBD5E1" : "#2A2A2C"}
                      strokeWidth={0.5}
                      rx={1.5}
                      opacity={0.9}
                    />
                    <text
                      x={midX}
                      y={maxDistanceLineData.y - 6}
                      fill={isLight ? "#1E293B" : "#ffffff"}
                      fontSize={10}
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {maxDistanceLineData.distance >= 100 ? "≥100km" : `${maxDistanceLineData.distance}km`}
                    </text>
                  </g>
                );
              })()}
            </g>
          )}

          {/* Timeline labels (X Axis representation) */}
          <g>
            {chartData.map((pt, idx) => {
              // Draw only 4 or 5 labels along the x axis
              const divisor = Math.ceil(chartData.length / 5);
              if (idx % divisor === 0 || idx === chartData.length - 1) {
                return (
                  <text
                    key={`x-lbl-${idx}`}
                    x={getX(idx)}
                    y={chartHeight - 4}
                    textAnchor="middle"
                    fill={isLight ? "rgba(100, 116, 139, 0.8)" : "rgba(255, 255, 255, 0.3)"}
                    fontSize={12}
                    fontFamily="monospace"
                  >
                    {pt.time.substring(0, 5)}
                  </text>
                );
              }
              return null;
            })}
          </g>
        </svg>

        {/* Hover detail box */}
        {hoveredIndex !== null && (() => {
          const hoveredPt = chartData.find(pt => pt.id === hoveredIndex);
          if (!hoveredPt) return null;
          const output = hoveredPt.algorithms[algorithm.id];
          if (!output) return null;

          const { color } = getPointColorAndLabel(output.value);
          const isLeftHalf = chartData.findIndex(p => p.id === hoveredIndex) < chartData.length / 2;

          return (
            <div
              className={`absolute top-2 rounded-sm px-2 py-1 text-[12px] font-mono pointer-events-none z-10 border leading-tight ${
                isLight ? 'bg-[#FAFAF8]/95 border-[#D5D3CE] text-[#18181B] shadow-md' : 'bg-[#1A1A1C]/95 border-[#2A2A2C] text-[#E0E0E0] shadow-lg'
              }`}
              style={{
                left: isLeftHalf ? 'auto' : '45px',
                right: isLeftHalf ? '20px' : 'auto'
              }}
            >
              <div className={isLight ? 'text-[#52525B]' : 'text-white/60'}>{hoveredPt.time}</div>
              <div className="font-bold mt-0.5" style={{ color }}>
                {output.value}{algorithm.unit ? ` ${algorithm.unit}` : ''}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Footer controls: Legend and Export */}
      <div className="flex items-end justify-between text-[12px] font-mono pt-1">
        {/* Dynamic Legend */}
        <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${isLight ? 'text-[#52525B]' : 'text-white/40'}`}>
          {config.levels && config.levels.length > 0 ? (
            config.levels.map((lvl) => (
              <div key={lvl.id} className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: lvl.color }}></span>
                <span>{lvl.name.replace('积冰', '').replace('颠簸', '') || '无'}</span>
              </div>
            ))
          ) : (thSevere > 0 || thModerate > 0 || thLight > 0) ? (
            <>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorNone }}></span>
                <span>{(algorithm.levelLabels?.none || '正常').replace('积冰', '').replace('颠簸', '') || '无'}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorLight }}></span>
                <span>{(algorithm.levelLabels?.light || '轻度').replace('积冰', '').replace('颠簸', '')}</span>
              </div>
              {algorithm.defaultThresholds.lightModerate !== undefined && (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorLightModerate }}></span>
                  <span>{(algorithm.levelLabels?.lightModerate || '轻-中度').replace('积冰', '').replace('颠簸', '')}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorModerate }}></span>
                <span>{(algorithm.levelLabels?.moderate || '中度').replace('积冰', '').replace('颠簸', '')}</span>
              </div>
              {algorithm.id !== 'temp_frost' && (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorSevere }}></span>
                  <span>{(algorithm.levelLabels?.severe || '重度').replace('积冰', '').replace('颠簸', '')}</span>
                </div>
              )}
            </>
          ) : isTurbulence ? (
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isLight ? '#0284C7' : '#00E5FF' }}></span>
              <span>无</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 opacity-80">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isLight ? '#0284C7' : '#00E5FF' }}></span>
              <span>默认阈值: 暂无（可点击「配置参数」设定）</span>
            </div>
          )}
          {!isTurbulence && maxDistanceLineData && (
            <div className={`flex items-center gap-1.5 font-bold border-l pl-2 ${
              isLight ? 'text-[#3F3F46] border-[#D5D3CE]' : 'text-white/60 border-[#2A2A2C]'
            }`}>
              <svg className={`w-3.5 h-2.5 inline-block ${isLight ? 'text-[#3F3F46]' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 14 10" strokeWidth="1.5">
                <path d="M1 1 v8 M1 5 h10 M7 2 l4 3 l-4 3" />
              </svg>
              <span>最大航行距离 {maxDistanceLineData.capped ? `(≥${maxDistanceLimit}km)` : ''}</span>
            </div>
          )}
        </div>

        {/* Export Dropdown Menu */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowExportMenu(prev => !prev)}
            className={`px-2 py-0.5 border rounded-sm transition-colors cursor-pointer flex items-center gap-1 text-[12px] ${
              isLight
                ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#3F3F46] hover:text-[#18181B] hover:bg-[#E2E0DB]'
                : 'bg-[#1A1A1C] border-[#2A2A2C] hover:text-white text-white/50 hover:bg-white/10'
            }`}
            title="导出数据或图表"
          >
            <Download size={11} />
            <span>导出</span>
            <ChevronDown size={10} className={`opacity-60 transition-transform duration-200 ${showExportMenu ? 'rotate-180' : ''}`} />
          </button>

          {showExportMenu && (
            <>
              {/* Invisible click-away backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowExportMenu(false)}
              />
              <div className={`absolute right-0 bottom-full mb-1.5 w-32 rounded-sm shadow-xl z-20 overflow-hidden py-1 border ${
                isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#3F3F46]' : 'bg-[#1A1A1C] border-[#2C2C30] text-white/70'
              }`}>
                <button
                  onClick={() => {
                    exportToCSV();
                    setShowExportMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer text-[12px] ${
                    isLight ? 'hover:bg-[#ECEBE7] hover:text-[#18181B] text-[#3F3F46]' : 'hover:bg-white/5 hover:text-white text-white/70'
                  }`}
                >
                  <Download size={10} />
                  <span>导出 CSV 数据</span>
                </button>
                <button
                  onClick={() => {
                    exportToSVGImage();
                    setShowExportMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer text-[12px] ${
                    isLight ? 'hover:bg-[#ECEBE7] hover:text-[#18181B] text-[#3F3F46]' : 'hover:bg-white/5 hover:text-white text-white/70'
                  }`}
                >
                  <Eye size={10} />
                  <span>导出分析图表</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
