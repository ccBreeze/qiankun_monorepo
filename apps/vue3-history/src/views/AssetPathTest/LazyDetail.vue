<template>
  <div class="lazy-detail">
    <p class="lazy-detail__title">懒加载组件已成功加载</p>
    <p class="lazy-detail__desc">
      此组件通过动态 <code>import()</code> 加载，验证
      <code>processDynamicImport</code> 是否正确修正了 HTML 模板中的 chunk
      路径。
    </p>
  </div>
</template>

<style lang="scss" scoped>
.lazy-detail {
  padding: 16px;
  background: #f0f9eb;
  border: 1px solid #b7eb8f;
  border-radius: 6px;

  &__title {
    margin: 0 0 8px;
    font-weight: 600;
    color: #389e0d;
  }

  &__desc {
    margin: 0;
    font-size: 13px;
    color: #595959;
  }
}
</style>
