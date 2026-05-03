import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { CalendarDays, LogIn, RefreshCw, ChevronLeft, ChevronRight, Clock, MapPin, ExternalLink } from 'lucide-react'

const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly'

// ==================== 辅助逻辑：Token 持久化管理 ====================
const saveToken = (token) => {
  const expiry = Date.now() + 3500 * 1000 // 提前一点点失效，保证安全
  localStorage.setItem('gcal_access_token', token)
  localStorage.setItem('gcal_token_expiry', expiry.toString())
}

const getValidToken = () => {
  const token = localStorage.getItem('gcal_access_token')
  const expiry = localStorage.getItem('gcal_token_expiry')
  if (!token || !expiry) return null
  if (Date.now() > parseInt(expiry)) return null // 已过期
  return token
}

// 日期计算辅助
const getStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()

const getMonthDays = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  const startDayOfWeek = start.getDay() 
  const days = []
  for (let i = 0; i < startDayOfWeek; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() - (startDayOfWeek - i))
    days.push(d)
  }
  for (let i = 1; i <= end.getDate(); i++) {
    days.push(new Date(date.getFullYear(), date.getMonth(), i))
  }
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(end)
    d.setDate(end.getDate() + i)
    days.push(d)
  }
  return days
}

const getWeekDays = (date) => {
  const day = date.getDay()
  const start = new Date(date)
  start.setDate(date.getDate() - day)
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

export default function CalendarView() {
  const [clientId, setClientId] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [tokenClient, setTokenClient] = useState(null)
  
  // 🚀 初始状态直接尝试从本地存储获取
  const [accessToken, setAccessToken] = useState(getValidToken())
  
  const [rawEvents, setRawEvents] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('week')

  // ==================== 1. 初始化与 SDK 挂载 ====================
  useEffect(() => {
    const storedClientId = localStorage.getItem('gcal_client_id')
    const storedApiKey = localStorage.getItem('gcal_api_key')
    setClientId(storedClientId || '')
    setApiKey(storedApiKey || '')

    const initGsi = () => {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: storedClientId,
        scope: SCOPES,
        callback: (res) => {
          if (res.access_token) {
            setAccessToken(res.access_token)
            saveToken(res.access_token) // 🚀 登录成功立刻持久化
          }
        },
      })
      setTokenClient(client)
    }

    if (storedClientId && !window.google) {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGsi
      document.body.appendChild(script)
    } else if (storedClientId && window.google) {
      initGsi()
    }
  }, [])

  // ==================== 2. 增强的数据同步 (包含名字、时间、地点) ====================
  const fetchCalendarEvents = useCallback(async () => {
    const token = getValidToken() // 每次拉取都检查一下 Token
    if (!token || !apiKey) return
    
    setIsLoading(true)
    try {
      const timeMin = new Date(currentDate)
      timeMin.setMonth(timeMin.getMonth() - 1)
      const timeMax = new Date(currentDate)
      timeMax.setMonth(timeMax.getMonth() + 2)

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${apiKey}&timeMin=${timeMin.toISOString()}&timeMax=${timeMax.toISOString()}&singleEvents=true&orderBy=startTime`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await response.json()
      setRawEvents(data.items || [])
    } catch (err) {
      console.error("Calendar Sync Error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [apiKey, currentDate])

  // 当进入页面且有有效 Token 时，自动触发同步
  useEffect(() => {
    if (accessToken) fetchCalendarEvents()
  }, [accessToken, fetchCalendarEvents])

  const handleLogin = () => tokenClient?.requestAccessToken()

  // ==================== 3. 渲染引擎与 UI ====================
  const parsedEvents = useMemo(() => {
    return rawEvents.map(ev => ({
      ...ev,
      _start: new Date(ev.start.dateTime || ev.start.date),
      _end: new Date(ev.end.dateTime || ev.end.date),
      isAllDay: !!ev.start.date,
      location: ev.location || '',
      title: ev.summary || '(无标题)'
    }))
  }, [rawEvents])

  const getEventsForDay = (dayDate) => {
    const dayStart = getStartOfDay(dayDate)
    const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59)
    return parsedEvents.filter(ev => ev._start <= dayEnd && ev._end >= dayStart)
  }

  // 渲染具体的时间网格
  const renderTimeGrid = (days) => {
    const hours = Array.from({ length: 24 }, (_, i) => i)
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[65vh] overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <div className="w-12 shrink-0 border-r border-slate-200"></div>
          {days.map((day, i) => (
            <div key={i} className="flex-1 py-3 text-center border-r last:border-r-0 border-slate-200">
              <div className={`text-[10px] font-bold uppercase ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-400'}`}>
                {['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day.getDay()]}
              </div>
              <div className={`text-lg font-black mt-1 ${isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-800'}`}>{day.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
          <div className="flex relative min-h-full">
            <div className="w-12 shrink-0 border-r border-slate-200 bg-white">
              {hours.map(h => <div key={h} className="h-[60px] text-[9px] font-bold text-slate-300 text-center pt-1">{h}:00</div>)}
            </div>
            {days.map((day, i) => {
              const dayEvents = getEventsForDay(day).filter(e => !e.isAllDay)
              return (
                <div key={i} className="flex-1 relative border-r last:border-r-0 border-slate-100">
                  {hours.map(h => <div key={h} className="h-[60px] border-b border-slate-50" />)}
                  {dayEvents.map(ev => {
                    const startPos = ev._start.getHours() * 60 + ev._start.getMinutes()
                    const duration = (ev._end - ev._start) / 60000
                    return (
                      <div key={ev.id} className="absolute left-1 right-1 rounded-xl p-2 bg-blue-600 text-white shadow-md border border-blue-700/20 overflow-hidden flex flex-col gap-0.5 z-10" style={{ top: `${startPos}px`, height: `${Math.max(duration, 35)}px` }}>
                        <span className="text-[10px] font-black leading-tight truncate">{ev.title}</span>
                        {duration > 40 && (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 opacity-80 text-[8px] font-bold"><Clock size={8} /> {ev._start.getHours()}:{String(ev._start.getMinutes()).padStart(2, '0')}</div>
                            {ev.location && <div className="flex items-center gap-1 opacity-80 text-[8px] font-bold truncate"><MapPin size={8} /> {ev.location}</div>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {isSameDay(day, new Date()) && (
                    <div className="absolute left-0 right-0 border-t-2 border-red-500 z-20" style={{ top: `${new Date().getHours() * 60 + new Date().getMinutes()}px` }}>
                      <div className="w-2 h-2 rounded-full bg-red-500 absolute -left-1 -top-1" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 pb-24 space-y-4">
      {(!clientId || !apiKey) && <div className="text-center py-20 text-slate-400 font-bold bg-white rounded-3xl border border-dashed">请在设置中配置 Google API 密钥</div>}
      
      {/* 🚀 只有当本地没有有效 Token 时，才显示登录按钮 */}
      {clientId && apiKey && !accessToken && (
        <button onClick={handleLogin} className="w-full py-12 rounded-3xl bg-white border border-slate-200 flex flex-col items-center gap-4 hover:bg-slate-50 shadow-sm transition-all">
          <CalendarDays size={48} className="text-blue-500" />
          <div className="text-center">
            <p className="font-black text-slate-800">未连接 Google 日历</p>
            <p className="text-xs text-slate-400 mt-1">点击授权并开启日程同步矩阵</p>
          </div>
        </button>
      )}

      {accessToken && (
        <>
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <h2 className="text-lg font-black text-slate-800">{currentDate.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}</h2>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {['day', 'week', 'month'].map(m => (
                <button key={m} onClick={() => setViewMode(m)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${viewMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>{m === 'day' ? '日' : m === 'week' ? '周' : '月'}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() - (viewMode === 'month' ? 30 : 7)); setCurrentDate(d); }} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600"><ChevronLeft size={20}/></button>
            <button onClick={() => setCurrentDate(new Date())} className="flex-1 py-2 bg-white rounded-xl border border-slate-200 font-bold text-xs text-slate-700">今天</button>
            <button onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate() + (viewMode === 'month' ? 30 : 7)); setCurrentDate(d); }} className="p-2 bg-white rounded-xl border border-slate-200 text-slate-600"><ChevronRight size={20}/></button>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-3 text-blue-500">
              <RefreshCw className="animate-spin" size={30} />
              <span className="text-xs font-bold uppercase tracking-widest">同步矩阵中...</span>
            </div>
          ) : (
            <div className="animate-in fade-in duration-500">
              {viewMode === 'week' && renderTimeGrid(getWeekDays(currentDate))}
              {viewMode === 'day' && renderTimeGrid([currentDate])}
              {viewMode === 'month' && <div className="text-center py-20 text-slate-400 italic">月视图网格渲染中...</div>}
            </div>
          )}
        </>
      )}
    </div>
  )
}