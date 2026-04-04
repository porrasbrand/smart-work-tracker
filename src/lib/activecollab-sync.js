const axios = require('axios');

class ActiveCollabSync {
  constructor(config, db, logger) {
    this.config = config;
    this.db = db;
    this.logger = logger;
    this.apiUrl = config.activeCollab.apiUrl;
    this.apiToken = config.activeCollab.apiToken;
  }

  async syncProjects() {
    this.logger.info('Syncing ActiveCollab projects');

    // Fetch projects from ActiveCollab API
    const response = await axios.get(`${this.apiUrl}/api/v1/projects`, {
      headers: {
        'X-Angie-AuthApiToken': this.apiToken
      },
      params: {
        include_trashed: false
      }
    });

    const projects = response.data;
    this.logger.info('Fetched projects from ActiveCollab', { count: projects.length });

    // Save to projects_map table
    let synced = 0;
    for (const project of projects) {
      // Generate basic CWD patterns from project name
      const cwdPatterns = this.generateCwdPatterns(project.name);
      const keywords = this.generateKeywords(project.name);

      // Check if project already exists
      const existing = await this.db.get(
        'SELECT id FROM projects_map WHERE activecollab_project_id = ?',
        [project.id]
      );

      if (existing) {
        // Update existing
        await this.db.run(
          `UPDATE projects_map SET
            activecollab_project_name = ?,
            keywords = ?,
            cwd_patterns = ?,
            updated_at = CURRENT_TIMESTAMP
           WHERE activecollab_project_id = ?`,
          [project.name, JSON.stringify(keywords), JSON.stringify(cwdPatterns), project.id]
        );
      } else {
        // Insert new
        await this.db.run(
          `INSERT INTO projects_map (
            activecollab_project_id,
            activecollab_project_name,
            keywords,
            cwd_patterns,
            priority
          ) VALUES (?, ?, ?, ?, ?)`,
          [project.id, project.name, JSON.stringify(keywords), JSON.stringify(cwdPatterns), 0]
        );
      }

      synced++;
    }

    this.logger.info('Projects synced successfully', { count: synced });
    return synced;
  }

  generateCwdPatterns(projectName) {
    // Generate likely CWD patterns from project name
    const slug = projectName.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, ''); // Remove leading/trailing dashes

    const patterns = [
      `/home/mp/awesome/${slug}`,
      `${slug}`,
    ];

    // Also add exact project name (case-insensitive match)
    if (slug !== projectName.toLowerCase()) {
      patterns.push(projectName.toLowerCase());
    }

    return patterns;
  }

  generateKeywords(projectName) {
    // Extract keywords from project name
    const keywords = projectName.toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(k => k.length > 2); // Only keywords > 2 chars

    return keywords;
  }
}

module.exports = ActiveCollabSync;
