import { useState } from 'react'
import ShopList from './ShopList'
import TableGrid from './TableGrid'
import TableModal from './TableModal'

function App() {
  const [selectedShop, setSelectedShop] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [tableRefreshTrigger, setTableRefreshTrigger] = useState(0)

  function closeTableModal() {
    setSelectedTable(null)
    setTableRefreshTrigger((n) => n + 1)
  }

  if (!selectedShop) {
    return <ShopList onSelectShop={setSelectedShop} />
  }

  return (
    <>
      <TableGrid
        shop={selectedShop}
        onBack={() => setSelectedShop(null)}
        onSelectTable={setSelectedTable}
        onShopDeleted={() => setSelectedShop(null)}
        refreshTrigger={tableRefreshTrigger}
      />
      {selectedTable && (
        <TableModal
          shop={selectedShop}
          table={selectedTable}
          onClose={closeTableModal}
        />
      )}
    </>
  )
}

export default App