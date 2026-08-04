import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import FlavorManager from './FlavorManager'
import PullToRefresh from './PullToRefresh'
import SideMenu from './SideMenu'
import TableMap from './TableMap'

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

function groupTables(tables) {
  const map = new Map()
  tables.forEach((t) => {
    const key = t.category && t.category.trim() ? t.category.trim() : '__uncategorized__'
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(t)
  })
  const keys = [...map.keys()]
  const named = keys.filter((k) => k !== '__uncategorized__').sort((a, b) => a.localeCompare(b))
  const ordered = [...named]
  if (map.has('__uncategorized__')) ordered.push('__uncategorized__')
  return ordered.map((key) => ({
    label: key === '__uncategorized__' ? 'Χωρίς κατηγορία' : key,
    tables: map.get(key),
  }))
}

function TableTile({ table, onSelectTable }) {
  const [now, setNow] = useState(Date.now())

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

  return (
    <div
      onClick={() => onSelectTable(table)}
      className={`${statusColors[displayStatus]} aspect-square rounded-lg flex flex-col items-center justify-center cursor-pointer active:opacity-80 font-semibold text-center p-2 transition-colors select-none`}
    >
      <span className="text-sm sm:text-base">{table.name}</span>
      {timeLabel && <span className="text-sm font-mono mt-1">{timeLabel}</span>}
      {table.status === 'changing_coals' && (
        <span className="text-xs opacity-80 mt-1">Waiting...</span>
      )}
    </div>
  )
}

function TableGrid({ shop, onBack, onSelectTable, onShopDeleted, refreshTrigger }) {
  const [tables, setTables] = useState([])
  const [zones, setZones] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [editingShop, setEditingShop] = useState(false)
  const [shopName, setShopName] = useState(shop.name)
  const [showingFlavors, setShowingFlavors] = useState(false)
  const [showingAddTable, setShowingAddTable] = useState(false)
  const [addName, setAddName] = useState('')
  const [addCategory, setAddCategory] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [showingAddZone, setShowingAddZone] = useState(false)
  const [newZoneName, setNewZoneName] = useState('')

  useEffect(() => {
    fetchTables()
    fetchZones()

    const channel = supabase
      .channel('tables-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tables', filter: `shop_id=eq.${shop.id}` },
        () => fetchTables()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shop.id, refreshTrigger])

  async function fetchTables() {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .eq('shop_id', shop.id)
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching tables:', error)
      return
    }

    const withPositions = await Promise.all(
      data.map(async (t, idx) => {
        if (t.pos_x == null || t.pos_y == null) {
          const x = 20 + (idx % 8) * 110
          const y = 20 + Math.floor(idx / 8) * 110
          await supabase.from('tables').update({ pos_x: x, pos_y: y }).eq('id', t.id)
          return { ...t, pos_x: x, pos_y: y }
        }
        return t
      })
    )
    setTables(withPositions)
  }

  async function fetchZones() {
    const { data, error } = await supabase
      .from('map_zones')
      .select('*')
      .eq('shop_id', shop.id)

    if (error) console.error('Error fetching zones:', error)
    else setZones(data)
  }

  function updatePosition(id, x, y, commit) {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, pos_x: x, pos_y: y } : t)))
    if (commit) {
      supabase
        .from('tables')
        .update({ pos_x: Math.round(x), pos_y: Math.round(y) })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Error saving position:', error)
        })
    }
  }

  function updateZonePosition(id, x, y, commit) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, pos_x: x, pos_y: y } : z)))
    if (commit) {
      supabase
        .from('map_zones')
        .update({ pos_x: Math.round(x), pos_y: Math.round(y) })
        .eq('id', id)
        .then(({ error }) => {
          if (error) console.error('Error saving zone position:', error)
        })
    }
  }

  async function addZone() {
    if (!newZoneName.trim()) return

    const { error } = await supabase
      .from('map_zones')
      .insert([{ shop_id: shop.id, name: newZoneName.trim(), pos_x: 20, pos_y: 20 }])

    if (error) console.error('Error adding zone:', error)
    else {
      setNewZoneName('')
      setShowingAddZone(false)
      fetchZones()
    }
  }

  async function deleteZone(id) {
    const { error } = await supabase.from('map_zones').delete().eq('id', id)
    if (error) console.error('Error deleting zone:', error)
    else fetchZones()
  }
async function renameZone(id, name) {
    const { error } = await supabase.from('map_zones').update({ name }).eq('id', id)
    if (error) console.error('Error renaming zone:', error)
    else fetchZones()
  }

  async function addTable() {
    if (!addName.trim()) return

    const { error } = await supabase.from('tables').insert([
      {
        shop_id: shop.id,
        name: addName.trim(),
        category: addCategory.trim() || null,
        status: 'empty',
      },
    ])

    if (error) console.error('Error adding table:', error)
    else {
      setAddName('')
      setAddCategory('')
      setShowingAddTable(false)
      fetchTables()
    }
  }

  async function saveShopName() {
    if (!shopName.trim()) return

    const { error } = await supabase
      .from('shops')
      .update({ name: shopName.trim() })
      .eq('id', shop.id)

    if (error) console.error('Error updating shop:', error)
    else {
      shop.name = shopName.trim()
      setEditingShop(false)
    }
  }

  async function deleteShop() {
    const confirmed = window.confirm('Διαγραφή μαγαζιού και όλων των τραπεζιών του;')
    if (!confirmed) return

    const { error } = await supabase.from('shops').delete().eq('id', shop.id)
    if (error) console.error('Error deleting shop:', error)
    else onShopDeleted()
  }

  const categoryOptions = [...new Set(tables.map((t) => t.category).filter(Boolean))]
  const groups = groupTables(tables)

  return (
    <PullToRefresh onRefresh={fetchTables}>
      <div className="min-h-screen bg-black text-white p-4 sm:p-8">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="text-gray-400 hover:text-white py-2">
            ← Πίσω στα μαγαζιά
          </button>
          <button onClick={() => setMenuOpen(true)} className="flex flex-col gap-1.5 p-2" aria-label="Menu">
            <span className="block w-6 h-0.5 bg-white"></span>
            <span className="block w-6 h-0.5 bg-white"></span>
            <span className="block w-6 h-0.5 bg-white"></span>
          </button>
        </div>

        {editingShop ? (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-lg sm:text-xl"
              autoFocus
            />
            <button onClick={saveShopName} className="text-green-400 hover:text-green-300 text-sm py-2">
              Αποθήκευση
            </button>
            <button onClick={() => { setEditingShop(false); setShopName(shop.name) }} className="text-gray-400 hover:text-white text-sm py-2">
              Άκυρο
            </button>
          </div>
        ) : (
          <h1 className="text-xl sm:text-2xl font-bold mb-6">{shop.name}</h1>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-8">
          <button
            onClick={() => setShowingAddTable(true)}
            className="bg-white text-black font-semibold px-4 py-3 rounded hover:bg-gray-200 active:bg-gray-300"
          >
            + Προσθήκη τραπεζιού
          </button>

          {viewMode === 'map' && (
            <button
              onClick={() => setShowingAddZone(true)}
              className="bg-gray-700 text-white font-semibold px-4 py-3 rounded hover:bg-gray-600"
            >
              + Προσθήκη κατηγορίας
            </button>
          )}
        </div>

        {viewMode === 'grid' ? (
          groups.map((group, idx) => (
            <div key={group.label} className="mb-6">
              {idx > 0 && <hr className="border-gray-700 mb-6" />}
              {!(groups.length === 1 && group.label === 'Χωρίς κατηγορία') && (
                <h2 className="text-gray-400 text-sm uppercase tracking-wide mb-3">{group.label}</h2>
              )}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {group.tables.map((table) => (
                  <TableTile key={table.id} table={table} onSelectTable={onSelectTable} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <TableMap
            tables={tables}
            zones={zones}
            onSelectTable={onSelectTable}
            onUpdatePosition={updatePosition}
            onUpdateZonePosition={updateZonePosition}
            onDeleteZone={deleteZone}
          />
        )}
          <TableMap
            tables={tables}
            zones={zones}
            onSelectTable={onSelectTable}
            onUpdatePosition={updatePosition}
            onUpdateZonePosition={updateZonePosition}
            onRenameZone={renameZone}
            onDeleteZone={deleteZone}
          />

        {showingFlavors && (
          <FlavorManager shop={shop} onClose={() => setShowingFlavors(false)} />
        )}

        {showingAddTable && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm">
              <h3 className="font-bold mb-4">Νέο τραπέζι</h3>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Όνομα τραπεζιού"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white w-full mb-3 text-base"
                autoFocus
              />
              <input
                type="text"
                list="category-options"
                value={addCategory}
                onChange={(e) => setAddCategory(e.target.value)}
                placeholder="Κατηγορία (προαιρετικό)"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white w-full mb-4 text-base"
              />
              <datalist id="category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowingAddTable(false); setAddName(''); setAddCategory('') }}
                  className="flex-1 bg-gray-700 rounded py-2"
                >
                  Άκυρο
                </button>
                <button onClick={addTable} className="flex-1 bg-white text-black rounded py-2 font-semibold">
                  Προσθήκη
                </button>
              </div>
            </div>
          </div>
        )}

        {showingAddZone && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm">
              <h3 className="font-bold mb-4">Νέα κατηγορία χάρτη</h3>
              <input
                type="text"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                placeholder="π.χ. DJ, Arena++"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white w-full mb-4 text-base"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowingAddZone(false); setNewZoneName('') }}
                  className="flex-1 bg-gray-700 rounded py-2"
                >
                  Άκυρο
                </button>
                <button onClick={addZone} className="flex-1 bg-white text-black rounded py-2 font-semibold">
                  Προσθήκη
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="flex flex-col gap-1 flex-1">
          <div className="flex bg-gray-900 border border-gray-700 rounded overflow-hidden mb-3">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${viewMode === 'grid' ? 'bg-white text-black' : 'text-gray-300'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex-1 px-4 py-3 text-sm font-semibold ${viewMode === 'map' ? 'bg-white text-black' : 'text-gray-300'}`}
            >
              Χάρτης
            </button>
          </div>
          <button onClick={() => { setShowingFlavors(true); setMenuOpen(false) }} className="text-left text-white hover:text-gray-300 py-3">
            Γεύσεις
          </button>
          <button onClick={() => { setEditingShop(true); setMenuOpen(false) }} className="text-left text-white hover:text-gray-300 py-3">
            Επεξεργασία
          </button>
        </div>
        <button onClick={deleteShop} className="border border-red-900 text-red-800 rounded py-2 font-semibold text-sm">
          Διαγραφή
        </button>
      </SideMenu>
    </PullToRefresh>
  )
}

export default TableGrid