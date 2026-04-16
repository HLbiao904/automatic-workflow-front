import request from "@/systemManagement/src/utils/request";

/**
 * 执行流程
 */
export function executeWorkflow(data) {
  return request({
    url: "/api//workflowExecute/execute",
    method: "POST",
    data,
  });
}

/**
 * 执行记录列表（主接口）
 */
export function listExecutions(data) {
  return request({
    url: "/api/workflowExecute/listExecutions",
    method: "POST",
    data,
  });
}

/**
 * 查询执行数量
 */
export function countExecutions(data) {
  return request({
    url: "/api/workflowExecute/countExecutions",
    method: "POST",
    data,
  });
}

/**
 * 删除执行记录
 */
export function deleteExecution(id) {
  return request({
    url: "/api/workflowExecute/delete",
    method: "DELETE",
    params: { id },
  });
}

/**
 * 批量删除
 */
export function deleteBatch(ids) {
  return request({
    url: "/api/workflowExecute/deleteBatch",
    method: "PUT",
    data: ids,
  });
}

/**
 * 查询执行版本（流程回放）
 */
export function getExecutionVersion(id) {
  return request({
    url: "/api/workflowExecute/executionVersion",
    method: "GET",
    params: { id },
  });
}

/**
 * 查询节点执行日志
 */
export function getExecutionNodes(executionId) {
  return request({
    url: "/api/workflowExecute/queryExecutionNodes",
    method: "GET",
    params: { executionId },
  });
}
