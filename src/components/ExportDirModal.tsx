import React, { useState } from 'react';
import { FolderOpen, X, Copy, Check, Sliders, AlertTriangle, ExternalLink } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface ExportDirModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportPath: string;
  onOpenExportSettings: () => void;
}

export default function ExportDirModal({
  isOpen,
  onClose,
  exportPath,
  onOpenExportSettings
}: ExportDirModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Simple validation: check if path is empty or contains illegal filesystem characters
  const trimmed = (exportPath || '').trim();
  const hasIllegalChars = /[<>:"|?*]/.test(trimmed.replace(/^[a-zA-Z]:/, '')); // allow drive colon
  const isPathValid = Boolean(trimmed) && !hasIllegalChars && (trimmed.startsWith('/') || /^[a-zA-Z]:[/\\]/.test(trimmed));

  const handleCopyPath = () => {
    if (!trimmed) return;
    navigator.clipboard.writeText(trimmed).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.warn('Clipboard write failed:', err);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none animate-in fade-in duration-100">
      <div 
        className={`w-[500px] max-w-[95vw] rounded-md border shadow-2xl overflow-hidden flex flex-col font-mono text-xs ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#18181A] border-[#2A2A2C] text-white'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#141416] border-[#2A2A2C]'
        }`}>
          <div className="flex items-center gap-2 font-bold text-sm">
            {isPathValid ? (
              <FolderOpen size={16} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
            ) : (
              <AlertTriangle size={16} className="text-amber-500" />
            )}
            <span>{isPathValid ? '系统默认导出目录' : '导出目录访问异常'}</span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isLight ? 'hover:bg-[#DFDDD8] text-zinc-500' : 'hover:bg-white/10 text-white/50'
            }`}
          >
            <X size={15} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex flex-col gap-4">
          {!isPathValid ? (
            /* Invalid or inaccessible path */
            <div className="flex flex-col gap-3">
              <div className={`p-3.5 rounded border flex items-start gap-3 ${
                isLight ? 'bg-amber-500/10 border-amber-500/30 text-amber-900' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}>
                <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                <div className="flex flex-col gap-1 text-[12px] leading-relaxed">
                  <span className="font-bold">导出目录不存在或无法访问</span>
                  <p>
                    系统检测到当前设置的导出路径【<span className="font-mono underline">{trimmed || '未配置'}</span>】无法访问或格式有误。请检查本地导出路径或在「导出设置」中重新配置。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Valid path display */
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className={isLight ? 'text-zinc-600' : 'text-white/60'}>系统设置中指定的默认存储路径：</span>
                <span className="flex items-center gap-1 text-[#10B981] font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
                  路径状态：正常就绪
                </span>
              </div>

              {/* Path Display Card */}
              <div className={`flex items-center justify-between p-3 rounded border font-mono text-[13px] ${
                isLight ? 'bg-white border-[#D5D3CE] text-zinc-800' : 'bg-black/30 border-white/10 text-emerald-400'
              }`}>
                <div className="truncate select-all pr-2 font-bold tracking-tight">
                  {trimmed}
                </div>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors shrink-0 cursor-pointer ${
                    copied 
                      ? 'bg-emerald-600 text-white' 
                      : (isLight ? 'bg-[#ECEBE7] hover:bg-[#DFDDD8] text-zinc-700' : 'bg-white/10 hover:bg-white/20 text-white')
                  }`}
                  title="复制目录路径"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? '已复制' : '复制路径'}</span>
                </button>
              </div>

              <p className={`text-[11px] leading-relaxed ${isLight ? 'text-zinc-500' : 'text-white/50'}`}>
                💡 提示：在 Web 客户端中受浏览器系统沙箱限制，无法直接静默呼起外部资源管理器窗口。您可点击“复制路径”并在本地文件资源管理器中粘贴打开，或点击下方按钮重新配置。
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className={`flex items-center justify-between px-4 py-3 border-t ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#141416] border-[#2A2A2C]'
        }`}>
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenExportSettings();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors cursor-pointer text-xs ${
              isLight ? 'bg-white hover:bg-[#DFDDD8] text-zinc-700 border border-[#D5D3CE]' : 'bg-white/5 hover:bg-white/10 text-white/80 border border-white/10'
            }`}
          >
            <Sliders size={13} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
            <span>重新配置导出路径...</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-1.5 rounded transition-colors cursor-pointer font-bold ${
              isLight ? 'bg-[#18181B] text-white hover:bg-[#27272A]' : 'bg-white text-black hover:bg-white/90'
            }`}
          >
            {isPathValid ? '知道了' : '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}
