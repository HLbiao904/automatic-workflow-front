import request from "@/systemManagement/src/utils/request";

/**
 * 获取节点（LiteFlow）
 */
export function getNodes() {
  return request({
    url: "/api/workflow/getNodes",
    method: "GET",
  });
}

/**
 * 创建工作流
 */
export function createWorkflow(data) {
  return request({
    url: "/api/workflow/create",
    method: "POST",
    data,
  });
}

/**
 * 获取工作流详情
 */
export function getWorkflow(id) {
  return request({
    url: `/api/workflow/${id}`,
    method: "GET",
  });
}

/**
 * 工作流列表（按用户）
 */
export function getWorkflowList(userId) {
  return request({
    url: "/api/workflow/list",
    method: "GET",
    params: { userId },
  });
}
/**
 * 修改工作流
 */
export function modifyWorkflow(data) {
  return request({
    url: "/api/workflow/modify",
    method: "POST",
    data,
  });
}

/**
 * 删除工作流
 */
export function deleteWorkflow(workflowId) {
  return request({
    url: "/api/workflow/delete",
    method: "POST",
    params: { workflowId },
  });
}

/**
 * 执行工作流（LiteFlow）
 */
export function executeWorkflow(data) {
  return request({
    url: "/api/workflow/execute",
    method: "POST",
    data,
  });
}

/**
 * 获取工作流版本
 */
export function getWorkflowVersions(params) {
  return request({
    url: "/workflow/version/list",
    method: "GET",
    params,
  });
}
/**
 * 根据id获取版本
 */
export function getVersionById(params) {
  return request({
    url: "/workflow/version/getVersion",
    method: "GET",
    params,
  });
}
/**
 * 获取工作流执行记录
 */
export function getWorkflowExecutions(params) {
  return request({
    url: "/api/workflowExecute/list",
    method: "GET",
    params,
  });
}
