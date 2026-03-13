export function dynamicCompileFlow(nodes, edges, stopNodeId) {
  if (!nodes || nodes.length === 0) {
    throw new Error("流程为空");
  }

  // 1️⃣ 构建邻接表
  const graph = {};
  edges.forEach((edge) => {
    if (!graph[edge.source]) {
      graph[edge.source] = [];
    }
    graph[edge.source].push(edge.target);
  });

  // 2️⃣ 构建 nodeMap
  const nodeMap = {};
  nodes.forEach((node) => {
    nodeMap[node.id] = node;
  });

  // 3️⃣ 找开始节点
  const targets = new Set(edges.map((e) => e.target));
  const startNode = nodes.find((n) => !targets.has(n.id));
  if (!startNode) {
    throw new Error("未找到开始节点");
  }

  const visited = new Set();
  let stopReached = false;

  // =========================
  // 工具函数
  // =========================

  function wrapData(node) {
    const { id, type, data = {} } = node;
    const { nodeId, params = [] } = data;

    if (!nodeId) {
      throw new Error("节点缺少 nodeId: " + id);
    }

    const kvPairs = [`id=${id}`, `nodeId=${nodeId}`, `type=${type}`];

    if (Array.isArray(params)) {
      for (const p of params) {
        if (!p || !p.name) continue;

        const key = p.name;
        const value = p.value;

        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "")
        ) {
          continue;
        }

        const safeValue =
          typeof value === "string" ? value.replace(/'/g, "\\'") : value;

        kvPairs.push(`${key}=${safeValue}`);
      }
    }

    return `${nodeId}.data('${kvPairs.join(",")}')`;
  }

  // =========================
  // 核心递归
  // =========================

  function compileNode(nodeId) {
    if (stopReached) return null;

    if (visited.has(nodeId)) {
      throw new Error("检测到循环依赖");
    }

    visited.add(nodeId);

    const node = nodeMap[nodeId];
    if (!node) {
      throw new Error("节点不存在: " + nodeId);
    }

    const children = graph[nodeId] || [];

    // 命中 stopNode
    if (nodeId === stopNodeId) {
      stopReached = true;
      return wrapData(node);
    }

    // start 不输出自身
    if (node.type === "start") {
      if (children.length !== 1) {
        throw new Error("开始节点必须有且仅有一个子节点");
      }
      return compileNode(children[0]);
    }

    const name = wrapData(node);

    switch (node.type) {
      case "common":
        return compileCommon(name, children);

      case "when":
        return compileWhen(children);

      case "switch":
        return compileSwitch(name, nodeId);

      case "if":
      case "boolean":
        return compileIf(name, children);

      case "for":
        return compileFor(name, children);

      default:
        throw new Error("未知节点类型: " + node.type);
    }
  }

  // =========================
  // 类型实现
  // =========================

  function compileCommon(name, children) {
    if (stopReached) return name;

    if (children.length === 0) {
      return name;
    }

    if (children.length === 1) {
      const child = compileNode(children[0]);
      if (!child) return name;
      return `THEN(${name}, ${child})`;
    }

    const childEls = children.map((id) => compileNode(id)).filter(Boolean);

    if (childEls.length === 0) return name;

    return `THEN(${name}, WHEN(${childEls.join(", ")}))`;
  }

  function compileWhen(children) {
    if (children.length === 0) {
      throw new Error("WHEN 节点必须有子节点");
    }

    const childEls = children.map((id) => compileNode(id)).filter(Boolean);

    if (childEls.length === 0) return null;

    return `WHEN(${childEls.join(", ")})`;
  }

  function compileIf(name, children) {
    if (children.length !== 2) {
      throw new Error("IF 节点必须有两个分支");
    }

    const trueBranch = compileNode(children[0]);
    const falseBranch = compileNode(children[1]);

    return `IF(${name}, ${trueBranch}, ${falseBranch})`;
  }

  function compileSwitch(name, nodeId) {
    const outgoingEdges = edges.filter((e) => e.source === nodeId);

    if (outgoingEdges.length === 0) {
      throw new Error("SWITCH 节点必须有分支");
    }

    const cases = [];
    let defaultCase = null;
    const tagSet = new Set();

    for (const e of outgoingEdges) {
      const tag = e.sourceHandle;
      if (!tag) {
        throw new Error(`SWITCH 分支缺少 sourceHandle: ${e.target}`);
      }

      const body = compileNode(e.target);
      if (!body) continue;

      if (tag === "default") {
        if (defaultCase) {
          throw new Error("SWITCH 只能有一个 default 分支");
        }
        defaultCase = body;
      } else {
        if (tagSet.has(tag)) {
          throw new Error(`SWITCH tag 重复: ${tag}`);
        }
        tagSet.add(tag);
        cases.push(`${body}.tag('${tag}')`);
      }
    }

    const caseStr = cases.join(", ");

    if (defaultCase) {
      return `SWITCH(${name}).to(${caseStr}).DEFAULT(${defaultCase})`;
    }

    return `SWITCH(${name}).to(${caseStr})`;
  }

  function compileFor(name, children) {
    if (children.length !== 1) {
      throw new Error("FOR 节点必须有一个循环体");
    }

    const body = compileNode(children[0]);
    if (!body) return name;

    return `FOR(${name}).DO(${body})`;
  }

  // =========================
  // 开始编译
  // =========================

  const result = compileNode(startNode.id);

  return result;
}
