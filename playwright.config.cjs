const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests', fullyParallel: true, workers: 2,
  reporter: 'list', timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:8000', reducedMotion: 'reduce', viewport: {width: 1280, height: 1000},
    launchOptions: process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {}
  },
  webServer: {
    command: 'python3 -m http.server 8000 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8000', reuseExistingServer: !process.env.CI
  }
});
