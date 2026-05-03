import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCcw, Trash2, ArchiveRestore } from 'lucide-react'
import { useData } from '../contexts/DataContext'

export default function RecycleBinModal({ onClose }) {
  const { habits, setHabits, onces, setOnces } = useData()

  // 找出所有被软删除的任务
  const deletedHabits = habits.filter(h => h.isDeleted)
  const deletedTodos = onces.filter(o => o.isDeleted)
  const allDeleted = [...deletedHabits, ...deletedTodos].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))

  // 恢复任务
  const handleRestore = (item) => {
    if (item.type === 'routine') {
      setHabits(habits.map(h => h.id === item.id ? { ...h, isDeleted: false, deletedAt: null } : h))
    } else {
      setOnces(onces.map(o => o.id === item.id ? { ...o, isDeleted: false, deletedAt: null } : o))
    }
  }

  // 彻底摧毁 (从数组中永久移除)
  const handleHardDelete = (item) => {
    if (item.type === 'routine') {
      setHabits(habits.filter(h => h.id !== item.id))
    } else {
      setOnces(onces.filter(o => o.id !== item.id))
    }
  }

  // 清空回收站
  const handleEmptyTrash = () => {
    if(window.confirm("确定要永久清空所有已删除的任务吗？此操作无法撤销。")) {
      setHabits(habits.filter(h => !h.isDeleted))
      setOnces(onces.filter(o => !o.isDeleted))
    }
  }

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col h-[70vh]">
        
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
          <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
            <ArchiveRestore className="text-slate-500" /> 回收站
          </h3>
          <X size={20} className="text-slate-400 cursor-pointer hover:text-slate-800" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {allDeleted.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <Trash2 size={48} className="mb-3" />
              <p>回收站是空的</p>
            </div>
          ) : (
            <AnimatePresence>
              {allDeleted.map(item => (
                <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-700 block line-through opacity-70">{item.title}</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">删除于: {new Date(item.deletedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRestore(item)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 flex items-center gap-1 text-xs font-bold">
                      <RefreshCcw size={14} /> 恢复
                    </button>
                    <button onClick={() => handleHardDelete(item)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {allDeleted.length > 0 && (
          <div className="p-4 border-t border-slate-100">
            <button onClick={handleEmptyTrash} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors">
              清空回收站
            </button>
          </div>
        )}

      </motion.div>
    </div>
  )
}