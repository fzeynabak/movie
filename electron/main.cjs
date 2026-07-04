const { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Ensure a single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // If someone tried to run a second instance, focus our main window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });
}

// Ensure there is an icon file. If assets/icon.png is missing, write a base64 encoded PNG.
function ensureIconExists() {
  if (app.isPackaged) {
    return; // NEVER attempt to write inside packaged apps (ASAR is read-only)
  }
  const assetsDir = path.join(__dirname, '../assets');
  const iconPath = path.join(assetsDir, 'icon.png');
  
  if (!fs.existsSync(assetsDir)) {
    try {
      fs.mkdirSync(assetsDir, { recursive: true });
    } catch (e) {
      console.error('Failed to create assets directory:', e);
    }
  }
  
  if (!fs.existsSync(iconPath)) {
    // High-contrast 32x32 play icon in base64: Royal Indigo background, golden play button.
    const base64Png = 
      'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAABYlAAAWJQFJUiTwAAAC70lEQVRYR8WWT0gUYRjGf7O77qrrurv+qa6uu6GlYZZhhgVhdBAq6NBBOnXo0Cno0Cno0ClE6NChU4fO0S09WFiEERFhdMvUNV3X3V39reuvu7M70/eNLbNuuus66M6Hh2He98fvvO/7PT+S67punmN92lVjV0Y/N4C6WpI6A0iE0D1C6F8pDoB4CI4QSkSgXpXigNgeofZIdS7FAeI+mD1CPUTYQz9W4kBiH9A9Vf88xSFSf0Y9Ctw8xSGe6YtZg8g2YXs95O8T9NlVf4LgE6n2I9sB/v2oT6g2YHsN9REoDgg+keoxYBtAn4/m76v+JMUnUnUu1F2gT666G+h/4mVA/8tTDbBGYLqO7C9BDo86DuA/o8qHsgvAnVfUQbyDehfwHj67h+3I/XgHED6mNQHwOfUHQgXgdUj8D4BvYfIP8F/Duo/mUvI/b3gY7iM4Yn8T9g8fIeA3rG2DHgU6G+F+oXMN8Hag3UDyA+gPoRxEdIpxHeRNiBeD/6NMD4GzD/COovUD8TzbyrT6R6AnQStfIUrZ7I9X5bX9pXgDoH9XmGcxS/DORC6N/AtGf080Anqf4C+Z7S2xZgYsh2KDuE6rcoPYX6Hsw0mC9A/ULx5VgnZ9k3yv5C7R/gvyv9Lco/wHypsN8K/2mNf1H+d+U/gPrUshN0BvRZw3pG7xn6W6GfF/YLa5Y9A/r0sntGP0HpHKizsPrssE8H+2zZp4f1l1Z/ZfVJgN4H43WpP0fxeRifj+ovofos9BeL9UWD9VqD9TqH9dqY9dqS9dqL9XoL0730ehp/F+rdE9brefzdg/X6Bv+WUHwT+rcG/zZQ/A7K8S3onvXF9/v1f9/Bv98P7w/m9oDZDf005mG+S7v9k6L3Yf1e56m/lGqvpNo7qfar0r1R9kFf/99Uex9pC8T8gZz6w6gHifUgp34oPkhsANgYpD6M9BBUHya/EfoQqL6k7INofUTYfUnZByH8ofUHYfdh6WGo3g/h92Hp/Sg9hNoHqfUgtB6ktv6v+gGzU+u3u4N6CgAAAABJRU5ErkJggg==';
    try {
      fs.writeFileSync(iconPath, Buffer.from(base64Png, 'base64'));
      console.log('Successfully generated default/fallback icon.png at:', iconPath);
    } catch (e) {
      console.error('Failed to write default icon.png:', e);
    }
  }
}

// Ensure icon is written to disk at the very beginning of load (if not packaged)
ensureIconExists();

let mainWindow;
let tray = null;
let widgetWindow = null;

function createWindow() {
  ensureIconExists();
  let iconPath = path.join(__dirname, '../assets/icon.png');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(process.resourcesPath, 'assets/icon.png');
  }
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(app.getAppPath(), 'assets/icon.png');
  }

  let windowIcon = undefined;
  if (fs.existsSync(iconPath)) {
    try {
      windowIcon = nativeImage.createFromPath(iconPath);
    } catch (e) {
      console.error('Failed to load window icon via nativeImage:', e);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "مدیریت آرشیو فیلم و سریال",
    frame: false,
    icon: windowIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: false
    }
  });

  // Hide the default menu bar
  mainWindow.setMenuBarVisibility(false);

  // In development, load the Vite dev server. In production, load the static build.
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    mainWindow.loadURL('http://localhost:3050');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers for Native APIs
ipcMain.handle('minimize-window', () => {
  if (mainWindow) {
    mainWindow.minimize();
    return true;
  }
  return false;
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
    return true;
  }
  return false;
});

ipcMain.handle('close-window', () => {
  if (mainWindow) {
    mainWindow.close();
    return true;
  }
  return false;
});

function getUncPath(filepath, peerIp) {
  if (!filepath || !peerIp) return null;
  let cleanPath = filepath.replace(/\//g, '\\');
  const driveMatch = cleanPath.match(/^([a-zA-Z]):\\(.*)$/);
  if (driveMatch) {
    const driveLetter = driveMatch[1];
    const relativePart = driveMatch[2];
    
    // Possibility A: Shared drive (e.g. \\192.168.100.4\D\Media\Movies\...)
    const pathA = `\\\\${peerIp}\\${driveLetter}\\${relativePart}`;
    
    // Possibility B: direct shared folders (e.g. Movies, Series, Media)
    let pathB = null;
    if (relativePart.toLowerCase().startsWith('media\\movies\\')) {
      const sub = relativePart.substring('media\\movies\\'.length);
      pathB = `\\\\${peerIp}\\Movies\\${sub}`;
    } else if (relativePart.toLowerCase().startsWith('media\\series\\')) {
      const sub = relativePart.substring('media\\series\\'.length);
      pathB = `\\\\${peerIp}\\Series\\${sub}`;
    } else if (relativePart.toLowerCase().startsWith('movies\\')) {
      const sub = relativePart.substring('movies\\'.length);
      pathB = `\\\\${peerIp}\\Movies\\${sub}`;
    } else if (relativePart.toLowerCase().startsWith('series\\')) {
      const sub = relativePart.substring('series\\'.length);
      pathB = `\\\\${peerIp}\\Series\\${sub}`;
    } else {
      const parts = relativePart.split('\\');
      if (parts.length > 0) {
        pathB = `\\\\${peerIp}\\${parts[0]}\\${parts.slice(1).join('\\')}`;
      }
    }
    
    // Possibility C: Administrative share (e.g. \\192.168.100.4\D$\Media\Movies\...)
    const pathC = `\\\\${peerIp}\\${driveLetter}$\\${relativePart}`;
    
    return { pathA, pathB, pathC };
  }
  return null;
}

ipcMain.handle('open-file-in-explorer', async (event, filepath, originPeerIp) => {
  try {
    if (!filepath) return { success: false, error: 'No filepath provided' };
    
    if (originPeerIp && originPeerIp.trim()) {
      const peerIp = originPeerIp.trim();
      const unc = getUncPath(filepath, peerIp);
      if (unc) {
        const pathsToTry = [];
        if (unc.pathB) pathsToTry.push(unc.pathB);
        pathsToTry.push(unc.pathA);
        pathsToTry.push(unc.pathC);
        
        for (const uncPath of pathsToTry) {
          if (fs.existsSync(uncPath)) {
            shell.showItemInFolder(uncPath);
            return { success: true, resolvedPath: uncPath };
          }
        }
        
        // Fallback: spawn explorer.exe directly to select/highlight the file.
        // This will bring up Windows credentials prompt if necessary!
        const { exec } = require('child_process');
        for (const uncPath of pathsToTry) {
          try {
            exec(`explorer.exe /select,"${uncPath}"`);
          } catch (e) {}
        }
        return { success: true, resolvedPath: pathsToTry[0] };
      }
      return { success: false, error: 'آدرس شبکه در دسترس نیست.' };
    }
    
    shell.showItemInFolder(filepath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('play-video-file', async (event, filepath, originPeerIp) => {
  try {
    if (!filepath) return { success: false, error: 'No filepath provided' };
    
    if (originPeerIp && originPeerIp.trim()) {
      const peerIp = originPeerIp.trim();
      const unc = getUncPath(filepath, peerIp);
      if (unc) {
        const pathsToTry = [];
        if (unc.pathB) pathsToTry.push(unc.pathB);
        pathsToTry.push(unc.pathA);
        pathsToTry.push(unc.pathC);
        
        for (const uncPath of pathsToTry) {
          if (fs.existsSync(uncPath)) {
            const err = await shell.openPath(uncPath);
            if (!err) return { success: true, resolvedPath: uncPath };
          }
        }
        
        // Direct shell trigger: spawn 'start' process to play video file.
        // This forces Windows default player launch and pops credentials if needed.
        const { exec } = require('child_process');
        for (const uncPath of pathsToTry) {
          try {
            exec(`start "" "${uncPath}"`);
          } catch (e) {}
        }
        return { success: true, resolvedPath: pathsToTry[0] };
      }
      
      // Secondary fallback: Stream over simple HTTP server running on peer port 3300
      const downloadUrl = `http://${peerIp}:3300/api/lan/download?path=${encodeURIComponent(filepath)}`;
      const err = await shell.openExternal(downloadUrl);
      if (err) throw err;
      return { success: true, streamUrl: downloadUrl };
    }
    
    const err = await shell.openPath(filepath);
    if (err) {
      return { success: false, error: err };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-folder-directory', async (event, dirpath, originPeerIp) => {
  try {
    if (!dirpath) return { success: false, error: 'No path provided' };
    
    if (originPeerIp && originPeerIp.trim()) {
      const peerIp = originPeerIp.trim();
      const unc = getUncPath(dirpath, peerIp);
      if (unc) {
        const pathsToTry = [];
        if (unc.pathB) pathsToTry.push(unc.pathB);
        pathsToTry.push(unc.pathA);
        pathsToTry.push(unc.pathC);
        
        for (const uncPath of pathsToTry) {
          if (fs.existsSync(uncPath)) {
            const err = await shell.openPath(uncPath);
            if (!err) return { success: true, resolvedPath: uncPath };
          }
        }
        
        // Direct shell open: spawn explorer.exe directory directly.
        // This prompts standard network folder credentials window!
        const { exec } = require('child_process');
        for (const uncPath of pathsToTry) {
          try {
            exec(`explorer.exe "${uncPath}"`);
          } catch (e) {}
        }
        return { success: true, resolvedPath: pathsToTry[0] };
      }
      return { success: false, error: 'پوشه به اشتراک گذاشته شبکه یافت نشد. اطمینان حاصل کنید اشتراک‌گذاری در سیستم همکار برقرار است.' };
    }
    
    const err = await shell.openPath(dirpath);
    if (err) {
      return { success: false, error: err };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('select-file', async (event, filters) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: filters || [
      { name: 'Media Files', extensions: ['mp4', 'mkv', 'avi', 'm4v', 'mov', 'mp3', 'wav', 'flac'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-poster', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'tif', 'jfif', 'svg', 'ico', 'avif', 'heic', 'heif', 'pjpeg', 'pjpg', 'JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'TIF', 'JFIF', 'SVG', 'ICO', 'AVIF', 'HEIC', 'HEIF', 'PJPEG', 'PJPG'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result.canceled ? null : result.filePaths[0];
});

// Path to physical database file on hard disk
const getDbPath = () => {
  const docPath = app.getPath('documents');
  const dir = path.join(docPath, 'MediaCenter');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'database_media_center.db');
};

const getDbConfigPath = () => {
  const docPath = app.getPath('documents');
  const dir = path.join(docPath, 'MediaCenter');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'sqlite_config.json');
};

const getSqliteDbPath = () => {
  try {
    const configPath = getDbConfigPath();
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8') || '{}');
      if (config.sqliteDbPath) {
        let targetPath = config.sqliteDbPath.trim();
        // If directory, append filename
        try {
          if (fs.existsSync(targetPath) && fs.lstatSync(targetPath).isDirectory()) {
            targetPath = path.join(targetPath, 'database_sqlite_v2.db');
          }
        } catch (e) {}

        if (!targetPath.endsWith('.db')) {
          try {
            fs.mkdirSync(targetPath, { recursive: true });
            targetPath = path.join(targetPath, 'database_sqlite_v2.db');
          } catch (e) {}
        }

        const dirName = path.dirname(targetPath);
        if (!fs.existsSync(dirName)) {
          fs.mkdirSync(dirName, { recursive: true });
        }
        return targetPath;
      }
    }
  } catch (err) {
    console.error('Error reading custom SQLite path config:', err);
  }

  const docPath = app.getPath('documents');
  const dir = path.join(docPath, 'MediaCenter');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'database_sqlite_v2.db');
};

let sqliteDb = null;
let isSqliteInitialized = false;
let sqliteInitError = null;

const DB_SCHEMAS = {
  users: {
    definition: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      fullName TEXT,
      shopName TEXT,
      phone TEXT,
      phoneSecondary TEXT,
      email TEXT UNIQUE,
      password TEXT,
      securityQuestion TEXT,
      securityAnswer TEXT,
      registeredAt TEXT
    )`,
    indexes: []
  },
  movies: {
    definition: `CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      category TEXT,
      titleFa TEXT,
      titleEn TEXT,
      year TEXT,
      director TEXT,
      writer TEXT,
      actors TEXT,
      duration TEXT,
      country TEXT,
      language TEXT,
      imdbRating TEXT,
      quality TEXT,
      subtitle TEXT,
      genres TEXT,
      poster TEXT,
      summary TEXT,
      filePath TEXT,
      purchasePrice REAL,
      salePrice REAL,
      addedAt TEXT,
      collectionName TEXT,
      subtitlesList TEXT
    )`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_movies_added_at ON movies(addedAt)',
      'CREATE INDEX IF NOT EXISTS idx_movies_category ON movies(category)'
    ],
    migrations: [
      "ALTER TABLE movies ADD COLUMN collectionName TEXT",
      "ALTER TABLE movies ADD COLUMN subtitlesList TEXT"
    ]
  },
  series: {
    definition: `CREATE TABLE IF NOT EXISTS series (
      id TEXT PRIMARY KEY,
      category TEXT,
      titleFa TEXT,
      titleEn TEXT,
      year TEXT,
      director TEXT,
      writer TEXT,
      actors TEXT,
      episodeDuration TEXT,
      country TEXT,
      language TEXT,
      imdbRating TEXT,
      quality TEXT,
      subtitle TEXT,
      genres TEXT,
      poster TEXT,
      summary TEXT,
      filePath TEXT,
      purchasePrice REAL,
      salePrice REAL,
      seasons TEXT,
      addedAt TEXT,
      totalEpisodes INTEGER DEFAULT 0,
      myEpisodesCount INTEGER DEFAULT 0,
      releasedEpisodesCount INTEGER DEFAULT 0,
      isEnded INTEGER DEFAULT 0,
      isEndedText TEXT
    )`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_series_added_at ON series(addedAt)',
      'CREATE INDEX IF NOT EXISTS idx_series_category ON series(category)'
    ],
    migrations: [
      "ALTER TABLE series ADD COLUMN totalEpisodes INTEGER DEFAULT 0",
      "ALTER TABLE series ADD COLUMN myEpisodesCount INTEGER DEFAULT 0",
      "ALTER TABLE series ADD COLUMN releasedEpisodesCount INTEGER DEFAULT 0",
      "ALTER TABLE series ADD COLUMN isEnded INTEGER DEFAULT 0",
      "ALTER TABLE series ADD COLUMN isEndedText TEXT"
    ]
  },
  sales: {
    definition: `CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      date TEXT,
      customerName TEXT,
      mediaId TEXT,
      mediaTitle TEXT,
      mediaType TEXT,
      salesType TEXT,
      details TEXT,
      purchasePrice REAL,
      salePrice REAL,
      discount REAL,
      items TEXT
    )`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)',
      'CREATE INDEX IF NOT EXISTS idx_sales_media ON sales(mediaId)'
    ]
  },
  songs: {
    definition: `CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      titleFa TEXT,
      titleEn TEXT,
      artist TEXT,
      duration INTEGER,
      quality TEXT,
      filePath TEXT,
      tags TEXT,
      addedAt TEXT
    )`,
    indexes: [
      'CREATE INDEX IF NOT EXISTS idx_songs_added_at ON songs(addedAt)'
    ]
  },
  playlists: {
    definition: `CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT,
      description TEXT,
      color TEXT
    )`
  },
  settings: {
    definition: `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )`
  }
};

function initSqlite() {
  try {
    const Database = require('better-sqlite3');
    const dbPath = getSqliteDbPath();
    sqliteDb = new Database(dbPath, { fileMustExist: false });
    console.log('Opened SQLite database file successfully via better-sqlite3:', dbPath);
    
    // Enable Foreign Keys
    sqliteDb.pragma('foreign_keys = ON');
    
    createTables();
    isSqliteInitialized = true;
    sqliteInitError = null;
  } catch (err) {
    console.error('Critical SQLite initialization failed:', err);
    isSqliteInitialized = false;
    sqliteInitError = err.message || String(err);
    
    // Display native error box as SQLite is the only database
    app.whenReady().then(() => {
      dialog.showErrorBox(
        'خطای راه‌اندازی پایگاه داده (SQLite Database Error)',
        'راه‌اندازی پایگاه داده بومی SQLite با خطا مواجه شد:\n' + sqliteInitError + '\n\nبرنامه بدون پایگاه داده بومی قادر به ادامه کار نیست. لطفاً نصب مجدد برنامه یا نصب مجدد ماژول better-sqlite3 را بررسی کنید.'
      );
    });
  }
}

function createTables() {
  if (!sqliteDb) return;
  try {
    for (const [tableName, schema] of Object.entries(DB_SCHEMAS)) {
      // 1. Create table if not exists
      sqliteDb.prepare(schema.definition).run();
      
      // 2. Run schema column additions migrations (fail-safe)
      if (schema.migrations) {
        for (const migrationSql of schema.migrations) {
          try {
            sqliteDb.prepare(migrationSql).run();
          } catch (e) {
            // Safe to ignore if column already exists
          }
        }
      }
      
      // 3. Create indexes for optimization
      if (schema.indexes) {
        for (const indexSql of schema.indexes) {
          try {
            sqliteDb.prepare(indexSql).run();
          } catch (e) {
            console.error(`Failed to create index for table ${tableName}:`, e.message);
          }
        }
      }
    }
    console.log('All SQLite tables, indexes and migrations initialized and verified via better-sqlite3.');
  } catch (err) {
    console.error('Error initializing tables via better-sqlite3:', err);
  }
}

ipcMain.handle('read-db-file', async () => {
  try {
    const dbPath = getDbPath();
    if (!fs.existsSync(dbPath)) {
      return {};
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data || '{}');
  } catch (err) {
    console.error('Error reading physical database:', err);
    return {};
  }
});

ipcMain.handle('write-db-file', async (event, fullData) => {
  try {
    const dbPath = getDbPath();
    fs.writeFileSync(dbPath, JSON.stringify(fullData, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Error writing physical database:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-db-file-path', async () => {
  try {
    if (isSqliteInitialized && sqliteDb) {
      return getSqliteDbPath();
    }
    return getDbPath();
  } catch (err) {
    return '';
  }
});

ipcMain.handle('set-sqlite-db-path', async (event, newPath) => {
  try {
    if (!newPath || typeof newPath !== 'string') {
      return { success: false, error: 'مسیر نامعتبر است.' };
    }

    const trimmedPath = newPath.trim();
    let targetFile = trimmedPath;
    
    // Check if newPath is a directory or file path
    let isDir = false;
    try {
      if (fs.existsSync(trimmedPath) && fs.lstatSync(trimmedPath).isDirectory()) {
        isDir = true;
      }
    } catch (e) {}

    if (isDir) {
      targetFile = path.join(trimmedPath, 'database_sqlite_v2.db');
    } else if (!trimmedPath.endsWith('.db')) {
      try {
        fs.mkdirSync(trimmedPath, { recursive: true });
        targetFile = path.join(trimmedPath, 'database_sqlite_v2.db');
      } catch (e) {
        // Assume direct file path
      }
    }

    // Ensure containing directory exists
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const oldPath = getSqliteDbPath();
    if (path.resolve(oldPath) === path.resolve(targetFile)) {
      return { success: true, path: targetFile, message: 'مسیر جدید با مسیر قبلی یکسان است.' };
    }

    // Close the current SQLite DB if active
    if (sqliteDb) {
      try {
        sqliteDb.close();
      } catch (err) {
        console.error('Error closing legacy SQLite DB connection:', err);
      }
      sqliteDb = null;
    }

    // Copy DB file over if it exists
    if (fs.existsSync(oldPath)) {
      try {
        fs.copyFileSync(oldPath, targetFile);
        console.log(`Successfully moved/copied SQLite DB file from ${oldPath} to ${targetFile}`);
      } catch (copyErr) {
        console.error('Could not copy SQLite file:', copyErr);
      }
    }

    // Save configuration file
    const configPath = getDbConfigPath();
    fs.writeFileSync(configPath, JSON.stringify({ sqliteDbPath: targetFile }, null, 2), 'utf8');

    // Reopen database connection
    let reinitSuccess = false;
    let errorMsg = '';
    try {
      const Database = require('better-sqlite3');
      sqliteDb = new Database(targetFile, { fileMustExist: false });
      console.log('Opened SQLite database file successfully at:', targetFile);
      createTables();
      reinitSuccess = true;
      isSqliteInitialized = true;
    } catch (err) {
      errorMsg = err.message;
      isSqliteInitialized = false;
    }

    if (reinitSuccess) {
      return { success: true, path: targetFile };
    } else {
      return { success: false, error: 'موتور دیتابیس نتوانست دیتابیس را در مسیر جدید لود کند: ' + errorMsg };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('is-sqlite-available', async () => {
  return isSqliteInitialized && sqliteDb !== null;
});

ipcMain.handle('run-sql', async (event, sql, params = []) => {
  if (!isSqliteInitialized || !sqliteDb) {
    return { success: false, error: 'SQLite database is not initialized.' };
  }
  try {
    const isQuery = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('PRAGMA') || sql.trim().toUpperCase().startsWith('EXPLAIN');
    const stmt = sqliteDb.prepare(sql);
    const sqlParams = params || [];
    if (isQuery) {
      const rows = stmt.all(sqlParams);
      return { success: true, rows };
    } else {
      const info = stmt.run(sqlParams);
      return { success: true, lastID: info.lastInsertRowid, changes: info.changes };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('exists-file', async (event, filepath) => {
  try {
    const exists = fs.existsSync(filepath);
    let size = 0;
    if (exists) {
      const stat = fs.statSync(filepath);
      size = stat.size;
    }
    return { success: true, exists, size };
  } catch (err) {
    return { success: false, exists: false, error: err.message };
  }
});

ipcMain.handle('rename-file', async (event, oldPath, newPath) => {
  try {
    if (!oldPath || !newPath) {
      return { success: false, error: 'مسیر مبدا یا مقصد مشخص نیست.' };
    }
    if (!fs.existsSync(oldPath)) {
      return { success: false, error: 'فایل مبدا وجود ندارد.' };
    }
    const destDir = path.dirname(newPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('resolve-video-path', async (event, basePathWithoutExt) => {
  try {
    const extensions = ['.mkv', '.mp4', '.3gp', '.avi', '.m4v', '.ts', '.flv', '.mov', '.webm', '.MKV', '.MP4', '.3GP', '.3gp', '.3GPP'];
    for (const ext of extensions) {
      const fullPath = basePathWithoutExt + ext;
      if (fs.existsSync(fullPath)) {
        return { success: true, resolvedPath: fullPath, ext: ext };
      }
    }
    // Try to check if the file with already existing extension is there, or default to mkv
    return { success: false, resolvedPath: basePathWithoutExt + '.mkv', ext: '.mkv' };
  } catch (err) {
    return { success: false, resolvedPath: basePathWithoutExt + '.mkv', ext: '.mkv', error: err.message };
  }
});

// Recursively lists all video files in a folder to parse and map seasons and episodes
ipcMain.handle('scan-series-directory', async (event, dirpath) => {
  try {
    if (!dirpath || !fs.existsSync(dirpath)) {
      return { success: false, error: 'Directory does not exist or invalid path' };
    }
    
    const results = [];
    function scanDir(currentPath) {
      const entries = fs.readdirSync(currentPath);
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else {
            const ext = path.extname(fullPath).toLowerCase();
            const videoExtensions = ['.mp4', '.mkv', '.3gp', '.avi', '.m4v', '.ts', '.flv', '.mov', '.webm', '.3gpp'];
            if (videoExtensions.includes(ext)) {
              results.push({
                name: entry,
                path: fullPath,
                ext: ext,
                size: stat.size
              });
            }
          }
        } catch (e) {
          // Ignore unreadable entries
        }
      }
    }
    
    scanDir(dirpath);
    return { success: true, files: results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Recursively lists all video files in a folder for general media scanning
ipcMain.handle('scan-media-directory', async (event, dirpath) => {
  try {
    if (!dirpath || !fs.existsSync(dirpath)) {
      return { success: false, error: 'Directory does not exist or invalid path' };
    }
    
    const results = [];
    const supportedExts = new Set(['.mkv', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mpeg', '.mpg', '.m4v', '.ts', '.3gp', '.3gpp']);
    
    function scanDir(currentPath) {
      const entries = fs.readdirSync(currentPath);
      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else {
            const ext = path.extname(fullPath).toLowerCase();
            if (supportedExts.has(ext)) {
              results.push({
                filename: entry,
                fullPath: fullPath,
                extension: ext.startsWith('.') ? ext.substring(1) : ext,
                folder: currentPath,
                size: stat.size,
                modifiedDate: stat.mtime.toISOString()
              });
            }
          }
        } catch (e) {
          // Ignore unreadable entries
        }
      }
    }
    
    scanDir(dirpath);
    return { success: true, files: results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Converting Persian and Arabic digits to English digits
function toEnglishDigits(str) {
  if (!str) return '';
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  for (let i = 0; i < 10; i++) {
    str = str.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return str;
}

// Meta tags retriever
function getMetaContent(html, nameOrProperty) {
  const metaRegex = /<meta\s+([^>]+)>/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const attrs = match[1];
    const propertyRegex = new RegExp(`(?:property|name)\\s*=\\s*["']\\s*${nameOrProperty.replace(':', '\\:')}\\s*["']`, 'i');
    if (propertyRegex.test(attrs)) {
      const contentRegex = /content\s*=\s*["']([^"']+)["']/i;
      const contentMatch = contentRegex.exec(attrs);
      if (contentMatch) {
         return contentMatch[1].trim();
      }
    }
  }
  return '';
}

// Persian title cleanup
function cleanPersianTitle(title) {
  if (!title) return '';
  let clean = title.trim();

  // Strip VOD brands
  clean = clean.replace(/فیلیمو/g, '')
               .replace(/نماوا/g, '')
               .replace(/فیلم\s*نت/g, '')
               .replace(/فیلم‌نت/g, '')
               .replace(/filmnet/g, '')
               .replace(/filimo/g, '')
               .replace(/namava/g, '')
               .replace(/imdb/gi, '')
               .trim();

  // Strip common phrases
  clean = clean.replace(/^(?:تماشای\s+آنلاین\s+سریال|تماشای\s+آنلاین\s+فیلم|تماشای\s+آنلاین|دانلود\s+و\s+تماشای|دانلود\s+سریال|دانلود\s+فیلم|کامل|دوبله\s+فارسی|دوبله|زیرنویس\s+فارسی|تماشای|دانلود)\s+/gi, '')
               .replace(/\s+(?:دوبله\s+فارسی|دوبله|زیرنویس|کامل|سانسور\s+شده|بدون\s+سانسور|فارسی)$/gi, '')
               .trim();

  // Strip leading words "فیلم" or "سریال" only if followed by a space
  clean = clean.replace(/^فیلم\s+/g, '')
               .replace(/^سریال\s+/g, '')
               .replace(/^مجموعه\s+/g, '')
               .trim();

  // Strip common symbols
  clean = clean.replace(/^[\s\-|:|_|–|«|»|\||(|)]+|[\s\-|:|_|–|«|»|\||(|)]+$/g, '').trim();

  // Remove trailing episode info (supporting Persian/Arabic digits)
  clean = clean.replace(/\s+قسمت\s+[\d\u06F0-\u06F9\u0660-\u0669]+.*$/gi, '')
               .replace(/\s+فصل\s+[\d\u06F0-\u06F9\u0660-\u0669]+.*$/gi, '')
               .trim();

  // Secondary symbol cleanup
  clean = clean.replace(/^[\s\-|:|_|–|«|»|\||(|)]+|[\s\-|:|_|–|«|»|\||(|)]+$/g, '').trim();

  return clean;
}

// Summary cleanup
function cleanSummary(summary) {
  if (!summary) return '';
  let clean = summary.trim();
  
  // Split on sentence boundary and filter out marketing lines
  const sentences = clean.split(/[.!?]/);
  const filtered = sentences.filter(sentence => {
    const s = sentence.toLowerCase();
    return !(
      s.includes('فیلیمو') || 
      s.includes('نماوا') || 
      s.includes('فیلم نت') || 
      s.includes('فیلم‌نت') || 
      s.includes('دانلود و تماشا') ||
      s.includes('حقوق این اثر') ||
      s.includes('دانلود رایگان') ||
      s.includes('لینک مستقیم')
    );
  });
  
  if (filtered.length > 0) {
    clean = filtered.join('. ').trim();
  }
  
  return clean.substring(0, 500);
}

// Scraping Extraction logic for Filimo, Namava, FilmNet, and IMDb
function extractMediaInfo(html, url) {
  let info = {
    titleFa: '',
    titleEn: '',
    year: '',
    director: '',
    writer: '',
    actors: '',
    imdbRating: '',
    poster: '',
    summary: '',
    genres: [],
    duration: '',
    country: 'ایران',
    language: 'دوبله فارسی',
    quality: '1080p',
    batchSeasonsCount: 1,
    batchEpisodesForSeason: [10]
  };

  try {
    // Recursive helper to traverse JSON-LD schema.org graph and find Movie or TVSeries
    function findSchemasRecursive(obj, results = []) {
      if (!obj || typeof obj !== 'object') return results;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          findSchemasRecursive(item, results);
        }
        return results;
      }
      if (obj['@type']) {
        const typeStr = String(obj['@type']).toLowerCase();
        if (typeStr.includes('movie') || typeStr.includes('tvseries') || typeStr.includes('series') || typeStr.includes('episode') || typeStr.includes('videoobject')) {
          results.push(obj);
        }
      }
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          findSchemasRecursive(obj[key], results);
        }
      }
      return results;
    }

    // Recursive helper to traverse NextJS graph (like __NEXT_DATA__) and harvest film metadata
    function parseImdbGraph(node) {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) {
        for (const item of node) parseImdbGraph(item);
        return;
      }

      // Check titleText
      if (node.titleText && typeof node.titleText === 'object' && node.titleText.text) {
        const text = String(node.titleText.text).trim();
        if (/[\u0600-\u06FF]/.test(text)) {
          info.titleFa = text;
        } else if (!info.titleEn) {
          info.titleEn = text;
        }
      }

      // Check originalTitleText
      if (node.originalTitleText && typeof node.originalTitleText === 'object' && node.originalTitleText.text) {
        info.titleEn = String(node.originalTitleText.text).trim();
      }

      // Check releaseYear
      if (node.releaseYear && typeof node.releaseYear === 'object' && node.releaseYear.year) {
        info.year = String(node.releaseYear.year);
      }

      // Check plot / plotText
      if (node.plotText && typeof node.plotText === 'object' && node.plotText.plainText) {
        info.summary = String(node.plotText.plainText).trim();
      } else if (node.plot && typeof node.plot === 'object') {
        if (node.plot.plotText && node.plot.plotText.plainText) {
          info.summary = String(node.plot.plotText.plainText).trim();
        }
      }

      // Check primaryImage
      if (node.primaryImage && typeof node.primaryImage === 'object' && node.primaryImage.url) {
        info.poster = String(node.primaryImage.url);
      }

      // Check ratingsSummary / aggregateRating
      if (node.ratingsSummary && typeof node.ratingsSummary === 'object' && node.ratingsSummary.aggregateRating) {
        info.imdbRating = String(node.ratingsSummary.aggregateRating);
      } else if (node.aggregateRating) {
        if (typeof node.aggregateRating === 'number' || typeof node.aggregateRating === 'string') {
          info.imdbRating = String(node.aggregateRating);
        } else if (node.aggregateRating.ratingValue) {
          info.imdbRating = String(node.aggregateRating.ratingValue);
        }
      }

      // Check genres
      if (node.genres && Array.isArray(node.genres)) {
        const found = [];
        for (const g of node.genres) {
          if (typeof g === 'object') {
            if (g.text) found.push(g.text);
            else if (g.id) found.push(g.id);
          } else if (typeof g === 'string') {
            found.push(g);
          }
        }
        if (found.length > 0) {
          info.genres = found;
        }
      }

      // Check runtime
      if (node.runtime && typeof node.runtime === 'object') {
        if (node.runtime.seconds) {
          info.duration = `${Math.round(node.runtime.seconds / 60)} دقیقه`;
        } else if (node.runtime.displayableProperty && node.runtime.displayableProperty.value) {
          info.duration = String(node.runtime.displayableProperty.value.plainText || node.runtime.displayableProperty.value);
        }
      }

      for (const k in node) {
        if (node[k] && typeof node[k] === 'object') {
          parseImdbGraph(node[k]);
        }
      }
    }

    // A. DEEP EXTRACTORS FOR HIGH-TECH PAGES (NEXT.JS, NUXT, APPLICATION STATE)
    let nextData = null;
    const nextDataRegex = /<script\s+[^>]*?id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i;
    const nextDataMatch = nextDataRegex.exec(html);
    if (nextDataMatch) {
      try {
        nextData = JSON.parse(nextDataMatch[1].trim());
      } catch (e) {
        console.error("Error parsing __NEXT_DATA__ block:", e);
      }
    }

    // JSON-LD processing with flexible script regex
    const ldJsonRegex = /<script\s+[^>]*?type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let ldMatch;
    let ldDataList = [];
    while ((ldMatch = ldJsonRegex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(ldMatch[1].trim());
        if (Array.isArray(parsed)) {
          ldDataList.push(...parsed);
        } else {
          ldDataList.push(parsed);
        }
      } catch (e) {
        // Safe skip
      }
    }

    // Helper to find a value by traversing a nested JSON object recursively
    function deepSearchByKey(obj, targetKeys) {
      let found = [];
      const keys = targetKeys.map(k => k.toLowerCase());
      function traverse(node) {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          for (const item of node) traverse(item);
          return;
        }
        for (const k in node) {
          if (keys.includes(k.toLowerCase()) && node[k] && typeof node[k] !== 'object') {
            found.push({ key: k, value: String(node[k]) });
          }
          traverse(node[k]);
        }
      }
      traverse(obj);
      return found;
    }

    // 1. OPEN GRAPH / META TAGS
    const rawOgTitle = getMetaContent(html, 'og:title') || getMetaContent(html, 'twitter:title') || getMetaContent(html, 'title');
    const titleRegex = /<title>([^<]+)<\/title>/i;
    const titleMatch = titleRegex.exec(html);
    const rawTitle = rawOgTitle || (titleMatch ? titleMatch[1] : '');
    info.titleFa = cleanPersianTitle(rawTitle);

    const rawOgDesc = getMetaContent(html, 'og:description') || getMetaContent(html, 'description') || getMetaContent(html, 'twitter:description');
    info.summary = cleanSummary(rawOgDesc);

    const rawOgImage = getMetaContent(html, 'og:image') || getMetaContent(html, 'twitter:image') || getMetaContent(html, 'og:image:secure_url');
    if (rawOgImage && rawOgImage.startsWith('http')) {
      info.poster = rawOgImage;
    }

    // 2. FILIMO HTML SPECIFIC TARGETED PARSING (BASED ON THE USER'S PROVIDED SPECS)
    if (url.includes('filimo.com') || html.includes('filimo') || html.includes('EED6vTqjYA') || html.includes('qSmng0J2Vk')) {
      info.country = 'ایران';
      info.language = 'فارسی';

      // A. Title extraction
      let foundTitleFa = '';
      const filimoTitleRegex = /<h1[^>]*class=["'][^"']*EED6vTqjYA[^"']*["'][^>]*>([^<]+)<\/h1>/i;
      const filimoTitleMatch = filimoTitleRegex.exec(html);
      if (filimoTitleMatch) {
        foundTitleFa = filimoTitleMatch[1];
      } else {
        const titleFaDivMatch = /<div class=["']lHcvhW3BYc["']>\s*<h1[^>]*>([^<]+)<\/h1>/i.exec(html);
        if (titleFaDivMatch) {
          foundTitleFa = titleFaDivMatch[1];
        } else {
          const generalH1Match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html);
          if (generalH1Match) {
            foundTitleFa = generalH1Match[1];
          }
        }
      }
      if (foundTitleFa) {
        info.titleFa = cleanPersianTitle(foundTitleFa);
      }

      // B. Metadata extraction (Seasons, Episodes, Genres, IMDb, Production Year)
      let detailsUlHtml = '';
      const detailsUlRegex = /<ul[^>]+data-test-id=["']details-movie-description["'][^>]*>([\s\S]*?)<\/ul>/i;
      const detailsUlMatch = detailsUlRegex.exec(html);
      if (detailsUlMatch) {
        detailsUlHtml = detailsUlMatch[1];
      }

      const foundGenres = [];
      const liMatches = [];

      if (detailsUlHtml) {
        const liItemRegex = /<li\s+([^>]*?)>([\s\S]*?)<\/li>/gi;
        let m;
        while ((m = liItemRegex.exec(detailsUlHtml)) !== null) {
          liMatches.push({ attrs: m[1], content: m[2] });
        }
      } else {
        const liItemRegex = /<li[^>]+class=["'][^"']*(?:qSmng0J2Vk|mojuf8RKKT)[^"']*["'][^>]*>([\s\S]*?)<\/li>/gi;
        let m;
        while ((m = liItemRegex.exec(html)) !== null) {
          liMatches.push({ attrs: '', content: m[1] });
        }
      }

      for (const item of liMatches) {
        let ariaLabel = '';
        const labelMatch = /aria-label=["']([^"']+)["']/i.exec(item.attrs);
        if (labelMatch) {
          ariaLabel = labelMatch[1].trim();
        }

        const cleanContent = item.content.replace(/<[^>]+>/g, '').trim();
        const value = ariaLabel || cleanContent;

        if (!value) continue;

        // IMDb
        if (value.includes('امتیاز') || value.includes('آی ام دی بی') || value.includes('آی‌ام‌دی‌بی') || value.toLowerCase().includes('imdb')) {
          const ratingText = toEnglishDigits(value);
          const scoreMatch = /([\d\.]+)/.exec(ratingText);
          if (scoreMatch) {
            info.imdbRating = scoreMatch[1];
          } else if (/^\s*([\d\.]+)\s*$/.test(ratingText)) {
            info.imdbRating = ratingText.trim();
          }
        }
        // Season / Episodes
        else if (value.includes('فصل') || value.includes('قسمت')) {
          const enVal = toEnglishDigits(value);
          const sAndEpMatch = /(\d+)\s*فصل\s*\(\s*(\d+)\s*قسمت\s*\)/i.exec(enVal);
          if (sAndEpMatch) {
            const seasons = parseInt(sAndEpMatch[1]);
            const episodes = parseInt(sAndEpMatch[2]);
            info.batchSeasonsCount = seasons;
            const epPerSeason = Math.ceil(episodes / seasons);
            info.batchEpisodesForSeason = Array(seasons).fill(epPerSeason);
          } else {
            const onlySeasonMatch = /(\d+)\s*فصل/i.exec(enVal);
            if (onlySeasonMatch) {
              const seasons = parseInt(onlySeasonMatch[1]);
              info.batchSeasonsCount = seasons;
              info.batchEpisodesForSeason = Array(seasons).fill(10);
            }
            const onlyEpMatch = /(\d+)\s*قسمت/i.exec(enVal);
            if (onlyEpMatch && !info.batchSeasonsCount) {
              const episodes = parseInt(onlyEpMatch[1]);
              info.batchSeasonsCount = 1;
              info.batchEpisodesForSeason = [episodes];
            }
          }
        }
        // Production Year & Country
        else if (value.includes('(') && value.includes(')')) {
          const yearMatch = /\(([\d\u06F0-\u06F9]{4})\)/.exec(value) || /\((\d{4})\)/.exec(toEnglishDigits(value));
          if (yearMatch) {
            info.year = toEnglishDigits(yearMatch[1]);
          }
          if (value.includes('ایران')) info.country = 'ایران';
          else if (value.includes('آمریکا')) info.country = 'آمریکا';
        }
        // Genres
        else {
          const splitted = value.split(/[،,]/).map(s => s.trim()).filter(Boolean);
          const knownGenres = ['درام', 'کمدی', 'اکشن', 'علمی تخیلی', 'ترسناک', 'هیجان انگیز', 'مستند', 'خانوادگی', 'جنایی', 'معمایی', 'عاشقانه', 'ماجراجویی', 'انیمیشن', 'تاریخی', 'جنگی', 'فانتزی', 'ورزشی', 'موزیکال', 'پلیسی'];
          const matched = splitted.filter(s => knownGenres.some(kg => s.includes(kg) || kg.includes(s)));
          if (matched.length > 0) {
            foundGenres.push(...matched);
          }
        }
      }

      if (foundGenres.length > 0) {
        info.genres = [...new Set(foundGenres)];
      }

      // C. Story description
      const zbStoryMatch = /<div class=["']ZbPVax1HrE["']>([\s\S]*?)<\/div>/i.exec(html);
      if (zbStoryMatch) {
        info.summary = cleanSummary(zbStoryMatch[1].replace(/<[^>]+>/g, '').trim());
      } else {
        const altStoryMatch = /aria-labelledby=["'](?:secondStoryAbout|thirdStoryAbout)["'][^>]*>[^]*?<div[^>]*>([\s\S]*?)<\/div>/i.exec(html);
        if (altStoryMatch) {
          info.summary = cleanSummary(altStoryMatch[1].replace(/<[^>]+>/g, '').trim());
        }
      }

      // D. Directors / actors from Filimo
      const crewRegex = /<a[^>]+href=["'][^"']*\/crew\/([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
      let cMatch;
      let directorsList = [];
      let actorsList = [];
      const maxDistance = 300;

      while ((cMatch = crewRegex.exec(html)) !== null) {
        const name = cMatch[2].replace(/<[^>]+>/g, '').trim();
        const index = cMatch.index;
        const context = html.substring(Math.max(0, index - maxDistance), Math.min(html.length, index + maxDistance));
        if (context.includes('کارگردان') || context.includes('کارگردانی') || context.includes('کارگران')) {
          if (!directorsList.includes(name)) directorsList.push(name);
        } else if (context.includes('بازیگر') || context.includes('بازیگران') || context.includes('ستارگان')) {
          if (!actorsList.includes(name)) actorsList.push(name);
        }
      }

      if (directorsList.length > 0) info.director = directorsList.join('، ');
      if (actorsList.length > 0) info.actors = actorsList.slice(0, 8).join('، ');
    }

    // 3. FILMNET & NAMAVA SPECIFIC PARSING RULES
    if (url.includes('filmnet.ir') || html.includes('filmnet')) {
      info.country = 'ایران';
      info.language = 'فارسی';

      // First H1 is title
      const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
      if (h1Match) {
        info.titleFa = cleanPersianTitle(h1Match[1].replace(/<[^>]+>/g, '').trim());
      }
    }

    if (url.includes('namava.ir') || html.includes('namava')) {
      info.country = 'ایران';
      info.language = 'فارسی';

      // First H1 is title
      const h1Match = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
      if (h1Match) {
         info.titleFa = cleanPersianTitle(h1Match[1].replace(/<[^>]+>/g, '').trim());
      }

      // Parse namava categories
      const namavaGenreList = [];
      const categoryRegex = /href=["'][^"']*namava\.ir\/category\/([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
      let catMatch;
      while ((catMatch = categoryRegex.exec(html)) !== null) {
        const g = catMatch[2].replace(/<[^>]+>/g, '').trim();
        if (g && g !== 'فیلم' && g !== 'سریال' && !namavaGenreList.includes(g)) {
          namavaGenreList.push(g);
        }
      }
      if (namavaGenreList.length > 0) {
        info.genres = namavaGenreList;
      }
    }

    // 4. NEXT.JS STATE SEARCH FALLBACK (HIGHLY RESILIENT FOR FILMNET CODES & DYNAMIC STRUCTURES)
    if (nextData && nextData.props) {
      const pageProps = nextData.props.pageProps || {};
      const deepKeys = ['title', 'title_fa', 'titleFa', 'summary', 'description', 'imdbRating', 'imdb_rating', 'rating', 'released', 'release_year', 'year', 'production_year'];
      const deepSearchResults = deepSearchByKey(nextData, deepKeys);

      function getResultFor(keys) {
        const found = deepSearchResults.find(r => keys.includes(r.key.toLowerCase()));
        return found ? found.value : '';
      }

      const foundTitle = getResultFor(['title_fa', 'title']);
      if (foundTitle && (!info.titleFa || ['فیلیمو', 'نماوا', 'فیلم نت', 'فیلم‌نت', ''].includes(info.titleFa))) {
        info.titleFa = cleanPersianTitle(foundTitle);
      }

      const foundDesc = getResultFor(['summary', 'description']);
      if (foundDesc && (!info.summary || info.summary.length < 10)) {
        info.summary = cleanSummary(foundDesc);
      }

      const foundImdb = getResultFor(['imdbrating', 'imdb_rating', 'rating']);
      if (foundImdb && !info.imdbRating) {
        info.imdbRating = toEnglishDigits(foundImdb);
      }

      const foundYear = getResultFor(['release_year', 'production_year', 'year', 'released']);
      if (foundYear && !info.year) {
        const cleanYMatch = /(\d{4})/.exec(toEnglishDigits(foundYear));
        if (cleanYMatch) {
          info.year = cleanYMatch[1];
        }
      }

      // Parse English Title deep search
      const foundEnTitle = getResultFor(['title_en', 'titleen', 'english_title', 'englishTitle', 'slug']);
      if (foundEnTitle && !info.titleEn) {
        info.titleEn = foundEnTitle.replace(/-/g, ' ').toUpperCase();
      }

      // FilmNet specific state structure deep search
      const queryMedia = pageProps.media || pageProps.movie || pageProps.series || pageProps.data || {};
      if (queryMedia) {
        if (queryMedia.title && !info.titleFa) info.titleFa = cleanPersianTitle(queryMedia.title);
        if (queryMedia.english_title && !info.titleEn) info.titleEn = queryMedia.english_title.toUpperCase();
        if (queryMedia.summary && !info.summary) info.summary = cleanSummary(queryMedia.summary);
        if (queryMedia.production_year && !info.year) info.year = String(queryMedia.production_year);
        if (queryMedia.imdb_rating && !info.imdbRating) info.imdbRating = String(queryMedia.imdb_rating);
        
        // Poster extraction from pageProps
        const posterUrl = queryMedia.poster_image || queryMedia.poster || queryMedia.cover_image || queryMedia.cover || queryMedia.banner;
        if (posterUrl && !info.poster) {
          info.poster = posterUrl.startsWith('http') ? posterUrl : `https://filmnet.ir${posterUrl}`;
        }

        // Genres list
        if (queryMedia.categories && Array.isArray(queryMedia.categories)) {
          info.genres = queryMedia.categories.map(c => c.title || c.name || '').filter(Boolean);
        }

        // Crew parsing
        if (queryMedia.staffs && Array.isArray(queryMedia.staffs)) {
          const directors = queryMedia.staffs.filter(s => s.role === 'director' || s.role_name === 'director' || s.role === 'کارگردان' || s.role_name === 'کارگردان');
          if (directors.length > 0) {
            info.director = directors.map(d => d.name || d.string || '').filter(Boolean).join('، ');
          }
          const actors = queryMedia.staffs.filter(s => s.role === 'actor' || s.role_name === 'actor' || s.role === 'بازیگر' || s.role_name === 'بازیگر');
          if (actors.length > 0) {
            info.actors = actors.map(a => a.name || a.string || '').filter(Boolean).slice(0, 8).join('، ');
          }
        }
      }
    }

    // 5. SCHEMA.ORG JSON-LD FALLBACK (For generic semantic schemas - RECURSIVE DEEP MATCHING)
    const matchingSchemas = findSchemasRecursive(ldDataList);
    let mediaLd = matchingSchemas[0];

    if (mediaLd) {
      if (mediaLd.name && (!info.titleFa || ['فیلیمو', 'نماوا', 'فیلم نت', 'فیلم‌نت', ''].includes(info.titleFa))) {
        if (/[\u0600-\u06FF]/.test(mediaLd.name)) {
          info.titleFa = cleanPersianTitle(mediaLd.name);
        } else {
          info.titleEn = mediaLd.name.trim();
        }
      }
      if (mediaLd.description && !info.summary) {
        info.summary = cleanSummary(mediaLd.description);
      }
      if (mediaLd.image && !info.poster) {
        info.poster = typeof mediaLd.image === 'string' ? mediaLd.image : (mediaLd.image.url || '');
      }
      
      if (mediaLd.director && !info.director) {
        const directors = Array.isArray(mediaLd.director) ? mediaLd.director : [mediaLd.director];
        info.director = directors.map(d => d ? d.name : '').filter(Boolean).join('، ');
      }
      
      if (mediaLd.actor && !info.actors) {
        const actors = Array.isArray(mediaLd.actor) ? mediaLd.actor : [mediaLd.actor];
        info.actors = actors.map(a => a ? a.name : '').filter(Boolean).slice(0, 8).join('، ');
      }

      if (mediaLd.genre) {
        info.genres = Array.isArray(mediaLd.genre) ? mediaLd.genre : [mediaLd.genre];
      }

      if (!info.year) {
        const dateField = mediaLd.datePublished || mediaLd.dateCreated || mediaLd.copyrightYear;
        if (dateField) {
          const yearMatch = /(\d{4})/.exec(toEnglishDigits(String(dateField)));
          if (yearMatch) {
            info.year = yearMatch[1];
          }
        }
      }

      if (mediaLd.aggregateRating && mediaLd.aggregateRating.ratingValue && !info.imdbRating) {
        info.imdbRating = String(mediaLd.aggregateRating.ratingValue);
      }

      // Parse countryOfOrigin
      if (mediaLd.countryOfOrigin) {
        const countryObj = mediaLd.countryOfOrigin;
        const countryName = typeof countryObj === 'string' ? countryObj : (countryObj.name || '');
        if (countryName) {
          if (countryName.toLowerCase() === 'ir' || countryName.includes('ایران') || countryName.toLowerCase() === 'iran') {
            info.country = 'ایران';
            info.language = 'فارسی';
          } else {
            info.country = countryName;
          }
        }
      }
    }

    // 6. GENERAL REVERSE REGEX FALLBACKS FOR DIRECTORS/YEARS/CREDITS
    if (!info.director) {
      const dirLinkRegex = /href=["'][^"']*(?:director|tag\?id=director|کارگردان)[^"']*["'][^>]*>([^<]+)<\/a>/gi;
      let dirNames = [];
      let dLinkMatch;
      while ((dLinkMatch = dirLinkRegex.exec(html)) !== null && dirNames.length < 3) {
        const val = dLinkMatch[1].replace(/<[^>]+>/g, '').trim();
        if (val && !dirNames.includes(val) && val.length > 2) dirNames.push(val);
      }
      if (dirNames.length > 0) info.director = dirNames.join('، ');
    }

    if (!info.actors) {
      const actorLinkRegex = /href=["'][^"']*(?:actor|cast|character|tag\?id=actor|بازیگر)[^"']*["'][^>]*>([^<]+)<\/a>/gi;
      let actorNames = [];
      let aLinkMatch;
      while ((aLinkMatch = actorLinkRegex.exec(html)) !== null && actorNames.length < 8) {
        const val = aLinkMatch[1].replace(/<[^>]+>/g, '').trim();
        if (val && !actorNames.includes(val) && val !== 'بازیگران' && val.length > 2) {
          actorNames.push(val);
        }
      }
      if (actorNames.length > 0) info.actors = actorNames.join('، ');
    }

    if (!info.year) {
      const htmlWithEnDigits = toEnglishDigits(html);
      const yearRegexPattern = /(?:سال\s*(?:ساخت|تولید|انتشار|محصول)?|product\s*year|release\s*year|copyrightYear)\s*[:|：]?\s*(13\d{2}|14\d{2}|20\d{2}|19\d{2})/i;
      const yearMatchFromHtml = yearRegexPattern.exec(htmlWithEnDigits);
      if (yearMatchFromHtml) {
        info.year = yearMatchFromHtml[1];
      }
    }

    if (!info.genres || info.genres.length === 0) {
      const genreLinkRegex = /href=["'][^"']*(?:genre|category|ژانر)[^"']*["'][^>]*>([^<]+)<\/a>/gi;
      let genreNames = [];
      let gLinkMatch;
      while ((gLinkMatch = genreLinkRegex.exec(html)) !== null && genreNames.length < 5) {
        const val = gLinkMatch[1].replace(/<[^>]+>/g, '').trim();
        if (val && !genreNames.includes(val) && val.length > 2 && val.length < 15 && val !== 'فیلم' && val !== 'سریال' && val !== 'برنامه') {
          genreNames.push(val);
        }
      }
      if (genreNames.length > 0) info.genres = genreNames;
    }

    // 7. SITE SPECIFIC PARSING (IMDB & SLUG OVERRIDES)
    if (url.includes('imdb.com')) {
      // Set defaults for IMDb - but can be overridden by parser/Gemini
      info.country = 'آمریکا';
      info.language = 'زیرنویس فارسی';

      // Parse NextJS hydration block for IMDb recursively
      if (nextData) {
        parseImdbGraph(nextData);
      }

      let imdbTitle = getMetaContent(html, 'og:title') || (titleMatch ? titleMatch[1] : '');
      if (imdbTitle) {
        imdbTitle = imdbTitle.replace(/\s*-\s*IMDb/gi, '').replace(/\(\d{4}\)/g, '').trim();
        if (/[\u0600-\u06FF]/.test(imdbTitle)) {
          info.titleFa = imdbTitle;
        } else {
          info.titleEn = imdbTitle;
        }
      }

      // Explicit IMDb Title Extraction from H1
      const heroTitleRegex = /<h1[^>]*data-testid=["']hero__pageTitle["'][^>]*>([\s\S]*?)<\/h1>/i;
      const heroTitleMatch = heroTitleRegex.exec(html);
      if (heroTitleMatch) {
        const cleanHeroTitle = heroTitleMatch[1].replace(/<[^>]+>/g, '').trim();
        if (cleanHeroTitle) {
          if (/[\u0600-\u06FF]/.test(cleanHeroTitle)) {
            info.titleFa = cleanHeroTitle;
          } else {
            info.titleEn = cleanHeroTitle;
          }
        }
      }

      // Explicit IMDb release year
      const imdbYearRegex = /href=["'][^"']*(?:\/title\/tt\d+\/releaseinfo|releaseinfo)[^"']*["'][^>]*>(\d{4})<\/a>/i;
      const imdbYearMatch = imdbYearRegex.exec(html);
      if (imdbYearMatch) {
        info.year = imdbYearMatch[1];
      } else {
        const yearMatch = /\/title\/tt\d+\/(\d{4})?/i.exec(url) || /\((\d{4})\)/.exec(html);
        if (yearMatch && !info.year) {
          info.year = yearMatch[1];
        }
      }

      // Explicit IMDb Rating Score
      const ratingBarRegex = /data-testid=["']hero-rating-bar__aggregate-rating__score["'][^>]*>[^]*?<span>([\d\.]+)<\/span>/i;
      const ratingBarMatch = ratingBarRegex.exec(html);
      if (ratingBarMatch) {
         info.imdbRating = ratingBarMatch[1].trim();
      }

      // Explicit IMDb Plot Summary
      const plotXlRegex = /data-testid=["'](?:plot-xl|plot-l)["'][^>]*>([\s\S]*?)<\/span>/i;
      const plotXlMatch = plotXlRegex.exec(html);
      if (plotXlMatch) {
        info.summary = plotXlMatch[1].replace(/<[^>]+>/g, '').trim();
      }

      // Explicit IMDb Poster Image
      const posterContainerRegex = /data-testid=["']hero-media__poster["'][^>]*>[^]*?<img[^]+?src=["'](https:\/\/[^"']+)["']/i;
      const posterContainerMatch = posterContainerRegex.exec(html);
      if (posterContainerMatch) {
        info.poster = posterContainerMatch[1];
      }
    } else {
      if (url.includes('filimo.com')) {
        const enTitleMatch = /"title_en"\s*:\s*"([^"]+)"/i.exec(html) || /"english_title"\s*:\s*"([^"]+)"/i.exec(html) || /english_title.*?["']([^"']+)["']/i.exec(html);
        if (enTitleMatch) {
          info.titleEn = enTitleMatch[1];
        }
      } else if (url.includes('filmnet.ir')) {
        const enTitleMatch = /"english_title"\s*:\s*"([^"]+)"/i.exec(html) || /"englishTitle"\s*:\s*"([^"]+)"/i.exec(html) || /english_title.*?["']([^"']+)["']/i.exec(html);
        if (enTitleMatch) {
          info.titleEn = enTitleMatch[1];
        }
      } else if (url.includes('namava.ir')) {
        const matchSlug = /namava\.ir\/(?:movie|series|play)\/\d+-([a-zA-Z0-9-]+)/i.exec(url);
        if (matchSlug) {
          info.titleEn = matchSlug[1].replace(/-/g, ' ').toUpperCase();
        }
      }
    }

    // Infer English title from URL slug if empty
    if (!info.titleEn) {
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || '';
      const cleanSlug = lastPart.replace(/-/g, ' ').replace(/\d+/g, '').replace(/[\u0600-\u06FF]+/g, '').trim();
      if (/^[a-zA-Z\s]+$/.test(cleanSlug) && cleanSlug.length > 3) {
        info.titleEn = cleanSlug.toUpperCase();
      }
    }

    // Convert genres matching English names to Persian
    if (info.genres && info.genres.length > 0) {
      const genreMap = {
        'Drama': 'درام',
        'Comedy': 'کمدی',
        'Action': 'اکشن',
        'Sci-Fi': 'علمی تخیلی',
        'Horror': 'ترسناک',
        'Thriller': 'هیجان انگیز',
        'Documentary': 'مستند',
        'Family': 'خانوادگی',
        'Crime': 'جنایی',
        'Mystery': 'معمایی',
        'Romance': 'عاشقانه',
        'History': 'تاریخی',
        'Biography': 'بیوگرافی',
        'Adventure': 'ماجراجویی',
        'Animation': 'انیمیشن',
        'War': 'جنگی',
        'Western': 'وسترن',
        'Musical': 'موزیکال',
        'Sport': 'ورزشی',
        'Fantasy': 'فانتزی'
      };
      info.genres = info.genres.map(g => genreMap[g] || g);
    }
    
    // Final Polish to guarantee we NEVER return just site name as the movie name
    if (['فیلیمو', 'نماوا', 'فیلم نت', 'فیلم‌نت', 'نام سایت', ''].includes(info.titleFa)) {
      const altTitle = getMetaContent(html, 'twitter:text:title') || getMetaContent(html, 'og:site_name');
      const filteredAlt = cleanPersianTitle(altTitle);
      if (filteredAlt && !['فیلیمو', 'نماوا', 'فیلم نت', 'فیلم‌نت', ''].includes(filteredAlt)) {
        info.titleFa = filteredAlt;
      } else {
        const parts = decodeURIComponent(url).split('/');
        const lastPart = parts[parts.length - 1] || parts[parts.length - 2] || '';
        const cleanSlug = lastPart.replace(/-/g, ' ').replace(/\d+/g, '').trim();
        if (cleanSlug && cleanSlug.length > 2) {
          info.titleFa = cleanSlug;
        }
      }
    }

    // Fill in default poster if empty
    if (!info.poster) {
      info.poster = `https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=600&auto=format&fit=crop`;
    }
  } catch (err) {
    console.error('Error parsing scraping details:', err);
  }

  return info;
}

// Request Gemini to enrich metadata based on IMDb ID to guarantee full, perfectly translated content
async function getMetadataFromGemini(imdbId, roughTitle) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const prompt = `You are an expert movie and series metadata extractor. Extract and fetch the completed details for the movie or series with IMDb ID: "${imdbId}" (Title context: "${roughTitle}").
You MUST return the output ONLY as a valid JSON object. Do not include any HTML markdown wrappers like \`\`\`json or explanation sentences, return pure JSON text directly. All translation fields should be written in natural, fluent Persian (Farsi) of a professional cinephile caliber.

Your JSON MUST contain exactly these keys:
{
  "titleFa": "نام دقیق فارسی اثر یا ترجمه آن (مثل: سقوط یا شوالیه تاریکی یا ماتریکس)",
  "titleEn": "Original English Title",
  "summary": "یک خلاصه داستان فوق‌العاده دیدنی، پرکشش و حرفه ای به زبان فارسی بدون جملات تبلیغاتی",
  "year": "سال ساخت میلادی به صورت یک عدد 4 رقمی انگلیسی، مثلا 2023",
  "genres": ["نام فارسی ژانرها بدون حشو، مثلا: اکشن, درام, هیجان انگیز, جنایی"],
  "director": "نام کارگردان یا کارگردان‌ها به فارسی (جدا شده با کامای فارسی)",
  "writer": "نام نویسنده یا نویسنده‌ها به فارسی (جدا شده با کامای فارسی)",
  "actors": "نام 4 الی 8 بازیگر اصلی با تفکیک کامای فارسی (مثلا: حمید فرخ نژاد، الناز ملک، عباس جمشیدی فر)",
  "country": "نام دقیق کشور سازنده به فارسی (مثلا: ایران یا آمریکا یا فرانسه یا کره شمالی)",
  "language": "زبان اصلی اثر به فارسی (مثلا: فارسی یا انگلیسی یا زیرنویس فارسی یا دوبله فارسی)",
  "imdbRating": "امتیاز دقیق IMDb مانند 8.4",
  "duration": "مدت زمان فیلم به فارسی (مثلاً 115 دقیقه) یا در صورت سریال مدت زمان تقریبی هر قسمت (مثلا هر قسمت 45 دقیقه)",
  "category": "فیلم" (یا "سریال" - بسته به نوع این اثر),
  "batchSeasonsCount": 1 (در صورتی که سریال است تعداد کل فصل ها به صورت عدد، در غیر اینصورت عدد 1)
}`;

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini exchange failed with status ${response.status}`);
    }

    const resJson = await response.json();
    const text = resJson.candidates[0].content.parts[0].text;
    const cleanJsonText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJsonText);
  } catch (err) {
    console.error('Gemini metadata extractor Error:', err);
    return null;
  }
}

ipcMain.handle('fetch-url-data', async (event, url, options = {}) => {
  try {
    if (!url) return { success: false, error: 'آدرس اینترنتی معتبری وارد نشده است.' };
    
    // Quick validation
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const controller = new AbortController();
    const timeoutVal = options && options.timeout ? options.timeout : 12000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutVal);

    let response;
    try {
      response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'fa-IR,fa;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`خطای ارتباط با سرور سایت مرجع: مرجع وضعیت ${response.status} بازگرداند.`);
    }

    // Check if it's a LAN API request from the same software (bound on port 3300 or containing api/lan)
    if (url.includes(':3300') || url.includes('/api/lan/')) {
      const responseText = await response.text();
      return { success: true, data: responseText };
    }

    const html = await response.text();
    let info = extractMediaInfo(html, url);

    // AI GEMINI METADATA ENHANCEMENT OR FALLBACK
    // If we have an IMDb url or any system that can extract an IMDb ID and GEMINI_API_KEY is configured
    if (url.includes('imdb.com') && process.env.GEMINI_API_KEY) {
      try {
        const imdbIdMatch = /\/title\/(tt\d+)/i.exec(url);
        const imdbId = imdbIdMatch ? imdbIdMatch[1] : '';
        if (imdbId) {
          const geminiInfo = await getMetadataFromGemini(imdbId, info.titleEn || info.titleFa || 'tt14471602');
          if (geminiInfo) {
            // Merge Gemini results nicely, preferring Gemini's rich translations
            if (geminiInfo.titleFa) info.titleFa = geminiInfo.titleFa;
            if (geminiInfo.titleEn) info.titleEn = geminiInfo.titleEn;
            if (geminiInfo.summary) info.summary = geminiInfo.summary;
            if (geminiInfo.year) info.year = geminiInfo.year;
            if (geminiInfo.director) info.director = geminiInfo.director;
            if (geminiInfo.writer) info.writer = geminiInfo.writer;
            if (geminiInfo.actors) info.actors = geminiInfo.actors;
            if (geminiInfo.country) info.country = geminiInfo.country;
            if (geminiInfo.language) info.language = geminiInfo.language;
            if (geminiInfo.imdbRating) info.imdbRating = geminiInfo.imdbRating;
            if (geminiInfo.duration) info.duration = geminiInfo.duration;
            if (geminiInfo.genres && geminiInfo.genres.length > 0) info.genres = geminiInfo.genres;
            
            // Adjust categories and series count if specified
            if (geminiInfo.batchSeasonsCount) {
               info.batchSeasonsCount = geminiInfo.batchSeasonsCount;
               info.batchEpisodesForSeason = Array(geminiInfo.batchSeasonsCount).fill(10);
            }
          }
        }
      } catch (gemIniErr) {
        console.error('Failed to enhance with Gemini metadata:', gemIniErr);
      }
    }

    return { success: true, data: info };
  } catch (err) {
    console.error('Scraping handler error:', err);
    return { success: false, error: err.message };
  }
});

// Download and Save poster locally in the designated folder path
ipcMain.handle('save-poster-local', async (event, imageUrl, destFolder, filename) => {
  try {
    if (!imageUrl || !destFolder) {
      return { success: false, error: 'آدرس تصویر یا مسیر فایل خالی است.' };
    }

    // Clean destination directory
    let targetDir = destFolder.trim();
    if (fs.existsSync(targetDir)) {
      const stats = fs.statSync(targetDir);
      if (stats.isFile()) {
        targetDir = path.dirname(targetDir);
      }
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const extension = path.extname(imageUrl.split('?')[0]) || '.jpg';
    const finalFilename = (filename || 'poster') + extension;
    const finalFullPath = path.join(targetDir, finalFilename);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`شکست در دانلود عکس: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(finalFullPath, buffer);
    console.log(`Poster downloaded and saved to: ${finalFullPath}`);
    return { success: true, savedPath: finalFullPath };
  } catch (err) {
    console.error('Error saving local poster:', err);
    return { success: false, error: err.message };
  }
});

// Desktop Widget Window launcher
function createWidgetWindow() {
  if (widgetWindow) {
    widgetWindow.focus();
    return;
  }

  let iconPath = path.join(__dirname, '../assets/icon.png');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(process.resourcesPath, 'assets/icon.png');
  }
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(app.getAppPath(), 'assets/icon.png');
  }

  let widgetIcon = undefined;
  if (fs.existsSync(iconPath)) {
    try {
      widgetIcon = nativeImage.createFromPath(iconPath);
    } catch (e) {
      console.error('Failed to load widget icon via nativeImage:', e);
    }
  }

  widgetWindow = new BrowserWindow({
    width: 330,
    height: 490,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: widgetIcon,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  widgetWindow.setMenuBarVisibility(false);

  // Position it in bottom right corner of the user's primary display
  try {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    widgetWindow.setBounds({
      x: width - 350,
      y: height - 510,
      width: 330,
      height: 490
    });
  } catch (err) {
    console.error('Failed to get screen boundary for widget:', err);
  }

  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    widgetWindow.loadURL('http://localhost:3050/#widget');
  } else {
    widgetWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}#widget`);
  }

  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });
}

// System Tray creator
function createTray() {
  ensureIconExists();

  let iconPath = path.join(__dirname, '../assets/icon.png');
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(process.resourcesPath, 'assets/icon.png');
  }
  if (!fs.existsSync(iconPath)) {
    iconPath = path.join(app.getAppPath(), 'assets/icon.png');
  }

  let trayIcon;
  if (fs.existsSync(iconPath)) {
    try {
      trayIcon = nativeImage.createFromPath(iconPath);
    } catch (e) {
      console.error('Failed to load tray icon via nativeImage:', e);
    }
  } else {
    try {
      const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAACXBIWXMAABYlAAAWJQFJUiTwAAAC70lEQVRYR8WWT0gUYRjGf7O77qrrurv+qa6uu6GlYZZhhgVhdBAq6NBBOnXo0Cno0Cno0ClE6NChU4fO0S09WFiEERFhdMvUNV3X3V39reuvu7M70/eNLbNuuus66M6Hh2He98fvvO/7PT+S67punmN92lVjV0Y/N4C6WpI6A0iE0D1C6F8pDoB4CI4QSkSgXpXigNgeofZIdS7FAeI+mD1CPUTYQz9W4kBiH9A9Vf88xSFSf0Y9Ctw8xSGe6YtZg8g2YXs95O8T9NlVf4LgE6n2I9sB/v2oT6g2YHsN9REoDgg+keoxYBtAn4/m76v+JMUnUnUu1F2gT666G+h/4mVA/8tTDbBGYLqO7C9BDo86DuA/o8qHsgvAnVfUQbyDehfwHj67h+3I/XgHED6mNQHwOfUHQgXgdUj8D4BvYfIP8F/Duo/mUvI/b3gY7iM4Nn8T9g8fIeA3rG2DHgU6G+F+oXMN8Hag3UDyA+gPoRxEdIpxHeRNiBeD/6NMD4GzD/COovUD8TzbyrT6R6AnQStfIUrZ7I9X5bX9pXgDoH9XmGcxS/DORC6N/AtGf080Anqf4C+Z7S2xZgYsh2KDuE6rcoPYX6Hsw0mC9A/ULx5VgnZ9k3yv5C7R/gvyv9Lco/wHypsN8K/2mNf1H+d+U/gPrUshN0BvRZw3pG7xn6W6GfF/YLa5Y9A/r0sntGP0HpHKizsPrssE8H+2zZp4f1l1Z/ZfVJgN4H43WpP0fxeRifj+ovofos9BeL9UWD9VqD9TqH9dqY9dqS9dqL9XoL0730ehp/F+rdE9brefzdg/X6Bv+WUHwT+rcG/zZQ/A7K8S3onvXF9/v1f9/Bv98P7w/m9oDZDf005mG+S7v9k6L3Yf1e56m/lGqvpNo7qfar0r1R9kFf/99Uex9pC8T8gZz6w6gHifUgp34oPkhsANgYpD6M9BBUHya/EfoQqL6k7INofUTYfUnZByH8ofUHYfdh6WGo3g/h92Hp/Sg9hNoHqfUgtB6ktv6v+gGzU+u3u4N6CgAAAABJRU5ErkJggg==';
      trayIcon = nativeImage.createFromBuffer(Buffer.from(base64Png, 'base64'));
    } catch (e) {
      console.error('Failed to create nativeImage fallback for trayicon:', e);
    }
  }

  if (trayIcon) {
    try {
      tray = new Tray(trayIcon);
      const contextMenu = Menu.buildFromTemplate([
        { 
          label: 'نمایش برنامه اصلی', 
          click: () => {
            if (mainWindow) {
              mainWindow.show();
              mainWindow.focus();
            }
          } 
        },
        { 
          label: 'باز کردن گجت دسکتاپ فیلم و سریال', 
          click: () => {
            createWidgetWindow();
          } 
        },
        { type: 'separator' },
        { 
          label: 'خروج کامل از برنامه', 
          click: () => {
            app.isQuiting = true;
            app.quit();
          } 
        }
      ]);
      
      tray.setToolTip('مدیریت آرشیو فیلم و سریال پارس تک');
      tray.setContextMenu(contextMenu);
      
      tray.on('double-click', () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      });
    } catch (e) {
      console.error('Failed to create system tray:', e);
    }
  } else {
    console.warn('Tray icon could not be loaded or generated.');
  }
}

// Widget & quit IPC handles
ipcMain.handle('open-desktop-widget', () => {
  createWidgetWindow();
  return true;
});

ipcMain.handle('close-desktop-widget', () => {
  if (widgetWindow) {
    widgetWindow.close();
    return true;
  }
  return false;
});

ipcMain.handle('show-main-window', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return true;
  }
  return false;
});

ipcMain.handle('quit-app', () => {
  app.isQuiting = true;
  app.quit();
});

// ==========================================
// LAN SYNC & SHARE SERVICES
// ==========================================
const os = require('os');
const http = require('http');

let lanServer = null;
const LAN_PORT = 3300;

// Query helpers for LAN media list
const queryAllMovies = () => {
  return new Promise((resolve) => {
    if (!sqliteDb) return resolve([]);
    try {
      const rows = sqliteDb.prepare('SELECT * FROM movies').all();
      resolve(rows.map(r => {
        try {
          return {
            ...r,
            genres: JSON.parse(r.genres || '[]')
          };
        } catch(e) {
          return r;
        }
      }));
    } catch (err) {
      resolve([]);
    }
  });
};

const queryAllSeries = () => {
  return new Promise((resolve) => {
    if (!sqliteDb) return resolve([]);
    try {
      const rows = sqliteDb.prepare('SELECT * FROM series').all();
      resolve(rows.map(r => {
        try {
          return {
            ...r,
            genres: JSON.parse(r.genres || '[]'),
            seasons: JSON.parse(r.seasons || '[]')
          };
        } catch(e) {
          return r;
        }
      }));
    } catch (err) {
      resolve([]);
    }
  });
};

// Retrieve media catalog from DB or JSON file fallback
const checkLanEnabledBySql = () => {
  return new Promise((resolve) => {
    if (!sqliteDb) {
      try {
        const dbPath = getDbPath();
        if (fs.existsSync(dbPath)) {
          const data = fs.readFileSync(dbPath, 'utf8');
          const parsed = JSON.parse(data || '{}');
          if (parsed.settings && parsed.settings.lanEnabled === false) {
             return resolve(false);
          }
        }
      } catch (ex) {}
      return resolve(true);
    }
    try {
      const row = sqliteDb.prepare("SELECT value FROM settings WHERE key = 'lanEnabled'").get();
      if (!row) {
        resolve(true);
        return;
      }
      try {
        resolve(JSON.parse(row.value) !== false);
      } catch (e) {
        resolve(row.value !== 'false');
      }
    } catch (err) {
      resolve(true);
    }
  });
};

const getMediaCatalog = async () => {
  let movies = [];
  let series = [];
  if (isSqliteInitialized && sqliteDb) {
    movies = await queryAllMovies();
    series = await queryAllSeries();
  } else {
    try {
      const dbPath = getDbPath();
      if (fs.existsSync(dbPath)) {
        const data = fs.readFileSync(dbPath, 'utf8');
        const parsed = JSON.parse(data || '{}');
        movies = parsed.movies || [];
        series = parsed.series || [];
      }
    } catch (err) {
      console.error('LAN Server Error getting fallback: ', err);
    }
  }
  
  // Filter out any imported network peer movies/series so we only share true LOCAL media
  const filteredMovies = movies.filter(m => !m.isPeerMedia && !m.originPeerIp);
  const filteredSeries = series.filter(s => !s.isPeerMedia && !s.originPeerIp);
  return { movies: filteredMovies, series: filteredSeries };
};

// Start LAN API Server
function startLanServer() {
  if (lanServer) return;
  lanServer = http.createServer(async (req, res) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }
      
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const pathname = parsedUrl.pathname;
      
      if (pathname === '/api/lan/status') {
        const lanActive = await checkLanEnabledBySql();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          appName: 'MyMovie MediaCenter LAN Node',
          hostname: os.hostname(),
          time: new Date().toISOString(),
          lanActive: lanActive
        }));
        return;
      }
      
      if (pathname === '/api/lan/catalog') {
        const lanActive = await checkLanEnabledBySql();
        if (!lanActive) {
          res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            success: false,
            error: 'سرویس اشتراک‌گذاری شبکه محلی روی سیستم همکار خاموش (غیرفعال) است.'
          }));
          return;
        }
        const catalog = await getMediaCatalog();
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          success: true,
          movies: catalog.movies,
          series: catalog.series
        }));
        return;
      }
      
      if (pathname === '/api/lan/poster') {
        const lanActive = await checkLanEnabledBySql();
        if (!lanActive) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('سرویس اشتراک‌گذاری در شبکه محلی غیرفعال است.');
          return;
        }
        const imgPath = parsedUrl.searchParams.get('path');
        if (!imgPath || !fs.existsSync(imgPath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('تصویر یافت نشد.');
          return;
        }
        const ext = path.extname(imgPath).toLowerCase();
        let contentType = 'image/jpeg';
        if (ext === '.png') contentType = 'image/png';
        else if (ext === '.webp') contentType = 'image/webp';
        
        try {
          const stat = fs.statSync(imgPath);
          res.writeHead(200, {
            'Content-Type': contentType,
            'Content-Length': stat.size
          });
          const stream = fs.createReadStream(imgPath);
          stream.pipe(res);
        } catch (e) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error serving image: ' + e.message);
        }
        return;
      }
      
      if (pathname === '/api/lan/download') {
        const lanActive = await checkLanEnabledBySql();
        if (!lanActive) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('سرویس اشتراک‌گذاری در شبکه محلی غیرفعال است.');
          return;
        }
        const filePath = parsedUrl.searchParams.get('path');
        if (!filePath || !fs.existsSync(filePath)) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('فایل مورد نظر یافت نشد.');
          return;
        }
        
        const stat = fs.statSync(filePath);
        res.writeHead(200, {
          'Content-Type': 'application/octet-stream',
          'Content-Length': stat.size,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(path.basename(filePath))}"`
        });
        
        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
        return;
      }
      
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (err) {
      console.error('LAN Server Error:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error: ' + err.message);
    }
  });

  lanServer.on('error', (e) => {
    console.error('LAN Server Listen Error:', e);
  });

  lanServer.listen(LAN_PORT, '0.0.0.0', () => {
    console.log(`LAN Server running on port ${LAN_PORT}`);
  });
}

// IPC handles for IP retrieval
ipcMain.handle('get-local-ips', async () => {
  try {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const interfaceName in interfaces) {
      const iface = interfaces[interfaceName];
      for (const entry of iface) {
        if (entry.family === 'IPv4' && !entry.internal) {
          ips.push(entry.address);
        }
      }
    }
    return ips;
  } catch (err) {
    return [];
  }
});

// IPC handle for Downloading/Copying LAN Files
ipcMain.handle('download-lan-file', async (event, url, destPath) => {
  return new Promise((resolve) => {
    const httpLib = url.startsWith('https') ? require('https') : require('http');
    
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      try {
        fs.mkdirSync(destDir, { recursive: true });
      } catch (e) {
        return resolve({ success: false, error: 'خطا در ایجاد پوشه مقصد: ' + e.message });
      }
    }
    
    const writeStream = fs.createWriteStream(destPath);
    
    let totalBytes = 0;
    let bytesWritten = 0;
    let startTime = Date.now();
    let lastProgressTime = Date.now();
    let bytesInInterval = 0;
    
    const request = httpLib.get(url, (response) => {
      if (response.statusCode !== 200) {
        writeStream.close();
        try { fs.unlinkSync(destPath); } catch (e) {}
        return resolve({ success: false, error: `کد خطای سرور: ${response.statusCode}` });
      }
      
      totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      
      response.on('data', (chunk) => {
        bytesWritten += chunk.length;
        bytesInInterval += chunk.length;
        
        const now = Date.now();
        if (now - lastProgressTime > 250) {
          const timeElapsedSec = (now - startTime) / 1000;
          const totalSpeedMBs = timeElapsedSec > 0 ? (bytesWritten / (1024 * 1024)) / timeElapsedSec : 0;
          const intervalSpeedMBs = (bytesInInterval / (1024 * 1024)) / ((now - lastProgressTime) / 1000);
          
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('download-progress', {
              progress: totalBytes > 0 ? Math.round((bytesWritten / totalBytes) * 100) : 0,
              bytesWritten,
              totalBytes,
              speedMbs: totalSpeedMBs,
              currentSpeedMbs: intervalSpeedMBs,
              timeElapsed: timeElapsedSec
            });
          }
          
          lastProgressTime = now;
          bytesInInterval = 0;
        }
      });
      
      response.pipe(writeStream);
      
      writeStream.on('finish', () => {
        writeStream.close();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download-progress', {
            progress: 100,
            bytesWritten,
            totalBytes,
            speedMbs: totalBytes > 0 ? (bytesWritten / (1024 * 1024)) / ((Date.now() - startTime) / 1000) : 0,
            currentSpeedMbs: 0,
            timeElapsed: (Date.now() - startTime) / 1000,
            completed: true
          });
        }
        resolve({ success: true });
      });
    });
    
    request.on('error', (err) => {
      writeStream.close();
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch(ex) {}
      }
      resolve({ success: false, error: err.message });
    });
    
    writeStream.on('error', (err) => {
      request.destroy();
      writeStream.close();
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch(ex) {}
      }
      resolve({ success: false, error: err.message });
    });
  });
});

// Active copy streams map for cancellation support
const activeCopyStreams = new Map();

// IPC handle for canceling an ongoing file copy
ipcMain.handle('cancel-copy', async (event, id) => {
  const active = activeCopyStreams.get(id);
  if (active) {
    try {
      active.readStream.destroy();
      active.writeStream.destroy();
      activeCopyStreams.delete(id);
      
      // Allow some milliseconds for the file handles to release
      setTimeout(() => {
        if (fs.existsSync(active.destPath)) {
          try { fs.unlinkSync(active.destPath); } catch (ex) {}
        }
      }, 150);
      
      console.log(`Successfully canceled copying for ID: ${id}`);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
  return { success: false, error: 'عملیات کپی فعالی برای این شناسه یافت نشد.' };
});

// IPC handle for Copying Media File to USB Flash/HDD Drive with real progress
ipcMain.handle('copy-file-to-usb', async (event, { sourcePath, destDir, id, customRelativePath }) => {
  return new Promise((resolve) => {
    try {
      if (!sourcePath || !fs.existsSync(sourcePath)) {
        return resolve({ success: false, error: 'فایل منبع روی هارد دیسک یافت نشد. لطفاً مسیر فایل را بررسی کنید.' });
      }

      const stat = fs.statSync(sourcePath);
      if (stat.isDirectory()) {
        return resolve({ success: false, error: 'مسیر انتخاب شده یک پوشه است، کپی مستقیم فایل الزامی است.' });
      }

      let destPath;
      if (customRelativePath) {
        destPath = path.join(destDir, customRelativePath);
        const containingDir = path.dirname(destPath);
        if (!fs.existsSync(containingDir)) {
          try {
            fs.mkdirSync(containingDir, { recursive: true });
          } catch (e) {
            return resolve({ success: false, error: 'خطا در ایجاد پوشه زیرمجموعه مقصد روی فلش: ' + e.message });
          }
        }
      } else {
        if (!fs.existsSync(destDir)) {
          try {
            fs.mkdirSync(destDir, { recursive: true });
          } catch (e) {
            return resolve({ success: false, error: 'خطا در ایجاد پوشه مقصد روی فلش: ' + e.message });
          }
        }
        const filename = path.basename(sourcePath);
        destPath = path.join(destDir, filename);
      }

      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(destPath);

      // Register active streams for cancel support
      activeCopyStreams.set(id, { readStream, writeStream, destPath });

      const totalBytes = stat.size;
      let bytesCopied = 0;
      let startTime = Date.now();
      let lastProgressTime = Date.now();
      let bytesInInterval = 0;

      readStream.on('data', (chunk) => {
        bytesCopied += chunk.length;
        bytesInInterval += chunk.length;

        const now = Date.now();
        if (now - lastProgressTime > 200) {
          const timeElapsedSec = (now - startTime) / 1000;
          const speedMbs = timeElapsedSec > 0 ? (bytesCopied / (1024 * 1024)) / timeElapsedSec : 0;

          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('copy-progress', {
              id,
              progress: totalBytes > 0 ? Math.round((bytesCopied / totalBytes) * 100) : 0,
              bytesCopied,
              totalBytes,
              speedMbs,
              completed: false
            });
          }

          lastProgressTime = now;
          bytesInInterval = 0;
        }
      });

      readStream.pipe(writeStream);

      writeStream.on('finish', () => {
        writeStream.close();
        activeCopyStreams.delete(id);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('copy-progress', {
            id,
            progress: 100,
            bytesCopied,
            totalBytes,
            speedMbs: totalBytes > 0 ? (bytesCopied / (1024 * 1024)) / ((Date.now() - startTime) / 1000) : 0,
            completed: true
          });
        }
        resolve({ success: true, destPath });
      });

      readStream.on('error', (err) => {
        writeStream.close();
        activeCopyStreams.delete(id);
        if (fs.existsSync(destPath)) {
          try { fs.unlinkSync(destPath); } catch (ex) {}
        }
        resolve({ success: false, error: 'خطا در خواندن فایل منبع: ' + err.message });
      });

      writeStream.on('error', (err) => {
        readStream.destroy();
        writeStream.close();
        activeCopyStreams.delete(id);
        if (fs.existsSync(destPath)) {
          try { fs.unlinkSync(destPath); } catch (ex) {}
        }
        resolve({ success: false, error: 'خطا در نوشتن روی فلش دیسک: ' + err.message });
      });

    } catch (err) {
      resolve({ success: false, error: 'خطای سیستمی کپی فایل: ' + err.message });
    }
  });
});

// IPC handle for saving invoice image to USB
ipcMain.handle('save-invoice-image', async (event, { destDir, base64Data, filename }) => {
  try {
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const destPath = path.join(destDir, filename);
    const data = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(destPath, buffer);
    return { success: true, destPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Find matching subtitles automatically in the same directory as a video file
ipcMain.handle('find-matching-subtitles', async (event, videoPath) => {
  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      return { success: false, error: 'مسیر ویدیو نامعتبر است یا وجود ندارد.' };
    }
    const folder = path.dirname(videoPath);
    const baseName = path.basename(videoPath, path.extname(videoPath)).toLowerCase();
    const entries = fs.readdirSync(folder);
    const subExtensions = ['.srt', '.vtt', '.sub', '.ass'];
    const matchingSubs = [];
    
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (subExtensions.includes(ext)) {
        const entryBase = path.basename(entry, ext).toLowerCase();
        if (entryBase.startsWith(baseName) || baseName.startsWith(entryBase) || entryBase.includes(baseName)) {
          matchingSubs.push(path.join(folder, entry));
        }
      }
    }
    return { success: true, subtitles: matchingSubs };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Export SQLite Database to external folder
ipcMain.handle('export-sqlite-db', async (event, destPath) => {
  try {
    const srcPath = getSqliteDbPath();
    if (!fs.existsSync(srcPath)) {
      return { success: false, error: 'پایگاه داده یافت نشد.' };
    }
    fs.copyFileSync(srcPath, destPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Import SQLite Database from backup file
ipcMain.handle('import-sqlite-db', async (event, srcPath) => {
  try {
    if (!fs.existsSync(srcPath)) {
      return { success: false, error: 'فایل منبع یافت نشد.' };
    }
    const destPath = getSqliteDbPath();
    if (sqliteDb) {
      sqliteDb.close();
      sqliteDb = null;
    }
    fs.copyFileSync(srcPath, destPath);
    
    // Re-initialize connection
    const Database = require('better-sqlite3');
    sqliteDb = new Database(destPath, { fileMustExist: false });
    createTables();
    isSqliteInitialized = true;
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Read local text file (e.g. subtitle files)
ipcMain.handle('read-text-file', async (event, filepath) => {
  try {
    if (!filepath || !fs.existsSync(filepath)) {
      return { success: false, error: 'فایل وجود ندارد یا مسیر نامعتبر است.' };
    }
    const content = fs.readFileSync(filepath, 'utf8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.whenReady().then(() => {
  initSqlite();
  createWindow();
  createTray();
  
  try {
    startLanServer();
  } catch (err) {
    console.error('Failed to start LAN sharing server:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
