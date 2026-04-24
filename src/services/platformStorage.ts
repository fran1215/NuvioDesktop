import { Platform } from 'react-native';

export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  getNumber(key: string): number | undefined;
  setNumber(key: string, value: number): void;
  getBoolean(key: string): boolean | undefined;
  setBoolean(key: string, value: boolean): void;
  contains(key: string): boolean;
  remove(key: string): void;
  clearAll(): void;
  getAllKeys(): string[];
}

const memoryStore = new Map<string, string>();

function canUseBrowserStorage(): boolean {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false;
  }

  try {
    const testKey = '__nuvio_storage_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function createMemoryAdapter(): KeyValueStore {
  return {
    getString: (key) => memoryStore.get(key),
    set: (key, value) => {
      memoryStore.set(key, value);
    },
    getNumber: (key) => {
      const value = memoryStore.get(key);
      return value != null ? Number(value) : undefined;
    },
    setNumber: (key, value) => {
      memoryStore.set(key, String(value));
    },
    getBoolean: (key) => {
      const value = memoryStore.get(key);
      if (value == null) return undefined;
      return value === 'true';
    },
    setBoolean: (key, value) => {
      memoryStore.set(key, value ? 'true' : 'false');
    },
    contains: (key) => memoryStore.has(key),
    remove: (key) => {
      memoryStore.delete(key);
    },
    clearAll: () => {
      memoryStore.clear();
    },
    getAllKeys: () => Array.from(memoryStore.keys()),
  };
}

function createBrowserAdapter(): KeyValueStore {
  if (!canUseBrowserStorage()) {
    return createMemoryAdapter();
  }

  return {
    getString: (key) => window.localStorage.getItem(key) ?? undefined,
    set: (key, value) => {
      window.localStorage.setItem(key, value);
    },
    getNumber: (key) => {
      const value = window.localStorage.getItem(key);
      return value != null ? Number(value) : undefined;
    },
    setNumber: (key, value) => {
      window.localStorage.setItem(key, String(value));
    },
    getBoolean: (key) => {
      const value = window.localStorage.getItem(key);
      if (value == null) return undefined;
      return value === 'true';
    },
    setBoolean: (key, value) => {
      window.localStorage.setItem(key, value ? 'true' : 'false');
    },
    contains: (key) => window.localStorage.getItem(key) != null,
    remove: (key) => {
      window.localStorage.removeItem(key);
    },
    clearAll: () => {
      window.localStorage.clear();
    },
    getAllKeys: () => {
      const keys: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (key) {
          keys.push(key);
        }
      }
      return keys;
    },
  };
}

function createNativeAdapter(): KeyValueStore {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createMMKV } = require('react-native-mmkv');
  const storage = createMMKV();

  return {
    getString: (key) => storage.getString(key),
    set: (key, value) => {
      storage.set(key, value);
    },
    getNumber: (key) => storage.getNumber(key),
    setNumber: (key, value) => {
      storage.set(key, value);
    },
    getBoolean: (key) => storage.getBoolean(key),
    setBoolean: (key, value) => {
      storage.set(key, value);
    },
    contains: (key) => storage.contains(key),
    remove: (key) => {
      storage.remove(key);
    },
    clearAll: () => {
      storage.clearAll();
    },
    getAllKeys: () => Array.from(storage.getAllKeys()) as string[],
  };
}

export function createPlatformStorage(): KeyValueStore {
  return Platform.OS === 'web' ? createBrowserAdapter() : createNativeAdapter();
}

export const platformStorage = createPlatformStorage();