import { mmkvStorage } from '../mmkvStorage';
import { logger } from '../../utils/logger';

import type { StreamingContent } from './types';

// Lazy import to break require cycle:
// catalogService -> content-details -> content-mappers -> library -> notificationService -> catalogService
const getNotificationService = () =>
  require('../notificationService').notificationService;

export interface CatalogLibraryState {
  LEGACY_LIBRARY_KEY: string;
  RECENT_CONTENT_KEY: string;
  MAX_RECENT_ITEMS: number;
  library: Record<string, StreamingContent>;
  recentContent: StreamingContent[];
  librarySubscribers: Array<(items: StreamingContent[]) => void>;
  libraryAddListeners: Array<(item: StreamingContent) => void>;
  libraryRemoveListeners: Array<(type: string, id: string) => void>;
  initPromise: Promise<void>;
  isInitialized: boolean;
}

export function createLibraryKey(type: string, id: string): string {
  return `${type}:${id}`;
}

export async function initializeCatalogState(state: CatalogLibraryState): Promise<void> {
  logger.log('[CatalogService] Starting initialization...');

  try {
    logger.log('[CatalogService] Step 1: Initializing scope...');
    await initializeScope();

    logger.log('[CatalogService] Step 2: Loading library...');
    await loadLibrary(state);

    logger.log('[CatalogService] Step 3: Loading recent content...');
    await loadRecentContent(state);

    state.isInitialized = true;
    logger.log(
      `[CatalogService] Initialization completed successfully. Library contains ${Object.keys(state.library).length} items.`
    );
  } catch (error) {
    logger.error('[CatalogService] Initialization failed:', error);
    state.isInitialized = true;
  }
}

export async function ensureCatalogInitialized(state: CatalogLibraryState): Promise<void> {
  logger.log(`[CatalogService] ensureInitialized() called. isInitialized: ${state.isInitialized}`);

  try {
    await state.initPromise;
    logger.log(
      `[CatalogService] ensureInitialized() completed. Library ready with ${Object.keys(state.library).length} items.`
    );
  } catch (error) {
    logger.error('[CatalogService] Error waiting for initialization:', error);
  }
}

async function initializeScope(): Promise<void> {
  try {
    const currentScope = await mmkvStorage.getItem('@user:current');

    if (!currentScope) {
      await mmkvStorage.setItem('@user:current', 'local');
      logger.log('[CatalogService] Initialized @user:current scope to "local"');
      return;
    }

    logger.log(`[CatalogService] Using existing scope: "${currentScope}"`);
  } catch (error) {
    logger.error('[CatalogService] Failed to initialize scope:', error);
  }
}

async function loadLibrary(state: CatalogLibraryState): Promise<void> {
  try {
    const scope = (await mmkvStorage.getItem('@user:current')) || 'local';
    const scopedKey = `@user:${scope}:stremio-library`;
    let storedLibrary = await mmkvStorage.getItem(scopedKey);

    if (!storedLibrary) {
      storedLibrary = await mmkvStorage.getItem(state.LEGACY_LIBRARY_KEY);
      if (storedLibrary) {
        await mmkvStorage.setItem(scopedKey, storedLibrary);
      }
    }

    if (storedLibrary) {
      const parsedLibrary = JSON.parse(storedLibrary);
      logger.log(
        `[CatalogService] Raw library data type: ${Array.isArray(parsedLibrary) ? 'ARRAY' : 'OBJECT'}, keys: ${JSON.stringify(Object.keys(parsedLibrary).slice(0, 5))}`
      );

      if (Array.isArray(parsedLibrary)) {
        logger.log('[CatalogService] WARNING: Library is stored as ARRAY format. Converting to OBJECT format.');
        const libraryObject: Record<string, StreamingContent> = {};

        for (const item of parsedLibrary) {
          libraryObject[createLibraryKey(item.type, item.id)] = item;
        }

        state.library = libraryObject;
        logger.log(`[CatalogService] Converted ${parsedLibrary.length} items from array to object format`);

        const normalizedLibrary = JSON.stringify(state.library);
        await mmkvStorage.setItem(scopedKey, normalizedLibrary);
        await mmkvStorage.setItem(state.LEGACY_LIBRARY_KEY, normalizedLibrary);
        logger.log('[CatalogService] Re-saved library in correct format');
      } else {
        state.library = parsedLibrary;
      }

      logger.log(
        `[CatalogService] Library loaded successfully with ${Object.keys(state.library).length} items from scope: ${scope}`
      );
    } else {
      logger.log(`[CatalogService] No library data found for scope: ${scope}`);
      state.library = {};
    }

    await mmkvStorage.setItem('@user:current', scope);
  } catch (error: any) {
    logger.error('Failed to load library:', error);
    state.library = {};
  }
}

async function saveLibrary(state: CatalogLibraryState): Promise<void> {
  if (state.isInitialized) {
    await ensureCatalogInitialized(state);
  }

  try {
    const itemCount = Object.keys(state.library).length;
    const scope = (await mmkvStorage.getItem('@user:current')) || 'local';
    const scopedKey = `@user:${scope}:stremio-library`;
    const libraryData = JSON.stringify(state.library);

    logger.log(`[CatalogService] Saving library with ${itemCount} items to scope: "${scope}" (key: ${scopedKey})`);

    await mmkvStorage.setItem(scopedKey, libraryData);
    await mmkvStorage.setItem(state.LEGACY_LIBRARY_KEY, libraryData);

    logger.log(`[CatalogService] Library saved successfully with ${itemCount} items`);
  } catch (error: any) {
    logger.error('Failed to save library:', error);
    logger.error(
      `[CatalogService] Library save failed details - scope: ${(await mmkvStorage.getItem('@user:current')) || 'unknown'}, itemCount: ${Object.keys(state.library).length}`
    );
  }
}

async function loadRecentContent(state: CatalogLibraryState): Promise<void> {
  try {
    const storedRecentContent = await mmkvStorage.getItem(state.RECENT_CONTENT_KEY);
    if (storedRecentContent) {
      state.recentContent = JSON.parse(storedRecentContent);
    }
  } catch (error: any) {
    logger.error('Failed to load recent content:', error);
  }
}

async function saveRecentContent(state: CatalogLibraryState): Promise<void> {
  try {
    await mmkvStorage.setItem(state.RECENT_CONTENT_KEY, JSON.stringify(state.recentContent));
  } catch (error: any) {
    logger.error('Failed to save recent content:', error);
  }
}

function notifyLibrarySubscribers(state: CatalogLibraryState): void {
  const items = Object.values(state.library);
  state.librarySubscribers.forEach(callback => callback(items));
}

export async function getLibraryItems(state: CatalogLibraryState): Promise<StreamingContent[]> {
  if (!state.isInitialized) {
    await ensureCatalogInitialized(state);
  }

  return Object.values(state.library);
}

export function subscribeToLibraryUpdates(
  state: CatalogLibraryState,
  callback: (items: StreamingContent[]) => void
): () => void {
  state.librarySubscribers.push(callback);

  Promise.resolve().then(() => {
    getLibraryItems(state).then(items => {
      if (state.librarySubscribers.includes(callback)) {
        callback(items);
      }
    });
  });

  return () => {
    const index = state.librarySubscribers.indexOf(callback);
    if (index > -1) {
      state.librarySubscribers.splice(index, 1);
    }
  };
}

export function onLibraryAdd(
  state: CatalogLibraryState,
  listener: (item: StreamingContent) => void
): () => void {
  state.libraryAddListeners.push(listener);

  return () => {
    state.libraryAddListeners = state.libraryAddListeners.filter(currentListener => currentListener !== listener);
  };
}

export function onLibraryRemove(
  state: CatalogLibraryState,
  listener: (type: string, id: string) => void
): () => void {
  state.libraryRemoveListeners.push(listener);

  return () => {
    state.libraryRemoveListeners = state.libraryRemoveListeners.filter(
      currentListener => currentListener !== listener
    );
  };
}

export async function addToLibrary(state: CatalogLibraryState, content: StreamingContent): Promise<void> {
  logger.log(`[CatalogService] addToLibrary() called for: ${content.type}:${content.id} (${content.name})`);

  await ensureCatalogInitialized(state);

  const key = createLibraryKey(content.type, content.id);
  const itemCountBefore = Object.keys(state.library).length;
  logger.log(`[CatalogService] Adding to library with key: "${key}". Current library keys: [${Object.keys(state.library).length}] items`);

  state.library[key] = {
    ...content,
    addedToLibraryAt: Date.now(),
  };

  const itemCountAfter = Object.keys(state.library).length;
  logger.log(
    `[CatalogService] Library updated: ${itemCountBefore} -> ${itemCountAfter} items. New library keys: [${Object.keys(state.library).slice(0, 5).join(', ')}${Object.keys(state.library).length > 5 ? '...' : ''}]`
  );

  await saveLibrary(state);
  logger.log(`[CatalogService] addToLibrary() completed for: ${content.type}:${content.id}`);

  notifyLibrarySubscribers(state);

  try {
    state.libraryAddListeners.forEach(listener => listener(content));
  } catch {}

  if (content.type === 'series') {
    try {
      await getNotificationService().updateNotificationsForSeries(content.id);
    } catch (error) {
      logger.error(`[CatalogService] Failed to setup notifications for ${content.name}:`, error);
    }
  }
}

export async function removeFromLibrary(
  state: CatalogLibraryState,
  type: string,
  id: string
): Promise<void> {
  logger.log(`[CatalogService] removeFromLibrary() called for: ${type}:${id}`);

  await ensureCatalogInitialized(state);

  const key = createLibraryKey(type, id);
  const itemCountBefore = Object.keys(state.library).length;
  const itemExisted = key in state.library;
  logger.log(
    `[CatalogService] Removing key: "${key}". Currently library has ${itemCountBefore} items with keys: [${Object.keys(state.library).slice(0, 5).join(', ')}${Object.keys(state.library).length > 5 ? '...' : ''}]`
  );

  delete state.library[key];

  const itemCountAfter = Object.keys(state.library).length;
  logger.log(`[CatalogService] Library updated: ${itemCountBefore} -> ${itemCountAfter} items (existed: ${itemExisted})`);

  await saveLibrary(state);
  logger.log(`[CatalogService] removeFromLibrary() completed for: ${type}:${id}`);

  notifyLibrarySubscribers(state);

  try {
    state.libraryRemoveListeners.forEach(listener => listener(type, id));
  } catch {}

  if (type === 'series') {
    try {
      const scheduledNotifications = getNotificationService().getScheduledNotifications();
      const seriesToCancel = scheduledNotifications.filter((notification: any) => notification.seriesId === id);

      for (const notification of seriesToCancel) {
        await getNotificationService().cancelNotification(notification.id);
      }
    } catch (error) {
      logger.error(`[CatalogService] Failed to cancel notifications for removed series ${id}:`, error);
    }
  }
}

export function addToRecentContent(state: CatalogLibraryState, content: StreamingContent): void {
  state.recentContent = state.recentContent.filter(item => !(item.id === content.id && item.type === content.type));
  state.recentContent.unshift(content);

  if (state.recentContent.length > state.MAX_RECENT_ITEMS) {
    state.recentContent = state.recentContent.slice(0, state.MAX_RECENT_ITEMS);
  }

  void saveRecentContent(state);
}

export function getRecentContent(state: CatalogLibraryState): StreamingContent[] {
  return state.recentContent;
}
