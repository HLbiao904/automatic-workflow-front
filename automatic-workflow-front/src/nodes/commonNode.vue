<template>
  <div
    class="node-container"
    @mouseleave="hover = false"
    @mouseenter="hover = true"
  >
    <div v-show="hover" class="node-actions">
      <button class="action-btn" @click.stop="removeNode">✕</button>
      <button class="action-btn">✎</button>
      <button class="action-btn">⎘</button>
    </div>

    <div class="common-node">
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
        <span class="plus">+</span>
      </div>
    </div>

    <div class="node-title">{{ props.label }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Position, Handle, useVueFlow } from "@vue-flow/core";
import { NodeToolbar } from "@vue-flow/node-toolbar";
const { removeNodes, edges } = useVueFlow();
const hover = ref(false);
const outputId = "out";
const emit = defineEmits(["add-node"]);
function removeNode() {
  removeNodes([props.id]);
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
});

const x = computed(() => `${Math.round(props.position.x)}px`);
const y = computed(() => `${Math.round(props.position.y)}px`);
onMounted(() => {
  console.log("commonNode mounted with data:", props.data);
  console.log("Node ID:", props.id, "Node Position:", props.position);
});
</script>

<style scoped>
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
}
</style>
