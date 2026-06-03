import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { getBeijingDateKey, nowIso } from '../utils/date'
import { normalizeHabitsForBeijingDay } from '../utils/habits'
import { DEFAULT_UI_SETTINGS, normalizeUiSettings } from '../utils/uiSettings'

const DataContext = createContext()

const DEFAULT_TAGS = ['高优', '学习', '生活', '健康']

export function useData() {
  return useContext(DataContext)
}

const toNumber = (value, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const cleanObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

const sortByCreatedAt = (items) => {
  return [...items].sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
}

const groupFromRow = (row) => ({
  id: row.id,
  title: row.title,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  ...(Object.keys(cleanObject(row.visual)).length > 0 && { visual: cleanObject(row.visual) }),
})

const groupToRow = (group) => ({
  id: group.id,
  title: group.title || '',
  visual: cleanObject(group.visual),
  created_at: group.createdAt || nowIso(),
  updated_at: group.updatedAt || nowIso(),
})

const habitFromRow = (row) => ({
  id: row.id,
  type: row.type || 'routine',
  title: row.title,
  tags: row.tags || [],
  groupIds: row.group_ids || [],
  reminderEnabled: Boolean(row.reminder_enabled),
  recurrence: row.recurrence || 'none',
  targetDate: row.target_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  isDeleted: Boolean(row.is_deleted),
  deletedAt: row.deleted_at,
  ...(Object.keys(cleanObject(row.visual)).length > 0 && { visual: cleanObject(row.visual) }),
  targetValue: toNumber(row.target_value, 1),
  stepValue: toNumber(row.step_value, 1),
  unit: row.unit || '次',
  currentProgress: toNumber(row.current_progress, 0),
  completedToday: Boolean(row.completed_today),
  progressDate: row.progress_date,
})

const habitToRow = (habit) => ({
  id: habit.id,
  type: habit.type || 'routine',
  title: habit.title || '',
  tags: habit.tags || [],
  group_ids: habit.groupIds || [],
  reminder_enabled: Boolean(habit.reminderEnabled),
  recurrence: habit.recurrence || 'none',
  target_date: habit.targetDate || null,
  visual: cleanObject(habit.visual),
  target_value: toNumber(habit.targetValue, 1),
  step_value: toNumber(habit.stepValue, 1),
  unit: habit.unit || '次',
  current_progress: toNumber(habit.currentProgress, 0),
  completed_today: Boolean(habit.completedToday),
  progress_date: habit.progressDate || getBeijingDateKey(),
  is_deleted: Boolean(habit.isDeleted),
  deleted_at: habit.deletedAt || null,
  created_at: habit.createdAt || nowIso(),
  updated_at: habit.updatedAt || nowIso(),
})

const onceFromRow = (row) => ({
  id: row.id,
  type: row.type || 'task',
  title: row.title,
  tags: row.tags || [],
  groupIds: row.group_ids || [],
  reminderEnabled: Boolean(row.reminder_enabled),
  recurrence: row.recurrence || 'none',
  targetDate: row.target_date,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  isDeleted: Boolean(row.is_deleted),
  deletedAt: row.deleted_at,
  ...(Object.keys(cleanObject(row.visual)).length > 0 && { visual: cleanObject(row.visual) }),
  startAt: row.start_at,
  endAt: row.end_at,
  deadline: row.deadline,
  completed: Boolean(row.completed),
})

const onceToRow = (once) => ({
  id: once.id,
  type: once.type || 'task',
  title: once.title || '',
  tags: once.tags || [],
  group_ids: once.groupIds || [],
  reminder_enabled: Boolean(once.reminderEnabled),
  recurrence: once.recurrence || 'none',
  target_date: once.targetDate || null,
  start_at: once.startAt || null,
  end_at: once.endAt || null,
  deadline: once.deadline || null,
  completed: Boolean(once.completed),
  visual: cleanObject(once.visual),
  is_deleted: Boolean(once.isDeleted),
  deleted_at: once.deletedAt || null,
  created_at: once.createdAt || nowIso(),
  updated_at: once.updatedAt || nowIso(),
})

const recordFromRow = (row) => ({
  id: row.id,
  taskId: row.task_id,
  taskTitle: row.task_title,
  mode: row.mode || 'manual',
  durationSeconds: toNumber(row.duration_seconds, 0),
  progressAdded: toNumber(row.progress_added, 0),
  unit: row.unit || '',
  groupIds: row.group_ids || [],
  tags: row.tags || [],
  dateKey: row.date_key,
  completedAt: row.completed_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  metadata: cleanObject(row.metadata),
})

const recordToRow = (record) => {
  const completedAt = record.completedAt || nowIso()
  const durationSeconds = record.durationSeconds !== undefined
    ? toNumber(record.durationSeconds, 0)
    : toNumber(record.durationMinutes, 0) * 60

  return {
    id: record.id,
    task_id: record.taskId || null,
    task_title: record.taskTitle || '未命名记录',
    mode: record.mode || 'manual',
    duration_seconds: Math.max(0, Math.round(durationSeconds)),
    progress_added: toNumber(record.progressAdded, 0),
    unit: record.unit || '',
    group_ids: record.groupIds || [],
    tags: record.tags || [],
    date_key: record.dateKey || getBeijingDateKey(new Date(completedAt)),
    completed_at: completedAt,
    created_at: record.createdAt || completedAt,
    updated_at: record.updatedAt || nowIso(),
    metadata: cleanObject(record.metadata),
  }
}

const snapshotsFromData = ({ habits, onces, allTags, timeLogs, groups, uiSettings }) => ({
  habits: JSON.stringify(habits),
  onces: JSON.stringify(onces),
  tags: JSON.stringify(allTags),
  timeLogs: JSON.stringify(timeLogs),
  groups: JSON.stringify(groups),
  uiSettings: JSON.stringify(uiSettings),
})

const assertSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured')
}

const throwIfError = ({ error }) => {
  if (error) throw error
}

const syncRowsById = async ({ table, items, snapshotItems, toRow }) => {
  const currentIds = new Set(items.map(item => item.id).filter(Boolean))
  const removedIds = snapshotItems.map(item => item.id).filter(id => id && !currentIds.has(id))

  if (removedIds.length > 0) {
    throwIfError(await supabase.from(table).delete().in('id', removedIds))
  }

  if (items.length > 0) {
    throwIfError(await supabase.from(table).upsert(items.map(toRow), { onConflict: 'id' }))
  }
}

const syncTags = async (tags, snapshotTags) => {
  const currentNames = new Set(tags)
  const removedNames = snapshotTags.filter(tag => !currentNames.has(tag))

  if (removedNames.length > 0) {
    throwIfError(await supabase.from('tags').delete().in('name', removedNames))
  }

  if (tags.length > 0) {
    throwIfError(await supabase.from('tags').upsert(
      tags.map((name, index) => ({ name, sort_order: index })),
      { onConflict: 'name' }
    ))
  }
}

export function DataProvider({ children }) {
  const [isInitialLoaded, setIsInitialLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle')
  const [syncMode, setSyncMode] = useState('auto')

  const syncMetaRef = useRef({
    snapshots: snapshotsFromData({
      habits: [],
      onces: [],
      allTags: DEFAULT_TAGS,
      timeLogs: [],
      groups: [],
      uiSettings: DEFAULT_UI_SETTINGS,
    }),
    data: {
      habits: [],
      onces: [],
      allTags: DEFAULT_TAGS,
      timeLogs: [],
      groups: [],
      uiSettings: DEFAULT_UI_SETTINGS,
    },
  })

  const [habits, setHabits] = useState([])
  const [onces, setOnces] = useState([])
  const [allTags, setAllTags] = useState(DEFAULT_TAGS)
  const [timeLogs, setTimeLogs] = useState([])
  const [groups, setGroups] = useState([])
  const [uiSettings, setUiSettings] = useState(DEFAULT_UI_SETTINGS)

  const loadData = async () => {
    if (!isSupabaseConfigured) {
      setSyncStatus('no-config')
      setIsInitialLoaded(true)
      return
    }

    try {
      assertSupabase()
      setSyncStatus('loading')

      const [
        habitsRes,
        oncesRes,
        tagsRes,
        recordsRes,
        groupsRes,
        uiSettingsRes,
      ] = await Promise.all([
        supabase.from('habits').select('*').order('created_at', { ascending: true }),
        supabase.from('onces').select('*').order('created_at', { ascending: true }),
        supabase.from('tags').select('*').order('sort_order', { ascending: true }),
        supabase.from('records').select('*').order('completed_at', { ascending: true }),
        supabase.from('groups').select('*').order('created_at', { ascending: true }),
        supabase.from('ui_settings').select('*').eq('id', 'default').maybeSingle(),
      ])

      ;[habitsRes, oncesRes, tagsRes, recordsRes, groupsRes, uiSettingsRes].forEach(throwIfError)

      const loadedHabits = sortByCreatedAt((habitsRes.data || []).map(habitFromRow))
      const normalizedHabits = normalizeHabitsForBeijingDay(loadedHabits, { todayKey: getBeijingDateKey() }).habits
      const loadedOnces = sortByCreatedAt((oncesRes.data || []).map(onceFromRow))
      const loadedTags = (tagsRes.data || []).map(tag => tag.name).filter(Boolean)
      const loadedLogs = (recordsRes.data || []).map(recordFromRow)
      const loadedGroups = sortByCreatedAt((groupsRes.data || []).map(groupFromRow))
      const loadedUiSettings = normalizeUiSettings(uiSettingsRes.data?.settings || DEFAULT_UI_SETTINGS)

      const nextData = {
        habits: normalizedHabits,
        onces: loadedOnces,
        allTags: loadedTags.length > 0 ? loadedTags : DEFAULT_TAGS,
        timeLogs: loadedLogs,
        groups: loadedGroups,
        uiSettings: loadedUiSettings,
      }

      setHabits(nextData.habits)
      setOnces(nextData.onces)
      setAllTags(nextData.allTags)
      setTimeLogs(nextData.timeLogs)
      setGroups(nextData.groups)
      setUiSettings(nextData.uiSettings)

      syncMetaRef.current = {
        snapshots: snapshotsFromData(nextData),
        data: nextData,
      }

      setSyncStatus('success')
    } catch (error) {
      console.error('Supabase load failed', error)
      setSyncStatus('error')
    } finally {
      setIsInitialLoaded(true)
    }
  }

  useEffect(() => { loadData() }, [])

  const performSync = async () => {
    if (!isSupabaseConfigured || syncStatus === 'no-config') return

    try {
      assertSupabase()
      setSyncStatus('saving')

      const normalizedResult = normalizeHabitsForBeijingDay(habits, { todayKey: getBeijingDateKey() })
      const habitsToSync = normalizedResult.habits
      if (normalizedResult.changed) setHabits(habitsToSync)

      const nextData = {
        habits: habitsToSync,
        onces,
        allTags,
        timeLogs,
        groups,
        uiSettings: normalizeUiSettings(uiSettings),
      }
      const currentSnapshots = snapshotsFromData(nextData)
      const previousData = syncMetaRef.current.data

      if (currentSnapshots.groups !== syncMetaRef.current.snapshots.groups) {
        await syncRowsById({ table: 'groups', items: nextData.groups, snapshotItems: previousData.groups, toRow: groupToRow })
      }

      if (currentSnapshots.tags !== syncMetaRef.current.snapshots.tags) {
        await syncTags(nextData.allTags, previousData.allTags)
      }

      if (currentSnapshots.habits !== syncMetaRef.current.snapshots.habits) {
        await syncRowsById({ table: 'habits', items: nextData.habits, snapshotItems: previousData.habits, toRow: habitToRow })
      }

      if (currentSnapshots.onces !== syncMetaRef.current.snapshots.onces) {
        await syncRowsById({ table: 'onces', items: nextData.onces, snapshotItems: previousData.onces, toRow: onceToRow })
      }

      if (currentSnapshots.timeLogs !== syncMetaRef.current.snapshots.timeLogs) {
        await syncRowsById({ table: 'records', items: nextData.timeLogs, snapshotItems: previousData.timeLogs, toRow: recordToRow })
      }

      if (currentSnapshots.uiSettings !== syncMetaRef.current.snapshots.uiSettings) {
        throwIfError(await supabase.from('ui_settings').upsert({
          id: 'default',
          settings: nextData.uiSettings,
          updated_at: nowIso(),
        }, { onConflict: 'id' }))
      }

      syncMetaRef.current = {
        snapshots: currentSnapshots,
        data: nextData,
      }
      setSyncStatus('success')
    } catch (error) {
      console.error('Supabase save failed', error)
      setSyncStatus('error')
    }
  }

  const timeoutRef = useRef(null)
  useEffect(() => {
    if (!isInitialLoaded || syncMode !== 'auto' || syncStatus === 'no-config') return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => { performSync() }, 2000)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [habits, onces, allTags, timeLogs, groups, uiSettings, isInitialLoaded, syncMode])

  const value = {
    isInitialLoaded, syncStatus, syncMode, setSyncMode, performSync, loadData,
    habits, setHabits, onces, setOnces, allTags, setAllTags,
    timeLogs, setTimeLogs,
    groups, setGroups,
    uiSettings, setUiSettings
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
