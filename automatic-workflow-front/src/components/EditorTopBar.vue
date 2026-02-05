<template>
  <header class="topbar">
    <div class="topbar-center">
      <input
        class="workflow-name"
        :value="name"
        @input="$emit('update:name', $event.target.value)"
        placeholder="My workflow"
      />
    </div>

    <div class="topbar-right">
      <span v-if="dirty" class="dirty-dot">● 未保存</span>
      <span v-else class="saved-dot">● 已保存</span>
      <el-button
        size="small"
        type="primary"
        :disabled="!dirty"
        @click="$emit('save')"
      >
        保存
      </el-button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    default: "My workflow",
  },
  dirty: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped lang="scss">
.topbar {
  height: 48px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #ffffff;
  border-bottom: 1px solid #ebeef5;
}

/* 中间 */
.topbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.workflow-name {
  border: none;
  outline: none;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  background: transparent;
  min-width: 200px;

  &:focus {
    border-bottom: 1px solid #409eff;
  }
}

.dirty-dot {
  font-size: 12px;
  color: #e6a23c;
  margin-right: 5px;
}
.saved-dot {
  font-size: 12px;
  color: #70dc64;
  margin-right: 5px;
}

/* 右侧 */
.topbar-right {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
