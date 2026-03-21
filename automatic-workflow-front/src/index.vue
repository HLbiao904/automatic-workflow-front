<script setup>
import {
  ref,
  onMounted,
  markRaw,
  computed,
  nextTick,
  watch,
  watchEffect,
  toRaw,
} from "vue";
import { Background } from "@vue-flow/background";
import { MiniMap } from "@vue-flow/minimap";
import { useVueFlow, MarkerType, VueFlow } from "@vue-flow/core";
import service from "./service/index.js";
import { Controls, ControlButton } from "@vue-flow/controls";

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
import { dynamicCompileFlow } from "./tools/dynamicComplier.js";
import { validateGraph } from "./tools/validate.js";
import layoutGraph from "./tools/layoutGraph.js";
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
import GlobalSearchDialog from "./components/GlobalSearchDialog.vue";
import Dashboard from "./components/Dashboard.vue";
import TemplateShowPage from "./components/TemplateShowPage.vue";
import CreateTemplateDialog from "./components/CreateTemplateDialog.vue";
import NodeConfiguration from "./components/NodeConfiguration.vue";
import UserConfiguration from "./components/UserConfiguration.vue";
import { ElMessage } from "element-plus";

const {
  project,
  addEdges,
  getViewport,
  setNodes,
  updateNode,
  fitView,
  viewportInitialized,
} = useVueFlow();
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
const relations = ref(null);
const currentWorkflowId = ref(
  Number(localStorage.getItem("current_workflow_id")) || null,
);
const nodeRuntimeData = ref({});
const closeMorePanel = ref(null);
const replaceNodeId = ref(null);
const isReplaceNode = ref(false);
const switchBranchData = ref({}); // 用于存储分支节点的分支数据，避免切换节点时丢失
const booleanBranchData = ref({}); // 用于存储布尔节点的分支数据
const executionsPanelRef = ref(null);
const versionsPanelRef = ref(null);
const searchVisible = ref(false);
const workflowList = ref([]);
const showTemplateDialog = ref(false);

const templateCategories = ref([]);
const isCreateTemplate = ref(false);
const createTemplateData = ref(null);
const sideBarActiveMenu = ref({ viewMode: "" });

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
  // 获取工作流列表
  const res = await service.get("/api/workflow/list", {
    params: { userId: localStorage.getItem("userId") },
  });
  workflowList.value = res.data || [];
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
  ]; // 获取模板分类列表
  service.get("/workflowTemplate/templateCategoryList").then((res) => {
    if (res.status == 200) {
      templateCategories.value = [...res.data];
    }
  });
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
const activeRuntimeData = computed(() => {
  if (!activeNode.value) return null;
  return nodeRuntimeData.value[activeNode.value.id];
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
          type: p.type ?? "",
          component: p.component ?? "",
          required: p.required ?? false,
          options: p.options ?? [],
          defaultValue: p.defaultValue ?? null,
        })),
        description: template.description,
        icon: template.icon,
      },
    });
    isDirty.value = true;
    document.onmouseup = null;
  };
}
function addNodeToEditor(node) {
  nodes.value.push({
    id: Date.now().toString(),
    type: node.type.toLowerCase(),
    label: node.label,
    position: {
      x: (node.position?.x ?? 550) + Math.floor(Math.random() * 101) + 50,
      y: (node.position?.y ?? 320) + Math.floor(Math.random() * 101) + 50,
    },
    data: {
      nodeId: node.nodeId,
      params: node.params.map((p) => ({
        name: p.name,
        value: p.value ?? "",
        desc: p.desc ?? "",
        type: p.type ?? "",
        component: p.component ?? "",
        required: p.required ?? false,
        options: p.options ?? [],
        defaultValue: p.defaultValue ?? null,
      })),
      description: node.description,
      icon: node.icon,
    },
  });
}
function goToWorkflow(workflow) {
  workflowName.value = workflow.name;
  currentWorkflowId.value = workflow.id;

  loadLatestVersion(workflow.id);
}
function onNodeClick({ node }) {
  // 进入参数面板生成节点关系对象,用来判断哪个节点是第一个节点
  relations.value = getRelateNodes();
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
  closeMorePanel.value = true; // 关闭更多操作面板
}
function handleOpenNode(id) {
  const node = nodes.value.find((n) => n.id === id);
  if (!node) return;

  onNodeClick({ node }); // 手动包装成VueFlow格式
}
function duplicateNode(id) {
  const node = nodes.value.find((n) => n.id === id);
  if (!node) return;

  const newNode = {
    ...node,
    id: Date.now().toString(),
    position: {
      x: node.position.x + 90,
      y: node.position.y + 90,
    },
  };

  nodes.value.push(newNode);
  ElMessage.success("复制成功");
}
function clickReplaceNode(node) {
  if (!replaceNodeId.value) return;

  const index = nodes.value.findIndex((n) => n.id === replaceNodeId.value);

  if (index === -1) {
    console.error("未找到要替换的节点:", replaceNodeId.value);
    return;
  }

  const oldNode = nodes.value[index];

  // 是否需要生成新 id
  const needNewId = oldNode.type?.toLowerCase() !== "common";

  const newId = needNewId
    ? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    : oldNode.id;

  const newNode = {
    ...oldNode,
    id: newId,
    type: node.type.toLowerCase(),
    label: node.label,
    data: {
      nodeId: node.nodeId,
      params:
        node.params?.map((p) => ({
          name: p.name,
          value: p.value ?? "",
          desc: p.desc ?? "",
          type: p.type ?? "",
          component: p.component ?? "",
          required: p.required ?? false,
          options: p.options ?? [],
          defaultValue: p.defaultValue ?? null,
        })) ?? [],
      description: node.description,
      icon: node.icon,
    },
  };
  if (needNewId) {
    // 删除所有和旧功能节点有关的边
    edges.value = edges.value.filter(
      (e) => e.source !== oldNode.id && e.target !== oldNode.id,
    );
  }
  console.log("替换节点:", newNode);
  //  关键：生成新的数组引用
  nodes.value = nodes.value.map((n) => (n.id === oldNode.id ? newNode : n));

  // 如果你有 useVueFlow
  updateNode(oldNode.id, newNode);

  const el = dynamicCompileFlow(nodes.value, edges.value);
  console.log("替换节点后重新编译:", el);

  replaceNodeId.value = null;
}
function handleReplaceNode(oldNodeId) {
  showNodesDialog.value = true; // 打开节点库选择需要替换的节点
  replaceNodeId.value = oldNodeId;
  isReplaceNode.value = true;
}
async function executeNode(nodeId) {
  // 只取已经连线的节点
  const connectedNodeIds = new Set(
    edges.value.flatMap((e) => [e.source, e.target]),
  );
  const activeNodes = nodes.value.filter((n) => connectedNodeIds.has(n.id));
  // const el = dynamicCompileFlow(activeNodes, edges.value, nodeId);

  const isValid = validateGraph(activeNodes, edges.value);
  console.log(isValid);
  if (!isValid) {
    ElMessage.warning("流程不合法");
    return;
  }

  // 工作流参数校验
  const res1 = validateNodeParams(activeNodes);
  if (!res1.valid) {
    // 节点缺少参数,重置状态
    nodes.value = stripNodeStatus(nodes.value);
    // 节点缺少参数,重置edges状态
    edges.value = stripEdgeStatus(edges.value);
    res1.nodeIds.forEach((id) => {
      updateNodeStatus(id, "lack-param");
    });
    ElMessage.warning(res1.message);
    return;
  }
  const el = compileFlow(activeNodes, edges.value, {
    stopAt: new Set([nodeId]),
    includeStop: true,
  });
  const relations = getRelateNodes();

  console.log("动态生成 EL:", el);
  const chainId = "manual-" + Date.now().toString();
  // 将执行记录入库
  const res2 = await service.post("api/workflowExecute/execute", {
    userId: 1,
    workflowId: localStorage.getItem("current_workflow_id"),
    dirty: isDirty.value,
    nodes: nodes.value,
    edges: edges.value,
    triggerType: "MANUAL",
    status: "RUNNING",
    duration: null,
  });
  const executionId = res2.data.executionId;

  stompClient.subscribe(`/workflow/flow/${chainId}`, (msg) => {
    const data = JSON.parse(msg.body);
    const { id, event, payload, type, duration } = data;
    if (!nodeRuntimeData.value[id]) {
      nodeRuntimeData.value[id] = {
        input: null,
        output: null,
        logs: [],
      };
    }
    const node = nodeRuntimeData.value[id];

    let status = "idle";
    if (event === "NODE_START") {
      updateEdgeStatusByTarget(id, "active");
      status = "running";
      node.input = payload; // 节点输入数据
    }
    if (event === "NODE_SUCCESS") {
      updateEdgeStatusByTarget(id, "success");
      status = "success";
      node.output = payload; // 节点执行结果/输出数据
      const executionDetailNode = buildExecutionDetail({
        executionId,
        id,
        type,
        status: "success",
        input: node.input,
        output: payload,
        duration,
      });
      // 节点详细信息入库
      service.post(
        "api/workflowExecute/saveExecuteDetail",
        executionDetailNode,
      );
      console.log("executionDetailNode:", executionDetailNode);
    }
    if (event === "NODE_ERROR") {
      updateEdgeStatusByTarget(id, "error");
      status = "error";
      const executionDetailNode = buildExecutionDetail({
        executionId,
        id,
        type,
        status: "error",
        input: node.input,
        duration,
        error: payload,
      });
      // 节点详细信息入库
      service.post(
        "api/workflowExecute/saveExecuteDetail",
        executionDetailNode,
      );
    }
    node.logs.push(data);
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
  // 更新execution状态和运行时间
  const res3 = await service.put("api/workflowExecute/updateExecution", {
    executionId,
    status,
    duration,
  });

  isDirty.value = false;
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
    // data: { label: "123" },// 线label
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
function validateNodeParams(activeNodes) {
  if (!Array.isArray(activeNodes)) {
    return { valid: true, nodeIds: [] };
  }

  const nodeIds = [];
  const messages = [];

  for (const node of activeNodes) {
    if (!node || node.id === "1") continue;

    const params = node?.data?.params || [];

    for (const p of params) {
      if (!p.required) continue;

      const v = p.value;

      const isEmpty =
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0);

      if (isEmpty) {
        nodeIds.push(node.id);
        messages.push(`${p.desc || p.name}不能为空`);
        break; // 一个节点只记录一次
      }
    }
  }

  return {
    valid: nodeIds.length === 0,
    nodeIds,
    message: messages[0], // 用第一个提示
  };
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
    // 工作流参数校验
    const res1 = validateNodeParams(activeNodes);
    if (!res1.valid) {
      // 节点缺少参数,重置状态
      nodes.value = stripNodeStatus(nodes.value);
      // 节点缺少参数,重置edges状态
      edges.value = stripEdgeStatus(edges.value);
      res1.nodeIds.forEach((id) => {
        updateNodeStatus(id, "lack-param");
      });
      ElMessage.warning(res1.message);
      return;
    }
    // 每次执行工作流重置nodes和edges状态
    nodes.value = stripNodeStatus(nodes.value);
    edges.value = stripEdgeStatus(edges.value);
    const el = compileFlow(activeNodes, edges.value);
    console.log("生成 EL:", el);
    const chainId = Date.now().toString();

    const relations = getRelateNodes();
    console.log("节点关系:", relations);

    // 将执行记录入库
    const res2 = await service.post("api/workflowExecute/execute", {
      userId: 1,
      workflowId: localStorage.getItem("current_workflow_id"),
      dirty: isDirty.value,
      nodes: nodes.value,
      edges: edges.value,
      triggerType: "MANUAL",
      status: "RUNNING",
      duration: null,
    });
    const executionId = res2.data.executionResult.executionId;
    const versionId = res2.data.executionResult.versionId;

    stompClient.subscribe(`/workflow/flow/${chainId}`, async (msg) => {
      const data = JSON.parse(msg.body);
      const { id, event, payload, type, duration } = data;
      if (!nodeRuntimeData.value[id]) {
        nodeRuntimeData.value[id] = {
          input: null,
          output: null,
          logs: [],
        };
      }
      const node = nodeRuntimeData.value[id];

      let status = "idle";
      if (event === "NODE_START") {
        updateEdgeStatusByTarget(id, "active");
        status = "running";
        node.input = payload; // 节点输入数据
      }
      if (event === "NODE_SUCCESS") {
        updateEdgeStatusByTarget(id, "success");
        status = "success";
        node.output = payload; // 节点执行结果/输出数据
        const executionDetailNode = buildExecutionDetail({
          executionId,
          id,
          type,
          status: "success",
          input: node.input,
          output: payload,
          duration,
        });
        // 节点详细信息入库
        service.post(
          "api/workflowExecute/saveExecuteDetail",
          executionDetailNode,
        );
        console.log("executionDetailNode:", executionDetailNode);
      }
      if (event === "NODE_ERROR") {
        updateEdgeStatusByTarget(id, "error");
        status = "error";
        const executionDetailNode = buildExecutionDetail({
          executionId,
          id,
          type,
          status: "error",
          input: node.input,
          duration,
          error: payload,
        });
        // 节点详细信息入库
        service.post(
          "api/workflowExecute/saveExecuteDetail",
          executionDetailNode,
        );
      }
      if (event === "FLOW_FINISH") {
        // WebSocket推送完成status后,更新nodes和edges
        const res1 = await service.post("workflow/version/update", {
          workflowId: Number(localStorage.getItem("current_workflow_id")),
          versionId,
          nodes: nodes.value,
          edges: edges.value,
        });
        // 记录execution的nodesStatus和edgesStatus,用于执行记录回放展示
        const nodesStatus = extractNodeStatus(nodes.value);
        const edgesStatus = extractEdgeStatus(edges.value);
        const res2 = await service.put("/api/workflowExecute/updateExecution", {
          executionId,
          nodesStatus: nodesStatus,
          edgesStatus: edgesStatus,
        });
        console.log("execution更新", res2.data);
      }
      node.logs.push(data);
      // 更新节点状态
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
    if (status == "SUCCESS") {
      ElMessage.success("工作流执行成功");
    }
    // 更新execution状态和运行时间
    const res3 = await service.put("api/workflowExecute/updateExecution", {
      executionId,
      status,
      duration,
    });

    isDirty.value = false;
  } catch (err) {
    ElMessage.warning(err.message);
  }
}

function updateEdgeStatusByTarget(targetNodeId, status) {
  edges.value = edges.value.map((edge) => {
    if (edge.target === targetNodeId) {
      return {
        ...edge,
        data: {
          ...edge.data,
          status,
        },
      };
    }
    return edge;
  });
}
function buildExecutionDetail({
  id,
  executionId,
  type,
  status,
  input,
  output,
  duration,
  error,
}) {
  const nodeName = nodes.value.find((n) => n.id === id)?.label;

  return {
    executionId,
    nodeId: id,
    nodeName,
    nodeType: type,
    inputData: input ? JSON.stringify(input) : null,
    outputData: output ? JSON.stringify(output) : null,
    errorMessage: error ?? null,
    status,
    runTime: duration,
  };
}
// 删除nodes.data下的status属性
function stripNodeStatus(nodes) {
  nodes.forEach((n) => {
    if (n.data && n.data.status) {
      delete n.data.status;
    }
  });
  return nodes;
}
// 提取nodes.data下的status属性
function extractNodeStatus(nodes) {
  if (!Array.isArray(nodes)) return [];

  return nodes.map((n) => ({
    id: n.id,
    status: n?.data?.status ?? null,
  }));
}
// 提取edges.data下的status属性
function extractEdgeStatus(edges) {
  if (!Array.isArray(edges)) return [];

  return edges.map((e) => ({
    id: e.id,
    status: e?.data?.status ?? null,
  }));
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
  // 编辑界面不显示线段状态，所以需要剥离掉 status 字段
  // edges.value = stripEdgeStatus(JSON.parse(version.edgesJson));
  edges.value = JSON.parse(version.edgesJson);
  // 编辑界面不显示节点状态，所以需要剥离掉 status 字段
  // const parsedNodes = stripNodeStatus(JSON.parse(version.nodesJson));
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
function showInsightsView() {
  viewMode.value = "insights";
}
function showTemplatesView() {
  viewMode.value = "templates";
}
function showConfigurationView(configMode) {
  console.log(configMode);
  viewMode.value = configMode;
}
// 监听当前工作流 ID 变化，保存到 localStorage
watch(currentWorkflowId, (id) => {
  if (id) {
    localStorage.setItem("current_workflow_id", id);
  } else {
    localStorage.removeItem("current_workflow_id");
  }
});
// 监听 viewMode 变化，切换到 executions 面板时刷新数据
watch(viewMode, (val) => {
  if (val === "executions") {
    // 通过 ref 调用子组件方法
    executionsPanelRef.value.reload();
  } else if (val === "versions") {
    versionsPanelRef.value.reload();
  }
  if (isCreateTemplate.value == true && val != "editor") {
    const targetViewMode = val;
    viewMode.value = "editor";
    ElMessageBox.confirm("模版未保存,是否放弃创建模版?", "提示", {
      type: "warning",
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      confirmButtonType: "danger",
    })
      .then(() => {
        // 调用删除接口
        ElMessage.warning("模版未保存");
        isCreateTemplate.value = false;
        viewMode.value = targetViewMode;
      })
      .catch(() => {
        viewMode.value = "editor";
        sideBarActiveMenu.value = { viewMode: "overwrite" };
      });
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
function saveAsTemplate({ templateName, description, categoryId }) {
  const isValid = validateGraph(nodes.value, edges.value);
  if (!isValid) {
    ElMessage.warning("无效模版");
    return;
  }
  console.log("创建模版保存:", templateName, description, categoryId);
  if (isCreateTemplate.value == true) {
    service
      .post("/workflowTemplate/createTemplate", {
        userId: Number(localStorage.getItem("userId")),
        templateName: createTemplateData.value.name,
        description: createTemplateData.value.description,
        categoryId: createTemplateData.value.categoryId,
        nodesJson: JSON.stringify(nodes.value),
        edgesJson: JSON.stringify(edges.value),
      })
      .then((res) => {
        if (res.status == 200) {
          ElMessage.success("模板创建成功");
        }
      });
    isCreateTemplate.value = false;
  } else {
    console.log("常规模版保存:", templateName, description, categoryId);
    service
      .post("/workflowTemplate/createTemplate", {
        userId: Number(localStorage.getItem("userId")),
        templateName: templateName,
        description: description,
        categoryId: categoryId,
        nodesJson: JSON.stringify(nodes.value),
        edgesJson: JSON.stringify(edges.value),
      })
      .then((res) => {
        if (res.status == 200) {
          ElMessage.success("模板创建成功");
        }
      });
  }
}
function updateTemplateCategories(newCategories) {
  templateCategories.value = newCategories;
}
function saveWorkflow() {
  const payload = {
    workflowId: localStorage.getItem("current_workflow_id"),
    nodes: nodes.value,
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
function runBeforeNodes({ id }) {
  // 执行上游节点
  executeParamsFlow(id, false);
}
function executeStep({ id }) {
  // 执行下一步
  executeParamsFlow(id, true);
}
async function handleSwitchBranch({ nodeId, branches }) {
  // 分支数据
  switchBranchData.value.nodeId = nodeId;
  switchBranchData.value.branchKey = handleBranchData(
    nodeId,
    branches,
    edges.value,
  );
  switchBranchData.value.chainId = null;
  // 调用接口
  await service.post(
    "api/workflow/saveBranchKeyToRedis",
    switchBranchData.value,
  );
  console.log(
    "switchBranchData:",
    branches,
    switchBranchData.value.nodeId,
    switchBranchData.value.branchKey,
  );
}
async function handleBooleanBranch({ nodeId, branches }) {
  booleanBranchData.value.nodeId = nodeId;
  booleanBranchData.value.branchKey = handleBranchData(
    nodeId,
    branches,
    edges.value,
  );
  booleanBranchData.value.chainId = null;
  // 调用接口
  await service.post(
    "api/workflow/saveBranchKeyToRedis",
    booleanBranchData.value,
  );
  console.log(
    "booleanBranchData:",
    branches,
    booleanBranchData.value.nodeId,
    booleanBranchData.value.branchKey,
  );
}
async function handleForLoopChange({ nodeId, count, arrayData, mode }) {
  // loopConfig: { count: number }
  const node = nodes.value.find((n) => n.id === nodeId);
  if (!node) return;
  const processedArrayData = arrayData.map((item, index) => {
    return { index: index + 1, value: item };
  });
  const loopData = {
    nodeId,
    count,
    processedArrayData,
    mode,
  };
  await service.post("api/workflow/saveLoopCountToRedis", loopData);
  // 更新节点数据
  // node.data.loop = { count };

  console.log("forLoopConfig:", nodeId, count);
}
function handleBranchData(nodeId, branches, edges, nodeType) {
  const handleIds = Object.keys(branches);

  // ① 优先：有数据 + 有连线
  const matched = handleIds.find((handleId) => {
    const hasData =
      Array.isArray(branches[handleId]) && branches[handleId].length > 0;

    const isConnected = edges.some(
      (edge) => edge.source === nodeId && edge.sourceHandle === handleId,
    );

    return hasData && isConnected;
  });

  if (matched) return matched;

  // ② 找所有已连接 handle
  const connectedHandles = handleIds.filter((handleId) =>
    edges.some(
      (edge) => edge.source === nodeId && edge.sourceHandle === handleId,
    ),
  );

  if (!connectedHandles.length) return null;

  // ③ SWITCH 特殊处理
  if (nodeType === "switch") {
    if (connectedHandles.includes("default")) {
      return "default";
    }
  }

  // ④ BOOLEAN 优先 true
  if (nodeType === "boolean") {
    if (connectedHandles.includes("true")) {
      return "true";
    }
  }

  // ⑤ 否则取第一个
  return connectedHandles[0];
}
function handleRemoveRule({ nodeId, handleId }) {
  edges.value = edges.value.filter(
    (edge) => !(edge.source === nodeId && edge.sourceHandle === handleId),
  );
}
async function executeParamsFlow(id, includeStop = false) {
  const currentId = id;

  // 清空运行时数据
  nodeRuntimeData.value = {};

  // 找到所有参与节点上
  const connectedNodeIds = new Set(
    edges.value.flatMap((e) => [e.source, e.target]),
  );

  const activeNodes = nodes.value.filter((n) => connectedNodeIds.has(n.id));

  // 校验流程
  const isValid = validateGraph(activeNodes, edges.value);
  if (!isValid) {
    ElMessage.warning("流程不合法");
    return;
  }

  // 编译EL
  const el = compileFlow(activeNodes, edges.value, {
    stopAt: new Set([id]),
    includeStop,
  });

  console.log("生成 EL:", el);

  const chainId = Date.now().toString();

  const relations = getRelateNodes();

  // websocket监听
  stompClient.subscribe(`/workflow/flow/${chainId}`, (msg) => {
    const data = JSON.parse(msg.body);

    const { id: nodeId, event, payload } = data;

    // 初始化节点runtime
    if (!nodeRuntimeData.value[nodeId]) {
      nodeRuntimeData.value[nodeId] = {
        input: null,
        output: null,
        logs: [],
      };
    }

    const node = nodeRuntimeData.value[nodeId];

    // 节点开始
    if (event === "NODE_START") {
      node.input = payload;
    }

    // 节点成功
    if (event === "NODE_SUCCESS") {
      node.output = payload;

      // 如果只是执行上游
      // 把最后结果传给当前节点input
      if (!includeStop && nodeId !== currentId) {
        if (!nodeRuntimeData.value[currentId]) {
          nodeRuntimeData.value[currentId] = {
            input: null,
            output: null,
            logs: [],
          };
        }

        nodeRuntimeData.value[currentId].input = payload;
      }
    }

    // 节点异常
    if (event === "NODE_ERROR") {
      node.error = payload;
    }

    node.logs.push(data);

    console.log("Received flow event:", data);
  });

  // 执行流程
  const res = await service.post("api/workflow/execute", {
    chainId,
    el,
    relations,
  });

  return res;
}
const autoLayout = async (direction) => {
  nodes.value = layoutGraph(nodes.value, edges.value, direction);
  await nextTick();

  if (viewportInitialized) {
    fitView({ padding: 0.3 });
  }
};
async function useTemplate(templateData) {
  viewMode.value = "editor";
  nodes.value = stripNodeStatus(JSON.parse(templateData.nodesJson));
  edges.value = stripEdgeStatus(JSON.parse(templateData.edgesJson));
  isDirty.value = true;
  // 使用模版时自动创建工作流
  const res = await service.post("/api/workflow/create", {
    userId: localStorage.getItem("userId"),
    name: templateData.templateName,
    description: templateData.description,
  });
  if (res.status == 200) {
    currentWorkflowId.value = res.data.id;
    ElMessage.success("工作流创建成功");
  }
}
function createTemplate(templateForm) {
  viewMode.value = "editor";
  sideBarActiveMenu.value = { viewMode: "overwrite" };
  isCreateTemplate.value = true;
  createTemplateData.value = templateForm;
}
</script>

<template>
  <div class="flow-editor">
    <ModeSwitch
      v-model:viewMode="viewMode"
      class="modeSwitch"
      v-if="
        viewMode != 'overwrite' &&
        viewMode != 'chat' &&
        viewMode != 'person' &&
        viewMode != 'insights' &&
        viewMode != 'templates' &&
        viewMode != 'nodeConfig' &&
        viewMode != 'userConfig'
      "
    />
    <SideBar
      v-model:showSidebar="showSidebar"
      :activeMenu="sideBarActiveMenu"
      @showOverwrite="showOverwriteView"
      @showChat="showChatView"
      @showPerson="showPersonView"
      @showInsights="showInsightsView"
      @showTemplates="showTemplatesView"
      @showConfiguration="showConfigurationView"
    />
    <div class="nodeButtonWrapper" v-if="viewMode == 'editor'">
      <button class="icon-btn" type="primary" @click="showNodesDialog = true">
        <img class="btn-img" src="./assets/addNode.svg" />
      </button>
      <button class="icon-btn" type="primary" @click="searchVisible = true">
        <img class="btn-img" src="./assets/searchNode.svg" />
      </button>
    </div>

    <GlobalSearchDialog
      v-model="searchVisible"
      :nodes="nodeTemplates"
      :workflows="workflowList"
      @add-node="addNodeToEditor"
      @open-workflow="goToWorkflow"
    />
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
      <NodeSearchPanel
        :nodes="nodeTemplates"
        v-model:isReplaceNode="isReplaceNode"
        @node-drag-start="startDrag"
        @replace-node="clickReplaceNode"
      />
    </el-drawer>

    <div class="center-panel" ref="flowWrapper">
      <EditorTopBar
        class="topbar"
        v-if="
          viewMode != 'overwrite' &&
          viewMode != 'chat' &&
          viewMode != 'person' &&
          viewMode != 'insights' &&
          viewMode != 'templates' &&
          viewMode != 'nodeConfig' &&
          viewMode != 'userConfig'
        "
        v-model:name="workflowName"
        :dirty="isDirty"
        @save="onSave"
        @saveTemplate="showTemplateDialog = true"
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
        <Dashboard v-if="viewMode == 'insights'" />
        <TemplateShowPage
          v-if="viewMode == 'templates'"
          @use-template="useTemplate"
          @create-template="createTemplate"
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
            <CommonNode
              v-bind="nodeProps"
              @add-node="openDrawer"
              @open-node="handleOpenNode"
              @duplicate-node="duplicateNode"
              @replace-node="handleReplaceNode"
              @execute-node="executeNode"
              @start-node="executeNode"
              :closeMorePanel="closeMorePanel"
            />
          </template>
          <template #node-start="nodeProps">
            <StartNode v-bind="nodeProps" @add-node="openDrawer" />
          </template>
          <template #node-switch="nodeProps">
            <SwitchNode
              v-bind="nodeProps"
              :closeMorePanel="closeMorePanel"
              @open-node="handleOpenNode"
              @duplicate-node="duplicateNode"
              @replace-node="handleReplaceNode"
              @execute-node="executeNode"
              @start-node="executeNode"
            />
          </template>
          <template #node-boolean="nodeProps">
            <BooleanNode
              v-bind="nodeProps"
              :closeMorePanel="closeMorePanel"
              @open-node="handleOpenNode"
              @duplicate-node="duplicateNode"
              @replace-node="handleReplaceNode"
              @execute-node="executeNode"
              @start-node="executeNode"
            />
          </template>
          <template #node-for="nodeProps">
            <ForNode
              v-bind="nodeProps"
              :closeMorePanel="closeMorePanel"
              @open-node="handleOpenNode"
              @duplicate-node="duplicateNode"
              @replace-node="handleReplaceNode"
              @execute-node="executeNode"
              @start-node="executeNode"
            />
          </template>
          <template #node-when="nodeProps">
            <WhenNode
              v-bind="nodeProps"
              :closeMorePanel="closeMorePanel"
              @open-node="handleOpenNode"
              @duplicate-node="duplicateNode"
              @replace-node="handleReplaceNode"
              @execute-node="executeNode"
              @start-node="executeNode"
            />
          </template>
          <Controls>
            <ControlButton title="Auto Layout" @click="autoLayout('LR')">
              ⚡
            </ControlButton>
            <!-- Vertical -->
            <ControlButton title="Vertical Layout" @click="autoLayout('TB')">
              ⬇
            </ControlButton>

            <!-- Horizontal -->
            <ControlButton title="Horizontal Layout" @click="autoLayout('LR')">
              ➡
            </ControlButton>
          </Controls>
          <MiniMap pannable zoomable />
          <Background pattern-color="#aaa" :gap="16" variant="dots" />
        </VueFlow>

        <ExecutionsPanel
          v-show="viewMode === 'executions'"
          :workflowId="currentWorkflowId"
          ref="executionsPanelRef"
        />
        <VersionPanel
          v-show="viewMode === 'versions'"
          :workflowId="currentWorkflowId"
          ref="versionsPanelRef"
        />
        <NodeConfiguration v-show="viewMode === 'nodeConfig'" />
        <UserConfiguration v-show="viewMode === 'userConfig'" />
      </div>
    </div>

    <ParamsDialog
      v-show="showParamsDialog"
      ref="paramsDialogRef"
      v-model:showParamsDialog="showParamsDialog"
      :paramsDialogFormData="paramsDialogFormData"
      :paramsDialogRules="paramsDialogRules"
      :activeNode="activeNode"
      :inputData="activeRuntimeData?.input"
      :outputData="activeRuntimeData?.output"
      :relations="relations"
      @run-before-node="runBeforeNodes"
      @execute-step="executeStep"
      @close-params-dialog="closeMorePanel = false"
      @switch-branch-data="handleSwitchBranch"
      @boolean-branch-data="handleBooleanBranch"
      @for-loop-change="handleForLoopChange"
      @remove-rule="handleRemoveRule"
    />
    <CreateTemplateDialog
      v-model="showTemplateDialog"
      :categories="templateCategories"
      :templateForm="createTemplateData"
      @update-categories="updateTemplateCategories"
      @submit="saveAsTemplate"
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
  height: 100vh; /* 改这里 */
  width: 100%;
  position: relative;
  overflow: hidden; /* 防止body滚动 */
}
.topbar {
  height: 56px;
  flex-shrink: 0;
}
.content {
  flex: 1;
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
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
  min-height: 0;
  overflow: hidden;
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
