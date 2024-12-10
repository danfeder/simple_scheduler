import { Schedule, ScheduledClass } from "@/types/schedule";
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';

interface WeeklyScheduleProps {
  schedule: Schedule;
  weekStart: Date;
  startDate: Date;
  onUnscheduleClass: (classToUnschedule: ScheduledClass) => void;
  hasScheduledClasses: boolean;
  draggedClass: ScheduledClass | null;
}

export function WeeklySchedule({ 
  schedule, 
  weekStart, 
  startDate, 
  onUnscheduleClass, 
  hasScheduledClasses,
  draggedClass
}: WeeklyScheduleProps) {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const periods = Array.from({ length: 8 }, (_, i) => i + 1);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const isInCurrentWeek = (classDate: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return classDate >= weekStart && classDate < weekEnd;
  };

  const isBeforeStartDate = (date: Date) => {
    return date < startDate;
  };

  const getClassForSlot = (dayIndex: number, period: number) => {
    return schedule.classes.find(
      c => isInCurrentWeek(new Date(c.startTime)) &&
          new Date(c.startTime).getDay() === (dayIndex + 1) % 7 && 
          c.period === period
    );
  };

  const isConflicted = (dayIndex: number, period: number) => {
    if (!draggedClass || !draggedClass.conflicts) return false;
    return draggedClass.conflicts.some(
      conflict => conflict.dayOfWeek === dayIndex + 1 && conflict.period === period
    );
  };

  const isClassInConflict = (classItem: ScheduledClass) => {
    return classItem.conflicts.some(
      conflict => conflict.dayOfWeek === classItem.dayOfWeek && conflict.period === classItem.period
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="border p-2 w-20">Period</th>
            {days.map((day, index) => {
              const date = new Date(weekStart);
              date.setDate(date.getDate() + index);
              return (
                <th key={day} className="border p-2 w-1/5">
                  <div>{day}</div>
                  <div className="text-sm text-gray-500">{formatDate(date)}</div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {periods.map(period => (
            <tr key={period}>
              <td className="border p-2 font-bold">Period {period}</td>
              {days.map((day, dayIndex) => {
                const date = new Date(weekStart);
                date.setDate(date.getDate() + dayIndex);
                const classForSlot = getClassForSlot(dayIndex, period);
                const isShaded = isBeforeStartDate(date);
                const isConflictedSlot = isConflicted(dayIndex, period);
                return (
                  <td 
                    key={day} 
                    className={`
                      border p-2 
                      ${isShaded ? 'bg-gray-200' : ''}
                      ${isConflictedSlot ? 'bg-red-100' : ''}
                    `}
                  >
                    <Droppable droppableId={`${dayIndex + 1}-${period}`}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[70px] transition-colors duration-200 ${
                            snapshot.isDraggingOver ? 'bg-blue-100' : ''
                          }`}
                        >
                          {classForSlot && !isShaded ? (
                            <Draggable draggableId={classForSlot.id} index={0}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`
                                    bg-white p-2 rounded-lg flex justify-between items-center
                                    border shadow-md hover:shadow-lg transition-shadow
                                    ${snapshot.isDragging ? 'opacity-75 shadow-lg' : ''}
                                    ${isClassInConflict(classForSlot) ? 'border-red-500 border-2' : 'border-gray-200'}
                                  `}
                                  style={{
                                    ...provided.draggableProps.style,
                                    width: 'fit-content',
                                    minWidth: '120px',
                                    maxWidth: '90%',
                                    margin: '0 auto'
                                  }}
                                >
                                  <span className="font-medium text-sm truncate flex-grow text-center">
                                    {classForSlot.name}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUnscheduleClass(classForSlot);
                                    }}
                                    className="h-6 w-6 ml-2 flex-shrink-0"
                                  >
                                    <X className="h-4 w-4" />
                                    <span className="sr-only">Unschedule</span>
                                  </Button>
                                </div>
                              )}
                            </Draggable>
                          ) : null}
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
      {!hasScheduledClasses && (
        <div className="text-center py-8 text-gray-500">
          No classes scheduled for this week. Drag classes here to schedule them.
        </div>
      )}
    </div>
  );
}

