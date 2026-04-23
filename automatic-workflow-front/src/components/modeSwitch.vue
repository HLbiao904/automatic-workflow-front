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
  padding: 6px;
  border-radius: 12px;
  gap: 4px;

  /* 🌟 毛玻璃核心 */
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  /* 🌟 边框 + 阴影 */
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1),
    inset 0 1px 1px rgba(255, 255, 255, 0.4);
}

/* 单个按钮 */
.mode-item {
  position: relative;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
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
  background: rgba(255, 255, 255, 0.4);
}

/* 激活状态 */
.mode-item.active {
  color: #409eff;

  /* 半透明白高亮 */
  background: rgba(255, 255, 255, 0.6);

  /* 局部模糊叠加 */
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);

  /* 高级阴影 */
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}

/* 点击反馈 */
.mode-item:active {
  transform: scale(0.96);
}
</style>
