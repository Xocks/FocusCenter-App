export const BEIJING_TIME_ZONE = 'Asia/Shanghai'

export function getBeijingDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BEIJING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export function getBeijingNowLabel(date = new Date()) {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: BEIJING_TIME_ZONE,
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function isSameBeijingDay(a, b = new Date()) {
  if (!a) return false
  return getBeijingDateKey(new Date(a)) === getBeijingDateKey(new Date(b))
}

export function getLogDateKey(log) {
  if (log?.dateKey) return log.dateKey
  return getBeijingDateKey(log?.completedAt ? new Date(log.completedAt) : new Date())
}

export function nowIso() {
  return new Date().toISOString()
}
