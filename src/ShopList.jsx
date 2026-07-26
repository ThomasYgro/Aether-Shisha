import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import PullToRefresh from './PullToRefresh'
import SideMenu from './SideMenu'
import logo from './assets/AetherShisha_Logo.png'
import CalendarView from './CalendarView'
function ShopList({ onSelectShop }) {
  const [shops, setShops] = useState([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [showingAddShop, setShowingAddShop] = useState(false)
  const [newShopName, setNewShopName] = useState('')
  const [showingCalendar, setShowingCalendar] = useState(false) 
  useEffect(() => {
    fetchShops()

    const channel = supabase
      .channel('shops-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shops' }, () => fetchShops())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchShops() {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .order('last_opened_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) console.error('Error fetching shops:', error)
    else setShops(data)
  }

  async function addShop() {
    if (!newShopName.trim()) return

    const { error } = await supabase
      .from('shops')
      .insert([{ name: newShopName.trim() }])

    if (error) console.error('Error adding shop:', error)
    else {
      setNewShopName('')
      setShowingAddShop(false)
      fetchShops()
    }
  }

  function selectShop(shop) {
    onSelectShop(shop)
    supabase
      .from('shops')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', shop.id)
      .then(({ error }) => {
        if (error) console.error('Error updating last opened:', error)
      })
  }

  return (
    <PullToRefresh onRefresh={fetchShops}>
      <div className="min-h-screen bg-black text-white p-4 sm:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Aether Shisha" className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover flex-shrink-0" />
            <h1 className="text-2xl sm:text-3xl font-bold">Aether Shisha</h1>
          </div>
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-col gap-1.5 p-2"
            aria-label="Menu"
          >
            <span className="block w-6 h-0.5 bg-white"></span>
            <span className="block w-6 h-0.5 bg-white"></span>
            <span className="block w-6 h-0.5 bg-white"></span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {shops.map((shop) => (
            <div
              key={shop.id}
              onClick={() => selectShop(shop)}
              className="bg-gray-900 border border-gray-700 rounded-lg px-5 py-4 cursor-pointer active:bg-gray-800 hover:bg-gray-800 font-semibold text-base sm:text-lg select-none"
            >
              {shop.name}
            </div>
          ))}
        </div>
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => { setShowingCalendar(true); setMenuOpen(false) }}
            className="text-left text-white hover:text-gray-300 py-3"
          >
            Ημερολόγιο
          </button>
          <button
            onClick={() => { setShowingAddShop(true); setMenuOpen(false) }}
            className="bg-white text-black font-semibold px-4 py-3 rounded hover:bg-gray-200"
          >
            + Νέο μαγαζί
          </button>
        </div>
      </SideMenu>

      {showingCalendar && (
        <CalendarView onClose={() => setShowingCalendar(false)} />
      )}

      {showingAddShop && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm">
            <h3 className="font-bold mb-4">Νέο μαγαζί</h3>
            <input
              type="text"
              value={newShopName}
              onChange={(e) => setNewShopName(e.target.value)}
              placeholder="Όνομα μαγαζιού"
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white w-full mb-4 text-base"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowingAddShop(false); setNewShopName('') }}
                className="flex-1 bg-gray-700 rounded py-2"
              >
                Άκυρο
              </button>
              <button onClick={addShop} className="flex-1 bg-white text-black rounded py-2 font-semibold">
                Προσθήκη
              </button>
            </div>
          </div>
        </div>
      )}
    </PullToRefresh>
  )
}

export default ShopList