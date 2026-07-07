<script setup lang="ts">
defineOptions({
  name: 'ComponentLazyAsyncDemoModal',
})

defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  afterClose: []
}>()

const close = () => {
  emit('update:open', false)
}
</script>

<template>
  <Transition name="modal-fade" @afterLeave="emit('afterClose')">
    <div v-if="open" class="demo-modal">
      <div class="demo-modal__mask" @click="close" />
      <section class="demo-modal__content">
        <h3>{{ title }}</h3>
        <p>这是通过 defineAsyncComponent 加载的弹窗组件。</p>
        <button type="button" @click="close">关闭弹窗</button>
      </section>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.demo-modal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
}

.demo-modal__mask {
  position: absolute;
  inset: 0;
  background: rgb(14 30 46 / 45%);
}

.demo-modal__content {
  position: relative;
  z-index: 1;
  width: min(360px, calc(100vw - 32px));
  padding: 22px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 20px 60px rgb(14 30 46 / 24%);

  h3 {
    margin: 0 0 10px;
    font-size: 18px;
    color: #18324c;
  }

  p {
    margin: 0 0 18px;
    color: #5b7188;
  }

  button {
    padding: 8px 14px;
    color: #fff;
    cursor: pointer;
    background: #2f6fed;
    border: 1px solid #2f6fed;
    border-radius: 6px;
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.35s ease;

  .demo-modal__content {
    transition: transform 0.35s ease;
  }
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;

  .demo-modal__content {
    transform: translateY(16px) scale(0.98);
  }
}
</style>
