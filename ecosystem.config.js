// PM2 process configuration for AQYL.
//
// Start with:  pm2 start ecosystem.config.js
//
// SCALE NOTES:
//  - max_memory_restart caps per-process memory; PM2 restarts a process that exceeds it,
//    protecting the VPS from a runaway leak under load.
//  - instances is currently 1. TODO: ENABLE_CLUSTER_MODE — raising to "max" (or a fixed N)
//    runs the API across all CPU cores. Before enabling, make the API cluster-safe:
//      * Move the ThrottlerModule storage to a shared store (Redis) — in-memory counts are
//        per-process, so N instances would allow N× the intended rate.
//      * Ensure SeedService runs idempotently (it executes on every boot).
//      * Move uploaded files to object storage (see TODO: MIGRATE_TO_S3) so all instances
//        share the same files.
module.exports = {
  apps: [
    {
      name: "aqyl-api",
      cwd: "/root/Aqyl/apps/api",
      script: "dist/main.js",
      instances: 1, // TODO: ENABLE_CLUSTER_MODE -> "max" once cluster-safe (see notes above)
      exec_mode: "fork", // -> "cluster" together with instances: "max"
      max_memory_restart: "512M",
      env: { NODE_ENV: "production" },
    },
    {
      name: "aqyl-web",
      cwd: "/root/Aqyl/apps/web",
      script: "npm",
      args: "start",
      instances: 1,
      max_memory_restart: "512M",
      env: { NODE_ENV: "production" },
    },
  ],
};
