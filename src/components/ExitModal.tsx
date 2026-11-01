import React, { useState, useEffect, useRef } from 'react';
import { LogOut, X, Loader2 } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface ExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
  countdownSeconds?: number;
  onConfirmExit: () => void;
}

export default function ExitModal({
  isOpen,
  onClose,
  isLive,
  countdownSeconds = 5,
  onConfirmExit
}: ExitModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [remainingTime, setRemainingTime] = useState<number>(countdownSeconds);
  const [isShuttingDown, setIsShuttingDown] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset countdown and status whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setIsShuttingDown(false);
      if (isLive) {
        setRemainingTime(countdownSeconds);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setRemainingTime(prev => {
            if (prev <= 1) {
              if (timerRef.current) clearInterval(timerRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setRemainingTime(0);
      }
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, isLive, countdownSeconds]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isLive && remainingTime > 0) return;
    setIsShuttingDown(true);

    // Give visual feedback for graceful task termination & storage saving
    setTimeout(() => {
      onConfirmExit();
    }, 800);
  };

  const handleCancel = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none animate-in fade-in duration-100">
      <div 
        className={`w-[480px] max-w-[95vw] rounded-md border shadow-2xl overflow-hidden flex flex-col font-mono text-xs ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#18181A] border-[#2A2A2C] text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#141416] border-[#2A2A2C]'
        }`}>
          <div className="font-bold text-sm">
            <span>确认退出软件？</span>
          </div>
          <button
            onClick={handleCancel}
            disabled={isShuttingDown}
            className={`p-1 rounded transition-colors cursor-pointer disabled:opacity-40 ${
              isLight ? 'hover:bg-[#DFDDD8] text-zinc-500' : 'hover:bg-white/10 text-white/50'
            }`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {isShuttingDown ? (
            <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
              <Loader2 size={28} className="animate-spin text-amber-500" />
              <div className="font-bold text-sm">正在执行数据保存与后台任务关闭...</div>
              <div className={`text-[11px] ${isLight ? 'text-zinc-500' : 'text-white/50'}`}>
                正在保存算法参数与面板配置，安全切断实时数据流...
              </div>
            </div>
          ) : isLive ? (
            /* Live mode risk warning - unboxed clean paragraph */
            <div className="py-1">
              <p className={`text-[13px] leading-relaxed ${isLight ? 'text-zinc-700' : 'text-white/80'}`}>
                当前正在接收实况观测数据。退出软件将中断实时数据接入、质量控制、算法计算及数据存储，可能影响本次飞行任务的数据完整性。
              </p>
            </div>
          ) : (
            /* History / ordinary exit prompt */
            <div className="py-1">
              <p className={`text-[13px] leading-relaxed ${isLight ? 'text-zinc-700' : 'text-white/80'}`}>
                当前处于历史数据回放模式，无实况数据接入。确定要关闭并退出「飞机积冰协同态势监测与预测系统」客户端吗？
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!isShuttingDown && (
          <div className={`flex items-center justify-end gap-3 px-4 py-3 border-t ${
            isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#141416] border-[#2A2A2C]'
          }`}>
            <button
              type="button"
              onClick={handleCancel}
              className={`px-4 py-1.5 rounded transition-colors cursor-pointer font-bold ${
                isLight ? 'hover:bg-[#DFDDD8] text-zinc-700 bg-white border border-[#D5D3CE]' : 'hover:bg-white/10 text-white/70 bg-white/5 border border-white/10'
              }`}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLive && remainingTime > 0}
              className={`px-4 py-1.5 rounded transition-all font-bold flex items-center gap-1.5 ${
                isLive && remainingTime > 0
                  ? (isLight ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300' : 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10')
                  : 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm cursor-pointer active:scale-95'
              }`}
            >
              <LogOut size={13} />
              <span>
                {isLive && remainingTime > 0
                  ? `确认退出（${remainingTime} 秒后可操作）`
                  : '确认退出'}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
