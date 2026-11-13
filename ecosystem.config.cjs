// PM2 process definition for 67-store.
// Apply with: pm2 startOrReload /home/67-store.online/app/ecosystem.config.js --update-env
module.exports = {
  apps: [
    {
      name: "67-store",
      script: "server.js",
      cwd: "/home/67-store.online/app",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "600M",
      min_uptime: "15s",
      max_restarts: 15,
      restart_delay: 4000,
      exp_backoff_restart_delay: 200,
      // SIGTERM lets Next finish in-flight requests before PM2 escalates.
      kill_signal: "SIGTERM",
      kill_timeout: 10000,
      env: {
        NODE_ENV: "production",
        PORT: "3100",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
