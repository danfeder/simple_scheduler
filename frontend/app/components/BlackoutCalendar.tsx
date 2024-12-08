"use client";

import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ArrowRightLeft, Ban, Check, ArrowDownUp, ArrowLeftRight } from 'lucide-react';

interface BlackoutPeriod {
  date: string;
  period: number;
}

interface BlackoutCalendarProps {
  blackoutPeriods: BlackoutPeriod[];
  onToggleBlackout: (date: string, period: number) => void;
  onToggleFullDay: (date: string) => void;
  onTogglePeriodForWeek: (period: number, weekStart: Date) => void;
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

export function BlackoutCalendar({
  blackoutPeriods,
  onToggleBlackout,
  onToggleFullDay,
  onTogglePeriodForWeek
}: BlackoutCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ date: string; period: number } | null>(null);
  const [dragOperation, setDragOperation] = useState<'add' | 'remove' | null>(null);

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const isBlackedOut = useCallback((date: string, period: number) =>
    blackoutPeriods.some(bp => bp.date === date && bp.period === period),
  [blackoutPeriods]);

  const isFullDayBlackedOut = useCallback((date: string) =>
    periods.every(period => isBlackedOut(date, period)),
  [isBlackedOut]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeekStart(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const handleMouseDown = (date: string, period: number) => {
    setIsDragging(true);
    setDragStart({ date, period });
    setDragOperation(isBlackedOut(date, period) ? 'remove' : 'add');
    onToggleBlackout(date, period);
  };

  const handleMouseEnter = (date: string, period: number) => {
    if (isDragging && dragStart && dragOperation) {
      const isCurrentlyBlackedOut = isBlackedOut(date, period);
      if (dragOperation === 'add' && !isCurrentlyBlackedOut) {
        onToggleBlackout(date, period);
      } else if (dragOperation === 'remove' && isCurrentlyBlackedOut) {
        onToggleBlackout(date, period);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
    setDragOperation(null);
  };

  React.useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const formatDateHeader = (date: Date) => {
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();
    return `${month}/${day}`;
  };

  const isPeriodFullyBlackedOut = useCallback((period: number) => {
    const weekDates = days.map((_, index) => {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + index);
      return formatDate(date);
    });
    return weekDates.every(date => 
      blackoutPeriods.some(bp => bp.date === date && bp.period === period)
    );
  }, [blackoutPeriods, currentWeekStart]);

  return (
    <Card className="w-full overflow-x-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          Week of {currentWeekStart.toLocaleDateString()}
        </CardTitle>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous week</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next week</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-[auto_repeat(5,1fr)] gap-2 mb-2">
          <div className="w-20"></div>
          {days.map((day, index) => {
            const date = new Date(currentWeekStart);
            date.setDate(currentWeekStart.getDate() + index);
            const dateString = formatDate(date);
            const isBlocked = isFullDayBlackedOut(dateString);
            return (
              <div key={day} className="text-center">
                <div className="font-semibold">{day}</div>
                <div className="text-sm text-gray-500 mb-1">{formatDateHeader(date)}</div>
                <Button
                  variant={isBlocked ? "default" : "outline"}
                  size="sm"
                  onClick={() => onToggleFullDay(dateString)}
                  className="gap-1"
                  title={`${isBlocked ? "Unblock" : "Block"} all periods on ${day}`}
                >
                  {isBlocked ? (
                    <>
                      <Check className="h-3 w-3" />
                      <ArrowDownUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <Ban className="h-3 w-3" />
                      <ArrowDownUp className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {periods.map(period => (
            <div key={period} className="grid grid-cols-[auto_repeat(5,1fr)] gap-2">
              <div className="w-20 flex items-center justify-center">
                <Button
                  variant={isPeriodFullyBlackedOut(period) ? "default" : "outline"}
                  size="sm"
                  className="gap-1"
                  onClick={() => onTogglePeriodForWeek(period, currentWeekStart)}
                  title={`${isPeriodFullyBlackedOut(period) ? "Unblock" : "Block"} Period ${period} across all days`}
                >
                  {isPeriodFullyBlackedOut(period) ? (
                    <>
                      <Check className="h-3 w-3" />
                      <ArrowLeftRight className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <Ban className="h-3 w-3" />
                      <ArrowLeftRight className="h-3 w-3" />
                    </>
                  )}
                </Button>
              </div>
              {days.map((day, index) => {
                const date = new Date(currentWeekStart);
                date.setDate(currentWeekStart.getDate() + index);
                const dateString = formatDate(date);
                const isBlocked = isBlackedOut(dateString, period);
                return (
                  <div
                    key={`${day}-${period}`}
                    className={`
                      h-10 rounded transition-all
                      flex items-center justify-center
                      cursor-pointer
                      ${isBlocked 
                        ? 'bg-foreground text-background border-foreground hover:bg-foreground/80 hover:border-2' 
                        : 'bg-background hover:bg-foreground/10 hover:border-foreground hover:border-2 border-border'
                      }
                      border
                      ${isDragging ? 'select-none' : ''}
                    `}
                    onMouseDown={() => handleMouseDown(dateString, period)}
                    onMouseEnter={() => handleMouseEnter(dateString, period)}
                    role="button"
                    tabIndex={0}
                    title={`${day}, Period ${period}`}
                  >
                    <span className="text-base font-medium">
                      {period}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 