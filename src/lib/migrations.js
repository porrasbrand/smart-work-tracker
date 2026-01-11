const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor(db, migrationsDir) {
    this.db = db;
    this.migrationsDir = migrationsDir;
  }

  async ensureMigrationsTable() {
    await this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getAppliedMigrations() {
    const rows = await this.db.all('SELECT filename FROM migrations ORDER BY filename');
    return rows.map(r => r.filename);
  }

  async runMigrations(direction = 'up') {
    await this.ensureMigrationsTable();

    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql'))
      .sort();

    const applied = await this.getAppliedMigrations();

    if (direction === 'up') {
      const pending = files.filter(f => !applied.includes(f));

      if (pending.length === 0) {
        console.log('No pending migrations.');
        return;
      }

      for (const file of pending) {
        const sql = fs.readFileSync(path.join(this.migrationsDir, file), 'utf8');
        console.log(`Running migration UP: ${file}`);

        try {
          await this.db.run(sql);
          await this.db.run('INSERT INTO migrations (filename) VALUES (?)', [file]);
          console.log(`✓ ${file} applied`);
        } catch (err) {
          console.error(`✗ ${file} failed:`, err.message);
          throw err;
        }
      }

      console.log(`\n✓ ${pending.length} migrations applied successfully`);
    } else if (direction === 'down') {
      if (applied.length === 0) {
        console.log('No migrations to rollback.');
        return;
      }

      // Rollback the most recent migration
      const latest = applied[applied.length - 1];
      const downFile = latest.replace('.sql', '.down.sql');
      const downPath = path.join(this.migrationsDir, downFile);

      if (!fs.existsSync(downPath)) {
        throw new Error(`Down migration not found: ${downFile}`);
      }

      const sql = fs.readFileSync(downPath, 'utf8');
      console.log(`Running migration DOWN: ${downFile}`);

      try {
        await this.db.run(sql);
        await this.db.run('DELETE FROM migrations WHERE filename = ?', [latest]);
        console.log(`✓ ${latest} rolled back`);
      } catch (err) {
        console.error(`✗ ${downFile} failed:`, err.message);
        throw err;
      }
    }
  }
}

module.exports = MigrationRunner;
