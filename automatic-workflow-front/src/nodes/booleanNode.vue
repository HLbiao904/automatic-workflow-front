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
    <div class="boolean-node">
      <div class="node-body">
        <img src="../assets/flagBoolean.svg" class="node-icon" />
      </div>

      <Handle id="in" type="target" :position="Position.Left" />
      <Handle
        id="true"
        type="source"
        :position="Position.Right"
        style="top: 33%"
      />
      <Handle
        id="false"
        type="source"
        :position="Position.Right"
        style="top: 66%"
      />
    </div>
    <div class="node-title">{{ props.label }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { Position, Handle, useVueFlow } from "@vue-flow/core";
const { removeNodes } = useVueFlow();
const hover = ref(false);
function removeNode() {
  removeNodes([props.id]);
}
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
  console.log("booleanNode mounted with data:", props.data);
  console.log("Node ID:", props.id, "Node Position:", props.position);
});
</script>

<style scoped>
.node-container {
  position: relative;
  display: inline-block;
}
.boolean-node {
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
</style>
