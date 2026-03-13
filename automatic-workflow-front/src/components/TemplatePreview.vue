<template>
  <el-dialog
    :model-value="visible"
    width="85%"
    top="3vh"
    title="工作流模板预览"
    :before-close="handleClose"
    destroy-on-close
  >
    <div class="preview-container">
      <!-- 顶部工具栏 -->
      <div class="preview-toolbar">
        <div class="left">
          <span class="template-name">工作流模板</span>
          <el-tag type="info" size="small">
            创建者:{{ preViewData.username }}
          </el-tag>
          <el-tag v-if="isOwner" type="success" size="small"> 我创建的 </el-tag>
          <el-tag
            :type="preViewData.status == 0 ? 'info' : 'success'"
            size="small"
          >
            {{ preViewData.status == 0 ? "草稿" : "已发布" }}
          </el-tag>
        </div>

        <div class="right">
          <el-button
            v-if="isOwner && preViewData.status == 0"
            type="success"
            size="small"
            @click="publishTemplate"
          >
            发布
          </el-button>

          <el-button
            v-if="isOwner && preViewData.status == 1"
            type="warning"
            size="small"
            @click="draftTemplate"
          >
            设为草稿
          </el-button>

          <el-button
            v-if="isOwner"
            type="danger"
            size="small"
            @click="deleteTemplate"
          >
            删除
          </el-button>
        </div>
      </div>
      <!-- 使用节点展示 -->
      <div class="node-list">
        <span class="node-title">使用节点：</span>

        <el-tag
          v-for="name in nodeNames"
          :key="name"
          size="small"
          class="node-tag"
        >
          {{ name }}
        </el-tag>
      </div>
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
  visible: Boolean, // 父组件控制弹窗显示
});

const emit = defineEmits(["update:visible", "delete", "publish", "draft"]);

const nodes = ref(props.nodes || []);
const edges = ref(props.edges || []);
const nodeNames = ref([]);
// 节点类型映射
const nodeTypes = {
  common: CommonNode,
  start: StartNode,
  switch: SwitchNode,
  boolean: BooleanNode,
  for: ForNode,
  when: WhenNode,
};

const edgeTypes = { default: markRaw(DefaultEdge) };
const isOwner = computed(() => {
  return props.preViewData?.userId == localStorage.getItem("userId");
});
// 监听 props 更新
watch(
  () => props.preViewData,
  (val) => {
    nodes.value = stripNodeStatus(JSON.parse(props.preViewData.nodesJson));
    edges.value = stripEdgeStatus(JSON.parse(props.preViewData.edgesJson));

    // 提取节点名称
    const names = [...new Set(nodes.value.map((n) => n.label).filter(Boolean))];
    nodeNames.value = names;
    console.log(123, nodes.value);

    nextTick(() => layoutNodes());
  },
  { deep: true },
);

function publishTemplate() {
  emit("publish", {
    id: props.preViewData.id,
    status: 1,
  });
}

function draftTemplate() {
  emit("draft", {
    id: props.preViewData.id,
    status: 0,
  });
}

function deleteTemplate() {
  ElMessageBox.confirm("确定删除这个模板吗？", "删除确认", {
    type: "warning",
  }).then(() => {
    emit("delete", props.preViewData.id);
  });
}
// 弹窗关闭事件
function handleClose() {
  emit("update:visible", false);
}
function stripEdgeStatus(edges) {
  return edges.map((e) => {
    const data = { ...(e.data || {}) };
    delete data.status;

    return {
      ...e,
      data,
    };
  });
}
function stripNodeStatus(nodes) {
  nodes.forEach((n) => {
    if (n.data && n.data.status) {
      delete n.data.status;
    }
  });
  return nodes;
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
    return { ...node, position: { x: x - 90, y: y - 30 } };
  });
}

onMounted(() => {
  nextTick(() => layoutNodes());
});
</script>

<style scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 顶部工具栏 */
.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  border-bottom: 1px solid #eee;
}

.preview-toolbar .left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.template-name {
  font-size: 16px;
  font-weight: 600;
}

/* 画布 */
.workflow-preview {
  width: 100%;
  height: 680px;
  border-radius: 6px;
  border: 1px solid #e5e6eb;
  background: #fafafa;
}

.flow-preview {
  width: 100%;
  height: 100%;
}
.author {
  display: flex;
  gap: 6px;
  align-items: center;
}
.node-list {
  padding: 0px 12px;
  display: flex;
  flex-direction: row;
  justify-content: start;
  align-items: center;
  flex-wrap: wrap;
}

.node-title {
  font-size: 13px;
  color: #666;
}

.node-tag {
  background: #f2f6fc;
  color: #409eff;
}
</style>
