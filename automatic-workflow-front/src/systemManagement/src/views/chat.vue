<template>
  <div class="chat-page">
    <!-- 左侧 -->
    <div class="left">
      <!-- 标题 -->
      <div class="header">
        <span>会话管理</span>
        <el-button size="small" type="primary" @click="handleNewSession">
          新建
        </el-button>
      </div>

      <!-- 搜索 -->
      <el-input
        v-model="keyword"
        placeholder="搜索会话 / 用户..."
        clearable
        class="search-input"
      />

      <!-- 会话列表 -->
      <div
        v-for="item in filteredSessionList"
        :key="item.id"
        class="session-item"
        :class="{ active: item.id === activeSessionId }"
        @click="selectSession(item)"
      >
        <img class="avatar" :src="item.avatar || defaultAvatar" />

        <div class="session-content">
          <div class="title">{{ item.title }}</div>
          <div class="meta">
            <span>{{ item.username || "匿名用户" }}</span>
            <span>{{ formatTime(item.updatedAt) }}</span>
          </div>
        </div>

        <div class="actions">
          <el-icon @click.stop="handleRename(item)">
            <Edit />
          </el-icon>
          <el-icon @click.stop="handleDelete(item.id)">
            <Delete />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 右侧 -->
    <div class="right">
      <div class="chat-header">
        {{ activeSession?.title || "请选择会话" }}
      </div>

      <div class="message-list" ref="msgRef">
        <div
          v-for="msg in messageList"
          :key="msg.id"
          class="message-row"
          :class="msg.role"
        >
          <div class="message">
            <template v-if="msg.role === 'user'">
              {{ msg.content }}
            </template>

            <template v-else>
              <div
                class="markdown-body"
                v-html="renderMarkdown(msg.content)"
              ></div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 重命名 -->
    <el-dialog v-model="renameVisible" title="重命名">
      <el-input v-model="renameTitle" />

      <template #footer>
        <el-button @click="renameVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRename"> 确定 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import {
  getAllSessionList,
  createSession,
  deleteSession,
  renameSession,
  getMessageList,
} from "@/systemManagement/src/api/chat";

import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Delete } from "@element-plus/icons-vue";
import MarkdownIt from "markdown-it";
import dayjs from "dayjs";

/** Markdown */
const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: true,
});

/** 默认头像 */
const defaultAvatar =
  "https://cube.elemecdn.com/3/7c/3c1c8e7a3b0f3b9c3c7e0b4e6c8b0jpeg.jpeg";

/** 数据 */
const sessionList = ref([]);
const activeSessionId = ref(null);
const activeSession = ref(null);
const messageList = ref([]);
const keyword = ref("");

const msgRef = ref();

/** 重命名 */
const renameVisible = ref(false);
const renameTitle = ref("");
const currentSessionId = ref(null);

/** 初始化 */
onMounted(() => {
  loadSessionList();
});

/** 获取会话 */
async function loadSessionList() {
  const res = await getAllSessionList();
  sessionList.value = res.data || res;
}

/** 搜索过滤 */
const filteredSessionList = computed(() => {
  if (!keyword.value) return sessionList.value;

  const key = keyword.value.toLowerCase();

  return sessionList.value.filter((item) => {
    return (
      item.title?.toLowerCase().includes(key) ||
      item.username?.toLowerCase().includes(key)
    );
  });
});

/** 选择 */
async function selectSession(item) {
  activeSessionId.value = item.id;
  activeSession.value = item;

  const res = await getMessageList(item.id);
  messageList.value = res.data || res;

  scrollToBottom();
}

/** 新建 */
async function handleNewSession() {
  await createSession({ title: "新会话" });
  ElMessage.success("创建成功");
  loadSessionList();
}

/** 删除 */
function handleDelete(id) {
  ElMessageBox.confirm("确认删除该会话？", "提示")
    .then(async () => {
      await deleteSession(id);
      ElMessage.success("删除成功");

      if (activeSessionId.value === id) {
        activeSessionId.value = null;
        messageList.value = [];
      }

      loadSessionList();
    })
    .catch(() => {});
}

/** 重命名 */
function handleRename(item) {
  currentSessionId.value = item.id;
  renameTitle.value = item.title;
  renameVisible.value = true;
}

async function submitRename() {
  await renameSession(currentSessionId.value, renameTitle.value);
  ElMessage.success("修改成功");
  renameVisible.value = false;
  loadSessionList();
}

/** Markdown */
function renderMarkdown(content) {
  return md.render(content || "");
}

/** 时间 */
function formatTime(time) {
  return time ? dayjs(time).format("MM-DD HH:mm") : "";
}

/** 滚动 */
function scrollToBottom() {
  nextTick(() => {
    if (msgRef.value) {
      msgRef.value.scrollTop = msgRef.value.scrollHeight;
    }
  });
}
</script>

<style scoped>
.chat-page {
  display: flex;
  height: 100%;
  background: #f5f7fa;
}

/* 左侧 */
.left {
  width: 280px;
  background: #fff;
  border-right: 1px solid #eee;
  padding: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-weight: bold;
}

.search-input {
  margin-bottom: 10px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
}

.session-item:hover {
  background: #f5f7fa;
}

.session-item.active {
  background: #e6f7ff;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.session-content {
  flex: 1;
}

.title {
  font-size: 14px;
  font-weight: 500;
}

.meta {
  font-size: 12px;
  color: #999;
  display: flex;
  justify-content: space-between;
}

.actions {
  display: flex;
  gap: 6px;
}

/* 右侧 */
.right {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.chat-header {
  padding: 12px;
  border-bottom: 1px solid #eee;
}

.message-list {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row.user {
  justify-content: flex-end;
}

.message {
  padding: 10px 14px;
  border-radius: 10px;
  max-width: 60%;
  width: fit-content;
}

.message-row.user .message {
  background: #409eff;
  color: #fff;
}

.message-row.assistant .message {
  background: #f5f7fa;
}

.markdown-body pre {
  background: #2d2d2d;
  color: #fff;
  padding: 10px;
}
</style>
