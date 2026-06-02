import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArchiveRestore, Book, Check, ChevronRight, Copy, Database, Download, History, Loader2, Palette, Pencil, RefreshCcw, Save, Tag as TagIcon, Trash2 } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { LOCAL_CHANGELOG } from '../changelog'
import { VISUAL_TEMPLATE_OPTIONS } from '../utils/visualPresets'

const CURRENT_VERSION = 'v6.3.3'

const normalizeChangelog = (entries) => {
  if (!Array.isArray(entries)) return []
  return entries
    .filter(entry => entry && typeof entry === 'object' && entry.version)
    .map(entry => ({
      version: String(entry.version),
      date: entry.date || '',
      changes: Array.isArray(entry.changes) ? entry.changes : [],
    }))
}

const mergeChangelog = (remoteEntries) => {
  const merged = []
  const seen = new Set()

  normalizeChangelog(LOCAL_CHANGELOG).forEach(entry => {
    merged.push(entry)
    seen.add(entry.version)
  })

  normalizeChangelog(remoteEntries).forEach(entry => {
    if (!seen.has(entry.version)) {
      merged.push(entry)
      seen.add(entry.version)
    }
  })

  return merged
}

export default function SettingsView({ onBack }) {
  const { loadData, habits, setHabits, onces, setOnces, allTags, setAllTags, groups, setGroups, uiSettings, setUiSettings } = useData()
  const [subView, setSubView] = useState('main')
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [changelog, setChangelog] = useState(() => mergeChangelog([]))
  const [isLoadingLog, setIsLoadingLog] = useState(false)

  const githubToken = localStorage.getItem('github_token')
  const owner = localStorage.getItem('github_owner')
  const repo = localStorage.getItem('github_repo')

  const fetchRemoteChangelog = useCallback(async () => {
    if (!githubToken || !owner || !repo) {
      setChangelog(mergeChangelog([]))
      return
    }

    setIsLoadingLog(true)
    try {
      const timestamp = Date.now()
      const url = `https://api.github.com/repos/${owner}/${repo}/contents/changelog.json?t=${timestamp}`
      const res = await fetch(url, {
        headers: { Authorization: `token ${githubToken}`, Accept: 'application/vnd.github.v3.raw' },
        cache: 'no-store',
      })

      if (res.ok) {
        const data = await res.json()
        setChangelog(mergeChangelog(data))
      } else {
        setChangelog(mergeChangelog([]))
      }
    } catch {
      console.error('无法加载远程更新日志')
      setChangelog(mergeChangelog([]))
    } finally {
      setIsLoadingLog(false)
    }
  }, [githubToken, owner, repo])

  useEffect(() => {
    if (subView === 'changelog') fetchRemoteChangelog()
  }, [subView, fetchRemoteChangelog])

  const configKeys = ['github_token', 'github_owner', 'github_repo', 'obsidian_owner', 'obsidian_repo', 'obsidian_blacklist']
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
    const input = window.prompt('请粘贴配置代码(Base64 字符串):')
    if (!input) return
    try {
      const config = JSON.parse(decodeURIComponent(atob(input)))
      Object.keys(config).forEach(key => {
        if (configKeys.includes(key)) localStorage.setItem(key, config[key])
      })
      alert('导入成功，页面即将刷新')
      window.location.reload()
    } catch {
      alert('导入失败，配置格式不正确')
    }
  }

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

  const [obsOwner, setObsOwner] = useState(localStorage.getItem('obsidian_owner') || '')
  const [obsRepo, setObsRepo] = useState(localStorage.getItem('obsidian_repo') || '')
  const [obsBlacklist, setObsBlacklist] = useState(localStorage.getItem('obsidian_blacklist') || '.obsidian, .git, README.md, 私密日记')
  const handleSaveObsidian = () => {
    localStorage.setItem('obsidian_owner', obsOwner.trim())
    localStorage.setItem('obsidian_repo', obsRepo.trim())
    localStorage.setItem('obsidian_blacklist', obsBlacklist.trim())
    setSubView('main')
  }

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
    if (!window.confirm(`确定删除标签 "${tag}" 吗？`)) return
    setAllTags(allTags.filter(t => t !== tag))
    setHabits(habits.map(h => ({ ...h, tags: (h.tags || []).filter(t => t !== tag) })))
    setOnces(onces.map(o => ({ ...o, tags: (o.tags || []).filter(t => t !== tag) })))
  }
  const handleRenameTag = () => {
    const freshTag = newTagName.trim()
    if (!freshTag || freshTag === editingTag) {
      setEditingTag(null)
      return
    }
    if (allTags.includes(freshTag)) {
      alert('标签名已存在')
      return
    }
    setAllTags(allTags.map(t => t === editingTag ? freshTag : t))
    const replaceTag = (tags) => (tags || []).map(t => t === editingTag ? freshTag : t)
    setHabits(habits.map(h => ({ ...h, tags: replaceTag(h.tags) })))
    setOnces(onces.map(o => ({ ...o, tags: replaceTag(o.tags) })))
    setEditingTag(null)
  }

  const pageVariants = {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1, transition: { type: 'tween', ease: [0.0, 0.0, 0.2, 1], duration: 0.25 } },
    exit: { x: '10%', opacity: 0, transition: { type: 'tween', ease: [0.4, 0.0, 1, 1], duration: 0.2 } },
  }

  const settingsItems = [
    { id: 'appearance', label: '外观与布局', icon: Palette },
    { id: 'tags', label: '标签管理', icon: TagIcon, count: allTags.length },
    { id: 'obsidian', label: 'Obsidian 知识库配置', icon: Book },
    { id: 'github', label: '数据同步配置', icon: Database },
    { id: 'recycle', label: '回收站', icon: ArchiveRestore, count: deletedItems.length },
    { id: 'changelog', label: '更新日志', icon: History },
  ]

  const renderHeader = (title, onClick = () => setSubView('main')) => (
    <header className="flex shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-6 pb-4 pt-10 lg:pt-5">
      <button onClick={onClick} className="-ml-2 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100"><ArrowLeft size={24} /></button>
      <h1 className="text-xl font-bold text-slate-800">{title}</h1>
    </header>
  )

  const updateUiSettings = (updater) => setUiSettings(typeof updater === 'function' ? updater(uiSettings) : updater)

  const updateDashboardModule = (device, moduleId, patch) => {
    updateUiSettings(current => ({
      ...current,
      dashboardLayouts: {
        ...current.dashboardLayouts,
        [device]: current.dashboardLayouts[device].map(item => item.id === moduleId ? { ...item, ...patch } : item),
      },
    }))
  }

  const moveDashboardModule = (device, moduleId, direction) => {
    const layout = [...uiSettings.dashboardLayouts[device]].sort((a, b) => a.order - b.order)
    const index = layout.findIndex(item => item.id === moduleId)
    const targetIndex = index + direction
    if (index < 0 || targetIndex < 0 || targetIndex >= layout.length) return
    const reordered = [...layout]
    const [item] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, item)
    updateUiSettings(current => ({
      ...current,
      dashboardLayouts: {
        ...current.dashboardLayouts,
        [device]: reordered.map((entry, idx) => ({ ...entry, order: idx + 1 })),
      },
    }))
  }

  const updateGroupVisual = (groupId, patch) => {
    setGroups(groups.map(group => group.id === groupId ? { ...group, visual: { ...(group.visual || {}), ...patch } } : group))
  }

  const moduleLabels = { hero: '今日中控', habits: '今日习惯', todos: '今日任务', logs: '今日流水' }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-50">
      <AnimatePresence initial={false} mode="popLayout">
        {subView === 'main' && (
          <motion.div key="main" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col">
            {renderHeader('系统设置', onBack)}

            <div className="mx-auto w-full max-w-4xl flex-1 space-y-6 overflow-y-auto p-6">
              <div className="rounded-3xl bg-slate-800 p-5 text-white shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2"><RefreshCcw size={18} className="text-blue-400" /><span className="text-sm font-bold">配置跨端迁移</span></div>
                  <span className="rounded-md bg-slate-700 px-2 py-1 font-mono text-[10px] text-slate-300">{CURRENT_VERSION}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleExportConfig} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-700 py-2.5 text-xs font-bold transition-colors hover:bg-slate-600">
                    {copyFeedback ? <><Check size={14} className="text-emerald-400" /> 已复制</> : <><Copy size={14} /> 导出配置</>}
                  </button>
                  <button onClick={handleImportConfig} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-bold transition-colors hover:bg-blue-500">
                    <Download size={14} /> 导入配置
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
                {settingsItems.map((item, index) => {
                  const Icon = item.icon
                  return (
                    <button key={item.id} onClick={() => setSubView(item.id)} className={`flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50 ${index < settingsItems.length - 1 ? 'border-b border-slate-100' : ''}`}>
                      <div className="flex items-center gap-3 font-bold text-slate-700">
                        <Icon size={20} className="text-slate-400" />
                        {item.label}
                        {item.count !== undefined && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{item.count}</span>}
                      </div>
                      <ChevronRight size={20} className="text-slate-300" />
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}

        {subView === 'appearance' && (
          <motion.div key="appearance" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 z-10 flex flex-col bg-slate-50">
            {renderHeader('外观与布局')}
            <div className="mx-auto w-full max-w-5xl flex-1 space-y-6 overflow-y-auto p-6 pb-20">
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-black text-slate-700">全局外观</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1 text-xs font-bold text-slate-500">
                    默认模板
                    <select value={uiSettings.visualDefaults.templateId} onChange={e => updateUiSettings(current => ({ ...current, visualDefaults: { ...current.visualDefaults, templateId: e.target.value } }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none">
                      {VISUAL_TEMPLATE_OPTIONS.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-bold text-slate-500">
                    默认颜色
                    <input type="color" value={uiSettings.visualDefaults.color} onChange={e => updateUiSettings(current => ({ ...current, visualDefaults: { ...current.visualDefaults, color: e.target.value } }))} className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-2" />
                  </label>
                  <label className="space-y-1 text-xs font-bold text-slate-500">
                    纹理
                    <select value={uiSettings.visualDefaults.texture} onChange={e => updateUiSettings(current => ({ ...current, visualDefaults: { ...current.visualDefaults, texture: e.target.value } }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none">
                      <option value="none">无</option>
                      <option value="paper">纸感</option>
                      <option value="grain">颗粒</option>
                    </select>
                  </label>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {VISUAL_TEMPLATE_OPTIONS.map(template => (
                    <div key={template.id} className={`rounded-2xl border p-4 ${template.cardClass}`}>
                      <div className={`text-sm font-black ${template.textClass}`}>{template.name}</div>
                      <div className={`mt-1 text-xs font-bold ${template.mutedClass}`}>{template.id}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-black text-slate-700">侧边栏</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="space-y-1 text-xs font-bold text-slate-500">
                    桌面位置
                    <select value={uiSettings.sidebar.desktopPosition} onChange={e => updateUiSettings(current => ({ ...current, sidebar: { ...current.sidebar, desktopPosition: e.target.value } }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none">
                      <option value="left">左侧</option>
                      <option value="right">右侧</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-bold text-slate-500">
                    宽度
                    <select value={uiSettings.sidebar.desktopWidth} onChange={e => updateUiSettings(current => ({ ...current, sidebar: { ...current.sidebar, desktopWidth: e.target.value } }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none">
                      <option value="narrow">窄</option>
                      <option value="normal">标准</option>
                      <option value="wide">宽</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                    <input type="checkbox" checked={uiSettings.sidebar.defaultCollapsed} onChange={e => updateUiSettings(current => ({ ...current, sidebar: { ...current.sidebar, defaultCollapsed: e.target.checked } }))} />
                    默认收起
                  </label>
                </div>
              </section>

              {['desktop', 'mobile'].map(device => (
                <section key={device} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-sm font-black text-slate-700">{device === 'desktop' ? '桌面首页布局' : '手机首页布局'}</h2>
                  <div className="space-y-3">
                    {[...uiSettings.dashboardLayouts[device]].sort((a, b) => a.order - b.order).map(module => (
                      <div key={module.id} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1.2fr_0.9fr_0.9fr_0.9fr_auto] md:items-center">
                        <label className="flex items-center gap-2 text-sm font-black text-slate-700">
                          <input type="checkbox" checked={module.visible !== false} onChange={e => updateDashboardModule(device, module.id, { visible: e.target.checked })} />
                          {moduleLabels[module.id] || module.id}
                        </label>
                        <select value={module.size} onChange={e => updateDashboardModule(device, module.id, { size: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                          {(device === 'desktop' ? ['small', 'medium', 'large', 'wide', 'full'] : ['full', 'half']).map(size => <option key={size} value={size}>{size}</option>)}
                        </select>
                        <select value={module.density} onChange={e => updateDashboardModule(device, module.id, { density: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                          <option value="compact">紧凑</option>
                          <option value="comfortable">舒展</option>
                        </select>
                        <select value={module.cardStyle} onChange={e => updateDashboardModule(device, module.id, { cardStyle: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                          {VISUAL_TEMPLATE_OPTIONS.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                        </select>
                        <div className="flex gap-1">
                          <button onClick={() => moveDashboardModule(device, module.id, -1)} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-500">上</button>
                          <button onClick={() => moveDashboardModule(device, module.id, 1)} className="rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-500">下</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-black text-slate-700">分组外观</h2>
                <div className="space-y-3">
                  {groups.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-bold text-slate-400">还没有分组</div>}
                  {groups.map(group => (
                    <div key={group.id} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_0.7fr_0.9fr_1fr] md:items-center">
                      <div className="font-black text-slate-700">{group.title}</div>
                      <input type="color" value={group.visual?.color || uiSettings.visualDefaults.color} onChange={e => updateGroupVisual(group.id, { color: e.target.value })} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-2" />
                      <select value={group.visual?.templateId || uiSettings.visualDefaults.templateId} onChange={e => updateGroupVisual(group.id, { templateId: e.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600">
                        {VISUAL_TEMPLATE_OPTIONS.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                      </select>
                      <input value={group.visual?.imageUrl || ''} onChange={e => updateGroupVisual(group.id, { imageUrl: e.target.value })} placeholder="图片 URL" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </motion.div>
        )}

        {subView === 'github' && (
          <motion.div key="github" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 z-10 flex flex-col bg-slate-50">
            {renderHeader('数据同步配置')}
            <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto p-6">
              <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">GitHub Personal Token</label>
                  <input type="password" value={token} onChange={e => setToken(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">GitHub 用户名</label>
                  <input type="text" value={uName} onChange={e => setUName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">任务仓库名称</label>
                  <input type="text" value={rName} onChange={e => setRName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleSaveGithub} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-bold text-white"><Save size={18} /> 保存并同步</button>
              </div>
            </div>
          </motion.div>
        )}

        {subView === 'obsidian' && (
          <motion.div key="obsidian" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 z-10 flex flex-col bg-slate-50">
            {renderHeader('知识库配置')}
            <div className="mx-auto w-full max-w-xl flex-1 overflow-y-auto p-6">
              <div className="space-y-5 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">GitHub 用户名</label>
                  <input type="text" value={obsOwner} onChange={e => setObsOwner(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">Obsidian 仓库名</label>
                  <input type="text" value={obsRepo} onChange={e => setObsRepo(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-500">黑名单(逗号分隔)</label>
                  <textarea value={obsBlacklist} onChange={e => setObsBlacklist(e.target.value)} className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <button onClick={handleSaveObsidian} className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 py-3 font-bold text-white"><Save size={18} /> 保存配置</button>
              </div>
            </div>
          </motion.div>
        )}

        {subView === 'changelog' && (
          <motion.div key="changelog" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 z-10 flex flex-col bg-slate-50">
            {renderHeader('更新日志')}
            <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 overflow-y-auto p-6 pb-20">
              {isLoadingLog ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                  <span className="text-sm font-bold">同步云端记录...</span>
                </div>
              ) : changelog.length > 0 ? (
                changelog.map((log, index) => (
                  <div key={log.version} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${index === 0 ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{log.version}</span>
                      <span className="text-[10px] font-bold text-slate-300">{log.date}</span>
                    </div>
                    <ul className="space-y-2">
                      {log.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-slate-600"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400"></span><span>{change}</span></li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <div className="p-10 text-center text-slate-400">尚未发现更新日志</div>
              )}
            </div>
          </motion.div>
        )}

        {subView === 'tags' && (
          <motion.div key="tags" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 z-10 flex flex-col bg-slate-50">
            {renderHeader('全局标签管理')}
            <div className="mx-auto w-full max-w-2xl flex-1 space-y-3 overflow-y-auto p-6">
              {allTags.map(tag => (
                <div key={tag} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  {editingTag === tag ? (
                    <div className="mr-2 flex flex-1 items-center gap-2">
                      <input type="text" autoFocus value={newTagName} onChange={e => setNewTagName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRenameTag()} className="flex-1 rounded-lg border border-blue-200 bg-slate-50 px-3 py-1.5 text-sm outline-none" />
                      <button onClick={handleRenameTag} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-bold text-white shadow-sm">保存</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2"><TagIcon size={16} className="text-slate-400" /><span className="font-bold text-slate-700">{tag}</span></div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => { setEditingTag(tag); setNewTagName(tag) }} className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>
                        <button onClick={() => handleDeleteTag(tag)} className="rounded-lg bg-slate-50 p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {subView === 'recycle' && (
          <motion.div key="recycle" variants={pageVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 z-10 flex flex-col bg-slate-50">
            <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 pb-4 pt-10 lg:pt-5">
              <div className="flex items-center gap-4"><button onClick={() => setSubView('main')} className="-ml-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"><ArrowLeft size={24} /></button><h1 className="text-xl font-bold text-slate-800">回收站</h1></div>
              {deletedItems.length > 0 && <button onClick={() => { if (window.confirm('彻底清空？')) { setHabits(habits.filter(h => !h.isDeleted)); setOnces(onces.filter(o => !o.isDeleted)) } }} className="rounded-lg bg-red-50 px-3 py-1.5 text-sm font-bold text-red-500">清空</button>}
            </header>
            <div className="mx-auto w-full max-w-3xl flex-1 space-y-2 overflow-y-auto p-6">
              {deletedItems.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4">
                  <div><div className="font-bold text-slate-500 line-through">{item.title}</div><div className="mt-1 text-[10px] text-slate-400">删除于 {new Date(item.deletedAt).toLocaleString()}</div></div>
                  <div className="flex gap-2"><button onClick={() => handleRestore(item)} className="rounded-lg bg-emerald-50 p-2 text-emerald-600"><RefreshCcw size={16} /></button><button onClick={() => handleHardDelete(item)} className="rounded-lg bg-red-50 p-2 text-red-600"><Trash2 size={16} /></button></div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
