// src/components/SettingsModal.jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Save, ShieldCheck } from 'lucide-react'
import { useData } from '../contexts/DataContext'

export default function SettingsModal({ onClose }) {
  const { loadData } = useData()
  const [token, setToken] = useState(localStorage.getItem('github_token') || '')
  const [owner, setOwner] = useState(localStorage.getItem('github_owner') || '')
  const [repo, setRepo] = useState(localStorage.getItem('github_repo') || '')

  const handleSave = () => {
    localStorage.setItem('github_token', token.trim())
    localStorage.setItem('github_owner', owner.trim())
    localStorage.setItem('github_repo', repo.trim())
    loadData() // 重新拉取数据
    onClose()
  }

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-800 text-xl flex items-center gap-2"><ShieldCheck className="text-emerald-500" /> 云端同步设置</h3>
          <X size={20} className="text-slate-400 cursor-pointer hover:text-slate-800" onClick={onClose} />
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">GitHub Token (安全存储于本地)</label>
            <input type="password" value={token} onChange={e => setToken(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="ghp_xxxxxxxxxxx" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">用户名 (Owner)</label>
            <input type="text" value={owner} onChange={e => setOwner(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: Xocks" />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">仓库名 (Repo)</label>
            <input type="text" value={repo} onChange={e => setRepo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如: trackeroflife" />
          </div>

          <button onClick={handleSave} className="mt-4 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Save size={18} /> 保存并连接云端
          </button>
        </div>
      </motion.div>
    </div>
  )
}