import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { fetchFile, saveFile, getGithubConfig } from '../githubService'

const DataContext = createContext()

export function useData() {
  return useContext(DataContext)
}

export function DataProvider({ children }) {
  const [isInitialLoaded, setIsInitialLoaded] = useState(false)
  const [syncStatus, setSyncStatus] = useState('idle') 
  const [syncMode, setSyncMode] = useState('auto') 
  
  // 🚀 V4 架构：引入 groups (任务组)
  const syncMetaRef = useRef({
    shas: { habits: null, onces: null, tags: null, timeLogs: null, groups: null },
    snapshots: { habits: '', onces: '', tags: '', timeLogs: '', groups: '' }
  })

  const [habits, setHabits] = useState([])
  const [onces, setOnces] = useState([])
  const [allTags, setAllTags] = useState(['高优', '学习', '生活', '健康'])
  const [timeLogs, setTimeLogs] = useState([])
  const [groups, setGroups] = useState([]) // 📁 任务组状态

  const loadData = async () => {
    const config = getGithubConfig()
    if (!config.token || !config.owner || !config.repo) {
      setSyncStatus('no-config')
      setIsInitialLoaded(true)
      return
    }

    setSyncStatus('loading')
    // 并发拉取 5 个文件
    const [habitsRes, oncesRes, tagsRes, timeRes, groupsRes] = await Promise.all([
      fetchFile('habits.json'),
      fetchFile('onces.json'),
      fetchFile('tags.json'),
      fetchFile('timeLogs.json'),
      fetchFile('groups.json')
    ])

    if (!habitsRes || !oncesRes || !tagsRes || !timeRes || !groupsRes) {
      setSyncStatus('error')
      setIsInitialLoaded(true)
      return
    }

    const loadedHabits = Array.isArray(habitsRes.content) ? habitsRes.content : []
    const loadedOnces = Array.isArray(oncesRes.content) ? oncesRes.content : []
    const loadedTags = Array.isArray(tagsRes.content) ? tagsRes.content : ['高优', '学习', '生活', '健康']
    const loadedLogs = Array.isArray(timeRes.content) ? timeRes.content : []
    const loadedGroups = Array.isArray(groupsRes.content) ? groupsRes.content : []

    setHabits(loadedHabits)
    setOnces(loadedOnces)
    setAllTags(loadedTags)
    setTimeLogs(loadedLogs)
    setGroups(loadedGroups)

    syncMetaRef.current.shas = { habits: habitsRes.sha, onces: oncesRes.sha, tags: tagsRes.sha, timeLogs: timeRes.sha, groups: groupsRes.sha }
    syncMetaRef.current.snapshots = {
      habits: JSON.stringify(loadedHabits),
      onces: JSON.stringify(loadedOnces),
      tags: JSON.stringify(loadedTags),
      timeLogs: JSON.stringify(loadedLogs),
      groups: JSON.stringify(loadedGroups)
    }

    setSyncStatus('success')
    setIsInitialLoaded(true)
  }

  useEffect(() => { loadData() }, [])

  const performSync = async () => {
    if (syncStatus === 'no-config') return
    setSyncStatus('saving')
    
    const { shas, snapshots } = syncMetaRef.current
    const currentStrs = { 
      habits: JSON.stringify(habits), 
      onces: JSON.stringify(onces), 
      tags: JSON.stringify(allTags),
      timeLogs: JSON.stringify(timeLogs),
      groups: JSON.stringify(groups)
    }
    const uploadTasks = []

    if (currentStrs.habits !== snapshots.habits) uploadTasks.push(saveFile('habits.json', habits, shas.habits).then(sha => ({ type: 'habits', sha })))
    if (currentStrs.onces !== snapshots.onces) uploadTasks.push(saveFile('onces.json', onces, shas.onces).then(sha => ({ type: 'onces', sha })))
    if (currentStrs.tags !== snapshots.tags) uploadTasks.push(saveFile('tags.json', allTags, shas.tags).then(sha => ({ type: 'tags', sha })))
    if (currentStrs.timeLogs !== snapshots.timeLogs) uploadTasks.push(saveFile('timeLogs.json', timeLogs, shas.timeLogs).then(sha => ({ type: 'timeLogs', sha })))
    if (currentStrs.groups !== snapshots.groups) uploadTasks.push(saveFile('groups.json', groups, shas.groups).then(sha => ({ type: 'groups', sha })))

    if (uploadTasks.length === 0) { setSyncStatus('success'); return; }

    const results = await Promise.all(uploadTasks)
    let hasError = false
    results.forEach(res => {
      if (res.sha) {
        syncMetaRef.current.shas[res.type] = res.sha
        syncMetaRef.current.snapshots[res.type] = currentStrs[res.type]
      } else hasError = true
    })
    setSyncStatus(hasError ? 'error' : 'success')
  }

  const timeoutRef = useRef(null)
  useEffect(() => {
    if (!isInitialLoaded || syncMode !== 'auto' || syncStatus === 'no-config') return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => { performSync() }, 2000)
  }, [habits, onces, allTags, timeLogs, groups, isInitialLoaded, syncMode, syncStatus])

  const value = {
    isInitialLoaded, syncStatus, syncMode, setSyncMode, performSync, loadData,
    habits, setHabits, onces, setOnces, allTags, setAllTags,
    timeLogs, setTimeLogs,
    groups, setGroups // 🚀 新增抛出任务组
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}