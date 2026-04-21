//格式化nodes
function extractNodeMap(nodes) {
  const result = {};

  nodes.forEach((node) => {
    const key = node.id; // 唯一

    result[key] = {
      label: node.label || node.data?.label || "",

      type: node.type, // 可选（建议保留，AI更容易理解）

      data: {
        nodeId: node.data?.nodeId || node.type, // 节点类型
        description: node.data?.description || "",
        params: node.data?.params || [],
        branches: node.data?.branches || [],
      },
    };
  });
  return result;
}
// 格式化edges
function extractEdges(edges) {
  return edges.map((e) => ({
    from: e.source,
    to: e.target,

    // 分支/出口（非常关键）
    handle: e.sourceHandle || "out",

    // 如果是条件节点，补充条件信息
    condition: getCondition(e),
  }));
}

// 提取条件（专门给 switch 用）
function getCondition(edge) {
  const branches = edge.sourceNode?.data?.branches || [];

  const branch = branches.find((b) => b.id === edge.sourceHandle);

  if (!branch || branch.id === "default") return null;

  return {
    field: branch.field,
    operator: branch.operator,
    value: branch.value,
  };
}
// 构建流程路径
function buildFlowPaths(relations) {
  const graph = {};

  // 构建邻接表
  relations.forEach((r) => {
    if (!graph[r.from]) graph[r.from] = [];
    graph[r.from].push(r);
  });

  // 找起点（没有人指向它）
  const targets = new Set(relations.map((r) => r.to));
  const start = relations.find((r) => !targets.has(r.from))?.from;

  const paths = [];

  function dfs(current, path) {
    if (!graph[current]) {
      paths.push([...path]);
      return;
    }

    for (const edge of graph[current]) {
      path.push(edge);
      dfs(edge.to, path);
      path.pop();
    }
  }

  dfs(start, []);
  return paths;
}

// 格式化主函数,将nodes和edges的信息格式化并简化后喂给AI
export function buildFlowForAI(nodes, edges) {
  const nodeMap = extractNodeMap(nodes);
  const relations = extractEdges(edges);

  return {
    nodes: nodeMap,
    edges: relations,
  };
}

export default function buildAIPrompt(nodes, edges) {
  const nodeMap = extractNodeMap(nodes);
  const relations = extractEdges(edges);
  const paths = buildFlowPaths(relations);

  let desc = "流程路径：\n";

  paths.forEach((path, i) => {
    desc += `路径${i + 1}：\n`;

    path.forEach((step, index) => {
      const node = nodeMap[step.from];
      const nextNode = nodeMap[step.to];

      desc += `${node.label} → ${nextNode.label}`;

      // 分支说明
      if (step.condition) {
        desc += `（条件：${step.condition.field} ${step.condition.operator} ${step.condition.value}）`;
      } else if (step.handle !== "out") {
        desc += `（分支：${step.handle}）`;
      }

      desc += "\n";
    });
    desc += "\n";
  });

  return `
你是一个工作流分析专家，请根据流程路径解释该流程。

要求：
1. 用自然语言描述流程执行过程
2. 解释每个节点的作用
3. 清晰说明分支逻辑
4. 最后总结流程用途

${desc}
`;
}
