import { ClassManager } from './components/ClassManager'
import { ConstraintManager } from './components/ConstraintManager'
import { ScheduleGenerator } from './components/ScheduleGenerator'

export default function Home() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">School Scheduler</h1>
      
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <ClassManager />
          <ConstraintManager />
        </div>
        
        <div>
          <ScheduleGenerator />
        </div>
      </div>
    </div>
  )
} 