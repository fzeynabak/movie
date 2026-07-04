const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  openFileInExplorer: (filepath, originPeerIp) => ipcRenderer.invoke('open-file-in-explorer', filepath, originPeerIp),
  playVideoFile: (filepath, originPeerIp) => ipcRenderer.invoke('play-video-file', filepath, originPeerIp),
  openFolderDirectory: (dirpath, originPeerIp) => ipcRenderer.invoke('open-folder-directory', dirpath, originPeerIp),
  selectFile: (filters) => ipcRenderer.invoke('select-file', filters),
  selectPoster: () => ipcRenderer.invoke('select-poster'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  readDbFile: () => ipcRenderer.invoke('read-db-file'),
  writeDbFile: (fullData) => ipcRenderer.invoke('write-db-file', fullData),
  getDbFilePath: () => ipcRenderer.invoke('get-db-file-path'),
  setSqliteDbPath: (newPath) => ipcRenderer.invoke('set-sqlite-db-path', newPath),
  runSql: (sql, params) => ipcRenderer.invoke('run-sql', sql, params),
  isSqliteAvailable: () => ipcRenderer.invoke('is-sqlite-available'),
  fetchUrlData: (url) => ipcRenderer.invoke('fetch-url-data', url),
  savePosterLocal: (imageUrl, destFolder, filename) => ipcRenderer.invoke('save-poster-local', imageUrl, destFolder, filename),
  openDesktopWidget: () => ipcRenderer.invoke('open-desktop-widget'),
  closeDesktopWidget: () => ipcRenderer.invoke('close-desktop-widget'),
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
  existsFile: (filepath) => ipcRenderer.invoke('exists-file', filepath),
  renameFile: (oldPath, newPath) => ipcRenderer.invoke('rename-file', oldPath, newPath),
  resolveVideoPath: (basePathWithoutExt) => ipcRenderer.invoke('resolve-video-path', basePathWithoutExt),
  scanSeriesDirectory: (dirpath) => ipcRenderer.invoke('scan-series-directory', dirpath),
  scanMediaDirectory: (dirpath) => ipcRenderer.invoke('scan-media-directory', dirpath),
  getLocalIps: () => ipcRenderer.invoke('get-local-ips'),
  downloadLanFile: (url, destPath) => ipcRenderer.invoke('download-lan-file', url, destPath),
  copyFileToUsb: (sourcePath, destDir, id, customRelativePath) => ipcRenderer.invoke('copy-file-to-usb', { sourcePath, destDir, id, customRelativePath }),
  cancelCopy: (id) => ipcRenderer.invoke('cancel-copy', id),
  saveInvoiceImage: (destDir, base64Data, filename) => ipcRenderer.invoke('save-invoice-image', { destDir, base64Data, filename }),
  findMatchingSubtitles: (videoPath) => ipcRenderer.invoke('find-matching-subtitles', videoPath),
  readTextFile: (filepath) => ipcRenderer.invoke('read-text-file', filepath),
  exportSqliteDb: (destPath) => ipcRenderer.invoke('export-sqlite-db', destPath),
  importSqliteDb: (srcPath) => ipcRenderer.invoke('import-sqlite-db', srcPath),
  onCopyProgress: (callback) => {
    ipcRenderer.removeAllListeners('copy-progress');
    ipcRenderer.on('copy-progress', (event, data) => callback(data));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.removeAllListeners('download-progress');
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  }
});
