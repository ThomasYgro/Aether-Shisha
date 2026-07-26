import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function TableModal({ shop, table, onClose }) {
  const [flavors, setFlavors] = useState([])
  const [selectedFlavorIds, setSelectedFlavorIds] = useState(table.selected_flavor_ids || [])
  const [now, setNow] = useState(Date.now())
  const [editingTable, setEditingTable] = useState(false)
  const [editName, setEditName] = useState(table.name)
  const [editCategory, setEditCategory] = useState(table.category || '')
  const [notes, setNotes] = useState(table.notes || '')

  useEffect(() => {
    if (table.status !== 'active') return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [table.status])

  useEffect(() => {
    fetchFlavors()
  }, [])

  async function fetchFlavors() {
    const { data, error } = await supabase
      .from('flavors')
      .select('*')
      .eq('shop_id', shop.id)
      .order('name', { ascending: true })

    if (error) console.error('Error fetching flavors:', error)
    else setFlavors(data)
  }

  function toggleFlavor(flavorId) {
    setSelectedFlavorIds((prev) =>
      prev.includes(flavorId) ? prev.filter((id) => id !== flavorId) : [...prev, flavorId]
    )
  }

  async function saveFlavors() {
    const { error } = await supabase
      .from('tables')
      .update({ selected_flavor_ids: selectedFlavorIds, notes: notes.trim() || null })
      .eq('id', table.id)

    if (error) console.error('Error saving flavors:', error)
    else onClose()
  }

  async function startHookah() {
    const { error } = await supabase
      .from('tables')
      .update({
        selected_flavor_ids: selectedFlavorIds,
        status: 'active',
        started_at: new Date().toISOString(),
        coals_changed_at: null,
        notes: notes.trim() || null,
      })
      .eq('id', table.id)

    if (error) console.error('Error starting hookah:', error)
    else onClose()
  }

  async function changeCoals() {
    const { error } = await supabase
      .from('tables')
      .update({ status: 'changing_coals', coals_changed_at: new Date().toISOString() })
      .eq('id', table.id)

    if (error) console.error('Error changing coals:', error)
    else onClose()
  }

  async function endHookah() {
    const { error } = await supabase
      .from('tables')
      .update({
        status: 'empty',
        started_at: null,
        coals_changed_at: null,
        selected_flavor_ids: [],
        notes: null,
      })
      .eq('id', table.id)

    if (error) {
      console.error('Error ending hookah:', error)
      return
    }

    const { error: logError } = await supabase
      .from('completed_sessions')
      .insert([{ shop_id: shop.id }])

    if (logError) console.error('Error logging completed session:', logError)
    onClose()
  }

  async function saveTableEdit() {
    if (!editName.trim()) return

    const { error } = await supabase
      .from('tables')
      .update({ name: editName.trim(), category: editCategory.trim() || null })
      .eq('id', table.id)

    if (error) console.error('Error updating table:', error)
    else {
      table.name = editName.trim()
      table.category = editCategory.trim() || null
      setEditingTable(false)
    }
  }

  async function deleteTable() {
    const confirmed = window.confirm('Διαγραφή τραπεζιού;')
    if (!confirmed) return

    const { error } = await supabase.from('tables').delete().eq('id', table.id)
    if (error) console.error('Error deleting table:', error)
    else onClose()
  }

  const isOvertime =
    table.status === 'active' &&
    table.started_at &&
    (now - new Date(table.started_at).getTime()) / 60000 >= 25

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md text-white">
        <div className="flex justify-between items-center mb-2">
          {editingTable ? (
            <div className="flex flex-col gap-2 flex-1">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                autoFocus
              />
              <input
                type="text"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                placeholder="Κατηγορία (προαιρετικό)"
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
              />
              <div className="flex gap-3">
                <button onClick={saveTableEdit} className="text-green-400 hover:text-green-300 text-sm">
                  Αποθήκευση
                </button>
                <button onClick={() => setEditingTable(false)} className="text-gray-400 hover:text-white text-sm">
                  Άκυρο
                </button>
              </div>
            </div>
          ) : (
            <h2 className="text-xl font-bold">{table.name}</h2>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-white ml-2">✕</button>
        </div>

        {!editingTable && (
          <div className="flex gap-3 mb-4">
            <button onClick={() => setEditingTable(true)} className="text-gray-400 hover:text-white text-sm">
              Επεξεργασία
            </button>
            <button onClick={deleteTable} className="text-gray-400 hover:text-red-400 text-sm">
              Διαγραφή
            </button>
          </div>
        )}

        {table.status === 'empty' && (
          <>
            <FlavorPicker
              flavors={flavors}
              selectedFlavorIds={selectedFlavorIds}
              toggleFlavor={toggleFlavor}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Σημείωση..."
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm mt-3 resize-none"
            />
            <div className="flex gap-2 mt-4">
              <button onClick={saveFlavors} className="flex-1 bg-gray-700 rounded py-2 font-semibold hover:bg-gray-600">
                Αποθήκευση
              </button>
              <button onClick={startHookah} className="flex-1 bg-green-600 rounded py-2 font-semibold hover:bg-green-500">
                Έναρξη ναργιλέ
              </button>
            </div>
          </>
        )}

        {table.status === 'active' && (
          <>
            <FlavorPicker
              flavors={flavors}
              selectedFlavorIds={selectedFlavorIds}
              toggleFlavor={toggleFlavor}
              readOnly={isOvertime}
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Σημείωση..."
              rows={2}
              disabled={isOvertime}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm mt-3 resize-none disabled:opacity-60"
            />
            <div className="flex gap-2 mt-4">
              {!isOvertime && (
                <button onClick={saveFlavors} className="flex-1 bg-gray-700 rounded py-2 font-semibold hover:bg-gray-600">
                  Αποθήκευση
                </button>
              )}
              <button onClick={changeCoals} className="flex-1 bg-orange-600 rounded py-2 font-semibold hover:bg-orange-500">
                Αλλαγή καρβούνων
              </button>
            </div>
          </>
        )}

        {table.status === 'changing_coals' && (
          <>
            <FlavorPicker
              flavors={flavors}
              selectedFlavorIds={selectedFlavorIds}
              toggleFlavor={toggleFlavor}
              readOnly
            />
            {notes && (
              <div className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm mt-3">
                {notes}
              </div>
            )}
            <p className="text-green-400 text-sm mt-2">Καρβουνα αλλάχτηκαν</p>
            <button onClick={endHookah} className="w-full bg-red-600 rounded py-2 font-semibold hover:bg-red-500 mt-4">
              Τέλος
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function FlavorPicker({ flavors, selectedFlavorIds, toggleFlavor, readOnly }) {
  return (
    <div className="max-h-60 overflow-y-auto space-y-1">
      {flavors.length === 0 && (
        <p className="text-gray-500 text-sm">Δεν υπάρχουν γεύσεις — πρόσθεσε από το κουμπί "Γεύσεις".</p>
      )}
      {flavors.map((flavor) => (
        <label key={flavor.id} className="flex items-center gap-2 bg-gray-800 rounded px-3 py-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedFlavorIds.includes(flavor.id)}
            onChange={() => !readOnly && toggleFlavor(flavor.id)}
            disabled={readOnly}
          />
          <span>{flavor.name}</span>
        </label>
      ))}
    </div>
  )
}

export default TableModal