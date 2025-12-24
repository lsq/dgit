// eslint.config.mjs
import antfu from '@antfu/eslint-config';

export default antfu({
  rules: {
    'no-console': ['error', { allow: ['warn', 'log', 'error'] }],
  },
  ignores: ['*.log', 'lib/**', '*.md'],
  gitignore: true,
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: true,
  },
});
