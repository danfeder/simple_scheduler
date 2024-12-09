"use client";

import { ScheduledClass } from '../../../shared/types/schedule';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';

interface UnscheduledClassesProps {
  classes: ScheduledClass[]
  onUndoUnschedule: (classItem: ScheduledClass) => void
}

export default function UnscheduledClasses({ classes, onUndoUnschedule }: UnscheduledClassesProps) {
  return (
    <Droppable droppableId="unscheduled">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`space-y-2 min-h-[200px] p-2 rounded transition-colors duration-200 ${
            snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          {classes.map((classItem, index) => (
            <Draggable key={classItem.id} draggableId={classItem.id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`
                    bg-white p-2 rounded-lg flex justify-between items-center
                    border border-gray-200 shadow-md hover:shadow-lg transition-shadow
                    ${snapshot.isDragging ? 'opacity-75 shadow-lg' : ''}
                  `}
                  style={{
                    ...provided.draggableProps.style,
                    width: 'fit-content',
                    minWidth: '120px',
                    maxWidth: '90%',
                    margin: '0 0 8px 0'
                  }}
                >
                  <span className="font-medium text-sm truncate flex-grow text-center">
                    {classItem.name}
                  </span>
                  {classItem.originalDayOfWeek !== undefined && classItem.originalPeriod !== undefined && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onUndoUnschedule(classItem)}
                      className="h-6 w-6 ml-2 flex-shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span className="sr-only">Undo unschedule</span>
                    </Button>
                  )}
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
} 