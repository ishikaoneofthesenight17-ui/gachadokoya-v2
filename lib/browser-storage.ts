/** Safely reads JSON from localStorage, returning the fallback for malformed data. */
export function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : (JSON.parse(value) as T);
  } catch {
    return fallback;
  }
}

export function writeLocalStorage<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function toggleStoredId(key: string, id: string) {
  const current = readLocalStorage<string[]>(key, []);
  const next = current.includes(id) ? current.filter((item) => item !== id) : [id, ...current];
  writeLocalStorage(key, next);
  return next;
}
