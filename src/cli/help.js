function show() {
  console.log(`
Smart Work Tracker - Automated work tracking for Claude Code sessions

USAGE:
  smart-work-tracker <command> [options]

COMMANDS:
  help              Show this help message
  version           Show version information
  migrate           Run pending database migrations
  migrate down      Rollback the most recent migration
  status            Show current database status
  parse [dir]       Parse Claude Code session logs (default: ~/.claude/projects)
  sync-projects     Sync ActiveCollab projects to local database
  attribute         Run project attribution on pending segments
  detect            Detect task types and generate descriptions
  link-tasks        Analyze super-agent task logs and link to segments

EXAMPLES:
  smart-work-tracker help
  smart-work-tracker migrate
  smart-work-tracker status
  smart-work-tracker parse
  smart-work-tracker sync-projects
  smart-work-tracker attribute
  smart-work-tracker detect
  smart-work-tracker link-tasks

For more information, visit the documentation in docs/
`);
}

module.exports = { show };
