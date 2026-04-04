module.exports = {
  apps: [{
    name: 'smart-work-tracker-ui',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/mp/awesome/smart-work-tracker/web-ui',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'development',
      PORT: 3001
    },
    error_file: '/home/mp/awesome/smart-work-tracker/logs/web-ui-error.log',
    out_file: '/home/mp/awesome/smart-work-tracker/logs/web-ui-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
