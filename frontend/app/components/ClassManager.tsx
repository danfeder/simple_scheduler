"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from 'lucide-react';
import { classesApi } from '../lib/api';
import { toast } from '@/components/ui/use-toast';
import { Class, Conflict, GradeLevel } from '../../../shared/types';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

export function ClassManager() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const fetchedClasses = await classesApi.getAll();
      setClasses(fetchedClasses);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const importPDF = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      try {
        setLoading(true);
        const importedClasses = await classesApi.importPDF(event.target.files[0]);
        setClasses(importedClasses);
        toast({
          title: "Success",
          description: "Schedule imported successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to import schedule",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleConflict = async (dayIndex: number, periodIndex: number) => {
    if (selectedClass) {
      try {
        const cls = getClassById(selectedClass);
        if (!cls) return;

        // Convert day index and period to Conflict format
        const newConflict: Conflict = {
          dayOfWeek: (dayIndex + 1) as (1 | 2 | 3 | 4 | 5),
          period: (periodIndex + 1) as (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)
        };

        // Check if conflict exists
        const hasConflict = cls.defaultConflicts.some(
          (c: Conflict) => c.dayOfWeek === newConflict.dayOfWeek && c.period === newConflict.period
        );

        // Update conflicts
        const updatedConflicts = hasConflict
          ? cls.defaultConflicts.filter(
              (c: Conflict) => !(c.dayOfWeek === newConflict.dayOfWeek && c.period === newConflict.period)
            )
          : [...cls.defaultConflicts, newConflict];

        const updatedClass = await classesApi.update(selectedClass, {
          ...cls,
          defaultConflicts: updatedConflicts,
        });

        setClasses(classes.map(c => c.id === selectedClass ? updatedClass : c));
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update conflicts",
          variant: "destructive",
        });
      }
    }
  };

  const getClassById = (id: string) => classes.find(cls => cls.id === id);

  const hasConflict = (cls: Class, dayIndex: number, periodIndex: number) => {
    return cls.defaultConflicts.some(
      (c: Conflict) => c.dayOfWeek === dayIndex + 1 && c.period === periodIndex + 1
    );
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Class Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="pdfUpload" className="cursor-pointer">
            <div className="flex items-center justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
              <span className="flex items-center space-x-2">
                <Upload className="w-6 h-6 text-gray-600" />
                <span className="font-medium text-gray-600">Import PDF Schedule</span>
              </span>
              <input id="pdfUpload" type="file" accept=".pdf" className="hidden" onChange={importPDF} />
            </div>
          </Label>
        </div>

        <div className="mb-4">
          <Select onValueChange={setSelectedClass} value={selectedClass || undefined}>
            <SelectTrigger>
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] overflow-y-auto">
              {classes.map(cls => (
                <SelectItem key={cls.id!} value={cls.id!}>{cls.classNumber} - Grade {cls.grade}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedClass && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2"></th>
                  {days.map(day => (
                    <th key={day} className="border p-2">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map((period, periodIndex) => (
                  <tr key={period}>
                    <td className="border p-2 font-medium">Period {period}</td>
                    {days.map((day, dayIndex) => {
                      const cls = getClassById(selectedClass);
                      const isConflict = cls ? hasConflict(cls, dayIndex, periodIndex) : false;
                      return (
                        <td
                          key={day}
                          className={`border p-2 cursor-pointer ${
                            isConflict ? 'bg-red-200 hover:bg-red-300' : 'hover:bg-gray-100'
                          }`}
                          onClick={() => toggleConflict(dayIndex, periodIndex)}
                        >
                          {isConflict ? '✕' : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 