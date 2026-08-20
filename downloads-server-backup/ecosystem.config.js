module.exports = { apps: [{
  name: 'downloads-server',
  script: 'server.js',
  cwd: '/opt/downloads-server',
  env: {
    NODE_ENV: 'production',
    PORT: 8300,
    DOWNLOADS_DIR: '/var/www/xiaye.xyz/downloads',
    CONTROL_PASSWORD: 'Tuo12123!',
    DLS_SECRET: '60ade6be862499b37aeafe63f3cbd1b524d9472f23c52b0ce2150979e845c1c3',
    COOKIE_SECURE: '1'
  }
}] };
