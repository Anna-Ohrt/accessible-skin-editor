import js from '@eslint/js'
import globals from 'globals'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import { reactRefresh } from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist/', 'dist-single/', 'test-results/', 'playwright-report/', 'skin-editor.html'] },
  js.configs.recommended,
  // The stricter of the plugin's two sets of accessibility rules for JSX.
  jsxA11y.flatConfigs.strict,
  // The Rules of Hooks, plus the React Compiler's checks for code React can't safely optimize.
  reactHooks.configs.flat.recommended,
  // Files with components export only components, so Vite can update them in place while editing.
  reactRefresh.configs.vite(),
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Components used only in JSX look unused to this rule, and their names start with a capital.
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': 'error',
    },
  },
  {
    files: ['src/**'],
    rules: {
      // Text is only ever set as text. Building HTML from strings is how cross-site scripting gets in.
      'no-restricted-properties': [
        'error',
        { property: 'innerHTML', message: 'Set textContent, or render with React.' },
        { property: 'outerHTML', message: 'Set textContent, or render with React.' },
        { property: 'insertAdjacentHTML', message: 'Insert elements, or render with React.' },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Render text and elements instead.' },
      ],
    },
  },
  {
    files: ['*.config.js', 'scripts/**', 'e2e/**'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['tests/**'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
]
