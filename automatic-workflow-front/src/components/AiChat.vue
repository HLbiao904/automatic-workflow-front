<template>
  <div class="chat-layout">
    <!-- 左侧聊天区 -->
    <main class="chat-main">
      <ChatView />
    </main>

    <!-- 右侧会话栏 -->
    <aside class="sidebar" :class="{ collapsed }">
      <div class="sidebar-header">
        <div class="show-sidebar" @click="collapsed = !collapsed">
          <img src="../assets/sidebar.svg" />
        </div>
        <span v-if="!collapsed">对话记录</span>
      </div>

      <ul v-if="!collapsed" class="chat-list">
        <li v-for="item in sessions" :key="item.id" class="chat-item">
          {{ item.title }}
        </li>
      </ul>
    </aside>
  </div>
</template>

<script setup>
import { ref } from "vue";
import ChatView from "./ChatView.vue";

const collapsed = ref(false);

const sessions = ref([
  { id: 1, title: "工作流设计问题" },
  { id: 2, title: "Vue 布局问题" },
]);
</script>
<style scoped lang="scss">
.chat-layout {
  height: 100vh;
  display: flex;
  background: #f5f7fa;
}

/* 左侧栏 */
.sidebar {
  width: 240px;
  background: #fff;
  color: #1e1e1e;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e5e7eb;

  &.collapsed {
    width: 56px;
  }
}

.sidebar-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  .show-sidebar {
    cursor: pointer;
    width: 18px;
    height: 18px;
    img {
      width: 100%;
      height: 100%;
    }
  }
}

.chat-list {
  list-style: none;
  margin: 0;
  padding: 8px;
}

.chat-item {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

/* 右侧主区域 */
.chat-main {
  flex: 1;
  display: flex;
  justify-content: center;
}
</style>
