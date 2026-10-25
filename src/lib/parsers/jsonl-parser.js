const fs = require('fs');
const readline = require('readline');
const crypto = require('crypto');
const { JSONLMalformedError } = require('../errors');

class JSONLParser {
  constructor(filePath) {
    this.filePath = filePath;
    this.byteOffset = 0;
    this.lineNumber = 0;
  }

  async *parseLines() {
    const fileStream = fs.createReadStream(this.filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      this.lineNumber++;
      const lineByteLength = Buffer.byteLength(line, 'utf8') + 1; // +1 for newline

      // Skip empty lines
      if (line.trim() === '') {
        this.byteOffset += lineByteLength;
        continue;
      }

      try {
        const event = JSON.parse(line);
        yield {
          event,
          byteOffset: this.byteOffset,
          lineNumber: this.lineNumber
        };
      } catch (err) {
        // Malformed JSON - yield error instead of throwing
        yield {
          error: new JSONLMalformedError(this.lineNumber, { line: line.substring(0, 100), byteOffset: this.byteOffset }),
          byteOffset: this.byteOffset,
          lineNumber: this.lineNumber
        };
      }

      this.byteOffset += lineByteLength;
    }
  }

  async calculateFileHash() {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(this.filePath);

      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve('sha256:' + hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async getFileSize() {
    const stats = await fs.promises.stat(this.filePath);
    return stats.size;
  }
}

module.exports = JSONLParser;
