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
import { ref, watch, nextTick, computed, onUpdated } from "vue";
import service from "../service/index.js";

const props = defineProps({
  sessionId: {
    type: Number,
    default: null,
  },
  isNewSession: {
    type: Boolean,
    default: false,
  },
});
const emit = defineEmits(["session-created", "title-updated"]);

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

  // 1️⃣ 立即显示用户消息
  messages.value.push({
    id: Date.now(),
    role: "user",
    content: question,
  });

  await nextTick();
  scrollBottom();

  let sid = localSessionId.value;

  try {
    // 2️⃣ 第一次对话 → 创建 session
    if (!sid) {
      const res = await service.post("/chat/newSession", {
        userId: localStorage.getItem("userId"),
        title: question.slice(0, 20),
      });

      sid = res.data.id;
      localSessionId.value = sid;
      emit("session-created", res.data);
    }

    // 3️⃣ 占位 AI 消息
    const aiMsg = {
      id: Date.now() + Math.random(),
      role: "assistant",
      content: "",
    };
    messages.value.push(aiMsg);

    await nextTick();
    scrollBottom();

    // 4️⃣ 使用 fetch 接收 SSE 流
    // fetch SSE
    const response = await fetch("http://127.0.0.1:8080/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        memoryId: sid,
        message: question,
      }),
    });

    if (!response.body) {
      throw new Error("当前浏览器不支持流式响应");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let aiText = "";

    while (true) {
      const { value, done } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });

        // 统一处理 \r\n 和 \n
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop(); // 残留半行

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5).trimStart();

            // SSE 规范：空 data 表示事件结束
            if (data === "") {
              aiText += "\n";
            } else {
              aiText += data;
            }
          }
        }

        const msg = messages.value.find((m) => m.id === aiMsg.id);
        if (msg) msg.content = aiText;

        await nextTick();
        scrollBottom();
      }

      if (done) {
        // ⭐ 最后再处理一次 buffer（防止吞字）
        if (buffer.startsWith("data:")) {
          aiText += buffer.slice(5).trimStart();
          const msg = messages.value.find((m) => m.id === aiMsg.id);
          if (msg) msg.content = aiText;
        }
        break;
      }
    }

    // 6️⃣ 只在新会话第一次回复后生成标题
    if (props.isNewSession) {
      generateTitle(question);
    }
  } catch (e) {
    console.error(e);
    const msg = messages.value.find((m) => m.role === "assistant");
    if (msg) msg.content = "请求失败，请稍后重试";
  } finally {
    loading.value = false;
  }
}

async function generateTitle(question) {
  // 可以让后端直接用 AI，也可以前端调 AI
  const res = await service.post("/chat/session/generateTitle", null, {
    params: {
      sessionId: props.sessionId,
      question,
    },
  });

  console.log("标题", res.data);
  const title = res.data;

  // 通知父组件更新 UI
  emit("title-updated", {
    sessionId: props.sessionId,
    title,
  });
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
