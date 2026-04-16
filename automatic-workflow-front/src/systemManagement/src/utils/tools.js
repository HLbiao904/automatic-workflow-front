import dagre from "dagre";

export function formatDateTime(dateStr) {
  if (!dateStr) return "-";

  const date = new Date(dateStr);

  const pad = (n) => (n < 10 ? "0" + n : n);

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());

  const hour = pad(date.getHours());
  const min = pad(date.getMinutes());
  const sec = pad(date.getSeconds());

  return `${year}-${month}-${day} ${hour}:${min}:${sec}`;
}

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
