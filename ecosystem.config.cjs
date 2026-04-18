module.exports = {
    apps: [{
        name: "server-monitor-pinger",
        script: "./src/pinger.js",
        instances: 1,
        exec_mode: "fork",
        log_date_format: "YYYY-MM-DD HH:mm:ss",

        cron_restart: "0 3 * * *", // Every day at 3 AM
        max_memory_restart: "1000M",

        out_file: "./logs/out.log",
        error_file: "./logs/errors.log",
        combine_logs: true,

        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
        }
    }]
};
