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

EXAMPLES:
  smart-work-tracker help
  smart-work-tracker migrate
  smart-work-tracker status
  smart-work-tracker parse
  smart-work-tracker parse /path/to/.claude/projects

For more information, visit the documentation in docs/
`);
}

module.exports = { show };
