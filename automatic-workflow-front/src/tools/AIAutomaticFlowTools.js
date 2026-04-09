export default function validateAndFixFlow(nodes, edges, startId = "1") {
  const errors = [];
  let fixedNodes = JSON.parse(JSON.stringify(nodes));
  let fixedEdges = JSON.parse(JSON.stringify(edges));

  // ===== 0. ID 重映射（防止和 start 冲突）=====
  const idMap = {};
  fixedNodes.forEach((node) => {
    const newId = "ai_" + node.id;
    idMap[node.id] = newId;
    node.id = newId;
  });

  fixedEdges.forEach((edge) => {
    edge.source = idMap[edge.source];
    edge.target = idMap[edge.target];
  });

  // ===== 1. 构建 nodeMap =====
  const nodeMap = new Map();
  fixedNodes.forEach((n) => nodeMap.set(n.id, n));

  // ===== 2. 校验 type 和 nodeid =====
  fixedNodes.forEach((node) => {
    if (node.type === "boolean" && node.nodeid !== "boolNode") {
      node.nodeid = "boolNode";
      errors.push(`节点 ${node.id} 修正为 boolNode`);
    }
    if (node.type === "switch" && node.nodeid !== "switchNode") {
      node.nodeid = "switchNode";
      errors.push(`节点 ${node.id} 修正为 switchNode`);
    }
    if (node.type === "for" && node.nodeid !== "forNode") {
      node.nodeid = "forNode";
      errors.push(`节点 ${node.id} 修正为 forNode`);
    }
    if (node.type === "when" && node.nodeid !== "whenNode") {
      node.nodeid = "whenNode";
      errors.push(`节点 ${node.id} 修正为 whenNode`);
    }
  });

  // ===== 3. 边合法性校验 =====
  fixedEdges = fixedEdges.filter((e) => {
    if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) {
      errors.push(`非法边 ${e.source} → ${e.target} 已删除`);
      return false;
    }
    return true;
  });

  // ===== 4. 构建邻接表 =====
  const outMap = {};
  const inMap = {};

  fixedNodes.forEach((n) => {
    outMap[n.id] = [];
    inMap[n.id] = [];
  });

  fixedEdges.forEach((e) => {
    outMap[e.source].push(e);
    inMap[e.target].push(e);
  });

  // ===== 5. for 校验 =====
  fixedNodes.forEach((node) => {
    if (node.type === "for") {
      const outs = outMap[node.id];

      if (outs.length === 0) {
        errors.push(`for节点 ${node.id} 没出口，自动补`);
        if (fixedNodes.length > 1) {
          fixedEdges.push({
            source: node.id,
            target: fixedNodes[0].id,
          });
        }
      }

      if (outs.length > 1) {
        errors.push(`for节点 ${node.id} 多出口，已修复`);
        const keep = outs[0];
        fixedEdges = fixedEdges.filter(
          (e) => e === keep || e.source !== node.id,
        );
        outMap[node.id] = [keep];
      }
    }
  });

  // ===== 6. when 校验 =====
  fixedNodes.forEach((node) => {
    if (node.type === "when") {
      const outs = outMap[node.id];

      if (outs.length < 2 && outs.length > 0) {
        fixedEdges.push({
          source: node.id,
          target: outs[0].target,
          label: "auto",
        });
        errors.push(`when节点 ${node.id} 自动补分支`);
      }
    }
  });

  // ===== 7. if 校验 =====
  fixedNodes.forEach((node) => {
    if (node.type === "boolean") {
      const outs = outMap[node.id];

      if (outs[0] && !outs[0].label) outs[0].label = "true";
      if (outs[1] && !outs[1].label) outs[1].label = "false";
    }
  });

  // ===== 8. switch 校验 =====
  fixedNodes.forEach((node) => {
    if (node.type === "switch") {
      const outs = outMap[node.id];

      const labels = outs.map((e) => e.label);
      const set = new Set(labels);

      if (labels.length !== set.size) {
        errors.push(`switch节点 ${node.id} 存在重复分支`);
      }

      const hasDefault = outs.some((e) => e.label === "default");
      if (!hasDefault && outs.length > 0) {
        outs[0].label = outs[0].label || "default";
        errors.push(`switch节点 ${node.id} 自动补 default`);
      }
    }
  });

  // ===== 9. 环检测（无回环保证）=====
  function hasCycle() {
    const visited = new Set();
    const stack = new Set();

    function dfs(id) {
      if (stack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      stack.add(id);

      for (let e of outMap[id]) {
        if (dfs(e.target)) return true;
      }

      stack.delete(id);
      return false;
    }

    return fixedNodes.some((n) => dfs(n.id));
  }

  if (hasCycle()) {
    errors.push("检测到循环依赖（非法流程）");
  }

  // ===== 10. 找入口节点 =====
  const entryNodes = fixedNodes.filter((n) => inMap[n.id].length === 0);

  // ===== 11. 连接 start 节点 =====
  entryNodes.forEach((node) => {
    if (node.id === startId) return;

    fixedEdges.push({
      source: startId,
      target: node.id,
    });
  });

  // ===== 12. 断链检测 =====
  fixedNodes.forEach((node) => {
    const outs = outMap[node.id];

    if (outs.length === 0 && node.type !== "common") {
      errors.push(`节点 ${node.id} 可能流程中断`);
    }
  });

  return {
    nodes: fixedNodes,
    edges: fixedEdges,
    errors,
  };
}

// export default function validateAndFixFlow(nodes, edges, startId = "1") {
//   const errors = [];
//   let fixedNodes = JSON.parse(JSON.stringify(nodes));
//   let fixedEdges = JSON.parse(JSON.stringify(edges));

//   // ===== 0. ID 重映射 =====
//   const idMap = {};
//   fixedNodes.forEach((node) => {
//     const newId = "ai_" + node.id;
//     idMap[node.id] = newId;
//     node.id = newId;
//   });

//   fixedEdges.forEach((edge) => {
//     edge.source = idMap[edge.source];
//     edge.target = idMap[edge.target];
//   });

//   // ===== 1. 构建 nodeMap =====
//   const nodeMap = new Map();
//   fixedNodes.forEach((n) => nodeMap.set(n.id, n));

//   // ===== 2. 校验 type 和 nodeid =====
//   fixedNodes.forEach((node) => {
//     if (node.type === "if") {
//       node.nodeid = "boolNode";
//       node.type = "boolean"; // 👈 改这里
//       errors.push(`节点 ${node.id} 修正为 boolean`);
//     }
//     if (node.type === "switch") {
//       node.nodeid = "switchNode";
//     }
//     if (node.type === "for") {
//       node.nodeid = "forNode";
//     }
//     if (node.type === "when") {
//       node.nodeid = "whenNode";
//     }
//   });

//   // ===== 3. 边合法性校验 =====
//   fixedEdges = fixedEdges.filter((e) => {
//     if (!nodeMap.has(e.source) || !nodeMap.has(e.target)) {
//       errors.push(`非法边 ${e.source} → ${e.target} 已删除`);
//       return false;
//     }
//     return true;
//   });

//   // ===== 4. 构建邻接表 =====
//   const outMap = {};
//   const inMap = {};
//   fixedNodes.forEach((n) => {
//     outMap[n.id] = [];
//     inMap[n.id] = [];
//   });

//   fixedEdges.forEach((e) => {
//     outMap[e.source].push(e);
//     inMap[e.target].push(e);
//   });

//   // =====================================================
//   // 🔥 5. common 节点限制（核心新增）
//   // =====================================================
//   fixedNodes.forEach((node) => {
//     if (node.type === "common") {
//       const outs = outMap[node.id];

//       if (outs.length > 1) {
//         const keep = outs[0]; // 只保留第一条
//         errors.push(`common节点 ${node.id} 多出口，已裁剪`);

//         fixedEdges = fixedEdges.filter(
//           (e) => e === keep || e.source !== node.id
//         );

//         outMap[node.id] = [keep];
//       }

//       // 👉 如果你还要限制“只能一个输入”，加这个
//       const ins = inMap[node.id];
//       if (ins.length > 1) {
//         const keepIn = ins[0];
//         errors.push(`common节点 ${node.id} 多入口，已裁剪`);

//         fixedEdges = fixedEdges.filter(
//           (e) => e === keepIn || e.target !== node.id
//         );

//         inMap[node.id] = [keepIn];
//       }
//     }
//   });

//   // ===== 6. for 校验 =====
//   fixedNodes.forEach((node) => {
//     if (node.type === "for") {
//       const outs = outMap[node.id];

//       if (outs.length === 0) {
//         errors.push(`for节点 ${node.id} 没出口，自动补`);
//         if (fixedNodes.length > 1) {
//           fixedEdges.push({
//             source: node.id,
//             target: fixedNodes[0].id,
//           });
//         }
//       }

//       if (outs.length > 1) {
//         const keep = outs[0];
//         errors.push(`for节点 ${node.id} 多出口，已修复`);

//         fixedEdges = fixedEdges.filter(
//           (e) => e === keep || e.source !== node.id
//         );

//         outMap[node.id] = [keep];
//       }
//     }
//   });

//   // ===== 7. when 校验 =====
//   fixedNodes.forEach((node) => {
//     if (node.type === "when") {
//       const outs = outMap[node.id];
//       if (outs.length < 2 && outs.length > 0) {
//         fixedEdges.push({
//           source: node.id,
//           target: outs[0].target,
//           label: "auto",
//         });
//         errors.push(`when节点 ${node.id} 自动补分支`);
//       }
//     }
//   });

//   // ===== 8. boolean(if) 校验 =====
//   fixedNodes.forEach((node) => {
//     if (node.type === "boolean") {
//       const outs = outMap[node.id];
//       if (outs[0] && !outs[0].label) outs[0].label = "true";
//       if (outs[1] && !outs[1].label) outs[1].label = "false";
//     }
//   });

//   // ===== 9. switch 校验 =====
//   fixedNodes.forEach((node) => {
//     if (node.type === "switch") {
//       const outs = outMap[node.id];
//       const labels = outs.map((e) => e.label);
//       const set = new Set(labels);

//       if (labels.length !== set.size) {
//         errors.push(`switch节点 ${node.id} 存在重复分支`);
//       }

//       const hasDefault = outs.some((e) => e.label === "default");
//       if (!hasDefault && outs.length > 0) {
//         outs[0].label = outs[0].label || "default";
//         errors.push(`switch节点 ${node.id} 自动补 default`);
//       }
//     }
//   });

//   // ===== 10. 环检测 =====
//   function hasCycle() {
//     const visited = new Set();
//     const stack = new Set();

//     function dfs(id) {
//       if (stack.has(id)) return true;
//       if (visited.has(id)) return false;

//       visited.add(id);
//       stack.add(id);

//       for (let e of outMap[id]) {
//         if (dfs(e.target)) return true;
//       }

//       stack.delete(id);
//       return false;
//     }

//     return fixedNodes.some((n) => dfs(n.id));
//   }

//   if (hasCycle()) {
//     errors.push("检测到循环依赖（非法流程）");
//   }

//   // ===== 11. 找入口节点 =====
//   const entryNodes = fixedNodes.filter((n) => inMap[n.id].length === 0);

//   // ===== 12. 连接 start =====
//   entryNodes.forEach((node) => {
//     if (node.id === startId) return;
//     fixedEdges.push({
//       source: startId,
//       target: node.id,
//     });
//   });

//   // ===== 13. 断链检测 =====
//   fixedNodes.forEach((node) => {
//     const outs = outMap[node.id];
//     if (outs.length === 0 && node.type !== "common") {
//       errors.push(`节点 ${node.id} 可能流程中断`);
//     }
//   });

//   return {
//     nodes: fixedNodes,
//     edges: fixedEdges,
//     errors,
//   };
// }
// 解析AI生成的流程结构,nodes和edges
export function safeParseAI(content) {
  if (!content) return null;

  // 标准化
  content = content
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/“|”/g, '"')
    .replace(/'/g, '"');

  // 提取 JSON
  const match = content.match(/\{[\s\S]*\}/);

  if (!match) return null;

  let jsonStr = match[0];

  // 去尾逗号
  jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  try {
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}
