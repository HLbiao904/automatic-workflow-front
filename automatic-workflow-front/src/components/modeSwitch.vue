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
</script>

<style lang="scss" scoped>
.mode-switch {
  display: flex;
  gap: 20px;
  border-radius: 7px;
  font-size: 14px;
  padding: 3px 14px;
  height: 30px;
  align-items: center;
  background-color: #eee;
}

.mode-item {
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  padding: 5px;
  border-radius: 4px;
  color: #666;
}

.mode-item.active {
  background-color: #fff;
}
</style>
