export const VISUAL_TEMPLATES = {
  fresh: {
    id: 'fresh',
    name: '清爽健康',
    icon: 'droplet',
    color: '#22c55e',
    cardClass: 'border-emerald-100 bg-emerald-50/70',
    textClass: 'text-emerald-900',
    mutedClass: 'text-emerald-700/70',
    buttonClass: 'bg-emerald-600 text-white',
    progressClass: 'bg-emerald-500',
  },
  focus: {
    id: 'focus',
    name: '安静工作',
    icon: 'target',
    color: '#2563eb',
    cardClass: 'border-blue-100 bg-white',
    textClass: 'text-slate-900',
    mutedClass: 'text-slate-500',
    buttonClass: 'bg-blue-600 text-white',
    progressClass: 'bg-blue-500',
  },
  game: {
    id: 'game',
    name: '游戏训练',
    icon: 'crosshair',
    color: '#22d3ee',
    cardClass: 'border-cyan-200 bg-slate-900 text-white',
    textClass: 'text-white',
    mutedClass: 'text-cyan-100/70',
    buttonClass: 'bg-cyan-400 text-slate-950',
    progressClass: 'bg-cyan-400',
  },
  journal: {
    id: 'journal',
    name: '纸感手账',
    icon: 'book-open',
    color: '#a16207',
    cardClass: 'border-amber-100 bg-amber-50/80',
    textClass: 'text-stone-900',
    mutedClass: 'text-stone-500',
    buttonClass: 'bg-amber-600 text-white',
    progressClass: 'bg-amber-500',
  },
  minimal: {
    id: 'minimal',
    name: '极简黑白',
    icon: 'circle',
    color: '#111827',
    cardClass: 'border-slate-200 bg-white',
    textClass: 'text-slate-950',
    mutedClass: 'text-slate-400',
    buttonClass: 'bg-slate-900 text-white',
    progressClass: 'bg-slate-900',
  },
  warm: {
    id: 'warm',
    name: '暖色生活',
    icon: 'sun',
    color: '#f97316',
    cardClass: 'border-orange-100 bg-orange-50/70',
    textClass: 'text-orange-950',
    mutedClass: 'text-orange-700/70',
    buttonClass: 'bg-orange-500 text-white',
    progressClass: 'bg-orange-500',
  },
}

export const VISUAL_TEMPLATE_OPTIONS = Object.values(VISUAL_TEMPLATES)

export const DEFAULT_VISUAL = {
  icon: 'target',
  color: '#2563eb',
  templateId: 'focus',
  imageUrl: '',
  imagePrompt: '',
  imageOverlay: 35,
  texture: 'none',
}

export function normalizeVisual(visual, fallback = {}) {
  const source = visual && typeof visual === 'object' ? visual : {}
  const templateId = VISUAL_TEMPLATES[source.templateId] ? source.templateId : (fallback.templateId || DEFAULT_VISUAL.templateId)
  return {
    ...DEFAULT_VISUAL,
    ...fallback,
    ...source,
    templateId,
    imageOverlay: Math.min(80, Math.max(0, Number(source.imageOverlay ?? fallback.imageOverlay ?? DEFAULT_VISUAL.imageOverlay))),
  }
}

export function getVisualConfig(item, groups = [], defaults = {}) {
  const group = groups.find(g => item?.groupIds?.includes(g.id))
  const inherited = normalizeVisual(group?.visual, defaults)
  const visual = normalizeVisual(item?.visual, inherited)
  const template = VISUAL_TEMPLATES[visual.templateId] || VISUAL_TEMPLATES.focus
  return {
    ...template,
    visual,
    color: visual.color || template.color,
  }
}

export function getTemplateConfig(templateId = 'focus') {
  return VISUAL_TEMPLATES[templateId] || VISUAL_TEMPLATES.focus
}
