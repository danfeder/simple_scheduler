"use client";

import { ScheduledClass } from '../../../shared/types/schedule';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Card } from '@/components/ui/card';

interface WeeklyScheduleProps {
  classes: ScheduledClass[];
  onClassMove: (classId: string, newDayOfWeek: number, newPeriod: number) => void;
}

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const periods = Array.from({ length: 8 }, (_, i) => i + 1);

export default function WeeklySchedule({ classes, onClassMove }: WeeklyScheduleProps) {
  const getClassForSlot = (dayOfWeek: number, period: number) => {
    const foundClass = classes.find(c => {
      const classDayOfWeek = c.dayOfWeek;
      return classDayOfWeek === dayOfWeek && c.period === period;
    });
    console.log(`Looking for class in day ${dayOfWeek}, period ${period}:`, foundClass);
    return foundClass;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2">Period</th>
            {dayNames.map((day, index) => (
              <th key={day} className="border p-2">{day}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map(period => (
            <tr key={period}>
              <td className="border p-2 font-bold">Period {period}</td>
              {Array.from({ length: 5 }, (_, dayIndex) => {
                const dayOfWeek = dayIndex + 1;
                const droppableId = `${dayOfWeek}-${period}`;
                const classInSlot = getClassForSlot(dayOfWeek, period);

                return (
                  <td key={dayIndex} className="border p-2 min-w-[200px] h-[100px]">
                    <Droppable 
                      droppableId={droppableId}
                      isDropDisabled={false}
                      isCombineEnabled={false}
                      ignoreContainerClipping={false}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`h-full rounded transition-colors duration-200 ${
                            snapshot.isDraggingOver ? 'bg-blue-100' : ''
                          }`}
                        >
                          {classInSlot && (
                            <Draggable
                              key={classInSlot.id}
                              draggableId={classInSlot.id}
                              index={0}
                            >
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`
                                    p-2 mb-2 cursor-move
                                    ${snapshot.isDragging ? 'opacity-50' : ''}
                                    ${classInSlot.isInConflict ? 'border-red-500 bg-red-50' : ''}
                                  `}
                                >
                                  <div className="font-medium text-sm">{classInSlot.name}</div>
                                </Card>
                              )}
                            </Draggable>
                          )}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 