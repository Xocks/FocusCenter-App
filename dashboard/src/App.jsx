import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  BarChart2,
  Book,
  Check,
  CheckSquare,
  Cloud,
  CloudOff,
  Folder,
  FolderPlus,
  Inbox,
  LayoutList,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { useData } from './contexts/DataContext'

import TodoView from './components/TodoView.jsx'
import TodayDashboard from './components/TodayDashboard.jsx'
import AddModal from './components/AddModal.jsx'
import SettingsView from './components/SettingsView.jsx'
import StatsView from './components/StatsView.jsx'
import LogModal from './components/LogModal.jsx'
import DiaryView from './components/DiaryView.jsx'
import AiImportView from './components/AiImportView.jsx'

export default function App() {
  const { isInitialLoaded, syncStatus, syncMode, setSyncMode, performSync, groups, setGroups, allTags, uiSettings } = useData()

  const [currentRoute, setCurrentRoute] = useState({ path: 'today' })
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [loggingItem, setLoggingItem] = useState(null)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [desktopNavCollapsedOverride, setDesktopNavCollapsedOverride] = useState(null)

  const androidEase = { type: 'tween', ease: [0.0, 0.0, 0.2, 1], duration: 0.3 }

  const primaryTabs = [
    { id: 'today', label: '今日', icon: CheckSquare },
    { id: 'stats', label: '追踪', icon: BarChart2 },
    { id: 'diary', label: '日记', icon: Book },
  ]

  const managementTabs = [
    { id: 'tasks', label: '所有任务', icon: LayoutList },
    { id: 'ai-import', label: 'AI 导入', icon: Sparkles },
    { id: 'inbox', label: '收集箱', icon: Inbox },
  ]

  const routeTitle = {
    today: '今日中控',
    tasks: '所有任务',
    'ai-import': 'AI 导入',
    inbox: '收集箱',
    stats: '时间统计',
    diary: '知识库',
    settings: '系统设置',
  }

  const sidebarSettings = uiSettings.sidebar || {}
  const sidebarWidthClass = sidebarSettings.desktopWidth === 'wide' ? 'w-80' : sidebarSettings.desktopWidth === 'narrow' ? 'w-64' : 'w-72'
  const shellDirectionClass = sidebarSettings.desktopPosition === 'right' ? 'lg:flex-row-reverse' : ''
  const isDesktopNavCollapsed = desktopNavCollapsedOverride ?? Boolean(sidebarSettings.defaultCollapsed)
  const navOrder = Array.isArray(sidebarSettings.navOrder) ? sidebarSettings.navOrder : []
  const orderedNavItems = [...primaryTabs, ...managementTabs].sort((a, b) => {
    const ai = navOrder.indexOf(a.id)
    const bi = navOrder.indexOf(b.id)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })

  const confirmCreateGroup = () => {
    if (newGroupName.trim()) {
      const newGroup = { id: `g_${Date.now()}`, title: newGroupName.trim(), createdAt: new Date().toISOString() }
      setGroups([...groups, newGroup])
      setNewGroupName('')
      setIsCreatingGroup(false)
      setCurrentRoute({ path: 'group', params: { id: newGroup.id } })
    }
  }

  const handleNav = (path, params = null) => {
    setCurrentRoute({ path, params })
    setIsDrawerOpen(false)
    setIsSyncMenuOpen(false)
  }

  const getCurrentTitle = () => {
    if (currentRoute.path === 'group') {
      return groups.find(g => g.id === currentRoute.params?.id)?.title || '任务组'
    }
    return routeTitle[currentRoute.path] || 'FocusCenter'
  }

  const renderSyncControl = (compact = false, placement = 'bottom') => (
    <div className="relative">
      <button
        onClick={() => syncStatus === 'no-config' ? handleNav('settings') : setIsSyncMenuOpen(!isSyncMenuOpen)}
        className={`flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 text-xs font-medium transition-colors hover:bg-slate-100 ${compact ? 'justify-center' : ''}`}
        title="同步状态"
      >
        {syncStatus === 'no-config' && <><AlertCircle size={14} className="text-orange-500"/><span className={`text-orange-500 ${compact ? 'hidden' : 'hidden sm:inline'}`}>未配置</span></>}
        {syncStatus === 'saving' && <><RefreshCw size={14} className="animate-spin text-blue-500"/><span className={`text-blue-500 ${compact ? 'hidden' : 'hidden sm:inline'}`}>同步中</span></>}
        {syncStatus === 'success' && <><Cloud size={14} className="text-emerald-500"/><span className={`text-emerald-500 ${compact ? 'hidden' : 'hidden sm:inline'}`}>已同步</span></>}
        {syncStatus === 'error' && <><CloudOff size={14} className="text-red-500"/><span className={`text-red-500 ${compact ? 'hidden' : 'hidden sm:inline'}`}>离线</span></>}
      </button>

      <AnimatePresence>
        {isSyncMenuOpen && syncStatus !== 'no-config' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute z-[80] max-h-72 w-40 overflow-y-auto rounded-xl border border-slate-100 bg-white shadow-xl ${placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} ${compact || sidebarSettings.desktopPosition === 'right' ? 'left-0' : 'right-0'}`}
          >
            <div className="border-b border-slate-100 p-1.5">
              <button onClick={() => { setSyncMode('auto'); setIsSyncMenuOpen(false) }} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${syncMode === 'auto' ? 'bg-blue-50 font-bold text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>自动同步</button>
              <button onClick={() => { setSyncMode('manual'); setIsSyncMenuOpen(false) }} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${syncMode === 'manual' ? 'bg-blue-50 font-bold text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}>手动同步</button>
            </div>
            <div className="p-1.5">
              <button onClick={() => { setIsSyncMenuOpen(false); performSync() }} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-white">立即同步</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const renderNavButton = (item, collapsed = false) => {
    const Icon = item.icon
    const isActive = currentRoute.path === item.id
    return (
      <button
        key={item.id}
        onClick={() => handleNav(item.id)}
        title={item.label}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <Icon size={19} className="shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    )
  }

  const renderGroupList = (collapsed = false) => (
    <div className="space-y-1">
      {!collapsed && (
        <div className="flex items-center justify-between px-2 pb-1 pt-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">我的任务组</span>
          <button onClick={() => setIsCreatingGroup(!isCreatingGroup)} className="p-1 text-blue-500 transition-colors hover:text-blue-600">
            {isCreatingGroup ? <X size={16} /> : <FolderPlus size={16} />}
          </button>
        </div>
      )}

      {!collapsed && isCreatingGroup && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-white p-1 shadow-sm">
          <input
            type="text"
            autoFocus
            placeholder="输入新组名..."
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmCreateGroup()}
            className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-sm text-slate-700 outline-none"
          />
          <button onClick={confirmCreateGroup} disabled={!newGroupName.trim()} className="rounded-lg bg-blue-50 p-1.5 text-blue-600 disabled:opacity-50"><Check size={16}/></button>
        </div>
      )}

      {groups.map(g => {
        const isActive = currentRoute.path === 'group' && currentRoute.params?.id === g.id
        return (
          <button
            key={g.id}
            onClick={() => handleNav('group', { id: g.id })}
            title={g.title}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${collapsed ? 'justify-center' : ''} ${isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Folder size={18} className={`shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
            {!collapsed && <span className="truncate">{g.title}</span>}
          </button>
        )
      })}
    </div>
  )

  if (!isInitialLoaded) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-slate-50 text-slate-400">
        <RefreshCw size={28} className="animate-spin text-blue-500" />
        <span className="font-medium">连接云端数据库中...</span>
      </div>
    )
  }

  const showFab = ['today', 'tasks', 'group', 'inbox'].includes(currentRoute.path)

  return (
    <div className={`relative flex h-screen w-full overflow-hidden bg-slate-50 font-sans text-slate-900 ${shellDirectionClass}`}>
      <aside className={`hidden shrink-0 border-slate-200 bg-white transition-all duration-200 lg:flex lg:flex-col ${sidebarSettings.desktopPosition === 'right' ? 'border-l' : 'border-r'} ${isDesktopNavCollapsed ? 'w-20' : sidebarWidthClass}`}>
        <div className={`flex h-16 items-center border-b border-slate-100 px-4 ${isDesktopNavCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isDesktopNavCollapsed && <span className="text-xl font-black tracking-tight text-slate-800">FocusCenter</span>}
          <button onClick={() => setDesktopNavCollapsedOverride(!isDesktopNavCollapsed)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            {isDesktopNavCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">{orderedNavItems.map(item => renderNavButton(item, isDesktopNavCollapsed))}</div>
          <div className="my-4 border-t border-slate-100" />
          {renderGroupList(isDesktopNavCollapsed)}
        </div>

        <div className="space-y-2 border-t border-slate-100 p-3">
          {renderSyncControl(isDesktopNavCollapsed, 'top')}
          <button
            onClick={() => handleNav('settings')}
            title="系统设置"
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 ${isDesktopNavCollapsed ? 'justify-center' : ''} ${currentRoute.path === 'settings' ? 'bg-slate-100 text-slate-900' : ''}`}
          >
            <Settings size={19} className="shrink-0" />
            {!isDesktopNavCollapsed && <span>系统设置</span>}
          </button>
        </div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {currentRoute.path !== 'settings' && (
          <header className="z-[40] flex shrink-0 items-center justify-between bg-white px-5 pb-4 pt-10 shadow-sm lg:hidden">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsDrawerOpen(true)} className="-ml-2 rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100">
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-bold text-slate-800">{getCurrentTitle()}</h1>
            </div>
            {renderSyncControl()}
          </header>
        )}

        {currentRoute.path !== 'settings' && (
          <div className="hidden shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/90 px-8 py-4 lg:flex">
            <h1 className="text-xl font-black text-slate-800">{getCurrentTitle()}</h1>
            <div className="text-xs font-bold text-slate-400">桌面工作台</div>
          </div>
        )}

        <main className="relative flex-1 overflow-y-auto bg-slate-50">
          {currentRoute.path === 'today' && <div className="mx-auto max-w-screen-2xl p-4 pb-24 sm:p-6 lg:p-8"><TodayDashboard onLog={(item) => setLoggingItem(item)} /></div>}
          {currentRoute.path === 'tasks' && <div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 lg:p-8"><TodoView onEdit={(item) => { setEditingItem(item); setIsAddModalOpen(true) }} onLog={(item) => setLoggingItem(item)} filterGroupId="all" /></div>}
          {currentRoute.path === 'inbox' && <div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 lg:p-8"><TodoView onEdit={(item) => { setEditingItem(item); setIsAddModalOpen(true) }} onLog={(item) => setLoggingItem(item)} filterGroupId="inbox" /></div>}
          {currentRoute.path === 'group' && <div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 lg:p-8"><TodoView onEdit={(item) => { setEditingItem(item); setIsAddModalOpen(true) }} onLog={(item) => setLoggingItem(item)} filterGroupId={currentRoute.params.id} /></div>}
          {currentRoute.path === 'ai-import' && <AiImportView onNavigate={handleNav} />}
          {currentRoute.path === 'settings' && <SettingsView onBack={() => handleNav('today')} />}
          {currentRoute.path === 'stats' && <StatsView />}
          {currentRoute.path === 'diary' && <DiaryView />}
        </main>
      </div>

      {showFab && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingItem(null); setIsAddModalOpen(true) }} className="absolute bottom-24 right-6 z-[45] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-600/30 lg:bottom-8 lg:right-8">
          <Plus size={28} />
        </motion.button>
      )}

      {['today', 'stats', 'diary'].includes(currentRoute.path) && (
        <nav className="absolute bottom-0 left-0 right-0 z-[50] mx-auto flex w-full max-w-md items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-2 pb-6 lg:hidden">
          {primaryTabs.map(tab => {
            const Icon = tab.icon
            const isActive = currentRoute.path === tab.id
            return (
              <button key={tab.id} onClick={() => handleNav(tab.id)} className={`flex flex-1 flex-col items-center gap-1 py-1 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      )}

      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm lg:hidden" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={androidEase} className="absolute bottom-0 left-0 top-0 z-[70] flex w-[280px] flex-col bg-slate-50 shadow-2xl lg:hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 pb-6 pt-12">
                <span className="text-2xl font-black tracking-tight text-slate-800">FocusCenter</span>
                <X size={20} className="cursor-pointer text-slate-400 hover:text-slate-800" onClick={() => setIsDrawerOpen(false)} />
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-4">
                <div className="space-y-1">
                  {[...primaryTabs, ...managementTabs].map(item => renderNavButton(item))}
                </div>
                <div className="border-t border-slate-200 pt-3">{renderGroupList()}</div>
              </div>
              <div className="shrink-0 space-y-1 border-t border-slate-100 bg-white p-4">
                <button onClick={() => handleNav('settings')} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-bold text-slate-600 transition-colors hover:bg-slate-100"><Settings size={20} className="text-slate-400" /> 系统设置</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>{isAddModalOpen && <AddModal availableTags={allTags} initialData={editingItem} onClose={() => { setIsAddModalOpen(false); setEditingItem(null) }} />}</AnimatePresence>
      <AnimatePresence>{loggingItem && <LogModal task={loggingItem} onClose={() => setLoggingItem(null)} />}</AnimatePresence>
    </div>
  )
}
