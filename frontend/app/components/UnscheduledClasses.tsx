"use client";

import { ScheduledClass } from '../../../shared/types/schedule';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { StorageService } from '../services/StorageService';
import { BackupCoordinator } from '../services/BackupCoordinator';
import { toast } from '@/components/ui/use-toast';

interface UnscheduledClassesProps {
  classes: ScheduledClass[]
  onUndoUnschedule: (classItem: ScheduledClass) => void
  onClassesChange: (updatedClasses: ScheduledClass[]) => void
}

export default function UnscheduledClasses({ classes, onUndoUnschedule, onClassesChange }: UnscheduledClassesProps) {
  const handleClassesUpdate = async (updatedClasses: ScheduledClass[]) => {
    try {
      onClassesChange(updatedClasses);
      
      await BackupCoordinator.getInstance().createCoordinatedBackup(
        'unscheduled_classes',
        updatedClasses,
        { silent: true }
      );
    } catch (error) {
      console.error('Failed to backup unscheduled classes:', error);
      toast({
        title: "Backup Failed",
        description: "Failed to backup class changes. Your changes are saved but not backed up.",
        variant: "destructive",
      });
    }
  };

  const restoreClassesBackup = async () => {
    const restoredClasses = await BackupCoordinator.getInstance()
      .restoreLatestBackup('unscheduled_classes');
    
    if (restoredClasses) {
      onClassesChange(restoredClasses);
    }
  };

  return (
    <Droppable 
      droppableId="unscheduled"
      isDropDisabled={false}
      isCombineEnabled={false}
      ignoreContainerClipping={false}
    >
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`space-y-2 min-h-[200px] p-2 rounded transition-colors duration-200 ${
            snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          {classes.map((classItem, index) => (
            <Draggable 
              key={classItem.id} 
              draggableId={classItem.id} 
              index={index}
            >
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
          <button onClick={restoreClassesBackup}>
            Restore Previous Classes
          </button>
        </div>
      )}
    </Droppable>
  );
} 