<template>
  <div class="chat-wrapper" :class="{ started }">
    <!-- 消息区 -->
    <div v-if="started" class="chat-messages">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="chat-msg"
        :class="msg.role"
      >
        {{ msg.content }}
      </div>
    </div>

    <!-- 输入框 -->
    <div class="chat-input-wrapper">
      <div class="chat-input">
        <input
          v-model="input"
          placeholder="请输入你的问题…"
          @keydown.enter="send"
        />
        <button @click="send">发送</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";

const input = ref("");
const messages = ref([]);

const started = computed(() => messages.value.length > 0);

function send() {
  if (!input.value.trim()) return;

  messages.value.push({
    role: "user",
    content: input.value,
  });

  input.value = "";
}
</script>
<style lang="scss" scoped>
.chat-wrapper {
  width: 100%;
  max-width: 900px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ===== 没开始对话：输入框居中 ===== */
.chat-wrapper:not(.started) {
  justify-content: center;
}

/* ===== 已开始对话 ===== */
.chat-wrapper.started {
  justify-content: space-between;
}

/* 消息区 */
.chat-messages {
  flex: 1;
  padding: 24px 0;
  overflow-y: auto;
}

/* 输入框容器 */
.chat-input-wrapper {
  padding: 24px 0;
  display: flex;
  justify-content: center;
}

/* 输入框本体（宽度限制） */
.chat-input {
  width: 100%;
  max-width: 640px;
  display: flex;
  gap: 12px;

  input {
    flex: 1;
    padding: 12px 16px;
    border-radius: 24px;
    border: 1px solid #dcdfe6;
    font-size: 14px;
  }

  button {
    padding: 0 20px;
    border-radius: 24px;
    border: none;
    background: #409eff;
    color: #fff;
    cursor: pointer;
  }
}

/* 消息气泡（简单版） */
.chat-msg {
  margin-bottom: 12px;
  max-width: 70%;
}

.chat-msg.user {
  align-self: flex-end;
  background: #409eff;
  color: #fff;
  padding: 10px 14px;
  border-radius: 12px;
}
</style>
