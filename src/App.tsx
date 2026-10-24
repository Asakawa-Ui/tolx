import React, { useState, useMemo } from 'react';
import { generateFlightData, ALGORITHMS } from './data/mockData';
import { ProductConfig, FlightDataPoint } from './types';
import TitleBar from './components/TitleBar';
import FlightMap from './components/FlightMap';
import TimeSlider from './components/TimeSlider';
import ProductCard from './components/ProductCard';
import FlightTelemetryPanel from './components/FlightTelemetryPanel';
import { Filter, Layers, Database, BarChart3, Radio, Cpu, Plane } from 'lucide-react';

export interface FlightSortie {
  id: string;
  name: string;
  date: string;
  startHour: number;
  startMin: number;
  icing: 'none' | 'light' | 'heavy';
  isLive: boolean;
  durationHours: number;
}

const FLIGHTS: FlightSortie[] = [
  { id: '20260702_B651N_01', name: '20260702_B651N_01', date: '2026-07-02', startHour: 12, startMin: 0, icing: 'heavy', isLive: true, durationHours: 1 },
  { id: '20260711_B651N_01', name: '20260711_B651N_01', date: '2026-07-11', startHour: 10, startMin: 23, icing: 'none', isLive: false, durationHours: 1 },
  { id: '20260710_B651N_01', name: '20260710_B651N_01', date: '2026-07-10', startHour: 8, startMin: 15, icing: 'light', isLive: false, durationHours: 3 },
  { id: '20260711_B651N_02', name: '20260711_B651N_02', date: '2026-07-11', startHour: 15, startMin: 30, icing: 'heavy', isLive: false, durationHours: 2 },
  { id: '20260710_B651N_02', name: '20260710_B651N_02', date: '2026-07-10', startHour: 13, startMin: 47, icing: 'light', isLive: false, durationHours: 116 / 60 },
  { id: '20260709_B651N_01', name: '20260709_B651N_01', date: '2026-07-09', startHour: 16, startMin: 10, icing: 'heavy', isLive: false, durationHours: 4 },
];

export default function App() {
  const [intervalVal, setIntervalVal] = useState<string>('1s');

  const flightDataMap = useMemo(() => {
    const dataMap: Record<string, FlightDataPoint[]> = {};
    FLIGHTS.forEach(f => {
      const stepSeconds = f.isLive ? 1 : 60;
      dataMap[f.id] = generateFlightData(f.startHour, f.startMin, f.icing, f.durationHours, stepSeconds);
    });
    return dataMap;
  }, []);

  const [systemMode, setSystemMode] = useState<'live' | 'history'>('live');
  const [selectedFlightId, setSelectedFlightId] = useState<string>('20260702_B651N_01');

  const flightData = useMemo(() => {
    return flightDataMap[selectedFlightId] || flightDataMap['20260702_B651N_01'];
  }, [selectedFlightId, flightDataMap]);
  
  // Scrubber index (starts near the cloud entry for visual impact!)
  const [currentIndex, setCurrentIndex] = useState<number>(1440);
  
  // Furthest progress index reached by the live flight so far
  const [liveMaxIndex, setLiveMaxIndex] = useState<number>(1440);
  
  // Brush range bounds (for the synchronized X-axis)
  const [startIndex, setStartIndex] = useState<number>(0);
  const [endIndex, setEndIndex] = useState<number>(1440);
  
  // Synced hover timeline index across all 9 charts
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Mapped algorithm determining the trajectory path coloring
  const [mappedAlgorithmId, setMappedAlgorithmId] = useState<string>('ic_index');

  // Algorithm category filters for product listing layout
  const [activeTab, setActiveTab] = useState<'all' | 'ordinary' | 'ml' | 'sensor'>('all');

  // Tab state for the right workspace panel: 'flight' (飞行监测) or 'icing' (积冰监测)
  const [rightTab, setRightTab] = useState<'flight' | 'icing'>('icing');

  // High-density product configuration records (thresholds, custom colors)
  const [configs, setConfigs] = useState<Record<string, ProductConfig>>(() => {
    const records: Record<string, ProductConfig> = {};
    ALGORITHMS.forEach(algo => {
      records[algo.id] = {
        algorithmId: algo.id,
        thresholds: { ...algo.defaultThresholds },
        colors: {
          none: '#6B7280', // sleek visible gray
          light: '#0A84FF', // vibrant blue
          lightModerate: '#22D3EE', // cyan for light-moderate
          moderate: '#FF9F0A', // sleek orange
          severe: '#FF3B30'  // sleek red
        }
      };
    });
    return records;
  });

  const handleUpdateConfig = (algorithmId: string, newConfig: ProductConfig) => {
    setConfigs(prev => ({
      ...prev,
      [algorithmId]: newConfig
    }));
  };

  // Synchronize state when selected flight and mode changes
  React.useEffect(() => {
    setStartIndex(0);
    const scaleFactor = flightData.length > 200 ? 60 : 1;
    if (systemMode === 'live') {
      const initialIdx = selectedFlightId === '20260702_B651N_01' ? 24 * scaleFactor : 30 * scaleFactor;
      setCurrentIndex(initialIdx);
      setLiveMaxIndex(initialIdx);
      setEndIndex(initialIdx);
    } else {
      setEndIndex(flightData.length - 1);
      if (selectedFlightId === '20260702_B651N_01') {
        setCurrentIndex(24 * scaleFactor);
      } else {
        setCurrentIndex(30 * scaleFactor);
      }
    }
  }, [selectedFlightId, flightData, systemMode]);

  // Keep liveMaxIndex and endIndex in sync with progress in live mode
  React.useEffect(() => {
    if (systemMode === 'live') {
      setLiveMaxIndex(prev => {
        const nextMax = Math.max(prev, currentIndex);
        setEndIndex(Math.floor(nextMax));
        return nextMax;
      });
    }
  }, [currentIndex, systemMode]);

  const handleResetAll = () => {
    setSystemMode('live');
    const defaultFlightId = '20260702_B651N_01';
    setSelectedFlightId(defaultFlightId);
    
    const defaultData = flightDataMap[defaultFlightId] || [];
    const scaleFactor = defaultData.length > 200 ? 60 : 1;
    
    setCurrentIndex(24 * scaleFactor);
    setStartIndex(0);
    setEndIndex(24 * scaleFactor);
    setLiveMaxIndex(24 * scaleFactor);
    setHoveredIndex(null);
    setMappedAlgorithmId('ic_index');
    setActiveTab('all');
    setRightTab('icing');
    setIntervalVal('1s');
    
    // reset configs
    const resetRecs: Record<string, ProductConfig> = {};
    ALGORITHMS.forEach(algo => {
      resetRecs[algo.id] = {
        algorithmId: algo.id,
        thresholds: { ...algo.defaultThresholds },
        colors: {
          none: '#6B7280',
          light: '#0A84FF',
          lightModerate: '#22D3EE',
          moderate: '#FF9F0A',
          severe: '#FF3B30'
        }
      };
    });
    setConfigs(resetRecs);
  };

  // Filter algorithms according to active category tab
  const filteredAlgorithms = useMemo(() => {
    if (activeTab === 'all') return ALGORITHMS;
    return ALGORITHMS.filter(algo => algo.type === activeTab);
  }, [activeTab]);

  // Trim data points within user-brushed range bounds
  const visibleData = useMemo(() => {
    return flightData.slice(startIndex, endIndex + 1);
  }, [flightData, startIndex, endIndex]);

  const currentPoint = flightData[Math.round(currentIndex)] || flightData[0];

  return (
    <div className="min-h-screen w-full bg-[#070708] text-[#E0E0E0] flex items-start justify-center p-6 selection:bg-white selection:text-black font-sans overflow-auto">
      
      {/* Outer Application Window Wrap (PC Client Simulator Skin) */}
      <div className="w-[1920px] h-[1080px] shrink-0 flex flex-col bg-[#0A0A0B] border border-[#2A2A2C] rounded-md shadow-2xl overflow-hidden" id="pc-app-skin">
        
        {/* Native TitleBar and Menu dropdown bar (客户端头部) */}
        <TitleBar onResetAll={handleResetAll} />

        {/* Workspace Layout (主页面容器) */}
        <div className="p-4 flex flex-col h-[1032px] justify-between overflow-hidden">
          
          {/* Main Workspace Layout Row: Flight Map (Left 2/5) & Workspace Panel with Tab Switching (Right 3/5) */}
          <div className="grid grid-cols-5 gap-4 h-[810px]">
            
            {/* Left 2/5 Columns: Interactive SVG Aviation GIS Map */}
            <div className="col-span-2 flex flex-col gap-1 h-full overflow-hidden">
              <FlightMap
                flightData={flightData}
                currentIndex={currentIndex}
                onSelectIndex={setCurrentIndex}
                activeConfig={configs[mappedAlgorithmId]}
                mappedAlgorithmId={mappedAlgorithmId}
                onSelectAlgorithm={setMappedAlgorithmId}
                systemMode={systemMode}
                selectedFlightId={selectedFlightId}
                onToggleMode={(mode) => {
                  setSystemMode(mode);
                  if (mode === 'live') {
                    setSelectedFlightId('20260702_B651N_01');
                  } else {
                    setSelectedFlightId('20260711_B5102_01');
                  }
                }}
                onSelectFlight={setSelectedFlightId}
                flights={FLIGHTS}
              />
            </div>

            {/* Right 3/5 Columns: Workspace Panel with Tab Switching */}
            <div className="col-span-3 flex flex-col h-full overflow-hidden">
              <div className="bg-[#121214] border border-[#2A2A2C] rounded-sm p-4 space-y-4 h-full flex flex-col overflow-hidden" id="workspace-tabs-container">
                
                {/* Header with Tab Controls */}
                <div className="flex items-center justify-between border-b border-[#2A2A2C] pb-3 shrink-0">
                  <div className="flex items-center gap-1.5 bg-[#17171A] p-1 border border-[#2A2A2C] rounded-sm">
                    <button
                      onClick={() => setRightTab('flight')}
                      className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-2 rounded-xs ${
                        rightTab === 'flight'
                          ? 'bg-[#2A2A2C] text-[#00E5FF] font-bold border-white/5 shadow-sm'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Plane size={13} />
                      <span>飞行监测</span>
                    </button>
                    <button
                      onClick={() => setRightTab('icing')}
                      className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider cursor-pointer transition-colors flex items-center gap-2 rounded-xs ${
                        rightTab === 'icing'
                          ? 'bg-[#2A2A2C] text-[#FF9F0A] font-bold border-white/5 shadow-sm'
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <BarChart3 size={13} />
                      <span>积冰监测</span>
                    </button>
                  </div>
                </div>

                {/* Tab content body */}
                {rightTab === 'flight' ? (
                  <div className="flex-grow overflow-hidden">
                    <FlightTelemetryPanel
                      currentPoint={currentPoint}
                      flightData={flightData}
                      currentIndex={currentIndex}
                      onSelectIndex={setCurrentIndex}
                      visibleData={visibleData}
                      startIndex={startIndex}
                      endIndex={endIndex}
                    />
                  </div>
                ) : (
                  <div className="flex-grow overflow-hidden flex flex-col">
                    {/* Core Icing Products Component Grid */}
                    <div className="grid grid-cols-2 gap-3 flex-grow overflow-y-auto pr-1 custom-scrollbar">
                      {filteredAlgorithms.map((algo) => {
                        const isMapped = algo.id === mappedAlgorithmId;
                        const config = configs[algo.id];

                        return (
                          <ProductCard
                            key={algo.id}
                            algorithm={algo}
                            flightData={flightData}
                            visibleData={visibleData}
                            currentIndex={currentIndex}
                            hoveredIndex={hoveredIndex}
                            onHoverIndex={setHoveredIndex}
                            onSelectIndex={setCurrentIndex}
                            config={config}
                            onChangeConfig={(newCfg) => handleUpdateConfig(algo.id, newCfg)}
                            isMappedOnMap={isMapped}
                            onMapToTrajectory={() => setMappedAlgorithmId(algo.id)}
                            systemMode={systemMode}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* Unified Timeline & Range Brush Component (Spans across all widths) */}
          <div className="h-auto pb-1 shrink-0">
            <TimeSlider
              flightData={flightData}
              currentIndex={currentIndex}
              onSelectIndex={setCurrentIndex}
              startIndex={startIndex}
              endIndex={endIndex}
              onChangeRange={(start, end) => {
                setStartIndex(start);
                setEndIndex(end);
                // Make sure current scrub index stays in bounds
                if (currentIndex < start) setCurrentIndex(start);
                if (currentIndex > end) setCurrentIndex(end);
              }}
              systemMode={systemMode}
              selectedFlightId={selectedFlightId}
              intervalVal={intervalVal}
              onChangeInterval={setIntervalVal}
              liveMaxIndex={liveMaxIndex}
            />
          </div>

        </div>

        {/* Operating System Styled Footer status bar */}
        <div className="bg-[#1A1A1C] border-t border-[#2A2A2C] px-4 py-1.5 flex items-center justify-between text-[12px] font-mono text-white/40 shrink-0">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34C759]"></span>
              演示系统状态: 运行正常
            </span>
            <span>数据源: 动态气象仿真数据</span>
            <span>数据更新情况: 正常</span>
          </div>
        </div>

      </div>

    </div>
  );
}
