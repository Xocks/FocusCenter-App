import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Database, ArchiveRestore, ChevronRight, Save, Trash2, RefreshCcw, Tag as TagIcon, Pencil, CalendarDays, Book, Copy, Download, Check, Info, History, Loader2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'

const CURRENT_VERSION = 'v6.1.1'

export default function SettingsView({ onBack }) { 
  const { loadData, habits, setHabits, onces, setOnces, allTags, setAllTags } = useData()
  const [subView, setSubView] = useState('main')
  const [copyFeedback, setCopyFeedback] = useState(false)
  
  // 🚀 动态更新日志状态
  const [changelog, setChangelog] = useState([])
  const [isLoadingLog, setIsLoadingLog] = useState(false)

  const githubToken = localStorage.getItem('github_token')
  const owner = localStorage.getItem('github_owner')
  const repo = localStorage.getItem('github_repo')

  // =============== 🚀 核心：自动拉取 GitHub 上的日志 ===============
  const fetchRemoteChangelog = useCallback(async () => {
    if (!githubToken || !owner || !repo) return
    setIsLoadingLog(true)
    try {
      const timestamp = new Date().getTime()
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/changelog.json?t=${timestamp}`
      const res = await fetch(url, {
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3.raw' },
        cache: 'no-store'
      })
      if (res.ok) {
        const data = await res.json()
        setChangelog(data)
      }
    } catch (e) {
      console.error("无法加载远程更新日志")
    } finally {
      setIsLoadingLog(false)
    }
  }, [githubToken, owner, repo])

  useEffect(() => {
    if (subView === 'changelog') fetchRemoteChangelog()
  }, [subView, fetchRemoteChangelog])

  // =============== 配置迁移逻辑 ===============
  const configKeys = ['github_token', 'github_owner', 'github_repo', 'gcal_client_id', 'gcal_api_key', 'obsidian_owner', 'obsidian_repo', 'obsidian_blacklist']
  const handleExportConfig = () => {
    const config = {}
    configKeys.forEach(key => { const val = localStorage.getItem(key); if (val) config[key] = val; })
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
      Object.keys(config).forEach(key => { if (configKeys.includes(key)) localStorage.setItem(key, config[key]) })
      alert("导入成功，页面即将刷新...")
      window.location.reload()
    } catch (e) { alert("导入失败，配置格式不正确") }
  }

  // =============== 各模块状态与保存逻辑 ===============
  const [token, setToken] = useState(localStorage.getItem('github_token') || '')
  const [uName, setUName] = useState(localStorage.getItem('github_owner') || '')
  const [rName, setRName] = useState(localStorage.getItem('github_repo') || '')
  const handleSaveGithub = () => { 
    localStorage.setItem('github_token', token.trim())
    localStorage.setItem('github_owner', uName.trim())
    localStorage.setItem('github_repo', rName.trim())
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

  // =============== 回收站与标签管理逻辑 ===============
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
              {/* 配置跨端迁移面板 */}
              <div className="bg-slate-800 rounded-3xl p-5 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><RefreshCcw size={18} className="text-blue-400" /><span className="font-bold text-sm">配置跨端迁移</span></div>
                  <span className="text-[10px] bg-slate-700 px-2 py-1 rounded-md font-mono text-slate-300">{CURRENT_VERSION}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportConfig} className="flex-1 bg-slate-700 hover:bg-slate-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                    {copyFeedback ? <><Check size={14} className="text-emerald-400" /> 已复制</> : <><Copy size={14} /> 导出配置</>}
                  </button>
                  <button onClick={handleImportConfig} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                    <Download size={14} /> 导入激活
                  </button>
                </div>
              </div>

              {/* 菜单列表 */}
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
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><Database size={20} className="text-slate-400" /> 数据同步配置</div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
                <button onClick={() => setSubView('recycle')} className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><ArchiveRestore size={20} className="text-slate-400" /> 回收站 <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{deletedItems.length}</span></div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
                <button onClick={() => setSubView('changelog')} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><History size={20} className="text-slate-400" /> 更新日志 (云端动态)</div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= 子视图: 谷歌日历配置 ================= */}
        {subView === 'calendar' && (
          <motion.div key="calendar" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0">
              <button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold text-slate-800">谷歌日历配置</h1>
            </header>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="text-xs text-slate-500 bg-blue-50 p-3 rounded-xl border border-blue-100 mb-4 leading-relaxed">请填入您在 Google Cloud 申请的 API 凭据。</div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">API Key (API 密钥)</label>
                  <input type="password" value={gcalApiKey} onChange={e => setGcalApiKey(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Client ID (客户端 ID)</label>
                  <input type="text" value={gcalClientId} onChange={e => setGcalClientId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none font-mono focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleSaveGcal} className="mt-4 w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={18} /> 保存配置</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= 子视图: GitHub 数据同步 ================= */}
        {subView === 'github' && (
          <motion.div key="github" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0">
              <button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold text-slate-800">数据同步配置</h1>
            </header>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">GitHub Personal Token</label>
                  <input type="password" value={token} onChange={e => setToken(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">GitHub 用户名</label>
                  <input type="text" value={uName} onChange={e => setUName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">任务仓库名称</label>
                  <input type="text" value={rName} onChange={e => setRName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleSaveGithub} className="mt-4 w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={18} /> 保存并强制同步</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= 子视图: Obsidian 配置 ================= */}
        {subView === 'obsidian' && (
          <motion.div key="obsidian" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0">
              <button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold text-slate-800">知识库配置</h1>
            </header>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">GitHub 用户名</label>
                  <input type="text" value={obsOwner} onChange={e => setObsOwner(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Obsidian 仓库名</label>
                  <input type="text" value={obsRepo} onChange={e => setObsRepo(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">黑名单 (逗号分隔)</label>
                  <textarea value={obsBlacklist} onChange={e => setObsBlacklist(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleSaveObsidian} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Save size={18} /> 保存配置</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ================= 子视图: 更新日志 ================= */}
        {subView === 'changelog' && (
          <motion.div key="changelog" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0">
              <button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold text-slate-800">更新日志</h1>
            </header>
            <div className="p-6 flex-1 overflow-y-auto space-y-6 pb-20">
              {isLoadingLog ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                  <span className="text-sm font-bold">同步云端记录...</span>
                </div>
              ) : changelog.length > 0 ? (
                changelog.map((log, index) => (
                  <div key={log.version} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{log.version}</span>
                      <span className="text-[10px] font-bold text-slate-300">{log.date}</span>
                    </div>
                    <ul className="space-y-2">
                      {log.changes.map((change, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2 leading-relaxed"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></span><span>{change}</span></li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="text-center p-10 text-slate-400">尚未在 GitHub 仓库发现 changelog.json</div>
              )}
            </div>
          </motion.div>
        )}

        {/* ================= 子视图: 标签管理 ================= */}
        {subView === 'tags' && (
          <motion.div key="tags" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
             <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0"><button onClick={() => { setSubView('main'); setEditingTag(null); }} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button><h1 className="text-xl font-bold text-slate-800">全局标签管理</h1></header>
            <div className="p-6 flex-1 overflow-y-auto space-y-3">{allTags.map(tag => ( <div key={tag} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">{editingTag === tag ? ( <div className="flex flex-1 items-center gap-2 mr-2"><input type="text" autoFocus value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenameTag()} className="flex-1 bg-slate-50 border border-blue-200 rounded-lg px-3 py-1.5 text-sm outline-none" /><button onClick={handleRenameTag} className="px-3 py-1.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-sm">保存</button></div> ) : ( <><div className="flex items-center gap-2"><TagIcon size={16} className="text-slate-400" /><span className="font-bold text-slate-700">{tag}</span></div><div className="flex items-center gap-2"><button onClick={() => { setEditingTag(tag); setNewTagName(tag); }} className="p-2 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={16} /></button><button onClick={() => handleDeleteTag(tag)} className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button></div></> )}</div> ))}</div>
          </motion.div>
        )}

        {/* ================= 子视图: 回收站 ================= */}
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