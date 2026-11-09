import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  // tsconfig keeps JSX as-is for Next; component tests need it compiled.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `import 'server-only'` throws outside a React Server build; tests run server code directly.
      'server-only': path.resolve(__dirname, './node_modules/server-only/empty.js'),
    },
  },
})
