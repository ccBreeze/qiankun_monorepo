<template>
  <div class="micro-container"></div>
</template>

<script setup lang="ts"></script>

<style lang="scss" scoped>
.micro-container {
  height: 100%;

  & > ::v-deep(div) {
    height: 100%;
  }
}
</style>
