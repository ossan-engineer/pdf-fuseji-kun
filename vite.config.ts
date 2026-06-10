/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // package.json の version だけをビルド時に埋め込む(全体は import しない)
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
