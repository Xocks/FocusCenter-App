import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Timer, Zap, CheckCircle2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'

export default function LogModal({ task, onClose }) {
  const { habits, setHabits, timeLogs, setTimeLogs } = useData()
  
  const isHabit = task.type === 'routine'
  const [duration, setDuration] = useState('')
  const [amount, setAmount] = useState(isHabit ? (task.stepValue || 1) : 0)

  // 处理保存逻辑
  const handleSave = () => {
    const durNum = Number(duration) || 0
    const amtNum = Number(amount) || 0

    // 只要有时间或进度产生，就生成一条流水账
    if (durNum > 0 || (isHabit && amtNum > 0)) {
      const newRecord = {
        id: Date.now().toString(),
        taskId: task.id,
        taskTitle: task.title,
        mode: 'manual', 
        durationSeconds: durNum * 60, 
        progressAdded: isHabit ? amtNum : 0, 
        unit: task.unit || '次', 
        groupIds: task.groupIds || [],
        // 🚀 核心升级：增加“标签快照”，永久烙印动作属性
        tags: task.tags || [], 
        completedAt: new Date().toISOString()
      }
      setTimeLogs([...timeLogs, newRecord])
    }

    // 更新习惯的实际进度
    if (isHabit && amtNum > 0) {
      setHabits(habits.map(h => {
        if (h.id === task.id) {
          const newProgress = Math.max(0, (h.currentProgress || 0) + amtNum)
          return { ...h, currentProgress: newProgress, completedToday: newProgress >= h.targetValue }
        }
        return h
      }))
    }

    onClose()
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ y: 50, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-blue-500" size={20} />
            <h3 className="font-bold text-slate-800 text-lg">打卡记录</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-200/50 p-1.5 rounded-full transition-colors"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1">正在记录</span>
            <span className="font-black text-slate-700 text-lg leading-tight">{task.title}</span>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                <Timer size={16} className="text-orange-500"/> 投入了多长时间？(可选)
              </label>
              <div className="relative">
                <input 
                  type="number" autoFocus placeholder="例如: 30"
                  value={duration} onChange={e => setDuration(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">分钟</span>
              </div>
            </div>

            {isHabit && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                  <Zap size={16} className="text-emerald-500"/> 增加了多少进度？
                </label>
                <div className="relative">
                  <input 
                    type="number" placeholder="例如: 1"
                    value={amount} onChange={e => setAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-xl font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-slate-400">{task.unit || '次'}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleSave} className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-lg shadow-slate-800/20 active:scale-95 flex justify-center items-center gap-2">
            保存记录
          </button>
        </div>
      </motion.div>
    </div>
  )
}