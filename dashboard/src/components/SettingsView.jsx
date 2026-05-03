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
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/changelog.json`, {
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3.raw' }
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

  // =============== 配置迁移逻辑 (保持不变) ===============
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
    const input = window.prompt("请粘贴配置代码:")
    if (!input) return
    try {
      const config = JSON.parse(decodeURIComponent(atob(input)))
      Object.keys(config).forEach(key => { if (configKeys.includes(key)) localStorage.setItem(key, config[key]) })
      window.location.reload()
    } catch (e) { alert("导入失败") }
  }

  // =============== 配置保存逻辑 (保持不变) ===============
  const [token, setToken] = useState(localStorage.getItem('github_token') || '')
  const [uName, setUName] = useState(localStorage.getItem('github_owner') || '')
  const [rName, setRName] = useState(localStorage.getItem('github_repo') || '')
  const handleSaveGithub = () => { localStorage.setItem('github_token', token.trim()); localStorage.setItem('github_owner', uName.trim()); localStorage.setItem('github_repo', rName.trim()); loadData(); setSubView('main'); }

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
              <button onClick={onBack} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button>
              <h1 className="text-xl font-bold text-slate-800">系统设置</h1>
            </header>
            
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="bg-slate-800 rounded-3xl p-5 text-white shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><RefreshCcw size={18} className="text-blue-400" /><span className="font-bold text-sm">配置跨端迁移</span></div>
                  <span className="text-[10px] bg-slate-700 px-2 py-1 rounded-md font-mono text-slate-300">{CURRENT_VERSION}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportConfig} className="flex-1 bg-slate-700 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                    {copyFeedback ? <Check size={14} /> : <Copy size={14} />} {copyFeedback ? '已复制' : '导出配置'}
                  </button>
                  <button onClick={handleImportConfig} className="flex-1 bg-blue-600 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"><Download size={14} /> 导入激活</button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <button onClick={() => setSubView('calendar')} className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><CalendarDays size={20} className="text-slate-400" /> 谷歌日历配置</div>
                  <ChevronRight size={20} className="text-slate-300" />
                </button>
                <button onClick={() => setSubView('github')} className="w-full flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 font-bold"><Database size={20} className="text-slate-400" /> 数据同步配置</div>
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

        {/* ================= 🚀 动态更新日志页面 ================= */}
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
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0"></span>
                          <span>{change}</span>
                        </li>
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

        {/* 其他设置子视图（GitHub, Calendar等）逻辑保持不变，只需按需保留 */}
        {subView === 'github' && (
          <motion.div key="github" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col z-10 bg-slate-50">
            <header className="px-6 pt-10 pb-4 bg-white border-b border-slate-100 flex items-center gap-4 shrink-0"><button onClick={() => setSubView('main')} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"><ArrowLeft size={24} /></button><h1 className="text-xl font-bold text-slate-800">GitHub 配置</h1></header>
            <div className="p-6 flex-1 overflow-y-auto space-y-4"><div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4"><div><label className="block text-xs font-bold text-slate-500 mb-1">Token</label><input type="password" value={token} onChange={e => setToken(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">用户名</label><input type="text" value={uName} onChange={e => setUName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div><div><label className="block text-xs font-bold text-slate-500 mb-1">任务数据仓库名</label><input type="text" value={rName} onChange={e => setRName(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" /></div><button onClick={handleSaveGithub} className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl flex justify-center"><Save size={18} className="mr-2"/> 保存配置并同步日志</button></div></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}