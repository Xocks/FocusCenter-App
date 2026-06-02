import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Zap, Repeat, Trash2, Pencil, Bell, Timer, PlusCircle, CalendarPlus, Square, Play } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { getBeijingDateKey, getLogDateKey, nowIso } from '../utils/date'

const formatTimeSafe = (sec) => {
  if (!sec || sec <= 0) return null
  if (sec < 60) return `${sec}秒`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`
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

const formatTaskSchedule = (task, todayKey) => {
  const start = dateTimeParts(task.startAt)
  const end = dateTimeParts(task.endAt || task.deadline)
  if (start && end) {
    if (start.dateKey === end.dateKey) {
      const prefix = start.dateKey === todayKey ? '' : `${start.dayTime.split(' ')[0]} `
      return `${prefix}${start.time}-${end.time}`
    }
    return `${start.dayTime} - ${end.dayTime}`
  }
  if (start) return `${start.dateKey === todayKey ? '' : `${start.dayTime.split(' ')[0]} `}${start.time} 开始`
  if (end) return end.dateKey === todayKey ? `截止 ${end.time}` : `截止 ${end.dayTime}`
  return ''
}

export default function TodoView({ onEdit, onLog, filterGroupId }) {
  const { habits, setHabits, onces, setOnces, timeLogs, setTimeLogs } = useData()
  const todayStr = getBeijingDateKey()

  const [runningTimers, setRunningTimers] = useState({})
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    let interval = null
    if (Object.keys(runningTimers).length > 0) {
      interval = setInterval(() => setNow(Date.now()), 1000)
    }
    return () => clearInterval(interval)
  }, [runningTimers])

  const softDeleteHabit = (id) => {
    const timestamp = nowIso()
    setHabits(habits.map(h => h.id === id ? { ...h, isDeleted: true, deletedAt: timestamp, updatedAt: timestamp } : h))
  }
  const softDeleteTodo = (id) => {
    const timestamp = nowIso()
    setOnces(onces.map(t => t.id === id ? { ...t, isDeleted: true, deletedAt: timestamp, updatedAt: timestamp } : t))
  }
  const toggleTodo = (id) => setOnces(onces.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  
  const handleAssignToToday = (item, type) => {
    const timestamp = nowIso()
    if (type === 'routine') setHabits(habits.map(h => h.id === item.id ? { ...h, targetDate: todayStr, updatedAt: timestamp } : h))
    else setOnces(onces.map(o => o.id === item.id ? { ...o, targetDate: todayStr, updatedAt: timestamp } : o))
  }

  // 🚀 核心计时器逻辑也写入 groupIds
  const toggleTimer = (task) => {
    const isRunning = runningTimers[task.id]
    if (isRunning) {
      const startTime = runningTimers[task.id]
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000)
      if (elapsedSeconds > 0) {
        const newRecord = {
          id: Date.now().toString(),
          taskId: task.id,
          taskTitle: task.title,
          mode: 'stopwatch',
          durationSeconds: elapsedSeconds,
          progressAdded: 0,
          unit: task.unit || '',
          groupIds: task.groupIds || [], // 🚀 永久烙印组别
          tags: task.tags || [],
          dateKey: todayStr,
          completedAt: nowIso()
        }
        setTimeLogs([...timeLogs, newRecord])
      }
      const newTimers = { ...runningTimers }
      delete newTimers[task.id]
      setRunningTimers(newTimers)
    } else {
      setRunningTimers({ ...runningTimers, [task.id]: Date.now() })
    }
  }

  const getRunningTimeFormatted = (taskId) => {
    if (!runningTimers[taskId]) return null
    const elapsedSeconds = Math.floor((now - runningTimers[taskId]) / 1000)
    const m = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0')
    const s = (elapsedSeconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const getTaskSavedSeconds = (taskId) => {
    return timeLogs.filter(log => log.taskId === taskId).reduce((acc, curr) => {
      const secs = curr.durationSeconds !== undefined ? curr.durationSeconds : (curr.durationMinutes || 0) * 60
      return acc + secs
    }, 0)
  }

  let activeHabits = []
  let activeTodos = []

  if (filterGroupId === 'all') {
    activeHabits = habits.filter(h => !h.isDeleted)
    activeTodos = onces.filter(o => !o.isDeleted)
  } else if (filterGroupId === null) {
    activeHabits = habits.filter(h => !h.isDeleted && (h.recurrence && h.recurrence !== 'none' || h.targetDate === todayStr))
    activeTodos = onces.filter(o => !o.isDeleted && (o.recurrence && o.recurrence !== 'none' || o.targetDate === todayStr))
  } else if (filterGroupId === 'inbox') {
    activeHabits = habits.filter(h => !h.isDeleted && (!h.groupIds || h.groupIds.length === 0))
    activeTodos = onces.filter(o => !o.isDeleted && (!o.groupIds || o.groupIds.length === 0))
  } else {
    activeHabits = habits.filter(h => !h.isDeleted && h.groupIds && h.groupIds.includes(filterGroupId))
    activeTodos = onces.filter(o => !o.isDeleted && o.groupIds && o.groupIds.includes(filterGroupId))
  }

  const totalItems = activeHabits.length + activeTodos.length
  let earnedPoints = 0
  activeTodos.forEach(t => earnedPoints += t.completed ? 1 : 0)
  activeHabits.forEach(h => earnedPoints += Math.min((h.currentProgress || 0) / (h.targetValue || 1), 1))
  const overallProgress = totalItems === 0 ? 0 : Math.round((earnedPoints / totalItems) * 100)
  const sortedTodos = [...activeTodos].sort((a, b) => (a.completed === b.completed ? 0 : a.completed ? 1 : -1))

  // 🚀 计算本组今日耗时
  let groupTodaySeconds = 0
  if (filterGroupId !== null && filterGroupId !== 'inbox' && filterGroupId !== 'all') {
    const todayLogs = timeLogs.filter(log => getLogDateKey(log) === todayStr)
    todayLogs.forEach(log => {
      // 兼容旧数据查任务，新数据查流水账烙印
      let logsGroups = log.groupIds
      if (!logsGroups) {
        const taskObj = [...habits, ...onces].find(t => t.id === log.taskId)
        logsGroups = taskObj ? (taskObj.groupIds || []) : []
      }
      if (logsGroups.includes(filterGroupId)) {
        groupTodaySeconds += (log.durationSeconds !== undefined ? log.durationSeconds : (log.durationMinutes || 0) * 60)
      }
    })
  }

  return (
    <div className="space-y-8 pb-10">
      
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3 relative overflow-hidden">
        {filterGroupId === 'all' && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">全部项目</div>}
        {filterGroupId === null && <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">今日执行中</div>}
        {filterGroupId === 'inbox' && <div className="absolute top-0 right-0 bg-slate-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl">未分类清单</div>}
        
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-black text-slate-800">
              {filterGroupId === 'all' ? '所有任务' : filterGroupId === null ? '今日待办' : filterGroupId === 'inbox' ? '收集箱' : '组内总库'}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-medium text-slate-400">当前视图综合得分</span>
              {/* 🚀 组内今日耗时展示 */}
              {filterGroupId !== null && filterGroupId !== 'inbox' && filterGroupId !== 'all' && groupTodaySeconds > 0 && (
                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Timer size={10}/> 今日耗时: {formatTimeSafe(groupTodaySeconds)}
                </span>
              )}
            </div>
          </div>
          <span className="text-3xl font-black text-blue-600">{overallProgress}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${overallProgress}%` }} className="h-full bg-blue-500 rounded-full" />
        </div>
      </div>

      {activeHabits.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2"><Zap size={16} className="text-emerald-500"/> 习惯目标</h2>
          <div className="grid gap-3">
            {activeHabits.map(habit => {
              const current = habit.currentProgress || 0
              const target = habit.targetValue || 1
              const isCompleted = habit.completedToday
              const savedSeconds = getTaskSavedSeconds(habit.id) 
              const isToday = habit.recurrence && habit.recurrence !== 'none' || habit.targetDate === todayStr
              const isRunning = !!runningTimers[habit.id]

              return (
                <div key={habit.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-colors">
                  <div className={`absolute left-0 top-0 bottom-0 transition-all duration-500 z-0 ${isCompleted ? 'bg-emerald-50' : 'bg-slate-50'}`} style={{ width: `${Math.min((current / target) * 100, 100)}%` }} />
                  <div className="relative z-10 flex justify-between items-center gap-4">
                    <div className="flex-1">
                      <span className={`font-bold block ${isCompleted ? 'text-emerald-700' : 'text-slate-800'}`}>{habit.title}</span>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 bg-white/50 px-1 rounded">进度: <span className={isCompleted ? 'text-emerald-600' : 'text-blue-500'}>{current}</span> / {target} {habit.unit}</span>
                        {isRunning ? (
                          <span className="text-[10px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm"><Timer size={10}/> {getRunningTimeFormatted(habit.id)}</span>
                        ) : (
                          savedSeconds > 0 && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Timer size={10}/> 累计: {formatTimeSafe(savedSeconds)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex opacity-50 hover:opacity-100 gap-1 mr-1">
                        <button onClick={() => onEdit(habit)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><Pencil size={16}/></button>
                        <button onClick={() => softDeleteHabit(habit.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                      
                      {filterGroupId !== null && !isToday ? (
                        <button onClick={() => handleAssignToToday(habit, 'routine')} className="h-10 px-3 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-xl font-bold flex items-center justify-center transition-transform active:scale-95 text-xs border border-orange-200 shadow-sm">
                          <CalendarPlus size={14} className="mr-1" /> 调入今日
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleTimer(habit)} className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-colors ${isRunning ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}>
                            {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-1" />}
                          </button>
                          <button onClick={() => onLog(habit)} className={`h-10 px-3 rounded-xl font-bold flex items-center justify-center transition-transform active:scale-95 shadow-sm text-xs ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-600 text-white'}`}>
                            <PlusCircle size={14} strokeWidth={2.5} className="mr-1" /> 打卡
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 mt-2"><Check size={16} className="text-blue-500"/> 单次待办</h2>
        {sortedTodos.length === 0 ? <div className="text-center text-slate-400 text-sm py-10 bg-white rounded-2xl border border-dashed border-slate-200">此视图下没有任务哦 📝</div> : (
          <div className="grid gap-2">
            <AnimatePresence>
              {sortedTodos.map(todo => {
                const savedSeconds = getTaskSavedSeconds(todo.id) 
                const isToday = todo.recurrence && todo.recurrence !== 'none' || todo.targetDate === todayStr
                const isRunning = !!runningTimers[todo.id]

                return (
                  <motion.div key={todo.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className={`group p-4 rounded-2xl border flex items-center gap-4 transition-all hover:border-blue-100 ${todo.completed ? 'bg-slate-50 border-transparent shadow-none' : 'bg-white border-slate-100 shadow-sm'}`}>
                    <button onClick={() => toggleTodo(todo.id)} className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors shrink-0 ${todo.completed ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-300 text-transparent hover:border-blue-500'}`}><Check size={16} strokeWidth={3} /></button>
                    <div className="flex-1">
                      <h3 className={`font-bold transition-all ${todo.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{todo.title}</h3>
                      <div className="flex items-center gap-2 mt-1 opacity-80 flex-wrap">
                        {isRunning ? (
                          <span className="text-[10px] font-bold text-white bg-orange-500 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm"><Timer size={10}/> {getRunningTimeFormatted(todo.id)}</span>
                        ) : (
                          savedSeconds > 0 && <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded flex items-center gap-1"><Timer size={10}/> 投入: {formatTimeSafe(savedSeconds)}</span>
                        )}
                        {todo.reminderEnabled && <Bell size={10} className="text-orange-400" />}
                        {todo.recurrence && todo.recurrence !== 'none' && <span className="flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded text-uppercase"><Repeat size={10}/> {todo.recurrence === 'daily' ? '每天' : '每周'}</span>}
                        {formatTaskSchedule(todo, todayStr) && <span className="text-xs text-slate-400 font-medium">{formatTaskSchedule(todo, todayStr)}</span>}
                        {todo.tags?.map(tag => <span key={tag} className="text-[10px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded">{tag}</span>)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex opacity-50 hover:opacity-100 gap-1 mr-1">
                        <button onClick={() => onEdit(todo)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"><Pencil size={16}/></button>
                        <button onClick={() => softDeleteTodo(todo.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 size={16}/></button>
                      </div>
                      
                      {filterGroupId !== null && !isToday ? (
                        <button onClick={() => handleAssignToToday(todo, 'task')} disabled={todo.completed} className="h-9 px-3 bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-30 rounded-xl font-bold flex items-center justify-center transition-transform active:scale-95 text-xs border border-orange-200 shadow-sm">
                          <CalendarPlus size={14} className="mr-1" /> 调入今日
                        </button>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleTimer(todo)} disabled={todo.completed} className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm shrink-0 transition-colors disabled:opacity-30 ${isRunning ? 'bg-orange-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-orange-500 hover:bg-orange-50'}`}>
                            {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                          </button>
                          <button onClick={() => onLog(todo)} disabled={todo.completed} className="h-9 px-3 bg-slate-50 text-blue-600 hover:bg-blue-50 disabled:opacity-30 rounded-xl font-bold flex items-center justify-center transition-transform active:scale-95 text-xs border border-blue-100 shadow-sm">
                            <PlusCircle size={14} className="mr-1" /> 补记
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  )
}
