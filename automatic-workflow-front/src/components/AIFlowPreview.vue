<template>
  <el-dialog
    v-model="visible"
    width="90%"
    top="2vh"
    title="AI生成工作流预览"
    class="ai-flow-dialog"
    destroy-on-close
  >
    <div class="preview-wrapper">
      <div class="top-panel">
        <div class="info-card prompt">
          <span class="label">💡 需求</span>
          <span class="value">
            {{ props.preViewData?.prompt || "暂无内容" }}
          </span>
        </div>

        <div class="info-card">
          <div class="label">节点</div>
          <div class="value number">{{ nodes.length }}</div>
        </div>

        <div class="info-card">
          <div class="label">连线</div>
          <div class="value number">{{ edges.length }}</div>
        </div>
        <el-button type="primary" size="default" @click="applyToCanvas"
          >应用到画布</el-button
        >
      </div>

      <!-- 画布区域 -->
      <div class="canvas-card">
        <VueFlow
          v-model:nodes="nodes"
          v-model:edges="edges"
          class="flow-preview"
          :fit-view="true"
          :nodes-draggable="false"
          :nodes-connectable="false"
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

          <MiniMap />
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
import DefaultEdge from "../edges/defaultEdge.vue";
import { layoutNodes } from "../tools/commonTools.js";

const props = defineProps({
  preViewData: Object,
  visible: Boolean,
});

const emit = defineEmits(["update:visible", "apply-flow"]);

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

    const rawNodes = parseMaybeJson(val.nodesJson || val.nodes);
    const rawEdges = parseMaybeJson(val.edgesJson || val.edges);

    // 彻底断引用
    nodes.value = stripNodeStatus(JSON.parse(JSON.stringify(rawNodes)));
    edges.value = stripEdgeStatus(JSON.parse(JSON.stringify(rawEdges)));

    nextTick(() => {
      const res = layoutNodes(
        JSON.parse(JSON.stringify(nodes.value)),
        JSON.parse(JSON.stringify(edges.value)),
        { direction: "LR" },
      );

      nodes.value = res.nodes;
    });
  },
  { deep: true, immediate: true },
);
function applyToCanvas() {
  emit("apply-flow", {
    aiNodes: nodes.value,
    aiEdges: edges.value,
  });
  handleClose();
}
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
.ai-flow-dialog :deep(.el-dialog__body) {
  padding: 12px;
  background: #f6f7fb;
}

.preview-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 画布 */
.canvas-card {
  height: 680px;
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.top-panel {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

/* 通用卡片 */
.info-card {
  background: #fff;
  border-radius: 10px;
  padding: 6px 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);

  display: flex;
  align-items: center;
  /* flex-direction: column; */
  justify-content: start;

  min-height: 30px;
}

/* prompt 占大部分宽度 */
.info-card.prompt {
  flex: 1;
}

/* 统计卡片固定宽度 */
.info-card:not(.prompt) {
  width: 120px;
  text-align: center;
}

/* 标题 */
.label {
  font-size: 14px;
  color: #888;
  margin-right: 6px;
}

/* 内容 */
.value {
  font-size: 14px;
  line-height: 1.6;
  color: #1f2937;

  font-weight: 500;
  letter-spacing: 0.2px;

  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 数字强调 */
.value.number {
  font-size: 18px;
  font-weight: 600;
  color: #409eff;
}
</style>
