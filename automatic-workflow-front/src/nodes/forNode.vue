<template>
  <div
    class="node-container"
    @mouseleave="handleMouseLeave"
    @mouseenter="hover = true"
    ref="nodeRef"
  >
    <div v-show="hover && showToolBar" class="node-actions">
      <div class="action-btn start-btn" @click.stop="handleStart">
        <img src="../assets/start.svg" />
      </div>
      <div class="action-btn rename-btn" @click.stop="handleRename">
        <img src="../assets/rename.svg" />
      </div>
      <div class="action-btn remove-btn" @click.stop="handleDelete">
        <img src="../assets/delete.svg" />
      </div>
      <div class="action-btn more-btn" @click.stop="moreAction">
        <img src="../assets/more.svg" />
      </div>
    </div>

    <div class="for-node">
      <div class="node-body">
        <img src="../assets/ForNode.svg" class="node-icon" />
      </div>
      <Handle id="in" type="target" :position="Position.Left" />
      <!-- 循环体 -->
      <Handle id="body" type="source" :position="Position.Right" />
      <!-- 循环结束后 -->
      <Handle id="after" type="source" :position="Position.Bottom" />
    </div>

    <div class="node-title">{{ props.label }}</div>
    <!-- More Panel -->
    <MorePanel
      :showMore="showMore"
      :panelStyle="panelStyle"
      @action="handleAction"
    />
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch,
} from "vue";
import { Position, Handle, useVueFlow } from "@vue-flow/core";
import MorePanel from "../components/MorePanel.vue";
const { removeNodes } = useVueFlow();
const hover = ref(false);
const showMore = ref(false);
const locked = ref(false);
const nodeRef = ref(null);
const panelStyle = ref({
  top: "0px",
  left: "0px",
});
function removeNode() {
  removeNodes([props.id]);
}
const emit = defineEmits([
  "start-node",
  "rename-node",
  "open-node",
  "execute-node",
  "duplicate-node",
  "replace-node",
]);
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
  label: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  position: {
    type: Object,
    required: true,
  },
  showToolBar: {
    type: Boolean,
    default: true,
  },
  closeMorePanel: {
    type: Boolean,
    default: false,
  },
});
watch(
  () => props.closeMorePanel,
  (newVal) => {
    if (newVal == true) {
      showMore.value = false;
      hover.value = false;
      locked.value = false;
    }
  },
);
function closePanel() {
  showMore.value = false;
  locked.value = false;
}
const x = computed(() => `${Math.round(props.position.x)}px`);
const y = computed(() => `${Math.round(props.position.y)}px`);
function handleAction(type) {
  showMore.value = false;

  switch (type) {
    case "open": {
      emit("open-node", props.id);
      break;
    }
    case "rename":
      emit("rename-node", props.id);
      break;
    case "execute":
      emit("execute-node", props.id);
      break;
    case "duplicate":
      emit("duplicate-node", props.id);
      break;
    case "delete":
      removeNode();
      break;
    case "replace":
      emit("replace-node", props.id);
      break;
  }
}
/* 点击外部关闭 */
function handleClickOutside(e) {
  if (!e.target.closest(".node-container")) {
    showMore.value = false;
    hover.value = false;
    locked.value = false; // 解除锁定
  }
}
onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
function handleStart() {
  closePanel(); // 先关闭 panel
  startNode(); // 再执行原逻辑
}
function handleRename() {
  closePanel();
  renameNode();
}
function handleDelete() {
  closePanel();
  removeNode();
}
function startNode() {
  emit("start-node", props.id);
}
function renameNode() {
  ElMessageBox.prompt("请输入新的节点名称", "重命名", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
  })
    .then(({ value }) => {
      updateNode(props.id, { label: value });
    })
    .catch(() => {});
}
function handleMouseLeave() {
  if (!locked.value) {
    hover.value = false;
  }
}
function moreAction() {
  showMore.value = !showMore.value;
  locked.value = showMore.value;

  if (showMore.value) {
    if (!showMore.value) return;

    nextTick(() => {
      const rect = nodeRef.value.getBoundingClientRect();

      const panelWidth = 180; // 和 CSS 一致
      const panelHeight = 220; // 估算高度（或者用offsetHeight更精确）
      const gap = 8;

      let top = rect.top;
      let left = rect.right + gap;

      /* ----------  右侧空间不足 → 显示在左侧 ---------- */
      if (window.innerWidth - rect.right < panelWidth) {
        left = rect.left - panelWidth / 2 - gap;
      }

      /* ----------  底部空间不足 → 向上移动 ---------- */
      if (window.innerHeight - rect.top < panelHeight) {
        top = window.innerHeight - panelHeight - 10;
      }

      /* ----------  防止顶部溢出 ---------- */
      if (top < 10) {
        top = 10;
      }

      panelStyle.value = {
        top: top + "px",
        left: left + "px",
      };
    });
  }
}
</script>

<style scoped lang="scss">
.node-container {
  position: relative;
  display: inline-block;
}
.for-node {
  position: relative;
  width: 90px;
  height: 90px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 8px;
  border: 2px solid #dcdcdc;
  background: #fff;
  font-size: 13px;
}

.node-title {
  padding: 6px;
  border-radius: 8px 8px 0 0;
  text-align: center;
}

.node-body {
  width: 60%;
  height: 60%;
}

.node-actions {
  width: fit-content;
  position: absolute;
  top: -28px;
  left: -10px;
  display: flex;
  gap: 4px;
  background: #fff;
  padding: 4px 6px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.action-btn {
  cursor: pointer;
  border: none;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 12px;
  img {
    width: 12px;
    height: 12px;
  }
}

.action-btn:hover {
  background: #409eff;
  color: #fff;
}
/* 设置 Handle 样式 */
.vue-flow__handle {
  width: 15px;
  height: 15px;
  background: #f9f9f9;
  border: 1px solid #999;
}
.node-icon {
  width: 100%;
  height: 100%;
}
</style>
