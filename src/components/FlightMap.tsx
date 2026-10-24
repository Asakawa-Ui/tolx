import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FlightDataPoint, ProductConfig } from '../types';
import { WAYPOINTS, ALGORITHMS, evaluateIcingRisk } from '../data/mockData';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, HelpCircle, Activity, Clock, Play, Pause, ChevronRight } from 'lucide-react';
import { FlightSortie } from '../App';
import { useTheme } from '../ThemeContext';

interface FlightMapProps {
  flightData: FlightDataPoint[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  activeConfig: ProductConfig;
  mappedAlgorithmId: string;
  onSelectAlgorithm: (id: string) => void;
  systemMode: 'live' | 'history';
  selectedFlightId: string;
  onToggleMode: (mode: 'live' | 'history') => void;
  onSelectFlight: (id: string) => void;
  flights: FlightSortie[];
}

const getChineseWeekday = (dateStr: string) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()];
  }
  return '周内';
};

export default function FlightMap({
  flightData,
  currentIndex,
  onSelectIndex,
  activeConfig,
  mappedAlgorithmId,
  onSelectAlgorithm,
  systemMode,
  selectedFlightId,
  onToggleMode,
  onSelectFlight,
  flights
}: FlightMapProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const mapRef = useRef<SVGSVGElement | null>(null);
  
  // Navigation State
  const [zoom, setZoom] = useState<number>(1.1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: -10, y: -40 });

  // Live Auto-Advance State & Timer
  const [isLiveTicking, setIsLiveTicking] = useState<boolean>(false);
  const liveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (systemMode === 'live' && isLiveTicking) {
      liveTimerRef.current = setInterval(() => {
        onSelectIndex((currentIndex + 1) % flightData.length);
      }, 3000);
    } else {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    }
    return () => {
      if (liveTimerRef.current) clearInterval(liveTimerRef.current);
    };
  }, [systemMode, isLiveTicking, currentIndex, flightData.length, onSelectIndex]);

  // Turn off ticking if we leave live mode
  useEffect(() => {
    if (systemMode !== 'live') {
      setIsLiveTicking(false);
    }
  }, [systemMode]);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Interactive UI elements
  const [hoveredPoint, setHoveredPoint] = useState<FlightDataPoint | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedPoint, setSelectedPoint] = useState<FlightDataPoint | null>(null);

  // History filtering states & memos (date range selection)
  const [startDateFilter, setStartDateFilter] = useState<string | null>(() => {
    // Default to last 7 days from 2026-07-12 (July 12, 2026) -> 2026-07-06
    const end = new Date(2026, 6, 12);
    const start = new Date(2026, 6, 12);
    start.setDate(start.getDate() - 6); // 2026-07-06
    
    const formatDate = (date: Date) => {
      const y = date.getFullYear();
      const m = (date.getMonth() + 1).toString().padStart(2, '0');
      const dd = date.getDate().toString().padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    return formatDate(start);
  });
  const [endDateFilter, setEndDateFilter] = useState<string | null>(() => {
    const end = new Date(2026, 6, 12);
    const y = end.getFullYear();
    const m = (end.getMonth() + 1).toString().padStart(2, '0');
    const dd = end.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${dd}`;
  });
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);
  const [calendarYear, setCalendarYear] = useState<number>(2026);
  const [calendarMonth, setCalendarMonth] = useState<number>(6); // 0-indexed, 6 is July

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const calendarDays = useMemo(() => {
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const startOffset = new Date(calendarYear, calendarMonth, 1).getDay();
    const days: { day: number | null; dateString: string }[] = [];
    
    // Fill offset with nulls
    for (let i = 0; i < startOffset; i++) {
      days.push({ day: null, dateString: '' });
    }
    
    // Fill days
    for (let d = 1; d <= totalDays; d++) {
      const yearStr = calendarYear.toString();
      const monthStr = (calendarMonth + 1).toString().padStart(2, '0');
      const dayStr = d.toString().padStart(2, '0');
      const dateString = `${yearStr}-${monthStr}-${dayStr}`;
      days.push({ day: d, dateString });
    }
    
    return days;
  }, [calendarYear, calendarMonth]);

  const availableDates = useMemo(() => {
    const dates = flights.filter(f => !f.isLive).map(f => f.date);
    return Array.from(new Set(dates)).sort((a, b) => b.localeCompare(a));
  }, [flights]);

  const filteredHistoryFlights = useMemo(() => {
    const historyFlights = flights.filter(f => !f.isLive);
    if (!startDateFilter) return historyFlights;
    if (!endDateFilter) {
      return historyFlights.filter(f => f.date === startDateFilter);
    }
    return historyFlights.filter(f => f.date >= startDateFilter && f.date <= endDateFilter);
  }, [flights, startDateFilter, endDateFilter]);

  const sortedHistoryFlights = useMemo(() => {
    return [...filteredHistoryFlights].sort((a, b) => {
      // Date is identified from the first segment of the ID (e.g., YYYYMMDD in "20260711_B5102_01")
      const dateA = a.id.split('_')[0] || '';
      const dateB = b.id.split('_')[0] || '';
      const timeA = `${dateA}_${a.startHour.toString().padStart(2, '0')}_${a.startMin.toString().padStart(2, '0')}`;
      const timeB = `${dateB}_${b.startHour.toString().padStart(2, '0')}_${b.startMin.toString().padStart(2, '0')}`;
      return sortOrder === 'desc' 
        ? timeB.localeCompare(timeA)
        : timeA.localeCompare(timeB);
    });
  }, [filteredHistoryFlights, sortOrder]);

  const flightCountMap = useMemo(() => {
    const counts: Record<string, number> = {};
    flights.filter(f => !f.isLive).forEach(f => {
      counts[f.date] = (counts[f.date] || 0) + 1;
    });
    return counts;
  }, [flights]);

  // Sync selected flight when filter causes the active flight to be hidden
  useEffect(() => {
    if (systemMode === 'history') {
      const exists = sortedHistoryFlights.some(f => f.id === selectedFlightId);
      if (!exists && sortedHistoryFlights.length > 0) {
        onSelectFlight(sortedHistoryFlights[0].id);
      }
    }
  }, [startDateFilter, endDateFilter, systemMode, sortedHistoryFlights, selectedFlightId, onSelectFlight]);

  // Map Bounds for linear projection
  const minLat = 29.5;
  const maxLat = 41.5;
  const minLng = 114.5;
  const maxLng = 123.5;

  const mapWidth = 720;
  const mapHeight = 540;

  // Projection formula
  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / (maxLng - minLng)) * mapWidth;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * mapHeight;
    return { x, y };
  };

  const getRiskColor = (point: FlightDataPoint) => {
    const output = point.algorithms[mappedAlgorithmId];
    if (!output || !activeConfig) return activeConfig?.colors?.none || '#6B7280';
    
    const risk = evaluateIcingRisk(mappedAlgorithmId, output.value, activeConfig.thresholds);
    if (risk.level === 'Severe') return activeConfig.colors.severe;
    if (risk.level === 'Moderate') return activeConfig.colors.moderate;
    if (risk.level === 'LightModerate') return activeConfig.colors.lightModerate || '#22D3EE';
    if (risk.level === 'Light') return activeConfig.colors.light;
    return activeConfig.colors.none;
  };

  const getRiskLabel = (point: FlightDataPoint) => {
    const output = point.algorithms[mappedAlgorithmId];
    if (!output || !activeConfig) return '无积冰';
    const risk = evaluateIcingRisk(mappedAlgorithmId, output.value, activeConfig.thresholds);
    return risk.label;
  };

  // Zoom / Pan handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.5), 6);
    setZoom(newZoom);
  };

  const zoomIn = () => setZoom(prev => Math.min(prev * 1.2, 6));
  const zoomOut = () => setZoom(prev => Math.max(prev / 1.2, 0.5));
  const resetView = () => {
    setZoom(1.1);
    setPan({ x: -10, y: -40 });
    setSelectedPoint(null);
  };

  const centerOnAircraft = () => {
    if (flightData.length === 0) return;
    const current = flightData[Math.round(currentIndex)] || flightData[0];
    const proj = project(current.latitude, current.longitude);
    
    // Calculate pan coordinates to put aircraft in the center of the viewport
    setPan({
      x: mapWidth / 2 - proj.x * zoom,
      y: mapHeight / 2 - proj.y * zoom
    });
  };

  // Auto-center on aircraft on initial load
  useEffect(() => {
    if (flightData.length > 0) {
      centerOnAircraft();
    }
  }, []);

  // Stylized base map coastline path (simulated for offline reliability)
  const coastlinePoints = [
    { lat: 29.8, lng: 122.2 },
    { lat: 30.5, lng: 121.8 },
    { lat: 31.0, lng: 122.1 },
    { lat: 31.3, lng: 121.9 }, // Shanghai mouth
    { lat: 31.8, lng: 121.4 },
    { lat: 32.5, lng: 121.6 },
    { lat: 33.3, lng: 120.9 },
    { lat: 34.2, lng: 120.2 },
    { lat: 35.1, lng: 119.5 },
    { lat: 35.8, lng: 120.4 }, // Qingdao / Shandong S
    { lat: 36.8, lng: 122.7 }, // Shandong Peninsula East Tip
    { lat: 37.5, lng: 122.2 },
    { lat: 37.8, lng: 121.0 }, // Yantai
    { lat: 37.2, lng: 119.5 }, // Bohai S bay
    { lat: 38.0, lng: 118.2 }, // Yellow River Mouth
    { lat: 39.0, lng: 117.8 }, // Tianjin Bay
    { lat: 39.4, lng: 119.2 }, // Qinhuangdao
    { lat: 40.2, lng: 121.0 }, // Bohai NE
    { lat: 39.8, lng: 121.9 }, // Dalian Peninsula
    { lat: 38.7, lng: 121.2 }
  ];

  const coastlineD = coastlinePoints.map((pt, i) => {
    const proj = project(pt.lat, pt.lng);
    return `${i === 0 ? 'M' : 'L'} ${proj.x} ${proj.y}`;
  }).join(' ');

  const currentAircraft = flightData[Math.round(currentIndex)] || flightData[0];
  const aircraftPos = project(currentAircraft.latitude, currentAircraft.longitude);

  // Maximum Flyable distance calculations
  // Velocity is speed (km/h). Distance is maxDistance (km).
  // Direction of segment goes along aircraft's current heading.
  const headingRad = ((90 - currentAircraft.heading) * Math.PI) / 180;
  // Let's project a segment representing max distance.
  // Standard map span is ~9 degrees longitude (approx 800km at this latitude, so 1km ~ 1/1.1 px on map)
  const mapScaleDistance = 0.8; // scaling factor for pixels per km in map coordinates
  const segmentLength = currentAircraft.maxDistance * mapScaleDistance;
  const maxDistancePos = {
    x: aircraftPos.x + Math.cos(headingRad) * segmentLength,
    y: aircraftPos.y - Math.sin(headingRad) * segmentLength // minus because y increases downwards
  };

  return (
    <div 
      className={`flex flex-col border rounded-sm overflow-hidden select-none h-full transition-colors duration-200 ${
        isLight ? 'bg-[#FFFFFF] border-[#CBD5E1]' : 'bg-[#121214] border-[#2A2A2C]'
      }`} 
      id="flight-map-container"
    >
      {/* Map Action Bar / Window Subheader */}
      <div 
        className={`flex items-center justify-between px-3 py-1.5 border-b text-xs font-mono transition-colors duration-200 ${
          isLight ? 'bg-[#F8FAFC] border-[#CBD5E1] text-slate-700' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[12px] ${isLight ? 'text-slate-500' : 'text-white/40'}`}>当前积冰监测产品:</span>
          <select
            value={mappedAlgorithmId}
            onChange={(e) => onSelectAlgorithm(e.target.value)}
            className={`px-2 py-0.5 rounded-sm focus:outline-none cursor-pointer transition-colors text-xs font-sans outline-none border ${
              isLight ? 'text-slate-800 bg-white border-slate-300 hover:border-slate-400' : 'text-[#E0E0E0] bg-[#2A2A2C] border-white/15 hover:border-white/25'
            }`}
          >
            {ALGORITHMS.map(algo => (
              <option key={algo.id} value={algo.id} className={isLight ? 'bg-white text-slate-800' : 'bg-[#121214] text-[#E0E0E0]'}>
                {algo.name} {algo.paramSymbol ? `(${algo.paramSymbol})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={centerOnAircraft}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="定位飞机"
          >
            <Crosshair size={14} />
          </button>
          <button 
            onClick={zoomIn} 
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="放大"
          >
            <ZoomIn size={14} />
          </button>
          <button 
            onClick={zoomOut} 
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="缩小"
          >
            <ZoomOut size={14} />
          </button>
          <button 
            onClick={resetView} 
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="重置视图"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div 
        className={`relative flex-grow h-0 overflow-hidden cursor-grab active:cursor-grabbing transition-colors duration-200 ${
          isLight ? 'bg-[#F8FAFC]' : 'bg-[#0A0A0B]'
        }`}
      >
        <svg
          ref={mapRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${mapWidth} ${mapHeight}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="absolute inset-0"
        >
          {/* Graticule / Grid lines */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Grid Lines */}
            {Array.from({ length: 13 }).map((_, i) => {
              const lat = 29.5 + i;
              const start = project(lat, minLng);
              const end = project(lat, maxLng);
              return (
                <line
                  key={`grid-lat-${lat}`}
                  x1={0}
                  y1={start.y}
                  x2={mapWidth}
                  y2={start.y}
                  stroke={isLight ? "#E2E8F0" : "#121214"}
                  strokeWidth={0.5}
                />
              );
            })}
            {Array.from({ length: 10 }).map((_, i) => {
              const lng = 114.5 + i;
              const start = project(minLat, lng);
              return (
                <line
                  key={`grid-lng-${lng}`}
                  x1={start.x}
                  y1={0}
                  x2={start.x}
                  y2={mapHeight}
                  stroke={isLight ? "#E2E8F0" : "#121214"}
                  strokeWidth={0.5}
                />
              );
            })}

            {/* Latitude Labels */}
            {Array.from({ length: 7 }).map((_, i) => {
              const lat = 30 + i * 2;
              const pos = project(lat, minLng + 0.3);
              return (
                <text
                  key={`lbl-lat-${lat}`}
                  x={pos.x}
                  y={pos.y - 4}
                  fill={isLight ? "#64748B" : "#3f3f46"}
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {lat}°N
                </text>
              );
            })}

            {/* Longitude Labels */}
            {Array.from({ length: 5 }).map((_, i) => {
              const lng = 115 + i * 2;
              const pos = project(minLat + 0.3, lng);
              return (
                <text
                  key={`lbl-lng-${lng}`}
                  x={pos.x + 4}
                  y={pos.y}
                  fill={isLight ? "#64748B" : "#3f3f46"}
                  fontSize={8}
                  fontFamily="monospace"
                >
                  {lng}°E
                </text>
              );
            })}

            {/* Base Map Coastline */}
            <path
              d={coastlineD}
              fill="none"
              stroke={isLight ? "#94A3B8" : "#2A2A2C"}
              strokeWidth={1}
              strokeDasharray="4 2"
              className={isLight ? "opacity-70" : "opacity-60"}
            />

            {/* Simulated Regional Boundaries (FIR Control Areas) */}
            {/* Shanghai - Beijing Sector line */}
            <line
              x1={project(34.8, minLng).x}
              y1={project(34.8, minLng).y}
              x2={project(34.8, maxLng).x}
              y2={project(34.8, maxLng).y}
              stroke={isLight ? "#CBD5E1" : "#1D1D20"}
              strokeWidth={1}
              strokeDasharray="10 4 2 4"
            />
            <text
              x={project(35.0, minLng + 0.5).x}
              y={project(35.0, minLng + 0.5).y}
              fill={isLight ? "#64748B" : "#3A3A3D"}
              fontSize={8}
              fontFamily="monospace"
            >
              北京 / 上海管制区边界（BEIJING/SHANGHAI FIR）
            </text>

            {/* Airway routes (A593 / V1) */}
            <g opacity={isLight ? 0.5 : 0.3}>
              {WAYPOINTS.slice(0, -1).map((wp, idx) => {
                const nextWp = WAYPOINTS[idx + 1];
                const p1 = project(wp.lat, wp.lng);
                const p2 = project(nextWp.lat, nextWp.lng);
                return (
                  <g key={`aw-${idx}`}>
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke={isLight ? "#64748B" : "#a1a1aa"}
                      strokeWidth={0.75}
                      strokeDasharray="2 3"
                    />
                    <text
                      x={(p1.x + p2.x) / 2}
                      y={(p1.y + p2.y) / 2 - 5}
                      fill={isLight ? "#475569" : "#52525b"}
                      fontSize={12}
                      textAnchor="middle"
                      fontFamily="monospace"
                    >
                      A593
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Airway Waypoints (Airports & VORs) */}
            {WAYPOINTS.map((wp, idx) => {
              const pos = project(wp.lat, wp.lng);
              return (
                <g key={`wp-${idx}`} className={isLight ? "opacity-85" : "opacity-70"}>
                  <polygon
                    points={`${pos.x},${pos.y - 4} ${pos.x + 4},${pos.y + 3} ${pos.x - 4},${pos.y + 3}`}
                    fill="none"
                    stroke={isLight ? "#475569" : "#52525b"}
                    strokeWidth={1}
                  />
                  <text
                    x={pos.x + 6}
                    y={pos.y + 4}
                    fill={isLight ? "#334155" : "#71717a"}
                    fontSize={12}
                    fontFamily="monospace"
                  >
                    {wp.name}
                  </text>
                </g>
              );
            })}

            {/* Flight Trajectory Track (Icing Risk Color mapping) */}
            {flightData.slice(0, -1).map((pt, idx) => {
              // In live mode, do not render future path segments at all!
              if (systemMode === 'live' && pt.id >= Math.round(currentIndex)) return null;

              const nextPt = flightData[idx + 1];
              const p1 = project(pt.latitude, pt.longitude);
              const p2 = project(nextPt.latitude, nextPt.longitude);
              const segmentColor = getRiskColor(pt);
              const isCurrentSegment = idx === Math.round(currentIndex) - 1;

              return (
                <line
                  key={`track-${pt.id}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={segmentColor}
                  strokeWidth={pt.id <= Math.round(currentIndex) ? (isCurrentSegment ? 4 : 2.5) : 1}
                  strokeDasharray={pt.id <= Math.round(currentIndex) ? undefined : "3 3"}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                  opacity={pt.id <= Math.round(currentIndex) ? 1 : 0.25}
                />
              );
            })}

            {/* Interactive dots along the flight track */}
            {flightData.map((pt) => {
              // In live mode, do not render future path dots at all!
              if (systemMode === 'live' && pt.id > Math.round(currentIndex)) return null;

              // Hide the dot underneath the airplane icon to avoid visual redundancy
              if (pt.id === Math.round(currentIndex)) return null;

              const pos = project(pt.latitude, pt.longitude);
              const isPassed = pt.id <= Math.round(currentIndex);
              const isCurrent = pt.id === Math.round(currentIndex);
              const pointColor = getRiskColor(pt);

              // Compute downsampling step based on flight data resolution
              const isHighRes = flightData.length > 200;
              const baseMod = isHighRes ? 60 : 1;
              const zoomFactor = zoom > 1.5 ? 1 : 2;
              const renderMod = baseMod * zoomFactor;

              if (pt.id % renderMod !== 0 && !isCurrent) return null;

              return (
                <circle
                  key={`dot-${pt.id}`}
                  cx={pos.x}
                  cy={pos.y}
                  r={isCurrent ? 5 : 3}
                  fill={isCurrent ? '#ffffff' : pointColor}
                  stroke={isCurrent ? '#000000' : '#18181b'}
                  strokeWidth={1}
                  className="cursor-pointer transition-transform hover:scale-150"
                  opacity={isPassed ? 0.9 : 0.3}
                  onClick={() => onSelectIndex(pt.id)}
                  onMouseEnter={(e) => {
                    setHoveredPoint(pt);
                    setHoveredPos({ x: pos.x, y: pos.y });
                  }}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              );
            })}

            {/* Current Airplane Icon and Rotation Heading */}
            {flightData[Math.round(currentIndex)] && (
              <g transform={`translate(${aircraftPos.x}, ${aircraftPos.y})`}>
                {/* Rotating Aircraft symbol */}
                <g transform={`rotate(${currentAircraft.heading})`}>
                  {/* Custom minimalist aircraft shape - enlarged and thickened */}
                  <g transform="scale(1.25)">
                    <path
                      d="M 0 -8 L 1 -2 L 7 1 L 7 2 L 1 1 L 1 5 L 4 7 L 4 8 L 0 7 L -4 8 L -4 7 L -1 5 L -1 1 L -7 2 L -7 1 L -1 -2 Z"
                      fill={isLight ? "#0F172A" : "#ffffff"}
                      stroke={isLight ? "#0F172A" : "#ffffff"}
                      strokeWidth={1}
                      strokeLinejoin="round"
                    />
                  </g>
                </g>
              </g>
            )}

            {/* Maximum Flyable Segment Projection Line */}
            {flightData[Math.round(currentIndex)] && (() => {
              const displayDistance = currentAircraft.maxDistance >= 100 ? "≥100km" : `${currentAircraft.maxDistance} km`;
              
              const dirX = Math.cos(headingRad);
              const dirY = -Math.sin(headingRad);
              const perpX = Math.sin(headingRad);
              const perpY = Math.cos(headingRad);

              // Perpendicular crossbar (一竖) at the front/tip of the arrow
              const barX1 = maxDistancePos.x - perpX * 6;
              const barY1 = maxDistancePos.y - perpY * 6;
              const barX2 = maxDistancePos.x + perpX * 6;
              const barY2 = maxDistancePos.y + perpY * 6;

              // Arrowhead pointing along the flight heading
              const wing1X = maxDistancePos.x - dirX * 8 + perpX * 5;
              const wing1Y = maxDistancePos.y - dirY * 8 + perpY * 5;
              const wing2X = maxDistancePos.x - dirX * 8 - perpX * 5;
              const wing2Y = maxDistancePos.y - dirY * 8 - perpY * 5;

              // Label translation offset (offset slightly to the side and forward)
              const labelX = maxDistancePos.x + perpX * 12 - dirX * 12;
              const labelY = maxDistancePos.y + perpY * 12 - dirY * 12;

              return (
                <g>
                  {/* Solid Arrow Line along heading direction */}
                  <line
                    x1={aircraftPos.x}
                    y1={aircraftPos.y}
                    x2={maxDistancePos.x}
                    y2={maxDistancePos.y}
                    stroke={isLight ? "#0F172A" : "#ffffff"}
                    strokeWidth={1.5}
                    className="animate-pulse"
                  />
                  
                  {/* Arrowhead pointing along flight heading */}
                  <polygon
                    points={`${maxDistancePos.x},${maxDistancePos.y} ${wing1X},${wing1Y} ${wing2X},${wing2Y}`}
                    fill={isLight ? "#0F172A" : "#ffffff"}
                    className="animate-pulse"
                  />

                  {/* Limit Crossbar (一竖) perpendicular to heading at the tip of the arrow */}
                  <line
                    x1={barX1}
                    y1={barY1}
                    x2={barX2}
                    y2={barY2}
                    stroke={isLight ? "#0F172A" : "#ffffff"}
                    strokeWidth={2}
                  />

                  {/* Text Label next to the limit */}
                  <g transform={`translate(${labelX}, ${labelY})`}>
                    <rect
                      x={-4}
                      y={-12}
                      width={65}
                      height={16}
                      fill={isLight ? "#ffffff" : "#09090b"}
                      stroke={isLight ? "#94A3B8" : "#3f3f46"}
                      strokeWidth={0.5}
                      rx={1}
                    />
                    <text
                      x={2}
                      y={0}
                      fill={isLight ? "#0F172A" : "#ffffff"}
                      fontSize={11}
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {displayDistance}
                    </text>
                  </g>
                </g>
              );
            })()}

          </g>
        </svg>

        {/* Hover Popover Readout (inside map container) */}
        {hoveredPoint && (
          <div
            className={`absolute z-20 pointer-events-none p-2 rounded-sm text-[12px] font-mono shadow-xl border ${
              isLight ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-[#121214]/95 border-[#2A2A2C] text-[#E0E0E0]'
            }`}
            style={{
              left: `${hoveredPos.x * zoom + pan.x + 15}px`,
              top: `${hoveredPos.y * zoom + pan.y - 15}px`,
              maxWidth: '240px'
            }}
          >
            <div className={`font-bold border-b pb-1 mb-1 flex justify-between ${isLight ? 'text-slate-900 border-slate-200' : 'text-white border-[#2A2A2C]'}`}>
              <span>WAYPOINT #{hoveredPoint.id}</span>
              <span>{hoveredPoint.time}</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <span className={isLight ? "text-slate-400" : "text-white/40"}>纬度:</span>
              <span>{hoveredPoint.latitude}°N</span>
              <span className={isLight ? "text-slate-400" : "text-white/40"}>经度:</span>
              <span>{hoveredPoint.longitude}°E</span>
              <span className={isLight ? "text-slate-400" : "text-white/40"}>高度:</span>
              <span>{hoveredPoint.altitude} 米</span>
              <span className={isLight ? "text-slate-400" : "text-white/40"}>航速:</span>
              <span>{hoveredPoint.speed} km/h</span>
              <span className={isLight ? "text-slate-400" : "text-white/40"}>积冰值:</span>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {hoveredPoint.algorithms[mappedAlgorithmId]?.value} {ALGORITHMS.find(a => a.id === mappedAlgorithmId)?.unit}
              </span>
              <span className={isLight ? "text-slate-400" : "text-white/40"}>风险等级:</span>
              <span style={{ color: getRiskColor(hoveredPoint) }} className="font-bold">
                {getRiskLabel(hoveredPoint).split(' (')[0]}
              </span>
              <span className={isLight ? "text-slate-400" : "text-white/40"}>最大航距:</span>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{hoveredPoint.maxDistance >= 100 ? '≥100km' : `${hoveredPoint.maxDistance} km`}</span>
            </div>
          </div>
        )}

        {/* Selected Point Detail Readout (Sticky Panel in Map) */}
        {selectedPoint && (
          <div className={`absolute bottom-3 left-3 p-3 rounded-sm text-xs font-mono w-64 shadow-xl select-text border ${
            isLight ? 'bg-white/95 border-slate-300 text-slate-800' : 'bg-[#121214]/95 border-[#2A2A2C] text-[#E0E0E0]'
          }`}>
            <div className={`flex justify-between items-center border-b pb-1.5 mb-1.5 ${isLight ? 'border-slate-200' : 'border-[#2A2A2C]'}`}>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>航迹点 {selectedPoint.id} 详细数据</span>
              <button
                onClick={() => setSelectedPoint(null)}
                className={`cursor-pointer ${isLight ? 'text-slate-400 hover:text-slate-800' : 'text-white/40 hover:text-white'}`}
              >
                ×
              </button>
            </div>
            <div className="space-y-1 text-[12px]">
              <div className="flex justify-between"><span className={isLight ? "text-slate-400" : "text-white/40"}>时刻 (Time):</span> <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedPoint.time}</span></div>
              <div className="flex justify-between"><span className={isLight ? "text-slate-400" : "text-white/40"}>位置 (Coords):</span> <span className={isLight ? "text-slate-700" : "text-[#E0E0E0]"}>{selectedPoint.latitude}°N, {selectedPoint.longitude}°E</span></div>
              <div className="flex justify-between"><span className={isLight ? "text-slate-400" : "text-white/40"}>高度 (Altitude):</span> <span className={isLight ? "text-slate-700" : "text-[#E0E0E0]"}>{selectedPoint.altitude} m</span></div>
              <div className="flex justify-between"><span className={isLight ? "text-slate-400" : "text-white/40"}>速度 (Airspeed):</span> <span className={isLight ? "text-slate-700" : "text-[#E0E0E0]"}>{selectedPoint.speed} km/h</span></div>
              <div className="flex justify-between"><span className={isLight ? "text-slate-400" : "text-white/40"}>航向 (Heading):</span> <span className={isLight ? "text-slate-700" : "text-[#E0E0E0]"}>{selectedPoint.heading}°</span></div>
              <div className={`h-px my-1.5 ${isLight ? 'bg-slate-200' : 'bg-[#2A2A2C]'}`}></div>
              <div className="flex justify-between">
                <span className={isLight ? "text-slate-400" : "text-white/40"}>对应算法结果:</span>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {selectedPoint.algorithms[mappedAlgorithmId]?.value} {ALGORITHMS.find(a => a.id === mappedAlgorithmId)?.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? "text-slate-400" : "text-white/40"}>风险等级 (Risk):</span>
                <span style={{ color: getRiskColor(selectedPoint) }} className="font-bold">
                  {getRiskLabel(selectedPoint)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isLight ? "text-slate-400" : "text-white/40"}>最大航程 (Max Cap):</span>
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{selectedPoint.maxDistance >= 100 ? '≥100km' : `${selectedPoint.maxDistance} km`}</span>
              </div>
            </div>
            <button
              onClick={() => onSelectIndex(selectedPoint.id)}
              className={`mt-2 w-full text-center py-1 text-[12px] font-bold rounded-sm transition-colors cursor-pointer border ${
                isLight 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' 
                  : 'bg-[#2A2A2C] border-white/15 hover:bg-white/10 text-white'
              }`}
            >
              同步当前时间线到此处
            </button>
          </div>
        )}

        {/* Map Help / Legend Drawer */}
        <div className={`absolute top-3 left-3 px-2 py-1.5 rounded-sm text-[12px] font-mono space-y-1 border ${
          isLight ? 'bg-white/95 border-slate-300 text-slate-600 shadow-sm' : 'bg-[#121214]/90 border-[#2A2A2C] text-white/50'
        }`}>
          <div className={`flex items-center gap-1.5 font-bold mb-1 ${isLight ? 'text-slate-800' : 'text-white/80'}`}>
            <HelpCircle size={10} />
            <span>地图操作指南</span>
          </div>
          <div>• 拖拽地图可平移，滚轮缩放</div>
          <div>• 点击航迹点可锁定并查看详情</div>
          <div>• 虚线部分代表预估/未飞行航线</div>
          <div className={`flex items-center gap-1.5 mt-1.5 pt-1.5 border-t ${isLight ? 'border-slate-200' : 'border-[#2A2A2C]/50'}`}>
            <span className={`w-2.5 h-1 inline-block ${isLight ? 'bg-slate-800' : 'bg-white'}`}></span>
            <span>{isLight ? '黑色' : '白色'}实线箭头: 预估可航行距离</span>
          </div>
        </div>

        {/* Floating Mode Selector Box */}
        <div className={`absolute top-3 right-3 z-10 w-[280px] rounded-sm p-3 shadow-2xl font-mono text-xs select-none border transition-colors duration-200 ${
          isLight ? 'bg-white/95 border-slate-300 text-slate-800 shadow-slate-300/50' : 'bg-[#121214]/95 border-[#2A2A2C] text-[#E0E0E0]'
        }`}>
          {/* Mode Switch Tabs */}
          <div className={`grid grid-cols-2 gap-1 p-1 border rounded-sm mb-3 ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-black/40 border-[#2A2A2C]'
          }`}>
            <button
              onClick={() => onToggleMode('live')}
              className={`py-1.5 text-[11px] font-bold rounded-xs cursor-pointer transition-all flex items-center justify-center gap-1 ${
                systemMode === 'live'
                  ? (isLight ? 'bg-white text-amber-600 shadow-xs border border-slate-200 font-bold' : 'bg-[#2A2A2C] text-[#FF9F0A] border-white/5 shadow-xs font-bold')
                  : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-white/40 hover:text-white')
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-pulse"></span>
              实况
            </button>
            <button
              onClick={() => onToggleMode('history')}
              className={`py-1.5 text-[11px] font-bold rounded-xs cursor-pointer transition-all flex items-center justify-center gap-1 ${
                systemMode === 'history'
                  ? (isLight ? 'bg-white text-blue-600 shadow-xs border border-slate-200 font-bold' : 'bg-[#2A2A2C] text-[#0A84FF] border-white/5 shadow-xs font-bold')
                  : (isLight ? 'text-slate-500 hover:text-slate-800' : 'text-white/40 hover:text-white')
              }`}
            >
              <Clock size={11} />
              历史
            </button>
          </div>

          {/* Sortie Selector */}
          <div className="space-y-2">

            {systemMode === 'live' ? (
              <div className={`border p-2.5 rounded-sm flex items-center justify-start ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-[#2A2A2C]'
              }`}>
                <span className="text-[#FF9F0A] font-bold text-[14px] tracking-wider">20260702_B651N_01</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Date Filter Selection */}
                <div className="space-y-1.5 relative">
                  
                  {/* Backdrop for closing popover */}
                  {isCalendarOpen && (
                    <div 
                      className="fixed inset-0 z-20 cursor-default" 
                      onClick={() => setIsCalendarOpen(false)} 
                    />
                  )}

                  <div className="relative z-30">
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                      className={`w-full flex items-center justify-between border rounded-sm px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer font-mono transition-all ${
                        isLight 
                          ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800' 
                          : 'bg-black/40 hover:bg-black/60 border-[#2A2A2C] hover:border-zinc-500 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className={isLight ? "text-blue-600" : "text-[#0A84FF]"} />
                        <span className="font-bold">
                          {!startDateFilter
                            ? '全部日期 (All Dates)' 
                            : !endDateFilter 
                              ? startDateFilter 
                              : `${startDateFilter} 至 ${endDateFilter}`}
                        </span>
                      </div>
                      <span className={`text-[9px] ${isLight ? 'text-slate-400' : 'text-white/40'}`}>{isCalendarOpen ? '▲' : '▼'}</span>
                    </button>
                    
                    {/* Calendar Popover */}
                    {isCalendarOpen && (
                      <div className={`absolute top-full left-0 right-0 mt-1 z-30 border rounded-sm p-3 shadow-2xl font-mono ${
                        isLight ? 'bg-white border-slate-300 text-slate-800 shadow-slate-300/60' : 'bg-[#121214] border-[#2A2A2C] text-white'
                      }`}>
                        {/* Month Picker Header */}
                        <div className={`flex items-center justify-between mb-2.5 pb-2 border-b ${
                          isLight ? 'border-slate-200' : 'border-[#2A2A2C]/50'
                        }`}>
                          <button 
                            type="button"
                            onClick={handlePrevMonth}
                            className={`px-1.5 py-0.5 border rounded-xs cursor-pointer text-[10px] ${
                              isLight 
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                                : 'bg-black/20 hover:bg-white/5 border-[#2A2A2C] text-white/60 hover:text-white'
                            }`}
                          >
                            &lt;
                          </button>
                          <span className={`text-[11px] font-bold tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            {calendarYear}年 {calendarMonth + 1}月
                          </span>
                          <button 
                            type="button"
                            onClick={handleNextMonth}
                            className={`px-1.5 py-0.5 border rounded-xs cursor-pointer text-[10px] ${
                              isLight 
                                ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' 
                                : 'bg-black/20 hover:bg-white/5 border-[#2A2A2C] text-white/60 hover:text-white'
                            }`}
                          >
                            &gt;
                          </button>
                        </div>

                        {/* Weekdays */}
                        <div className={`grid grid-cols-7 gap-1 text-center text-[9px] font-bold mb-1 ${
                          isLight ? 'text-slate-400' : 'text-white/30'
                        }`}>
                          <span>日</span>
                          <span>一</span>
                          <span>二</span>
                          <span>三</span>
                          <span>四</span>
                          <span>五</span>
                          <span>六</span>
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {calendarDays.map((item, idx) => {
                            if (item.day === null) {
                              return <div key={`empty-${idx}`} className="h-6" />;
                            }

                            const hasFlights = (flightCountMap[item.dateString] || 0) > 0;
                            const isStart = startDateFilter === item.dateString;
                            const isEnd = endDateFilter === item.dateString;
                            const isInRange = startDateFilter && endDateFilter && item.dateString > startDateFilter && item.dateString < endDateFilter;
                            const isSelected = isStart || isEnd;

                            return (
                              <button
                                key={item.dateString}
                                type="button"
                                onClick={() => {
                                  if (!startDateFilter || (startDateFilter && endDateFilter)) {
                                    setStartDateFilter(item.dateString);
                                    setEndDateFilter(null);
                                  } else {
                                    if (item.dateString < startDateFilter) {
                                      setStartDateFilter(item.dateString);
                                    } else {
                                      setEndDateFilter(item.dateString);
                                    }
                                  }
                                }}
                                className={`h-6 w-full text-[10px] font-bold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                                  isSelected
                                    ? (isLight ? 'bg-blue-600 text-white rounded-xs' : 'bg-[#0A84FF] text-white rounded-xs')
                                    : isInRange
                                      ? (isLight ? 'bg-blue-100 text-blue-800' : 'bg-[#0A84FF]/25 text-white')
                                      : hasFlights
                                        ? (isLight ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xs' : 'bg-[#0A84FF]/10 text-[#0A84FF] hover:bg-[#0A84FF]/20 border border-[#0A84FF]/25 rounded-xs')
                                        : (isLight ? 'text-slate-600 hover:bg-slate-100 rounded-xs' : 'text-white/40 hover:bg-white/5 hover:text-white/90 rounded-xs')
                                }`}
                              >
                                <span>{item.day}</span>
                                {hasFlights && !isSelected && (
                                  <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isLight ? 'bg-blue-600' : 'bg-[#0A84FF]'}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Range Helper Text */}
                        <div className={`text-[9px] text-center mt-2.5 ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                          {startDateFilter && !endDateFilter ? '请选择结束日期' : '点击两个日期来选择时间范围'}
                        </div>

                        {/* Clear/All Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setStartDateFilter(null);
                            setEndDateFilter(null);
                            setIsCalendarOpen(false);
                          }}
                          className={`w-full mt-2 pt-2 border-t text-center text-[10px] hover:underline cursor-pointer font-bold block ${
                            isLight ? 'border-slate-200 text-blue-600' : 'border-[#2A2A2C]/50 text-[#0A84FF]'
                          }`}
                        >
                          显示全部归档架次
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Flight List */}
                <div className="space-y-1">
                  <div className={`text-[12px] font-normal pb-1 ${isLight ? 'text-slate-500' : 'text-white/50'}`}>
                    <span>历史架次:</span>
                  </div>
                  <div className={`border rounded-sm overflow-hidden ${
                    isLight ? 'border-slate-200 bg-white' : 'border-[#2A2A2C] bg-black/25'
                  }`}>
                    {/* Fixed Table Header */}
                    <div className={`flex justify-between items-center px-2.5 py-1.5 text-[9px] font-bold border-b font-mono ${
                      isLight ? 'text-slate-500 bg-slate-50 border-slate-200' : 'text-white/40 bg-white/5 border-[#2A2A2C]'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className={`w-[63%] transition-colors flex justify-center items-center gap-0.5 cursor-pointer select-none ${
                          isLight ? 'hover:text-slate-800' : 'hover:text-white'
                        }`}
                      >
                        架次编号 {sortOrder === 'desc' ? '▼' : '▲'}
                      </button>
                      <span className="w-[22%] text-center">起飞时间</span>
                      <span className="w-[15%] text-center">总时长</span>
                    </div>

                    {/* Scrollable List Body */}
                    <div className={`max-h-[160px] overflow-y-auto divide-y ${
                      isLight 
                        ? 'divide-slate-100 scrollbar-thin scrollbar-thumb-slate-300' 
                        : 'scrollbar-thin scrollbar-thumb-zinc-850 divide-[#2A2A2C]/30'
                    }`}>
                      {sortedHistoryFlights.length === 0 ? (
                        <div className={`text-center py-6 text-[11px] font-mono ${isLight ? 'text-slate-400' : 'text-white/30'}`}>
                          该日期无归档架次
                        </div>
                      ) : (
                        sortedHistoryFlights.map((f) => {
                          const isSelected = selectedFlightId === f.id;
                          const timeFormatted = `${f.startHour.toString().padStart(2, '0')}:${f.startMin.toString().padStart(2, '0')}`;
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => onSelectFlight(f.id)}
                              className={`w-full text-left px-2.5 py-2 transition-all cursor-pointer flex justify-between items-center ${
                                isLight
                                  ? (isSelected
                                      ? 'bg-blue-50 text-blue-700 font-bold border-l-2 border-blue-600'
                                      : 'bg-transparent text-slate-600 hover:bg-slate-50 border-l-2 border-transparent')
                                  : (isSelected
                                      ? 'bg-[#0A84FF]/15 text-white font-bold border-l-2 border-[#0A84FF]'
                                      : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white border-l-2 border-transparent')
                              }`}
                            >
                              <span className={`w-[63%] text-center text-[11px] font-mono tracking-wide truncate ${
                                isLight 
                                  ? (isSelected ? 'text-blue-700 font-bold' : 'text-slate-800')
                                  : (isSelected ? 'text-[#0A84FF]' : 'text-white/80')
                              }`}>
                                {f.id}
                              </span>
                              <span className={`w-[22%] text-center text-[10.5px] font-mono ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                                {timeFormatted}
                              </span>
                              <span className={`w-[15%] text-center text-[10.5px] font-mono ${isLight ? 'text-slate-500' : 'text-white/60'}`}>
                                {Number(f.durationHours.toFixed(2))}h
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid Coordinates Footer Bar */}
      <div className={`border-t px-3 py-1.5 flex items-center justify-between text-[12px] font-mono transition-colors duration-200 ${
        isLight ? 'bg-[#F8FAFC] border-[#CBD5E1] text-slate-500' : 'bg-[#1A1A1C] border-[#2A2A2C] text-white/40'
      }`}>
        <div className="flex gap-4">
          <span>图区中心: 35.5000°N, 119.0000°E</span>
          <span>缩放比例: {zoom.toFixed(2)}x</span>
          <span>光标指向: {hoveredPoint ? `${hoveredPoint.latitude.toFixed(4)}°N, ${hoveredPoint.longitude.toFixed(4)}°E` : '---, ---'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>系统连线状态: 正常</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]"></span>
        </div>
      </div>
    </div>
  );
}
