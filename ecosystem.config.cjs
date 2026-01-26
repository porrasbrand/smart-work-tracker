module.exports = {
  apps: [
    // Backend API Server
    {
      name: 'smart-work-tracker-api',
      script: 'src/api/server.js',
      cwd: '/home/mp/awesome/smart-work-tracker',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'development',
        API_PORT: 3001,
        API_HOST: '127.0.0.1',
        CORS_ORIGIN: 'http://localhost:3000'
      },
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    },
    // Frontend UI (Vite Dev Server)
    {
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
        PORT: 3000,
        VITE_API_URL: 'http://localhost:3001/api'
      },
      error_file: '../logs/web-ui-error.log',
      out_file: '../logs/web-ui-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true
    }
  ]
};
