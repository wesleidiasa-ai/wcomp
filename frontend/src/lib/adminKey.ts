import { useState } from "react";

const STORAGE_KEY = "supplyor.admin.key";

export function useAdminKey() {
  const [key, setKeyState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));

  function setKey(value: string) {
    localStorage.setItem(STORAGE_KEY, value);
    setKeyState(value);
  }

  function clearKey() {
    localStorage.removeItem(STORAGE_KEY);
    setKeyState(null);
  }

  return { key, setKey, clearKey };
}
