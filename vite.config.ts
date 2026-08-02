/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  /**
   * Saved progress lives in localStorage, which the browser partitions by origin
   * — and the origin includes the port. A dev server that wanders to whatever
   * port happens to be free would silently orphan every profile, stat and badge
   * behind an address you'd have no reason to revisit.
   *
   * So the port is pinned. `strictPort` makes a collision fail loudly at startup
   * instead of quietly moving the app to a new origin and greeting you with an
   * empty bankroll.
   */
  server: {
    port: 5175,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    /**
     * Load `.env` into the TEST environment only, so a local
     * ANTHROPIC_API_KEY=... enables src/coach-ai/real-api.test.ts.
     *
     * The empty prefix loads every key in the file. That is safe here because
     * this only feeds `test.env` — `envPrefix` is left at its default, so none
     * of it reaches client code or gets inlined into the production bundle.
     * Never give an API key a VITE_ prefix: those DO get baked into dist/.
     */
    env: loadEnv(mode, process.cwd(), ''),
  },
}))
