<template>
  <div
    class="node-container"
    ref="nodeRef"
    @mouseleave="handleMouseLeave"
    @mouseenter="hover = true"
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

    <div :class="['common-node', statusClass]">
      <div class="node-body">
        <img src="../assets/code-solid-full.svg" class="node-icon" />
      </div>
      <Handle
        id="in"
        type="target"
        :position="Position.Left"
        style="top: 50%"
      />
      <Handle
        id="out"
        type="source"
        :position="Position.Right"
        style="top: 50%"
      />
      <!-- n8n 风格加号 -->
      <div v-if="!isConnected" class="add-wrapper" @click.stop="addNode">
        <span class="dash-line"></span>
        <span class="plus"><img src="../assets/add.svg" alt="" /></span>
      </div>
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
  onUpdated,
  nextTick,
  watch,
} from "vue";
import { Position, Handle, useVueFlow } from "@vue-flow/core";
import { NodeToolbar } from "@vue-flow/node-toolbar";
import MorePanel from "../components/MorePanel.vue";
const { removeNodes, edges, updateNode } = useVueFlow();
const hover = ref(false);
const outputId = "out";
const showMore = ref(false);
const locked = ref(false);
const emit = defineEmits([
  "add-node",
  "start-node",
  "open-node",
  "execute-node",
  "duplicate-node",
  "replace-node",
]);
const nodeRef = ref(null);
const panelStyle = ref({
  top: "0px",
  left: "0px",
});
const x = computed(() => `${Math.round(props.position.x)}px`);
const y = computed(() => `${Math.round(props.position.y)}px`);
const statusClass = computed(() => {
  return (
    {
      running: "node-running",
      success: "node-success",
      error: "node-error",
    }[props.data.status] || ""
  );
});
function closePanel() {
  showMore.value = false;
  locked.value = false;
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
function removeNode() {
  removeNodes([props.id]);
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
function handleAction(type) {
  showMore.value = false;

  switch (type) {
    case "open": {
      emit("open-node", props.id);
      break;
    }
    case "rename":
      handleRename();
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
function addNode() {
  emit("add-node");
}
const isConnected = computed(() =>
  edges.value.some((e) => e.source === props.id && e.sourceHandle === outputId),
);
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
</script>

<style scoped lang="scss">
.node-container {
  position: relative;
  display: inline-block;
}
.common-node {
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
/* 设置添加节点样式 */
.out-handle {
  background: #409eff;
}

.add-wrapper {
  position: absolute;
  right: -75px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  cursor: pointer;
}

.dash-line {
  width: 42px;
  height: 2px;
  /*   background: repeating-linear-gradient(
    to right,
    #c0c4cc,
    #c0c4cc 4px,
    transparent 4px,
    transparent 8px
  ); */
  background: #c0c4cc;
}

.plus {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: 1px solid #c0c4cc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  img {
    width: 12px;
    height: 12px;
  }
}

.common-node.node-running {
  border: 3px solid transparent;
  border-radius: 8px;
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, #00ffcc, #00ccff, #00ffcc) border-box;

  background-size:
    100% 100%,
    300% 300%;

  animation: borderFlow 1.2s linear infinite;
}

@keyframes borderFlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 300% 50%;
  }
}

.common-node.node-success {
  border: 2px solid #00cc66;
  border-radius: 8px;
}

.common-node.node-error {
  border: 2px solid #ff4d4f;
  border-radius: 8px;
}
</style>
