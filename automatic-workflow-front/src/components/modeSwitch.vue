<template>
  <div class="mode-switch">
    <div
      class="mode-item"
      :class="{ active: viewMode === 'editor' }"
      @click="checkEditor"
    >
      Editor
    </div>
    <div
      class="mode-item"
      :class="{ active: viewMode === 'executions' }"
      @click="checkExecutions"
    >
      Executions
    </div>
    <div
      class="mode-item"
      :class="{ active: viewMode === 'versions' }"
      @click="checkVersions"
    >
      Versions
    </div>
  </div>
</template>

<script setup>
defineProps({
  viewMode: {
    type: String,
    required: true,
    default: "editor",
  },
});
const emit = defineEmits(["update:viewMode"]);
function checkEditor() {
  emit("update:viewMode", "editor");
}
function checkExecutions() {
  emit("update:viewMode", "executions");
}
function checkVersions() {
  emit("update:viewMode", "versions");
}
</script>

<style lang="scss" scoped>
.mode-switch {
  display: inline-flex;
  padding: 4px;
  border-radius: 10px;
  background: #f3f5f7;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
  gap: 4px;
}

/* 单个按钮 */
.mode-item {
  position: relative;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.25s ease;

  display: flex;
  align-items: center;
  justify-content: center;
}

/* hover */
.mode-item:hover {
  color: #409eff;
}

/* 激活状态 */
.mode-item.active {
  color: #409eff;
  background: #fff;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.15),
    0 0 0 1px rgba(64, 158, 255, 0.1);
}

/* 点击反馈 */
.mode-item:active {
  transform: scale(0.96);
}
</style>
