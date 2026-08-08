import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
  test: {
    environment: "node",
    // Incluye app/ (route handlers, páginas) y .tsx, no solo src/**.ts: antes
    // un test bajo app/ o de un componente no se descubría aunque se escribiera.
    // El entorno es node; un test de componente que toque el DOM tendría que
    // fijar jsdom en su propio archivo.
    include: ["{src,app}/**/*.test.{ts,tsx}"],
    setupFiles: ["src/lib/offline/__tests__/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
})
