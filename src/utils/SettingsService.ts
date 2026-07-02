/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbService } from '../db/databaseService';

export interface TMDbSettings {
  apiKey: string;
  readAccessToken: string;
  language: string;
  includeAdult: boolean;
}

export class SettingsService {
  /**
   * Retrieves current TMDb settings.
   * If not set, returns default values.
   */
  public static getTMDbSettings(): TMDbSettings {
    const settings = dbService.getSettings();
    return {
      apiKey: settings?.tmdbApiKey || '',
      readAccessToken: settings?.tmdbReadAccessToken || '',
      language: settings?.tmdbLanguage || 'fa-IR',
      includeAdult: !!settings?.tmdbIncludeAdult
    };
  }

  /**
   * Saves TMDb settings into the database.
   */
  public static saveTMDbSettings(tmdbSettings: {
    apiKey: string;
    readAccessToken: string;
    language: string;
    includeAdult: boolean;
  }): void {
    dbService.updateSettings({
      tmdbApiKey: tmdbSettings.apiKey,
      tmdbReadAccessToken: tmdbSettings.readAccessToken,
      tmdbLanguage: tmdbSettings.language,
      tmdbIncludeAdult: tmdbSettings.includeAdult
    });
  }

  /**
   * Checks if TMDb credentials (either API Key or Read Access Token) are configured.
   */
  public static hasCredentials(): boolean {
    const settings = this.getTMDbSettings();
    return !!(settings.apiKey.trim() || settings.readAccessToken.trim());
  }
}
