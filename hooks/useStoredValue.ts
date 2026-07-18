"use client";

import { useEffect, useRef, useState } from "react";
import { readLocalStorage } from "@/lib/browser-storage";

/** Reads browser-only state after hydration to keep server/client HTML stable. */
export function useStoredValue<T>(key: string, fallback: T) {
  const fallbackRef = useRef(fallback);
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setValue(readLocalStorage<T>(key, fallbackRef.current));
    });
    return () => cancelAnimationFrame(frame);
  }, [key]);

  return [value, setValue] as const;
}
