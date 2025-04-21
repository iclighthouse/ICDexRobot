module.exports = {
  apps: [
    {
      name: 'robot',
      script: 'src/app.ts',
      interpreter: 'ts-node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        PORT: 26535,
        NODE_ENV: 'production'
      }
    }
  ]
};
