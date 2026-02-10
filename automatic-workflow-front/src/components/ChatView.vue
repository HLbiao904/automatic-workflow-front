<template>
  <div class="chat-view">
    <div class="messages" ref="msgBox">
      <div class="center-container">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message', msg.role]"
        >
          <div class="bubble">
            {{ msg.content }}
          </div>
        </div>
      </div>
    </div>

    <div class="input-bar">
      <textarea
        v-model="input"
        @keydown.enter.prevent="send"
        placeholder="输入你的问题..."
        :disabled="loading"
      ></textarea>
      <button @click="send" :disabled="loading">发送</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
import service from "../service/index.js";

const props = defineProps({
  sessionId: {
    type: Number,
    default: null,
  },
});
const emit = defineEmits(["session-created"]);

const messages = ref([]);
const input = ref("");
const loading = ref(false);
const msgBox = ref(null);
const localSessionId = ref(props.sessionId);

// 当父组件切换 sessionId 时，加载历史
watch(
  () => props.sessionId,
  (newId) => {
    if (newId && newId !== localSessionId.value) {
      localSessionId.value = newId;
      loadHistory(newId);
    }
  },
  { immediate: true },
);

// 加载历史消息
async function loadHistory(sessionId) {
  if (!sessionId) return;
  try {
    const res = await service.get("/chat/messageHistory/list", {
      params: { sessionId },
    });
    messages.value = (res.data || []).map((m, idx) => ({
      ...m,
      id: Date.now() + idx,
    }));
    await nextTick();
    scrollBottom();
  } catch (e) {
    console.error("加载历史消息失败", e);
  }
}

async function send() {
  if (!input.value.trim() || loading.value) return;

  loading.value = true;
  const question = input.value.trim();
  input.value = "";

  // 用户消息立即显示
  messages.value.push({
    id: Date.now() + Math.random(),
    role: "user",
    content: question,
  });
  await nextTick();
  scrollBottom();

  let sid = localSessionId.value;

  try {
    // 第一次聊天，创建 session
    if (!sid) {
      const res = await service.post("/chat/newSession", {
        userId: localStorage.getItem("userId"),
        title: question.slice(0, 20),
      });
      sid = res.data.id;
      localSessionId.value = sid;
      emit("session-created", res.data);
    }

    // 占位 AI 消息
    const aiMsg = {
      id: Date.now() + Math.random(),
      role: "assistant",
      content: "思考中...",
    };
    messages.value.push(aiMsg);
    await nextTick();
    scrollBottom();

    // 请求 AI 回复
    const res = await service.post("/chat", {
      memoryId: sid,
      message: question,
    });

    // 根据 id 替换 AI 消息内容
    const msg = messages.value.find((m) => m.id === aiMsg.id);
    if (msg) msg.content = res.data;

    await nextTick();
    scrollBottom();
  } catch (e) {
    const msg = messages.value.find((m) => m.id === aiMsg.id);
    if (msg) msg.content = "请求失败，请稍后重试";
    console.error(e);
  } finally {
    loading.value = false;
  }
}

function scrollBottom() {
  if (msgBox.value) {
    msgBox.value.scrollTop = msgBox.value.scrollHeight;
  }
}
</script>

<style scoped>
.chat-view {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  justify-content: start;
  align-items: center;
  flex-direction: column;
  gap: 12px;
}

.message {
  width: 100%;
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}
.center-container {
  width: 75%;
}
.bubble {
  margin-bottom: 15px;
  padding: 10px 16px;
  border-radius: 16px;
  line-height: 1.5;
  word-break: break-word;
}

.user .bubble {
  background: #3b82f6;
  color: #fff;
}

.assistant .bubble {
  background: #fff;
  color: #111;
  border: 1px solid #e5e7eb;
}

/* GPT 风格输入框 */
.input-bar {
  display: flex;
  padding: 12px 16px;
  gap: 12px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  border-radius: 16px;
  margin: 0 16px 16px 16px;
}

.input-bar textarea {
  flex: 1;
  resize: none;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  outline: none;
  min-height: 48px;
  max-height: 120px;
}

.input-bar button {
  padding: 0 20px;
  border-radius: 12px;
  background: #3b82f6;
  color: #fff;
  font-weight: 500;
}
</style>
