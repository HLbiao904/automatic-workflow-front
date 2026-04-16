import request from "@/systemManagement/src/utils/request";

/** ================= 会话 ================= */

// 获取会话列表
export function getSessionList(userId) {
  return request({
    url: "/chat/sessionHistory/list",
    method: "GET",
    params: { userId },
  });
}
// 获取所有会话列表
export function getAllSessionList() {
  return request({
    url: "/chat/sessionHistory/all",
    method: "GET",
  });
}
// 新建会话
export function createSession(data) {
  return request({
    url: "/chat/newSession",
    method: "POST",
    data,
  });
}

// 重命名会话
export function renameSession(sessionId, title) {
  return request({
    url: `/chat/session/rename/${sessionId}`,
    method: "PUT",
    params: { title },
  });
}

// 删除会话
export function deleteSession(sessionId) {
  return request({
    url: `/chat/session/delete/${sessionId}`,
    method: "DELETE",
  });
}

/** ================= 消息 ================= */

// 获取消息记录
export function getMessageList(sessionId) {
  return request({
    url: "/chat/messageHistory/list",
    method: "GET",
    params: { sessionId },
  });
}
