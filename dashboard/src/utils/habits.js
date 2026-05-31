import { getBeijingDateKey, nowIso } from './date'

export function normalizeHabitsForBeijingDay(habits, options = {}) {
  const todayKey = options.todayKey || getBeijingDateKey()
  let changed = false

  const normalized = (Array.isArray(habits) ? habits : []).map(habit => {
    if (!habit || habit.type !== 'routine') return habit

    if (!habit.progressDate) {
      changed = true
      return {
        ...habit,
        progressDate: todayKey,
        currentProgress: Number(habit.currentProgress || 0),
        completedToday: Boolean(habit.completedToday),
        updatedAt: habit.updatedAt || nowIso()
      }
    }

    if (habit.progressDate !== todayKey) {
      changed = true
      return {
        ...habit,
        currentProgress: 0,
        completedToday: false,
        progressDate: todayKey,
        updatedAt: nowIso()
      }
    }

    return habit
  })

  return { habits: normalized, changed }
}

export function normalizeOneHabitForBeijingDay(habit) {
  return normalizeHabitsForBeijingDay([habit]).habits[0]
}
