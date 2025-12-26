<!--
  Stylelint 配置测试组件
  用于验证 Vue 文件中的样式规则
-->
<template>
  <div class="stylelint-test">
    <h2>Stylelint Vue 测试组件</h2>

    <div class="dynamic-color">动态颜色绑定测试</div>

    <div class="deep-selector-test">
      <slot name="content" />
    </div>

    <div class="global-style-test">全局样式测试</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const themeColor = ref('#42b883')
</script>

<style scoped lang="scss">
// ========== SCSS 变量测试 ==========
$primary-color: #42b883;
$spacing: 1rem;

@use 'sass:color';

// ========== 基础样式测试 ==========
.stylelint-test {
  padding: $spacing * 2;
  background: color.adjust($primary-color, $lightness: 45%);

  h2 {
    margin-bottom: $spacing;
    color: $primary-color;
  }
}

// ========== v-bind() 函数测试 ==========
.dynamic-color {
  padding: $spacing;

  // Vue 的 CSS 变量绑定
  color: v-bind(themeColor);
  border: 2px solid v-bind(themeColor);
}

// ========== :deep() 伪类测试 ==========
.deep-selector-test {
  // 穿透 scoped 样式，影响子组件
  :deep(.child-element) {
    color: $primary-color;
  }

  // 也可以使用 ::v-deep (旧语法)
  :deep(p) {
    margin: $spacing 0;
  }
}

// ========== :global() 伪类测试 ==========
:global(.global-utility) {
  // 全局样式，不受 scoped 限制
  font-weight: bold;
}

// ========== :slotted() 伪类测试 ==========
:slotted(div) {
  // 影响插槽内容的样式
  padding: $spacing;
}

// ========== Tailwind @apply 测试 ==========
.tailwind-test {
  @apply flex items-center justify-center;
  @apply bg-blue-500 text-white;
  @apply px-4 py-2 rounded;
}

// ========== 嵌套和伪类组合测试 ==========
.complex-selector {
  &:hover {
    :deep(.nested-child) {
      color: color.adjust($primary-color, $lightness: -10%);
    }
  }

  :global(.global-modifier) {
    font-size: 1.2rem;
  }
}

// ========== order/order 规则测试 ==========
// 验证样式块内部语句的排序
.order-test {
  // 1. SCSS 变量（dollar-variables）
  $local-spacing: 0.5rem;
  $local-color: #333;

  // 2. CSS 自定义属性（custom-properties）
  --local-padding: 10px;
  --local-margin: 20px;

  // 3. @规则（at-rules）- 除了 @supports, @media, @include
  // @extend 应该使用 placeholder 选择器（%）
  // @extend %base-style;

  // 4. CSS 属性声明（declarations）
  display: block;
  padding: var(--local-padding);
  margin: var(--local-margin);
  color: $local-color;

  // 5. @supports 规则
  @supports (display: grid) {
    display: grid;
  }

  // 6. @media 媒体查询
  @media (width >= 768px) {
    padding: $local-spacing * 4;
  }

  // 7. @include (SCSS mixin)
  // @include some-mixin;  // 如果有 mixin 的话

  // 8. 嵌套规则（rules）
  .nested-element {
    margin: $local-spacing;
  }

  &:hover {
    color: $local-color;
  }
}

// ========== CSS 属性排序测试 ==========
// 验证 order/properties-order 规则
.properties-order-test {
  // 1. 定位（Positioning）
  position: relative;
  top: 0;
  left: 0;
  z-index: 10;

  // 2. 盒模型（Box Model）
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 200px;
  margin: $spacing;
  padding: $spacing * 2;

  // 3. 排版（Typography）
  color: $primary-color;
  font-size: 1rem;
  line-height: 1.5;
  text-align: center;

  // 4. 视觉效果（Visual）
  background: #fff;
  border: 1px solid $primary-color;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgb(0 0 0 / 10%);

  // 5. 变换和动画（Transform & Animation）
  transition: all 0.3s ease;

  // 6. 其他（Misc）
  cursor: pointer;
}
</style>
