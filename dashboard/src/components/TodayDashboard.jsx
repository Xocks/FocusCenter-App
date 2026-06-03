import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, CalendarClock, CheckCircle2, Circle, Clock3, Crosshair, Droplets, FileText, Flame, PlusCircle, Sparkles, Sun, Target, Timer, Zap } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { getBeijingDateKey, getBeijingNowLabel, getLogDateKey, nowIso } from '../utils/date'
import { normalizeHabitsForBeijingDay } from '../utils/habits'
import { getModuleClass } from '../utils/uiSettings'
import { getTemplateConfig, getVisualConfig } from '../utils/visualPresets'

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

const formatTodoTime = (todo, todayKey) => {
  if (todo.deadline) {
    const date = new Date(todo.deadline)
    if (!Number.isNaN(date.getTime())) {
      const dateKey = getBeijingDateKey(date)
      const timeText = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }).format(date)
      if (dateKey === todayKey) return `截止 ${timeText}`
      const dayText = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
      return `截止 ${dayText}`
    }
  }
  if (todo.targetDate) return `安排 ${todo.targetDate}`
  return ''
}

const dateTimeParts = (value) => {
  if (!value) return null
  const raw = String(value)
  const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (localMatch) {
    const [, year, month, day, hour, minute] = localMatch
    return {
      dateKey: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`,
      dayTime: `${Number(month)}/${Number(day)} ${hour}:${minute}`,
    }
  }
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return null
  return {
    dateKey: getBeijingDateKey(date),
    time: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' }).format(date),
    dayTime: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date),
  }
}

const formatTodoSchedule = (todo, todayKey) => {
  const start = dateTimeParts(todo.startAt)
  const end = dateTimeParts(todo.endAt || todo.deadline)
  if (start && end) {
    if (start.dateKey === end.dateKey) {
      const prefix = start.dateKey === todayKey ? '' : `${start.dayTime.split(' ')[0]} `
      return `${prefix}${start.time}-${end.time}`
    }
    return `${start.dayTime} - ${end.dayTime}`
  }
  if (start) return `${start.dateKey === todayKey ? '' : `${start.dayTime.split(' ')[0]} `}${start.time} 开始`
  if (end) return end.dateKey === todayKey ? `截止 ${end.time}` : `截止 ${end.dayTime}`
  if (todo.targetDate) return `安排 ${todo.targetDate}`
  return ''
}

const ICONS = {
  droplet: Droplets,
  droplets: Droplets,
  target: Target,
  crosshair: Crosshair,
  'book-open': BookOpen,
  book: BookOpen,
  circle: Circle,
  sun: Sun,
  zap: Zap,
  file: FileText,
  'file-text': FileText,
}

const VisualIcon = ({ name, fallback: Fallback = Zap, size = 15 }) => {
  const Icon = ICONS[String(name || '').toLowerCase()] || Fallback
  return <Icon size={size} strokeWidth={2.6} />
}

const imageLayer = (visual) => {
  if (!visual?.imageUrl) return null
  return (
    <div
      className="absolute inset-0 bg-cover bg-center"
      style={{ backgroundImage: `url(${visual.imageUrl})`, opacity: Math.max(0.12, 1 - Number(visual.imageOverlay || 35) / 100) }}
    />
  )
}

export default function TodayDashboard({ onLog }) {
  const { habits, setHabits, onces, setOnces, timeLogs, setTimeLogs, groups, uiSettings } = useData()
  const todayKey = getBeijingDateKey()
  const todayLabel = getBeijingNowLabel()
  const defaultVisual = uiSettings.visualDefaults || {}

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

  const desktopLayout = (uiSettings.dashboardLayouts?.desktop || []).filter(item => item.visible !== false).sort((a, b) => Number(a.order) - Number(b.order))
  const mobileLayout = (uiSettings.dashboardLayouts?.mobile || []).filter(item => item.visible !== false).sort((a, b) => Number(a.order) - Number(b.order))

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
      completedAt: nowIso(),
    }

    setHabits(habits.map(h => h.id === normalized.id ? {
      ...normalized,
      currentProgress: nextProgress,
      completedToday: nextProgress >= target,
      progressDate: todayKey,
      updatedAt: nowIso(),
    } : h))
    setTimeLogs([...timeLogs, record])
  }

  const toggleTodo = (todo) => {
    setOnces(onces.map(t => t.id === todo.id ? { ...t, completed: !t.completed, updatedAt: nowIso() } : t))
  }

  const renderHero = (moduleConfig) => {
    const template = getTemplateConfig(moduleConfig.cardStyle || defaultVisual.templateId)
    const dark = template.id === 'game'
    return (
      <section className={`relative overflow-hidden rounded-3xl p-5 shadow-xl lg:p-6 ${template.cardClass}`}>
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-blue-500/20 blur-2xl" />
        <div className="absolute -bottom-16 left-8 h-36 w-36 rounded-full bg-emerald-400/20 blur-2xl" />
        <div className="relative z-10 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`flex items-center gap-2 text-xs font-bold ${dark ? 'text-cyan-100' : template.mutedClass}`}>
                <Sparkles size={14} /> 今日中控 · 北京时间
              </div>
              <h2 className={`mt-2 text-2xl font-black tracking-tight ${template.textClass}`}>{todayLabel}</h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:max-w-2xl">
            {[
              ['今日完成', `${progress}%`],
              ['记录时长', formatDuration(todaySeconds)],
              ['逾期', overdueTodos.length],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 rounded-2xl bg-white/40 p-2.5 backdrop-blur sm:p-3">
                <div className={`text-[10px] font-bold ${template.mutedClass}`}>{label}</div>
                <div className={`mt-1 truncate text-lg font-black sm:text-2xl ${template.textClass}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const renderOverdue = () => overdueTodos.length > 0 && (
    <section className="mb-5 rounded-3xl border border-orange-100 bg-orange-50 p-4">
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
  )

  const renderHabits = (moduleConfig) => {
    const compact = moduleConfig.density === 'compact'
    return (
      <section className={compact ? '' : 'rounded-3xl bg-white p-4 shadow-sm'}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-500"><Zap size={16} className="text-emerald-500" /> 今日习惯</h3>
          <span className="text-xs font-bold text-slate-400">{completedHabits}/{todayHabits.length}</span>
        </div>
        <div className={`grid gap-3 ${compact ? 'lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
          {todayHabits.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm font-bold text-slate-400">今天还没有习惯目标</div>
          ) : todayHabits.map(habit => {
            const current = Number(habit.currentProgress || 0)
            const target = Number(habit.targetValue || 1)
            const ratio = Math.min(100, Math.round((current / target) * 100))
            const complete = ratio >= 100 || habit.completedToday
            const visual = getVisualConfig(habit, groups, defaultVisual)
            return (
              <motion.div key={habit.id} layout className={`relative overflow-hidden rounded-3xl border p-4 shadow-sm ${visual.cardClass}`}>
                {imageLayer(visual.visual)}
                <div className="relative flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: visual.color }}>
                        <VisualIcon name={visual.visual.icon} fallback={Zap} size={15} />
                      </span>
                      <span className={`truncate font-black ${complete ? 'text-emerald-700' : visual.textClass}`}>{habit.title}</span>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold text-slate-500">{getGroupTitle(habit)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                      <div className={`h-full rounded-full ${complete ? 'bg-emerald-500' : visual.progressClass}`} style={{ width: `${ratio}%` }} />
                    </div>
                    <div className={`mt-1 text-xs font-bold ${visual.mutedClass}`}>{current}/{target} {habit.unit || '次'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onLog(habit)} className="rounded-2xl bg-white/70 p-3 text-slate-500"><Timer size={18} /></button>
                    <button onClick={() => addHabitProgress(habit)} className={`rounded-2xl px-4 py-3 text-sm font-black ${complete ? 'bg-emerald-100 text-emerald-700' : visual.buttonClass}`}>
                      +{habit.stepValue || 1}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>
    )
  }

  const renderTodos = (moduleConfig) => (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-black text-slate-500"><Target size={16} className="text-blue-500" /> 今日任务</h3>
        <span className="text-xs font-bold text-slate-400">{completedTodos}/{todayTodos.length}</span>
      </div>
      <div className={`grid gap-2 ${moduleConfig.density === 'compact' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
        {todayTodos.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-8 text-center text-sm font-bold text-slate-400">今天还没有单次任务</div>
        ) : todayTodos.map(todo => {
          const visual = getVisualConfig(todo, groups, defaultVisual)
          const timeInfo = formatTodoSchedule(todo, todayKey) || formatTodoTime(todo, todayKey)
          return (
            <motion.div key={todo.id} layout className={`relative flex items-center gap-3 overflow-hidden rounded-3xl border p-4 shadow-sm ${todo.completed ? 'border-transparent bg-slate-50' : visual.cardClass}`}>
              {imageLayer(visual.visual)}
              <button onClick={() => toggleTodo(todo)} className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${todo.completed ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 text-transparent'}`}>
                <CheckCircle2 size={18} />
              </button>
              <div className="relative min-w-0 flex-1">
                <div className={`truncate font-black ${todo.completed ? 'text-slate-400 line-through' : visual.textClass}`}>{todo.title}</div>
                <div className={`mt-1 flex flex-wrap items-center gap-2 text-[10px] font-bold ${todo.completed ? 'text-slate-300' : visual.mutedClass}`}>
                  <span>{getGroupTitle(todo)}</span>
                  {timeInfo && <span className="rounded-full bg-white/70 px-2 py-0.5">{timeInfo}</span>}
                  {todo.tags?.map(tag => <span key={tag} className="rounded-full border border-slate-200 bg-white/60 px-2 py-0.5">{tag}</span>)}
                </div>
              </div>
              <button onClick={() => onLog(todo)} disabled={todo.completed} className="relative rounded-2xl bg-white/70 px-3 py-2 text-xs font-black text-blue-600 disabled:opacity-30"><PlusCircle size={14} /></button>
            </motion.div>
          )
        })}
      </div>
    </section>
  )

  const renderLogs = () => (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-500"><Clock3 size={16} /> 今日流水</div>
      {todayLogs.length === 0 ? (
        <div className="py-4 text-center text-sm font-bold text-slate-400">今天还没有记录，先从一个小动作开始。</div>
      ) : (
        <div className="space-y-2">
          {todayLogs.slice().reverse().slice(0, 6).map(log => (
            <div key={log.id} className="flex flex-col gap-2 rounded-2xl bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-black text-slate-700">{log.taskTitle}</div>
                <div className="text-[10px] font-bold text-slate-400">{log.mode || 'manual'}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-500 sm:justify-end">
                {getSeconds(log) > 0 && <span><Timer size={12} className="inline" /> {formatDuration(getSeconds(log))}</span>}
                {Number(log.progressAdded || 0) > 0 && <span><Flame size={12} className="inline text-emerald-500" /> +{log.progressAdded}{log.unit || ''}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )

  const renderModule = (moduleConfig) => {
    if (moduleConfig.id === 'hero') return renderHero(moduleConfig)
    if (moduleConfig.id === 'habits') return renderHabits(moduleConfig)
    if (moduleConfig.id === 'todos') return renderTodos(moduleConfig)
    if (moduleConfig.id === 'logs') return renderLogs(moduleConfig)
    return null
  }

  return (
    <div className="pb-28 lg:pb-8">
      {renderOverdue()}
      <div className="grid grid-cols-2 gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {desktopLayout.map(moduleConfig => (
          <div key={`desktop-${moduleConfig.id}`} className={`hidden lg:block ${getModuleClass(moduleConfig, 'desktop')}`}>
            {renderModule(moduleConfig)}
          </div>
        ))}
        {mobileLayout.map(moduleConfig => (
          <div key={`mobile-${moduleConfig.id}`} className={`col-span-2 lg:hidden ${getModuleClass(moduleConfig, 'mobile')}`}>
            {renderModule(moduleConfig)}
          </div>
        ))}
      </div>
    </div>
  )
}
