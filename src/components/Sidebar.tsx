import React, { useMemo } from 'react';
import { FlightDataPoint, IcingAlgorithmDef, ProductConfig, SystemLog } from '../types';
import { Plane, Compass, ArrowUpRight, Shield, AlertTriangle, Cpu, Terminal, RefreshCcw } from 'lucide-react';

interface SidebarProps {
  currentPoint: FlightDataPoint;
  algorithms: IcingAlgorithmDef[];
  configs: Record<string, ProductConfig>;
  mappedAlgorithmId: string;
  onSelectAlgorithm: (id: string) => void;
  flightData: FlightDataPoint[];
}

export default function Sidebar({
  currentPoint,
  algorithms,
  configs,
  mappedAlgorithmId,
  onSelectAlgorithm,
  flightData
}: SidebarProps) {

  // Dynamic status calculated from icing values
  const activeMappedOutput = currentPoint?.algorithms[mappedAlgorithmId];
  const activeConfig = configs[mappedAlgorithmId];

  const icingStatusInfo = useMemo(() => {
    if (!activeMappedOutput || !activeConfig) return { label: '无风险', color: '#10b981', desc: '大气参数处于安全无积冰区间' };
    const val = activeMappedOutput.value;
    const th = activeConfig.thresholds;

    if (val >= th.severe) {
      return { 
        label: '极重积冰 (SEVERE)', 
        color: activeConfig.colors.severe, 
        desc: '超过安全裕度！极易导致升力骤降，建议防冰加温并调整高度脱离积冰云层' 
      };
    }
    if (val >= th.moderate) {
      return { 
        label: '中度积冰 (MODERATE)', 
        color: activeConfig.colors.moderate, 
        desc: '持续积冰警告。请监控空速和迎角，必要时开启气动翼面除冰 boots' 
      };
    }
    if (val >= th.light) {
      return { 
        label: '轻度积冰 (LIGHT)', 
        color: activeConfig.colors.light, 
        desc: '边缘微物理水滴。有轻微霜冰附着，系统状态在正常防冰容许范围' 
      };
    }
    return { 
      label: '无积冰 (NONE)', 
      color: activeConfig.colors.none, 
      desc: '当前未监测到可量化的过冷液态水及积冰风险，飞行姿态稳定' 
    };
  }, [activeMappedOutput, activeConfig]);

  // Event Logs matching flight times
  const systemLogs: SystemLog[] = useMemo(() => {
    const logs: SystemLog[] = [
      { id: '1', time: '12:00:00', message: 'ZSPD 上海浦东机场起飞就绪，仪表系统初始化完毕', type: 'info' },
      { id: '2', time: '12:03:00', message: '爬升率稳定，当前高度 2800m，外界大气温度 +12°C', type: 'success' },
      { id: '3', time: '12:12:00', message: '爬升至巡航高度 7500m，处于无积冰稳定平飞状态', type: 'info' },
      { id: '4', time: '12:16:00', message: '外界环境变化：进入冷锋过冷云水带，外界温度骤降至 -9°C', type: 'warning' },
      { id: '5', time: '12:19:00', message: '温湿廓线法 触发轻度积冰风险预警', type: 'warning' },
      { id: '6', time: '12:22:00', message: '云水含量超标。微物理算法均触发中度积冰风险阈值', type: 'danger' },
      { id: '7', time: '12:25:00', message: '振动圆柱物理探头检测到实际冰层聚积。表面冰厚增加中...', type: 'danger' },
      { id: '8', time: '12:31:00', message: '触发应急防冰程序：发动机进气道及机翼前缘防冰加温 boots 开启', type: 'danger' },
      { id: '9', time: '12:34:00', message: '振动圆柱探头反馈冰阻熔化，积冰厚度骤降，系统负荷恢复正常', type: 'success' },
      { id: '10', time: '12:38:00', message: '穿越冰云带核心。外界水分减少。算法数值转入中轻度范围', type: 'warning' },
      { id: '11', time: '12:43:00', message: '完全飞出锋面层。外界湿度降至 30%。大气积冰条件消退', type: 'success' },
      { id: '12', time: '12:49:00', message: 'ZBAA 北京首都机场进近，高度持续下降，气温回升', type: 'info' },
    ];

    // Filter logs that are smaller or equal to the current step time
    if (!currentPoint) return logs;
    return logs.filter(log => log.time <= currentPoint.time);
  }, [currentPoint]);

  return (
    <div className="bg-[#121214] border border-[#2A2A2C] rounded-sm p-4 grid grid-cols-3 gap-4 font-mono select-none w-full" id="dashboard-sidebar">
      
      {/* SECTION 1: Active Avionics Telemetry */}
      <div className="flex flex-col justify-between space-y-2 h-full">
        <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1 pb-1 border-b border-[#2A2A2C]">
          <Plane size={11} />
          <span>飞行实时数据</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs flex-grow mt-2">
          {/* Altitude */}
          <div className="bg-[#1A1A1C] border border-[#2A2A2C] p-2 rounded-sm flex flex-col justify-center">
            <span className="text-[9px] text-white/40">飞行高度</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold text-white">{currentPoint?.altitude || '---'}</span>
              <span className="text-[9px] text-white/40">米</span>
            </div>
          </div>

          {/* Speed */}
          <div className="bg-[#1A1A1C] border border-[#2A2A2C] p-2 rounded-sm flex flex-col justify-center">
            <span className="text-[9px] text-white/40">真空速</span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-sm font-bold text-white">{currentPoint?.speed || '---'}</span>
              <span className="text-[9px] text-white/40">千米/小时</span>
            </div>
          </div>

          {/* GPS Coordinates */}
          <div className="bg-[#1A1A1C] border border-[#2A2A2C] p-2 rounded-sm col-span-2 flex flex-col justify-center">
            <span className="text-[9px] text-white/40">当前经纬度坐标</span>
            <div className="flex justify-between items-center mt-1 text-[11px]">
              <span className="text-[#E0E0E0] font-bold">纬度: {currentPoint?.latitude || '---'}°N</span>
              <span className="text-[#E0E0E0] font-bold">经度: {currentPoint?.longitude || '---'}°E</span>
            </div>
          </div>

          {/* Compass / Heading */}
          <div className="bg-[#1A1A1C] border border-[#2A2A2C] p-2 rounded-sm col-span-2 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] text-white/40">磁航向</span>
              <span className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
                <Compass size={14} className="text-white/60" style={{ transform: `rotate(${currentPoint?.heading || 0}deg)` }} />
                {currentPoint?.heading || '0'}° 航向
              </span>
            </div>
            {/* Visual Mini Compass Graphic */}
            <div className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center relative shrink-0">
              <span className="text-[7px] text-white/30 absolute -top-1">N</span>
              <div 
                className="w-0.5 h-7 bg-white relative transition-transform duration-200"
                style={{ transform: `rotate(${currentPoint?.heading || 0}deg)` }}
              >
                <div className="w-1.5 h-1.5 bg-[#FF3B30] rounded-full absolute -top-0.5 left-1/2 transform -translate-x-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: Active Mapping Status Indicator */}
      <div className="bg-[#1A1A1C] border border-[#2A2A2C] p-3 rounded-sm flex flex-col justify-between space-y-2 h-full">
        <div>
          <div className="flex justify-between items-center pb-1 border-b border-[#2A2A2C] mb-2">
            <span className="text-[9px] text-white/40 font-bold uppercase">地图映射积冰风险状态</span>
            <Shield size={12} style={{ color: icingStatusInfo.color }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight" style={{ color: icingStatusInfo.color }}>
              {icingStatusInfo.label}
            </span>
            <span className="text-[10px] text-white/40 font-bold">
              （当前监测值: {activeMappedOutput?.value ?? 0}）
            </span>
          </div>
          <p className="text-[10px] text-white/60 leading-relaxed mt-1.5">
            {icingStatusInfo.desc}
          </p>
        </div>

        {/* Prediction overlay */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] mt-auto">
          <span className="text-white/40">最大安全航程（预测）:</span>
          <span className="text-white font-bold">{currentPoint?.maxDistance} 千米</span>
        </div>
      </div>

      {/* SECTION 4: Terminal Avionics Event Logs */}
      <div className="space-y-1.5 flex flex-col h-full justify-between">
        <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1 pb-1 border-b border-[#2A2A2C]">
          <Terminal size={11} />
          <span>任务运行日志</span>
        </div>

        {/* Scrollable log output window */}
        <div className="bg-black border border-[#2A2A2C] p-2 rounded-sm text-[9px] font-mono leading-relaxed text-white/60 overflow-y-auto h-[160px] flex-grow flex flex-col space-y-1.5 mt-2 select-text">
          {systemLogs.length === 0 ? (
            <div className="text-white/20 text-center py-4">暂无活动日志</div>
          ) : (
            systemLogs.map((log) => {
              let logStyle = 'text-white/40';
              if (log.type === 'warning') logStyle = 'text-[#FF9F0A]';
              else if (log.type === 'danger') logStyle = 'text-[#FF3B30]';
              else if (log.type === 'success') logStyle = 'text-emerald-400';

              return (
                <div key={log.id} className="border-b border-[#2A2A2C]/25 pb-1">
                  <div className="flex justify-between text-white/20 mb-0.5">
                    <span>[{log.time}] 系统运行日志</span>
                    <span>状态: OK</span>
                  </div>
                  <p className={logStyle}>{log.message}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}
