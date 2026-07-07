<script setup lang="ts">
import { ref } from 'vue'

defineOptions({
  name: 'ComponentLazyAuditPanel',
})

const auditRemark = ref('审计备注')

const auditItems = [
  {
    title: '权限变更',
    operator: '张晓',
    status: '待复核',
  },
  {
    title: '导入任务',
    operator: '系统任务',
    status: '已完成',
  },
  {
    title: '配置发布',
    operator: '李然',
    status: '进行中',
  },
]
</script>

<template>
  <section class="audit-list">
    <label class="state-input">
      <span>审计输入</span>
      <input
        v-model="auditRemark"
        type="text"
        placeholder="输入后切换 tab 再回来"
      />
    </label>
    <article v-for="item in auditItems" :key="item.title" class="audit-item">
      <div>
        <h3>{{ item.title }}</h3>
        <p>处理人：{{ item.operator }}</p>
      </div>
      <span>{{ item.status }}</span>
    </article>
  </section>
</template>

<style lang="scss" scoped>
.audit-list {
  display: grid;
  gap: 12px;
}

.state-input {
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: #80613b;

  input {
    box-sizing: border-box;
    width: 100%;
    padding: 9px 11px;
    font-size: 14px;
    color: #3d2b16;
    outline: none;
    border: 1px solid #f2d4a8;
    border-radius: 6px;

    &:focus {
      border-color: #d88400;
    }
  }
}

.audit-item {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #fff9f0;
  border: 1px solid #f2d4a8;
  border-radius: 8px;

  h3 {
    margin: 0;
    font-size: 16px;
    color: #3d2b16;
  }

  p {
    margin: 6px 0 0;
    font-size: 13px;
    color: #80613b;
  }

  span {
    flex: 0 0 auto;
    padding: 4px 10px;
    font-size: 13px;
    color: #7a4c00;
    background: #fff1d6;
    border: 1px solid #f0c979;
    border-radius: 999px;
  }
}

@media (width <= 560px) {
  .audit-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
