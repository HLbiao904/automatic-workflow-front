<script setup>
import { ref, onMounted, markRaw } from "vue";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import { useVueFlow } from "@vue-flow/core";
import service from "./service/index.js";
import { Controls } from "@vue-flow/controls";

// these components are only shown as examples of how to use a custom node or edge
// you can find many examples of how to create these custom components in the examples page of the docs
import CommonNode from "./nodes/commonNode.vue";
import SwitchNode from "./nodes/switchNode.vue";
import ForNode from "./nodes/forNode.vue";
import BooleanNode from "./nodes/booleanNode.vue";
import WhenNode from "./nodes/whenNode.vue";
import { compileFlow } from "./tools/compiler.js";
import { validateGraph } from "./tools/validate.js";
// import default controls styles
import "@vue-flow/controls/dist/style.css";

import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { Close } from "@element-plus/icons-vue";

const { project, addEdges } = useVueFlow();
const activeNode = ref(null);
const showNodesDialog = ref(false);

const paramsDialog = ref(false);
const paramsDialogFormData = ref({});
const paramsDialogRules = ref({});
const paramsDialogRef = ref(null);
const nodeTypes = {
  common: markRaw(CommonNode),
  switch: markRaw(SwitchNode),
  for: markRaw(ForNode),
  boolean: markRaw(BooleanNode),
  when: markRaw(WhenNode),
};
const nodeTemplates = ref([
  {
    id: Date.now().toString(),
    type: "WHEN",
    label: "并行节点",
    nodeId: "whenNode",
    params: [],
  },
]);
let stompClient = null;
onMounted(() => {
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

  const socket = new SockJS("/ws");
  stompClient = new Client({
    webSocketFactory: () => socket,
    debug: (str) => console.log("[STOMP]", str),
  });
  stompClient.onConnect = (frame) => {
    console.log("STOMP connected");
  };
  stompClient.activate(); // 一定要 activate 才会连接
});

function startDrag(template) {
  document.onmouseup = (e) => {
    const position = project({ x: e.clientX, y: e.clientY });

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

  paramsDialog.value = true; // 显示弹窗
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

function onConnect(params) {
  const { source, target, sourceHandle, targetHandle } = params;

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
    ...params,
  });
}
function onSubmit() {
  paramsDialog.value = false;
}
function onConceal() {
  paramsDialog.value = false;
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
  {
    id: "1",
    type: "input",
    position: { x: 250, y: 5 },
    data: { label: "开始" },
  },
]);

const edges = ref([]);
</script>

<template>
  <div class="flow-editor">
    <div class="nodeButtonWrapper">
      <button class="icon-btn" type="primary" @click="showNodesDialog = true">
        <img class="btn-img" src="./assets/addNode.svg" />
      </button>
      <button class="icon-btn" type="primary">
        <img class="btn-img" src="./assets/searchNode.svg" />
      </button>
      <!--  <button class="icon-btn" type="primary">
        <img class="btn-img" src="../assets/addNode.svg" />
      </button>
      <button class="icon-btn" type="primary">
        <img class="btn-img" src="../assets/addNode.svg" />
      </button> -->
    </div>

    <el-button
      class="execute-btn"
      type="success"
      size="large"
      @click="generateEL"
    >
      ▶ 执行流程
    </el-button>

    <!-- 自定义 Drawer -->
    <el-drawer
      v-model="showNodesDialog"
      direction="rtl"
      size="25%"
      :with-header="false"
      :modal="false"
      :modal-penetrable="true"
      class="node-drawer"
    >
      <!-- Header -->
      <div class="drawer-header">
        <span>节点库</span>
        <el-button circle size="small" @click="showNodesDialog = false"
          ><el-icon><Close /></el-icon
        ></el-button>
      </div>

      <!-- Node list -->
      <div class="node-list">
        <el-card
          v-for="n in nodeTemplates"
          :key="n.id"
          shadow="hover"
          class="node-item"
          @mousedown.prevent="startDrag(n)"
        >
          <div class="node-row">
            <span class="node-name">{{ n.label }}</span>
            <span class="node-type">{{ n.type }}</span>
          </div>
        </el-card>
      </div>
    </el-drawer>

    <div class="center-panel">
      <VueFlow
        v-model:nodes="nodes"
        v-model:edges="edges"
        class="flow"
        :node-types="nodeTypes"
        @node-click="onNodeClick"
        @connect="onConnect"
      >
        <Controls />
        <MiniMap pannable zoomable />
        <Background pattern-color="#aaa" :gap="16" variant="dots" />
      </VueFlow>
    </div>

    <el-dialog
      title="节点参数"
      v-model="paramsDialog"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="paramsDialogFormData"
        ref="paramsDialogRef"
        :rules="paramsDialogRules"
        label-width="100px"
        :inline="false"
      >
        <el-form-item label="nodeId">
          <el-input
            v-model="paramsDialogFormData.nodeId"
            :disabled="true"
          ></el-input>
        </el-form-item>
        <el-form-item label="Description">
          <el-input
            v-model="paramsDialogFormData.description"
            :disabled="true"
          ></el-input>
        </el-form-item>
        <el-form-item label="Type">
          <el-input
            v-model="paramsDialogFormData.type"
            :disabled="true"
          ></el-input>
        </el-form-item>
        <!-- <el-form-item label="Label">
          <el-input v-model="paramsDialogFormData.label"></el-input>
        </el-form-item> -->
        <el-form-item
          v-for="p in activeNode.data.params"
          :key="p.name"
          :label="p.name"
        >
          <el-input
            :id="`param-${p.name}`"
            v-model="p.value"
            :placeholder="p.desc"
          ></el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="onSubmit">保存</el-button>
          <el-button @click="onConceal">取消</el-button>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<style>
/* import the necessary styles for Vue Flow to work */
@import "@vue-flow/core/dist/style.css";
/* import the default theme, this is optional but generally recommended */
@import "@vue-flow/core/dist/theme-default.css";
html,
body,
#app {
  height: 100%;
  margin: 0;
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
  flex: 1;
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

/* 自定义 drawer 样式 */
.node-drawer {
  pointer-events: auto;
}

/* Header */
.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  font-size: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

/* 列表整体 */
.node-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px; /* 行距重点在这 */
}

/* 单个节点 */
.node-item {
  cursor: grab;
  user-select: none;
  border-radius: 8px;
  padding: 6px 10px;
  transition: all 0.2s ease;
}

.node-item:hover {
  transform: translateX(-2px);
}

/* 行布局 */
.node-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 左侧名称 */
.node-name {
  font-size: 14px;
  font-weight: 500;
}

/* 右侧类型标识 */
.node-type {
  font-size: 12px;
  color: #999;
}
</style>
