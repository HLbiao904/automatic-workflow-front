/**
 * nodes: VueFlow 的 nodes
 * edges: VueFlow 的 edges
 * return: EL 表达式字符串
 */

import { ElMessage } from "element-plus";

export function compileMergeFlow(nodes, edges, options = {}) {
  const nodeMap = buildNodeMap(nodes);
  const graph = buildGraph(edges);

  const startNode = findStartNode(nodes);
  if (!startNode) {
    ElMessage.primary("未找到开始节点（start）");
    return;
  }

  return compileNode(startNode.id, nodeMap, graph, options);
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
  return nodes.find((n) => n.type === "start");
}

/** ---------- 核心递归编译 ---------- **/

function compileNode(nodeId, nodeMap, graph, options = {}) {
  const node = nodeMap[nodeId];
  if (!node) return "";

  switch (node.type) {
    case "start": {
      const next = graph[nodeId]?.[0]?.target;
      const seq = compileSequence(next, nodeMap, graph, options);
      return wrapThen(seq, true);
    }

    case "boolean":
      return compileBoolean(node, graph[nodeId] || [], nodeMap, graph, options);

    case "switch":
      return compileSwitch(node, graph[nodeId] || [], nodeMap, graph, options);

    case "for":
      return compileFor(node, graph[nodeId] || [], nodeMap, graph, options);

    case "when":
      return compileWhen(node, graph[nodeId] || [], nodeMap, graph, options);

    default:
      return compileNodeWithData(node);
  }
}

/** ---------- 节点表达式 ---------- **/

function appendNodeMeta(expr, node) {
  const flowNodeId = node.id;
  const nodeId = node.data?.nodeId;
  const type = node.type;

  const baseFields = [`id=${flowNodeId}`, `nodeId=${nodeId}`, `type=${type}`];

  return `${expr}.data('${baseFields.join(",")}')`;
}

function compileNodeWithData(node) {
  const flowNodeId = node.id;
  const nodeId = node.data?.nodeId;
  const type = node.type;
  const params = node.data?.params || [];

  if (!nodeId) {
    ElMessage.primary(`节点 ${flowNodeId} 缺少 data.nodeId`);
  }

  const baseFields = [`id=${flowNodeId}`, `nodeId=${nodeId}`, `type=${type}`];

  const paramFields = params
    .filter((p) => p.value !== undefined && p.value !== "")
    .map((p) => `${p.name}=${p.value}`);

  const allFields = [...baseFields, ...paramFields];

  if (allFields.length === 0) {
    return nodeId;
  }

  return `${nodeId}.data('${allFields.join(",")}')`;
}

/** ---------- 核心序列编译（支持汇聚） ---------- **/

function compileSequence(startNodeId, nodeMap, graph, options = {}) {
  const result = [];
  const visited = options.visited || new Set();
  const stopAt = options.stopAt || new Set();

  let current = startNodeId;

  while (current) {
    if (visited.has(current)) break;

    if (stopAt.has(current)) {
      if (options.includeStop) {
        result.push(compileNode(current, nodeMap, graph, options));
      }
      break;
    }

    const node = nodeMap[current];
    if (!node) break;

    // 控制节点 → 递归处理
    if (["boolean", "switch", "for", "when"].includes(node.type)) {
      result.push(compileNode(current, nodeMap, graph));
      break;
    }

    result.push(compileNodeWithData(node));
    visited.add(current);

    const out = graph[current] || [];

    if (out.length === 0) break;

    if (out.length === 1) {
      current = out[0].target;
    } else {
      // ⭐ 多出口 → 分支展开
      const branches = out.map((e) => {
        const subSeq = compileSequence(e.target, nodeMap, graph, {
          ...options,
          visited: new Set(visited),
        });
        return wrapThen(subSeq, true);
      });

      result.push(...branches);
      break;
    }
  }

  return result;
}

/** ---------- 子流程 ---------- **/

function compileSubFlow(startNodeId, nodeMap, graph, options = {}) {
  return compileSequence(startNodeId, nodeMap, graph, {
    ...options,
    visited: new Set(),
  });
}

/** ---------- 工具 ---------- **/

function wrapThen(list, force = false) {
  if (!list || list.length === 0) return "";
  if (!force && list.length === 1) return list[0];
  return `THEN(${list.join(", ")})`;
}

/** ---------- 控制节点 ---------- **/

function compileWhen(node, edges, nodeMap, graph, options = {}) {
  const parallelEdges = edges.filter((e) => e.sourceHandle === "parallel");

  if (parallelEdges.length < 2) {
    ElMessage.primary(`WHEN 节点 ${node.id} 至少需要 2 个并行分支`);
  }

  const branches = parallelEdges.map((e) => {
    const seq = compileSubFlow(e.target, nodeMap, graph, options);
    return wrapThen(seq, true);
  });

  return `WHEN(${branches.join(", ")})`;
}

function compileBoolean(node, edges, nodeMap, graph, options = {}) {
  const trueEdge = edges.find((e) => e.sourceHandle === "true");
  const falseEdge = edges.find((e) => e.sourceHandle === "false");

  if (!trueEdge || !falseEdge) {
    ElMessage.primary(`Boolean 节点 ${node.id} 必须有 true / false 分支`);
  }

  const trueSeq = compileSubFlow(trueEdge.target, nodeMap, graph, options);
  const falseSeq = compileSubFlow(falseEdge.target, nodeMap, graph, options);

  return `IF(${appendNodeMeta(node.data.nodeId, node)}, ${wrapThen(
    trueSeq,
    true,
  )}, ${wrapThen(falseSeq, true)})`;
}

function compileSwitch(node, edges, nodeMap, graph, options = {}) {
  if (!edges || edges.length === 0) {
    ElMessage.primary(`Switch 节点 ${node.id} 没有任何分支`);
  }

  const cases = [];
  let defaultCase = null;

  for (const e of edges) {
    const seq = compileSubFlow(e.target, nodeMap, graph, options);
    const body = wrapThen(seq, true);

    if (e.sourceHandle === "default") {
      defaultCase = body;
    } else {
      cases.push(`${body}.tag('${e.sourceHandle}')`);
    }
  }

  let expr = `SWITCH(${appendNodeMeta(node.data.nodeId, node)}).to(${cases.join(
    ", ",
  )})`;

  if (defaultCase) {
    expr += `.DEFAULT(${defaultCase})`;
  }

  return expr;
}

function compileFor(node, edges, nodeMap, graph, options = {}) {
  const bodyEdge = edges.find((e) => e.sourceHandle === "body");
  const nextEdge = edges.find((e) => e.sourceHandle === "next");

  if (!bodyEdge) {
    ElMessage.primary(`For 节点 ${node.id} 缺少 body 分支`);
  }

  const bodySeq = compileSequence(bodyEdge.target, nodeMap, graph, {
    ...options,
    visited: new Set(),
    stopAt: new Set([node.id]),
  });

  const forExpr = `FOR(${appendNodeMeta(node.data.nodeId, node)}).DO(${wrapThen(
    bodySeq,
    true,
  )})`;

  if (nextEdge) {
    const nextSeq = compileSequence(nextEdge.target, nodeMap, graph, options);
    return wrapThen([forExpr, ...nextSeq], true);
  }

  return forExpr;
}
