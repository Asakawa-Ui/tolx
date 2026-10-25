import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FlightDataPoint, ProductConfig } from '../types';
import { ALGORITHMS, TURBULENCE_ALGORITHMS, ALL_ALGORITHMS, evaluateIcingRisk } from '../data/mockData';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, HelpCircle, Activity, Clock, Play, Pause, ChevronRight, X } from 'lucide-react';
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

interface ChinaMapData {
  provPath: string;
  cityPath: string;
  provLabels: Array<{ name: string; x: number; y: number; adcode: number }>;
  cityLabels: Array<{ name: string; x: number; y: number; adcode: number; parentCode?: number }>;
  districtLabels: Array<{ name: string; x: number; y: number; adcode: number; parentCode?: number }>;
}

const provNamesMap: Record<number, string> = {
  110000: '北京市', 120000: '天津市', 130000: '河北省', 140000: '山西省', 150000: '内蒙古自治区',
  210000: '辽宁省', 220000: '吉林省', 230000: '黑龙江省', 310000: '上海市', 320000: '江苏省',
  330000: '浙江省', 340000: '安徽省', 350000: '福建省', 360000: '江西省', 370000: '山东省',
  410000: '河南省', 420000: '湖北省', 430000: '湖南省', 440000: '广东省', 450000: '广西壮族自治区',
  460000: '海南省', 500000: '重庆市', 510000: '四川省', 520000: '贵州省', 530000: '云南省',
  540000: '西藏自治区', 610000: '陕西省', 620000: '甘肃省', 630000: '青海省', 640000: '宁夏回族自治区',
  650000: '新疆维吾尔自治区', 710000: '台湾省', 810000: '香港', 820000: '澳门'
};

function processChinaGeoJSON(data: any, projectFn: (lng: number, lat: number) => { x: number; y: number }): ChinaMapData {
  const round = (v: number) => Math.round(v * 1000) / 1000;
  const edgeKey = (p1: number[], p2: number[]) => {
    const k1 = round(p1[0]) + ',' + round(p1[1]);
    const k2 = round(p2[0]) + ',' + round(p2[1]);
    return k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
  };

  const edges = new Map<string, { p1: number[]; p2: number[]; provs: any[] }>();
  const provCenters: Record<number, { name: string; lngSum: number; latSum: number; count: number; adcode: number }> = {};
  const cityLabels: Array<{ name: string; x: number; y: number; adcode: number; parentCode?: number }> = [];
  const districtLabels: Array<{ name: string; x: number; y: number; adcode: number; parentCode?: number }> = [];

  data.features.forEach((f: any) => {
    if (!f.geometry) return;
    const props = f.properties || {};
    const pCode = props.parent ? props.parent.adcode : (props.level === 'province' ? props.adcode : null);
    const prov = pCode || props.adcode;

    const center = props.center || props.centroid;
    if (center) {
      if (pCode && provNamesMap[pCode]) {
        if (!provCenters[pCode]) {
          provCenters[pCode] = { name: provNamesMap[pCode], lngSum: 0, latSum: 0, count: 0, adcode: pCode };
        }
        provCenters[pCode].lngSum += center[0];
        provCenters[pCode].latSum += center[1];
        provCenters[pCode].count++;
      }

      const proj = projectFn(center[0], center[1]);
      if (props.level === 'city') {
        cityLabels.push({ name: props.name, x: proj.x, y: proj.y, adcode: props.adcode, parentCode: pCode });
      } else if (props.level === 'district') {
        districtLabels.push({ name: props.name, x: proj.x, y: proj.y, adcode: props.adcode, parentCode: pCode });
      }
    }

    const extractRings = (coords: any[], type: string) => {
      if (type === 'Polygon') return coords;
      if (type === 'MultiPolygon') return coords.flat(1);
      return [];
    };
    const rings = extractRings(f.geometry.coordinates, f.geometry.type);
    rings.forEach((ring: any[]) => {
      for (let i = 0; i < ring.length - 1; i++) {
        const key = edgeKey(ring[i], ring[i + 1]);
        if (!edges.has(key)) {
          edges.set(key, { p1: ring[i], p2: ring[i + 1], provs: [prov] });
        } else {
          edges.get(key)!.provs.push(prov);
        }
      }
    });
  });

  let provPath = '';
  let cityPath = '';

  edges.forEach(e => {
    const p1 = projectFn(e.p1[0], e.p1[1]);
    const p2 = projectFn(e.p2[0], e.p2[1]);
    const seg = 'M' + p1.x + ' ' + p1.y + 'L' + p2.x + ' ' + p2.y;
    if (e.provs.length === 2 && e.provs[0] === e.provs[1]) {
      cityPath += seg;
    } else {
      provPath += seg;
    }
  });

  const provLabels = Object.values(provCenters).map(p => {
    const proj = projectFn(p.lngSum / p.count, p.latSum / p.count);
    return { name: p.name, x: proj.x, y: proj.y, adcode: p.adcode };
  });

  return { provPath, cityPath, provLabels, cityLabels, districtLabels };
}

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
  const [chinaMap, setChinaMap] = useState<ChinaMapData | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch('/assets/china_map_processed.json')
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        if (isMounted) setChinaMap(data);
      })
      .catch(() => {
        // Fallback: load /assets/CHINA.json directly
        fetch('/assets/CHINA.json')
          .then(r => r.json())
          .then(raw => {
            const projectFn = (lng: number, lat: number) => {
              const x = Math.round((toRad(lng - centerLng) * mapScale + mapWidth / 2) * 10) / 10;
              const y = Math.round((-(mercatorY(lat) - mercY0) * mapScale + mapHeight / 2) * 10) / 10;
              return { x, y };
            };
            if (isMounted) setChinaMap(processChinaGeoJSON(raw, projectFn));
          })
          .catch(err => console.error('Failed to load china administrative map data:', err));
      });
    return () => { isMounted = false; };
  }, []);

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
  const [showGuide, setShowGuide] = useState<boolean>(true);

  // Clear any leftover session flag on mount so refresh always re-shows the guide
  useEffect(() => {
    try {
      sessionStorage.removeItem('hide_map_guide');
    } catch {}
  }, []);

  const handleCloseGuide = () => {
    setShowGuide(false);
  };
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Interactive UI elements
  const [showAircraftPopover, setShowAircraftPopover] = useState<boolean>(false);

  // History filtering states & memos (date range selection)
  const [startDateFilter, setStartDateFilter] = useState<string>(() => {
    // Default to last 7 days from 2026-07-12 (July 12, 2026) -> 2026-07-06
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
  const [calendarView, setCalendarView] = useState<'days' | 'months' | 'years'>('days');
  const [yearPageStart, setYearPageStart] = useState<number>(2021);

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

  // Conformal 90-degree Nadir (Top-down) Mercator Projection
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + toRad(lat) / 2));

  const centerLng = 119.19;
  const centerLat = 35.61;
  const mercY0 = mercatorY(centerLat);
  const mapScale = 1950;
  const mapWidth = 720;
  const mapHeight = 540;

  // Conformal Projection formula: true 90-degree vertical top-down view (1:1 aspect ratio, preserving true angles & distances)
  const project = (lat: number, lng: number) => {
    const x = toRad(lng - centerLng) * mapScale + mapWidth / 2;
    const y = -(mercatorY(lat) - mercY0) * mapScale + mapHeight / 2;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  };

  const getRiskColor = (point: FlightDataPoint) => {
    const output = point.algorithms[mappedAlgorithmId];
    if (!output || !activeConfig) return activeConfig?.colors?.none || '#6B7280';
    
    if (activeConfig.levels && activeConfig.levels.length > 0) {
      const nonBase = activeConfig.levels.filter(l => !l.isBase).sort((a, b) => b.minThreshold - a.minThreshold);
      for (const lvl of nonBase) {
        if (output.value >= lvl.minThreshold) {
          return lvl.color;
        }
      }
      return activeConfig.levels[0]?.color || activeConfig.colors.none;
    }

    const hasThresholds = (activeConfig.thresholds.severe > 0 || activeConfig.thresholds.moderate > 0 || activeConfig.thresholds.light > 0);
    if (!hasThresholds) {
      return isLight ? '#0284C7' : '#00E5FF';
    }

    const risk = evaluateIcingRisk(mappedAlgorithmId, output.value, activeConfig.thresholds);
    if (risk.level === 'Severe') return activeConfig.colors.severe;
    if (risk.level === 'Moderate') return activeConfig.colors.moderate;
    if (risk.level === 'LightModerate') return activeConfig.colors.lightModerate || '#22D3EE';
    if (risk.level === 'Light') return activeConfig.colors.light;
    return activeConfig.colors.none;
  };

  const getRiskLabel = (point: FlightDataPoint) => {
    const output = point.algorithms[mappedAlgorithmId];
    if (!output || !activeConfig) return '正常监测';

    if (activeConfig.levels && activeConfig.levels.length > 0) {
      const nonBase = activeConfig.levels.filter(l => !l.isBase).sort((a, b) => b.minThreshold - a.minThreshold);
      for (const lvl of nonBase) {
        if (output.value >= lvl.minThreshold) {
          return lvl.name;
        }
      }
      return activeConfig.levels[0]?.name || '正常监测';
    }

    const hasThresholds = (activeConfig.thresholds.severe > 0 || activeConfig.thresholds.moderate > 0 || activeConfig.thresholds.light > 0);
    if (!hasThresholds) {
      return '监测中 (暂无阈值)';
    }

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
    const svg = mapRef.current;
    let mouseX = mapWidth / 2;
    let mouseY = mapHeight / 2;

    if (svg) {
      try {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const ctm = svg.getScreenCTM();
        if (ctm) {
          const svgPt = pt.matrixTransform(ctm.inverse());
          mouseX = svgPt.x;
          mouseY = svgPt.y;
        }
      } catch {}
    }

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.5), 6);
    const actualFactor = newZoom / zoom;

    setPan(prev => ({
      x: mouseX - (mouseX - prev.x) * actualFactor,
      y: mouseY - (mouseY - prev.y) * actualFactor
    }));
    setZoom(newZoom);
  };

  const zoomAtCenter = (targetZoom: number) => {
    const clampedZoom = Math.min(Math.max(targetZoom, 0.5), 6);
    const actualFactor = clampedZoom / zoom;
    const centerX = mapWidth / 2;
    const centerY = mapHeight / 2;

    setPan(prev => ({
      x: centerX - (centerX - prev.x) * actualFactor,
      y: centerY - (centerY - prev.y) * actualFactor
    }));
    setZoom(clampedZoom);
  };

  const zoomIn = () => zoomAtCenter(zoom * 1.2);
  const zoomOut = () => zoomAtCenter(zoom / 1.2);
  const resetView = () => {
    setZoom(1.1);
    setPan({ x: -10, y: -40 });
    setShowAircraftPopover(false);
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



  const isTurbulenceMapped = TURBULENCE_ALGORITHMS.some(a => a.id === mappedAlgorithmId);
  const currentAircraft = flightData[Math.round(currentIndex)] || flightData[0];
  const aircraftPos = project(currentAircraft.latitude, currentAircraft.longitude);

  // True 90-degree Nadir Heading Vector (0° = North = Upwards, 90° = East = Rightwards)
  const headingRad = (currentAircraft.heading * Math.PI) / 180;
  const dirX = Math.sin(headingRad);
  const dirY = -Math.cos(headingRad);
  const perpX = Math.cos(headingRad);
  const perpY = Math.sin(headingRad);

  const mapScaleDistance = 0.85; // scaling factor for pixels per km in map coordinates
  const segmentLength = currentAircraft.maxDistance * mapScaleDistance;
  const maxDistancePos = {
    x: aircraftPos.x + dirX * segmentLength,
    y: aircraftPos.y + dirY * segmentLength
  };

  // Continuous Trajectory Paths (grouped seamlessly by contiguous risk colors)
  const trajectorySegments = useMemo(() => {
    if (flightData.length < 2) return [];

    const maxIdx = systemMode === 'live' ? Math.round(currentIndex) : flightData.length - 1;
    const activeData = flightData.filter(pt => pt.id <= maxIdx);
    if (activeData.length < 2) return [];

    const segments: Array<{ color: string; d: string }> = [];
    let currentColor = getRiskColor(activeData[0]);
    let currentPath = `M ${project(activeData[0].latitude, activeData[0].longitude).x} ${project(activeData[0].latitude, activeData[0].longitude).y}`;

    for (let i = 1; i < activeData.length; i++) {
      const pt = activeData[i];
      const p = project(pt.latitude, pt.longitude);
      const color = getRiskColor(pt);

      if (color === currentColor) {
        currentPath += ` L ${p.x} ${p.y}`;
      } else {
        // Connect to transition point
        currentPath += ` L ${p.x} ${p.y}`;
        segments.push({ color: currentColor, d: currentPath });
        currentColor = color;
        currentPath = `M ${p.x} ${p.y}`;
      }
    }

    segments.push({ color: currentColor, d: currentPath });
    return segments;
  }, [flightData, currentIndex, systemMode, mappedAlgorithmId, activeConfig, isLight]);

  const futureSegment = useMemo(() => {
    if (systemMode === 'live') return null;
    const curIdx = Math.round(currentIndex);
    if (curIdx >= flightData.length - 1) return null;
    const futureData = flightData.slice(curIdx);
    if (futureData.length < 2) return null;

    let path = `M ${project(futureData[0].latitude, futureData[0].longitude).x} ${project(futureData[0].latitude, futureData[0].longitude).y}`;
    for (let i = 1; i < futureData.length; i++) {
      const p = project(futureData[i].latitude, futureData[i].longitude);
      path += ` L ${p.x} ${p.y}`;
    }
    return path;
  }, [flightData, currentIndex, systemMode]);

  return (
    <div 
      className={`flex flex-col border rounded-sm overflow-hidden select-none h-full transition-colors duration-200 ${
        isLight ? 'bg-[#FAFAF8] border-[#D5D3CE]' : 'bg-[#121214] border-[#2A2A2C]'
      }`} 
      id="flight-map-container"
    >
      {/* Map Action Bar / Window Subheader */}
      <div 
        className={`flex items-center justify-between px-3 py-1.5 border-b text-xs font-mono transition-colors duration-200 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE] text-[#3F3F46]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-[12px] ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>当前气象映射产品:</span>
          <select
            value={mappedAlgorithmId}
            onChange={(e) => onSelectAlgorithm(e.target.value)}
            className={`px-2 py-0.5 rounded-sm focus:outline-none cursor-pointer transition-colors text-xs font-sans outline-none border ${
              isLight ? 'text-[#18181B] bg-[#FAFAF8] border-[#D5D3CE] hover:border-[#A1A1AA]' : 'text-[#E0E0E0] bg-[#2A2A2C] border-white/15 hover:border-white/25'
            }`}
          >
            <optgroup label="积冰监测产品" className={isLight ? 'bg-[#ECEBE7] text-[#52525B]' : 'bg-[#1A1A1C] text-white/50'}>
              {ALGORITHMS.map(algo => (
                <option key={algo.id} value={algo.id} className={isLight ? 'bg-[#FAFAF8] text-[#18181B]' : 'bg-[#121214] text-[#E0E0E0]'}>
                  {algo.name} {algo.paramSymbol ? `(${algo.paramSymbol})` : ''}
                </option>
              ))}
            </optgroup>
            <optgroup label="颠簸监测产品" className={isLight ? 'bg-[#ECEBE7] text-[#52525B]' : 'bg-[#1A1A1C] text-white/50'}>
              {TURBULENCE_ALGORITHMS.map(algo => (
                <option key={algo.id} value={algo.id} className={isLight ? 'bg-[#FAFAF8] text-[#18181B]' : 'bg-[#121214] text-[#E0E0E0]'}>
                  {algo.name} {algo.paramSymbol ? `(${algo.paramSymbol})` : ''}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={centerOnAircraft}
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="定位飞机"
          >
            <Crosshair size={14} />
          </button>
          <button 
            onClick={zoomIn} 
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="放大"
          >
            <ZoomIn size={14} />
          </button>
          <button 
            onClick={zoomOut} 
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/50 hover:text-white hover:bg-white/10'
            }`}
            title="缩小"
          >
            <ZoomOut size={14} />
          </button>
          <button 
            onClick={resetView} 
            className={`p-1 rounded-sm transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/50 hover:text-white hover:bg-white/10'
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
          isLight ? 'bg-[#EEECE8]' : 'bg-[#0A0A0B]'
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
          {/* Flight Trajectory & Aircraft Track */}
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Base Map: China Administrative Boundaries (Province & City layers) */}
            {chinaMap && (
              <g className="china-basemap select-none pointer-events-none transition-opacity duration-300">
                {/* 1. City level boundaries (Intra-provincial city borders) */}
                <path
                  d={chinaMap.cityPath}
                  fill="none"
                  stroke={isLight ? "#CBD5E1" : "#27272A"}
                  strokeWidth={Math.max(0.4, 0.75 / zoom)}
                  opacity={zoom < 2.2 ? 0.2 : 0.6}
                />

                {/* 2. Province level boundaries (Inter-provincial + coastline borders) */}
                <path
                  d={chinaMap.provPath}
                  fill="none"
                  stroke={isLight ? "#94A3B8" : "#4B5563"}
                  strokeWidth={Math.max(0.8, 1.3 / zoom)}
                  opacity={isLight ? 0.85 : 0.75}
                />

                {/* 3. Province Labels: prominent at macro zoom (< 2.8) */}
                {zoom < 2.8 && (
                  <g className="province-labels">
                    {chinaMap.provLabels.map(p => {
                      if (p.x < -1500 || p.x > 2200 || p.y < -1500 || p.y > 2200) return null;
                      const opacity = zoom < 2.2 ? 0.85 : Math.max(0.15, ((2.8 - zoom) / 0.6) * 0.85);
                      return (
                        <text
                          key={`prov-lbl-${p.adcode}`}
                          x={p.x}
                          y={p.y}
                          fill={isLight ? "#475569" : "#9CA3AF"}
                          fontSize={12 / zoom}
                          fontWeight="bold"
                          fontFamily="sans-serif"
                          opacity={opacity}
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{ textShadow: isLight ? '0 0 3px #FFFFFF, 0 0 5px #FFFFFF' : '0 0 3px #000000, 0 0 5px #000000' }}
                        >
                          {p.name}
                        </text>
                      );
                    })}
                  </g>
                )}

                {/* 4. City Labels: dynamically appear at detailed zoom (>= 2.5) */}
                {zoom >= 2.5 && (
                  <g className="city-labels">
                    {chinaMap.cityLabels.map(c => {
                      if (c.x < -1000 || c.x > 1800 || c.y < -1000 || c.y > 1800) return null;
                      const opacity = zoom >= 2.5 ? (zoom < 2.9 ? ((zoom - 2.5) / 0.4) * 0.85 : 0.9) : 0;
                      return (
                        <text
                          key={`city-lbl-${c.adcode}`}
                          x={c.x}
                          y={c.y}
                          fill={isLight ? "#334155" : "#D1D5DB"}
                          fontSize={12 / zoom}
                          fontFamily="sans-serif"
                          opacity={opacity}
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{ textShadow: isLight ? '0 0 2px #FAFAF8, 0 0 4px #FAFAF8' : '0 0 2px #0A0A0B, 0 0 4px #0A0A0B' }}
                        >
                          {c.name}
                        </text>
                      );
                    })}
                  </g>
                )}

                {/* 5. District Labels for Municipalities: at deep zoom (>= 3.8) */}
                {zoom >= 3.8 && (
                  <g className="district-labels">
                    {chinaMap.districtLabels.map(d => {
                      if (d.x < -500 || d.x > 1200 || d.y < -500 || d.y > 1000) return null;
                      return (
                        <text
                          key={`dist-lbl-${d.adcode}`}
                          x={d.x}
                          y={d.y}
                          fill={isLight ? "#64748B" : "#9CA3AF"}
                          fontSize={12 / zoom}
                          fontFamily="sans-serif"
                          opacity={0.8}
                          textAnchor="middle"
                          dominantBaseline="central"
                          style={{ textShadow: isLight ? '0 0 2px #FAFAF8' : '0 0 2px #0A0A0B' }}
                        >
                          {d.name}
                        </text>
                      );
                    })}
                  </g>
                )}
              </g>
            )}

            {/* Continuous Flight Trajectory Paths */}
            {trajectorySegments.map((seg, idx) => (
              <path
                key={`traj-seg-${idx}`}
                d={seg.d}
                fill="none"
                stroke={seg.color}
                strokeWidth={2.4 / zoom}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            ))}
            {/* Future path preview in history mode (dashed continuous line) */}
            {futureSegment && (
              <path
                d={futureSegment}
                fill="none"
                stroke={isLight ? "#94A3B8" : "#52525B"}
                strokeWidth={1.5 / zoom}
                strokeDasharray={`${4 / zoom} ${4 / zoom}`}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.35}
              />
            )}

            {/* Current Airplane Icon and Rotation Heading (Clickable for detail values) */}
            {flightData[Math.round(currentIndex)] && (
              <g
                transform={`translate(${aircraftPos.x}, ${aircraftPos.y}) scale(${1 / zoom})`}
                className="cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAircraftPopover(prev => !prev);
                }}
              >
                {/* Generous Click Target Hitbox */}
                <circle r={24} fill="transparent" />
                {/* Rotating Aircraft symbol - enlarged for clear visibility */}
                <g transform={`rotate(${currentAircraft.heading})`} className="transition-transform group-hover:scale-120">
                  <g transform="scale(2.2)">
                    <path
                      d="M 0 -8 L 1 -2 L 7 1 L 7 2 L 1 1 L 1 5 L 4 7 L 4 8 L 0 7 L -4 8 L -4 7 L -1 5 L -1 1 L -7 2 L -7 1 L -1 -2 Z"
                      fill={isLight ? "#0F172A" : "#ffffff"}
                      stroke={isLight ? "#0F172A" : "#ffffff"}
                      strokeWidth={0.8}
                      strokeLinejoin="round"
                    />
                  </g>
                </g>
              </g>
            )}

            {/* Maximum Flyable Segment Projection Line (积冰专用参量，颠簸算法无此参量) */}
            {!isTurbulenceMapped && flightData[Math.round(currentIndex)] && (() => {
              const displayDistance = currentAircraft.maxDistance >= 100 ? "≥100km" : `${currentAircraft.maxDistance} km`;
              
              // Dynamically adapt decorators: compact in zoomed-out view, clear and proportional in zoomed-in view
              const invZoom = 1 / zoom;
              const screenScale = Math.min(1.05, Math.max(0.6, 0.6 + (zoom - 1) * 0.12));
              const barHalf = (9 * screenScale) * invZoom;
              const arrowLen = (13 * screenScale) * invZoom;
              const arrowWing = (7 * screenScale) * invZoom;

              // Perpendicular crossbar (一竖) at the front/tip of the arrow
              const barX1 = maxDistancePos.x - perpX * barHalf;
              const barY1 = maxDistancePos.y - perpY * barHalf;
              const barX2 = maxDistancePos.x + perpX * barHalf;
              const barY2 = maxDistancePos.y + perpY * barHalf;

              // Arrowhead pointing along the flight heading
              const wing1X = maxDistancePos.x - dirX * arrowLen + perpX * arrowWing;
              const wing1Y = maxDistancePos.y - dirY * arrowLen + perpY * arrowWing;
              const wing2X = maxDistancePos.x - dirX * arrowLen - perpX * arrowWing;
              const wing2Y = maxDistancePos.y - dirY * arrowLen - perpY * arrowWing;

              // Tag dimension & placement: positioned cleanly beyond the arrow tip along heading vector, avoiding any overlap
              const tagWidth = displayDistance.length > 5 ? 54 : 46;
              const tagHeight = 16;
              const tagOffset = (tagHeight / 2 + 10 * screenScale) * invZoom;
              const tagX = maxDistancePos.x + dirX * tagOffset;
              const tagY = maxDistancePos.y + dirY * tagOffset;
              const tagBadgeScale = invZoom * Math.min(1.0, Math.max(0.8, 0.8 + (zoom - 1) * 0.06));

              return (
                <g>
                  {/* Solid Arrow Line along heading direction */}
                  <line
                    x1={aircraftPos.x}
                    y1={aircraftPos.y}
                    x2={maxDistancePos.x}
                    y2={maxDistancePos.y}
                    stroke={isLight ? "#0F172A" : "#ffffff"}
                    strokeWidth={1.2 / zoom}
                  />
                  
                  {/* Arrowhead pointing along flight heading */}
                  <polygon
                    points={`${maxDistancePos.x},${maxDistancePos.y} ${wing1X},${wing1Y} ${wing2X},${wing2Y}`}
                    fill={isLight ? "#0F172A" : "#ffffff"}
                  />

                  {/* Limit Crossbar (一竖) perpendicular to heading at the tip of the arrow */}
                  <line
                    x1={barX1}
                    y1={barY1}
                    x2={barX2}
                    y2={barY2}
                    stroke={isLight ? "#0F172A" : "#ffffff"}
                    strokeWidth={1.8 / zoom}
                  />

                  {/* Text Label: Semi-transparent background, no border, placed ahead of arrow tip */}
                  <g transform={`translate(${tagX}, ${tagY}) scale(${tagBadgeScale})`}>
                    <rect
                      x={-tagWidth / 2}
                      y={-tagHeight / 2}
                      width={tagWidth}
                      height={tagHeight}
                      rx={3}
                      fill={isLight ? "rgba(255, 255, 255, 0.75)" : "rgba(18, 18, 20, 0.75)"}
                      stroke="none"
                      className="select-none pointer-events-none"
                    />
                    <text
                      x={0}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isLight ? "#0F172A" : "#FFFFFF"}
                      fontSize={10.5}
                      fontFamily="monospace"
                      fontWeight="bold"
                      className="select-none pointer-events-none"
                    >
                      {displayDistance}
                    </text>
                  </g>
                </g>
              );
            })()}

          </g>
        </svg>

        {/* Aircraft Telemetry & Algorithm Value Popover (when clicking airplane icon) */}
        {showAircraftPopover && currentAircraft && (() => {
          const mappedAlgoDef = ALL_ALGORITHMS.find(a => a.id === mappedAlgorithmId);
          const algoOutput = currentAircraft.algorithms[mappedAlgorithmId];
          const riskColor = getRiskColor(currentAircraft);
          const riskLabel = getRiskLabel(currentAircraft);

          const screenX = aircraftPos.x * zoom + pan.x;
          const screenY = aircraftPos.y * zoom + pan.y;
          const popoverLeft = Math.min(Math.max(16, screenX + 22), mapWidth - 276);
          const popoverTop = Math.min(Math.max(16, screenY - 50), mapHeight - 270);

          return (
            <div
              className={`absolute z-30 p-3 rounded-md text-xs font-mono w-[260px] shadow-2xl border transition-all animate-in fade-in duration-150 ${
                isLight
                  ? 'bg-[#FAFAF8]/95 border-[#D5D3CE] text-[#18181B] backdrop-blur-md'
                  : 'bg-[#121214]/95 border-[#2A2A2C] text-[#E0E0E0] backdrop-blur-md'
              }`}
              style={{
                left: `${popoverLeft}px`,
                top: `${popoverTop}px`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`flex justify-between items-center border-b pb-1.5 mb-2 ${
                isLight ? 'border-[#E4E3DE]' : 'border-[#2A2A2C]'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className={`font-bold ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                    当前时刻飞行数值
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAircraftPopover(false)}
                  className={`p-0.5 rounded-xs transition-colors cursor-pointer ${
                    isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#EAE8E3]' : 'text-white/40 hover:text-white hover:bg-white/10'
                  }`}
                  title="关闭"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="space-y-1.5 text-[11.5px]">
                <div className="flex justify-between">
                  <span className={isLight ? "text-[#71717A]" : "text-white/40"}>时刻:</span>
                  <span className={`font-bold font-mono ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                    {currentAircraft.time}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? "text-[#71717A]" : "text-white/40"}>经纬度:</span>
                  <span className={isLight ? "text-[#3F3F46]" : "text-[#E0E0E0]"}>
                    {currentAircraft.latitude.toFixed(4)}°N, {currentAircraft.longitude.toFixed(4)}°E
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? "text-[#71717A]" : "text-white/40"}>飞行高度:</span>
                  <span className={isLight ? "text-[#3F3F46]" : "text-[#E0E0E0]"}>
                    {currentAircraft.altitude} m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? "text-[#71717A]" : "text-white/40"}>航速 / 航向:</span>
                  <span className={isLight ? "text-[#3F3F46]" : "text-[#E0E0E0]"}>
                    {currentAircraft.speed} km/h · {currentAircraft.heading}°
                  </span>
                </div>

                <div className={`h-px my-1.5 ${isLight ? 'bg-[#E4E3DE]' : 'bg-[#2A2A2C]'}`} />

                <div className="flex justify-between items-center">
                  <span className={isLight ? "text-[#71717A]" : "text-white/40"}>
                    {mappedAlgoDef?.name || '气象指数'}:
                  </span>
                  <span className={`font-bold font-mono text-xs ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                    {algoOutput?.value ?? 0} {mappedAlgoDef?.unit || ''}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={isLight ? "text-[#71717A]" : "text-white/40"}>风险等级:</span>
                  <span
                    className="font-bold px-1.5 py-0.5 rounded text-[11px]"
                    style={{
                      color: riskColor,
                      backgroundColor: `${riskColor}18`,
                      border: `1px solid ${riskColor}40`
                    }}
                  >
                    {riskLabel}
                  </span>
                </div>

                {!isTurbulenceMapped && (
                  <div className="flex justify-between">
                    <span className={isLight ? "text-[#71717A]" : "text-white/40"}>最大航程:</span>
                    <span className={`font-bold font-mono ${isLight ? 'text-[#18181B]' : 'text-white'}`}>
                      {currentAircraft.maxDistance >= 100 ? '≥100km' : `${currentAircraft.maxDistance} km`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Map Help / Legend Drawer */}
        {showGuide && (
          <div className={`absolute top-3 left-3 px-2.5 py-2 rounded-sm text-[12px] font-mono space-y-1 border z-10 ${
            isLight ? 'bg-[#FAFAF8]/95 border-[#D5D3CE] text-[#52525B] shadow-sm' : 'bg-[#121214]/90 border-[#2A2A2C] text-white/50'
          }`}>
            <div className={`flex items-center justify-between gap-3 font-bold mb-1.5 ${isLight ? 'text-[#18181B]' : 'text-white/80'}`}>
              <div className="flex items-center gap-1.5">
                <HelpCircle size={12} />
                <span>地图操作指南</span>
              </div>
              <button
                type="button"
                onClick={handleCloseGuide}
                className={`p-0.5 rounded-xs transition-colors cursor-pointer ${
                  isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#EAE8E3]' : 'text-white/40 hover:text-white hover:bg-white/10'
                }`}
                title="关闭操作指南（本次载入不再显示）"
              >
                <X size={12} />
              </button>
            </div>
            <div>• 拖拽地图可平移，滚轮缩放</div>
            <div>• 点击飞机图标可查看当前时刻详细数据</div>
            {!isTurbulenceMapped && (
              <div className={`flex items-center gap-1.5 mt-1.5 pt-1.5 border-t ${isLight ? 'border-[#E4E3DE]' : 'border-[#2A2A2C]/50'}`}>
                <svg className="w-4 h-2.5 shrink-0" viewBox="0 0 18 10" fill="none">
                  <line x1="1" y1="5" x2="13" y2="5" stroke={isLight ? "#18181B" : "#FFFFFF"} strokeWidth="1.6" />
                  <polygon points="17,5 11,2 11,8" fill={isLight ? "#18181B" : "#FFFFFF"} />
                </svg>
                <span>最大航行距离</span>
              </div>
            )}
          </div>
        )}

        {/* Floating Mode Selector Box */}
        <div className={`absolute top-3 right-3 z-10 w-[280px] rounded-sm p-3 shadow-xl font-mono text-xs select-none border transition-colors duration-200 ${
          isLight ? 'bg-[#FAFAF8]/95 border-[#D5D3CE] text-[#18181B]' : 'bg-[#121214]/95 border-[#2A2A2C] text-[#E0E0E0]'
        }`}>
          {/* Mode Switch Tabs */}
          <div className={`grid grid-cols-2 gap-1 p-1 border rounded-sm mb-3 ${
            isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-black/40 border-[#2A2A2C]'
          }`}>
            <button
              onClick={() => onToggleMode('live')}
              className={`py-1.5 text-[11px] font-bold rounded-xs cursor-pointer transition-all flex items-center justify-center gap-1 ${
                systemMode === 'live'
                  ? (isLight ? 'bg-[#FAFAF8] text-[#18181B] shadow-xs border border-[#D5D3CE] font-bold' : 'bg-[#2A2A2C] text-[#FF9F0A] border-white/5 shadow-xs font-bold')
                  : (isLight ? 'text-[#71717A] hover:text-[#18181B]' : 'text-white/40 hover:text-white')
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30] animate-pulse"></span>
              实况
            </button>
            <button
              onClick={() => onToggleMode('history')}
              className={`py-1.5 text-[11px] font-bold rounded-xs cursor-pointer transition-all flex items-center justify-center gap-1 ${
                systemMode === 'history'
                  ? (isLight ? 'bg-[#FAFAF8] text-[#0284C7] shadow-xs border border-[#D5D3CE] font-bold' : 'bg-[#2A2A2C] text-[#0A84FF] border-white/5 shadow-xs font-bold')
                  : (isLight ? 'text-[#71717A] hover:text-[#18181B]' : 'text-white/40 hover:text-white')
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
                isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-black/20 border-[#2A2A2C]'
              }`}>
                <span className={`${isLight ? 'text-[#18181B]' : 'text-[#FF9F0A]'} font-bold text-[14px] tracking-wider`}>20260702_B651N_01</span>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Date Filter Selection */}
                <div className="space-y-1.5 relative">
                  
                  {/* Backdrop for closing popover */}
                  {isCalendarOpen && (
                    <div 
                      className="fixed inset-0 z-20 cursor-default" 
                      onClick={() => {
                        setIsCalendarOpen(false);
                        setCalendarView('days');
                      }} 
                    />
                  )}

                  <div className="relative z-30">
                    <button
                      type="button"
                      onClick={() => {
                        const nextOpen = !isCalendarOpen;
                        setIsCalendarOpen(nextOpen);
                        if (nextOpen) {
                          setCalendarView('days');
                        }
                      }}
                      className={`w-full flex items-center justify-between border rounded-sm px-2.5 py-1.5 text-xs focus:outline-none cursor-pointer font-mono transition-all ${
                        isLight 
                          ? 'bg-[#FAFAF8] hover:bg-[#ECEBE7] border-[#D5D3CE] text-[#18181B]' 
                          : 'bg-black/40 hover:bg-black/60 border-[#2A2A2C] hover:border-zinc-500 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className={isLight ? "text-[#0284C7]" : "text-[#0A84FF]"} />
                        <span className="font-bold">
                          {!endDateFilter 
                            ? startDateFilter 
                            : `${startDateFilter} 至 ${endDateFilter}`}
                        </span>
                      </div>
                      <span className={`text-[9px] ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>{isCalendarOpen ? '▲' : '▼'}</span>
                    </button>
                    
                    {/* Calendar Popover */}
                    {isCalendarOpen && (
                      <div className={`absolute top-full left-0 right-0 mt-1 z-30 border rounded-sm p-3 shadow-2xl font-mono ${
                        isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#121214] border-[#2A2A2C] text-white'
                      }`}>
                        {/* Month / Year Picker Header */}
                        <div className={`flex items-center justify-between mb-2.5 pb-2 border-b ${
                          isLight ? 'border-[#E4E3DE]' : 'border-[#2A2A2C]/50'
                        }`}>
                          <button 
                            type="button"
                            onClick={() => {
                              if (calendarView === 'years') {
                                setYearPageStart(prev => prev - 12);
                              } else if (calendarView === 'months') {
                                setCalendarYear(prev => prev - 1);
                              } else {
                                handlePrevMonth();
                              }
                            }}
                            className={`px-1.5 py-0.5 border rounded-xs cursor-pointer text-[10px] ${
                              isLight 
                                ? 'bg-[#ECEBE7] hover:bg-[#E2E0DB] border-[#D5D3CE] text-[#18181B]' 
                                : 'bg-black/20 hover:bg-white/5 border-[#2A2A2C] text-white/60 hover:text-white'
                            }`}
                          >
                            &lt;
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setYearPageStart(Math.floor(calendarYear / 12) * 12);
                                setCalendarView(prev => prev === 'years' ? 'days' : 'years');
                              }}
                              className={`px-1.5 py-0.5 rounded-xs text-[11px] font-bold tracking-wider cursor-pointer transition-colors ${
                                calendarView === 'years'
                                  ? (isLight ? 'bg-[#0284C7] text-white' : 'bg-[#0A84FF] text-white')
                                  : (isLight ? 'text-[#18181B] hover:bg-[#ECEBE7]' : 'text-white hover:bg-white/10')
                              }`}
                              title="点击快捷选择年份"
                            >
                              {calendarYear}年
                            </button>
                            <button
                              type="button"
                              onClick={() => setCalendarView(prev => prev === 'months' ? 'days' : 'months')}
                              className={`px-1.5 py-0.5 rounded-xs text-[11px] font-bold tracking-wider cursor-pointer transition-colors ${
                                calendarView === 'months'
                                  ? (isLight ? 'bg-[#0284C7] text-white' : 'bg-[#0A84FF] text-white')
                                  : (isLight ? 'text-[#18181B] hover:bg-[#ECEBE7]' : 'text-white hover:bg-white/10')
                              }`}
                              title="点击快捷选择月份"
                            >
                              {calendarMonth + 1}月
                            </button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => {
                              if (calendarView === 'years') {
                                setYearPageStart(prev => prev + 12);
                              } else if (calendarView === 'months') {
                                setCalendarYear(prev => prev + 1);
                              } else {
                                handleNextMonth();
                              }
                            }}
                            className={`px-1.5 py-0.5 border rounded-xs cursor-pointer text-[10px] ${
                              isLight 
                                ? 'bg-[#ECEBE7] hover:bg-[#E2E0DB] border-[#D5D3CE] text-[#18181B]' 
                                : 'bg-black/20 hover:bg-white/5 border-[#2A2A2C] text-white/60 hover:text-white'
                            }`}
                          >
                            &gt;
                          </button>
                        </div>

                        {calendarView === 'years' ? (
                          /* Years Quick Selection Grid */
                          <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
                            {Array.from({ length: 12 }, (_, idx) => yearPageStart + idx).map(yr => {
                              const isCurrentYear = yr === calendarYear;
                              const yearPrefix = `${yr}-`;
                              const hasYearFlights = Object.keys(flightCountMap).some(d => d.startsWith(yearPrefix));
                              return (
                                <button
                                  key={yr}
                                  type="button"
                                  onClick={() => {
                                    setCalendarYear(yr);
                                    setCalendarView('days');
                                  }}
                                  className={`h-8 text-[11px] font-bold rounded-xs flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                                    isCurrentYear
                                      ? (isLight ? 'bg-[#0284C7] text-white' : 'bg-[#0A84FF] text-white')
                                      : hasYearFlights
                                        ? (isLight ? 'bg-sky-50 text-[#0284C7] hover:bg-sky-100 border border-sky-200' : 'bg-[#0A84FF]/10 text-[#0A84FF] hover:bg-[#0A84FF]/20 border border-[#0A84FF]/25')
                                        : (isLight ? 'text-[#3F3F46] hover:bg-[#ECEBE7]' : 'text-white/60 hover:bg-white/5 hover:text-white')
                                  }`}
                                >
                                  <span>{yr}年</span>
                                  {hasYearFlights && !isCurrentYear && (
                                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-[#0A84FF]'}`} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : calendarView === 'months' ? (
                          /* Months Quick Selection Grid */
                          <div className="grid grid-cols-3 gap-1.5 py-1 text-center">
                            {Array.from({ length: 12 }, (_, mIdx) => mIdx).map(mIdx => {
                              const isCurrentMonth = mIdx === calendarMonth;
                              const monthPrefix = `${calendarYear}-${(mIdx + 1).toString().padStart(2, '0')}-`;
                              const hasMonthFlights = Object.keys(flightCountMap).some(d => d.startsWith(monthPrefix));
                              return (
                                <button
                                  key={mIdx}
                                  type="button"
                                  onClick={() => {
                                    setCalendarMonth(mIdx);
                                    setCalendarView('days');
                                  }}
                                  className={`h-8 text-[11px] font-bold rounded-xs flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                                    isCurrentMonth
                                      ? (isLight ? 'bg-[#0284C7] text-white' : 'bg-[#0A84FF] text-white')
                                      : hasMonthFlights
                                        ? (isLight ? 'bg-sky-50 text-[#0284C7] hover:bg-sky-100 border border-sky-200' : 'bg-[#0A84FF]/10 text-[#0A84FF] hover:bg-[#0A84FF]/20 border border-[#0A84FF]/25')
                                        : (isLight ? 'text-[#3F3F46] hover:bg-[#ECEBE7]' : 'text-white/60 hover:bg-white/5 hover:text-white')
                                  }`}
                                >
                                  <span>{mIdx + 1}月</span>
                                  {hasMonthFlights && !isCurrentMonth && (
                                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-[#0A84FF]'}`} />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <>
                            {/* Weekdays */}
                            <div className={`grid grid-cols-7 gap-1 text-center text-[9px] font-bold mb-1 ${
                              isLight ? 'text-[#71717A]' : 'text-white/30'
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
                                        ? (isLight ? 'bg-[#0284C7] text-white rounded-xs' : 'bg-[#0A84FF] text-white rounded-xs')
                                        : isInRange
                                          ? (isLight ? 'bg-sky-100 text-sky-900' : 'bg-[#0A84FF]/25 text-white')
                                          : hasFlights
                                            ? (isLight ? 'bg-sky-50 text-[#0284C7] hover:bg-sky-100 border border-sky-200 rounded-xs' : 'bg-[#0A84FF]/10 text-[#0A84FF] hover:bg-[#0A84FF]/20 border border-[#0A84FF]/25 rounded-xs')
                                            : (isLight ? 'text-[#3F3F46] hover:bg-[#ECEBE7] rounded-xs' : 'text-white/40 hover:bg-white/5 hover:text-white/90 rounded-xs')
                                    }`}
                                  >
                                    <span>{item.day}</span>
                                    {hasFlights && !isSelected && (
                                      <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${isLight ? 'bg-[#0284C7]' : 'bg-[#0A84FF]'}`} />
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Interactive Flight List */}
                <div className="space-y-1">
                  <div className={`text-[12px] font-normal pb-1 ${isLight ? 'text-[#71717A]' : 'text-white/50'}`}>
                    <span>历史架次:</span>
                  </div>
                  <div className={`border rounded-sm overflow-hidden ${
                    isLight ? 'border-[#D5D3CE] bg-[#FAFAF8]' : 'border-[#2A2A2C] bg-black/25'
                  }`}>
                    {/* Fixed Table Header */}
                    <div className={`flex justify-between items-center px-2.5 py-1.5 text-[9px] font-bold border-b font-mono ${
                      isLight ? 'text-[#71717A] bg-[#ECEBE7] border-[#D5D3CE]' : 'text-white/40 bg-white/5 border-[#2A2A2C]'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        className={`w-[63%] transition-colors flex justify-center items-center gap-0.5 cursor-pointer select-none ${
                          isLight ? 'hover:text-[#18181B]' : 'hover:text-white'
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
                        ? 'divide-[#E4E3DE] custom-scrollbar' 
                        : 'scrollbar-thin scrollbar-thumb-zinc-850 divide-[#2A2A2C]/30'
                    }`}>
                      {sortedHistoryFlights.length === 0 ? (
                        <div className={`text-center py-6 text-[11px] font-mono ${isLight ? 'text-[#71717A]' : 'text-white/30'}`}>
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
                                      ? 'bg-sky-100/70 text-[#0284C7] font-bold border-l-2 border-[#0284C7]'
                                      : 'bg-transparent text-[#3F3F46] hover:bg-[#ECEBE7] border-l-2 border-transparent')
                                  : (isSelected
                                      ? 'bg-[#0A84FF]/15 text-white font-bold border-l-2 border-[#0A84FF]'
                                      : 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white border-l-2 border-transparent')
                              }`}
                            >
                              <span className={`w-[63%] text-center text-[11px] font-mono tracking-wide truncate ${
                                isLight 
                                  ? (isSelected ? 'text-[#0284C7] font-bold' : 'text-[#18181B]')
                                  : (isSelected ? 'text-[#0A84FF]' : 'text-white/80')
                              }`}>
                                {f.id}
                              </span>
                              <span className={`w-[22%] text-center text-[10.5px] font-mono ${isLight ? 'text-[#71717A]' : 'text-white/60'}`}>
                                {timeFormatted}
                              </span>
                              <span className={`w-[15%] text-center text-[10.5px] font-mono ${isLight ? 'text-[#71717A]' : 'text-white/60'}`}>
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
    </div>
  );
}
