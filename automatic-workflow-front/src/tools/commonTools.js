import dagre from "dagre";
// 自动布局函数
export function layoutNodes(
  nodes = [],
  edges = [],
  { direction = "LR", compact = false } = {},
) {
  const g = new dagre.graphlib.Graph();

  g.setGraph({
    rankdir: direction,
    nodesep: compact ? 30 : 80,
    ranksep: compact ? 80 : 30,
    marginx: 20,
    marginy: 20,
  });

  g.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    let width = 150;
    let height = 60;

    // 🔹 start（最小）
    if (node.type === "start") {
      width = 100;
      height = 50;
    }

    // 🔹 common（更短）
    else if (node.type === "common") {
      const textLength = node.data?.label?.length || 0;

      width = Math.max(
        compact ? 90 : 110, // 最小宽度（更短）
        Math.min(
          // 最大限制（防止过长）
          compact ? 140 : 180,
          textLength * 9, // 根据文字长度撑开
        ),
      );
    }

    // 🔹 if / when（中等）
    else if (["boolean", "when"].includes(node.type)) {
      width = compact ? 160 : 190;
      height = 70;
    }

    // 🔹 switch（最长）
    else if (node.type === "switch") {
      width = compact ? 180 : 220;
      height = 80;
    }

    // 🔹 for（稍大一点）
    else if (node.type === "for") {
      width = compact ? 150 : 180;
      height = 70;
    }

    g.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target, {
      weight: 2,
      minlen: compact ? 1 : 2,
    });
  });

  dagre.layout(g);

  let layoutedNodes = nodes.map((node) => {
    const { x, y } = g.node(node.id);

    return {
      ...node,
      position: {
        x: x - 90,
        y: y - 30,
      },
    };
  });

  // 横向压缩（可选）
  if (compact) {
    layoutedNodes = layoutedNodes.map((n) => ({
      ...n,
      position: {
        x: n.position.x * 0.8,
        y: n.position.y,
      },
    }));
  }

  return {
    nodes: layoutedNodes,
    edges,
  };
}

// 流程连接函数：将“开始”节点连接到所有没有入边的 AI 流程节点
export function connectStartToEntries(aiNodes, allEdges, allNodes) {
  const startNode = allNodes.find((n) => n.type?.toLowerCase() === "start");

  if (!startNode) return;

  // 所有 target（已有入边的节点）
  const targetSet = new Set(allEdges.map((e) => e.target));

  // 找 AI 流程中的“入口节点”（没有入边）
  const entryNodes = aiNodes.filter((n) => !targetSet.has(n.id));

  entryNodes.forEach((node, index) => {
    // ❗防止重复连接（关键）
    const exists = allEdges.some(
      (e) => e.source === startNode.id && e.target === node.id,
    );

    if (!exists) {
      allEdges.push({
        id: `start-${node.id}-${Date.now()}-${index}`,
        source: startNode.id,
        target: node.id,
      });
    }
  });
}
