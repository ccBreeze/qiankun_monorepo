export default {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-standard-scss',
    'stylelint-config-recommended-vue/scss',
    'stylelint-config-recess-order',
  ],
  plugins: ['stylelint-declaration-block-no-ignored-properties'],
  rules: {
    // 可以使用驼峰命名的 JS 变量
    'value-keyword-case': null,
    // 检测被浏览器静默忽略的无效属性组合（如 display: inline 下设置 width）
    'plugin/declaration-block-no-ignored-properties': true,
    // BEM 命名规范：block-name__element--modifier
    'selector-class-pattern': [
      '^[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$',
      { message: '类名应遵循 BEM 规范：block-name__element--modifier' },
    ],
    'color-function-notation': null,
    'color-function-alias-notation': null,
    'alpha-value-notation': null,
    // Vue scoped 样式中选择器按逻辑分组，强制权重升序会打乱代码结构
    'no-descending-specificity': null,
    // SCSS @use/@forward 和 Tailwind @reference 会触发误报
    'no-invalid-position-at-import-rule': null,

    'scss/at-rule-no-unknown': [
      true,
      {
        ignoreAtRules: [
          'theme',
          'source',
          'utility',
          'variant',
          'custom-variant',
          'apply',
          'reference',
        ],
      },
    ],
  },
}
