function SideMenu({ open, onClose, children }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border-l border-gray-700 w-72 max-w-[80%] h-full p-5 flex flex-col">
        <button onClick={onClose} className="self-end text-gray-400 hover:text-white text-2xl leading-none mb-6">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}

export default SideMenu