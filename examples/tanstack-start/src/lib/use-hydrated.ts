import { useEffect, useState } from 'react'

let hasHydrated = false

export function useHydrated() {
  const [hydrated, setHydrated] = useState(hasHydrated)

  useEffect(() => {
    if (!hasHydrated) {
      hasHydrated = true
      setHydrated(true)
    }
  }, [])

  return hydrated
}
