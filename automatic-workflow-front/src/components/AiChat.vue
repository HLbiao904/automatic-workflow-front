<template>
  <div class="chat-layout">
    <!-- 左侧聊天区 -->
    <main class="chat-main">
      <ChatView
        :sessionId="currentSessionId"
        @session-created="onSessionCreated"
        @title-updated="onTitleUpdated"
        :isNewSession="isNewSession"
      />
    </main>

    <!-- 右侧会话栏 -->
    <aside class="sidebar" :class="{ collapsed }">
      <!-- 顶部 -->
      <div class="sidebar-header">
        <div class="show-sidebar" @click="collapsed = !collapsed">
          <img src="../assets/sidebar.svg" />
        </div>
        <span v-if="!collapsed">对话记录</span>
      </div>

      <!-- 新聊天 -->
      <div class="new-chat-box" :class="{ collapsed }">
        <div class="new-chat" @click="createSession" v-if="!collapsed">
          <img src="../assets/newChat.svg" />
          <div class="newChat-title">新聊天</div>
        </div>
        <img v-else src="../assets/newChat.svg" />
      </div>

      <!-- 搜索 -->
      <div class="search-box" :class="{ collapsed }">
        <div class="search-chat" v-if="!collapsed" @click="openSearchDialog">
          <img src="../assets/searchNode.svg" />
          <div class="search-title">搜索聊天</div>
        </div>
        <img
          v-else
          src="../assets/searchNode.svg"
          class="search-icon"
          @click="openSearchDialog"
        />
      </div>

      <!-- 会话列表 -->
      <ul v-if="!collapsed" class="chat-list">
        <li
          v-for="item in sessions"
          :key="item.id"
          class="chat-item"
          :class="{ active: item.id === currentSessionId }"
          @click="switchSession(item)"
        >
          {{ item.title }}
        </li>
      </ul>
    </aside>
    <SearchChatDialog
      v-model="showSearchDialog"
      :sessions="sessions"
      @select="onSelectSession"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from "vue";
import ChatView from "./ChatView.vue";
import service from "../service/index.js";
import SearchChatDialog from "../components/SearchChatDialog.vue";

let userId = null;
const collapsed = ref(false);

const sessions = ref([]); // 接口来的 historySession
const currentSessionId = ref(null);

const showSearchDialog = ref(false);
const isNewSession = ref(false)
/* watch(
  () => props.sessionId,
  (newId) => {
    messages.value = [];
    loadHistory(newId);
  },
); */
function openSearchDialog() {
  showSearchDialog.value = true;
}
function onSelectSession(session) {
  currentSessionId.value = session.id;
  showSearchDialog.value = false;
}
function onSessionCreated(session) {
  sessions.value.unshift(session);
  currentSessionId.value = session.id;
}

async function loadSessions() {
  const res = await service.get("/chat/sessionHistory/list", {
    params: {
      userId,
    },
  });
  sessions.value = res.data || [];
  console.log("sessions", res.data);

  // 默认选中最近一个
  if (!currentSessionId.value && sessions.value.length) {
    currentSessionId.value = sessions.value[0].id;
  }
}
function onTitleUpdated({ sessionId, title }) {
  const target = sessions.value.find((s) => s.id === sessionId);
  if (target) {
    target.title = title;
  }
  isNewSession.value=false
}

onMounted(() => {
  userId = localStorage.getItem("userId");
  loadSessions();
});
async function createSession() {
  const res = await service.post("/chat/newSession", {
    userId,
    title: "新对话",
  });
  isNewSession.value = true
  const newSession = res.data;
  sessions.value.unshift(newSession);
  currentSessionId.value = newSession.id;
}
function switchSession(session) {
  if (session.id == currentSessionId.value) return;
  currentSessionId.value = session.id;
}
</script>
<style scoped lang="scss">
/* 整体布局 */
.chat-layout {
  height: 100vh;
  display: flex;
  background: #f5f7fa;
}

/* ===== 侧边栏 ===== */
.sidebar {
  width: 260px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
  border-left: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  box-shadow: -2px 0 6px rgba(0, 0, 0, 0.03);

  &.collapsed {
    width: 56px;
    display: flex;
    align-items: center;
  }
}

/* 顶部 */
.sidebar-header {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #eef0f3;
}

/* 折叠按钮 */
.show-sidebar {
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  // transition: background 0.15s;

  &:hover {
    background: #f1f5f9;
  }

  img {
    width: 18px;
    height: 18px;
  }
}

/* 会话列表 */
.chat-list {
  flex: 1;
  list-style: none;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
}

/* 会话项 */
.chat-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #374151;
  margin-bottom: 4px;
  transition:
    background 0.15s,
    color 0.15s;

  &:hover {
    background: #f3f4f6;
  }

  &.active {
    background: #e0edff;
    color: #2563eb;
    font-weight: 500;
  }
}
.chat-item.active {
  background: #e0edff;
  color: #2563eb;
}

/* 折叠状态隐藏列表 */
.sidebar.collapsed .chat-list {
  display: none;
}

/* ===== 主聊天区 ===== */
.chat-main {
  flex: 1;
  display: flex;
}
.new-chat-box {
  padding: 8px;

  .new-chat {
    border-radius: 8px;
    padding: 6px;
    display: flex;
    align-items: center;
    img {
      width: 25px;
      height: 25px;
    }
    .newChat-title {
      margin-left: 5px;
      flex: 1;
      font-size: 16px;
    }
  }
  .new-chat:hover {
    cursor: pointer;
    background: #f3f4f6;
  }
}
/* 折叠状态时按钮居中 */
.new-chat-box.collapsed img {
  width: 25px;
  height: 25px;
}

.search-box.collapsed img {
  width: 25px;
  height: 25px;
}
.search-box {
  padding: 0 8px 8px;

  .search-chat {
    border-radius: 8px;
    padding: 6px;
    display: flex;
    align-items: center;
    img {
      width: 25px;
      height: 25px;
    }
    .search-title {
      margin-left: 5px;
      flex: 1;
      font-size: 16px;
    }
  }
  .search-chat:hover {
    cursor: pointer;
    background: #f3f4f6;
  }
}
</style>
