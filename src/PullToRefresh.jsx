import { useState, useRef } from 'react'

function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const canPull = useRef(false)

  function handleTouchStart(e) {
    canPull.current = window.scrollY === 0
    startY.current = e.touches[0].clientY
  }

  function handleTouchMove(e) {
    if (!canPull.current || refreshing) return
    const distance = e.touches[0].clientY - startY.current
    if (distance > 0) {
      setPullDistance(Math.min(distance, 90))
    }
  }

  async function handleTouchEnd() {
    if (pullDistance > 60 && !refreshing) {
      setRefreshing(true)
      await onRefresh()
      setRefreshing(false)
    }
    setPullDistance(0)
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div
        style={{
          height: refreshing ? 44 : pullDistance,
          transition: refreshing ? 'height 0.2s ease' : 'none',
        }}
        className="flex items-center justify-center overflow-hidden text-gray-400 text-sm"
      >
        {refreshing
          ? 'Ανανέωση...'
          : pullDistance > 60
          ? 'Άφησε για ανανέωση'
          : pullDistance > 0
          ? 'Τράβηξε για ανανέωση'
          : ''}
      </div>
      {children}
    </div>
  )
}

export default PullToRefresh