import React, { useState, useMemo } from 'react';
import { Clock, X } from 'lucide-react';
import { useTheme } from '../ThemeContext';

export interface DateRangePickerProps {
  startDate: string | null;
  endDate: string | null;
  onChange: (startDate: string | null, endDate: string | null) => void;
  flightCountMap?: Record<string, number>;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  align?: 'left' | 'right';
  popoverWidth?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  flightCountMap = {},
  placeholder = '全部历史日期',
  allowClear = true,
  className = '',
  align = 'left',
  popoverWidth = 'w-[280px]'
}: DateRangePickerProps) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [isCalendarOpen, setIsCalendarOpen] = useState<boolean>(false);

  // Initial year/month based on startDate or current/mock date (2026-07)
  const [calendarYear, setCalendarYear] = useState<number>(() => {
    if (startDate) {
      const y = parseInt(startDate.substring(0, 4), 10);
      if (!isNaN(y)) return y;
    }
    return 2026;
  });

  const [calendarMonth, setCalendarMonth] = useState<number>(() => {
    if (startDate) {
      const m = parseInt(startDate.substring(5, 7), 10);
      if (!isNaN(m)) return m - 1;
    }
    return 6; // July
  });

  const [calendarView, setCalendarView] = useState<'days' | 'months' | 'years'>('days');
  const [yearPageStart, setYearPageStart] = useState<number>(2020);

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
    const startOffset = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sunday
    const days: Array<{ day: number | null; dateString: string }> = [];

    // Empty offset slots
    for (let i = 0; i < startOffset; i++) {
      days.push({ day: null, dateString: '' });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const yearStr = calendarYear.toString();
      const monthStr = (calendarMonth + 1).toString().padStart(2, '0');
      const dayStr = d.toString().padStart(2, '0');
      days.push({
        day: d,
        dateString: `${yearStr}-${monthStr}-${dayStr}`
      });
    }

    return days;
  }, [calendarYear, calendarMonth]);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null, null);
  };

  const handleSelectDay = (dateString: string) => {
    if (!startDate || (startDate && endDate)) {
      onChange(dateString, null);
    } else {
      if (dateString < startDate) {
        onChange(dateString, null);
      } else {
        onChange(startDate, dateString);
      }
    }
  };

  const displayText = useMemo(() => {
    if (!startDate) return placeholder;
    if (!endDate || startDate === endDate) return startDate;
    return `${startDate} 至 ${endDate}`;
  }, [startDate, endDate, placeholder]);

  return (
    <div className={`relative ${className}`}>
      {/* Backdrop for closing popover */}
      {isCalendarOpen && (
        <div 
          className="fixed inset-0 z-30 cursor-default" 
          onClick={() => {
            setIsCalendarOpen(false);
            setCalendarView('days');
          }} 
        />
      )}

      {/* Trigger Button */}
      <div className="relative z-30 inline-block w-full">
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
          <div className="flex items-center gap-1.5 truncate mr-1">
            <Clock size={12} className={isLight ? "text-[#0284C7]" : "text-[#0A84FF]"} />
            <span className="font-bold truncate">{displayText}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {allowClear && (startDate || endDate) && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className={`p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 ${
                  isLight ? 'text-[#71717A] hover:text-[#18181B]' : 'text-white/40 hover:text-white'
                }`}
                title="清空筛选（查看全部）"
              >
                <X size={10} />
              </span>
            )}
            <span className={`text-[9px] ${isLight ? 'text-[#71717A]' : 'text-white/40'}`}>
              {isCalendarOpen ? '▲' : '▼'}
            </span>
          </div>
        </button>

        {/* Calendar Popover */}
        {isCalendarOpen && (
          <div 
            className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-1 z-40 border rounded-sm p-3 shadow-2xl font-mono ${popoverWidth} ${
              isLight ? 'bg-[#FAFAF8] border-[#D5D3CE] text-[#18181B]' : 'bg-[#121214] border-[#2A2A2C] text-white'
            }`}
          >
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
                    const isStart = startDate === item.dateString;
                    const isEnd = endDate === item.dateString;
                    const isInRange = Boolean(
                      startDate && endDate && item.dateString > startDate && item.dateString < endDate
                    );
                    const isSelected = isStart || isEnd;

                    return (
                      <button
                        key={item.dateString}
                        type="button"
                        onClick={() => handleSelectDay(item.dateString)}
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

                {/* Popover Footer: Quick Actions */}
                <div className={`mt-2.5 pt-2 border-t flex items-center justify-between text-[10px] ${
                  isLight ? 'border-[#E4E3DE]' : 'border-[#2A2A2C]/50'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null, null);
                      setIsCalendarOpen(false);
                    }}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      isLight ? 'text-[#0284C7] hover:bg-sky-50' : 'text-[#0A84FF] hover:bg-white/5'
                    }`}
                  >
                    全部历史日期
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCalendarOpen(false);
                      setCalendarView('days');
                    }}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      isLight ? 'bg-[#ECEBE7] text-[#18181B] hover:bg-[#E2E0DB]' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    完成
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
