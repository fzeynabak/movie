const { parentPort, workerData } = require('worker_threads');
const fs = require('fs');
const path = require('path');

const { sourcePath, destPath, id, bufferSize = 4 * 1024 * 1024 } = workerData;

let isPaused = false;
let isCancelled = false;

// Log helper to send logs back to main process
function log(msg) {
  parentPort.postMessage({ type: 'log', data: { id, message: msg } });
}

parentPort.on('message', (msg) => {
  if (msg.type === 'pause') {
    isPaused = true;
    log('Copy operations paused by user request.');
  } else if (msg.type === 'resume') {
    isPaused = false;
    log('Copy operations resumed by user request.');
  } else if (msg.type === 'cancel') {
    isCancelled = true;
    log('Copy operations cancelled by user request.');
  }
});

async function startCopy() {
  let fdSrc = null;
  let fdDest = null;
  try {
    log(`Starting copy operation. Source: "${sourcePath}" -> Destination: "${destPath}"`);
    
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`فایل منبع یافت نشد: ${sourcePath}`);
    }

    const stat = fs.statSync(sourcePath);
    const totalBytes = stat.size;
    
    // Ensure the destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // Open source for reading, destination for writing
    fdSrc = fs.openSync(sourcePath, 'r');
    fdDest = fs.openSync(destPath, 'w');

    // Buffer allocation (4MB optimized size)
    const buffer = Buffer.alloc(bufferSize);
    let bytesCopied = 0;
    
    let startTime = Date.now();
    let lastProgressTime = Date.now();
    let bytesCopiedInInterval = 0;
    
    // Sliding window of past interval speeds for moving average
    const speedWindow = [];
    const maxWindowSize = 5; // smooths speed over 1 second (200ms intervals)

    log(`Buffer allocated: ${bufferSize / (1024 * 1024)}MB. Total file size: ${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`);

    while (bytesCopied < totalBytes && !isCancelled) {
      if (isPaused) {
        // Yield to prevent CPU thrashing
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        // Reset speed tracking timer during pause to prevent spikes upon resume
        lastProgressTime = Date.now();
        bytesCopiedInInterval = 0;
        
        parentPort.postMessage({
          type: 'progress',
          data: {
            id,
            progress: totalBytes > 0 ? Math.round((bytesCopied / totalBytes) * 100) : 0,
            bytesCopied,
            totalBytes,
            speedMbs: 0,
            paused: true,
            completed: false
          }
        });
        continue;
      }

      // Read a chunk from the source
      const bytesRead = fs.readSync(fdSrc, buffer, 0, bufferSize, bytesCopied);
      if (bytesRead === 0) break;

      // Write the chunk to the destination
      fs.writeSync(fdDest, buffer, 0, bytesRead, bytesCopied);
      bytesCopied += bytesRead;
      bytesCopiedInInterval += bytesRead;

      const now = Date.now();
      const elapsed = now - lastProgressTime;

      // Throttle progress events to every 200ms
      if (elapsed >= 200) {
        const instantSpeedMbs = (bytesCopiedInInterval / (1024 * 1024)) / (elapsed / 1000);
        
        // Push and manage speed window
        speedWindow.push(instantSpeedMbs);
        if (speedWindow.length > maxWindowSize) {
          speedWindow.shift();
        }
        
        // Compute average of sliding window
        const avgSpeedMbs = speedWindow.reduce((sum, speed) => sum + speed, 0) / speedWindow.length;
        
        parentPort.postMessage({
          type: 'progress',
          data: {
            id,
            progress: totalBytes > 0 ? Math.round((bytesCopied / totalBytes) * 100) : 0,
            bytesCopied,
            totalBytes,
            speedMbs: avgSpeedMbs,
            paused: false,
            completed: false
          }
        });

        lastProgressTime = now;
        bytesCopiedInInterval = 0;
      }
    }

    // Clean up file handles
    if (fdSrc !== null) {
      fs.closeSync(fdSrc);
      fdSrc = null;
    }
    if (fdDest !== null) {
      fs.closeSync(fdDest);
      fdDest = null;
    }

    if (isCancelled) {
      log('Cleanup cancelled file.');
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch (e) {}
      }
      parentPort.postMessage({ type: 'cancelled', data: { id } });
    } else {
      const finalDuration = (Date.now() - startTime) / 1000;
      const avgSpeed = finalDuration > 0 ? (totalBytes / (1024 * 1024)) / finalDuration : 0;
      
      log(`Completed copying "${sourcePath}" successfully in ${finalDuration.toFixed(1)}s. Average speed: ${avgSpeed.toFixed(1)} MB/s`);
      
      parentPort.postMessage({
        type: 'progress',
        data: {
          id,
          progress: 100,
          bytesCopied: totalBytes,
          totalBytes,
          speedMbs: avgSpeed,
          paused: false,
          completed: true
        }
      });
      parentPort.postMessage({ type: 'completed', data: { id, destPath } });
    }
  } catch (err) {
    log(`Error occurred in copy worker: ${err.message}`);
    if (fdSrc !== null) {
      try { fs.closeSync(fdSrc); } catch (e) {}
    }
    if (fdDest !== null) {
      try { fs.closeSync(fdDest); } catch (e) {}
    }
    // Delete partial file on error
    if (fs.existsSync(destPath)) {
      try { fs.unlinkSync(destPath); } catch (e) {}
    }
    parentPort.postMessage({ type: 'error', data: { id, error: err.message } });
  }
}

startCopy();
