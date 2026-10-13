"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

const subscribers = new Set<{ key: string; onChange: () => void }>();

function getStorageValue(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`Failed to get localStorage key "${key}":`, error);
    return null;
  }
}

function setStorageValue(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Failed to set localStorage key "${key}":`, error);
    return false;
  }
  for (const subscriber of subscribers) {
    if (subscriber.key === key) subscriber.onChange();
  }
  return true;
}


/**
 * Subscribe to the real persisted value, including writes in this tab.
 * Failed writes retain an event-owned UI selection, never fake persistence.
 * The null server snapshot keeps the first client render hydration-safe.
 */
export function useLocalStorageValue(
  key: string
): [
  value: string | null,
  persistValue: (value: string) => boolean,
  selectValue: (value: string) => void,
] {
  const [selection, setSelection] = useState<{
    key: string;
    value: string;
    storedValue: string | null;
  } | null>(null);
  if (selection && selection.key !== key) {
    setSelection(null);
  }
  const subscribe = useCallback((onChange: () => void) => {
    const handleChange = () => {
      setSelection(null);
      onChange();
    };
    const subscriber = { key, onChange: handleChange };
    subscribers.add(subscriber);
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === window.localStorage &&
        (event.key === null || event.key === key)) {
        handleChange();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      subscribers.delete(subscriber);
      window.removeEventListener("storage", handleStorage);
    };
  }, [key]);
  const getSnapshot = useCallback(() => getStorageValue(key), [key]);
  const storedValue = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const selectValue = useCallback((value: string) => {
    const currentStoredValue = getStorageValue(key);
    setSelection(value === currentStoredValue ? null : {
      key, value, storedValue: currentStoredValue,
    });
  }, [key]);
  const setValue = useCallback((value: string) => {
    const persisted = setStorageValue(key, value);
    selectValue(value);
    return persisted;
  }, [key, selectValue]);
  const value = selection?.key === key && selection.storedValue === storedValue
    ? selection.value : storedValue;
  return [value, setValue, selectValue];
}

function getServerSnapshot() {
  return null;
}
