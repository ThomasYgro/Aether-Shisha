import { useState, useEffect, useRef } from 'react'

const statusColors = {
  empty: 'bg-white text-black',
  active: 'bg-green-600 text-white',
  overtime: 'bg-red-600 text-white',
  changing_coals: 'bg-blue-600 text-white',
}

function formatTime(totalSeconds) {
  const negative = totalSeconds < 0
  const abs = Math.abs(Math.round(totalSeconds))
  const mm = String(Math.floor(abs / 60)).padStart(2, '0')
  const ss = String(abs % 60).padStart(2, '0')
  return `${negative ? '-' : ''}${mm}:${ss}`
}

const TILE_SIZE = 90
export const CANVAS_WIDTH = 2000
export const CANVAS_HEIGHT = 1400

function MapTile({ table, onSelectTable, onPositionChange }) {
  const [now, setNow] = useState(Date.now())
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 })
  const moved = useRef(false)

  useEffect(() => {
    if (table.status !== 'active') return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [table.status])

  let displayStatus = table.status
  let timeLabel = null
  if (table.status === 'active' && table.started_at) {
    const elapsedSec = (now - new Date(table.started_at).getTime()) / 1000
    const remainingSec = 25 * 60 - elapsedSec
    displayStatus = remainingSec <= 0 ? 'overtime' : 'active'
    timeLabel = formatTime(remainingSec)
  }

  function handlePointerDown(e) {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    moved.current = false
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      origX: table.pos_x ?? 0,
      origY: table.pos_y ?? 0,
    }
    setDragging(true)
  }

  function handlePointerMove(e) {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true
    let newX = dragStart.current.origX + dx
    let newY = dragStart.current.origY + dy
    newX = Math.max(0, Math.min(CANVAS_WIDTH - TILE_SIZE, newX))
    newY = Math.max(0, Math.min(CANVAS_HEIGHT - TILE_SIZE, newY))
    onPositionChange(table.id, newX, newY, false)
  }

  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)
    if (moved.current) {
      onPositionChange(table.id, table.pos_x, table.pos_y, true)
    } else {
      onSelectTable(table)
    }
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: table.pos_x ?? 0,
        top: table.pos_y ?? 0,
        width: TILE_SIZE,
        height: TILE_SIZE,
        touchAction: 'none',
      }}
      className={`${statusColors[displayStatus]} rounded-lg flex flex-col items-center justify-center cursor-grab active:cursor-grabbing font-semibold text-center p-1 select-none ${dragging ? 'z-10 shadow-lg' : ''}`}
    >
      <span className="text-xs">{table.name}</span>
      {table.category && <span className="text-[10px] opacity-80">{table.category}</span>}
      {timeLabel && <span className="text-xs font-mono">{timeLabel}</span>}
      {table.status === 'changing_coals' && <span className="text-[10px] opacity-80">Waiting...</span>}
    </div>
  )
}

function ZoneLabel({ zone, onPositionChange, onDelete }) {
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 })
  const moved = useRef(false)

  function handlePointerDown(e) {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    moved.current = false
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      origX: zone.pos_x ?? 0,
      origY: zone.pos_y ?? 0,
    }
    setDragging(true)
  }

  function handlePointerMove(e) {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved.current = true
    const newX = Math.max(0, Math.min(CANVAS_WIDTH - 20, dragStart.current.origX + dx))
    const newY = Math.max(0, Math.min(CANVAS_HEIGHT - 20, dragStart.current.origY + dy))
    onPositionChange(zone.id, newX, newY, false)
  }

  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)
    if (moved.current) {
      onPositionChange(zone.id, zone.pos_x, zone.pos_y, true)
    } else {
      const confirmed = window.confirm(`Διαγραφή κατηγορίας "${zone.name}";`)
      if (confirmed) onDelete(zone.id)
    }
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ position: 'absolute', left: zone.pos_x ?? 0, top: zone.pos_y ?? 0, touchAction: 'none' }}
      className={`cursor-grab active:cursor-grabbing select-none text-gray-300 font-bold text-sm uppercase tracking-wide border-b border-gray-500 pb-1 whitespace-nowrap ${dragging ? 'z-10' : ''}`}
    >
      {zone.name}
    </div>
  )
}

function TableMap({ tables, zones, onSelectTable, onUpdatePosition, onUpdateZonePosition, onDeleteZone }) {
  return (
    <div className="overflow-auto border border-gray-800 rounded-lg" style={{ height: '65vh' }}>
      <div
        style={{
          position: 'relative',
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          backgroundColor: '#000',
        }}
      >
        {zones.map((zone) => (
          <ZoneLabel key={zone.id} zone={zone} onPositionChange={onUpdateZonePosition} onDelete={onDeleteZone} />
        ))}
        {tables.map((table) => (
          <MapTile key={table.id} table={table} onSelectTable={onSelectTable} onPositionChange={onUpdatePosition} />
        ))}
      </div>
    </div>
  )
}

export default TableMap