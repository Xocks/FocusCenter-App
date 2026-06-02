export const DASHBOARD_MODULES = ['hero', 'habits', 'todos', 'logs']

export const DEFAULT_UI_SETTINGS = {
  version: 1,
  sidebar: {
    desktopPosition: 'left',
    desktopWidth: 'normal',
    defaultCollapsed: false,
    navOrder: ['today', 'stats', 'diary', 'tasks', 'ai-import', 'inbox', 'settings'],
  },
  dashboardLayouts: {
    desktop: [
      { id: 'hero', visible: true, order: 1, size: 'wide', density: 'compact', cardStyle: 'focus' },
      { id: 'habits', visible: true, order: 2, size: 'large', density: 'compact', cardStyle: 'fresh' },
      { id: 'todos', visible: true, order: 3, size: 'medium', density: 'compact', cardStyle: 'focus' },
      { id: 'logs', visible: true, order: 4, size: 'medium', density: 'compact', cardStyle: 'minimal' },
    ],
    mobile: [
      { id: 'hero', visible: true, order: 1, size: 'full', density: 'comfortable', cardStyle: 'focus' },
      { id: 'habits', visible: true, order: 2, size: 'full', density: 'comfortable', cardStyle: 'fresh' },
      { id: 'todos', visible: true, order: 3, size: 'full', density: 'comfortable', cardStyle: 'focus' },
      { id: 'logs', visible: true, order: 4, size: 'full', density: 'comfortable', cardStyle: 'minimal' },
    ],
  },
  visualDefaults: {
    templateId: 'focus',
    color: '#2563eb',
    radius: 'soft',
    shadow: 'medium',
    texture: 'none',
  },
}

const normalizeLayout = (layout, fallback) => {
  const incoming = Array.isArray(layout) ? layout : []
  const byId = new Map(incoming.filter(item => item?.id).map(item => [item.id, item]))

  return fallback.map(defaultItem => ({
    ...defaultItem,
    ...(byId.get(defaultItem.id) || {}),
    visible: byId.has(defaultItem.id) ? byId.get(defaultItem.id).visible !== false : defaultItem.visible,
  })).sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
}

export function normalizeUiSettings(settings) {
  const source = settings && typeof settings === 'object' ? settings : {}
  return {
    ...DEFAULT_UI_SETTINGS,
    ...source,
    sidebar: {
      ...DEFAULT_UI_SETTINGS.sidebar,
      ...(source.sidebar || {}),
    },
    dashboardLayouts: {
      desktop: normalizeLayout(source.dashboardLayouts?.desktop, DEFAULT_UI_SETTINGS.dashboardLayouts.desktop),
      mobile: normalizeLayout(source.dashboardLayouts?.mobile, DEFAULT_UI_SETTINGS.dashboardLayouts.mobile),
    },
    visualDefaults: {
      ...DEFAULT_UI_SETTINGS.visualDefaults,
      ...(source.visualDefaults || {}),
    },
  }
}

export function getModuleClass(config, device = 'desktop') {
  if (device === 'mobile') return config?.size === 'half' ? 'col-span-1' : 'col-span-2'
  const size = config?.size || 'medium'
  if (size === 'small') return 'lg:col-span-1'
  if (size === 'large') return 'lg:col-span-2'
  if (size === 'wide') return 'lg:col-span-2 xl:col-span-3'
  if (size === 'full') return 'lg:col-span-2 xl:col-span-4'
  return 'lg:col-span-1 xl:col-span-2'
}
