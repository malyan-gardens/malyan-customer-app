import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

function webLocalStorage(): Storage | null {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return null;
  }
  return window.localStorage;
}

/**
 * Supabase auth storage: localStorage on web (reliable in browsers / Vercel),
 * AsyncStorage on native. AsyncStorage on web can be inconsistent with some bundlers.
 */
export const supabaseAuthStorage = {
  getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      try {
        const ls = webLocalStorage();
        return Promise.resolve(ls ? ls.getItem(key) : null);
      } catch {
        return Promise.resolve(null);
      }
    }
    return AsyncStorage.getItem(key);
  },
  setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        const ls = webLocalStorage();
        if (ls) ls.setItem(key, value);
      } catch {
        /* quota / private mode */
      }
      return Promise.resolve();
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem(key: string): Promise<void> {
    if (Platform.OS === "web") {
      try {
        const ls = webLocalStorage();
        if (ls) ls.removeItem(key);
      } catch {
        /* ignore */
      }
      return Promise.resolve();
    }
    return AsyncStorage.removeItem(key);
  },
};
