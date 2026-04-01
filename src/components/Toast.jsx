import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState(null)

  const show = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }, [])

  return { toast, show }
}

export function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>
      {toast.msg}
    </div>
  )
}
