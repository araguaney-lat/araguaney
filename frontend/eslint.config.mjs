import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"

// Primer ESLint del proyecto. Se arranca con `core-web-vitals` (reglas de
// React, React Hooks y Next), no con el preset `/typescript` de typescript-eslint:
// sobre un código que nunca se linteó, ese preset destapa una limpieza grande que
// merece su propio PR. Subir el listón se hace después, a propósito.
//
// Las reglas nuevas del compilador de React 19 (set-state-in-effect, purity,
// refs) quedan en su severidad por defecto (error). Los casos legítimos se
// suprimen de forma acotada, con su razón, en el propio archivo — no con un
// `warn` global que convertiría la regla en ruido.
const eslintConfig = defineConfig([
  ...nextVitals,
  globalIgnores([
    // Ignores por defecto de eslint-config-next.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generado o de terceros: no es código que mantengamos a mano.
    "public/**",
    "coverage/**",
  ]),
])

export default eslintConfig
