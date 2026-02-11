<template>
  <div class="chat-view">
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
              <pre v-if="msg.streaming" class="stream-text">{{
                msg.content
              }}</pre>

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

    <!-- 输入区 -->
    <div class="input-bar">
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
</template>

<script setup>
import { ref, watch, nextTick } from "vue";
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

const emit = defineEmits(["session-created", "title-updated"]);

/* ---------------- markdown config ---------------- */

marked.setOptions({
  gfm: true,
  breaks: true,
});

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
    if (!sid) {
      const res = await service.post("/chat/newSession", {
        userId: localStorage.getItem("userId"),
        title: question.slice(0, 20),
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

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  justify-content: center;
}

.center-container {
  width: 75%;
}

.message {
  display: flex;
  margin-bottom: 12px;
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

/* 输入区 */
.input-bar {
  display: flex;
  padding: 12px;
  gap: 12px;
  background: #fff;
  border-top: 1px solid #e5e7eb;
}

.input-bar textarea {
  flex: 1;
  resize: none;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}
.input-bar button {
  padding: 0 20px;
  border-radius: 12px;
  background: #3b82f6;
  color: #fff;
}
.stream-text {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
}
</style>
