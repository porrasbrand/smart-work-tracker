const fs = require('fs');
const path = require('path');

class FileLock {
  constructor(filePath) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
    this.fd = null;
  }

  async acquire(timeout = 5000) {
    const startTime = Date.now();

    while (true) {
      try {
        // Try to create exclusive lock file
        this.fd = fs.openSync(this.lockPath, 'wx');
        return true; // Lock acquired
      } catch (err) {
        if (err.code === 'EEXIST') {
          // Lock file exists, check if it's stale
          const stats = fs.statSync(this.lockPath);
          const age = Date.now() - stats.mtimeMs;

          // If lock is older than 30 seconds, assume stale and remove
          if (age > 30000) {
            try {
              fs.unlinkSync(this.lockPath);
              continue; // Try again
            } catch (unlinkErr) {
              // Another process removed it, continue
            }
          }

          // Wait and retry
          if (Date.now() - startTime > timeout) {
            throw new Error(`Failed to acquire lock for ${this.filePath} after ${timeout}ms`);
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw err;
        }
      }
    }
  }

  release() {
    if (this.fd) {
      try {
        fs.closeSync(this.fd);
        fs.unlinkSync(this.lockPath);
        this.fd = null;
      } catch (err) {
        // Ignore errors on release
      }
    }
  }

  async withLock(fn, timeout = 5000) {
    try {
      await this.acquire(timeout);
      return await fn();
    } finally {
      this.release();
    }
  }
}

module.exports = FileLock;
