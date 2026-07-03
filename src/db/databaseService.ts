/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Movie, Series, Sale, AppSettings, MediaCategory, Season, Episode, Song, MusicPlaylist } from '../types';

const STORAGE_KEYS = {
  MOVIES: 'mediacenter_movies',
  SERIES: 'mediacenter_series',
  SALES: 'mediacenter_sales',
  SETTINGS: 'mediacenter_settings',
  SONGS: 'mediacenter_songs',
  PLAYLISTS: 'mediacenter_playlists',
  INITIALIZED: 'mediacenter_initialized_v2'
};

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultPaths: {
    movies: 'D:\\Media\\Movies',
    series: 'D:\\Media\\Series',
    backups: 'D:\\Media\\Backups',
    music: 'D:\\Media\\Music'
  },
  pageSize: 20,
  defaultMoviePrice: 2000,
  defaultSeriesPrice: 1500,
  defaultQuality: '1080p BluRay',
  shopName: 'مدیریت رسانه پارس تک',
  shopAddress: 'تهران، خیابان ولیعصر، تقاطع میرداماد، خدمات رسانه پارس تک',
  shopPhone: '۰۹۳۸۰۰۷۲۰۱۹',
  shopPhoneSecondary: '۰۲۱-۸۸۸۸۸۸۸۸',
  videoPlayerMode: 'internal',
  saveInvoiceToUsbEnabled: true
};

class DatabaseService {
  private moviesCache: Movie[] = [];
  private seriesCache: Series[] = [];
  private salesCache: Sale[] = [];
  private songsCache: Song[] = [];
  private playlistsCache: MusicPlaylist[] = [];
  private settingsCache: AppSettings = DEFAULT_SETTINGS;
  private isSqliteConnected = false;

  constructor() {
    this.init();
  }

  private displayStartupError(errorMessage: string) {
    if (typeof document !== 'undefined') {
      const existing = document.getElementById('sqlite-error-overlay');
      if (existing) return;

      const overlay = document.createElement('div');
      overlay.id = 'sqlite-error-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100vw';
      overlay.style.height = '100vh';
      overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.98)';
      overlay.style.color = '#f8fafc';
      overlay.style.zIndex = '999999';
      overlay.style.display = 'flex';
      overlay.style.flexDirection = 'column';
      overlay.style.alignItems = 'center';
      overlay.style.justifyContent = 'center';
      overlay.style.fontFamily = 'Inter, Tahoma, sans-serif';
      overlay.style.direction = 'rtl';
      overlay.style.padding = '2rem';
      overlay.style.textAlign = 'center';

      overlay.innerHTML = `
        <div style="background-color: #1e293b; border: 2px solid #ef4444; padding: 2.5rem; border-radius: 12px; max-width: 600px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.7);">
          <div style="font-size: 3.5rem; margin-bottom: 1rem; color: #ef4444;">⚠️</div>
          <h1 style="font-size: 1.6rem; font-weight: bold; margin-bottom: 1rem; color: #f1f5f9; line-height: 1.5;">خطای حیاتی پایگاه داده (SQLite)</h1>
          <p style="font-size: 1rem; line-height: 1.8; color: #cbd5e1; margin-bottom: 1.5rem;">
            اتصال به پایگاه داده بومی SQLite برقرار نشد. با توجه به قوانین جدید معماری دیتابیس، دیتابیس بومی تنها منبع معتبر ذخیره‌سازی داده است و هرگونه نسخه پشتیبان محلی (LocalStorage) غیرفعال شده است. برنامه بدون اتصال به دیتابیس نمی‌تواند اجرا شود.
          </p>
          <div style="background-color: #0f172a; padding: 1rem; border-radius: 6px; font-family: monospace; font-size: 0.85rem; color: #f43f5e; text-align: left; direction: ltr; overflow-x: auto; max-height: 150px; border: 1px solid #334155; margin-bottom: 1.5rem;">
            ${errorMessage}
          </div>
          <button onclick="window.location.reload()" style="background-color: #ef4444; hover:background-color: #dc2626; color: white; border: none; padding: 0.75rem 2rem; border-radius: 6px; font-size: 1rem; font-weight: bold; cursor: pointer; transition: all 0.2s;">
            بارگذاری مجدد نرم‌افزار
          </button>
        </div>
      `;
      document.body.appendChild(overlay);
    }
  }

  private async migrateFromLocalStorageToSqlite() {
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.runSql) return;

    try {
      this.logDBAction('SYSTEM', 'بررسی وجود داده‌های قدیمی در LocalStorage جهت انتقال به دیتابیس بومی SQLite.');

      // 1. Migrate settings
      const settingsStr = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (settingsStr) {
        const parsedSettings = JSON.parse(settingsStr);
        for (const [key, val] of Object.entries(parsedSettings)) {
          await window.electronAPI.runSql('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(val)]);
        }
        localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      }

      // 2. Migrate movies
      const moviesStr = localStorage.getItem(STORAGE_KEYS.MOVIES);
      if (moviesStr) {
        const parsedMovies = JSON.parse(moviesStr);
        if (Array.isArray(parsedMovies)) {
          for (const m of parsedMovies) {
            await window.electronAPI.runSql(`
              INSERT OR REPLACE INTO movies 
              (id, category, titleFa, titleEn, year, director, writer, actors, duration, country, language, imdbRating, quality, subtitle, genres, poster, summary, filePath, purchasePrice, salePrice, addedAt, collectionName)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              m.id, m.category, m.titleFa, m.titleEn, m.year, m.director, m.writer, m.actors, m.duration,
              m.country || 'ایران', m.language || 'فارسی (دوبله)', m.imdbRating, m.quality, m.subtitle,
              JSON.stringify(m.genres || []), m.poster, m.summary, m.filePath || '', m.purchasePrice || 0,
              m.salePrice || 2000, m.addedAt, m.collectionName || ''
            ]);
          }
        }
        localStorage.removeItem(STORAGE_KEYS.MOVIES);
      }

      // 3. Migrate series
      const seriesStr = localStorage.getItem(STORAGE_KEYS.SERIES);
      if (seriesStr) {
        const parsedSeries = JSON.parse(seriesStr);
        if (Array.isArray(parsedSeries)) {
          for (const s of parsedSeries) {
            await window.electronAPI.runSql(`
              INSERT OR REPLACE INTO series 
              (id, category, titleFa, titleEn, year, director, writer, actors, episodeDuration, country, language, imdbRating, quality, subtitle, genres, poster, summary, filePath, purchasePrice, salePrice, seasons, addedAt, totalEpisodes, myEpisodesCount, releasedEpisodesCount, isEnded, isEndedText)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              s.id, s.category, s.titleFa, s.titleEn, s.year, s.director, s.writer, s.actors, s.episodeDuration,
              s.country || 'ایران', s.language || 'فارسی (دوبله)', s.imdbRating, s.quality, s.subtitle,
              JSON.stringify(s.genres || []), s.poster, s.summary, s.filePath || '', s.purchasePrice || 0,
              s.salePrice || 1500, JSON.stringify(s.seasons || []), s.addedAt, s.totalEpisodes || 0,
              s.myEpisodesCount || 0, s.releasedEpisodesCount || 0, s.isEnded ? 1 : 0, s.isEndedText || ''
            ]);
          }
        }
        localStorage.removeItem(STORAGE_KEYS.SERIES);
      }

      // 4. Migrate sales
      const salesStr = localStorage.getItem(STORAGE_KEYS.SALES);
      if (salesStr) {
        const parsedSales = JSON.parse(salesStr);
        if (Array.isArray(parsedSales)) {
          for (const sa of parsedSales) {
            await window.electronAPI.runSql(`
              INSERT OR REPLACE INTO sales 
              (id, date, customerName, mediaId, mediaTitle, mediaType, salesType, details, purchasePrice, salePrice, discount, items)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              sa.id, sa.date, sa.customerName, sa.mediaId, sa.mediaTitle, sa.mediaType, sa.salesType, sa.details,
              sa.purchasePrice || 0, sa.salePrice || 0, sa.discount || 0, JSON.stringify(sa.items || [])
            ]);
          }
        }
        localStorage.removeItem(STORAGE_KEYS.SALES);
      }

      // 5. Migrate songs
      const songsStr = localStorage.getItem(STORAGE_KEYS.SONGS);
      if (songsStr) {
        const parsedSongs = JSON.parse(songsStr);
        if (Array.isArray(parsedSongs)) {
          for (const so of parsedSongs) {
            await window.electronAPI.runSql(`
              INSERT OR REPLACE INTO songs 
              (id, titleFa, titleEn, artist, duration, quality, filePath, tags, addedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              so.id, so.titleFa, so.titleEn || '', so.artist, so.duration, so.quality, so.filePath,
              JSON.stringify(so.tags || []), so.addedAt
            ]);
          }
        }
        localStorage.removeItem(STORAGE_KEYS.SONGS);
      }

      // 6. Migrate playlists
      const playlistsStr = localStorage.getItem(STORAGE_KEYS.PLAYLISTS);
      if (playlistsStr) {
        const parsedPlaylists = JSON.parse(playlistsStr);
        if (Array.isArray(parsedPlaylists)) {
          for (const p of parsedPlaylists) {
            await window.electronAPI.runSql(`
              INSERT OR REPLACE INTO playlists (id, name, description, color) VALUES (?, ?, ?, ?)
            `, [p.id, p.name, p.description || '', p.color || '']);
          }
        }
        localStorage.removeItem(STORAGE_KEYS.PLAYLISTS);
      }

      // 7. Migrate user profile
      const userProfileStr = localStorage.getItem('parstech_user_profile');
      if (userProfileStr) {
        try {
          const profile = JSON.parse(userProfileStr);
          await window.electronAPI.runSql(`
            INSERT OR REPLACE INTO users (id, fullName, shopName, phone, phoneSecondary, email, password, securityQuestion, securityAnswer, registeredAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            profile.id || 'user_migrated',
            profile.fullName,
            profile.shopName,
            profile.phone,
            profile.phoneSecondary || '',
            profile.email ? profile.email.trim().toLowerCase() : '',
            profile.password,
            profile.securityQuestion,
            profile.securityAnswer ? profile.securityAnswer.trim().toLowerCase() : '',
            profile.registeredAt || new Date().toISOString()
          ]);
        } catch (authMigErr) {
          console.error('Failed to migrate user auth profile:', authMigErr);
        }
        localStorage.removeItem('parstech_user_profile');
      }

      this.logDBAction('SYSTEM', 'کلیه اطلاعات قدیمی LocalStorage با موفقیت به پایگاه داده بومی SQLite انتقال یافت.');
    } catch (e) {
      console.error('Error during LocalStorage to SQLite migration:', e);
    }
  }

  public async init() {
    // 0. Hard reset trigger for clean v6 reset
    const hardResetKey = 'mediacenter_hard_reset_v6_clean';
    if (typeof window !== 'undefined' && !localStorage.getItem(hardResetKey)) {
      localStorage.clear();
      localStorage.setItem(hardResetKey, 'true');
      
      if (window.electronAPI && window.electronAPI.runSql) {
        try {
          await window.electronAPI.runSql('DELETE FROM users').catch(() => {});
          await window.electronAPI.runSql('DELETE FROM movies').catch(() => {});
          await window.electronAPI.runSql('DELETE FROM series').catch(() => {});
          await window.electronAPI.runSql('DELETE FROM sales').catch(() => {});
          await window.electronAPI.runSql('DELETE FROM songs').catch(() => {});
          await window.electronAPI.runSql('DELETE FROM playlists').catch(() => {});
          await window.electronAPI.runSql('DELETE FROM settings').catch(() => {});
        } catch (e) {
          console.error('Failed to clear SQLite tables on hard reset:', e);
        }
      }
    }

    // 1. Try to load everything from SQLite database via Electron IPC
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.isSqliteAvailable) {
      try {
        const isAvailable = await window.electronAPI.isSqliteAvailable();
        if (isAvailable) {
          this.isSqliteConnected = true;
          this.logDBAction('SQLITE', 'نرم‌افزار با دیتابیس بومی better-sqlite3 ارتباط برقرار کرد.');
          
          // Perform first-time migration from LocalStorage fallbacks to SQLite
          await this.migrateFromLocalStorageToSqlite();
          
          await this.loadAllFromSqlite();
          return;
        } else {
          throw new Error('سیستم اعلام کرد پایگاه داده SQLite فعال یا آماده سرویس‌دهی نیست.');
        }
      } catch (err) {
        console.error('Failed to connect to native SQLite on startup:', err);
        this.isSqliteConnected = false;
        this.displayStartupError(err instanceof Error ? err.message : String(err));
        return;
      }
    }

    // 2. Fallback to critical error for Electron/Browser environment
    this.isSqliteConnected = false;
    this.displayStartupError('محیط دیتابیس بومی better-sqlite3 در دسترس نیست. برای اجرای این برنامه حتماً باید بر روی پلتفرم Electron همراه با دیتابیس SQLite باشید.');
  }

  public getSqliteConnected(): boolean {
    return this.isSqliteConnected;
  }

  private async loadAllFromSqlite() {
    if (typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.runSql) return;

    try {
      // Load Settings
      const settingsRes = await window.electronAPI.runSql('SELECT * FROM settings');
      if (settingsRes.success && settingsRes.rows && settingsRes.rows.length > 0) {
        const sqlSettings: any = {};
        settingsRes.rows.forEach((r: any) => {
          try {
            sqlSettings[r.key] = JSON.parse(r.value);
          } catch {
            sqlSettings[r.key] = r.value;
          }
        });
        this.settingsCache = { ...DEFAULT_SETTINGS, ...sqlSettings };
      } else {
        // Seed initial settings into SQLite
        for (const [key, val] of Object.entries(DEFAULT_SETTINGS)) {
          await window.electronAPI.runSql('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(val)]);
        }
        this.settingsCache = DEFAULT_SETTINGS;
      }

      // Load Movies
      const moviesRes = await window.electronAPI.runSql('SELECT * FROM movies ORDER BY addedAt DESC');
      if (moviesRes.success && moviesRes.rows) {
        this.moviesCache = moviesRes.rows.map((r: any) => ({
          ...r,
          genres: this.safeParseJson(r.genres, []),
          subtitlesList: this.safeParseJson(r.subtitlesList, []),
          purchasePrice: Number(r.purchasePrice || 0),
          salePrice: Number(r.salePrice || 0)
        }));
      }

      // Load Series
      const seriesRes = await window.electronAPI.runSql('SELECT * FROM series ORDER BY addedAt DESC');
      if (seriesRes.success && seriesRes.rows) {
        this.seriesCache = seriesRes.rows.map((r: any) => ({
          ...r,
          genres: this.safeParseJson(r.genres, []),
          seasons: this.safeParseJson(r.seasons, []),
          purchasePrice: Number(r.purchasePrice || 0),
          salePrice: Number(r.salePrice || 0),
          totalEpisodes: r.totalEpisodes ? Number(r.totalEpisodes) : 0,
          myEpisodesCount: r.myEpisodesCount ? Number(r.myEpisodesCount) : 0,
          releasedEpisodesCount: r.releasedEpisodesCount ? Number(r.releasedEpisodesCount) : 0,
          isEnded: r.isEnded === 1,
          isEndedText: r.isEndedText || ''
        }));
      }

      // Load Sales
      const salesRes = await window.electronAPI.runSql('SELECT * FROM sales ORDER BY date DESC');
      if (salesRes.success && salesRes.rows) {
        this.salesCache = salesRes.rows.map((r: any) => ({
          ...r,
          purchasePrice: Number(r.purchasePrice || 0),
          salePrice: Number(r.salePrice || 0),
          discount: Number(r.discount || 0),
          items: this.safeParseJson(r.items, [])
        }));
      }

      // Load Songs
      const songsRes = await window.electronAPI.runSql('SELECT * FROM songs ORDER BY addedAt DESC');
      if (songsRes.success && songsRes.rows) {
        this.songsCache = songsRes.rows.map((r: any) => ({
          ...r,
          duration: Number(r.duration || 0),
          tags: this.safeParseJson(r.tags, [])
        }));
      }

      // Load Playlists
      const playlistsRes = await window.electronAPI.runSql('SELECT * FROM playlists');
      if (playlistsRes.success && playlistsRes.rows && playlistsRes.rows.length > 0) {
        this.playlistsCache = playlistsRes.rows;
      } else {
        const defaultPlaylists: MusicPlaylist[] = [
          { id: 'p1', name: 'شاد', description: 'آهنگ‌های شاد، ریتمیک و مناسب مجالس و تالارها', color: 'emerald' },
          { id: 'p2', name: 'غمگین', description: 'آهنگ‌های ملایم، احساسی و بارانی ملو', color: 'indigo' },
          { id: 'p3', name: 'پاپ', description: 'جدیدترین آثار موسیقی پاپ ایران', color: 'sky' },
          { id: 'p4', name: 'ماشین', description: 'کوبنده و بیس‌دار، مناسب جاده و سیستم خودرو', color: 'amber' },
          { id: 'p5', name: 'نوستالژیک', description: 'خاطره‌انگیز و قدیمی دهه ۷۰ و ۸۰ شمسی', color: 'rose' },
          { id: 'p6', name: 'سنتی', description: 'آثار اصیل و سنتی ایرانی با آواز دلنشین', color: 'orange' }
        ];
        for (const p of defaultPlaylists) {
          await window.electronAPI.runSql('INSERT OR REPLACE INTO playlists (id, name, description, color) VALUES (?, ?, ?, ?)', [p.id, p.name, p.description || '', p.color || '']);
        }
        this.playlistsCache = defaultPlaylists;
      }

      window.dispatchEvent(new Event('db_synced_from_disk'));
    } catch (err) {
      console.error('Error pre-loading SQLite database:', err);
    }
  }

  private loadFromLocalStorageFallback() {
    // No-op. LocalStorage fallback is strictly removed.
  }

  private saveToLocalStorageFallback(key: string, data: any) {
    // No-op. LocalStorage fallback is strictly removed.
  }

  // --- SQLITE POWERED USERS AUTHENTICATION ---

  public async checkUserExists(): Promise<boolean> {
    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      const res = await window.electronAPI.runSql('SELECT COUNT(*) as count FROM users');
      if (res.success && res.rows && res.rows.length > 0) {
        return Number(res.rows[0].count) > 0;
      }
    }
    return false;
  }

  public async registerUser(profile: any): Promise<boolean> {
    const id = 'user_' + Math.random().toString(36).substr(2, 9);
    const registeredAt = new Date().toISOString();

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      await window.electronAPI.runSql('DELETE FROM users');

      const res = await window.electronAPI.runSql(`
        INSERT INTO users (id, fullName, shopName, phone, phoneSecondary, email, password, securityQuestion, securityAnswer, registeredAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        profile.fullName,
        profile.shopName,
        profile.phone,
        profile.phoneSecondary || '',
        profile.email.trim().toLowerCase(),
        profile.password,
        profile.securityQuestion,
        profile.securityAnswer.trim().toLowerCase(),
        registeredAt
      ]);

      if (res.success) {
        this.logDBAction('SQLITE', `ثبت نام مدیر جدید با نام مغازه ${profile.shopName} با موفقیت انجام شد.`);
        localStorage.setItem('parstech_user_profile', JSON.stringify({ ...profile, registeredAt, id }));
        return true;
      }
    }
    return false;
  }

  public async loginUser(emailOrPhone: string, password: string): Promise<any> {
    const cleanInput = emailOrPhone.trim();

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      const res = await window.electronAPI.runSql(`
        SELECT * FROM users WHERE (email = ? OR phone = ?) AND password = ?
      `, [cleanInput.toLowerCase(), cleanInput, password]);

      if (res.success && res.rows && res.rows.length > 0) {
        const dbUser = res.rows[0];
        localStorage.setItem('parstech_user_profile', JSON.stringify(dbUser));
        this.logDBAction('SQLITE', `مدیر فروشگاه (${dbUser.fullName}) با موفقیت وارد شد.`);
        return dbUser;
      }
    }
    return null;
  }

  public async verifySecurityAnswer(emailOrPhone: string, answer: string): Promise<any> {
    const cleanInput = emailOrPhone.trim();
    const cleanAnswer = answer.trim().toLowerCase();

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      const res = await window.electronAPI.runSql(`
        SELECT * FROM users WHERE (email = ? OR phone = ?) AND securityAnswer = ?
      `, [cleanInput.toLowerCase(), cleanInput, cleanAnswer]);

      if (res.success && res.rows && res.rows.length > 0) {
        return res.rows[0];
      }
    }
    return null;
  }

  public async resetUserPassword(emailOrPhone: string, newPassword: string): Promise<boolean> {
    const cleanInput = emailOrPhone.trim();

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      const res = await window.electronAPI.runSql(`
        UPDATE users SET password = ? WHERE email = ? OR phone = ?
      `, [newPassword, cleanInput.toLowerCase(), cleanInput]);

      if (res.success && res.changes && res.changes > 0) {
        this.logDBAction('SQLITE', `تغییر رمز عبور با موفقیت انجام شد.`);
        const saved = localStorage.getItem('parstech_user_profile');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.password = newPassword;
          localStorage.setItem('parstech_user_profile', JSON.stringify(parsed));
        }
        return true;
      }
    }
    return false;
  }

  // --- MOVIES CRUD (SYNCHRONOUS CACHE + BACKGROUND SQLITE) ---

  public getMovies(): Movie[] {
    return this.moviesCache;
  }

  public addMovie(movie: Omit<Movie, 'id' | 'addedAt'>): Movie {
    const newMovie: Movie = {
      ...movie,
      id: 'm_' + Math.random().toString(36).substr(2, 9),
      addedAt: new Date().toISOString()
    };

    this.moviesCache.unshift(newMovie);
    this.saveToLocalStorageFallback(STORAGE_KEYS.MOVIES, this.moviesCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql(`
        INSERT INTO movies 
        (id, category, titleFa, titleEn, year, director, writer, actors, duration, country, language, imdbRating, quality, subtitle, genres, poster, summary, filePath, purchasePrice, salePrice, addedAt, collectionName, subtitlesList)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newMovie.id,
        newMovie.category,
        newMovie.titleFa,
        newMovie.titleEn,
        newMovie.year,
        newMovie.director,
        newMovie.writer,
        newMovie.actors,
        newMovie.duration,
        newMovie.country || 'ایران',
        newMovie.language || 'فارسی (دوبله)',
        newMovie.imdbRating,
        newMovie.quality,
        newMovie.subtitle,
        JSON.stringify(newMovie.genres || []),
        newMovie.poster,
        newMovie.summary,
        newMovie.filePath || '',
        newMovie.purchasePrice || 0,
        newMovie.salePrice || 2000,
        newMovie.addedAt,
        newMovie.collectionName || '',
        JSON.stringify(newMovie.subtitlesList || [])
      ]).catch(console.error);
    }

    this.logDBAction('SQLITE', `افزودن فیلم جدید: "${newMovie.titleFa}" به دیتابیس.`);
    return newMovie;
  }

  public updateMovie(id: string, updatedData: Partial<Movie>): Movie | null {
    const idx = this.moviesCache.findIndex(m => m.id === id);
    if (idx === -1) return null;

    const updated = { ...this.moviesCache[idx], ...updatedData };
    this.moviesCache[idx] = updated;
    this.saveToLocalStorageFallback(STORAGE_KEYS.MOVIES, this.moviesCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql(`
        UPDATE movies SET 
          category = ?, titleFa = ?, titleEn = ?, year = ?, director = ?, writer = ?, 
          actors = ?, duration = ?, country = ?, language = ?, imdbRating = ?, quality = ?, 
          subtitle = ?, genres = ?, poster = ?, summary = ?, filePath = ?, purchasePrice = ?, 
          salePrice = ?, collectionName = ?, subtitlesList = ?
        WHERE id = ?
      `, [
        updated.category,
        updated.titleFa,
        updated.titleEn,
        updated.year,
        updated.director,
        updated.writer,
        updated.actors,
        updated.duration,
        updated.country || 'ایران',
        updated.language || 'فارسی (دوبله)',
        updated.imdbRating,
        updated.quality,
        updated.subtitle,
        JSON.stringify(updated.genres || []),
        updated.poster,
        updated.summary,
        updated.filePath || '',
        updated.purchasePrice || 0,
        updated.salePrice || 2000,
        updated.collectionName || '',
        JSON.stringify(updated.subtitlesList || []),
        id
      ]).catch(console.error);
    }

    this.logDBAction('SQLITE', `ویرایش فیلم: "${updated.titleFa}" در دیتابیس.`);
    return updated;
  }

  public deleteMovie(id: string): boolean {
    const initialLen = this.moviesCache.length;
    this.moviesCache = this.moviesCache.filter(m => m.id !== id);
    if (this.moviesCache.length === initialLen) return false;

    this.saveToLocalStorageFallback(STORAGE_KEYS.MOVIES, this.moviesCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql('DELETE FROM movies WHERE id = ?', [id]).catch(console.error);
    }

    this.logDBAction('SQLITE', `حذف فیلم شناسه "${id}" از دیتابیس.`);
    return true;
  }

  // --- SERIES CRUD (SYNCHRONOUS CACHE + BACKGROUND SQLITE) ---

  public getSeries(): Series[] {
    return this.seriesCache;
  }

  public addSeries(seriesItem: Omit<Series, 'id' | 'addedAt' | 'seasons'> & { seasons?: Season[] }): Series {
    const newSeries: Series = {
      ...seriesItem,
      id: 's_' + Math.random().toString(36).substr(2, 9),
      seasons: seriesItem.seasons || [],
      addedAt: new Date().toISOString()
    };

    this.seriesCache.unshift(newSeries);
    this.saveToLocalStorageFallback(STORAGE_KEYS.SERIES, this.seriesCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql(`
        INSERT INTO series 
        (id, category, titleFa, titleEn, year, director, writer, actors, episodeDuration, country, language, imdbRating, quality, subtitle, genres, poster, summary, filePath, purchasePrice, salePrice, seasons, addedAt, totalEpisodes, myEpisodesCount, releasedEpisodesCount, isEnded, isEndedText)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newSeries.id,
        newSeries.category,
        newSeries.titleFa,
        newSeries.titleEn,
        newSeries.year,
        newSeries.director,
        newSeries.writer,
        newSeries.actors,
        newSeries.episodeDuration,
        newSeries.country || 'ایران',
        newSeries.language || 'فارسی (دوبله)',
        newSeries.imdbRating,
        newSeries.quality,
        newSeries.subtitle,
        JSON.stringify(newSeries.genres || []),
        newSeries.poster,
        newSeries.summary,
        newSeries.filePath || '',
        newSeries.purchasePrice || 0,
        newSeries.salePrice || 1500,
        JSON.stringify(newSeries.seasons),
        newSeries.addedAt,
        newSeries.totalEpisodes || 0,
        newSeries.myEpisodesCount || 0,
        newSeries.releasedEpisodesCount || 0,
        newSeries.isEnded ? 1 : 0,
        newSeries.isEndedText || ''
      ]).catch(console.error);
    }

    this.logDBAction('SQLITE', `افزودن سریال جدید: "${newSeries.titleFa}" به دیتابیس.`);
    return newSeries;
  }

  public updateSeries(id: string, updatedData: Partial<Series>): Series | null {
    const idx = this.seriesCache.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const updated = { ...this.seriesCache[idx], ...updatedData };
    this.seriesCache[idx] = updated;
    this.saveToLocalStorageFallback(STORAGE_KEYS.SERIES, this.seriesCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql(`
        UPDATE series SET 
          category = ?, titleFa = ?, titleEn = ?, year = ?, director = ?, writer = ?, 
          actors = ?, episodeDuration = ?, country = ?, language = ?, imdbRating = ?, quality = ?, 
          subtitle = ?, genres = ?, poster = ?, summary = ?, filePath = ?, purchasePrice = ?, 
          salePrice = ?, seasons = ?, totalEpisodes = ?, myEpisodesCount = ?, releasedEpisodesCount = ?,
          isEnded = ?, isEndedText = ?
        WHERE id = ?
      `, [
        updated.category,
        updated.titleFa,
        updated.titleEn,
        updated.year,
        updated.director,
        updated.writer,
        updated.actors,
        updated.episodeDuration,
        updated.country || 'ایران',
        updated.language || 'فارسی (دوبله)',
        updated.imdbRating,
        updated.quality,
        updated.subtitle,
        JSON.stringify(updated.genres || []),
        updated.poster,
        updated.summary,
        updated.filePath || '',
        updated.purchasePrice || 0,
        updated.salePrice || 1500,
        JSON.stringify(updated.seasons),
        updated.totalEpisodes || 0,
        updated.myEpisodesCount || 0,
        updated.releasedEpisodesCount || 0,
        updated.isEnded ? 1 : 0,
        updated.isEndedText || '',
        id
      ]).catch(console.error);
    }

    this.logDBAction('SQLITE', `ویرایش سریال: "${updated.titleFa}" در دیتابیس.`);
    return updated;
  }

  public deleteSeries(id: string): boolean {
    const initialLen = this.seriesCache.length;
    this.seriesCache = this.seriesCache.filter(s => s.id !== id);
    if (this.seriesCache.length === initialLen) return false;

    this.saveToLocalStorageFallback(STORAGE_KEYS.SERIES, this.seriesCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql('DELETE FROM series WHERE id = ?', [id]).catch(console.error);
    }

    this.logDBAction('SQLITE', `حذف سریال شناسه "${id}" از دیتابیس.`);
    return true;
  }

  // --- SERIES NESTED SEASONS/EPISODES (SYNCHRONOUS CACHE + BACKGROUND SQLITE) ---

  public addSeason(seriesId: string, name: string): Season | null {
    const series = this.getSeries();
    const idx = series.findIndex(s => s.id === seriesId);
    if (idx === -1) return null;

    const newSeason: Season = {
      id: 'se_' + Math.random().toString(36).substr(2, 9),
      name,
      episodes: []
    };

    series[idx].seasons.push(newSeason);
    this.updateSeries(seriesId, { seasons: series[idx].seasons });
    return newSeason;
  }

  public updateSeason(seriesId: string, seasonId: string, name: string): boolean {
    const series = this.getSeries();
    const sIdx = series.findIndex(s => s.id === seriesId);
    if (sIdx === -1) return false;

    const seIdx = series[sIdx].seasons.findIndex(se => se.id === seasonId);
    if (seIdx === -1) return false;

    series[sIdx].seasons[seIdx].name = name;
    this.updateSeries(seriesId, { seasons: series[sIdx].seasons });
    return true;
  }

  public deleteSeason(seriesId: string, seasonId: string): boolean {
    const series = this.getSeries();
    const sIdx = series.findIndex(s => s.id === seriesId);
    if (sIdx === -1) return false;

    series[sIdx].seasons = series[sIdx].seasons.filter(se => se.id !== seasonId);
    this.updateSeries(seriesId, { seasons: series[sIdx].seasons });
    return true;
  }

  public addEpisode(seriesId: string, seasonId: string, episode: Omit<Episode, 'id'>): Episode | null {
    const series = this.getSeries();
    const sIdx = series.findIndex(s => s.id === seriesId);
    if (sIdx === -1) return null;

    const seIdx = series[sIdx].seasons.findIndex(se => se.id === seasonId);
    if (seIdx === -1) return null;

    const newEpisode: Episode = {
      ...episode,
      id: 'ep_' + Math.random().toString(36).substr(2, 9)
    };

    series[sIdx].seasons[seIdx].episodes.push(newEpisode);
    this.updateSeries(seriesId, { seasons: series[sIdx].seasons });
    return newEpisode;
  }

  public updateEpisode(seriesId: string, seasonId: string, episodeId: string, updatedData: Partial<Episode>): boolean {
    const series = this.getSeries();
    const sIdx = series.findIndex(s => s.id === seriesId);
    if (sIdx === -1) return false;

    const seIdx = series[sIdx].seasons.findIndex(se => se.id === seasonId);
    if (seIdx === -1) return false;

    const epIdx = series[sIdx].seasons[seIdx].episodes.findIndex(ep => ep.id === episodeId);
    if (epIdx === -1) return false;

    series[sIdx].seasons[seIdx].episodes[epIdx] = {
      ...series[sIdx].seasons[seIdx].episodes[epIdx],
      ...updatedData
    };
    this.updateSeries(seriesId, { seasons: series[sIdx].seasons });
    return true;
  }

  public deleteEpisode(seriesId: string, seasonId: string, episodeId: string): boolean {
    const series = this.getSeries();
    const sIdx = series.findIndex(s => s.id === seriesId);
    if (sIdx === -1) return false;

    const seIdx = series[sIdx].seasons.findIndex(se => se.id === seasonId);
    if (seIdx === -1) return false;

    series[sIdx].seasons[seIdx].episodes = series[sIdx].seasons[seIdx].episodes.filter(ep => ep.id !== episodeId);
    this.updateSeries(seriesId, { seasons: series[sIdx].seasons });
    return true;
  }

  // --- SALES CRUD (SYNCHRONOUS CACHE + BACKGROUND SQLITE) ---

  public getSales(): Sale[] {
    return this.salesCache;
  }

  public addSale(sale: Omit<Sale, 'id' | 'date'>): Sale {
    const newSale: Sale = {
      ...sale,
      id: 'sa_' + Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString()
    };

    this.salesCache.unshift(newSale);
    this.saveToLocalStorageFallback(STORAGE_KEYS.SALES, this.salesCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql(`
        INSERT INTO sales 
        (id, date, customerName, mediaId, mediaTitle, mediaType, salesType, details, purchasePrice, salePrice, discount, items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newSale.id,
        newSale.date,
        newSale.customerName,
        newSale.mediaId,
        newSale.mediaTitle,
        newSale.mediaType,
        newSale.salesType,
        newSale.details,
        newSale.purchasePrice,
        newSale.salePrice,
        newSale.discount,
        JSON.stringify(newSale.items || [])
      ]).catch(console.error);
    }

    this.logDBAction('SQLITE', `ثبت فاکتور مالی جدید برای مشتری: "${newSale.customerName}" با جمع کل ${newSale.salePrice - newSale.discount} ریال.`);
    return newSale;
  }

  public deleteSale(id: string): boolean {
    const initialLen = this.salesCache.length;
    this.salesCache = this.salesCache.filter(s => s.id !== id);
    if (this.salesCache.length === initialLen) return false;

    this.saveToLocalStorageFallback(STORAGE_KEYS.SALES, this.salesCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql('DELETE FROM sales WHERE id = ?', [id]).catch(console.error);
    }

    this.logDBAction('SQLITE', `حذف فاکتور شناسه "${id}" از سیستم حسابداری.`);
    return true;
  }

  // --- SETTINGS CRUD (SYNCHRONOUS CACHE + BACKGROUND SQLITE) ---

  public getSettings(): AppSettings {
    return this.settingsCache;
  }

  public updateSettings(settings: Partial<AppSettings>): AppSettings {
    const updated = {
      ...this.settingsCache,
      ...settings,
      defaultPaths: settings.defaultPaths ? { ...this.settingsCache.defaultPaths, ...settings.defaultPaths } : this.settingsCache.defaultPaths
    };

    this.settingsCache = updated;
    this.saveToLocalStorageFallback(STORAGE_KEYS.SETTINGS, this.settingsCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      for (const [key, val] of Object.entries(updated)) {
        window.electronAPI.runSql('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(val)]).catch(console.error);
      }
    }

    this.logDBAction('SQLITE', `بروزرسانی مشخصات و تنظیمات عمومی سیستم در دیتابیس.`);
    return updated;
  }

  // --- SONGS CRUD (SYNCHRONOUS CACHE + BACKGROUND SQLITE) ---

  public getSongs(): Song[] {
    return this.songsCache;
  }

  public addSong(song: Omit<Song, 'id' | 'addedAt'>): Song {
    const newSong: Song = {
      ...song,
      id: 'so_' + Math.random().toString(36).substr(2, 9),
      addedAt: new Date().toISOString()
    };

    this.songsCache.unshift(newSong);
    this.saveToLocalStorageFallback(STORAGE_KEYS.SONGS, this.songsCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql(`
        INSERT INTO songs 
        (id, titleFa, titleEn, artist, duration, quality, filePath, tags, addedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newSong.id,
        newSong.titleFa,
        newSong.titleEn || '',
        newSong.artist,
        newSong.duration,
        newSong.quality,
        newSong.filePath,
        JSON.stringify(newSong.tags || []),
        newSong.addedAt
      ]).catch(console.error);
    }

    this.logDBAction('SQLITE', `افزودن موزیک جدید: "${newSong.titleFa}" از هنرمند ${newSong.artist}.`);
    return newSong;
  }

  public updateSong(id: string, updatedData: Partial<Song>): Song | null {
    const idx = this.songsCache.findIndex(s => s.id === id);
    if (idx === -1) return null;

    const updated = { ...this.songsCache[idx], ...updatedData };
    this.songsCache[idx] = updated;
    this.saveToLocalStorageFallback(STORAGE_KEYS.SONGS, this.songsCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql(`
        UPDATE songs SET 
          titleFa = ?, titleEn = ?, artist = ?, duration = ?, quality = ?, filePath = ?, tags = ?
        WHERE id = ?
      `, [
        updated.titleFa,
        updated.titleEn || '',
        updated.artist,
        updated.duration,
        updated.quality,
        updated.filePath,
        JSON.stringify(updated.tags || []),
        id
      ]).catch(console.error);
    }

    return updated;
  }

  public deleteSong(id: string): boolean {
    const initialLen = this.songsCache.length;
    this.songsCache = this.songsCache.filter(s => s.id !== id);
    if (this.songsCache.length === initialLen) return false;

    this.saveToLocalStorageFallback(STORAGE_KEYS.SONGS, this.songsCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql('DELETE FROM songs WHERE id = ?', [id]).catch(console.error);
    }

    this.logDBAction('SQLITE', `حذف موزیک شناسه "${id}" از دیتابیس.`);
    return true;
  }

  // --- PLAYLISTS CRUD (SYNCHRONOUS CACHE + BACKGROUND SQLITE) ---

  public getMusicPlaylists(): MusicPlaylist[] {
    return this.playlistsCache;
  }

  public addMusicPlaylist(playlist: Omit<MusicPlaylist, 'id'>): MusicPlaylist {
    const newPlaylist: MusicPlaylist = {
      ...playlist,
      id: 'p_' + Math.random().toString(36).substr(2, 9)
    };

    this.playlistsCache.push(newPlaylist);
    this.saveToLocalStorageFallback(STORAGE_KEYS.PLAYLISTS, this.playlistsCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql(`
        INSERT INTO playlists (id, name, description, color) VALUES (?, ?, ?, ?)
      `, [newPlaylist.id, newPlaylist.name, newPlaylist.description || '', newPlaylist.color || '']).catch(console.error);
    }

    return newPlaylist;
  }

  public deleteMusicPlaylist(id: string): boolean {
    const initialLen = this.playlistsCache.length;
    this.playlistsCache = this.playlistsCache.filter(p => p.id !== id);
    if (this.playlistsCache.length === initialLen) return false;

    this.saveToLocalStorageFallback(STORAGE_KEYS.PLAYLISTS, this.playlistsCache);

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql('DELETE FROM playlists WHERE id = ?', [id]).catch(console.error);
    }

    return true;
  }

  // --- LAN NETWORK PEER SYNC ---

  public importPeerMedia(peerIp: string, peerMovies: any[], peerSeries: any[]) {
    let localMovies = this.moviesCache.filter(m => m.originPeerIp !== peerIp);
    let localSeries = this.seriesCache.filter(s => s.originPeerIp !== peerIp);

    const importedMovies: Movie[] = peerMovies.map(m => ({
      ...m,
      id: m.id.startsWith('peer_') ? m.id : 'peer_' + m.id,
      originPeerIp: peerIp,
      isPeerMedia: true
    }));

    const importedSeries: Series[] = peerSeries.map(s => ({
      ...s,
      id: s.id.startsWith('peer_') ? s.id : 'peer_' + s.id,
      originPeerIp: peerIp,
      isPeerMedia: true
    }));

    this.moviesCache = [...importedMovies, ...localMovies];
    this.seriesCache = [...importedSeries, ...localSeries];

    this.saveToLocalStorageFallback(STORAGE_KEYS.MOVIES, this.moviesCache);
    this.saveToLocalStorageFallback(STORAGE_KEYS.SERIES, this.seriesCache);

    this.logDBAction('SYSTEM', `همگام‌سازی شبکه: دریافت ${peerMovies.length} فیلم و ${peerSeries.length} سریال از ${peerIp}`);
  }

  // --- BACKUP & RESTORE & SYNC API ---

  public async syncWithSqlite(): Promise<{ success: boolean; message: string }> {
    if (this.isSqliteConnected) {
      await this.loadAllFromSqlite();
      return { success: true, message: 'همگام‌سازی کامل پایگاه داده SQLite با موفقیت انجام شد.' };
    }
    return { success: false, message: 'اتصال SQLite برقرار نیست. در حال کار در حافظه محلی مرورگر هستید.' };
  }

  public exportDatabase(): string {
    const backupObj = {
      movies: this.moviesCache,
      series: this.seriesCache,
      sales: this.salesCache,
      settings: this.settingsCache,
      songs: this.songsCache,
      playlists: this.playlistsCache,
      backedUpAt: new Date().toISOString(),
      version: '2.0'
    };
    this.logDBAction('SYSTEM', 'پشتیبان‌گیری کامل دیتابیس با موفقیت انجام شد.');
    return JSON.stringify(backupObj, null, 2);
  }

  private async syncImportedDatabaseToSqlite() {
    if (!this.isSqliteConnected || typeof window === 'undefined' || !window.electronAPI || !window.electronAPI.runSql) return;
    try {
      await window.electronAPI.runSql('DELETE FROM movies');
      await window.electronAPI.runSql('DELETE FROM series');
      await window.electronAPI.runSql('DELETE FROM sales');
      await window.electronAPI.runSql('DELETE FROM songs');
      await window.electronAPI.runSql('DELETE FROM playlists');

      // Save Movies
      for (const m of this.moviesCache) {
        await window.electronAPI.runSql(`
          INSERT INTO movies (id, category, titleFa, titleEn, year, director, writer, actors, duration, country, language, imdbRating, quality, subtitle, genres, poster, summary, filePath, purchasePrice, salePrice, addedAt, collectionName)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [m.id, m.category, m.titleFa, m.titleEn, m.year, m.director, m.writer, m.actors, m.duration, m.country || 'ایران', m.language || 'فارسی (دوبله)', m.imdbRating, m.quality, m.subtitle, JSON.stringify(m.genres), m.poster, m.summary, m.filePath || '', m.purchasePrice, m.salePrice, m.addedAt, m.collectionName || '']);
      }

      // Save Series
      for (const s of this.seriesCache) {
        await window.electronAPI.runSql(`
          INSERT INTO series (id, category, titleFa, titleEn, year, director, writer, actors, episodeDuration, country, language, imdbRating, quality, subtitle, genres, poster, summary, filePath, purchasePrice, salePrice, seasons, addedAt, totalEpisodes, myEpisodesCount, releasedEpisodesCount, isEnded, isEndedText)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [s.id, s.category, s.titleFa, s.titleEn, s.year, s.director, s.writer, s.actors, s.episodeDuration, s.country || 'ایران', s.language || 'فارسی (دوبله)', s.imdbRating, s.quality, s.subtitle, JSON.stringify(s.genres), s.poster, s.summary, s.filePath || '', s.purchasePrice, s.salePrice, JSON.stringify(s.seasons), s.addedAt, s.totalEpisodes || 0, s.myEpisodesCount || 0, s.releasedEpisodesCount || 0, s.isEnded ? 1 : 0, s.isEndedText || '']);
      }

      // Save Sales
      for (const sa of this.salesCache) {
        await window.electronAPI.runSql(`
          INSERT INTO sales (id, date, customerName, mediaId, mediaTitle, mediaType, salesType, details, purchasePrice, salePrice, discount, items)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [sa.id, sa.date, sa.customerName, sa.mediaId, sa.mediaTitle, sa.mediaType, sa.salesType, sa.details, sa.purchasePrice, sa.salePrice, sa.discount, JSON.stringify(sa.items || [])]);
      }

      // Save Songs
      for (const so of this.songsCache) {
        await window.electronAPI.runSql(`
          INSERT INTO songs (id, titleFa, titleEn, artist, duration, quality, filePath, tags, addedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [so.id, so.titleFa, so.titleEn || '', so.artist, so.duration, so.quality, so.filePath, JSON.stringify(so.tags), so.addedAt]);
      }

      // Save Playlists
      for (const p of this.playlistsCache) {
        await window.electronAPI.runSql('INSERT OR REPLACE INTO playlists (id, name, description, color) VALUES (?, ?, ?, ?)', [p.id, p.name, p.description || '', p.color || '']);
      }

      // Save Settings
      for (const [key, val] of Object.entries(this.settingsCache)) {
        await window.electronAPI.runSql('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(val)]);
      }
    } catch (err) {
      console.error('Failed to sync imported DB to SQLite:', err);
    }
  }

  public importDatabase(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.movies && parsed.series && parsed.sales && parsed.settings) {
        this.moviesCache = parsed.movies;
        this.seriesCache = parsed.series;
        this.salesCache = parsed.sales;
        this.settingsCache = parsed.settings;
        if (parsed.songs) this.songsCache = parsed.songs;
        if (parsed.playlists) this.playlistsCache = parsed.playlists;

        // Save fallback
        localStorage.setItem(STORAGE_KEYS.MOVIES, JSON.stringify(this.moviesCache));
        localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(this.seriesCache));
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(this.salesCache));
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settingsCache));
        localStorage.setItem(STORAGE_KEYS.SONGS, JSON.stringify(this.songsCache));
        localStorage.setItem(STORAGE_KEYS.PLAYLISTS, JSON.stringify(this.playlistsCache));

        // Sync fully to SQLite if connected (runs asynchronously in background)
        if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
          this.syncImportedDatabaseToSqlite();
        }

        this.logDBAction('SYSTEM', 'بازیابی موفقیت‌آمیز دیتابیس از روی فایل پشتیبان انجام شد.');
        window.dispatchEvent(new Event('db_synced_from_disk'));
        return { success: true, message: 'دیتابیس با موفقیت بازیابی شد.' };
      }
      return { success: false, message: 'ساختار فایل پشتیبان معتبر نیست!' };
    } catch (e) {
      return { success: false, message: 'خطا در تحلیل فایل پشتیبان: ' + (e as Error).message };
    }
  }

  public exportMediaOnly(): string {
    const exportObj = {
      type: 'mediacenter_media_export',
      movies: this.getMovies(),
      series: this.getSeries(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    this.logDBAction('SYSTEM', 'تنها فیلم‌ها و سریال‌ها با موفقیت برون‌ریزی شدند.');
    return JSON.stringify(exportObj, null, 2);
  }

  public importMediaOnly(jsonString: string): { success: boolean; addedMovies: number; addedSeries: number; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.type !== 'mediacenter_media_export' && !parsed.movies && !parsed.series) {
        if (!Array.isArray(parsed.movies) && !Array.isArray(parsed.series)) {
          return { success: false, addedMovies: 0, addedSeries: 0, message: 'ساختار فایل ورودی معتبر نیست یا اطلاعات فیلم و سریال در آن یافت نشد.' };
        }
      }

      const moviesToImport = Array.isArray(parsed.movies) ? parsed.movies : [];
      const seriesToImport = Array.isArray(parsed.series) ? parsed.series : [];

      let addedMoviesCount = 0;
      let addedSeriesCount = 0;

      if (moviesToImport.length > 0) {
        const currentMovies = this.getMovies();
        for (const importedMovie of moviesToImport) {
          if (!importedMovie.titleFa) continue;
          const existingIdx = currentMovies.findIndex((m: any) => 
            m.id === importedMovie.id || 
            (m.titleFa.trim() === importedMovie.titleFa.trim() && m.director?.trim() === importedMovie.director?.trim())
          );

          if (existingIdx !== -1) {
            currentMovies[existingIdx] = { ...currentMovies[existingIdx], ...importedMovie };
            this.updateMovie(currentMovies[existingIdx].id, importedMovie);
          } else {
            const newMovie = {
              ...importedMovie,
              id: importedMovie.id && !currentMovies.some((m: any) => m.id === importedMovie.id)
                ? importedMovie.id 
                : 'm_' + Math.random().toString(36).substr(2, 9),
              addedAt: importedMovie.addedAt || new Date().toISOString()
            };
            currentMovies.unshift(newMovie);
            this.addMovie(newMovie);
            addedMoviesCount++;
          }
        }
      }

      if (seriesToImport.length > 0) {
        const currentSeries = this.getSeries();
        for (const importedSeries of seriesToImport) {
          if (!importedSeries.titleFa) continue;
          const existingIdx = currentSeries.findIndex((s: any) => 
            s.id === importedSeries.id || 
            (s.titleFa.trim() === importedSeries.titleFa.trim() && s.director?.trim() === importedSeries.director?.trim())
          );

          if (existingIdx !== -1) {
            currentSeries[existingIdx] = { ...currentSeries[existingIdx], ...importedSeries };
            this.updateSeries(currentSeries[existingIdx].id, importedSeries);
          } else {
            const newSeries = {
              ...importedSeries,
              id: importedSeries.id && !currentSeries.some((s: any) => s.id === importedSeries.id)
                ? importedSeries.id 
                : 's_' + Math.random().toString(36).substr(2, 9),
              addedAt: importedSeries.addedAt || new Date().toISOString()
            };
            currentSeries.unshift(newSeries);
            this.addSeries(newSeries);
            addedSeriesCount++;
          }
        }
      }

      this.logDBAction('SYSTEM', `ورود رسانه: ${addedMoviesCount} فیلم و ${addedSeriesCount} سریال اضافه یا همگام شدند.`);
      return {
        success: true,
        addedMovies: addedMoviesCount,
        addedSeries: addedSeriesCount,
        message: `درون‌ریزی با موفقیت انجام شد: ${addedMoviesCount} فیلم جدید و ${addedSeriesCount} سریال جدید اضافه/بروزرسانی شدند.`
      };
    } catch (e) {
      return { success: false, addedMovies: 0, addedSeries: 0, message: 'خطا در خواندن فایل درون‌ریزی فیلم و سریال: ' + (e as Error).message };
    }
  }

  public resetDatabase() {
    localStorage.removeItem(STORAGE_KEYS.MOVIES);
    localStorage.removeItem(STORAGE_KEYS.SERIES);
    localStorage.removeItem(STORAGE_KEYS.SALES);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SONGS);
    localStorage.removeItem(STORAGE_KEYS.PLAYLISTS);
    localStorage.removeItem(STORAGE_KEYS.INITIALIZED);

    this.moviesCache = [];
    this.seriesCache = [];
    this.salesCache = [];
    this.songsCache = [];
    this.playlistsCache = [];
    this.settingsCache = DEFAULT_SETTINGS;

    if (this.isSqliteConnected && typeof window !== 'undefined' && window.electronAPI && window.electronAPI.runSql) {
      window.electronAPI.runSql('DELETE FROM movies').catch(console.error);
      window.electronAPI.runSql('DELETE FROM series').catch(console.error);
      window.electronAPI.runSql('DELETE FROM sales').catch(console.error);
      window.electronAPI.runSql('DELETE FROM songs').catch(console.error);
      window.electronAPI.runSql('DELETE FROM playlists').catch(console.error);
      window.electronAPI.runSql('DELETE FROM settings').catch(console.error);
    }

    this.init();
    this.logDBAction('SYSTEM', 'کل دیتابیس به همراه جداول SQLite پاکسازی و بازنشانی کارخانه شد.');
  }

  public async getDbFilePath(): Promise<string> {
    if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getDbFilePath) {
      return await window.electronAPI.getDbFilePath();
    }
    return 'حافظه مرورگر (Local Storage)';
  }

  private logDBAction(type: 'SQLITE' | 'INDEXEDDB' | 'SYSTEM', query: string) {
    try {
      const logs = JSON.parse(localStorage.getItem('mediacenter_db_logs') || '[]');
      const timestamp = new Date().toLocaleTimeString('fa-IR');
      logs.unshift({ id: Math.random().toString(), timestamp, type, query });
      localStorage.setItem('mediacenter_db_logs', JSON.stringify(logs.slice(0, 100)));
    } catch {
      // Ignored
    }
  }

  public getLogs() {
    try {
      return JSON.parse(localStorage.getItem('mediacenter_db_logs') || '[]');
    } catch {
      return [];
    }
  }

  public clearLogs() {
    localStorage.removeItem('mediacenter_db_logs');
  }

  private safeParseJson(str: any, defaultVal: any) {
    if (!str) return defaultVal;
    if (typeof str !== 'string') return str;
    try {
      return JSON.parse(str);
    } catch {
      return defaultVal;
    }
  }
}

export const dbService = new DatabaseService();
