import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function TimePicker({ onSelect }) {
  const [phase, setPhase] = useState('hour') // 'hour' | 'minute'
  const [hour, setHour] = useState('12')

  // 小时布局数据：外圈 1-12 (AM)，内圈 13-00 (PM)
  const hoursAM = ['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
  const hoursPM = ['00', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23']
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55']

  const handleHourClick = (h) => {
    setHour(h)
    setPhase('minute') // 点击小时后切换到分钟
  }

  const handleMinuteClick = (m) => {
    onSelect(`${hour}:${m}`) // 最终选择完成
  }

  // 计算圆圈位置的函数
  const getPos = (index, total, radius) => {
    const angle = (index * (360 / total) - 90) * (Math.PI / 180)
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    }
  }

  return (
    <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
      {/* 顶部状态显示 */}
      <div className="flex gap-2 mb-4 items-baseline">
        <span className={`text-2xl font-bold ${phase === 'hour' ? 'text-blue-600' : 'text-slate-400'}`}>{hour}</span>
        <span className="text-xl text-slate-300">:</span>
        <span className={`text-2xl font-bold ${phase === 'minute' ? 'text-blue-600' : 'text-slate-400'}`}>00</span>
      </div>

      {/* 时钟主盘体 */}
      <div className="relative w-48 h-48 bg-slate-200 rounded-full flex items-center justify-center">
        {/* 中心点 */}
        <div className="absolute w-2 h-2 bg-blue-500 rounded-full z-10" />

        <AnimatePresence mode="wait">
          {phase === 'hour' ? (
            <motion.div key="hours" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="relative w-full h-full">
              {/* 外圈 AM (1-12) */}
              {hoursAM.map((h, i) => {
                const pos = getPos(i, 12, 90)
                return (
                  <button key={h} onClick={() => handleHourClick(h)} type="button"
                    className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center text-xs font-bold hover:bg-blue-500 hover:text-white rounded-full transition-colors"
                    style={{ left: `calc(50% + ${pos.x}px)`, top: `calc(50% + ${pos.y}px)` }}>{h}</button>
                )
              })}
              {/* 内圈 PM (13-00) */}
              {hoursPM.map((h, i) => {
                const pos = getPos(i, 12, 55)
                return (
                  <button key={h} onClick={() => handleHourClick(h)} type="button"
                    className="absolute w-7 h-7 -ml-3.5 -mt-3.5 flex items-center justify-center text-[10px] text-slate-500 hover:bg-orange-500 hover:text-white rounded-full transition-colors"
                    style={{ left: `calc(50% + ${pos.x}px)`, top: `calc(50% + ${pos.y}px)` }}>{h}</button>
                )
              })}
            </motion.div>
          ) : (
            <motion.div key="minutes" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }} className="relative w-full h-full">
              {minutes.map((m, i) => {
                const pos = getPos(i, 12, 90)
                return (
                  <button key={m} onClick={() => handleMinuteClick(m)} type="button"
                    className="absolute w-8 h-8 -ml-4 -mt-4 flex items-center justify-center text-xs font-bold bg-white shadow-sm hover:bg-emerald-500 hover:text-white rounded-full transition-colors"
                    style={{ left: `calc(50% + ${pos.x}px)`, top: `calc(50% + ${pos.y}px)` }}>{m}</button>
                )
              })}
              <button onClick={() => setPhase('hour')} className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-blue-500 font-bold">返回小时</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}