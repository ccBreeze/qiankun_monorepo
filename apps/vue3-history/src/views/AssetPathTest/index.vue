<template>
  <div class="asset-path-test">
    <h2 class="asset-path-test__title">资源路径修正测试</h2>

    <!-- 场景一：CSS url() 背景图 -->
    <section class="test-section">
      <h3 class="test-section__heading">
        场景一：CSS <code>url()</code> 背景图
      </h3>
      <p class="test-section__desc">
        通过 <code>processLoadAssetInCss</code> 修正 CSS 中的相对路径。 在
        qiankun 环境下图案正常显示则说明路径修正成功。
      </p>
      <div class="bg-demo" />
    </section>

    <!-- 场景二：动态 import() -->
    <section class="test-section">
      <h3 class="test-section__heading">场景二：动态 <code>import()</code></h3>
      <p class="test-section__desc">
        通过 <code>processDynamicImport</code> 修正 HTML 模板中的 chunk 路径。
        点击加载懒加载组件，成功则说明动态导入路径修正生效。
      </p>
      <button class="load-btn" :disabled="lazyLoaded" @click="loadLazy">
        {{ lazyLoaded ? '已加载' : '加载懒加载组件' }}
      </button>
      <LazyDetail v-if="lazyLoaded" class="test-section__result" />
    </section>

    <!-- 场景三：数字与英文专用字体 -->
    <section class="test-section">
      <h3 class="test-section__heading">
        场景三：数字与英文专用字体（<code>@font-face</code>）
      </h3>
      <p class="test-section__desc">
        通过
        <code>unicode-range</code>
        将字体限定在数字与英文字母，中文仍走系统字体。
      </p>
      <div class="num-font-demo">
        <p class="num-font-demo__line">默认：订单金额 12,345,678.90 元</p>
        <p class="num-font-demo__line digit-font">
          数字字体：订单金额 12,345,678.90 元
        </p>
        <p class="num-font-demo__line">默认：批次号 CRM-ABCD-20260415</p>
        <p class="num-font-demo__line digit-font">
          字体生效：批次号 CRM-ABCD-20260415
        </p>
        <p class="num-font-demo__line digit-font">
          统计：Growth 18.62 / Loss 2.08 / RunAt 2026-04-14 10:08:59
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue'

const LazyDetail = defineAsyncComponent(() => import('./LazyDetail.vue'))

const lazyLoaded = ref(false)
const loadLazy = () => {
  lazyLoaded.value = true
}
</script>

<style lang="scss" scoped>
.asset-path-test {
  max-width: 720px;
  padding: 24px;

  &__title {
    margin: 0 0 24px;
    font-size: 20px;
  }
}

.test-section {
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;

  &__heading {
    margin: 0 0 8px;
    font-size: 15px;
  }

  &__desc {
    margin: 0 0 16px;
    font-size: 13px;
    color: #595959;
  }

  &__result {
    margin-top: 12px;
  }
}

.num-font-demo {
  padding: 12px 16px;
  background: #fafafa;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;

  &__line {
    margin: 0;
    line-height: 1.9;
    color: #262626;
  }
}

/* 通过 CSS url() 引用图片，验证 processLoadAssetInCss 路径修正 */
.bg-demo {
  width: 522px;
  height: 240px;
  background-image: url('./images/add.png');
  background-size: cover;
  border-radius: 6px;
}

.load-btn {
  padding: 6px 16px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  background: #1677ff;
  border: 1px solid #1677ff;
  border-radius: 4px;

  &:disabled {
    cursor: not-allowed;
    background: #d9d9d9;
    border-color: #d9d9d9;
  }
}

.digit-font {
  font-family:
    AssetPathDigits, 'Microsoft YaHei', '微软雅黑', 'Helvetica Neue', Helvetica,
    Arial, sans-serif;
  font-feature-settings:
    'tnum' 1,
    'lnum' 1;
  font-variant-numeric: tabular-nums;
}
</style>
