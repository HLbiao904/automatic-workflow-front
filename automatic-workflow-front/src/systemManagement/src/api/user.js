import request from "@/systemManagement/src/utils/request";
/**
 * 创建用户
 */
export function addUser(data) {
  return request({
    url: "/user/add",
    method: "POST",
    data,
  });
}

/**
 * 根据关键字获取用户列表
 */
export function getUserList(params) {
  return request({
    url: "/user/list",
    method: "GET",
    params,
  });
}
/**
 * 获取所有用户
 */
export function getAllUserList() {
  return request({
    url: "/user/allUserList",
    method: "GET",
  });
}
/**
 * 根据ID查询用户
 */
export function queryUserById(id) {
  return request({
    url: `/user/queryUserById/${id}`,
    method: "GET",
  });
}
/**
 * 删除用户
 */
export function deleteUser(id) {
  return request({
    url: `/user/${id}`,
    method: "DELETE",
  });
}

/**
 * 更新用户（修正）
 */
export function updateUser(data) {
  return request({
    url: "/user/update",
    method: "PUT",
    data,
  });
}

/**
 * 更新用户状态（建议补上）
 */
export function updateUserStatus(id, status) {
  return request({
    url: "/user/status",
    method: "PUT",
    params: { id, status },
  });
}
