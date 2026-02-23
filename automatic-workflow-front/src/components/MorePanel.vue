<template>
  <Teleport to="body">
    <div v-if="showMore" class="more-panel" @click.stop :style="panelStyle">
      <div class="panel-item" @click="handleAction('open')">
        <img src="../assets/open.svg" />
        <span>打开</span>
      </div>

      <div class="panel-item" @click="handleAction('rename')">
        <img src="../assets/rename.svg" />
        <span>重命名</span>
      </div>

      <div class="panel-item" @click="handleAction('execute')">
        <img src="../assets/arrow.svg" />
        <span>执行步骤</span>
      </div>

      <div class="panel-item" @click="handleAction('duplicate')">
        <img src="../assets/duplicate.svg" />
        <span>复制</span>
      </div>

      <div class="panel-divider"></div>

      <div class="panel-item danger" @click="handleAction('delete')">
        <img src="../assets/delete.svg" />
        <span>删除</span>
      </div>

      <div class="panel-item" @click="handleAction('replace')">
        <img src="../assets/replace.svg" />
        <span>替换</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { defineProps, defineEmits } from "vue";

const props = defineProps({
  showMore: {
    type: Boolean,
    default: false,
  },
  panelStyle: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["action"]);
function handleAction(type) {
  emit("action", type);
}
</script>

<style scoped lang="scss">
/* 弹出面板 */
.more-panel {
  position: fixed;
  width: 180px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 6px 0;
  z-index: 9999;
}

/* 每一项 */
.panel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.panel-item img {
  width: 16px;
  height: 16px;
}

/* hover效果 */
.panel-item:hover {
  background: #f5f7fa;
}

/* 分割线 */
.panel-divider {
  height: 1px;
  background: #ebeef5;
  margin: 6px 0;
}

/* 危险项 */
.panel-item.danger:hover {
  background: #fde2e2;
  color: #f56c6c;
}
</style>
