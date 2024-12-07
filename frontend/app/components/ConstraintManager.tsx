"use client";

import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { constraintsApi } from '../lib/api';
import { toast } from '@/components/ui/use-toast';

interface Constraints {
  maxPeriodsPerWeek: number;
  maxPeriodsPerDay: number;
  maxConsecutivePeriods: number;
  avoidConsecutivePeriods: boolean;
  blackoutPeriods: string[];
}

const defaultConstraints: Constraints = {
  maxPeriodsPerWeek: 15,
  maxPeriodsPerDay: 4,
  maxConsecutivePeriods: 2,
  avoidConsecutivePeriods: true,
  blackoutPeriods: [],
};

export function ConstraintManager() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [constraints, setConstraints] = useState<Constraints>(defaultConstraints);

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

  const handleBlackoutPeriodsChange = (value: string) => {
    // Parse the input string into an array of blackout periods
    const periods = value.split(',').map(p => p.trim()).filter(Boolean);
    setConstraints(prev => ({
      ...prev,
      blackoutPeriods: periods,
    }));
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
            <Label htmlFor="blackoutPeriods">Blackout Periods</Label>
            <Input
              id="blackoutPeriods"
              placeholder="e.g., Monday 1-3, Tuesday 4"
              value={constraints.blackoutPeriods.join(', ')}
              onChange={(e) => handleBlackoutPeriodsChange(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              Enter periods as "Day Period" or "Day Period-Period" separated by commas
            </p>
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