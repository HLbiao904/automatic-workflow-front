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
        <div class="left user-info">
          <img class="avatar" :src="preViewData.avatar || defaultAvatar" />

          <div class="meta">
            <div class="top-row">
              <span class="name">{{ preViewData.username }}</span>

              <div class="badges inline">
                <div v-if="isOwner" class="badge owner">👑 我创建的</div>

                <div
                  class="badge"
                  :class="preViewData.status == 0 ? 'draft' : 'published'"
                >
                  {{ preViewData.status == 0 ? "草稿" : "已发布" }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="right actions">
          <button
            v-if="isOwner && preViewData.status == 0"
            class="action-btn publish"
            @click="publishTemplate"
          >
            发布
          </button>

          <button
            v-if="isOwner && preViewData.status == 1"
            class="action-btn draft"
            @click="draftTemplate"
          >
            草稿
          </button>

          <button
            v-if="isOwner"
            class="action-btn delete"
            @click="deleteTemplate"
          >
            删除
          </button>
        </div>
      </div>
      <!-- 使用节点展示 -->
      <div class="node-list">
        <div class="badge-group compact">
          <div v-for="name in nodeNames" :key="name" class="badge node-badge">
            <img
              v-if="nodeIconMap[name]"
              :src="nodeIconMap[name]"
              class="badge-icon"
            />
            <span>{{ name }}</span>
          </div>
        </div>
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
import service from "../service";

const props = defineProps({
  preViewData: Object,
  visible: Boolean, // 父组件控制弹窗显示
});

const emit = defineEmits(["update:visible", "delete", "publish", "draft"]);

const nodes = ref(props.nodes || []);
const edges = ref(props.edges || []);
const nodeNames = ref([]);
const nodeIconMap = ref({});
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
    service
      .post("/workflowTemplate/getTemplateNodeIconsByLabels", names)
      .then((res) => {
        const map = {};
        res.data.forEach((i) => {
          map[i.label] = i.localIcon || i.icon;
        });
        nodeIconMap.value = map;
      });
    nodeNames.value = names;

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
  ElMessageBox.confirm("确定要删除该模板吗？", "删除确认", {
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    confirmButtonClass: "el-button--danger",
    type: "warning",
  }).then(() => {
    emit("delete", props.preViewData.id);
    handleClose();
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
  /* padding: 10px 14px; */
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  /* margin-bottom: 6px; */
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

.node-list {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  /* padding: 0 6px; */
}

.node-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 6px;

  padding: 4px 10px;
  border-radius: 20px;

  background: linear-gradient(135deg, #f0f4ff, #f9fbff);
  border: 1px solid #e0e7ff;

  transition: all 0.2s;
}

.node-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
}

.node-icon {
  width: 16px;
  height: 16px;
}

.node-label {
  font-size: 12px;
  color: #333;
}
.node-title {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  margin-right: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;

  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
}

.meta {
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.tags {
  display: flex;
  gap: 6px;
  margin-top: 2px;
}
.badges {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

/* 通用 badge（所有标签统一用这个） */
.badge-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  /* margin-top: 8px; */
}
.badge-group.compact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  max-height: 80px; /*  控制高度（核心） */
  overflow-y: auto; /*  超出滚动 */
  padding-right: 4px; /* 防止滚动条遮挡 */
}
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 4px 12px;
  border-radius: 999px;

  font-size: 12px;
  font-weight: 500;

  backdrop-filter: blur(8px);
  transition: all 0.2s ease;

  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* hover 动效 */
.badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
}

/* 节点专用 */
.node-badge {
  background: linear-gradient(135deg, #eef2ff, #f8fafc);
  color: #3730a3;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 14px;
}

/* icon */
.badge-icon {
  width: 16px;
  height: 16px;
}

/* 👑 我创建的 */
.badge.owner {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.2);
}

/* 📝 草稿 */
.badge.draft {
  background: linear-gradient(135deg, #e5e7eb, #f3f4f6);
  color: #374151;
}

/* ✔ 已发布 */
.badge.published {
  background: linear-gradient(135deg, #d1fae5, #a7f3d0);
  color: #065f46;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.2);
}

/* 图标 */
.dot {
  font-size: 12px;
}

/* 关键：一行对齐 */
.top-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badges.inline {
  display: flex;
  gap: 6px;
}
.actions {
  display: flex;
  gap: 8px;
}

/* 通用按钮 */
.action-btn {
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;

  backdrop-filter: blur(6px);
}

/* hover动效 */
.action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
}

/* 发布 */
.action-btn.publish {
  background: linear-gradient(135deg, #34d399, #10b981);
  color: white;
}

/* 草稿 */
.action-btn.draft {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: white;
}

/* 删除 */
.action-btn.delete {
  background: linear-gradient(135deg, #f87171, #ef4444);
  color: white;
}
</style>
