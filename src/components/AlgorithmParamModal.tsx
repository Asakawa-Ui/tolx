import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Check, AlertCircle, Sliders } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { SystemAlgorithmItem } from '../types';

interface AlgorithmParamModalProps {
  isOpen: boolean;
  onClose: () => void;
  algorithm: SystemAlgorithmItem | null;
  currentParams: Record<string, number>;
  onSave: (algoId: string, newParams: Record<string, number>) => void;
}

export default function AlgorithmParamModal({
  isOpen,
  onClose,
  algorithm,
  currentParams,
  onSave
}: AlgorithmParamModalProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && algorithm) {
      const initial: Record<string, string> = {};
      algorithm.paramDefs?.forEach(def => {
        const val = currentParams[def.key] ?? def.defaultValue;
        initial[def.key] = String(val);
      });
      setFormValues(initial);
      setErrorMsg(null);
    }
  }, [isOpen, algorithm, currentParams]);

  if (!isOpen || !algorithm) return null;

  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({ ...prev, [key]: value }));
    setErrorMsg(null);
  };

  const handleResetToDefault = () => {
    if (!algorithm.paramDefs) return;
    const defaults: Record<string, string> = {};
    algorithm.paramDefs.forEach(def => {
      defaults[def.key] = String(def.defaultValue);
    });
    setFormValues(defaults);
    setErrorMsg(null);
  };

  const handleSave = () => {
    if (!algorithm.paramDefs) return;

    const validated: Record<string, number> = {};
    for (const def of algorithm.paramDefs) {
      const rawVal = formValues[def.key];
      if (rawVal === undefined || rawVal.trim() === '') {
        setErrorMsg(`参数「${def.name}」不能为空，请输入有效数值。`);
        return;
      }

      const numVal = Number(rawVal);
      if (isNaN(numVal)) {
        setErrorMsg(`参数「${def.name}」必须为合法数字。`);
        return;
      }

      if (numVal < def.min || numVal > def.max) {
        setErrorMsg(`参数「${def.name}」取值范围应在 ${def.min} ~ ${def.max} ${def.unit} 之间。`);
        return;
      }

      validated[def.key] = numVal;
    }

    onSave(algorithm.id, validated);
    onClose();
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none animate-in fade-in duration-100"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`w-[560px] max-w-[calc(100vw-32px)] rounded-md border shadow-2xl overflow-hidden flex flex-col font-mono text-xs ${
          isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#141416] border-[#2A2A2C] text-white'
        }`}
        style={{
          width: '560px',
          minWidth: '560px'
        }}
      >
        {/* Modal Header */}
        <div className={`flex items-center justify-between px-4 py-3 border-b shrink-0 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <div className="flex items-center gap-2">
            <Sliders size={15} className={isLight ? 'text-[#0284C7]' : 'text-[#00E5FF]'} />
            <span className="font-bold text-sm tracking-wide">算法参数配置</span>
            <span className={`text-[11px] px-1.5 py-0.2 rounded ${
              isLight ? 'bg-[#E2E0DB] text-[#52525B]' : 'bg-white/10 text-white/60'
            }`}>
              {algorithm.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className={`p-1 rounded transition-colors cursor-pointer ${
              isLight ? 'text-[#71717A] hover:text-[#18181B] hover:bg-[#E2E0DB]' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
            title="关闭"
          >
            <X size={15} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* 顶部版本信息：保留一个左对齐文字“当前版本：……”即可 */}
          <div className={`text-xs ${isLight ? 'text-[#52525B]' : 'text-white/60'}`}>
            当前版本：{algorithm.version}
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            {algorithm.paramDefs?.map(def => (
              <div 
                key={def.key}
                className={`p-3 rounded border flex items-center justify-between gap-2 ${
                  isLight ? 'bg-[#FAFAF8] border-[#E4E3DE]' : 'bg-[#171719] border-[#2A2A2C]'
                }`}
              >
                <label className="font-bold text-[12px] flex items-center gap-1.5">
                  <span>{def.name}</span>
                </label>
                <div className="flex items-center gap-1.5 shrink-0">
                  <input
                    type="number"
                    step={def.step ?? 1}
                    min={def.min}
                    max={def.max}
                    value={formValues[def.key] ?? ''}
                    onChange={(e) => handleInputChange(def.key, e.target.value)}
                    className={`w-28 px-2.5 py-1.5 rounded border text-right font-mono font-bold text-xs outline-none transition-all ${
                      isLight
                        ? 'bg-white border-[#D5D3CE] focus:border-[#0284C7] focus:ring-1 focus:ring-[#0284C7]'
                        : 'bg-black/40 border-[#2A2A2C] text-white focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF]'
                    }`}
                  />
                  <span className={`text-[11px] font-bold w-7 ${isLight ? 'text-[#71717A]' : 'text-white/50'}`}>
                    {def.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Validation Error Message */}
          {errorMsg && (
            <div className="p-2.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-500 flex items-center gap-2 text-[11px] animate-in fade-in">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 说明文案：无容器包裹 */}
          <div className={`text-[11px] leading-relaxed ${isLight ? 'text-[#71717A]' : 'text-white/50'}`}>
            说明：参数调整后立即生效，并仅影响版本生效时间之后
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-between px-4 py-3 border-t shrink-0 ${
          isLight ? 'bg-[#ECEBE7] border-[#D5D3CE]' : 'bg-[#1A1A1C] border-[#2A2A2C]'
        }`}>
          <button
            type="button"
            onClick={handleResetToDefault}
            className={`px-2.5 py-1.5 rounded text-[11px] font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isLight
                ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#52525B] hover:text-[#18181B] hover:bg-[#E2E0DB]'
                : 'bg-black/30 border-[#2A2A2C] text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <RotateCcw size={12} />
            <span>恢复默认</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-3 py-1.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                isLight
                  ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#52525B] hover:bg-[#E2E0DB]'
                  : 'bg-white/5 border-[#2A2A2C] text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`px-3.5 py-1.5 rounded text-[11px] font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                isLight
                  ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white'
                  : 'bg-[#0A84FF] hover:bg-[#0070E0] text-white'
              }`}
            >
              <Check size={12} />
              <span>保存配置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
