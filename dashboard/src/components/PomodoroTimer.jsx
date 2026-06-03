import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Play, Pause, Square, Clock, Timer, Minimize2, Maximize2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { getBeijingDateKey, nowIso } from '../utils/date'

export default function PomodoroTimer({ timerState, setTimerState }) {
  const { habits, onces, timeLogs, setTimeLogs } = useData()
  
  // 核心状态：'stopwatch' (秒表) | 'countdown' (倒计时)
  const [mode, setMode] = useState('stopwatch') 
  const [isActive, setIsActive] = useState(false)
  
  // 时间状态
  const [secondsElapsed, setSecondsElapsed] = useState(0) // 已经经过的秒数
  const [countdownTarget, setCountdownTarget] = useState(45 * 60) // 倒计时目标秒数 (默认45分钟)
  const [inputMinutes, setInputMinutes] = useState(45) // 用户输入的分钟数
  
  // 关联任务
  const [selectedTask, setSelectedTask] = useState('')

  const activeTasks = [
    ...habits.filter(h => !h.isDeleted).map(h => ({ ...h, title: `[习惯] ${h.title}` })),
    ...onces.filter(o => !o.isDeleted && !o.completed).map(o => ({ ...o, title: `[待办] ${o.title}` }))
  ]

  // 核心计时循环
  useEffect(() => {
    let interval = null
    if (isActive) {
      interval = setInterval(() => {
        setSecondsElapsed(sec => {
          const nextSec = sec + 1
          // 如果是倒计时，且时间走完，则触发结束
          if (mode === 'countdown' && nextSec >= countdownTarget) {
            setIsActive(false)
            handleFinish(nextSec) 
          }
          return nextSec
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isActive, mode, countdownTarget])

  const formatTime = (totalSeconds) => {
    const s = mode === 'countdown' ? countdownTarget - totalSeconds : totalSeconds
    const m = Math.floor(s / 60).toString().padStart(2, '0')
    const sec = (s % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }

  // 结束并结算
  const handleFinish = (finalSeconds = secondsElapsed) => {
    setIsActive(false)
    const minutesSpent = Math.round(finalSeconds / 60)
    
    // 碎片时间过滤机制 (少于1分钟丢弃)
    if (minutesSpent < 1) {
      alert("⚠️ 时间少于 1 分钟，已被过滤，不计入统计。")
    } else {
      const selectedTaskObj = activeTasks.find(t => t.id === selectedTask)
      const timestamp = nowIso()
      const newRecord = {
        id: Date.now().toString(),
        taskId: selectedTask || 'unassigned',
        taskTitle: selectedTask ? selectedTaskObj?.title : '自由探索',
        mode: mode,
        durationSeconds: finalSeconds,
        progressAdded: 0,
        unit: selectedTaskObj?.unit || '',
        groupIds: selectedTaskObj?.groupIds || [],
        tags: selectedTaskObj?.tags || [],
        dateKey: getBeijingDateKey(),
        completedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      }
      setTimeLogs([...timeLogs, newRecord])
      alert(`🎉 记录成功！已投入 ${minutesSpent} 分钟。`)
    }
    
    // 重置状态
    setSecondsElapsed(0)
    setTimerState('closed')
  }

  const handleApplyCountdown = () => {
    setCountdownTarget(inputMinutes * 60)
    setSecondsElapsed(0)
    setIsActive(false)
  }

  // ==== 悬浮胶囊视图 ====
  if (timerState === 'minimized') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        className="fixed bottom-24 right-6 z-50 bg-slate-900 text-white rounded-full shadow-2xl flex items-center p-2 pr-4 border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors"
        onClick={() => setTimerState('open')}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${isActive ? 'bg-orange-500 animate-pulse' : 'bg-slate-700'}`}>
          {mode === 'stopwatch' ? <Timer size={20} /> : <Clock size={20} />}
        </div>
        <div>
          <div className="text-xs font-bold text-slate-400 max-w-[120px] truncate">
            {selectedTask ? activeTasks.find(t => t.id === selectedTask)?.title || '专注中...' : '自由探索...'}
          </div>
          <div className="text-lg font-black font-mono tracking-wider">{formatTime(secondsElapsed)}</div>
        </div>
        <Maximize2 size={16} className="ml-4 text-slate-500" />
      </motion.div>
    )
  }

  // ==== 隐藏视图 ====
  if (timerState === 'closed') return null

  // ==== 完整主面板视图 ====
  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-700">
        
        <div className="flex justify-between items-center p-5 border-b border-slate-800">
          <h2 className="text-white font-bold flex items-center gap-2"><Timer size={18} className="text-blue-500" /> 全能追踪器</h2>
          <div className="flex gap-4">
            <button onClick={() => setTimerState('minimized')} className="text-slate-400 hover:text-white" title="最小化到角落"><Minimize2 size={18} /></button>
            <button onClick={() => setTimerState('closed')} className="text-slate-400 hover:text-red-500"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6 flex flex-col items-center">
          {/* 模式切换 (计时中不可切换) */}
          <div className="flex bg-slate-800 p-1 rounded-xl mb-6 w-full">
            <button disabled={isActive} onClick={() => { setMode('stopwatch'); setSecondsElapsed(0); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${mode === 'stopwatch' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>正向秒表</button>
            <button disabled={isActive} onClick={() => { setMode('countdown'); setSecondsElapsed(0); }} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50 ${mode === 'countdown' ? 'bg-orange-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>自定义倒数</button>
          </div>

          {/* 倒计时输入框 */}
          {mode === 'countdown' && !isActive && secondsElapsed === 0 && (
            <div className="flex items-center gap-2 mb-4 w-full bg-slate-800 p-2 rounded-xl">
              <input type="number" value={inputMinutes} onChange={e => setInputMinutes(e.target.value)} className="w-16 bg-slate-900 border border-slate-700 text-white text-center rounded-lg py-1 outline-none focus:border-orange-500" />
              <span className="text-slate-400 text-sm font-bold">分钟</span>
              <button onClick={handleApplyCountdown} className="ml-auto bg-slate-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-600">设定时间</button>
            </div>
          )}

          {/* 巨大时间显示 */}
          <div className="my-6">
            <span className={`text-7xl font-black font-mono tracking-tighter ${isActive ? 'text-white' : 'text-slate-500'}`}>
              {formatTime(secondsElapsed)}
            </span>
          </div>

          <div className="w-full mb-8">
            <select disabled={isActive} value={selectedTask} onChange={e => setSelectedTask(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500 appearance-none disabled:opacity-50">
              <option value="">🎯 关联任务 (例如: 刷 AcWing 算法、408复习)</option>
              {activeTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          {/* 控制按钮组 */}
          <div className="flex gap-4 w-full">
            {secondsElapsed > 0 && (
              <button onClick={() => handleFinish(secondsElapsed)} className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-300 font-bold flex justify-center items-center gap-2 hover:bg-red-500 hover:text-white transition-all">
                <Square size={18} fill="currentColor" /> 结束并保存
              </button>
            )}
            <button onClick={() => setIsActive(!isActive)} className={`flex-[2] py-4 rounded-2xl flex justify-center items-center text-white font-black text-lg transition-transform active:scale-95 ${isActive ? 'bg-orange-500 shadow-lg shadow-orange-500/20' : 'bg-blue-600 shadow-lg shadow-blue-600/20'}`}>
              {isActive ? <><Pause size={24} fill="currentColor" className="mr-2" /> 暂停追踪</> : <><Play size={24} fill="currentColor" className="mr-2" /> 开始追踪</>}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
