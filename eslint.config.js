import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'supabase/functions', 'src/lib/database.types.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Ningún componente habla con Supabase: solo las capas de datos (api.ts) y lib/.
      'no-restricted-imports': ['error', {
        patterns: [{ group: ['**/lib/supabase', '@/lib/supabase'], message: 'Usa la capa de datos del feature (api.ts).' }],
      }],
    },
  },
  {
    files: ['src/**/api.ts', 'src/lib/**', 'src/features/auth/AuthProvider.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
)
