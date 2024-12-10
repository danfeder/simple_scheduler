import { Schedule, ScheduledClass } from "../types/schedule"

const gradeNames = ["PK", "K", "1", "2", "3", "4", "5"]
const roomNumbers = Array.from({ length: 33 }, (_, i) => (i + 1).toString().padStart(3, '0'))

function generateRandomSchedule(startDate: Date): Schedule {
  const classes: ScheduledClass[] = []
  let currentDate = new Date(startDate)
  let classesScheduled = 0

  // First, generate all classes with their conflicts
  const allClasses = Array.from({ length: 33 }, (_, i) => {
    const grade = gradeNames[Math.floor(Math.random() * gradeNames.length)]
    const room = roomNumbers[i]
    return {
      id: `class_${i + 1}`,
      name: `${grade}-${room}`,
      conflicts: generateConflicts()
    }
  })

  while (classesScheduled < 33) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) { // Skip weekends
      const periodsForDay = Math.min(4, 33 - classesScheduled) // Up to 4 periods per day
      const availablePeriods = [1, 2, 3, 4, 5, 6, 7, 8]
      for (let i = 0; i < periodsForDay; i++) {
        const periodIndex = Math.floor(Math.random() * availablePeriods.length)
        const period = availablePeriods[periodIndex]
        availablePeriods.splice(periodIndex, 1)

        const availableClasses = allClasses.filter(cls => 
          !cls.dayOfWeek && 
          !cls.conflicts.some(c => c.dayOfWeek === currentDate.getDay() && c.period === period)
        )

        if (availableClasses.length > 0) {
          const classIndex = Math.floor(Math.random() * availableClasses.length)
          const selectedClass = availableClasses[classIndex]

          classes.push({
            ...selectedClass,
            startTime: new Date(currentDate.setHours(8 + period, 0, 0, 0)),
            endTime: new Date(currentDate.setHours(9 + period, 0, 0, 0)),
            dayOfWeek: currentDate.getDay(),
            period: period
          })

          const index = allClasses.findIndex(c => c.id === selectedClass.id)
          allClasses.splice(index, 1)

          classesScheduled++
          if (classesScheduled >= 33) break
        }
      }
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Add remaining unscheduled classes
  classes.push(...allClasses.map(cls => ({
    ...cls,
    startTime: new Date(0), // placeholder date
    endTime: new Date(0), // placeholder date
    dayOfWeek: 0, // 0 indicates unscheduled
    period: 0 // 0 indicates unscheduled
  })))

  const lastScheduledDate = new Date(Math.max(...classes.filter(c => c.dayOfWeek !== 0).map(c => c.startTime.getTime())))
  const totalWeeks = Math.ceil((lastScheduledDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000))

  return {
    classes,
    metadata: {
      generatedAt: new Date(),
      version: "1.0.0",
      totalWeeks: totalWeeks
    },
    quality: {
      totalScore: 0.85,
      metrics: {
        dayDistribution: 0.9,
        timeGaps: 0.8,
        periodUtilization: 0.85
      }
    }
  }
}

function generateConflicts(): Array<{ dayOfWeek: number; period: number }> {
  const conflicts = [];
  // Add at least one conflict for each day
  for (let day = 1; day <= 5; day++) {
    const conflictPeriod = Math.floor(Math.random() * 8) + 1;
    conflicts.push({ dayOfWeek: day, period: conflictPeriod });
  }
  // Add some additional random conflicts
  for (let i = 0; i < 5; i++) {
    conflicts.push({
      dayOfWeek: Math.floor(Math.random() * 5) + 1,
      period: Math.floor(Math.random() * 8) + 1
    });
  }
  return conflicts;
}

export const scheduleApi = {
  generate: async (startDate: Date): Promise<Schedule> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    return generateRandomSchedule(startDate)
  }
}

