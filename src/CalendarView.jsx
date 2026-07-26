import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}
function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1)
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const monthNames = ['Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος']
const dayNames = ['Δε', 'Τρ', 'Τε', 'Πε', 'Πα', 'Σα', 'Κυ']

function CalendarView({ onClose }) {
  const [viewDate, setViewDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [monthSessions, setMonthSessions] = useState([])
  const [dayBreakdown, setDayBreakdown] = useState(null)
  const [shopsById, setShopsById] = useState({})

  useEffect(() => {
    fetchShops()
  }, [])

  useEffect(() => {
    fetchMonthSessions()
  }, [viewDate])

  async function fetchShops() {
    const { data, error } = await supabase.from('shops').select('id, name')
    if (error) console.error('Error fetching shops:', error)
    else {
      const map = {}
      data.forEach((s) => { map[s.id] = s.name })
      setShopsById(map)
    }
  }

  async function fetchMonthSessions() {
    const start = startOfMonth(viewDate)
    const end = endOfMonth(viewDate)
    const { data, error } = await supabase
      .from('completed_sessions')
      .select('shop_id, ended_at')
      .gte('ended_at', start.toISOString())
      .lt('ended_at', end.toISOString())

    if (error) console.error('Error fetching sessions:', error)
    else setMonthSessions(data)
  }

  function countForDay(day) {
    return monthSessions.filter((s) => isSameDay(new Date(s.ended_at), day)).length
  }

  function selectDay(day) {
    setSelectedDate(day)
    const sessionsForDay = monthSessions.filter((s) => isSameDay(new Date(s.ended_at), day))
    const counts = {}
    sessionsForDay.forEach((s) => {
      counts[s.shop_id] = (counts[s.shop_id] || 0) + 1
    })
    const breakdown = Object.entries(counts).map(([shopId, count]) => ({
      name: shopsById[shopId] || 'Άγνωστο μαγαζί',
      count,
    }))
    breakdown.sort((a, b) => b.count - a.count)
    setDayBreakdown({ total: sessionsForDay.length, breakdown })
  }

  function changeMonth(delta) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1))
    setSelectedDate(null)
    setDayBreakdown(null)
  }

  const first = startOfMonth(viewDate)
  const startWeekday = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const today = new Date()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Ημερολόγιο</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="flex items-center justify-between mb-3">
          <button onClick={() => changeMonth(-1)} className="text-gray-400 hover:text-white px-2 text-xl">‹</button>
          <span className="font-semibold">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
          <button onClick={() => changeMonth(1)} className="text-gray-400 hover:text-white px-2 text-xl">›</button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
          {dayNames.map((d) => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-4">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />
            const count = countForDay(day)
            const isToday = isSameDay(day, today)
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            return (
              <button
                key={idx}
                onClick={() => selectDay(day)}
                className={`aspect-square rounded flex flex-col items-center justify-center text-sm ${
                  isSelected ? 'bg-white text-black font-bold' : isToday ? 'border border-gray-400' : 'bg-gray-800'
                }`}
              >
                <span>{day.getDate()}</span>
                {count > 0 && (
                  <span className={`text-[10px] ${isSelected ? 'text-black' : 'text-green-400'}`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>

        {dayBreakdown && (
          <div className="border-t border-gray-700 pt-4">
            <p className="font-semibold mb-2">
              {selectedDate.toLocaleDateString('el-GR')} — {dayBreakdown.total} ναργιλέδες
            </p>
            {dayBreakdown.breakdown.length === 0 && (
              <p className="text-gray-500 text-sm">Καμία καταγραφή αυτή τη μέρα.</p>
            )}
            <div className="space-y-1">
              {dayBreakdown.breakdown.map((item) => (
                <div key={item.name} className="flex justify-between bg-gray-800 rounded px-3 py-2 text-sm">
                  <span>{item.name}</span>
                  <span>{item.count} ναργιλέδες</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CalendarView