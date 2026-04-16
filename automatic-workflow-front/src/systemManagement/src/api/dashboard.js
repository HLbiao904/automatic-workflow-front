import request from "@/systemManagement/src/utils/request";

/**
 * 获取系统总览KPI
 */
export function getDashboardOverview() {
  return request({
    url: "/api/dashboard/overview",
    method: "GET",
  });
}

/**
 * 获取执行趋势（折线图）
 */
export function getExecutionTrend() {
  return request({
    url: "/api/dashboard/executionTrend",
    method: "GET",
  });
}

/**
 * 获取执行状态分布（饼图）
 */
export function getStatusPie() {
  return request({
    url: "/api/dashboard/statusPie",
    method: "GET",
  });
}

/**
 * 获取工作流执行排行（柱状图）
 */
export function getWorkflowTop() {
  return request({
    url: "/api/dashboard/workflowTop",
    method: "GET",
  });
}

export function getNodePerformance() {
  return request({
    url: "/api/dashboard/node/performance",
    method: "GET",
  });
}
