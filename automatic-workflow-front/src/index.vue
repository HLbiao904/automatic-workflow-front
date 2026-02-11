<script setup>
import {
  ref,
  onMounted,
  markRaw,
  computed,
  nextTick,
  watch,
  watchEffect,
} from "vue";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import { useVueFlow, MarkerType, VueFlow } from "@vue-flow/core";
import service from "./service/index.js";
import { Controls } from "@vue-flow/controls";

// these components are only shown as examples of how to use a custom node or edge
// you can find many examples of how to create these custom components in the examples page of the docs
import StartNode from "./nodes/startNode.vue";
import CommonNode from "./nodes/commonNode.vue";
import SwitchNode from "./nodes/switchNode.vue";
import ForNode from "./nodes/forNode.vue";
import BooleanNode from "./nodes/booleanNode.vue";
import WhenNode from "./nodes/whenNode.vue";
import DefaultEdge from "./components/defaultEdge.vue";
import { compileFlow } from "./tools/compiler.js";
import { validateGraph } from "./tools/validate.js";
// import default controls styles
import "@vue-flow/controls/dist/style.css";

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Close } from "@element-plus/icons-vue";

import NodeSearchPanel from "./components/searchNodePanel.vue";
import SideBar from "./components/sideBar.vue";
import EditorTopBar from "./components/EditorTopBar.vue";
import paramsDialog from "./components/paramsDialog.vue";
import ModeSwitch from "./components/modeSwitch.vue";
import ExecutionsPanel from "./components/executionsPanel.vue";
import OverwriteView from "./components/overwrite.vue";
import PersonView from "./components/personPanel.vue";
import Chat from "./components/AiChat.vue";
import VersionPanel from "./components/versionPanel.vue";
const { project, addEdges, getViewport, setNodes } = useVueFlow();
const activeNode = ref(null);
const showNodesDialog = ref(false);
const edges = ref([]);

const showParamsDialog = ref(false);
const paramsDialogFormData = ref({});
const paramsDialogRules = ref({});
const paramsDialogRef = ref(null);
const activeCategories = ref([]); // 展开的分类
const showSidebar = ref(true);
const flowWrapper = ref(null);
const vueFlow = ref(null);
const drawerFlash = ref(false);
const viewMode = ref("overwrite"); // 'editor' | 'executions'
const isDirty = ref(false); // 是否有未保存更改
const saving = ref(false);
const workflowName = ref("未命名工作流");
const currentWorkflowId = ref(
  Number(localStorage.getItem("current_workflow_id")) || null,
);

const nodeTypes = {
  common: markRaw(CommonNode),
  switch: markRaw(SwitchNode),
  for: markRaw(ForNode),
  boolean: markRaw(BooleanNode),
  when: markRaw(WhenNode),
  start: markRaw(StartNode),
};
const edgeTypes = {
  default: markRaw(DefaultEdge),
};
const nodeTemplates = ref([]);
let stompClient = null;
let setNodesFn = null;
let projectFn = null;

onMounted(async () => {
  await nextTick();
  const flow = useVueFlow({ id: "editor-flow" });
  setNodesFn = flow.setNodes;
  projectFn = flow.project;

  // 获取节点列表
  service.get("api/workflow/getNodes").then((res) => {
    const result = res.data.map((item) => {
      return {
        ...item,
        params: JSON.parse(item.params), // 解析 params 字符串
      };
    });
    nodeTemplates.value = [...nodeTemplates.value, ...result];
    console.log("Fetched node templates:", nodeTemplates);
  });

  // 初始化 STOMP 客户端
  const socket = new SockJS("/ws");
  stompClient = new Client({
    webSocketFactory: () => socket,
    debug: (str) => console.log("[STOMP]", str),
  });
  stompClient.onConnect = (frame) => {
    console.log("STOMP connected");
  };
  stompClient.activate(); // 一定要 activate 才会连接

  // 添加开始节
  nodes.value = [
    {
      id: "1",
      type: "start",
      position: {
        x: 250,
        y: 120,
      },
      data: { label: "开始" },
    },
  ];
});

const groupedNodes = computed(() => {
  const map = {};

  nodeTemplates.value.forEach((node) => {
    const code = node.categoryCode || "DEFAULT";

    if (!map[code]) {
      map[code] = {
        categoryCode: code,
        categoryLabel: node.categoryLabel || "未分类",
        categoryOrder: node.categoryOrder ?? 999,
        nodes: [],
      };
    }

    map[code].nodes.push(node);
  });

  // 转数组 + 排序
  return Object.values(map).sort((a, b) => a.categoryOrder - b.categoryOrder);
});

function startDrag(template) {
  const wrapperRect = flowWrapper.value.getBoundingClientRect();
  document.onmouseup = (upEvent) => {
    const position = projectFn({
      x: upEvent.clientX - wrapperRect.left - 45,
      y: upEvent.clientY - wrapperRect.top - 45,
    });

    nodes.value.push({
      id: Date.now().toString(),
      type: template.type.toLowerCase(),
      label: template.label,
      position,
      data: {
        nodeId: template.nodeId,
        params: template.params.map((p) => ({
          name: p.name,
          value: p.value ?? "",
          desc: p.desc ?? "",
        })),
        description: template.description,
      },
    });
    isDirty.value = true;
    document.onmouseup = null;
  };
}

function onNodeClick({ node }) {
  activeNode.value = node;
  // 节点没有nodeId直接返回,避免点击开始节点控制台报错
  if (!node.data.nodeId) return;
  console.log("Node clicked:", node);
  // 复制节点数据到表单对象
  paramsDialogFormData.value = {
    nodeId: node.data.nodeId,
    description: node.data.description,
    type: node.type,
    label: node.label,
    params: node.data.params.map((p) => ({ ...p })),
  };

  showParamsDialog.value = true; // 显示弹窗
}
function norm(h) {
  return h ?? "__default__";
}
function isIn(handle) {
  return handle === "in";
}

function isOut(handle) {
  return handle !== "in";
}

function handleUsed(nodeId, handleId) {
  return edges.value.some(
    (e) =>
      (e.source === nodeId && norm(e.sourceHandle) === handleId) ||
      (e.target === nodeId && norm(e.targetHandle) === handleId),
  );
}
function willCreateCycle(edges, source, target) {
  // 构建邻接表
  const graph = new Map();

  edges.forEach((e) => {
    if (!graph.has(e.source)) {
      graph.set(e.source, []);
    }
    graph.get(e.source).push(e.target);
  });

  // DFS：从 target 出发，看能否走到 source
  const visited = new Set();

  function dfs(node) {
    if (node === source) return true;
    if (visited.has(node)) return false;

    visited.add(node);

    const next = graph.get(node) || [];
    return next.some(dfs);
  }

  return dfs(target);
}

function onConnect(edgesParams) {
  const { source, target, sourceHandle, targetHandle } = edgesParams;

  // 禁止自己连自己
  if (source === target) {
    ElMessage.warning("不能连接自己");
    return;
  }
  // 环路校验
  if (willCreateCycle(edges.value, source, target)) {
    ElMessage.warning("不允许形成环路");
    return;
  }
  const sh = norm(sourceHandle);
  const th = norm(targetHandle);

  // 只允许 out -> in
  if (!isOut(sh) || !isIn(th)) {
    ElMessage.warning("只能从 out 连接到 in");
    return;
  }

  const sourceNode = nodes.value.find((n) => n.id === source);
  if (!sourceNode) return;

  // when.out 允许多连
  const allowMultiSource = sourceNode.type === "when" && sh === "parallel";

  // handle 占用判断（关键）
  const sourceHandleUsed = handleUsed(source, sh);
  const targetHandleUsed = handleUsed(target, th);

  if ((!allowMultiSource && sourceHandleUsed) || targetHandleUsed) {
    ElMessage.warning("该连接点已被占用");
    return;
  }

  // 添加边
  edges.value.push({
    id: `${source}-${sh}-${target}-${th}`,
    ...edgesParams,
    type: "default",
    markerEnd: MarkerType.ArrowClosed,
    //data: { label: "123" },// 线label
  });
  isDirty.value = true;
}

function getRelateNodes() {
  const relations = nodes.value.map((node) => {
    const curId = node.id;
    const preEdge = edges.value.find((e) => e.target === curId);
    const nextEdge = edges.value.find((e) => e.source === curId);
    return {
      preId: preEdge ? preEdge.source : null,
      curId: curId,
      nextId: nextEdge ? nextEdge.target : null,
    };
  });
  return relations;
}
async function generateEL() {
  // 只取已经连线的节点
  const connectedNodeIds = new Set(
    edges.value.flatMap((e) => [e.source, e.target]),
  );
  const activeNodes = nodes.value.filter((n) => connectedNodeIds.has(n.id));

  if (activeNodes.length === 0) {
    ElMessage.warning("无可用工作流");
    return;
  }

  try {
    const isValid = validateGraph(activeNodes, edges.value);
    console.log(isValid);
    if (!isValid) {
      ElMessage.warning("流程不合法");
      return;
    }
    const el = compileFlow(activeNodes, edges.value);
    console.log("生成 EL:", el);
    const chainId = Date.now().toString();

    const relations = getRelateNodes();
    console.log("节点关系:", relations);

    stompClient.subscribe(`/workflow/flow/${chainId}`, (msg) => {
      const data = JSON.parse(msg.body);
      const { id, event } = data;
      let status = "idle";
      if (event === "NODE_START") status = "running";
      if (event === "NODE_SUCCESS") status = "success";
      if (event === "NODE_ERROR") status = "error";

      updateNodeStatus(id, status);
      console.log("Received flow event:", data);
    });
    // 执行工作流
    const res = await service.post("api/workflow/execute", {
      chainId,
      el,
      relations,
    });
    const status = res.data.success ? "SUCCESS" : "ERROR";
    const duration = res.data.duration; // 工作流执行时间
    // 将执行记录入库
    await service.post("api/workflowExecute/execute", {
      userId: 1,
      workflowId: localStorage.getItem("current_workflow_id"),
      dirty: isDirty.value,
      nodes: nodes.value,
      edges: edges.value,
      triggerType: "MANUAL",
      status: status,
      duration: duration,
    });
    isDirty.value = false;
  } catch (err) {
    ElMessage.warning(err.message);
  }
}
// 删除nodes.data下的status属性,避免被持久化
function stripNodeStatus(nodes) {
  return nodes.map((n) => {
    const data = { ...(n.data || {}) };
    delete data.status;

    return {
      ...n,
      data,
    };
  });
}

function updateNodeStatus(id, status) {
  setNodesFn((nodes) =>
    nodes.map((node) =>
      node.id === id
        ? {
            ...node,
            data: {
              ...node.data,
              status,
            },
          }
        : node,
    ),
  );
}
const hideTimers = new Map();

function onEdgeEnter({ edge }) {
  clearTimeout(hideTimers.get(edge.id));
  edge.data ||= {};
  edge.data.hovered = true;
}

function onEdgeLeave({ edge }) {
  const timer = setTimeout(() => {
    edge.data.hovered = false;
    hideTimers.delete(edge.id);
  }, 150);

  hideTimers.set(edge.id, timer);
}

function openDrawer() {
  if (!showNodesDialog.value) {
    showNodesDialog.value = true;
    return;
  }

  // 已经打开了 → 触发闪烁
  drawerFlash.value = false; // 先清
  nextTick(() => {
    drawerFlash.value = true;
    setTimeout(() => {
      drawerFlash.value = false;
    }, 600);
  });
}

const nodes = ref([
  /*  {
    id: "1",
    type: "start",
    position: { x: 250, y: 5 },
    data: { label: "开始" },
  }, */
]);

function showOverwriteView() {
  viewMode.value = "overwrite";
}
function showEditorView({ name, id }) {
  viewMode.value = "editor";
  workflowName.value = name;
  currentWorkflowId.value = id;

  loadLatestVersion(id);
}
// 获取当前工作流最新版本
async function loadLatestVersion(workflowId) {
  const res = await service.get(
    `/workflow/version/${workflowId}/latest-version`,
  );
  const version = res.data;
  // 新建工作流：没有任何版本
  if (!version) {
    // 新建工作流没有版本时往画布添加开始节点
    nodes.value = [
      {
        id: "1",
        type: "start",
        position: { x: 250, y: 5 },
        data: { label: "开始" },
      },
    ];
    edges.value = [];
    isDirty.value = false;
    return;
  }

  edges.value = JSON.parse(version.edgesJson);
  const parsedNodes = JSON.parse(version.nodesJson);
  nodes.value = parsedNodes;

  isDirty.value = false;
}

function showChatView() {
  viewMode.value = "chat";
}
function showPersonView() {
  viewMode.value = "person";
}
// 监听当前工作流 ID 变化，保存到 localStorage
watch(currentWorkflowId, (id) => {
  if (id) {
    localStorage.setItem("current_workflow_id", id);
  } else {
    localStorage.removeItem("current_workflow_id");
  }
});

async function onSave() {
  if (saving.value || !isDirty.value) return;
  // 只取已经连线的节点
  const connectedNodeIds = new Set(
    edges.value.flatMap((e) => [e.source, e.target]),
  );
  const activeNodes = nodes.value.filter((n) => connectedNodeIds.has(n.id));

  if (activeNodes.length === 0) {
    ElMessage.warning("无可用工作流");
    return;
  }

  try {
    validateGraph(activeNodes, edges.value);
  } catch (err) {
    ElMessage.warning(err.message);
    return;
  }
  saving.value = true;
  try {
    await saveWorkflow();
    isDirty.value = false;
    ElMessage.success("保存成功");
  } catch (e) {
    ElMessage.error("保存失败");
  } finally {
    saving.value = false;
  }
}
function saveWorkflow() {
  const payload = {
    workflowId: localStorage.getItem("current_workflow_id"),
    nodes: stripNodeStatus(nodes.value),
    edges: edges.value || [],
  };

  return service.post("/workflow/version/save", payload);
}

function onNodesChange(changes) {
  // 只关心这些类型
  if (changes.some((c) => ["add", "remove", "update"].includes(c.type))) {
    isDirty.value = true;
  }
}

function onEdgesChange(changes) {
  if (changes.some((c) => ["add", "remove", "update"].includes(c.type))) {
    isDirty.value = true;
  }
}
/* const executions = ref([
  // 示例数据
  {
    id: "1001",
    status: "SUCCESS",
    startTime: Date.now() - 60000,
    endTime: Date.now() - 30000,
    events: [
      { event: "NODE_START", timestamp: Date.now() - 59000, nodeId: "1" },
      { event: "NODE_SUCCESS", timestamp: Date.now() - 58000, nodeId: "1" },
      { event: "NODE_START", timestamp: Date.now() - 57000, nodeId: "2" },
      { event: "NODE_SUCCESS", timestamp: Date.now() - 56000, nodeId: "2" },
    ],
  },
  {
    id: "1002",
    status: "RUNNING",
    startTime: Date.now() - 120000,
    endTime: null,
    events: [
      { event: "NODE_START", timestamp: Date.now() - 119000, nodeId: "1" },
      { event: "NODE_SUCCESS", timestamp: Date.now() - 118000, nodeId: "1" },
      { event: "NODE_START", timestamp: Date.now() - 117000, nodeId: "2" },
    ],
  },
]); */
</script>

<template>
  <div class="flow-editor">
    <ModeSwitch
      v-model:viewMode="viewMode"
      class="modeSwitch"
      v-if="
        viewMode != 'overwrite' && viewMode != 'chat' && viewMode != 'person'
      "
    />
    <SideBar
      v-model:showSidebar="showSidebar"
      @showOverwrite="showOverwriteView"
      @showChat="showChatView"
      @showPerson="showPersonView"
    />
    <div class="nodeButtonWrapper" v-if="viewMode == 'editor'">
      <button class="icon-btn" type="primary" @click="showNodesDialog = true">
        <img class="btn-img" src="./assets/addNode.svg" />
      </button>
      <button class="icon-btn" type="primary">
        <img class="btn-img" src="./assets/searchNode.svg" />
      </button>
    </div>

    <el-button
      v-if="viewMode == 'editor'"
      class="execute-btn"
      type="success"
      size="large"
      @click="generateEL"
    >
      ▶ 执行流程
    </el-button>

    <el-drawer
      v-if="viewMode == 'editor'"
      v-model="showNodesDialog"
      direction="rtl"
      size="25%"
      :with-header="false"
      :modal="false"
      :modal-penetrable="true"
      :class="['nodes-drawer', { flash: drawerFlash }]"
    >
      <div class="drawer-header">
        <span>节点库</span>
        <el-button circle size="small" @click="showNodesDialog = false"
          ><el-icon><Close /></el-icon
        ></el-button>
      </div>
      <NodeSearchPanel :nodes="nodeTemplates" @node-drag-start="startDrag" />
    </el-drawer>

    <div class="center-panel" ref="flowWrapper">
      <EditorTopBar
        class="topbar"
        v-if="
          viewMode != 'overwrite' && viewMode != 'chat' && viewMode != 'person'
        "
        v-model:name="workflowName"
        :dirty="isDirty"
        @save="onSave"
      />

      <div class="content">
        <OverwriteView
          v-if="viewMode == 'overwrite'"
          @goEditor="showEditorView"
        />
        <PersonView
          v-if="viewMode == 'person'"
          @goEditorFromPerson="showEditorView"
        />
        <AiChat v-if="viewMode == 'chat'" />
        <VueFlow
          id="editor-flow"
          v-show="viewMode === 'editor'"
          ref="vueFlow"
          v-model:nodes="nodes"
          v-model:edges="edges"
          class="flow"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          @node-click="onNodeClick"
          @connect="onConnect"
          @edgeMouseEnter="onEdgeEnter"
          @edgeMouseLeave="onEdgeLeave"
          @nodesChange="onNodesChange"
          @edgesChange="onEdgesChange"
        >
          <template #node-common="nodeProps">
            <CommonNode v-bind="nodeProps" @add-node="openDrawer" />
          </template>
          <Controls />
          <MiniMap pannable zoomable />
          <Background pattern-color="#aaa" :gap="16" variant="dots" />
        </VueFlow>

        <ExecutionsPanel
          v-show="viewMode === 'executions'"
          :workflowId="currentWorkflowId"
        />
        <VersionPanel
          v-show="viewMode === 'versions'"
          :workflowId="currentWorkflowId"
        />
      </div>
    </div>

    <ParamsDialog
      v-if="showParamsDialog"
      ref="paramsDialogRef"
      v-model:showParamsDialog="showParamsDialog"
      :paramsDialogFormData="paramsDialogFormData"
      :paramsDialogRules="paramsDialogRules"
      :activeNode="activeNode"
    />
  </div>
</template>

<style lang="scss">
/* import the necessary styles for Vue Flow to work */
@import "@vue-flow/core/dist/style.css";
/* import the default theme, this is optional but generally recommended */
@import "@vue-flow/core/dist/theme-default.css";
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

.flow-editor {
  display: flex;
  height: 100vh;
  width: 100%;
  position: relative;
  overflow: hidden;
  pointer-events: auto;
}
.topbar {
  height: 56px;
  flex-shrink: 0;
}
.content {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.nodeButtonWrapper {
  width: 42px;
  position: absolute;
  top: 66px;
  right: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 6px;
  z-index: 10;
}

.icon-btn {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #fff;
  border-radius: 5px;
  cursor: pointer;
}

.btn-img {
  width: 18px;
  height: 18px;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.flow {
  flex: 1;
  min-height: 0;
}
.modeSwitch {
  position: fixed;
  left: 50%;
  top: 5%;
  transform: translateX(-50%);
  z-index: 1000;
}
.execute-btn {
  position: fixed;
  left: 50%;
  bottom: 15%;
  transform: translateX(-50%);
  z-index: 1000;

  padding: 12px 28px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 24px;
  box-shadow: 0 6px 18px rgba(64, 158, 255, 0.35);
}

.nodes-drawer {
  top: 49px !important;
  pointer-events: auto;
}
.nodes-drawer.flash {
  animation: drawer-flash 0.6s ease;
}

@keyframes drawer-flash {
  0% {
    box-shadow: inset 4px 0 0 #409eff;
  }
  50% {
    box-shadow: inset 8px 0 0 #409eff;
  }
  100% {
    box-shadow: inset 4px 0 0 transparent;
  }
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.node-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.node-item {
  cursor: grab;
  margin-bottom: 6px;
  user-select: none;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.node-item:hover {
  transform: translateX(-1px);
}

.node-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-name {
  font-size: 14px;
  font-weight: 500;
}

.node-type {
  font-size: 12px;
  color: #999;
}

.node-category {
  margin-bottom: 12px;
}

.category-title {
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin: 8px 4px;
  padding-left: 4px;
  border-left: 3px solid #409eff;
}

.el-collapse-item__header {
  padding-left: 6px;
}
</style>
