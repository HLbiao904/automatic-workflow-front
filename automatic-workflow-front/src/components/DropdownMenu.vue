<template>
  <div
    v-if="visible"
    class="dropdown"
    :style="{ top: y + 'px', left: x + 'px' }"
  >
    <div class="item" @click="select('createWorkflow')">
      <img src="../assets/add.svg" class="icon" />
      <span>新建工作流</span>
    </div>

    <div class="item" @click="select('createFromTemplate')">
      <img src="../assets/template.svg" class="icon" />
      <span>从模板创建</span>
    </div>

    <!--     <div class="item" @click="select('importWorkflow')">
      <img src="../assets/import.svg" class="icon" />
      <span>导入流程</span>
    </div> -->
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
  width: 170px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
  padding: 6px 0;
  z-index: 999;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.item:hover {
  background: #f5f7fa;
}

.icon {
  width: 16px;
  height: 16px;
}
</style>
