<template>
  <div :class="['chat-view', { empty: isEmpty }]">
    <!-- 消息区 -->
    <div class="messages" ref="msgBox">
      <div class="center-container">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message', msg.role]"
        >
          <div class="bubble">
            <!-- AI：Markdown -->
            <div v-if="msg.role === 'assistant'">
              <!-- 流式阶段：纯文本 -->
              <pre v-if="msg.streaming" class="stream-text"
                >{{ msg.content }}
              </pre>

              <!-- 完成后：Markdown -->
              <div v-else class="markdown-body" v-html="msg.html"></div>
            </div>

            <!-- 用户：纯文本 -->
            <div v-else>
              {{ msg.content }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部输入区（不再 fixed） -->
    <div class="input-wrapper">
      <div v-if="isEmpty" class="welcome">
        <h2>开始新的对话</h2>
      </div>
      <div class="floating-input">
        <textarea
          v-model="input"
          @keydown.enter.prevent="send"
          placeholder="输入你的问题..."
          :disabled="loading"
        ></textarea>

        <button @click="send" :disabled="loading">
          {{ loading ? "思考中…" : "发送" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed } from "vue";
import { marked } from "marked";
import "github-markdown-css/github-markdown-light.css";
import service from "../service/index.js";

/* ---------------- props / emit ---------------- */

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

const emit = defineEmits([
  "session-created",
  "title-updated",
  "change-isNewSession",
]);

/* ---------------- markdown config ---------------- */

marked.setOptions({
  gfm: true,
  breaks: true,
});
const isEmpty = computed(() => messages.value.length === 0);
/* ---------------- state ---------------- */

const messages = ref([]);
const input = ref("");
const loading = ref(false);
const msgBox = ref(null);
const localSessionId = ref(props.sessionId);

/* ---------------- watch session change ---------------- */

watch(
  () => props.sessionId,
  (newId) => {
    if (!newId) {
      // 新会话 → 清空消息
      messages.value = []; // 清空历史消息,计算属性会根据这里判断是否展示新会话
      localSessionId.value = null;
      return;
    }
    if (newId && newId !== localSessionId.value) {
      localSessionId.value = newId;
      loadHistory(newId);
    }
  },
  { immediate: true },
);
/* ---------------- history ---------------- */

async function loadHistory(sessionId) {
  try {
    const res = await service.get("/chat/messageHistory/list", {
      params: { sessionId },
    });

    messages.value = (res.data || []).map((m, idx) => ({
      id: Date.now() + idx,
      role: m.role,
      content: m.content,
      html: m.role === "assistant" ? marked.parse(m.content || "") : "",
    }));

    await nextTick();
    scrollBottom();
  } catch (e) {
    console.error("加载历史失败", e);
  }
}

/* ---------------- send message ---------------- */

async function send() {
  if (!input.value.trim() || loading.value) return;

  loading.value = true;
  const question = input.value.trim();
  input.value = "";

  // 1️⃣ 用户消息
  messages.value.push({
    id: Date.now(),
    role: "user",
    content: question,
  });

  await nextTick();
  scrollBottom();

  let sid = localSessionId.value;

  try {
    // 2️⃣ 创建 session
    if (props.isNewSession) {
      const res = await service.post("/chat/newSession", {
        userId: localStorage.getItem("userId"),
        title: "新对话",
      });

      sid = res.data.id;
      localSessionId.value = sid;
      emit("session-created", res.data);
    }

    // 3️⃣ AI 占位
    const aiMsg = {
      id: Date.now() + Math.random(),
      role: "assistant",
      content: "",
      html: "",
      streaming: true, // 新增
    };
    messages.value.push(aiMsg);

    await nextTick();
    scrollBottom();

    // 4️⃣ SSE 请求
    const response = await fetch("http://127.0.0.1:10089/chat", {
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
      throw new Error("浏览器不支持流式响应");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let markdownText = "";

    while (true) {
      const { value, done } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith("data:")) {
            const data = line.slice(5);
            markdownText += data === "" ? "\n" : data;
          }
        }

        // 只更新纯文本 → 真流式
        // 用响应式对象更新
        const lastMsg = messages.value[messages.value.length - 1];
        lastMsg.content = markdownText;

        await nextTick();
        scrollBottom();
      }

      if (done) {
        // 结束后一次性转 markdown
        aiMsg.streaming = false;
        aiMsg.html = marked.parse(markdownText);
        break;
      }
    }

    // 6️⃣ 新会话生成标题
    if (props.isNewSession) {
      generateTitle(question);
    }
    emit("change-isNewSession"); // 将新会话状态置为false
  } catch (e) {
    console.error(e);
    const msg = messages.value.find((m) => m.role === "assistant");
    if (msg) {
      msg.content = "请求失败，请稍后重试";
      msg.html = "<p>请求失败，请稍后重试</p>";
    }
  } finally {
    loading.value = false;
  }
}

/* ---------------- title ---------------- */

async function generateTitle(question) {
  const res = await service.post("/chat/session/generateTitle", null, {
    params: {
      sessionId: localSessionId.value,
      question,
    },
  });

  emit("title-updated", {
    sessionId: localSessionId.value,
    title: res.data,
  });
}

/* ---------------- scroll ---------------- */

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

/* ================= 消息区域 ================= */

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
  display: flex;
  justify-content: center;
}

.center-container {
  width: 75%;
  max-width: 900px;
}

.message {
  display: flex;
  margin-bottom: 14px;
}

.message.user {
  justify-content: flex-end;
}

.message.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 100%;
  padding: 12px 16px;
  border-radius: 16px;
  line-height: 1.6;
  word-break: break-word;
}

.user .bubble {
  background: #3b82f6;
  color: #fff;
}

.assistant .bubble {
  background: #fff;
  border: 1px solid #e5e7eb;
}

/* ================= 输入区域 ================= */

.input-wrapper {
  display: flex;
  justify-content: center;
  padding: 12px 0 24px;
  background: transparent;
}

.floating-input {
  width: 60%;
  max-width: 720px;
  min-width: 400px;

  display: flex;
  align-items: center; /* ⭐ 垂直居中关键 */
  gap: 12px;

  padding: 8px 16px;
  background: #ffffff;
  border-radius: 999px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

/* 输入框 */

.floating-input textarea {
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: transparent;

  font-size: 14px;
  line-height: 1.4;

  height: 24px; /* ⭐ 固定高度让文字居中 */
  padding: 0;
  margin: 0;

  overflow-y: auto;
}

/* 发送按钮 */

.floating-input button {
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: 999px;
  background: #3b82f6;
  color: #fff;
  border: none;
  font-size: 14px;
  cursor: pointer;
}

.floating-input button:disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

/* ================= 流式文本 ================= */

.stream-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
}
/* ================= 空状态 ================= */

/* ================= ChatGPT 空状态 ================= */

.chat-view.empty {
  justify-content: center;
  background: linear-gradient(180deg, #f9fafb 0%, #f3f4f6 100%);
}

.chat-view.empty .messages {
  display: none;
}

.chat-view.empty .input-wrapper {
  flex: none;
  padding: 0;
}
/* 欢迎标题 */
.welcome {
  text-align: center;
  margin-bottom: 48px;
  animation: fadeIn 0.6s ease;
}

.welcome h2 {
  font-size: 32px;
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.5px;
}

.floating-input {
  transition: all 0.35s ease;
}

.chat-view.empty .floating-input {
  transform: translateY(-20px);
  animation: floatUp 0.5s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes floatUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(-20px);
  }
}
</style>
