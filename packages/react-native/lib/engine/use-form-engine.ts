import { useEffect, useState, useSyncExternalStore } from 'react'
import { FormEngine } from './form-engine.js'
import type { FormEngineOptions, FormEngineSnapshot } from './form-engine.js'

export interface UseFormEngineResult extends FormEngineSnapshot {
  engine: FormEngine
}

export function useFormEngine(options: FormEngineOptions): UseFormEngineResult {
  const [engine] = useState(() => new FormEngine(options))

  engine.callbacks = {
    onDataChange: options.onDataChange,
    onSubmit: options.onSubmit,
  }

  useEffect(() => engine.setSpec(options.spec), [engine, options.spec])
  useEffect(() => engine.setLocale(options.locale), [engine, options.locale])
  useEffect(() => {
    if (options.data !== undefined) engine.setData(options.data)
  }, [engine, options.data])

  const snapshot = useSyncExternalStore(
    engine.subscribe,
    engine.getSnapshot,
    engine.getSnapshot,
  )

  return { ...snapshot, engine }
}
