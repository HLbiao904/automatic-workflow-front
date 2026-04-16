import request from "@/systemManagement/src/utils/request";

/* ================= 节点 ================= */

/** 获取节点列表 */
export function getNodeList(params) {
  return request({
    url: "/node/list",
    method: "GET",
    params,
  });
}
/** 获取所有节点 */
export function getAllNodeList() {
  return request({
    url: "/node/all",
    method: "GET",
  });
}
/** 获取节点详情 */
export function getNodeDetail(nodeId) {
  return request({
    url: `/node/detail/${nodeId}`,
    method: "GET",
  });
}

/** 新增节点 */
export function addNode(data) {
  return request({
    url: "/node/add",
    method: "POST",
    data,
  });
}

/** 更新节点 */
export function updateNode(data) {
  return request({
    url: "/node/update",
    method: "PUT",
    data,
  });
}

/** 删除节点 */
export function deleteNode(nodeId) {
  return request({
    url: `/node/${nodeId}`,
    method: "DELETE",
  });
}

/** 更新参数 */
export function updateNodeParams(nodeId, params) {
  return request({
    url: "/node/params",
    method: "PUT",
    params: { nodeId },
    data: params,
  });
}
/** 更新节点状态 */
export function updateNodeStatus(nodeId, status) {
  return request({
    url: "/node/status",
    method: "PUT",
    params: { nodeId, status },
  });
}
/** 分类 */
export function getCategoryList() {
  return request({
    url: "/node/category/list",
    method: "GET",
  });
}
/** 上传云端图标 */
export function uploadIcon(file, nodeId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("nodeId", nodeId);

  return request({
    url: "/nodes/uploadIcon",
    method: "POST",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

/** 上传本地图标 */
export function uploadLocalIcon(file, nodeId) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("nodeId", nodeId);

  return request({
    url: "/nodes/uploadLocalIcon",
    method: "POST",
    data: formData,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
