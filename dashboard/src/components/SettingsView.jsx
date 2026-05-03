import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Database, ArchiveRestore, ChevronRight, Save, Trash2, RefreshCcw, Tag as TagIcon, Pencil, CalendarDays, Book, Copy, Download, Check } from 'lucide-react'
import { useData } from '../contexts/DataContext'

export default function SettingsView({ onBack }) { 
  const { loadData, habits, setHabits, onces, setOnces, allTags, setAllTags } = useData()
  const [subView, setSubView] = useState('main')
  const [copyFeedback, setCopyFeedback] = useState(false)

  // =============== 配置迁移逻辑 (Export/Import) ===============
  const configKeys = [
    'github_token', 'github_owner', 'github_repo',
    'gcal_client_id', 'gcal_api_key',
    'obsidian_owner', 'obsidian_repo', 'obsidian_blacklist'
  ]

  const handleExportConfig = () => {
    const config = {}
    configKeys.forEach(key => {
      const val = localStorage.getItem(key)
      if (val) config[key] = val
    })
    const configStr = btoa(encodeURIComponent(JSON.stringify(config)))
    navigator.clipboard.writeText(configStr)
    setCopyFeedback(true)
    setTimeout(() => setCopyFeedback(false), 2000)
  }

  const handleImportConfig = () => {
    const input = window.prompt("请粘贴配置代码 (Base64 字符串):")
    if (!input) return
    try {
      const config = JSON.parse(decodeURIComponent(atob(input)))
      Object.keys(config).forEach(key => {
        if (configKeys.includes(key)) {
          localStorage.setItem(key, config[key])
        }
      })
      alert("配置导入成功！正在重启同步引擎...")
      window.location.reload()
    } catch (e) {
      alert("配置解析失败，请确保代码完整且未被修改。")
    }
  }

  // =============== 各模块配置逻辑 ===============
  const [token, setToken] = useState(localStorage.getItem('github_token') || '')
  const [owner, setOwner] = useState(localStorage.getItem('github_owner') || '')
  const [repo, setRepo] = useState(localStorage.getItem('github_repo') || '')
  const handleSaveGithub = () => { 
    localStorage.setItem('github_token', token.trim())
    localStorage.setItem('github_owner', owner.trim())
    localStorage.setItem('github_repo', repo.trim())
    loadData()
    setSubView('main')
  }

  const [gcalClientId, setGcalClientId] = useState(localStorage.getItem('gcal_client_id') || '')
  const [gcalApiKey, setGcalApiKey] = useState(localStorage.getItem('gcal_api_key') || '')
  const handleSaveGcal = () => { 
    localStorage.setItem('gcal_client_id', gcalClientId.trim())
    localStorage.setItem('gcal_api_key', gcalApiKey.trim())
    setSubView('main')
  }

  const [obsOwner, setObsOwner] = useState(localStorage.getItem('obsidian_owner') || '')
  const [obsRepo, setObsRepo] = useState(localStorage.getItem('obsidian_repo') || '')
  const [obsBlacklist, setObsBlacklist] = useState(localStorage.getItem('obsidian_blacklist') || '.obsidian, .git, README.md, 私密日记')
  const handleSaveObsidian = () => { 
    localStorage.setItem('obsidian_owner', obsOwner.trim())
    localStorage.setItem('obsidian_repo', obsRepo.trim())
    localStorage.setItem('obsidian_blacklist', obsBlacklist.trim())
    setSubView('main')
  }

  // =============== 回收站与标签管理 ===============
  const deletedItems = [...habits.filter(h => h.isDeleted), ...onces.filter(o => o.isDeleted)].sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt))
  const handleRestore = (item) => {
    if (item.type === 'routine') setHabits(habits.map(h => h.id === item.id ? { ...h, isDeleted: false, deletedAt: null } : h))
    else setOnces(onces.map(o => o.id === item.id ? { ...o, isDeleted: false, deletedAt: null } : o))
  }
  const handleHardDelete = (item) => {
    if (item.type === 'routine') setHabits(habits.filter(h => h.id !== item.id))
    else setOnces(onces.filter(o => o.id !== item.id))
  }

  const [editingTag, setEditingTag] = useState(null)
  const [newTagName, setNewTagName] = useState('')
  const handleDeleteTag = (tag) => {
    if(!window.confirm(`确定删除标签 "${tag}" 吗？`)) return
    setAllTags(allTags.filter(t => t !== tag))
    setHabits(habits.map(h => ({ ...h, tags: (h.tags || []).filter(t => t !== tag) })))
    setOnces(onces.map(o => ({ ...o, tags: (o.tags || []).filter(t => t !== tag) })))
  }
  const handleRenameTag = () => {
    const freshTag = newTagName.trim()
    if (!freshTag || freshTag === editingTag) { setEditingTag(null); return; }
    if (allTags.includes(freshTag)) { alert("标签名已存在！"); return; }
    setAllTags(allTags.map(t => t === editingTag ? freshTag : t))
    const replaceTag = (tags) => (tags || []).map(t => t === editingTag ? freshTag : t)
    setHabits(habits.map(h => ({ ...h, tags: replaceTag(h.tags) })))
    setOnces(onces.map(o => ({ ...o, tags: replaceTag(o.tags) })))
    setEditingTag(null)
  }

  const pageVariants = {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { type: 'tween', ease: [0.0, 0.0, 0.2, 1], duration: 0.25 } },
    exit: { x: '10%', opacity: 0, transition: { type: 'tween', ease: [0.4, 0.0, 1, 1], duration: 0.2 } }
  }

  return (
    <div className="h-full w-full bg-slate-50 relative overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        
        {subView === 'main' && (
          <motion.div key="main" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0">
              <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold text-slate-800">系统设置</h1>
            </header>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              <div className="bg-slate-800 rounded-3xl p-5 text-white shadow-xl space-y-4">
                <div className="flex items-center gap-2">
                  <RefreshCcw size={18} className="text-blue-400" />
                  <span className="font-bold text-sm">配置跨端迁移</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">一键导出当前设备的所有 Token 和配置，安全地发送并在手机端进行极速激活。</p>
                <div className="flex gap-2">
                  <button onClick={handleExportConfig} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                    {copyFeedback ? <><Check size={14} className="text-emerald-400" /> 已复制</> : <><Copy size={14} /> 导出配置</>}
                  </button>
                  <button onClick={handleImportConfig} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                    <Download size={14} /> 导入激活
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <button onClick={() => setSubView('tags')} className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><TagIcon size={20} className="text-slate-400" /> 标签管理 <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{allTags.length}</span></div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
                <button onClick={() => setSubView('calendar')} className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><CalendarDays size={20} className="text-slate-400" /> 谷歌日历配置</div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
                <button onClick={() => setSubView('obsidian')} className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><Book size={20} className="text-slate-400" /> Obsidian 知识库配置</div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
                <button onClick={() => setSubView('github')} className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><Database size={20} className="text-slate-400" /> GitHub 同步配置</div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
                <button onClick={() => setSubView('recycle')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><ArchiveRestore size={20} className="text-slate-400" /> 回收站 <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{deletedItems.length}</span></div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= 知识库配置 ================= */}
        {subView === 'obsidian' && (
          <motion.div key="obsidian" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0">
              <button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold text-slate-800">知识库配置</h1>
            </header>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-xl border border-blue-100 leading-relaxed">
                  绑定存放 Obsidian 笔记的 GitHub 仓库。使用全局 Token 进行访问，支持私有仓库。
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">GitHub 用户名</label>
                  <input type="text" value={obsOwner} onChange={e => setObsOwner(e.target.value)} placeholder="如: sxfgrhhh" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Obsidian 仓库名</label>
                  <input type="text" value={obsRepo} onChange={e => setObsRepo(e.target.value)} placeholder="如: my-obsidian-vault" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">黑名单 (以逗号分隔)</label>
                  <textarea value={obsBlacklist} onChange={e => setObsBlacklist(e.target.value)} placeholder="如: .obsidian, .git, 隐私文件夹" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" />
                </div>
                <button onClick={handleSaveObsidian} className="mt-6 w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={18} /> 保存配置</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= 谷歌日历配置 ================= */}
        {subView === 'calendar' && (
          <motion.div key="calendar" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0"><button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button><h1 className="text-xl font-bold text-slate-800">谷歌日历配置</h1></header>
            <div className="p-6 flex-1 overflow-y-auto space-y-4"><div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4"><div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4 leading-relaxed">请填入您在 Google Cloud 申请的凭据。</div><div><label className="block text-xs font-bold text-slate-500 mb-1">API Key (API 密钥)</label><input type="password" value={gcalApiKey} onChange={e => setGcalApiKey(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono" /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">Client ID (客户端 ID)</label><input type="text" value={gcalClientId} onChange={e => setGcalClientId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono" /></div><button onClick={handleSaveGcal} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex justify-center"><Save size={18} className="mr-2"/> 保存配置</button></div></div>
          </motion.div>
        )}
        
        {/* ================= GitHub 同步配置 ================= */}
        {subView === 'github' && (
          <motion.div key="github" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0"><button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button><h1 className="text-xl font-bold text-slate-800">GitHub 配置</h1></header>
            <div className="p-6 flex-1 overflow-y-auto space-y-4"><div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">Token</label><input type="password" value={token} onChange={e => setToken(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">用户名</label><input type="text" value={owner} onChange={e => setOwner(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">任务数据仓库名</label><input type="text" value={repo} onChange={e => setRepo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div><button onClick={handleSaveGithub} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex justify-center"><Save size={18} className="mr-2"/> 保存配置</button></div></div>
          </motion.div>
        )}

        {/* ================= 标签管理 ================= */}
        {subView === 'tags' && (
          <motion.div key="tags" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
             <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0"><button onClick={() => { setSubView('main'); setEditingTag(null); }} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button><h1 className="text-xl font-bold text-slate-800">全局标签管理</h1></header>
            <div className="p-6 flex-1 overflow-y-auto space-y-3">{allTags.map(tag => ( <div key={tag} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">{editingTag === tag ? ( <div className="flex flex-1 items-center gap-2 mr-2"><input type="text" autoFocus value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenameTag()} className="flex-1 bg-slate-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm outline-none" /><button onClick={handleRenameTag} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm">保存</button></div> ) : ( <><div className="flex items-center gap-2"><TagIcon size={16} className="text-slate-400" /><span className="font-bold text-slate-700">{tag}</span></div><div className="flex items-center gap-2"><button onClick={() => { setEditingTag(tag); setNewTagName(tag); }} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button><button onClick={() => handleDeleteTag(tag)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div></> )}</div> ))}</div>
          </motion.div>
        )}

        {/* ================= 回收站 ================= */}
        {subView === 'recycle' && (
          <motion.div key="recycle" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center justify-between shrink-0"><div className="flex items-center gap-4"><button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button><h1 className="text-xl font-bold text-slate-800">回收站</h1></div>{deletedItems.length > 0 && <button onClick={() => { if(window.confirm("彻底清空？")) { setHabits(habits.filter(h => !h.isDeleted)); setOnces(onces.filter(o => !o.isDeleted)); } }} className="text-red-500 text-sm font-bold px-3 py-1.5 bg-red-50 rounded-lg">清空</button>}</header>
            <div className="p-6 flex-1 overflow-y-auto space-y-2">{deletedItems.map(item => ( <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex justify-between items-center"><div><div className="font-bold text-slate-500 line-through">{item.title}</div><div className="text-[10px] text-slate-400 mt-1">删除于: {new Date(item.deletedAt).toLocaleString()}</div></div><div className="flex gap-2"><button onClick={() => handleRestore(item)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><RefreshCcw size={16} /></button><button onClick={() => handleHardDelete(item)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16} /></button></div></div> ))}</div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}