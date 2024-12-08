"use client";

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { constraintsApi } from '../lib/api';
import { toast } from '@/components/ui/use-toast';
import { BlackoutCalendar } from './BlackoutCalendar';

interface Constraints {
  maxPeriodsPerWeek: number;
  maxPeriodsPerDay: number;
  maxConsecutivePeriods: number;
  avoidConsecutivePeriods: boolean;
  blackoutPeriods: { date: string; period: number }[];
}

const defaultConstraints: Constraints = {
  maxPeriodsPerWeek: 15,
  maxPeriodsPerDay: 4,
  maxConsecutivePeriods: 2,
  avoidConsecutivePeriods: true,
  blackoutPeriods: [],
};

const periods = [1, 2, 3, 4, 5, 6, 7, 8];

export function ConstraintManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [constraints, setConstraints] = useState<Constraints>(defaultConstraints);
  const [history, setHistory] = useState<Constraints[]>([defaultConstraints]);
  const [historyIndex, setHistoryIndex] = useState(0);

  useEffect(() => {
    loadConstraints();
  }, []);

  const loadConstraints = async () => {
    try {
      setLoading(true);
      const fetchedConstraints = await constraintsApi.get();
      setConstraints(fetchedConstraints || defaultConstraints);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load constraints",
        variant: "destructive",
      });
      setConstraints(defaultConstraints);
    } finally {
      setLoading(false);
    }
  };

  const saveConstraints = async () => {
    try {
      setSaving(true);
      // Validate constraints before saving
      const validationResult = await constraintsApi.validate(constraints);
      if (!validationResult.valid) {
        toast({
          title: "Validation Error",
          description: validationResult.errors.join(', '),
          variant: "destructive",
        });
        return;
      }

      // Save constraints if validation passes
      const updatedConstraints = await constraintsApi.update(constraints);
      setConstraints(updatedConstraints);
      toast({
        title: "Success",
        description: "Constraints saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save constraints",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addToHistory = (newConstraints: Constraints) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newConstraints);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setConstraints(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setConstraints(history[historyIndex + 1]);
    }
  };

  const toggleBlackoutPeriod = (date: string, period: number) => {
    const newConstraints = { ...constraints };
    const existingIndex = newConstraints.blackoutPeriods.findIndex(
      bp => bp.date === date && bp.period === period
    );

    if (existingIndex > -1) {
      newConstraints.blackoutPeriods.splice(existingIndex, 1);
    } else {
      newConstraints.blackoutPeriods.push({ date, period });
    }

    setConstraints(newConstraints);
    addToHistory(newConstraints);
  };

  const toggleFullDay = (date: string) => {
    const newConstraints = { ...constraints };
    const isFullDayBlackedOut = periods.every((period: number) =>
      constraints.blackoutPeriods.some(bp => bp.date === date && bp.period === period)
    );

    if (isFullDayBlackedOut) {
      // Remove all periods for this day
      newConstraints.blackoutPeriods = constraints.blackoutPeriods.filter(bp => bp.date !== date);
    } else {
      // Add all periods for this day
      const periodsToAdd = periods
        .filter((period: number) => !constraints.blackoutPeriods.some(bp => bp.date === date && bp.period === period))
        .map((period: number) => ({ date, period }));
      newConstraints.blackoutPeriods = [...constraints.blackoutPeriods, ...periodsToAdd];
    }

    setConstraints(newConstraints);
    addToHistory(newConstraints);
  };

  const togglePeriodForWeek = (period: number, weekStart: Date) => {
    const weekDates = Array.from({ length: 5 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date.toISOString().split('T')[0];
    });

    const allPeriodsForWeekExist = weekDates.every(date =>
      constraints.blackoutPeriods.some(bp => bp.date === date && bp.period === period)
    );

    const newConstraints = { ...constraints };
    if (allPeriodsForWeekExist) {
      // Remove all instances of this period for the week
      newConstraints.blackoutPeriods = constraints.blackoutPeriods.filter(
        bp => !weekDates.includes(bp.date) || bp.period !== period
      );
    } else {
      // Add this period for all days in the week that don't already have it
      const periodsToAdd = weekDates
        .filter(date => !constraints.blackoutPeriods.some(bp => bp.date === date && bp.period === period))
        .map(date => ({ date, period }));
      newConstraints.blackoutPeriods = [...constraints.blackoutPeriods, ...periodsToAdd];
    }

    setConstraints(newConstraints);
    addToHistory(newConstraints);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Constraint Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="maxPeriodsPerWeek">Max Periods Per Week</Label>
            <Input
              id="maxPeriodsPerWeek"
              type="number"
              value={constraints.maxPeriodsPerWeek}
              onChange={(e) => setConstraints(prev => ({
                ...prev,
                maxPeriodsPerWeek: Number(e.target.value),
              }))}
              min={1}
              max={40}
            />
          </div>
          <div>
            <Label htmlFor="maxPeriodsPerDay">Max Periods Per Day</Label>
            <Input
              id="maxPeriodsPerDay"
              type="number"
              value={constraints.maxPeriodsPerDay}
              onChange={(e) => setConstraints(prev => ({
                ...prev,
                maxPeriodsPerDay: Number(e.target.value),
              }))}
              min={1}
              max={8}
            />
          </div>
          <div>
            <Label htmlFor="maxConsecutivePeriods">Max Consecutive Periods</Label>
            <Input
              id="maxConsecutivePeriods"
              type="number"
              value={constraints.maxConsecutivePeriods}
              onChange={(e) => setConstraints(prev => ({
                ...prev,
                maxConsecutivePeriods: Number(e.target.value),
              }))}
              min={1}
              max={8}
            />
          </div>
          <div className="flex items-center">
            <Switch
              id="avoidConsecutivePeriods"
              checked={constraints.avoidConsecutivePeriods}
              onCheckedChange={(checked) => setConstraints(prev => ({
                ...prev,
                avoidConsecutivePeriods: checked,
              }))}
            />
            <Label htmlFor="avoidConsecutivePeriods" className="ml-2">
              Avoid Consecutive Periods
            </Label>
          </div>
          <div>
            <Label>Blackout Periods</Label>
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyIndex === 0}
              >
                Undo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={historyIndex === history.length - 1}
              >
                Redo
              </Button>
            </div>
            <BlackoutCalendar
              blackoutPeriods={constraints.blackoutPeriods}
              onToggleBlackout={toggleBlackoutPeriod}
              onToggleFullDay={toggleFullDay}
              onTogglePeriodForWeek={togglePeriodForWeek}
            />
          </div>
          <Button 
            onClick={saveConstraints} 
            disabled={saving}
            className={saving ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {saving ? 'Saving...' : 'Save Constraints'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 