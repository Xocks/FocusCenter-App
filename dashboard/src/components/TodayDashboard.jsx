import React, { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { CalendarClock, CheckCircle2, Clock3, Flame, PlusCircle, RefreshCw, Sparkles, Target, Timer, Zap } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { getBeijingDateKey, getBeijingNowLabel, getLogDateKey, nowIso } from '../utils/date'
import { normalizeHabitsForBeijingDay } from '../utils/habits'

const formatDuration = (seconds) => {
  const safe = Number(seconds || 0)
  if (safe <= 0) return '0分钟'
  const h = Math.floor(safe / 3600)
  const m = Math.floor((safe % 3600) / 60)
  if (h > 0 && m > 0) return `${h}小时${m}分钟`
  if (h > 0) return `${h}小时`
  return `${Math.max(1, m)}分钟`
}

const getSeconds = (log) => log?.durationSeconds !== undefined ? Number(log.durationSeconds || 0) : Number(log?.durationMinutes || 0) * 60

export default function TodayDashboard({ onEdit, onLog, onOpenTasks }) {
  const { habits, setHabits, onces, setOnces, timeLogs, setTimeLogs, groups } = useData()
  const todayKey = getBeijingDateKey()
  const todayLabel = getBeijingNowLabel()

  useEffect(() => {
    const result = normalizeHabitsForBeijingDay(habits, { todayKey })
    if (result.changed) setHabits(result.habits)
  }, [todayKey, habits, setHabits])

  const todayHabits = useMemo(() => {
    return habits.filter(h => !h.isDeleted && h.type === 'routine' && ((h.recurrence && h.recurrence !== 'none') || h.targetDate === todayKey))
  }, [habits, todayKey])

  const todayTodos = useMemo(() => {
    return onces.filter(t => !t.isDeleted && ((t.recurrence && t.recurrence !== 'none') || t.targetDate === todayKey))
  }, [onces, todayKey])

  const overdueTodos = useMemo(() => {
    return onces.filter(t => !t.isDeleted && !t.completed && t.targetDate && t.targetDate < todayKey)
  }, [onces, todayKey])

  const todayLogs = useMemo(() => timeLogs.filter(log => getLogDateKey(log) === todayKey), [timeLogs, todayKey])
  const todaySeconds = todayLogs.reduce((sum, log) => sum + getSeconds(log), 0)
  const completedTodos = todayTodos.filter(t => t.completed).length
  const completedHabits = todayHabits.filter(h => h.completedToday || Number(h.currentProgress || 0) >= Number(h.targetValue || 1)).length
  const totalTodayItems = todayHabits.length + todayTodos.length
  const doneTodayItems = completedHabits + completedTodos
  const progress = totalTodayItems === 0 ? 0 : Math.round((doneTodayItems / totalTodayItems) * 100)

  const getGroupTitle = (item) => {
    const id = item?.groupIds?.[0]
    return groups.find(g => g.id === id)?.title || '未分组'
  }

  const addHabitProgress = (habit) => {
    const normalized = normalizeHabitsForBeijingDay([habit], { todayKey }).habits[0]
    const step = Number(normalized.stepValue || 1)
    const target = Number(normalized.targetValue || 1)
    const nextProgress = Math.max(0, Number(normalized.currentProgress || 0) + step)
    const record = {
      id: Date.now().toString(),
      taskId: normalized.id,
      taskTitle: normalized.title,
      mode: 'quick',
      durationSeconds: 0,
      progressAdded: step,
      unit: normalized.unit || '次',
      groupIds: normalized.groupIds || [],
      tags: normalized.tags || [],
      dateKey: todayKey,
      completedAt: nowIso()
    }

    setHabits(habits.map(h => h.id === normalized.id ? {
      ...normalized,
      currentProgress: nextProgress,
      completedToday: nextProgress >= target,
      progressDate: todayKey,
      updatedAt: nowIso()
    } : h))
    setTimeLogs([...timeLogs, record])
  }

  const toggleTodo = (todo) => {
    setOnces(onces.map(t => t.id === todo.id ? { ...t, completed: !t.completed, updatedAt: nowIso() } : t))
  }

  return (
    <div className="space-y-6 pb-28">
      <section className="relative overflow-hidden rounded-[2rem] bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/10">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative z-10 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-200">
                <Sparkles size={14} /> 今日中控 · 北京时间
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight">{todayLabel}</h2>
            </div>
            <button onClick={onOpenTasks} className="rounded-2xl bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur hover:bg-white/15">旧任务页</button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <div className="text-[10px] font-bold text-slate-300">今日完成</div>
              <div className="mt-1 text-2xl font-black">{progress}%</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <div className="text-[10px] font-bold text-slate-300">记录时长</div>
              <div className="mt-1 text-lg font-black">{formatDuration(todaySeconds)}</div>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
              <div className="text-[10px] font-bold text-slate-300">逾期</div>
              <div className="mt-1 text-2xl font-black">{overdueTodos.length}</div>
            </div>
          </div>
        </div>
      </section>

      {overdueTodos.length > 0 && (
        <section className="rounded-3xl border border-orange-100 bg-orange-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-orange-700"><CalendarClock size={16} /> 需要处理的逾期任务</div>
          <div className="space-y-2">
            {overdueTodos.slice(0, 4).map(todo => (
              <button key={todo.id} onClick={() => toggleTodo(todo)} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm">
                <span className="font-bold text-slate-700">{todo.title}</span>
                <span className="text-xs font-bold text-orange-500">{todo.targetDate}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-500"><Zap size={16} className="text-emerald-500" /> 今日习惯</h3>
          <span className="text-xs font-bold text-slate-400">{completedHabits}/{todayHabits.length}</span>
        </div>
        <div className="grid gap-3">
          {todayHabits.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm font-bold text-slate-400">今天还没有习惯目标</div>
          ) : todayHabits.map(habit => {
            const current = Number(habit.currentProgress || 0)
            const target = Number(habit.targetValue || 1)
            const ratio = Math.min(100, Math.round((current / target) * 100))
            const complete = ratio >= 100 || habit.completedToday
            return (
              <motion.div key={habit.id} layout className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate font-black ${complete ? 'text-emerald-700' : 'text-slate-800'}`}>{habit.title}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{getGroupTitle(habit)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${complete ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${ratio}%` }} />
                    </div>
                    <div className="mt-1 text-xs font-bold text-slate-400">{current}/{target} {habit.unit || '次'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onLog(habit)} className="rounded-2xl bg-slate-100 p-3 text-slate-500"><Timer size={18} /></button>
                    <button onClick={() => addHabitProgress(habit)} className={`rounded-2xl px-4 py-3 text-sm font-black ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white'}`}>
                      +{habit.stepValue || 1}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-500"><Target size={16} className="text-blue-500" /> 今日任务</h3>
          <span className="text-xs font-bold text-slate-400">{completedTodos}/{todayTodos.length}</span>
        </div>
        <div className="grid gap-2">
          {todayTodos.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm font-bold text-slate-400">今天还没有单次任务</div>
          ) : todayTodos.map(todo => (
            <motion.div key={todo.id} layout className={`flex items-center gap-3 rounded-3xl border p-4 shadow-sm ${todo.completed ? 'border-transparent bg-slate-50' : 'border-slate-100 bg-white'}`}>
              <button onClick={() => toggleTodo(todo)} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${todo.completed ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 text-transparent'}`}>
                <CheckCircle2 size={18} />
              </button>
              <div className="min-w-0 flex-1">
                <div className={`truncate font-black ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{todo.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-400">
                  <span>{getGroupTitle(todo)}</span>
                  {todo.tags?.map(tag => <span key={tag} className="rounded-full border border-slate-200 px-2 py-0.5">{tag}</span>)}
                </div>
              </div>
              <button onClick={() => onLog(todo)} disabled={todo.completed} className="rounded-2xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-600 disabled:opacity-30"><PlusCircle size={14} /></button>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-500"><Clock3 size={16} /> 今日流水</div>
        {todayLogs.length === 0 ? (
          <div className="py-4 text-center text-sm font-bold text-slate-400">今天还没有记录，先从一个小动作开始。</div>
        ) : (
          <div className="space-y-2">
            {todayLogs.slice().reverse().slice(0, 6).map(log => (
              <div key={log.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-slate-700">{log.taskTitle}</div>
                  <div className="text-[10px] font-bold text-slate-400">{log.mode || 'manual'}</div>
                </div>
                <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                  {getSeconds(log) > 0 && <span><Timer size={12} className="inline" /> {formatDuration(getSeconds(log))}</span>}
                  {Number(log.progressAdded || 0) > 0 && <span><Flame size={12} className="inline text-emerald-500" /> +{log.progressAdded}{log.unit || ''}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <button onClick={onOpenTasks} className="w-full rounded-3xl bg-slate-900 py-4 text-sm font-black text-white shadow-lg shadow-slate-900/10">
        打开完整任务列表
      </button>
    </div>
  )
}
