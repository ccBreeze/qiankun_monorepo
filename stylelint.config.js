export default {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-vue/scss',
  ],
  plugins: ['stylelint-order', 'stylelint-selector-bem-pattern'],
  overrides: [
    {
      customSyntax: 'postcss-html',
      files: ['**/*.vue'],
      rules: {
        // 允许 Vue 的 :deep()、:slotted()、:global() 等伪类
        'selector-pseudo-class-no-unknown': [
          true,
          {
            ignorePseudoClasses: ['deep', 'slotted', 'global'],
          },
        ],
      },
    },
    {
      customSyntax: 'postcss-scss',
      files: ['**/*.scss', '**/*.sass'],
    },
  ],
  rules: {
    // 可以使用驼峰命名的 JS 变量
    'value-keyword-case': null,
    'order/order': [
      [
        'dollar-variables',
        'custom-properties',
        'at-rules',
        'declarations',
        {
          name: 'supports',
          type: 'at-rule',
        },
        {
          name: 'media',
          type: 'at-rule',
        },
        {
          name: 'include',
          type: 'at-rule',
        },
        'rules',
      ],
      { severity: 'error' },
    ],
    'plugin/selector-bem-pattern': {
      implicitComponents: ['apps/**/src/**/*'],
      ignoreCustomProperties: '.*',
      componentSelectors: {
        initial: '^\\.[a-z][a-z-]*(?:__(?:[a-z-]+))?(?:--[a-z-]+)?$',
        combined: '^\\.[a-z][a-z-]*(?:__(?:[a-z-]+))?(?:--[a-z-]+)?$',
      },
    },
    'selector-class-pattern': null,
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'alpha-value-notation': null,

    // 支持 Tailwind CSS 指令（scss/at-rule-no-unknown 对 CSS/SCSS/Vue 文件均生效）
    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'tailwind',
          'apply',
          'layer',
          'config',
          'variants',
          'responsive',
          'screen',
          'reference',
        ],
      },
    ],
  },
}
