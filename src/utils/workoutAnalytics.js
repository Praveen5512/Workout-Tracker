/**
 * Analytics and Calculation Utilities for Workout Tracker
 */

// Helper to parse numeric weight from 'Weight/Intensity' field (e.g., '82.5 kg', '100', '20 lbs')
export const parseWeight = (weightStr) => {
  if (typeof weightStr === 'number') return weightStr;
  if (!weightStr) return 0;
  const match = String(weightStr).match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

// Check if two date strings or Date objects are on the same calendar day
export const isSameDay = (d1, d2) => {
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

// Get Monday and Sunday of the week containing a target date
export const getWeekBounds = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  // In JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
};

// Filter workouts completed during the current week
export const getThisWeekWorkouts = (workouts) => {
  const { monday, sunday } = getWeekBounds(new Date());
  return workouts.filter(w => {
    if (!w.Date) return false;
    const wDate = new Date(w.Date);
    return wDate >= monday && wDate <= sunday;
  });
};

// Filter workouts completed during the previous week
export const getLastWeekWorkouts = (workouts) => {
  const { monday } = getWeekBounds(new Date());
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const prevSunday = new Date(monday);
  prevSunday.setDate(monday.getDate() - 1);
  prevSunday.setHours(23, 59, 59, 999);

  return workouts.filter(w => {
    if (!w.Date) return false;
    const wDate = new Date(w.Date);
    return wDate >= prevMonday && wDate <= prevSunday;
  });
};

// Calculate summary totals for a list of workouts
export const calculateTotals = (workoutsList) => {
  let totalSets = 0;
  let totalReps = 0;
  let totalDuration = 0;
  let totalVolume = 0;
  const uniqueDays = new Set();
  const exerciseCounts = {};

  workoutsList.forEach(w => {
    const sets = Number(w.Sets) || 0;
    const reps = Number(w.Reps) || 0;
    const duration = Number(w['Duration (min)']) || 0;
    const weight = parseWeight(w['Weight/Intensity']);

    totalSets += sets;
    totalReps += reps;
    totalDuration += duration;
    totalVolume += (sets * reps * (weight > 0 ? weight : 1));

    if (w.Date) {
      uniqueDays.add(w.Date.split('T')[0]);
    }

    if (w.Exercise) {
      exerciseCounts[w.Exercise] = (exerciseCounts[w.Exercise] || 0) + 1;
    }
  });

  return {
    count: workoutsList.length,
    activeDaysCount: uniqueDays.size,
    totalSets,
    totalReps,
    totalDuration,
    totalVolume: Math.round(totalVolume),
    exerciseCounts
  };
};

// 7-day week activity matrix (Mon-Sun)
export const getWeekDaysActivity = (workouts) => {
  const { monday } = getWeekBounds(new Date());
  const days = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const curDate = new Date(monday);
    curDate.setDate(monday.getDate() + i);
    const dateStr = curDate.toISOString().split('T')[0];

    const matching = workouts.filter(w => w.Date && w.Date.startsWith(dateStr));
    const isToday = isSameDay(curDate, today);
    const isPast = curDate <= today;

    days.push({
      dayName: dayNames[i],
      dateNumber: curDate.getDate(),
      dateStr,
      hasWorkout: matching.length > 0,
      workoutCount: matching.length,
      isToday,
      isPast
    });
  }

  return days;
};

// Calculate current streak and longest streak in days
export const calculateStreaks = (workouts) => {
  if (!workouts || workouts.length === 0) {
    return { currentStreak: 0, longestStreak: 0, consistencyRate: 0 };
  }

  // Get all unique dates sorted chronologically
  const dates = Array.from(new Set(workouts.map(w => w.Date?.split('T')[0]).filter(Boolean)))
    .sort()
    .map(d => new Date(d));

  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, consistencyRate: 0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate current streak: check today or yesterday, allow 1 day rest gap
  let currentStreak = 0;
  let checkDate = new Date(today);
  
  // Has workout today?
  const hasWorkoutOn = (d) => dates.some(date => isSameDay(date, d));

  if (!hasWorkoutOn(checkDate)) {
    // Check if workout was yesterday
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (hasWorkoutOn(checkDate)) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  dates.forEach(d => {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const diffDays = Math.round((d - prevDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else if (diffDays > 1) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prevDate = d;
  });

  // Consistency in past 30 days
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const activePast30 = dates.filter(d => d >= thirtyDaysAgo).length;
  const consistencyRate = Math.min(100, Math.round((activePast30 / 16) * 100)); // Target ~4 days/wk = 16 days

  return {
    currentStreak: Math.max(currentStreak, dates.length > 0 ? 1 : 0),
    longestStreak: Math.max(longestStreak, currentStreak),
    consistencyRate
  };
};

// Group workouts by distinct exercise for progress analytics
export const getExerciseProgress = (workouts, exerciseName) => {
  if (!exerciseName) return [];
  return workouts
    .filter(w => w.Exercise && w.Exercise.toLowerCase() === exerciseName.toLowerCase())
    .sort((a, b) => new Date(a.Date) - new Date(b.Date))
    .map(w => {
      const weight = parseWeight(w['Weight/Intensity']);
      const reps = Number(w.Reps) || 0;
      // Epley Formula for 1RM estimate
      const estimated1RM = reps > 1 ? Math.round(weight * (1 + reps / 30)) : weight;
      return {
        id: w.id,
        Date: w.Date,
        Sets: Number(w.Sets) || 0,
        Reps: reps,
        Weight: weight,
        WeightRaw: w['Weight/Intensity'],
        estimated1RM,
        Duration: Number(w['Duration (min)']) || 0
      };
    });
};
