import { useState, useCallback } from 'react'

/**
 * useState that syncs to localStorage.
 * Giá trị null = xóa khỏi localStorage.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | null) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = useCallback(
    (value: T | null) => {
      try {
        if (value === null) {
          window.localStorage.removeItem(key)
          setStoredValue(initialValue)
        } else {
          window.localStorage.setItem(key, JSON.stringify(value))
          setStoredValue(value)
        }
      } catch (error) {
        console.error(`[useLocalStorage] Error setting key "${key}":`, error)
      }
    },
    [key, initialValue],
  )

  return [storedValue, setValue]
}
