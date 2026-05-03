import React from 'react'
import { motion } from 'framer-motion'
import { Flame, Trophy, Target } from 'lucide-react'
import { useData } from '../contexts/DataContext'

export default function HabitView() {
  const { habits } = useData()

  // 简单的统计数据计算
  const totalHabits = habits.length
  const completedToday = habits.filter(h => h.completedToday).length
  const completionRate = totalHabits === 0 ? 0 : Math.round((completedToday / totalHabits) * 100)

  return (
    <div className="space-y-6">
      
      {/* 顶部概览卡片 */}
      <div className="bg-emerald-500 rounded-3xl p-6 text-white shadow-lg shadow-emerald-500/20">
        <h2 className="text-emerald-100 font-medium text-sm mb-1">今日习惯完成度</h2>
        <div className="flex items-end gap-2 mb-4">
          <span className="text-4xl font-black">{completionRate}%</span>
          <span className="text-emerald-100 text-sm mb-1">({completedToday}/{totalHabits})</span>
        </div>
        <div className="w-full h-2 bg-emerald-600/50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }} 
            animate={{ width: `${completionRate}%` }} 
            className="h-full bg-white rounded-full"
          />
        </div>
      </div>

      {/* 习惯列表统计 */}
      <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
        <Target size={16}/> 培养情况
      </h3>
      
      <div className="grid gap-3">
        {habits.map(habit => (
          <div key={habit.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h4 className="font-bold text-slate-800">{habit.title}</h4>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1 text-xs font-bold text-orange-500">
                  <Flame size={14} /> 
                  <span>连续 {habit.streak || 0} 天</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-slate-400">
                  <Trophy size={14} /> 
                  <span>历史最高 {habit.maxStreak || 0} 天</span>
                </div>
              </div>
            </div>
            
            {/* 状态指示灯 */}
            <div className={`w-3 h-3 rounded-full ${habit.completedToday ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-200'}`} />
          </div>
        ))}
        
        {habits.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-8 bg-white rounded-2xl border border-dashed border-slate-200">
            还没有设置任何习惯哦
          </div>
        )}
      </div>

    </div>
  )
}