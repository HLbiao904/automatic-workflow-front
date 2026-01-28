/**
 * nodes: VueFlow 的 nodes
 * edges: VueFlow 的 edges
 * return: EL 表达式字符串
 */

import { ElMessage } from "element-plus";

export function compileFlow(nodes, edges) {
  const nodeMap = buildNodeMap(nodes);
  const graph = buildGraph(edges);

  const startNode = findStartNode(nodes);
  if (!startNode) {
    ElMessage.primary("未找到开始节点（input）");
  }

  return compileNode(startNode.id, nodeMap, graph);
}

/** ---------- 工具方法 ---------- **/

function buildNodeMap(nodes) {
  const map = {};
  nodes.forEach((n) => {
    map[n.id] = n;
  });
  return map;
}

function buildGraph(edges) {
  const graph = {};
  edges.forEach((e) => {
    if (!graph[e.source]) graph[e.source] = [];
    graph[e.source].push(e);
  });
  return graph;
}

function findStartNode(nodes) {
  return nodes.find((n) => n.type === "input");
}

/** ---------- 核心递归编译 ---------- **/

function compileNode(nodeId, nodeMap, graph) {
  const node = nodeMap[nodeId];
  if (!node) return "";

  switch (node.type) {
    case "input": {
      const next = graph[nodeId]?.[0]?.target;
      const seq = compileSequence(next, nodeMap, graph);
      return wrapThen(seq, true);
    }

    case "boolean":
      return compileBoolean(node, graph[nodeId], nodeMap, graph);

    case "switch":
      return compileSwitch(node, graph[nodeId], nodeMap, graph);

    case "for":
      return compileFor(node, graph[nodeId], nodeMap, graph);

    case "when":
      return compileWhen(node, graph[node.id], nodeMap, graph);

    default:
      return compileNodeWithData(node);
  }
}

function compileNodeWithData(node) {
  const flowNodeId = node.id; // VueFlow 的 id
  const nodeId = node.data?.nodeId; // 业务 nodeId
  const type = node.type; // 节点类型
  const params = node.data?.params || []; // 原有参数

  if (!nodeId) {
    ElMessage.primary(`节点 ${flowNodeId} 缺少 data.nodeId`);
  }

  /** 1️⃣ 固定字段 */
  const baseFields = [`id=${flowNodeId}`, `nodeId=${nodeId}`, `type=${type}`];

  /** 2️⃣ 动态参数 */
  const paramFields = params
    .filter((p) => p.value !== undefined && p.value !== "")
    .map((p) => `${p.name}=${p.value}`);

  /** 3️⃣ 合并 */
  const allFields = [...baseFields, ...paramFields];

  /** 4️⃣ 没有任何 data 的兜底 */
  if (allFields.length === 0) {
    return nodeId;
  }

  return `${nodeId}.data('${allFields.join(",")}')`;
}

function compileNext(edges, nodeMap, graph) {
  if (edges.length === 0) return "";
  return compileNode(edges[0].target, nodeMap, graph);
}
function wrapThen(list, force = false) {
  if (list.length === 0) return "";
  if (!force && list.length === 1) return list[0];
  return `THEN(${list.join(", ")})`;
}

/** ---------- 各节点类型 ---------- **/
function compileSequence(startNodeId, nodeMap, graph, options = {}) {
  const result = [];
  const visited = new Set();
  const stopAt = options.stopAt || new Set();

  let current = startNodeId;

  while (current) {
    if (visited.has(current)) break;
    if (stopAt.has(current)) break;

    // 汇合点检测
    if (getInDegree(current, graph) > 1) {
      break;
    }

    const node = nodeMap[current];
    if (!node) break;

    // 控制节点：交回 compileNode（递归核心）
    if (["boolean", "switch", "for", "when"].includes(node.type)) {
      result.push(compileNode(current, nodeMap, graph));
      break;
    }

    // 普通节点：只 push 一次（带 data）
    result.push(compileNodeWithData(node));
    visited.add(current);

    const out = graph[current] || [];
    if (out.length !== 1) break;

    current = out[0].target;
  }

  return result;
}

function getInDegree(nodeId, graph) {
  let count = 0;
  for (const from in graph) {
    for (const e of graph[from]) {
      if (e.target === nodeId) count++;
    }
  }
  return count;
}
function compileWhen(node, edges, nodeMap, graph) {
  const parallelEdges = edges.filter((e) => e.sourceHandle === "parallel");

  if (parallelEdges.length < 2) {
    ElMessage.primary(`WHEN 节点 ${node.id} 至少需要 2 个并行分支`);
  }

  const branches = parallelEdges.map((e) => {
    const seq = compileSubFlow(e.target, nodeMap, graph);
    return wrapThen(seq, true);
  });

  return `WHEN(${branches.join(", ")})`;
}

function compileSubFlow(startNodeId, nodeMap, graph) {
  const result = [];
  let current = startNodeId;
  const visited = new Set();

  while (current && !visited.has(current)) {
    visited.add(current);

    const node = nodeMap[current];
    if (!node) break;

    // 控制节点，完整交给 compileNode
    if (["boolean", "switch", "for", "when"].includes(node.type)) {
      result.push(compileNode(current, nodeMap, graph));
      break;
    }

    result.push(compileNodeWithData(node));

    const out = graph[current] || [];
    if (out.length !== 1) break;

    current = out[0].target;
  }

  return result;
}

function compileBoolean(node, edges, nodeMap, graph) {
  const trueEdge = edges.find((e) => e.sourceHandle === "true");
  const falseEdge = edges.find((e) => e.sourceHandle === "false");

  if (!trueEdge || !falseEdge) {
    ElMessage.primary(`Boolean 节点 ${node.id} 必须有 true / false 分支`);
  }

  const trueSeq = compileSequence(trueEdge.target, nodeMap, graph);
  const falseSeq = compileSequence(falseEdge.target, nodeMap, graph);

  return `IF(${node.data.nodeId}, ${wrapThen(trueSeq, true)}, ${wrapThen(falseSeq, true)})`;
}

function compileSwitch(node, edges, nodeMap, graph) {
  if (!edges || edges.length === 0) {
    ElMessage.primary(`Switch 节点 ${node.id} 没有任何分支`);
  }

  const cases = [];
  let defaultCase = null;

  for (const e of edges) {
    const seq = compileSequence(e.target, nodeMap, graph);
    const body = wrapThen(seq, true);

    if (e.sourceHandle === "default") {
      defaultCase = body;
    } else {
      cases.push(`${body}.tag('${e.sourceHandle}')`);
    }
  }

  let expr = `SWITCH(${node.data.nodeId}).to(${cases.join(", ")})`;

  if (defaultCase) {
    expr += `.DEFAULT(${defaultCase})`;
  }

  return expr;
}

function compileFor(node, edges, nodeMap, graph) {
  const bodyEdge = edges.find((e) => e.sourceHandle === "body");
  const nextEdge = edges.find((e) => e.sourceHandle === "next");

  if (!bodyEdge) {
    ElMessage.primary(`For 节点 ${node.id} 缺少 body 分支`);
  }

  // 1️⃣ 编译循环体（一整段）
  const bodySeq = compileSequence(
    bodyEdge.target,
    nodeMap,
    graph,
    { stopAt: new Set([node.id]) }, // 非常关键
  );

  const forExpr = `FOR(${node.data.nodeId}).DO(${wrapThen(bodySeq, true)})`;

  // 2️⃣ for 后面还有流程
  if (nextEdge) {
    const nextSeq = compileSequence(nextEdge.target, nodeMap, graph);
    return wrapThen([forExpr, ...nextSeq], true);
  }

  return forExpr;
}
