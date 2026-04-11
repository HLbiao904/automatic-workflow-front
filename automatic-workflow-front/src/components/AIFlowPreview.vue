<template>
  <el-dialog
    v-model="visible"
    width="85%"
    top="3vh"
    title="AI生成工作流预览"
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
import { ref, watch, nextTick, onMounted, markRaw, computed } from "vue";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";

import CommonNode from "../nodes/commonNode.vue";
import StartNode from "../nodes/startNode.vue";
import SwitchNode from "../nodes/switchNode.vue";
import BooleanNode from "../nodes/booleanNode.vue";
import ForNode from "../nodes/forNode.vue";
import WhenNode from "../nodes/whenNode.vue";
import DefaultEdge from "../components/defaultEdge.vue";
import { layoutNodes } from "../tools/commonTools.js";

const props = defineProps({
  preViewData: Object,
  visible: Boolean,
});

const emit = defineEmits(["update:visible"]);

const nodes = ref([]);
const edges = ref([]);
const visible = computed({
  get: () => props.visible,
  set: (val) => {
    emit("update:visible", val);
  },
});
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
watch(
  () => props.visible,
  (val) => {
    if (val) {
      nextTick(() => {
        const res = layoutNodes(nodes.value, edges.value, {
          direction: "LR",
          // compact: true,
        });
        nodes.value = res.nodes;
      });
    }
  },
);
// 监听数据
watch(
  () => props.preViewData,
  (val) => {
    if (!val) return;
    console.log("预览数据:", val);
    nodes.value = stripNodeStatus(parseMaybeJson(val.nodesJson || val.nodes));
    edges.value = stripEdgeStatus(parseMaybeJson(val.edgesJson || val.edges));

    nextTick(() => layoutNodes());
  },
  { deep: true, immediate: true },
);

function parseMaybeJson(data) {
  if (!data) return [];

  // 已经是对象
  if (typeof data === "object") {
    return data;
  }

  // 是字符串才解析
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch (e) {
      console.warn("JSON解析失败:", data);
      return [];
    }
  }

  return [];
}
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

// 关闭
function handleClose() {
  emit("update:visible", false);
}
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
