import request from "@/systemManagement/src/utils/request";

/** ================= 模板 ================= */

// 查询模板列表
export function getTemplateList(params) {
  return request({
    url: "/workflowTemplate/templateList",
    method: "GET",
    params,
  });
}

// 新建模板
export function createTemplate(data) {
  return request({
    url: "/workflowTemplate/createTemplate",
    method: "POST",
    data,
  });
}

// 删除模板（注意：你的后端是 /{id}）
export function deleteTemplate(id) {
  return request({
    url: `/workflowTemplate/${id}`,
    method: "DELETE",
  });
}

// 使用模板（使用次数+1）
export function useTemplate(id) {
  return request({
    url: `/workflowTemplate/use/${id}`,
    method: "POST",
  });
}
// 修改模板
export function updateTemplate(data) {
  return request({
    url: "/workflowTemplate/updateTemplate",
    method: "PUT",
    data,
  });
}
// 修改模板状态（启用/禁用）
export function updateTemplateStatus(id, status) {
  return request({
    url: `/workflowTemplate/updateTemplateStatus/${id}/${status}`,
    method: "PUT",
  });
}

/** ================= 分类 ================= */

// 分类列表
export function getCategoryList() {
  return request({
    url: "/workflowTemplate/templateCategoryList",
    method: "GET",
  });
}

// 根据ID查询分类
export function getCategoryById(categoryId) {
  return request({
    url: "/workflowTemplate/templateCategory",
    method: "GET",
    params: { categoryId },
  });
}

// 新增分类（注意接口名）
export function createCategory(data) {
  return request({
    url: "/workflowTemplate/createTemplateCategory",
    method: "POST",
    data,
  });
}

// 修改分类
export function updateCategory(data) {
  return request({
    url: "/workflowTemplate/updateCategory",
    method: "PUT",
    data,
  });
}

// 删除分类
export function deleteCategory(id) {
  return request({
    url: `/workflowTemplate/deleteCategory/${id}`,
    method: "DELETE",
  });
}
