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
export const CANVAS_WIDTH = 3000
export const CANVAS_HEIGHT = 2200

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

function ZoneLabel({ zone, onSelect }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: (zone.pos_y ?? 20) + 24,
          width: CANVAS_WIDTH,
          height: 1,
          backgroundColor: 'white',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
      />
      <div
        onClick={() => onSelect(zone)}
        style={{ position: 'absolute', left: zone.pos_x ?? 0, top: zone.pos_y ?? 0 }}
        className="cursor-pointer select-none text-white font-bold text-sm uppercase tracking-wide whitespace-nowrap px-1"
      >
        {zone.name}
      </div>
    </>
  )
}

function ZoneEditModal({ zone, onClose, onRename, onMove, onDelete }) {
  const [name, setName] = useState(zone.name)
  const STEP = 30

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm text-white">
        <h3 className="font-bold mb-4">Επεξεργασία κατηγορίας</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white w-full mb-5 text-base"
        />
        <p className="text-gray-400 text-sm mb-2">Μετακίνηση:</p>
        <div className="flex flex-col items-center gap-1 mb-5">
          <button onClick={() => onMove(0, -STEP)} className="bg-gray-800 rounded px-4 py-2 text-lg">↑</button>
          <div className="flex gap-1">
            <button onClick={() => onMove(-STEP, 0)} className="bg-gray-800 rounded px-4 py-2 text-lg">←</button>
            <button onClick={() => onMove(STEP, 0)} className="bg-gray-800 rounded px-4 py-2 text-lg">→</button>
          </div>
          <button onClick={() => onMove(0, STEP)} className="bg-gray-800 rounded px-4 py-2 text-lg">↓</button>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={onClose} className="flex-1 bg-gray-700 rounded py-2">Άκυρο</button>
          <button onClick={() => onRename(name)} className="flex-1 bg-white text-black rounded py-2 font-semibold">
            Αποθήκευση
          </button>
        </div>
        <button onClick={onDelete} className="w-full border border-red-900 text-red-800 rounded py-2 text-sm font-semibold">
          Διαγραφή
        </button>
      </div>
    </div>
  )
}

function TableMap({ tables, zones, onSelectTable, onUpdatePosition, onUpdateZonePosition, onRenameZone, onDeleteZone }) {
  const [zoom, setZoom] = useState(1)
  const [editingZone, setEditingZone] = useState(null)

  function zoomIn() {
    setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))
  }
  function zoomOut() {
    setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))
  }

  function handleMove(dx, dy) {
    const newX = Math.max(0, Math.min(CANVAS_WIDTH - 20, (editingZone.pos_x ?? 0) + dx))
    const newY = Math.max(0, Math.min(CANVAS_HEIGHT - 20, (editingZone.pos_y ?? 0) + dy))
    onUpdateZonePosition(editingZone.id, newX, newY, true)
    setEditingZone({ ...editingZone, pos_x: newX, pos_y: newY })
  }

  function handleRename(name) {
    if (!name.trim()) return
    onRenameZone(editingZone.id, name.trim())
    setEditingZone(null)
  }

  function handleDelete() {
    const confirmed = window.confirm(`Διαγραφή κατηγορίας "${editingZone.name}";`)
    if (confirmed) {
      onDeleteZone(editingZone.id)
      setEditingZone(null)
    }
  }

  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-20 flex bg-gray-900 border border-gray-700 rounded overflow-hidden">
        <button onClick={zoomOut} className="px-3 py-2 text-white text-lg font-bold hover:bg-gray-800">−</button>
        <span className="px-2 py-2 text-white text-xs flex items-center">{Math.round(zoom * 100)}%</span>
        <button onClick={zoomIn} className="px-3 py-2 text-white text-lg font-bold hover:bg-gray-800">+</button>
      </div>

      <div className="overflow-auto border border-gray-800 rounded-lg" style={{ height: '65vh' }}>
        <div style={{ position: 'relative', width: CANVAS_WIDTH * zoom, height: CANVAS_HEIGHT * zoom }}>
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              backgroundImage:
                'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              backgroundColor: '#000',
            }}
          >
            {zones.map((zone) => (
              <ZoneLabel key={zone.id} zone={zone} onSelect={setEditingZone} />
            ))}
            {tables.map((table) => (
              <MapTile key={table.id} table={table} onSelectTable={onSelectTable} onPositionChange={onUpdatePosition} />
            ))}
          </div>
        </div>
      </div>

      {editingZone && (
        <ZoneEditModal
          zone={editingZone}
          onClose={() => setEditingZone(null)}
          onRename={handleRename}
          onMove={handleMove}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

export default TableMap