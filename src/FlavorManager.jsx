import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

function FlavorManager({ shop, onClose }) {
  const [flavors, setFlavors] = useState([])
  const [newFlavorName, setNewFlavorName] = useState('')

  useEffect(() => {
    fetchFlavors()

    const channel = supabase
      .channel('flavors-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flavors', filter: `shop_id=eq.${shop.id}` },
        () => fetchFlavors()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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

  async function addFlavor() {
    if (!newFlavorName.trim()) return
    const { error } = await supabase
      .from('flavors')
      .insert([{ shop_id: shop.id, name: newFlavorName.trim() }])

    if (error) console.error('Error adding flavor:', error)
    else {
      setNewFlavorName('')
      fetchFlavors()
    }
  }

  async function deleteFlavor(flavorId) {
    const { error } = await supabase.from('flavors').delete().eq('id', flavorId)
    if (error) console.error('Error deleting flavor:', error)
    else fetchFlavors()
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-md text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Γεύσεις — {shop.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newFlavorName}
            onChange={(e) => setNewFlavorName(e.target.value)}
            placeholder="Νέα γεύση"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white flex-1 text-base"
          />
          <button onClick={addFlavor} className="bg-white text-black px-4 py-2 rounded text-sm font-semibold">
            Προσθήκη
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto space-y-1">
          {flavors.length === 0 && (
            <p className="text-gray-500 text-sm">Δεν υπάρχουν ακόμα γεύσεις.</p>
          )}
          {flavors.map((flavor) => (
            <div key={flavor.id} className="flex items-center justify-between bg-gray-800 rounded px-3 py-2">
              <span>{flavor.name}</span>
              <button onClick={() => deleteFlavor(flavor.id)} className="text-gray-400 hover:text-red-400 text-sm">
                Διαγραφή
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default FlavorManager