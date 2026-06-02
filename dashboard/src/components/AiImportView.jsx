import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, Copy, FileJson, Pencil, RefreshCw, Save, Sparkles, Trash2, X } from 'lucide-react'
import { useData } from '../contexts/DataContext'
import { getBeijingDateKey, nowIso } from '../utils/date'
import { VISUAL_TEMPLATE_OPTIONS } from '../utils/visualPresets'

const SCHEMA_VERSION = 'focuscenter.ai-import.v1'
const DRAFT_TEXT_KEY = 'focuscenter_ai_import_raw_text'
const DRAFT_JSON_KEY = 'focuscenter_ai_import_json_text'

const allowedItemFields = new Set([
  'kind',
  'title',
  'groupNames',
  'tags',
  'recurrence',
  'targetValue',
  'stepValue',
  'unit',
  'schedule',
  'targetDate',
  'deadline',
  'estimateMinutes',
  'priority',
  'notes',
  'visual',
])

const exampleIdea = '最近想恢复状态。每天喝水，CS2 bot 每天练一点，不要太累。论文这周要推进一下，先把大纲整理出来。还要把房间桌面收拾一下，别放首页压迫我。'

const exampleJson = `{
  "schemaVersion": "focuscenter.ai-import.v1",
  "timezone": "Asia/Shanghai",
  "mode": "append",
  "groups": [
    { "name": "健康", "visual": { "icon": "droplet", "color": "#22c55e", "templateId": "fresh" } },
    { "name": "学习", "visual": { "icon": "book-open", "color": "#2563eb", "templateId": "focus" } }
  ],
  "tags": ["健康", "学习", "低负担"],
  "items": [
    {
      "kind": "habit",
      "title": "喝水",
      "groupNames": ["健康"],
      "tags": ["健康", "低负担"],
      "recurrence": "daily",
      "targetValue": 2000,
      "stepValue": 250,
      "unit": "ml",
      "schedule": "routine",
      "priority": "normal",
      "notes": "默认每次点击增加 250ml。",
      "visual": { "icon": "droplet", "color": "#22c55e", "templateId": "fresh", "imageUrl": "", "imagePrompt": "" }
    },
    {
      "kind": "task",
      "title": "整理论文大纲",
      "groupNames": ["学习"],
      "tags": ["学习"],
      "recurrence": "none",
      "schedule": "today",
      "targetDate": "2026-06-02",
      "deadline": null,
      "estimateMinutes": 45,
      "priority": "high",
      "notes": "只整理大纲，不要求完成全文。",
      "visual": { "icon": "file-text", "color": "#2563eb", "templateId": "focus", "imageUrl": "", "imagePrompt": "" }
    }
  ]
}`

const toCleanString = (value) => typeof value === 'string' ? value.trim() : ''

const uniqueStrings = (values) => {
  const seen = new Set()
  return (Array.isArray(values) ? values : []).map(toCleanString).filter(value => {
    const key = value.toLowerCase()
    if (!value || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

const parsePositiveNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const normalizeRecurrence = (value, fallback) => {
  return ['none', 'daily', 'weekly'].includes(value) ? value : fallback
}

const normalizeSchedule = (value, fallback) => {
  return ['today', 'inbox', 'routine'].includes(value) ? value : fallback
}

const isValidDateValue = (value) => {
  if (!value) return false
  return !Number.isNaN(new Date(value).getTime())
}

const normalizeImportVisual = (visual) => {
  if (!visual || typeof visual !== 'object' || Array.isArray(visual)) return null
  const next = {}
  ;['icon', 'color', 'templateId', 'imageUrl', 'imagePrompt', 'texture'].forEach(key => {
    const value = toCleanString(visual[key])
    if (value) next[key] = value
  })
  const overlay = Number(visual.imageOverlay)
  if (Number.isFinite(overlay)) next.imageOverlay = Math.min(80, Math.max(0, overlay))
  return Object.keys(next).length > 0 ? next : null
}

const buildVisualFromDraft = (draft) => {
  const visual = {
    ...(toCleanString(draft.visualIcon) && { icon: toCleanString(draft.visualIcon) }),
    ...(toCleanString(draft.visualColor) && { color: toCleanString(draft.visualColor) }),
    ...(toCleanString(draft.visualTemplateId) && { templateId: toCleanString(draft.visualTemplateId) }),
    ...(toCleanString(draft.visualImageUrl) && { imageUrl: toCleanString(draft.visualImageUrl) }),
    ...(toCleanString(draft.visualImagePrompt) && { imagePrompt: toCleanString(draft.visualImagePrompt) }),
  }
  return Object.keys(visual).length > 0 ? visual : null
}

const makeId = (prefix, index) => `${prefix}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`

export default function AiImportView({ onNavigate }) {
  const { habits, setHabits, onces, setOnces, groups, setGroups, allTags, setAllTags } = useData()
  const todayKey = getBeijingDateKey()
  const [rawText, setRawText] = useState(() => localStorage.getItem(DRAFT_TEXT_KEY) || '')
  const [jsonText, setJsonText] = useState(() => localStorage.getItem(DRAFT_JSON_KEY) || '')
  const [parseResult, setParseResult] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [copyStatus, setCopyStatus] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [editingPreviewId, setEditingPreviewId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)

  const groupNameMap = useMemo(() => {
    const map = new Map()
    groups.forEach(group => map.set(toCleanString(group.title).toLowerCase(), group))
    return map
  }, [groups])

  const promptText = useMemo(() => {
    const groupList = groups.length ? groups.map(group => group.title).join('、') : '暂无，请按需要创建短中文分组'
    const tagList = allTags.length ? allTags.join('、') : '暂无'
    const idea = rawText.trim() || '（在这里粘贴我的原始想法）'

    return `你是 FocusCenter 数据整理器。请把我下面的自然语言整理成可导入 FocusCenter 的 JSON。

要求：
1. 只输出 JSON，不要解释，不要 Markdown。
2. 使用 schemaVersion: "${SCHEMA_VERSION}"。
3. 时区固定为 "Asia/Shanghai"，所有 today/date 都按北京时间理解；今天是 ${todayKey}。
4. 把有限结果归类为 task，把长期重复行为归类为 habit。
5. 不要制造复杂系统。任务标题要短，像我今天真的会点开的动作。
6. 首页只放今天真正要做的事；不确定今天做的任务放入 inbox，不要安排到今天。
7. 习惯必须有 targetValue、stepValue、unit；如果我没说，给一个低负担默认值。
8. 每个 item 必须至少有 title、kind、groupNames。
9. groupNames 用中文短词。现有分组：${groupList}。
10. tags 只放有用标签，最多 3 个。现有标签：${tagList}。
11. 如果信息不足，不要问我，使用 reasonable defaults，并把原因写入 notes。
12. 输出结构必须符合下面接口：

{
  "schemaVersion": "${SCHEMA_VERSION}",
  "timezone": "Asia/Shanghai",
  "mode": "append",
  "groups": [{ "name": "健康", "visual": { "icon": "droplet", "color": "#22c55e", "templateId": "fresh", "imageUrl": "", "imagePrompt": "" } }],
  "tags": ["健康"],
  "items": [
    {
      "kind": "habit",
      "title": "喝水",
      "groupNames": ["健康"],
      "tags": ["健康"],
      "recurrence": "daily",
      "targetValue": 2000,
      "stepValue": 250,
      "unit": "ml",
      "schedule": "routine",
      "priority": "normal",
      "notes": "",
      "visual": { "icon": "droplet", "color": "#22c55e", "templateId": "fresh", "imageUrl": "", "imagePrompt": "", "imageOverlay": 35 }
    },
    {
      "kind": "task",
      "title": "整理论文大纲",
      "groupNames": ["学习"],
      "tags": ["学习"],
      "recurrence": "none",
      "schedule": "today",
      "targetDate": "${todayKey}",
      "deadline": null,
      "estimateMinutes": 45,
      "priority": "high",
      "notes": "",
      "visual": { "icon": "file-text", "color": "#2563eb", "templateId": "focus", "imageUrl": "", "imagePrompt": "", "imageOverlay": 35 }
    }
  ]
}

我的输入如下：
${idea}`
  }, [allTags, groups, rawText, todayKey])

  const updateRawText = (value) => {
    setRawText(value)
    localStorage.setItem(DRAFT_TEXT_KEY, value)
  }

  const updateJsonText = (value) => {
    setJsonText(value)
    localStorage.setItem(DRAFT_JSON_KEY, value)
  }

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopyStatus('已复制提示词')
    } catch {
      setCopyStatus('复制失败，请手动复制')
    }
    window.setTimeout(() => setCopyStatus(''), 1800)
  }

  const validatePayload = (payload) => {
    const globalErrors = []
    const globalWarnings = []

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return { globalErrors: ['AI 输出必须是一个 JSON object。'], globalWarnings: [], groupVisuals: {}, items: [] }
    }

    if (payload.schemaVersion !== SCHEMA_VERSION) globalErrors.push(`schemaVersion 必须是 ${SCHEMA_VERSION}。`)
    if (payload.timezone && payload.timezone !== 'Asia/Shanghai') globalWarnings.push('timezone 不是 Asia/Shanghai，导入仍按北京时间处理。')
    if (payload.mode && payload.mode !== 'append') globalWarnings.push('mode 不是 append，本功能仍按只新增处理。')
    if (!Array.isArray(payload.items)) globalErrors.push('缺少 items 数组。')

    const groupVisuals = {}
    if (Array.isArray(payload.groups)) {
      payload.groups.forEach(group => {
        const name = toCleanString(group?.name)
        const visual = normalizeImportVisual(group?.visual)
        if (name && visual) groupVisuals[name.toLowerCase()] = visual
      })
    }

    const knownExistingItems = [
      ...habits.filter(item => !item.isDeleted).map(item => ({ ...item, kind: 'habit' })),
      ...onces.filter(item => !item.isDeleted).map(item => ({ ...item, kind: 'task' })),
    ]

    const items = Array.isArray(payload.items) ? payload.items.map((item, index) => {
      const errors = []
      const warnings = []
      if (!item || typeof item !== 'object' || Array.isArray(item)) errors.push('item 必须是 object。')
      const kind = item?.kind
      const title = toCleanString(item?.title)
      const groupNames = uniqueStrings(item?.groupNames)
      const tags = uniqueStrings(item?.tags).slice(0, 3)
      const unknownFields = Object.keys(item || {}).filter(key => !allowedItemFields.has(key))
      const visual = normalizeImportVisual(item?.visual)
      if (item?.visual && !visual) warnings.push('visual 字段为空或格式无效，已忽略。')

      if (!['task', 'habit'].includes(kind)) errors.push('kind 必须是 task 或 habit。')
      if (!title) errors.push('title 不能为空。')
      if (groupNames.length === 0) errors.push('groupNames 至少需要一个分组。')
      if (unknownFields.length > 0) warnings.push(`未识别字段不会写入：${unknownFields.join('、')}`)

      const recurrence = normalizeRecurrence(item?.recurrence, kind === 'habit' ? 'daily' : 'none')
      if (item?.recurrence && item.recurrence !== recurrence) warnings.push('recurrence 非法，已使用默认值。')

      const schedule = normalizeSchedule(item?.schedule, kind === 'habit' ? 'routine' : 'inbox')
      if (item?.schedule && item.schedule !== schedule) warnings.push('schedule 非法，已使用默认值。')

      const targetValue = parsePositiveNumber(item?.targetValue, 1)
      const stepValue = parsePositiveNumber(item?.stepValue, 1)
      const unit = toCleanString(item?.unit) || '次'
      if (kind === 'habit') {
        if (!item?.targetValue) warnings.push('习惯缺少 targetValue，已默认 1。')
        if (!item?.stepValue) warnings.push('习惯缺少 stepValue，已默认 1。')
        if (!toCleanString(item?.unit)) warnings.push('习惯缺少 unit，已默认“次”。')
      }

      const deadline = kind === 'task' && isValidDateValue(item?.deadline) ? item.deadline : null
      if (kind === 'task' && item?.deadline && !deadline) warnings.push('deadline 不是有效日期，已忽略。')

      const duplicate = title && groupNames.length > 0 && knownExistingItems.some(existing => {
        if (existing.kind !== kind || toCleanString(existing.title) !== title) return false
        const existingGroupNames = (existing.groupIds || []).map(id => groups.find(group => group.id === id)?.title).filter(Boolean)
        return groupNames.some(name => existingGroupNames.includes(name))
      })
      if (duplicate) warnings.push('可能重复：已有同名同类且同组的项目。')

      return {
        previewId: `preview_${index}`,
        original: item,
        kind,
        title,
        groupNames,
        tags,
        recurrence,
        schedule,
        targetValue,
        stepValue,
        unit,
        deadline,
        priority: toCleanString(item?.priority) || 'normal',
        notes: toCleanString(item?.notes),
        visual,
        errors,
        warnings,
        duplicate,
      }
    }) : []

    return { globalErrors, globalWarnings, groupVisuals, items }
  }

  const parseJson = () => {
    setImportResult(null)
    try {
      const payload = JSON.parse(jsonText)
      const result = validatePayload(payload)
      setParseResult(result)
      const validIds = result.items.filter(item => item.errors.length === 0).map(item => item.previewId)
      setSelectedIds(new Set(validIds))
    } catch {
      setParseResult({ globalErrors: ['不是有效 JSON。请确认 AI 只输出 JSON，不要带 Markdown 代码块。'], globalWarnings: [], groupVisuals: {}, items: [] })
      setSelectedIds(new Set())
    }
  }

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const startEditItem = (item) => {
    setEditingPreviewId(item.previewId)
    setEditDraft({
      kind: item.kind || 'task',
      title: item.title || '',
      groupNames: item.groupNames.join('、'),
      tags: item.tags.join('、'),
      recurrence: item.recurrence || 'none',
      schedule: item.schedule || 'inbox',
      targetValue: String(item.targetValue || ''),
      stepValue: String(item.stepValue || ''),
      unit: item.unit || '',
      deadline: item.deadline || '',
      priority: item.priority || 'normal',
      notes: item.notes || '',
      visualIcon: item.visual?.icon || '',
      visualColor: item.visual?.color || '',
      visualTemplateId: item.visual?.templateId || '',
      visualImageUrl: item.visual?.imageUrl || '',
      visualImagePrompt: item.visual?.imagePrompt || '',
    })
  }

  const cancelEditItem = () => {
    setEditingPreviewId(null)
    setEditDraft(null)
  }

  const splitTextList = (value) => uniqueStrings(String(value || '').split(/[、,，\n]/))

  const saveEditItem = () => {
    if (!parseResult || !editingPreviewId || !editDraft) return

    const knownExistingItems = [
      ...habits.filter(item => !item.isDeleted).map(item => ({ ...item, kind: 'habit' })),
      ...onces.filter(item => !item.isDeleted).map(item => ({ ...item, kind: 'task' })),
    ]

    const nextItem = {
      previewId: editingPreviewId,
      original: {},
      kind: editDraft.kind,
      title: toCleanString(editDraft.title),
      groupNames: splitTextList(editDraft.groupNames),
      tags: splitTextList(editDraft.tags).slice(0, 3),
      recurrence: normalizeRecurrence(editDraft.recurrence, editDraft.kind === 'habit' ? 'daily' : 'none'),
      schedule: normalizeSchedule(editDraft.schedule, editDraft.kind === 'habit' ? 'routine' : 'inbox'),
      targetValue: parsePositiveNumber(editDraft.targetValue, 1),
      stepValue: parsePositiveNumber(editDraft.stepValue, 1),
      unit: toCleanString(editDraft.unit) || '次',
      deadline: editDraft.kind === 'task' && isValidDateValue(editDraft.deadline) ? editDraft.deadline : null,
      priority: toCleanString(editDraft.priority) || 'normal',
      notes: toCleanString(editDraft.notes),
      visual: buildVisualFromDraft(editDraft),
      errors: [],
      warnings: [],
      duplicate: false,
    }

    if (!['task', 'habit'].includes(nextItem.kind)) nextItem.errors.push('kind 必须是 task 或 habit。')
    if (!nextItem.title) nextItem.errors.push('title 不能为空。')
    if (nextItem.groupNames.length === 0) nextItem.errors.push('groupNames 至少需要一个分组。')
    if (nextItem.kind === 'habit' && !toCleanString(editDraft.unit)) nextItem.warnings.push('习惯缺少 unit，已默认“次”。')
    if (nextItem.kind === 'task' && editDraft.deadline && !nextItem.deadline) nextItem.warnings.push('deadline 不是有效日期，已忽略。')

    nextItem.duplicate = nextItem.title && nextItem.groupNames.length > 0 && knownExistingItems.some(existing => {
      if (existing.kind !== nextItem.kind || toCleanString(existing.title) !== nextItem.title) return false
      const existingGroupNames = (existing.groupIds || []).map(id => groups.find(group => group.id === id)?.title).filter(Boolean)
      return nextItem.groupNames.some(name => existingGroupNames.includes(name))
    })
    if (nextItem.duplicate) nextItem.warnings.push('可能重复：已有同名同类且同组的项目。')

    setParseResult({
      ...parseResult,
      items: parseResult.items.map(item => item.previewId === editingPreviewId ? nextItem : item),
    })

    setSelectedIds(prev => {
      const next = new Set(prev)
      if (nextItem.errors.length === 0) next.add(editingPreviewId)
      else next.delete(editingPreviewId)
      return next
    })

    cancelEditItem()
  }

  const clearDraft = () => {
    updateRawText('')
    updateJsonText('')
    setParseResult(null)
    setSelectedIds(new Set())
    setImportResult(null)
  }

  const importSelected = () => {
    if (!parseResult || parseResult.globalErrors.length > 0) return
    const selectedItems = parseResult.items.filter(item => selectedIds.has(item.previewId) && item.errors.length === 0)
    if (selectedItems.length === 0) return

    const timestamp = nowIso()
    const nextGroups = [...groups]
    const nextGroupMap = new Map(groupNameMap)
    const createdGroups = []

    selectedItems.forEach(item => {
      item.groupNames.forEach(name => {
        const key = name.toLowerCase()
        if (!nextGroupMap.has(key)) {
          const group = {
            id: makeId('g', nextGroups.length + createdGroups.length),
            title: name,
            createdAt: timestamp,
            ...(parseResult.groupVisuals?.[key] && { visual: parseResult.groupVisuals[key] }),
          }
          nextGroupMap.set(key, group)
          nextGroups.push(group)
          createdGroups.push(group)
        }
      })
    })

    const selectedTags = uniqueStrings(selectedItems.flatMap(item => item.tags))
    const existingTagKeys = new Set(allTags.map(tag => tag.toLowerCase()))
    const newTags = selectedTags.filter(tag => !existingTagKeys.has(tag.toLowerCase()))

    const newHabits = []
    const newTasks = []

    selectedItems.forEach((item, index) => {
      const groupIds = item.groupNames.map(name => nextGroupMap.get(name.toLowerCase())?.id).filter(Boolean)
      const baseData = {
        id: makeId(item.kind === 'habit' ? 'h' : 't', index),
        title: item.title,
        tags: item.tags,
        reminderEnabled: false,
        groupIds,
        recurrence: item.recurrence,
        targetDate: item.kind === 'task' && item.schedule === 'today' ? todayKey : null,
        createdAt: timestamp,
        updatedAt: timestamp,
        isDeleted: false,
        ...(item.visual && { visual: item.visual }),
      }

      if (item.kind === 'habit') {
        newHabits.push({
          ...baseData,
          type: 'routine',
          targetValue: item.targetValue,
          stepValue: item.stepValue,
          unit: item.unit,
          currentProgress: 0,
          completedToday: false,
          progressDate: todayKey,
        })
      } else {
        newTasks.push({
          ...baseData,
          type: 'task',
          deadline: item.deadline,
          completed: false,
        })
      }
    })

    if (createdGroups.length > 0) setGroups(nextGroups)
    if (newTags.length > 0) setAllTags([...allTags, ...newTags])
    if (newHabits.length > 0) setHabits([...habits, ...newHabits])
    if (newTasks.length > 0) setOnces([...onces, ...newTasks])

    setImportResult({
      habits: newHabits.length,
      tasks: newTasks.length,
      groups: createdGroups.length,
      tags: newTags.length,
    })
    setShowSuccessToast(true)
    window.setTimeout(() => setShowSuccessToast(false), 3200)
  }

  const summary = useMemo(() => {
    if (!parseResult) return null
    const selectedItems = parseResult.items.filter(item => selectedIds.has(item.previewId) && item.errors.length === 0)
    const selectedGroupNames = uniqueStrings(selectedItems.flatMap(item => item.groupNames))
    const selectedTagNames = uniqueStrings(selectedItems.flatMap(item => item.tags))
    const existingGroupKeys = new Set(groups.map(group => toCleanString(group.title).toLowerCase()))
    const existingTagKeys = new Set(allTags.map(tag => tag.toLowerCase()))

    return {
      tasks: selectedItems.filter(item => item.kind === 'task').length,
      habits: selectedItems.filter(item => item.kind === 'habit').length,
      groups: selectedGroupNames.filter(name => !existingGroupKeys.has(name.toLowerCase())).length,
      tags: selectedTagNames.filter(tag => !existingTagKeys.has(tag.toLowerCase())).length,
      duplicates: parseResult.items.filter(item => item.duplicate).length,
      errors: parseResult.globalErrors.length + parseResult.items.reduce((sum, item) => sum + item.errors.length, 0),
      selected: selectedItems.length,
    }
  }, [allTags, groups, parseResult, selectedIds])

  return (
    <div className="mx-auto max-w-screen-2xl p-4 pb-24 sm:p-6 lg:p-8">
      {showSuccessToast && importResult && (
        <div className="fixed right-4 top-4 z-[120] max-w-sm rounded-2xl border border-emerald-200 bg-white p-4 shadow-2xl shadow-emerald-900/10">
          <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
            <CheckCircle2 size={18} />
            添加成功
          </div>
          <p className="mt-1 text-xs font-bold text-slate-500">
            已新增 {importResult.tasks} 个任务、{importResult.habits} 个习惯、{importResult.groups} 个分组、{importResult.tags} 个标签。
          </p>
        </div>
      )}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-blue-600">
            <Sparkles size={18} />
            AI 导入
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-900">把想法变成可导入清单</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">手动粘贴 AI 输出，先预览再新增，不覆盖现有任务和习惯。</p>
        </div>
        <button onClick={clearDraft} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-50">
          <Trash2 size={16} />
          清空草稿
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">1. 粘贴你的原始想法</h3>
                <p className="text-xs font-medium text-slate-400">这段文字会被放进提示词末尾。</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">今天 {todayKey}</span>
            </div>
            <textarea
              value={rawText}
              onChange={event => updateRawText(event.target.value)}
              className="h-44 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">2. 复制提示词给 AI</h3>
                <p className="text-xs font-medium text-slate-400">已包含今日、现有分组、现有标签和 JSON 接口。</p>
              </div>
              <button onClick={copyPrompt} className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-blue-700">
                <Copy size={15} />
                复制提示词
              </button>
            </div>
            {copyStatus && <div className="mb-3 rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-600">{copyStatus}</div>}
            <textarea
              value={promptText}
              readOnly
              className="h-56 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600 outline-none"
            />
          </div>

          <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-black text-slate-700">示例输入和示例 JSON</summary>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{exampleIdea}</div>
              <pre className="max-h-72 overflow-auto rounded-xl bg-slate-900 p-3 text-xs leading-5 text-slate-100">{exampleJson}</pre>
            </div>
          </details>
        </section>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">3. 粘贴 AI 输出 JSON</h3>
                <p className="text-xs font-medium text-slate-400">只接受 JSON object，不要 Markdown 代码块。</p>
              </div>
              <button onClick={parseJson} className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white shadow-sm hover:bg-slate-800">
                <FileJson size={15} />
                解析预览
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={event => updateJsonText(event.target.value)}
              className="h-72 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-5 text-slate-700 outline-none focus:border-blue-300 focus:bg-white"
            />
          </div>

          {parseResult && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800">4. 预览导入</h3>
                  <p className="text-xs font-medium text-slate-400">有错误的项目不会导入；重复项只提示不覆盖。</p>
                </div>
                <button
                  onClick={importSelected}
                  disabled={!summary || summary.selected === 0 || parseResult.globalErrors.length > 0}
                  className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <CheckCircle2 size={16} />
                  导入选中
                </button>
              </div>

              {summary && (
                <div className="mb-4 grid grid-cols-3 gap-2 lg:grid-cols-6">
                  <div className="rounded-xl bg-blue-50 p-3"><div className="text-lg font-black text-blue-700">{summary.tasks}</div><div className="text-[11px] font-bold text-blue-500">任务</div></div>
                  <div className="rounded-xl bg-emerald-50 p-3"><div className="text-lg font-black text-emerald-700">{summary.habits}</div><div className="text-[11px] font-bold text-emerald-500">习惯</div></div>
                  <div className="rounded-xl bg-indigo-50 p-3"><div className="text-lg font-black text-indigo-700">{summary.groups}</div><div className="text-[11px] font-bold text-indigo-500">新分组</div></div>
                  <div className="rounded-xl bg-fuchsia-50 p-3"><div className="text-lg font-black text-fuchsia-700">{summary.tags}</div><div className="text-[11px] font-bold text-fuchsia-500">新标签</div></div>
                  <div className="rounded-xl bg-amber-50 p-3"><div className="text-lg font-black text-amber-700">{summary.duplicates}</div><div className="text-[11px] font-bold text-amber-500">可能重复</div></div>
                  <div className="rounded-xl bg-rose-50 p-3"><div className="text-lg font-black text-rose-700">{summary.errors}</div><div className="text-[11px] font-bold text-rose-500">错误</div></div>
                </div>
              )}

              {[...parseResult.globalErrors, ...parseResult.globalWarnings].length > 0 && (
                <div className="mb-4 space-y-2">
                  {parseResult.globalErrors.map(error => <div key={error} className="flex gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600"><AlertTriangle size={15} />{error}</div>)}
                  {parseResult.globalWarnings.map(warning => <div key={warning} className="flex gap-2 rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-600"><AlertTriangle size={15} />{warning}</div>)}
                </div>
              )}

              <div className="space-y-2">
                {parseResult.items.length === 0 && <div className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-400">暂无可预览项目。</div>}
                {parseResult.items.map(item => {
                  const disabled = item.errors.length > 0
                  const selected = selectedIds.has(item.previewId)
                  const isEditing = editingPreviewId === item.previewId
                  return (
                    <div key={item.previewId} className={`rounded-xl border p-3 ${disabled ? 'border-rose-100 bg-rose-50/60' : selected ? 'border-blue-200 bg-blue-50/50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={disabled}
                          onChange={() => toggleItem(item.previewId)}
                          className="mt-1 h-4 w-4 rounded border-slate-300"
                        />
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="grid gap-2 sm:grid-cols-2">
                                <select value={editDraft.kind} onChange={event => setEditDraft({ ...editDraft, kind: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none">
                                  <option value="task">任务</option>
                                  <option value="habit">习惯</option>
                                </select>
                                <input value={editDraft.title} onChange={event => setEditDraft({ ...editDraft, title: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none" />
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <input value={editDraft.groupNames} onChange={event => setEditDraft({ ...editDraft, groupNames: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none" />
                                <input value={editDraft.tags} onChange={event => setEditDraft({ ...editDraft, tags: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none" />
                              </div>
                              <div className="grid gap-2 sm:grid-cols-3">
                                <select value={editDraft.recurrence} onChange={event => setEditDraft({ ...editDraft, recurrence: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none">
                                  <option value="none">不循环</option>
                                  <option value="daily">每天</option>
                                  <option value="weekly">每周</option>
                                </select>
                                <select value={editDraft.schedule} onChange={event => setEditDraft({ ...editDraft, schedule: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none">
                                  <option value="today">进入今日</option>
                                  <option value="inbox">放入整理区</option>
                                  <option value="routine">习惯循环</option>
                                </select>
                                <input value={editDraft.deadline} onChange={event => setEditDraft({ ...editDraft, deadline: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none" />
                              </div>
                              {editDraft.kind === 'habit' && (
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <input type="number" value={editDraft.targetValue} onChange={event => setEditDraft({ ...editDraft, targetValue: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none" />
                                  <input type="number" value={editDraft.stepValue} onChange={event => setEditDraft({ ...editDraft, stepValue: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none" />
                                  <input value={editDraft.unit} onChange={event => setEditDraft({ ...editDraft, unit: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none" />
                                </div>
                              )}
                              <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <summary className="cursor-pointer text-xs font-black text-slate-500">外观</summary>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                  <input value={editDraft.visualIcon} onChange={event => setEditDraft({ ...editDraft, visualIcon: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none" />
                                  <input type="color" value={editDraft.visualColor || '#2563eb'} onChange={event => setEditDraft({ ...editDraft, visualColor: event.target.value })} className="h-9 rounded-xl border border-slate-200 bg-white px-2 py-1" />
                                  <select value={editDraft.visualTemplateId} onChange={event => setEditDraft({ ...editDraft, visualTemplateId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none">
                                    <option value="">继承模板</option>
                                    {VISUAL_TEMPLATE_OPTIONS.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                                  </select>
                                  <input value={editDraft.visualImageUrl} onChange={event => setEditDraft({ ...editDraft, visualImageUrl: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 outline-none" />
                                  <textarea value={editDraft.visualImagePrompt} onChange={event => setEditDraft({ ...editDraft, visualImagePrompt: event.target.value })} className="h-16 resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none sm:col-span-2" />
                                </div>
                              </details>
                              <textarea value={editDraft.notes} onChange={event => setEditDraft({ ...editDraft, notes: event.target.value })} className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 outline-none" />
                              <div className="flex justify-end gap-2">
                                <button onClick={cancelEditItem} className="flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-500"><X size={14} />取消</button>
                                <button onClick={saveEditItem} className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-black text-white"><Save size={14} />保存</button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${item.kind === 'habit' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{item.kind === 'habit' ? '习惯' : '任务'}</span>
                                <h4 className="truncate text-sm font-black text-slate-800">{item.title || '未命名'}</h4>
                                <button onClick={() => startEditItem(item)} className="ml-auto flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-black text-blue-600 shadow-sm ring-1 ring-blue-100">
                                  <Pencil size={12} />
                                  编辑
                                </button>
                              </div>
                              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-500">
                                {item.groupNames.map(name => <span key={name} className="rounded-full border border-slate-200 bg-white px-2 py-0.5">{name}</span>)}
                                {item.tags.map(tag => <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5">{tag}</span>)}
                                <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.recurrence}</span>
                                <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.schedule}</span>
                                {item.kind === 'habit' && <span className="rounded-full bg-slate-100 px-2 py-0.5">{item.stepValue}/{item.targetValue} {item.unit}</span>}
                                {item.visual && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-600">{item.visual.templateId || item.visual.color || 'visual'}</span>}
                              </div>
                              {item.notes && <p className="mt-2 text-xs leading-5 text-slate-500">{item.notes}</p>}
                              {[...item.errors, ...item.warnings].length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {item.errors.map(error => <div key={error} className="text-xs font-bold text-rose-600">{error}</div>)}
                                  {item.warnings.map(warning => <div key={warning} className="text-xs font-bold text-amber-600">{warning}</div>)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {importResult && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-black text-emerald-700">
                <CheckCircle2 size={18} />
                导入完成
              </div>
              <p className="mt-2 text-sm font-medium text-emerald-700">新增 {importResult.tasks} 个任务、{importResult.habits} 个习惯、{importResult.groups} 个分组、{importResult.tags} 个标签。</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => onNavigate('today')} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm">前往今日 <ArrowRight size={14} /></button>
                <button onClick={() => onNavigate('tasks')} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm">完整任务 <ArrowRight size={14} /></button>
                <button onClick={clearDraft} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm"><RefreshCw size={14} /> 继续导入</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
