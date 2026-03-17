import { stremioService } from '../stremioService';
import { mmkvStorage } from '../mmkvStorage';
import { TMDBService } from '../tmdbService';
import { logger } from '../../utils/logger';

import { convertMetaToStreamingContent, convertMetaToStreamingContentEnhanced } from './content-mappers';
import { addToRecentContent, createLibraryKey, type CatalogLibraryState } from './library';
import { DATA_SOURCE_KEY, DataSource, type StreamingContent } from './types';

export async function getDataSourcePreference(): Promise<DataSource> {
  try {
    const dataSource = await mmkvStorage.getItem(DATA_SOURCE_KEY);
    return (dataSource as DataSource) || DataSource.STREMIO_ADDONS;
  } catch (error) {
    logger.error('Failed to get data source preference:', error);
    return DataSource.STREMIO_ADDONS;
  }
}

export async function setDataSourcePreference(dataSource: DataSource): Promise<void> {
  try {
    await mmkvStorage.setItem(DATA_SOURCE_KEY, dataSource);
  } catch (error) {
    logger.error('Failed to set data source preference:', error);
  }
}

export async function getContentDetails(
  state: CatalogLibraryState,
  type: string,
  id: string,
  preferredAddonId?: string
): Promise<StreamingContent | null> {
  try {
    let meta = null;
    let lastError = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {

        const isValidId = await stremioService.isValidContentId(type, id);

        if (!isValidId) {
          break;
        }
        meta = await stremioService.getMetaDetails(type, id, preferredAddonId);

        if (meta) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      } catch (error) {
        lastError = error;
        logger.error(`Attempt ${attempt + 1} failed to get content details for ${type}:${id}:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    if (meta) {
      const content = convertMetaToStreamingContentEnhanced(meta, state.library);
      addToRecentContent(state, content);
      content.inLibrary = state.library[createLibraryKey(type, id)] !== undefined;

      return content;
    }

    if (lastError) {
      throw lastError;
    }
    return null;
  } catch (error) {
    logger.error(`Failed to get content details for ${type}:${id}:`, error);
    return null;
  }
}

export async function getEnhancedContentDetails(
  state: CatalogLibraryState,
  type: string,
  id: string,
  preferredAddonId?: string
): Promise<StreamingContent | null> {

  try {
    const result = await getContentDetails(state, type, id, preferredAddonId);
    return result;
  } catch (error) {
    throw error;
  }
}

export async function getBasicContentDetails(
  state: CatalogLibraryState,
  type: string,
  id: string,
  preferredAddonId?: string
): Promise<StreamingContent | null> {
  try {
    let meta = null;
    let lastError = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        if (!(await stremioService.isValidContentId(type, id))) {
          break;
        }

        meta = await stremioService.getMetaDetails(type, id, preferredAddonId);
        if (meta) {
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      } catch (error) {
        lastError = error;
        logger.error(`Attempt ${attempt + 1} failed to get basic content details for ${type}:${id}:`, error);
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }

    if (meta) {
      const content = convertMetaToStreamingContent(meta, state.library);
      content.inLibrary = state.library[createLibraryKey(type, id)] !== undefined;
      return content;
    }

    if (lastError) {
      throw lastError;
    }

    return null;
  } catch (error) {
    logger.error(`Failed to get basic content details for ${type}:${id}:`, error);
    return null;
  }
}

export async function getStremioId(type: string, tmdbId: string): Promise<string | null> {
  try {
    if (type === 'movie') {
      const movieDetails = await TMDBService.getInstance().getMovieDetails(tmdbId);

      if (movieDetails?.imdb_id) {
        return movieDetails.imdb_id;
      }
      return null;
    }

    if (type === 'tv' || type === 'series') {
      const externalIds = await TMDBService.getInstance().getShowExternalIds(parseInt(tmdbId, 10));

      if (externalIds?.imdb_id) {
        return externalIds.imdb_id;
      }

      const fallbackId = `kitsu:${tmdbId}`;
      return fallbackId;
    }

    return null;
  } catch (error: any) {
    logger.error('Error getting Stremio ID:', error);
    return null;
  }
}
