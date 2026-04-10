<template>
  <el-dialog
    :model-value="visible"
    width="85%"
    top="3vh"
    title="工作流预览"
    :before-close="handleClose"
    destroy-on-close
  >
    <div class="preview-container">
      <!-- 工作流画布 -->
      <div class="workflow-preview">
        <VueFlow
          id="preview-flow"
          ref="vueFlow"
          v-model:nodes="nodes"
          v-model:edges="edges"
          class="flow-preview"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :fit-view="true"
          :nodes-draggable="false"
          :nodes-connectable="false"
          :elements-selectable="false"
          :zoom-on-scroll="false"
          :pan-on-scroll="true"
          :pan-on-drag="true"
        >
          <template #node-common="nodeProps">
            <CommonNode v-bind="nodeProps" :previewMode="true" />
          </template>

          <template #node-start="nodeProps">
            <StartNode v-bind="nodeProps" :previewMode="true" />
          </template>

          <template #node-switch="nodeProps">
            <SwitchNode v-bind="nodeProps" :previewMode="true" />
          </template>

          <template #node-boolean="nodeProps">
            <BooleanNode v-bind="nodeProps" :previewMode="true" />
          </template>

          <template #node-for="nodeProps">
            <ForNode v-bind="nodeProps" :previewMode="true" />
          </template>

          <template #node-when="nodeProps">
            <WhenNode v-bind="nodeProps" :previewMode="true" />
          </template>

          <MiniMap pannable zoomable />
          <Background pattern-color="#ccc" :gap="16" variant="dots" />
        </VueFlow>
      </div>
    </div>
  </el-dialog>
</template>
<script setup>
import { ref, watch, nextTick, onMounted, markRaw } from "vue";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import dagre from "dagre";

import CommonNode from "../nodes/commonNode.vue";
import StartNode from "../nodes/startNode.vue";
import SwitchNode from "../nodes/switchNode.vue";
import BooleanNode from "../nodes/booleanNode.vue";
import ForNode from "../nodes/forNode.vue";
import WhenNode from "../nodes/whenNode.vue";
import DefaultEdge from "../components/defaultEdge.vue";

const props = defineProps({
  preViewData: Object,
  visible: Boolean,
});

const emit = defineEmits(["update:visible"]);

const nodes = ref([]);
const edges = ref([]);

// 节点类型
const nodeTypes = {
  common: CommonNode,
  start: StartNode,
  switch: SwitchNode,
  boolean: BooleanNode,
  for: ForNode,
  when: WhenNode,
};

const edgeTypes = {
  default: markRaw(DefaultEdge),
};

// 监听数据
watch(
  () => props.preViewData,
  (val) => {
    if (!val) return;

    nodes.value = stripNodeStatus(JSON.parse(val.nodesJson || "[]"));
    edges.value = stripEdgeStatus(JSON.parse(val.edgesJson || "[]"));

    nextTick(() => layoutNodes());
  },
  { deep: true, immediate: true },
);

// 去除状态字段
function stripEdgeStatus(edges) {
  return edges.map((e) => {
    const data = { ...(e.data || {}) };
    delete data.status;
    return { ...e, data };
  });
}

function stripNodeStatus(nodes) {
  return nodes.map((n) => {
    if (n.data?.status) {
      delete n.data.status;
    }
    return n;
  });
}

// 自动布局
function layoutNodes(direction = "LR") {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: direction, marginx: 50, marginy: 50 });
  g.setDefaultEdgeLabel(() => ({}));

  nodes.value.forEach((node) => {
    g.setNode(node.id, { width: 180, height: 60 });
  });

  edges.value.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  nodes.value = nodes.value.map((node) => {
    const { x, y } = g.node(node.id);
    return {
      ...node,
      position: { x: x - 90, y: y - 30 },
    };
  });
}

// 关闭
function handleClose() {
  emit("update:visible", false);
}

onMounted(() => {
  nextTick(() => layoutNodes());
});
</script>
<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
}

/* 画布 */
.workflow-preview {
  width: 100%;
  height: 680px;
  border-radius: 6px;
  border: 1px solid #e5e6eb;
  background: #fafafa;
}
</style>
