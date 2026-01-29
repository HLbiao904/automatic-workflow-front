import { ElMessage } from "element-plus";

// 校验唯一入口 start 节点
function validateInput(nodes) {
  const startNodes = nodes.filter((n) => n.type === "start");
  if (startNodes.length !== 1) {
    ElMessage.primary(`图必须且只能有 1 个 start 节点`);
  }
}

// 校验孤立节点
function validateDangling(nodes, edges) {
  const nodeIds = nodes.map((n) => n.id);
  const connectedIds = new Set();
  edges.forEach((e) => {
    connectedIds.add(e.source);
    connectedIds.add(e.target);
  });
  const dangling = nodeIds.filter((id) => !connectedIds.has(id));
  console.log("dangling", dangling);
  if (dangling.length > 0) {
    ElMessage.primary(`存在孤立节点: ${dangling.join(", ")}`);
  }
}

// 校验控制节点出边合法性
function validateControl(nodes, edges) {
  const edgeMap = {};
  edges.forEach((e) => {
    if (!edgeMap[e.source]) edgeMap[e.source] = [];
    edgeMap[e.source].push(e);
  });

  nodes.forEach((node) => {
    const nodeEdges = edgeMap[node.id] || [];
    if (node.type === "boolean") {
      const handles = nodeEdges.map((e) => e.sourceHandle);
      if (!handles.includes("true") || !handles.includes("false")) {
        ElMessage.primary(`Boolean 节点 ${node.id} 必须有 true / false 分支`);
      }
    }
    if (node.type === "switch" && nodeEdges.length === 0) {
      ElMessage.primary(`Switch 节点 ${node.id} 必须有至少 1 个分支`);
    }
    if (node.type === "for") {
      const hasBody = nodeEdges.some((e) => e.sourceHandle === "body");
      if (!hasBody) {
        ElMessage.primary(`For 节点 ${node.id} 必须有 body 分支`);
      }
    }
    if (node.type === "when" && nodeEdges.length < 2) {
      ElMessage.primary(`WHEN 节点 ${node.id} 至少需要 2 条分支`);
    }
  });
}

// 检测简单环（除了 for 回环）
function validateCycle(nodes, edges) {
  const graph = {};
  edges.forEach((e) => {
    if (!graph[e.source]) graph[e.source] = [];
    graph[e.source].push(e.target);
  });

  const visited = new Set();
  const stack = new Set();

  function dfs(id) {
    if (stack.has(id)) ElMessage.primary(`检测到循环：节点 ${id}`);
    if (visited.has(id)) return;
    visited.add(id);
    stack.add(id);
    (graph[id] || []).forEach((nextId) => {
      const node = nodes.find((n) => n.id === nextId);
      if (node?.type !== "for") dfs(nextId); // for 回环允许
    });
    stack.delete(id);
  }

  nodes.forEach((n) => dfs(n.id));
}
function validateGraph(nodes, edges) {
  validateInput(nodes);
  validateDangling(nodes, edges);
  validateControl(nodes, edges);
  validateCycle(nodes, edges);
}
export { validateGraph };
