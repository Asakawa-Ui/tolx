import React, { useState, useMemo, useRef } from 'react';
import { FlightDataPoint, IcingAlgorithmDef, ProductConfig } from '../types';
import { LineChart, BarChart2, Check, Download, MapPin, Eye, Sliders, Layers, RefreshCw, ChevronDown } from 'lucide-react';

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
  const [chartMode, setChartMode] = useState<'line' | 'scatter'>('scatter');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [maxDistanceLimit, setMaxDistanceLimit] = useState<number>(100);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);

  // Configuration forms
  const [thLight, setThLight] = useState<number>(config.thresholds.light);
  const [thModerate, setThModerate] = useState<number>(config.thresholds.moderate);
  const [thSevere, setThSevere] = useState<number>(config.thresholds.severe);
  const [colorNone, setColorNone] = useState<string>(config.colors.none);
  const [colorLight, setColorLight] = useState<string>(config.colors.light);
  const [colorModerate, setColorModerate] = useState<string>(config.colors.moderate);
  const [colorSevere, setColorSevere] = useState<string>(config.colors.severe);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync state with updated config prop (e.g. parent reset)
  React.useEffect(() => {
    setThLight(config.thresholds.light);
    setThModerate(config.thresholds.moderate);
    setThSevere(config.thresholds.severe);
    setColorNone(config.colors.none);
    setColorLight(config.colors.light);
    setColorModerate(config.colors.moderate);
    setColorSevere(config.colors.severe);
  }, [
    config.thresholds.light,
    config.thresholds.moderate,
    config.thresholds.severe,
    config.colors.none,
    config.colors.light,
    config.colors.moderate,
    config.colors.severe
  ]);

  // Apply configs
  const handleSaveConfig = () => {
    onChangeConfig({
      algorithmId: algorithm.id,
      thresholds: {
        light: Number(thLight),
        moderate: Number(thModerate),
        severe: Number(thSevere)
      },
      colors: {
        none: colorNone,
        light: colorLight,
        moderate: colorModerate,
        severe: colorSevere
      }
    });
    setShowConfig(false);
  };

  const handleResetConfig = () => {
    setThLight(algorithm.defaultThresholds.light);
    setThModerate(algorithm.defaultThresholds.moderate);
    setThSevere(algorithm.defaultThresholds.severe);
    setColorNone('#6B7280'); // default light-gray
    setColorLight('#0A84FF'); // blue
    setColorModerate('#FF9F0A'); // orange
    setColorSevere('#FF3B30'); // red
    onChangeConfig({
      algorithmId: algorithm.id,
      thresholds: algorithm.defaultThresholds,
      colors: {
        none: '#6B7280',
        light: '#0A84FF',
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

  // Auto-scaling Y-Axis domain based on the visible data range
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return { min: algorithm.minVal, max: algorithm.maxVal };
    const values = chartData.map(pt => pt.algorithms[algorithm.id]?.value ?? 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    
    // Give some padding
    const padding = (maxVal - minVal) * 0.1 || 1;
    const computedMin = Math.max(algorithm.minVal, minVal - padding);
    const computedMax = Math.min(algorithm.maxVal, maxVal + padding);
    return {
      min: Math.round(computedMin * 10) / 10,
      max: Math.round(computedMax * 10) / 10
    };
  }, [chartData, algorithm.id, algorithm.minVal, algorithm.maxVal]);

  // Chart Dimensions
  const chartWidth = 500;
  const chartHeight = 140;
  const paddingLeft = 35;
  const paddingRight = 110; // Increased to 110 to give redundant space on the right for maxDistance line projection
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
    if (!latestVisiblePt) return null;
    
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
  }, [latestVisiblePt, chartData, algorithm.id, yDomain, maxDistanceLimit]);

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
    const headers = ['航迹点ID', '时刻', '经度', '纬度', '高度(m)', '航速(km/h)', `${algorithm.name}输出值`, '积冰风险等级', '最大可航行距离(km)'];
    const rows = visibleData.map(pt => {
      const output = pt.algorithms[algorithm.id];
      return [
        pt.id,
        pt.time,
        pt.longitude,
        pt.latitude,
        pt.altitude,
        pt.speed,
        output?.value ?? 0,
        output?.level ?? 'None',
        pt.maxDistance
      ];
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
      className={`bg-[#121214] border ${isMappedOnMap ? 'border-white shadow-lg' : 'border-[#2A2A2C]'} rounded-sm p-3.5 space-y-3 relative flex flex-col transition-all`}
      id={`product-card-${algorithm.id}`}
    >
      {/* Header info */}
      <div className="flex items-center justify-between border-b border-[#2A2A2C] pb-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isMappedOnMap ? 'bg-[#34C759]' : 'bg-white/25 animate-pulse'}`}></div>
          <div>
            <h3 className="text-[16px] font-sans font-bold text-[#E0E0E0] flex items-center gap-1.5 uppercase">
              {algorithm.name}
            </h3>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setChartMode(prev => prev === 'line' ? 'scatter' : 'line')}
            className="p-1 text-white/50 hover:text-white hover:bg-white/10 border border-[#2A2A2C] rounded-sm transition-colors text-[12px] flex items-center gap-1 cursor-pointer"
            title="切换 折线图/散点图"
          >
            {chartMode === 'line' ? <LineChart size={12} /> : <BarChart2 size={12} />}
            <span>{chartMode === 'line' ? '折线图' : '散点图'}</span>
          </button>
          
          <button
            onClick={() => setShowConfig(true)}
            className="p-1 text-white/50 hover:text-white hover:bg-white/10 border border-[#2A2A2C] rounded-sm transition-colors text-[12px] flex items-center gap-1 cursor-pointer"
            title="配置显示阈值与颜色"
          >
            <Sliders size={12} />
            <span>配置参数</span>
          </button>

          <button
            onClick={onMapToTrajectory}
            className={`p-1 border text-[12px] flex items-center gap-1 rounded-sm transition-colors cursor-pointer ${
              isMappedOnMap 
              ? 'bg-white border-white text-black font-bold shadow-sm' 
              : 'text-white/50 border-[#2A2A2C] hover:text-white hover:bg-white/10'
            }`}
            title="将该算法渲染到主飞行地图轨迹"
          >
            <MapPin size={12} />
            <span>地图映射</span>
          </button>
        </div>
      </div>

      {/* Threshold and Config modal popup dialog */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-mono animate-fadeIn" onClick={() => setShowConfig(false)}>
          <div className="bg-[#121214] border border-[#2A2A2C] rounded-md p-5 w-full max-w-md space-y-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#2A2A2C] pb-3">
              <span className="text-white font-bold text-xs flex items-center gap-2">
                <Sliders size={14} className="text-white/60" />
                <span>⚙️ {algorithm.name} 阈值与颜色配置</span>
              </span>
              <button 
                onClick={() => setShowConfig(false)}
                className="text-white/40 hover:text-white transition-colors cursor-pointer text-base"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Threshold bounds */}
              <div className="space-y-3.5 border-r border-[#2A2A2C] pr-4">
                <div className="text-[12px] text-white/40 uppercase font-bold tracking-wider">分级阈值 {algorithm.unit ? `(${algorithm.unit})` : ''}</div>
                
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#FF9F0A] text-xs font-semibold">{algorithm.levelLabels?.light || '轻度'} ≥</span>
                  <input
                    type="number"
                    step={algorithm.maxVal <= 10 ? "0.1" : "1"}
                    value={thLight}
                    onChange={(e) => setThLight(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-[#0A0A0B] border border-[#2A2A2C] text-white rounded-sm px-1.5 py-0.5 text-center text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#FF9500] text-xs font-semibold">{algorithm.levelLabels?.moderate || '中度'} ≥</span>
                  <input
                    type="number"
                    step={algorithm.maxVal <= 10 ? "0.1" : "1"}
                    value={thModerate}
                    onChange={(e) => setThModerate(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-[#0A0A0B] border border-[#2A2A2C] text-white rounded-sm px-1.5 py-0.5 text-center text-xs"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#FF3B30] text-xs font-semibold">{algorithm.levelLabels?.severe || '重度'} ≥</span>
                  <input
                    type="number"
                    step={algorithm.maxVal <= 10 ? "0.1" : "1"}
                    value={thSevere}
                    onChange={(e) => setThSevere(parseFloat(e.target.value) || 0)}
                    className="w-16 bg-[#0A0A0B] border border-[#2A2A2C] text-white rounded-sm px-1.5 py-0.5 text-center text-xs"
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-3.5 pl-2">
                <div className="text-[12px] text-white/40 uppercase font-bold tracking-wider">雷达/轨迹颜色</div>
                
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white/40 text-xs">{algorithm.levelLabels?.none || '无风险'}</span>
                  <input
                    type="color"
                    value={colorNone}
                    onChange={(e) => setColorNone(e.target.value)}
                    className="w-8 h-5 bg-transparent border-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#FF9F0A] text-xs font-semibold">{algorithm.levelLabels?.light || '轻度积冰'}</span>
                  <input
                    type="color"
                    value={colorLight}
                    onChange={(e) => setColorLight(e.target.value)}
                    className="w-8 h-5 bg-transparent border-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#FF9500] text-xs font-semibold">{algorithm.levelLabels?.moderate || '中度积冰'}</span>
                  <input
                    type="color"
                    value={colorModerate}
                    onChange={(e) => setColorModerate(e.target.value)}
                    className="w-8 h-5 bg-transparent border-0 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#FF3B30] text-xs font-semibold">{algorithm.levelLabels?.severe || '重度积冰'}</span>
                  <input
                    type="color"
                    value={colorSevere}
                    onChange={(e) => setColorSevere(e.target.value)}
                    className="w-8 h-5 bg-transparent border-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-[#2A2A2C] pt-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 text-white/40 text-xs">
                <span>最大航程上限:</span>
                <input
                  type="number"
                  value={maxDistanceLimit}
                  onChange={(e) => setMaxDistanceLimit(Math.max(10, parseInt(e.target.value) || 100))}
                  className="w-12 bg-[#0A0A0B] border border-[#2A2A2C] text-white rounded-sm px-1 text-center"
                />
                <span>km</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleResetConfig}
                  className="px-2.5 py-1 bg-[#2A2A2C] text-white hover:bg-white/10 text-xs font-bold rounded-sm transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw size={11} />
                  <span>重置</span>
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="px-3 py-1 bg-white text-black text-xs font-bold rounded-sm hover:bg-white/90 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Check size={11} />
                  <span>保存并应用</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Chart Body */}
      <div className="relative bg-[#0A0A0B] border border-[#2A2A2C] rounded-sm">
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

          {/* Gridlines */}
          <g>
            {/* Horizontal lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
              const val = yDomain.min + f * (yDomain.max - yDomain.min);
              const y = getY(val);
              return (
                <g key={`y-grid-${i}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="#1A1A1C"
                    strokeWidth={0.5}
                    strokeDasharray="2 4"
                  />
                  <text
                    x={paddingLeft - 5}
                    y={y + 4}
                    textAnchor="end"
                    fill="rgba(255, 255, 255, 0.4)"
                    fontSize={12}
                    fontFamily="monospace"
                  >
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}
          </g>

          {/* Vertical Separator & Range Projection Zone Shading */}
          <g>
            <line
              x1={chartWidth - paddingRight}
              y1={paddingTop}
              x2={chartWidth - paddingRight}
              y2={chartHeight - paddingBottom}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            {/* Shaded background for redundant projection zone */}
            <rect
              x={chartWidth - paddingRight}
              y={paddingTop}
              width={paddingRight}
              height={innerHeight}
              fill="rgba(255, 255, 255, 0.02)"
              pointerEvents="none"
            />
          </g>

          {/* Chart Core Lines / Dots */}
          {chartMode === 'line' ? (
            <g>
              {chartData.map((pt, idx) => {
                if (idx === 0) return null;

                const prevPt = chartData[idx - 1];
                const prevVal = prevPt.algorithms[algorithm.id]?.value ?? 0;
                const val = pt.algorithms[algorithm.id]?.value ?? 0;
                
                const segmentVal = Math.max(prevVal, val);
                let color = colorNone;
                if (segmentVal >= thSevere) color = colorSevere;
                else if (segmentVal >= thModerate) color = colorModerate;
                else if (segmentVal >= thLight) color = colorLight;

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
                let color = colorNone;
                if (val >= thSevere) color = colorSevere;
                else if (val >= thModerate) color = colorModerate;
                else if (val >= thLight) color = colorLight;

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

          {/* Threshold marker indicators (Horizontal lines) */}
          <g opacity={0.4}>
            <line
              x1={paddingLeft}
              y1={getY(thSevere)}
              x2={chartWidth - paddingRight}
              y2={getY(thSevere)}
              stroke={colorSevere}
              strokeWidth={1}
              strokeDasharray="1 3"
            />
            <line
              x1={paddingLeft}
              y1={getY(thModerate)}
              x2={chartWidth - paddingRight}
              y2={getY(thModerate)}
              stroke={colorModerate}
              strokeWidth={1}
              strokeDasharray="1 3"
            />
            <line
              x1={paddingLeft}
              y1={getY(thLight)}
              x2={chartWidth - paddingRight}
              y2={getY(thLight)}
              stroke={colorLight}
              strokeWidth={1}
              strokeDasharray="1 3"
            />
          </g>

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
                    stroke="#ffffff"
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
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  opacity={0.4}
                />
                <circle
                  cx={xCoord}
                  cy={getY(val)}
                  r={5}
                  fill="#ffffff"
                  stroke="#000000"
                  strokeWidth={1.5}
                />
              </g>
            );
          })()}

          {/* Maximum Flyable Distance projection Segment in Chart */}
          {maxDistanceLineData && (
            <g>
              {/* Horizontal projection line (solid line) */}
              <line
                x1={maxDistanceLineData.startX}
                y1={maxDistanceLineData.y}
                x2={maxDistanceLineData.endX}
                y2={maxDistanceLineData.y}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              
              {/* Arrow head pointing right, ending at endX */}
              <polygon
                points={`${maxDistanceLineData.endX - 6},${maxDistanceLineData.y - 4} ${maxDistanceLineData.endX},${maxDistanceLineData.y} ${maxDistanceLineData.endX - 6},${maxDistanceLineData.y + 4}`}
                fill="#ffffff"
              />

              {/* Vertical line/cap at the end point */}
              <line
                x1={maxDistanceLineData.endX}
                y1={maxDistanceLineData.y - 6}
                x2={maxDistanceLineData.endX}
                y2={maxDistanceLineData.y + 6}
                stroke="#ffffff"
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
                      fill="#000000"
                      stroke="#2A2A2C"
                      strokeWidth={0.5}
                      rx={1.5}
                      opacity={0.85}
                    />
                    <text
                      x={midX}
                      y={maxDistanceLineData.y - 6}
                      fill="#ffffff"
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
                    fill="rgba(255, 255, 255, 0.3)"
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

          let color = colorNone;
          let label = algorithm.levelLabels?.none || '无风险';
          if (output.value >= thSevere) { color = colorSevere; label = algorithm.levelLabels?.severe || '重度积冰'; }
          else if (output.value >= thModerate) { color = colorModerate; label = algorithm.levelLabels?.moderate || '中度积冰'; }
          else if (output.value >= thLight) { color = colorLight; label = algorithm.levelLabels?.light || '轻度积冰'; }

          const isLeftHalf = chartData.findIndex(p => p.id === hoveredIndex) < chartData.length / 2;

          return (
            <div
              className="absolute top-2 bg-[#1A1A1C]/95 border border-[#2A2A2C] rounded-sm px-2 py-1 text-[12px] font-mono text-[#E0E0E0] pointer-events-none z-10 shadow-lg"
              style={{
                left: isLeftHalf ? 'auto' : '45px',
                right: isLeftHalf ? '20px' : 'auto'
              }}
            >
              <div className="text-white/40 font-bold mb-0.5">时刻: {hoveredPt.time}</div>
              <div className="flex gap-2">
                <span>数值: <strong className="text-white">{output.value} {algorithm.unit}</strong></span>
                <span>级别: <strong style={{ color }}>{label}</strong></span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Footer controls: Legend and Export */}
      <div className="flex items-end justify-between text-[12px] font-mono pt-1">
        {/* Dynamic Legend */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-white/40">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorNone }}></span>
            <span>{(algorithm.levelLabels?.none || '无风险').replace('积冰', '')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorLight }}></span>
            <span>{(algorithm.levelLabels?.light || '轻度').replace('积冰', '')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorModerate }}></span>
            <span>{(algorithm.levelLabels?.moderate || '中度').replace('积冰', '')}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorSevere }}></span>
            <span>{(algorithm.levelLabels?.severe || '重度').replace('积冰', '')}</span>
          </div>
          {maxDistanceLineData && (
            <div className="flex items-center gap-1.5 text-white/60 font-bold border-l border-[#2A2A2C] pl-2">
              <svg className="w-3.5 h-2.5 inline-block text-white" fill="none" stroke="currentColor" viewBox="0 0 14 10" strokeWidth="1.5">
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
            className="px-2 py-0.5 bg-[#1A1A1C] border border-[#2A2A2C] hover:text-white text-white/50 hover:bg-white/10 rounded-sm transition-colors cursor-pointer flex items-center gap-1 text-[12px]"
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
              <div className="absolute right-0 bottom-full mb-1.5 w-32 bg-[#1A1A1C] border border-[#2C2C30] rounded-sm shadow-xl z-20 overflow-hidden py-1">
                <button
                  onClick={() => {
                    exportToCSV();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-white/5 hover:text-white text-white/70 transition-colors flex items-center gap-1.5 cursor-pointer text-[12px]"
                >
                  <Download size={10} />
                  <span>导出 CSV 数据</span>
                </button>
                <button
                  onClick={() => {
                    exportToSVGImage();
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-white/5 hover:text-white text-white/70 transition-colors flex items-center gap-1.5 cursor-pointer text-[12px]"
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
