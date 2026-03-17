import { mmkvStorage } from './mmkvStorage';
import { logger } from '../utils/logger';

export const MDBLIST_API_KEY_STORAGE_KEY = 'mdblist_api_key';
export const MDBLIST_ENABLED_STORAGE_KEY = 'mdblist_enabled';
export const RATING_PROVIDERS_STORAGE_KEY = 'rating_providers_config';

// Function to check if MDBList is enabled
export const isMDBListEnabled = async (): Promise<boolean> => {
  try {
    const enabledSetting = await mmkvStorage.getItem(MDBLIST_ENABLED_STORAGE_KEY);
    return enabledSetting === 'true';
  } catch (error) {
    logger.error('[MDBList] Error checking if MDBList is enabled:', error);
    return false;
  }
};

// Function to get MDBList API key if enabled
export const getMDBListAPIKey = async (): Promise<string | null> => {
  try {
    const isEnabled = await isMDBListEnabled();
    if (!isEnabled) {
      return null;
    }
    return await mmkvStorage.getItem(MDBLIST_API_KEY_STORAGE_KEY);
  } catch (error) {
    logger.error('[MDBList] Error getting API key:', error);
    return null;
  }
};
