import React, { useState } from 'react'
// 🚀 核心修复：确保精确导入 Framer Motion 的所有动画模块
import { motion, AnimatePresence } from 'framer-motion'
// 🚀 确保图标库导入完整无缺
import { Clock, Zap, Target, PieChart as PieChartIcon, Tag as TagIcon, ListTodo, CheckCircle2, Trash2, BarChart2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { getBeijingDateKey, getLogDateKey } from '../utils/date'
// 导入图表库
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts'

// 图表主题色系
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b']

const addDaysToDateKey = (dateKey, amount) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + amount))
  return date.toISOString().slice(0, 10)
}

const getDateKeyWeekday = (dateKey) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay()
}

// ==================== 独立抽离的单条流水账组件 (防止解析器崩溃) ====================
const RecordItem = ({ record, onUndo }) => {
  const sec = record.durationSeconds || 0
  const m = Math.floor(sec / 60)
  const s = sec % 60
  
  let timeText = ""
  if (sec > 0) {
    if (sec < 60) {
      timeText = sec + "秒"
    } else {
      timeText = m + "分"
      if (s > 0) {
        timeText = timeText + s + "秒"
      }
    }
  }

  let progressText = ""
  if (record.progressAdded > 0) {
    progressText = "+" + record.progressAdded + " " + (record.unit || "次")
  }

  const dateObj = new Date(record.completedAt)
  const MM = String(dateObj.getMonth() + 1).padStart(2, '0')
  const DD = String(dateObj.getDate()).padStart(2, '0')
  const hh = String(dateObj.getHours()).padStart(2, '0')
  const mm = String(dateObj.getMinutes()).padStart(2, '0')
  const timeString = `${MM}/${DD} ${hh}:${mm}`

  return (
    <motion.div 
      layout 
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white p-4 rounded-2xl flex justify-between items-center border border-slate-100 shadow-sm group"
    >
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        <CheckCircle2 size={18} className="text-blue-500 shrink-0" />
        <span className="text-sm font-bold text-slate-700 truncate">{record.taskTitle}</span>
      </div>
      
      <div className="flex items-center gap-4 shrink-0 pl-4">
        <div className="text-right flex flex-col items-end gap-0.5">
          <div className="flex gap-2">
            {timeText !== "" && (
              <span className="text-sm font-black text-slate-800 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" /> {timeText}
              </span>
            )}
            {progressText !== "" && (
              <span className="text-sm font-black text-emerald-600 flex items-center gap-1">
                <Zap size={12} className="text-emerald-400" /> {progressText}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            {timeString}
          </div>
        </div>
        
        <button onClick={() => onUndo(record)} className="p-2 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all opacity-100 md:opacity-0 group-hover:opacity-100" title="撤销此记录">
          <Trash2 size={16} />
        </button>
      </div>
    </motion.div>
  )
}

// ==================== 主数据看板组件 ====================
export default function StatsView() {
  // 🚀 修复：补齐了 setTimeLogs 和 setHabits，防止撤销时报错
  const { timeLogs, setTimeLogs, habits, setHabits, onces, groups } = useData()

  const [viewMode, setViewMode] = useState('time') 
  const [timeRange, setTimeRange] = useState('today') 

  // 日期范围计算
  const todayKey = getBeijingDateKey()
  let rangeStartKey = todayKey
  if (timeRange === 'week') {
    const day = getDateKeyWeekday(todayKey) || 7
    rangeStartKey = addDaysToDateKey(todayKey, -(day - 1))
  }
  if (timeRange === 'month') rangeStartKey = `${todayKey.slice(0, 8)}01`

  const filteredRecords = timeLogs.filter(log => getLogDateKey(log) >= rangeStartKey)

  // ==================== 【数据计算：时间透视】 ====================
  const totalSeconds = filteredRecords.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0)
  const displayHours = Math.floor(totalSeconds / 3600)
  const displayMinutes = Math.floor((totalSeconds % 3600) / 60)

  // 组别时间聚合 (饼图数据)
  const groupTimeMap = {}
  let inboxSeconds = 0
  filteredRecords.forEach(log => {
    const secs = log.durationSeconds || 0
    if (secs === 0) return
    let logsGroups = log.groupIds
    // 兼容历史数据，若无烙印则回源查找
    if (!logsGroups) {
      const taskObj = [...habits, ...onces].find(t => t.id === log.taskId)
      logsGroups = taskObj ? (taskObj.groupIds || []) : []
    }
    
    if (logsGroups.length === 0) inboxSeconds += secs
    else logsGroups.forEach(gId => { groupTimeMap[gId] = (groupTimeMap[gId] || 0) + secs })
  })

  const pieData = Object.keys(groupTimeMap).map(gId => {
    const gObj = groups.find(g => g.id === gId)
    return { name: gObj ? gObj.title : '已删除任务组', value: Math.floor(groupTimeMap[gId] / 60) }
  }).filter(d => d.value > 0)

  if (Math.floor(inboxSeconds / 60) > 0) {
    pieData.push({ name: '未分类 (碎片)', value: Math.floor(inboxSeconds / 60) })
  }

  // 具体标签时间聚合 (条形图数据)
  const tagTimeMap = {}
  filteredRecords.forEach(log => {
    const secs = log.durationSeconds || 0
    if (secs === 0) return
    
    let currentTags = log.tags
    if (!currentTags) {
      const taskObj = [...habits, ...onces].find(t => t.id === log.taskId)
      currentTags = taskObj ? (taskObj.tags || []) : []
    }

    if (currentTags.length === 0) {
      tagTimeMap['无标签'] = (tagTimeMap['无标签'] || 0) + secs
    } else {
      currentTags.forEach(tag => { tagTimeMap[tag] = (tagTimeMap[tag] || 0) + secs })
    }
  })
  const tagData = Object.keys(tagTimeMap).map(k => ({ tag: k, seconds: tagTimeMap[k] })).sort((a,b) => b.seconds - a.seconds)

  // ==================== 【数据计算：习惯量化】 ====================
  const habitLogs = filteredRecords.filter(log => log.progressAdded > 0)
  const activeHabitTitles = habits
    .filter(habit => !habit.isDeleted && habit.type === 'routine')
    .map(habit => habit.title)
    .filter(Boolean)
  const uniqueHabitTitles = Array.from(new Set([...activeHabitTitles, ...habitLogs.map(l => l.taskTitle).filter(Boolean)]))
  
  const [selectedHabit, setSelectedHabit] = useState('')
  if (!selectedHabit && uniqueHabitTitles.length > 0) {
    setSelectedHabit(uniqueHabitTitles[0])
  } else if (selectedHabit && !uniqueHabitTitles.includes(selectedHabit) && uniqueHabitTitles.length > 0) {
    setSelectedHabit(uniqueHabitTitles[0])
  }

  const dailyDataMap = {}
  let selectedHabitTotal = 0
  const selectedHabitObj = habits.find(habit => habit.title === selectedHabit && !habit.isDeleted && habit.type === 'routine')
  let selectedHabitUnit = selectedHabitObj?.unit || '次'

  if (selectedHabit) {
    habitLogs.filter(l => l.taskTitle === selectedHabit).forEach(log => {
      const dateKey = getLogDateKey(log)
      const dayStr = dateKey.slice(5).replace('-', '/')
      
      dailyDataMap[dayStr] = (dailyDataMap[dayStr] || 0) + log.progressAdded
      selectedHabitTotal += log.progressAdded
      selectedHabitUnit = log.unit || selectedHabitUnit
    })
  }

  const barChartData = []
  for (let dateKey = rangeStartKey; dateKey <= todayKey; dateKey = addDaysToDateKey(dateKey, 1)) {
    const day = dateKey.slice(5).replace('-', '/')
    barChartData.push({ date: day, value: dailyDataMap[day] || 0 })
  }

  // 撤销逻辑
  const handleUndo = (record) => {
    if (!window.confirm("确定要撤销这条记录吗？如果是习惯，相关的进度也会被扣除。")) return
    setTimeLogs(timeLogs.filter(log => log.id !== record.id))
    if (record.progressAdded > 0) {
      setHabits(habits.map(h => {
        if (h.id === record.taskId) {
          const newProgress = Math.max(0, (h.currentProgress || 0) - record.progressAdded)
          return { ...h, currentProgress: newProgress, completedToday: newProgress >= h.targetValue }
        }
        return h
      }))
    }
  }

  return (
    <div className="p-6 pb-24 space-y-6">
      
      {/* 🚀 顶部控制器 */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 space-y-2">
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setViewMode('time')} className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${viewMode === 'time' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Clock size={16}/> 时间透视
          </button>
          <button onClick={() => setViewMode('habit')} className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${viewMode === 'habit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Target size={16}/> 习惯量化
          </button>
        </div>
        
        <div className="flex">
          {[{id: 'today', label: '今日'}, {id: 'week', label: '本周'}, {id: 'month', label: '本月'}].map(tab => (
            <button key={tab.id} onClick={() => setTimeRange(tab.id)} className={`flex-1 py-2 text-xs font-bold transition-all ${timeRange === tab.id ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 border-b-2 border-transparent hover:text-slate-600'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        
        {/* ==================== 视图 1：时间透视 ==================== */}
        {viewMode === 'time' && (
          <motion.div key="time-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            <div className="bg-slate-800 rounded-3xl p-6 text-center shadow-lg relative overflow-hidden">
              <Clock size={100} className="absolute -right-6 -bottom-6 text-slate-700 opacity-20" />
              <h3 className="text-slate-400 text-sm font-bold mb-2">有效记录总时长</h3>
              <div className="flex justify-center items-end gap-2 relative z-10">
                {displayHours > 0 && (
                  <React.Fragment>
                    <span className="text-5xl font-black text-white">{displayHours}</span>
                    <span className="text-slate-400 mb-1 font-bold">小时</span>
                  </React.Fragment>
                )}
                <span className="text-5xl font-black text-white">{displayMinutes}</span>
                <span className="text-slate-400 mb-1 font-bold">分钟</span>
              </div>
            </div>

            {pieData.length > 0 && (
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest mb-4"><PieChartIcon size={14} /> 项目组精力分布</h3>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip formatter={(value) => `${value} 分钟`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {entry.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tagData.length > 0 && (
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest mb-4"><TagIcon size={14} /> 具体属性/标签耗时榜</h3>
                <div className="space-y-3">
                  {tagData.map((data, index) => {
                    const m = Math.floor(data.seconds / 60)
                    const h = Math.floor(m / 60)
                    const displayTime = h > 0 ? `${h}h ${m % 60}m` : `${m}m`
                    const percent = Math.max((data.seconds / totalSeconds) * 100, 2)

                    return (
                      <div key={index} className="space-y-1 group">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-slate-700 flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"/>{data.tag}</span>
                          <span className="text-blue-600">{displayTime}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className="h-full bg-blue-500 rounded-full" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ==================== 视图 2：习惯量化 ==================== */}
        {viewMode === 'habit' && (
          <motion.div key="habit-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            
            {uniqueHabitTitles.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                当前范围内没有记录任何习惯哦💧
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <select 
                    value={selectedHabit} onChange={e => setSelectedHabit(e.target.value)}
                    className="bg-white border border-slate-200 text-slate-800 font-bold text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                  >
                    {uniqueHabitTitles.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="bg-emerald-500 rounded-3xl p-6 shadow-lg shadow-emerald-500/20 text-white relative overflow-hidden">
                  <Zap size={100} className="absolute -right-6 -bottom-6 text-emerald-400 opacity-20" />
                  <h3 className="text-emerald-100 text-sm font-bold mb-2">该范围总计</h3>
                  <div className="flex items-end gap-2 relative z-10">
                    <span className="text-5xl font-black">{selectedHabitTotal}</span>
                    <span className="text-emerald-100 mb-1 font-bold text-lg">{selectedHabitUnit}</span>
                  </div>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase tracking-widest mb-4"><ListTodo size={14} /> 每日起伏趋势</h3>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`${value} ${selectedHabitUnit}`, '新增进度']} />
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 详细流水账列表 (不论在什么视图下都会显示) */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 mb-3 flex items-center gap-1 uppercase tracking-widest">
          <BarChart2 size={14} /> 详细流水账
        </h3>
        <div className="space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-10 bg-white rounded-2xl border border-dashed border-slate-200">
              {timeRange === 'today' ? '今天' : timeRange === 'week' ? '本周' : '本月'}还没有记录哦
            </div>
          ) : (
            <AnimatePresence>
              {filteredRecords.slice().reverse().map(record => (
                <RecordItem key={record.id} record={record} onUndo={handleUndo} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
      
    </div>
  )
}
