import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, Plus, Cloud, CloudOff, RefreshCw, AlertCircle, LayoutList, Folder, FolderPlus, Settings, X, CheckSquare, Book, Calendar as CalendarIcon, BarChart2, Check, Inbox } from 'lucide-react'
import { useData } from './contexts/DataContext'

import TodoView from './components/TodoView.jsx'
import AddModal from './components/AddModal.jsx'
import SettingsView from './components/SettingsView.jsx' 
import StatsView from './components/StatsView.jsx' 
import LogModal from './components/LogModal.jsx'
import CalendarView from './components/CalendarView.jsx'
// 🚀 引入日记/知识库视图
import DiaryView from './components/DiaryView.jsx'

export default function App() {
  const { isInitialLoaded, syncStatus, syncMode, setSyncMode, performSync, groups, setGroups, allTags } = useData()

  const [currentRoute, setCurrentRoute] = useState({ path: 'today' })
  const [isDrawerOpen, setIsDrawerOpen] = useState(false) 
  
  const [isSyncMenuOpen, setIsSyncMenuOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false) 
  const [editingItem, setEditingItem] = useState(null) 
  const [loggingItem, setLoggingItem] = useState(null) 
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const androidEase = { type: 'tween', ease: [0.0, 0.0, 0.2, 1], duration: 0.3 }

  const tabs = [
    { id: 'today', label: '待办', icon: CheckSquare },
    { id: 'stats', label: '追踪', icon: BarChart2 },
    { id: 'diary', label: '日记', icon: Book },
    { id: 'calendar', label: '日历', icon: CalendarIcon },
  ]

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
  }

  if (!isInitialLoaded) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 text-slate-400 gap-3">
        <RefreshCw size={28} className="animate-spin text-blue-500" />
        <span className="font-medium">连接云端数据库中...</span>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-slate-50 flex flex-col relative overflow-hidden font-sans">
      
      {currentRoute.path !== 'settings' && (
        <header className="flex items-center justify-between pt-10 pb-4 px-6 bg-white shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-bold text-slate-800">
              {currentRoute.path === 'today' && '今日任务'}
              {currentRoute.path === 'inbox' && '收集箱'}
              {currentRoute.path === 'group' && groups.find(g => g.id === currentRoute.params?.id)?.title}
              {currentRoute.path === 'stats' && '时间统计'}
              {currentRoute.path === 'diary' && '知识库 (Obsidian)'}
              {currentRoute.path === 'calendar' && '日历矩阵'}
            </h1>
          </div>
          
          <div className="relative">
            <button onClick={() => syncStatus === 'no-config' ? handleNav('settings') : setIsSyncMenuOpen(!isSyncMenuOpen)} className="flex items-center gap-1.5 text-xs font-medium p-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
              {syncStatus === 'no-config' && <><AlertCircle size={14} className="text-orange-500"/><span className="text-orange-500 hidden sm:inline">未配置</span></>}
              {syncStatus === 'saving' && <><RefreshCw size={14} className="animate-spin text-blue-500"/><span className="text-blue-500 hidden sm:inline">同步中</span></>}
              {syncStatus === 'success' && <><Cloud size={14} className="text-emerald-500"/><span className="text-emerald-500 hidden sm:inline">已同步</span></>}
              {syncStatus === 'error' && <><CloudOff size={14} className="text-red-500"/><span className="text-red-500 hidden sm:inline">离线</span></>}
            </button>

            <AnimatePresence>
              {isSyncMenuOpen && syncStatus !== 'no-config' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="p-1.5 border-b border-slate-100">
                    <button onClick={() => { setSyncMode('auto'); setIsSyncMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${syncMode === 'auto' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>自动同步</button>
                    <button onClick={() => { setSyncMode('manual'); setIsSyncMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${syncMode === 'manual' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>手动同步</button>
                  </div>
                  <div className="p-1.5">
                    <button onClick={() => { setIsSyncMenuOpen(false); performSync(); }} className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">立即同步</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto relative bg-slate-50">
        {currentRoute.path === 'today' && <div className="p-6 pb-24"><TodoView onEdit={(item) => { setEditingItem(item); setIsAddModalOpen(true); }} onLog={(item) => setLoggingItem(item)} filterGroupId={null} /></div>}
        {currentRoute.path === 'inbox' && <div className="p-6 pb-24"><TodoView onEdit={(item) => { setEditingItem(item); setIsAddModalOpen(true); }} onLog={(item) => setLoggingItem(item)} filterGroupId="inbox" /></div>}
        {currentRoute.path === 'group' && <div className="p-6 pb-24"><TodoView onEdit={(item) => { setEditingItem(item); setIsAddModalOpen(true); }} onLog={(item) => setLoggingItem(item)} filterGroupId={currentRoute.params.id} /></div>}
        
        {currentRoute.path === 'settings' && <SettingsView onBack={() => handleNav('today')} />}
        {currentRoute.path === 'stats' && <StatsView />}
        {currentRoute.path === 'calendar' && <CalendarView />}
        
        {/* 🚀 挂载我们的数字花园阅读器 */}
        {currentRoute.path === 'diary' && <DiaryView />}
      </main>

      {(currentRoute.path === 'today' || currentRoute.path === 'group' || currentRoute.path === 'inbox') && (
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditingItem(null); setIsAddModalOpen(true); }} className="absolute bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-600/30 z-20">
          <Plus size={28} />
        </motion.button>
      )}

      {(currentRoute.path === 'today' || currentRoute.path === 'stats' || currentRoute.path === 'diary' || currentRoute.path === 'calendar') && (
        <nav className="absolute bottom-0 w-full bg-white border-t border-slate-200 px-6 py-2 pb-6 z-30 flex justify-between gap-2 items-center max-w-md mx-auto left-0 right-0">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = currentRoute.path === tab.id
            return (
              <button key={tab.id} onClick={() => handleNav(tab.id)} className={`flex flex-col items-center flex-1 py-1 gap-1 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDrawerOpen(false)} className="absolute inset-0 bg-slate-900/60 z-40 backdrop-blur-sm" />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={androidEase} className="absolute top-0 left-0 bottom-0 w-[280px] bg-slate-50 z-50 shadow-2xl flex flex-col">
              <div className="pt-12 pb-6 px-6 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
                <span className="font-black text-2xl text-slate-800 tracking-tight">FocusCenter</span>
                <X size={20} className="text-slate-400 cursor-pointer hover:text-slate-800" onClick={() => setIsDrawerOpen(false)} />
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-6">
                <div className="space-y-1">
                  <button onClick={() => handleNav('today')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-colors ${currentRoute.path === 'today' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-200'}`}><LayoutList size={20} /> 今日任务</button>
                  <button onClick={() => handleNav('inbox')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-colors ${currentRoute.path === 'inbox' ? 'bg-slate-200 text-slate-800' : 'text-slate-600 hover:bg-slate-200'}`}><Inbox size={20} /> 收集箱 (未分组)</button>
                </div>
                <div>
                  <div className="flex items-center justify-between px-2 mb-2 border-t border-slate-200 pt-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">我的任务组</span>
                    <button onClick={() => setIsCreatingGroup(!isCreatingGroup)} className="text-blue-500 hover:text-blue-600 p-1 transition-transform">{isCreatingGroup ? <X size={16} /> : <FolderPlus size={16} />}</button>
                  </div>
                  <AnimatePresence>
                    {isCreatingGroup && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3">
                        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-blue-200 shadow-sm">
                          <input type="text" autoFocus placeholder="输入新组名..." value={newGroupName} onChange={e => setNewGroupName(e.target.value)} onKeyDown={e => e.key === 'Enter' && confirmCreateGroup()} className="flex-1 bg-transparent px-3 py-1.5 text-sm outline-none text-slate-700" />
                          <button onClick={confirmCreateGroup} disabled={!newGroupName.trim()} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg disabled:opacity-50"><Check size={16}/></button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="space-y-1">
                    {groups.length === 0 && !isCreatingGroup ? <div className="text-xs text-slate-400 px-2 italic">还没有创建任务组</div> : groups.map(g => (
                      <button key={g.id} onClick={() => handleNav('group', { id: g.id })} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-colors ${currentRoute.path === 'group' && currentRoute.params?.id === g.id ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}>
                        <Folder size={18} className={currentRoute.path === 'group' && currentRoute.params?.id === g.id ? 'text-indigo-600' : 'text-slate-400'} /> <span className="truncate">{g.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-4 bg-white border-t border-slate-100 space-y-1 shrink-0">
                <button onClick={() => handleNav('settings')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors"><Settings size={20} className="text-slate-400" /> 系统设置</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>{isAddModalOpen && <AddModal availableTags={allTags} initialData={editingItem} onClose={() => { setIsAddModalOpen(false); setEditingItem(null); }} />}</AnimatePresence>
      <AnimatePresence>{loggingItem && <LogModal task={loggingItem} onClose={() => setLoggingItem(null)} />}</AnimatePresence>
    </div>
  )
}