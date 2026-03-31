<template>
  <div
    v-if="visible"
    class="dropdown"
    :style="{ top: y + 'px', left: x + 'px' }"
  >
    <div class="item" @click="select('new')">🆕 新建工作流</div>
    <div class="item" @click="select('ai')">🤖 AI生成流程</div>
    <div class="item" @click="select('template')">📦 从模板创建</div>
    <div class="item" @click="select('import')">📥 导入流程</div>
  </div>
</template>

<script setup>
const props = defineProps({
  visible: Boolean,
  x: Number,
  y: Number,
});

const emit = defineEmits(["select"]);

const select = (type) => {
  emit("select", type);
};
</script>

<style scoped>
.dropdown {
  position: fixed;
  width: 180px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 6px 0;
  z-index: 999;
}

.item {
  padding: 10px 14px;
  cursor: pointer;
}

.item:hover {
  background: #f5f5f5;
}
</style>
