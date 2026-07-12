import { useState, useEffect } from 'react';

/**
 * A custom hook to manage state synchronized with localStorage.
 * Handles parsing/stringifying JSON, with an option to bypass JSON parsing for raw strings.
 */
export function useLocalStorageState(key, defaultValue, isRawString = false) {
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        return isRawString ? saved : JSON.parse(saved);
      }
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    } catch {
      return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
    }
  });

  useEffect(() => {
    const valueToStore = isRawString ? state : JSON.stringify(state);
    if (valueToStore !== undefined && valueToStore !== null) {
      localStorage.setItem(key, valueToStore);
    } else {
      localStorage.removeItem(key);
    }
  }, [key, state, isRawString]);

  return [state, setState];
}
