import { ElMessage } from "element-plus";

// 校验唯一入口 start 节点
function validateInput(nodes) {
  const startNodes = nodes.filter((n) => n.type === "start");
  if (startNodes.length !== 1) {
    ElMessage.primary(`图必须且只能有 1 个 start 节点`);
    return false;
  }
  return true;
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
  if (dangling.length > 0) {
    ElMessage.primary(`存在孤立节点: ${dangling.join(", ")}`);
    return false;
  }
  return true;
}

// 校验控制节点出边合法性
function validateControl(nodes, edges) {
  const edgeMap = {};
  edges.forEach((e) => {
    if (!edgeMap[e.source]) edgeMap[e.source] = [];
    edgeMap[e.source].push(e);
  });

  for (const node of nodes) {
    const nodeEdges = edgeMap[node.id] || [];

    if (node.type === "boolean") {
      const handles = nodeEdges.map((e) => e.sourceHandle);
      if (!handles.includes("true") || !handles.includes("false")) {
        ElMessage.primary(`Boolean 节点 ${node.id} 必须有 true / false 分支`);
        return false;
      }
    }

    if (node.type === "switch" && nodeEdges.length === 0) {
      ElMessage.primary(`Switch 节点 ${node.id} 必须有至少 1 个分支`);
      return false;
    }

    if (node.type === "for") {
      const hasBody = nodeEdges.some((e) => e.sourceHandle === "body");
      if (!hasBody) {
        ElMessage.primary(`For 节点 ${node.id} 必须有 body 分支`);
        return false;
      }
    }

    if (node.type === "when" && nodeEdges.length < 2) {
      ElMessage.primary(`WHEN 节点 ${node.id} 至少需要 2 条分支`);
      return false;
    }
  }

  return true;
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
    if (stack.has(id)) {
      ElMessage.primary(`检测到循环：节点 ${id}`);
      return false;
    }

    if (visited.has(id)) return true;

    visited.add(id);
    stack.add(id);

    for (const nextId of graph[id] || []) {
      const node = nodes.find((n) => n.id === nextId);
      if (node?.type !== "for") {
        if (!dfs(nextId)) return false;
      }
    }

    stack.delete(id);
    return true;
  }

  for (const n of nodes) {
    if (!dfs(n.id)) return false;
  }

  return true;
}

function validateGraph(nodes, edges) {
  const inputValid = validateInput(nodes);
  if (!inputValid) return false;
  const danglingValid = validateDangling(nodes, edges);
  if (!danglingValid) return false;
  const controlValid = validateControl(nodes, edges);
  if (!controlValid) return false;
  const cycleValid = validateCycle(nodes, edges);
  if (!cycleValid) return false;
  return true;
}
export { validateGraph };
