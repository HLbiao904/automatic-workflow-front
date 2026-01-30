<script setup>
import { ref, onMounted, markRaw, computed } from "vue";
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
import paramsDialog from "./components/paramsDialog.vue";
const { project, addEdges, getViewport } = useVueFlow();
const activeNode = ref(null);
const showNodesDialog = ref(false);

const showParamsDialog = ref(false);
const paramsDialogFormData = ref({});
const paramsDialogRules = ref({});
const paramsDialogRef = ref(null);
const activeCategories = ref([]); // 展开的分类
const showSidebar = ref(true);
const flowWrapper = ref(null);
const vueFlow = ref(null);
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
onMounted(() => {
  // 获取节点列表
  service.get("flow/getNodes").then((res) => {
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
    const position = project({
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

    document.onmouseup = null;
  };
}

function onNodeClick({ node }) {
  activeNode.value = node;
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

function onConnect(edgesParams) {
  const { source, target, sourceHandle, targetHandle } = edgesParams;

  // 1️⃣ 禁止自己连自己
  if (source === target) {
    alert("不能连接自己");
    return;
  }

  const sh = norm(sourceHandle);
  const th = norm(targetHandle);

  // 2️⃣ 只允许 out -> in
  if (!isOut(sh) || !isIn(th)) {
    alert("只能从 out 连接到 in");
    return;
  }

  const sourceNode = nodes.value.find((n) => n.id === source);
  if (!sourceNode) return;

  // 3️⃣ when.out 允许多连
  const allowMultiSource = sourceNode.type === "when" && sh === "parallel";

  // 4️⃣ handle 占用判断（关键）
  const sourceHandleUsed = handleUsed(source, sh);
  const targetHandleUsed = handleUsed(target, th);

  if ((!allowMultiSource && sourceHandleUsed) || targetHandleUsed) {
    alert("该连接点已被占用");
    return;
  }

  // 5️⃣ 添加边
  edges.value.push({
    id: `${source}-${sh}-${target}-${th}`,
    ...edgesParams,
    type: "default",
    markerEnd: MarkerType.ArrowClosed,
    //data: { label: "123" },// 线label
  });
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
function generateEL() {
  // 只取已经连线的节点
  const connectedNodeIds = new Set(
    edges.value.flatMap((e) => [e.source, e.target]),
  );
  const activeNodes = nodes.value.filter((n) => connectedNodeIds.has(n.id));

  if (activeNodes.length === 0) {
    ElMessage.primary("无可用工作流");
    return;
  }

  try {
    validateGraph(nodes.value, edges.value);
    console.log("图合法");
  } catch (err) {
    ElMessage.primary(err.message);
  }
  try {
    validateGraph(activeNodes, edges.value);
    const el = compileFlow(activeNodes, edges.value);
    console.log("生成 EL:", el);
    const chainId = Date.now().toString();

    const relations = getRelateNodes();
    console.log("节点关系:", relations);

    stompClient.subscribe(`/workflow/flow/${chainId}`, (msg) => {
      const data = JSON.parse(msg.body);
      console.log("Received flow event:", data);
    });

    service
      .post("flow/execute", {
        chainId,
        el,
        relations,
      })
      .then((res) => {
        console.log("Execute response:", res);
      });
  } catch (err) {
    alert(err.message);
  }
}

const nodes = ref([
  /*  {
    id: "1",
    type: "start",
    position: { x: 250, y: 5 },
    data: { label: "开始" },
  }, */
]);

const edges = ref([]);
</script>

<template>
  <div class="flow-editor">
    <SideBar v-model:showSidebar="showSidebar" />
    <div class="nodeButtonWrapper">
      <button class="icon-btn" type="primary" @click="showNodesDialog = true">
        <img class="btn-img" src="./assets/addNode.svg" />
      </button>
      <button class="icon-btn" type="primary">
        <img class="btn-img" src="./assets/searchNode.svg" />
      </button>
    </div>

    <el-button
      class="execute-btn"
      type="success"
      size="large"
      @click="generateEL"
    >
      ▶ 执行流程
    </el-button>

    <el-drawer
      v-model="showNodesDialog"
      direction="rtl"
      size="25%"
      :with-header="false"
      :modal="false"
      :modal-penetrable="true"
      class="node-drawer"
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
      <VueFlow
        ref="vueFlow"
        v-model:nodes="nodes"
        v-model:edges="edges"
        class="flow"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        @node-click="onNodeClick"
        @connect="onConnect"
      >
        <Controls />
        <MiniMap pannable zoomable />
        <Background pattern-color="#aaa" :gap="16" variant="dots" />
      </VueFlow>
    </div>

    <ParamsDialog
      ref="paramsDialogRef"
      v-model:showParamsDialog="showParamsDialog"
      :paramsDialogFormData="paramsDialogFormData"
      :paramsDialogRules="paramsDialogRules"
      :activeNode="activeNode"
    />
  </div>
</template>

<style lang="scss" scoped>
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
}

.nodeButtonWrapper {
  width: 42px;
  position: absolute;
  top: 10px;
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
  flex: 14;
  position: relative;
}

.flow {
  height: 100%;
  width: 100%;
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

.node-drawer {
  pointer-events: auto;
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
