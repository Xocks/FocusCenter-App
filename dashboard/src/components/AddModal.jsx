import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Target, Repeat, Calendar, Bell, Folder, Tag as TagIcon, Plus, Check } from 'lucide-react'
import { useData } from '../contexts/DataContext'

export default function AddModal({ onClose, initialData = null }) {
  const { habits, setHabits, onces, setOnces, groups, setGroups, allTags, setAllTags } = useData()
  
  const isEditing = !!initialData 
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD

  const [tab, setTab] = useState('todo') 
  const [title, setTitle] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  
  // 🚀 强制分组状态
  const [groupIds, setGroupIds] = useState([])
  const [newGroupName, setNewGroupName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  
  const [targetValue, setTargetValue] = useState('') 
  const [stepValue, setStepValue] = useState('')     
  const [unit, setUnit] = useState('')               
  
  // 🚀 统一的循环与调度状态
  const [recurrence, setRecurrence] = useState('none') 
  const [deadline, setDeadline] = useState('')
  const [reminderEnabled, setReminderEnabled] = useState(false)
  const [addToToday, setAddToToday] = useState(false) // 是否立即加入今日待办

  useEffect(() => {
    if (initialData) {
      setTab(initialData.type === 'routine' ? 'habit' : 'todo')
      setTitle(initialData.title || '')
      setSelectedTags(initialData.tags || [])
      setReminderEnabled(initialData.reminderEnabled || false)
      setRecurrence(initialData.recurrence || 'none')
      setAddToToday(initialData.targetDate === todayStr)
      setGroupIds(initialData.groupIds || (initialData.groupId ? [initialData.groupId] : []))

      if (initialData.type === 'routine') {
        setTargetValue(initialData.targetValue || '')
        setStepValue(initialData.stepValue || '')
        setUnit(initialData.unit || '')
      } else {
        setDeadline(initialData.deadline || '')
      }
    }
  }, [initialData])

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag))
    else setSelectedTags([...selectedTags, tag])
  }

  const handleToggleGroup = (gId) => {
    if (groupIds.includes(gId)) setGroupIds(groupIds.filter(id => id !== gId))
    else setGroupIds([...groupIds, gId])
  }

  const handleAddGroup = () => {
    if (newGroupName.trim()) {
      const newGroup = { id: `g_${Date.now()}`, title: newGroupName.trim(), createdAt: new Date().toISOString() }
      setGroups([...groups, newGroup])
      setGroupIds([...groupIds, newGroup.id]) 
      setNewGroupName('')
    }
  }

  const handleAddTag = () => {
    const tag = newTagName.trim()
    if (tag && !allTags.includes(tag)) {
      setAllTags([...allTags, tag])
      setSelectedTags([...selectedTags, tag]) 
      setNewTagName('')
    } else if (tag && allTags.includes(tag)) {
      if(!selectedTags.includes(tag)) setSelectedTags([...selectedTags, tag])
      setNewTagName('')
    }
  }

  const handleSubmit = () => {
    if (!title.trim() || groupIds.length === 0) return // 🛡️ 拦截：必须有标题且必须分组

    const baseData = {
      id: initialData ? initialData.id : Date.now().toString(),
      title: title.trim(),
      tags: selectedTags,
      reminderEnabled,
      groupIds: groupIds, 
      recurrence: recurrence, // 习惯和待办都有循环属性
      targetDate: recurrence === 'none' && addToToday ? todayStr : (initialData ? initialData.targetDate : null), // 记录调度日期
      createdAt: initialData ? initialData.createdAt : new Date().toISOString(),
      isDeleted: false 
    }

    if (tab === 'habit') {
      const newHabit = {
        ...baseData,
        type: 'routine',
        targetValue: Number(targetValue) || 1,
        stepValue: Number(stepValue) || 1,
        unit: unit || '次',
        currentProgress: initialData ? initialData.currentProgress : 0,
        completedToday: initialData ? initialData.completedToday : false
      }
      if (isEditing) setHabits(habits.map(h => h.id === newHabit.id ? newHabit : h))
      else setHabits([...habits, newHabit])
      
    } else {
      const newTodo = {
        ...baseData,
        type: 'task',
        deadline,
        completed: initialData ? initialData.completed : false
      }
      if (isEditing) setOnces(onces.map(o => o.id === newTodo.id ? newTodo : o))
      else setOnces([...onces, newTodo])
    }
    
    onClose()
  }

  // 校验是否允许提交
  const isFormValid = title.trim() !== '' && groupIds.length > 0

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex bg-slate-100 p-2 relative shrink-0">
          <button disabled={isEditing} onClick={() => setTab('todo')} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${tab === 'todo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50`}>单次待办</button>
          <button disabled={isEditing} onClick={() => setTab('habit')} className={`flex-1 py-3 text-sm font-bold rounded-2xl transition-all ${tab === 'habit' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'} disabled:opacity-50`}>习惯目标</button>
          {isEditing && <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-800/10 font-black text-2xl tracking-widest">EDIT MODE</div>}
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-8">
          <input 
            type="text" autoFocus placeholder={tab === 'habit' ? "例如: 每天喝水..." : "例如: 下午3点开会..."}
            value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xl font-bold text-slate-800 placeholder:text-slate-300 outline-none border-b-2 border-transparent focus:border-blue-500 transition-colors pb-2"
          />

          {/* ================= 🚀 强制分组模块 ================= */}
          <div className="space-y-3">
            <label className="text-xs font-bold flex items-center gap-2 text-slate-700">
              <Folder size={14} className="text-blue-500"/> 所属任务组 (必选，可多选)
            </label>
            <div className={`flex flex-col gap-2 p-3 rounded-2xl border ${groupIds.length === 0 ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
              {groups.length === 0 && <div className="text-xs text-red-500 font-bold px-2 py-1">⚠️ 请先在下方新建一个任务组！</div>}
              
              {groups.map(g => (
                <button key={g.id} onClick={() => handleToggleGroup(g.id)} className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold transition-all border ${groupIds.includes(g.id) ? 'bg-indigo-100 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  <Folder size={16} className={groupIds.includes(g.id) ? "text-indigo-500" : "text-slate-400"} /> {g.title}
                </button>
              ))}
              
              <div className="flex items-center gap-2 mt-1">
                <input 
                  type="text" placeholder="快速新建组..." value={newGroupName} 
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-indigo-500"
                />
                <button onClick={handleAddGroup} disabled={!newGroupName.trim()} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl disabled:opacity-50"><Plus size={18}/></button>
              </div>
            </div>
          </div>

          {tab === 'habit' && (
            <div className="space-y-4 border-t border-slate-100 pt-6">
              <label className="text-xs font-bold text-slate-400 flex items-center gap-2"><Target size={14}/> 目标设置</label>
              <div className="flex gap-2">
                <input type="number" placeholder="建议总量 (如 2000)" value={targetValue} onChange={e => setTargetValue(e.target.value)} className="flex-[2] bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="text" placeholder="单位(ml)" value={unit} onChange={e => setUnit(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-sm text-slate-500 font-medium">每次增加:</span>
                <input type="number" placeholder="步长 (如 250)" value={stepValue} onChange={e => setStepValue(e.target.value)} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
          )}

          {/* ================= 🚀 循环与调度控制 ================= */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-2"><Repeat size={14}/> 循环规则</label>
            <div className="flex gap-2">
              {['none', 'daily', 'weekly'].map(r => (
                <button key={r} onClick={() => setRecurrence(r)} className={`flex-1 py-2 rounded-xl text-sm font-medium border ${recurrence === r ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}>
                  {r === 'none' ? '不循环' : r === 'daily' ? '每天' : '每周'}
                </button>
              ))}
            </div>

            {/* 核心调度开关：只有不循环的任务才可以手动调入今日 */}
            {recurrence === 'none' && (
              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100 mt-2">
                <div className="flex items-center gap-2 text-orange-700">
                  <Calendar size={18} />
                  <div>
                    <div className="text-sm font-bold">立即安排到今日待办</div>
                    <div className="text-[10px] opacity-70">如果不开启，它将静静躺在组内等你随时调用</div>
                  </div>
                </div>
                <button onClick={() => setAddToToday(!addToToday)} className={`w-12 h-6 rounded-full transition-colors relative ${addToToday ? 'bg-orange-500' : 'bg-orange-200'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${addToToday ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            )}

            {tab === 'todo' && (
              <>
                <label className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-4"><Calendar size={14}/> 截止时间</label>
                <input type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-slate-600" />
              </>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2">
              <Bell size={18} className={reminderEnabled ? "text-blue-500" : "text-slate-400"} />
              <span className="text-sm font-bold text-slate-700">开启提醒</span>
            </div>
            <button onClick={() => setReminderEnabled(!reminderEnabled)} className={`w-12 h-6 rounded-full transition-colors relative ${reminderEnabled ? 'bg-blue-500' : 'bg-slate-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${reminderEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-6">
            <label className="text-xs font-bold text-slate-400 flex items-center gap-2"><TagIcon size={14}/> 任务标签</label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button key={tag} onClick={() => handleToggleTag(tag)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedTags.includes(tag) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                  {tag}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <input 
                type="text" placeholder="添加新标签..." value={newTagName} 
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTag()}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 text-sm outline-none focus:border-blue-500"
              />
              <button onClick={handleAddTag} disabled={!newTagName.trim()} className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-bold rounded-full disabled:opacity-50">添加</button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">取消</button>
          <button 
            onClick={handleSubmit} 
            disabled={!isFormValid}
            className={`flex-1 py-3 rounded-xl font-bold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isEditing ? 'bg-slate-800 hover:bg-slate-900' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {isEditing ? '保存修改' : '确认添加'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}