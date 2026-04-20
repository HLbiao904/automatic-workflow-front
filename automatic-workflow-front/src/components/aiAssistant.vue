<template>
  <div>
    <!-- 悬浮机器人 -->
    <div
      class="robot"
      :class="aiState"
      ref="lottieRef"
      :style="{ left: x + 'px', top: y + 'px' }"
      @mousedown="startDrag"
      @click="handleClick"
    ></div>

    <!-- 聊天面板 -->
    <el-card
      v-if="showChat"
      class="chat-panel"
      :style="panelStyle"
      shadow="always"
    >
      <!-- 头部 -->
      <template #header>
        <div class="header">
          <span class="title"
            ><img src="../assets/nodeIcons/robot.svg" alt="" /> AI助手</span
          >
          <span class="close" @click="showChat = false">×</span>
        </div>
      </template>

      <!-- 工具栏 -->
      <div class="toolbar">
        <div class="tool-group">
          <div class="tool-btn" @click="handleExplain">
            <i class="icon">🧠</i>
            <span>解释</span>
          </div>

          <div class="tool-btn" @click="handleAddNode">
            <i class="icon">➕</i>
            <span>节点</span>
          </div>

          <div class="tool-btn danger" @click="handleClear">
            <i class="icon">🗑</i>
            <span>清空</span>
          </div>
        </div>
      </div>

      <!-- 内容 -->
      <div class="content">
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['msg-row', msg.role]"
        >
          <div class="msg">
            <!-- AI -->
            <template v-if="msg.role === 'ai'">
              <div v-if="msg.streaming">
                {{ msg.text }}<span class="cursor">|</span>
              </div>
              <div
                v-else
                v-html="msg.html || msg.text"
                class="markdown-body"
              ></div>
            </template>

            <!-- 用户 -->
            <template v-else>
              {{ msg.text }}
            </template>
          </div>
        </div>
      </div>

      <!-- 输入 -->
      <div class="input-area">
        <div class="input-box">
          <el-input
            v-model="input"
            placeholder="输入你的问题..."
            @keyup.enter="sendMessage"
          />

          <div class="send-btn" @click="sendMessage">
            <img src="../assets/send.svg" />
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from "vue";
import lottie from "lottie-web";
import service from "@/service/index.js";
import animationData from "@/json/Anima Bot.json";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import "highlight.js/styles/github.css";
import "github-markdown-css/github-markdown.css";

// 代码高亮
const md = new MarkdownIt({
  html: true, // 支持HTML
  linkify: true, // 自动识别链接
  breaks: true, // 换行转 <br>
  highlight: function (code, lang) {
    try {
      return hljs.highlightAuto(code).value;
    } catch (e) {
      return code;
    }
  },
});
const aiState = ref("idle"); // idle | thinking | talking | success | error
let isSending = false; // 防止重复发送
const memoryId = ref(Date.now());
// lottie动画
const lottieRef = ref(null);
let animation = null;
// ================== 拖动 ==================
const x = ref(700);
const y = ref(300);

let dragging = false;
let offsetX = 0;
let offsetY = 0;
let moved = false;

onMounted(() => {
  animation = lottie.loadAnimation({
    container: lottieRef.value,
    renderer: "svg",
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid meet",
    },
  });

  lottieRef.value.addEventListener("mouseenter", () => {
    animation.setSpeed(1.5);
  });

  lottieRef.value.addEventListener("mouseleave", () => {
    animation.setSpeed(1);
  });
});
onUnmounted(() => {
  animation && animation.destroy();
});

const startDrag = (e) => {
  dragging = true;
  moved = false;
  offsetX = e.clientX - x.value;
  offsetY = e.clientY - y.value;

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", stopDrag);
};

const panelStyle = computed(() => {
  const panelWidth = 320;
  const panelHeight = 420;
  const gap = 5; // 和机器人留间距

  let left = x.value + 100 + gap; //机器人宽度100
  let top = y.value;

  // 如果右边不够，放左边
  if (left + panelWidth > window.innerWidth) {
    left = x.value - panelWidth - gap;
  }

  // 防止底部溢出
  if (top + panelHeight > window.innerHeight) {
    top = window.innerHeight - panelHeight - 10;
  }

  return {
    left: left + "px",
    top: top + "px",
  };
});
const onMove = (e) => {
  if (!dragging) return;
  moved = true;

  const robotWidth = 100; //和你CSS一致
  const robotHeight = 100;

  let newX = e.clientX - offsetX;
  let newY = e.clientY - offsetY;

  // 限制左右边界
  if (newX < 0) newX = 0;
  if (newX > window.innerWidth - robotWidth) {
    newX = window.innerWidth - robotWidth;
  }

  // 限制上下边界
  if (newY < 0) newY = 0;
  if (newY > window.innerHeight - robotHeight) {
    newY = window.innerHeight - robotHeight;
  }

  x.value = newX;
  y.value = newY;
};

const stopDrag = () => {
  dragging = false;
  setTimeout(() => (moved = false), 100);

  document.removeEventListener("mousemove", onMove);
  document.removeEventListener("mouseup", stopDrag);
};

const setAIState = (state) => {
  aiState.value = state;

  if (!animation) return;

  switch (state) {
    case "idle":
      animation.setSpeed(1);
      animation.play();
      break;

    case "thinking":
      animation.setSpeed(2); // 快速动 = 思考中
      animation.play();
      break;

    case "talking":
      animation.setSpeed(1.2);
      animation.play();
      break;

    case "success":
      animation.setSpeed(1);
      break;

    case "error":
      animation.setSpeed(0.5);
      break;
  }
};
// ================== 面板 ==================
const showChat = ref(false);

const handleClick = () => {
  if (moved) return; // 防止拖动触发点击
  showChat.value = !showChat.value;
};

// ================== 聊天 ==================
const messages = ref([
  {
    id: 1,
    role: "ai",
    text: "你好，我是AI助手，有什么可以帮你的吗？",
    html: "",
    streaming: false,
  },
]);
const input = ref("");

const scrollToBottom = () => {
  nextTick(() => {
    const el = document.querySelector(".content");
    if (el) el.scrollTop = el.scrollHeight;
  });
};

const sendMessage = async () => {
  if (!input.value.trim()) return;

  const question = input.value.trim();
  input.value = "";

  setAIState("thinking");

  // 用户消息
  messages.value.push({
    id: Date.now(),
    role: "user",
    text: question,
    html: "",
    streaming: false,
  });

  await nextTick();
  scrollToBottom();

  // AI占位
  const aiMsg = {
    id: Date.now() + 1,
    role: "ai",
    text: "",
    html: "",
    streaming: true,
  };
  messages.value.push(aiMsg);

  await nextTick();
  scrollToBottom();

  try {
    const response = await fetch("http://127.0.0.1:8080/chat", {
      method: "POST",
      headers: {
        authorization: localStorage.getItem("token"),
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        memoryId: Number(memoryId.value || 1),
        message: question,
      }),
    });

    if (!response.body) throw new Error("无流式数据");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let result = "";

    setAIState("talking");

    while (true) {
      const { value, done } = await reader.read();

      if (value) {
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;

          const data = line.slice(5).trim();

          if (data === "") {
            result += "\n";
            continue;
          }

          if (data === "[DONE]") {
            break;
          }

          result += data;
        }

        // 流式更新
        aiMsg.text = result;
        messages.value = [...messages.value];

        scrollToBottom();
      }

      if (done) break;
    }

    // 关键：转 Markdown
    aiMsg.streaming = false;
    aiMsg.html = md.render(result);

    // 强制刷新视图（必须）
    messages.value = [...messages.value];

    await nextTick();
    scrollToBottom();
    setAIState("idle");
  } catch (err) {
    console.error(err);
    aiMsg.text = "请求失败，请检查接口";
    setAIState("error");
  }
};

// ================== 工具栏 ==================
const handleExplain = async () => {
  messages.value.push({
    id: Date.now(),
    role: "ai",
    text: "正在分析当前工作流...",
  });

  // 这里你换成真实流程数据
  const flowData = window.flowData || {};

  const res = await service.post("/api/workflow/explain", flowData);

  messages.value.push({
    id: Date.now() + 1,
    role: "ai",
    text: res.data,
  });
};

const handleAddNode = async () => {
  const res = await service.post("/api/ai/action", {
    prompt: "添加一个HTTP节点",
  });

  // 执行画布操作
  window.executeAction && window.executeAction(res.data);

  messages.value.push({
    id: Date.now(),
    role: "ai",
    text: "已帮你添加节点",
  });
};

const handleClear = () => {
  messages.value = [];
};
</script>

<style scoped lang="scss">
/* ================= 机器人 ================= */
.robot {
  position: fixed;
  z-index: 9999;
  cursor: move;
  user-select: none;
  width: 100px;
  height: 100px;
  transition: all 0.2s;
}

.robot.idle {
  filter: drop-shadow(0 0 4px #ccc);
}
.robot.thinking {
  filter: drop-shadow(0 0 12px #409eff);
}
.robot.talking {
  filter: drop-shadow(0 0 10px #67c23a);
}
.robot.error {
  filter: drop-shadow(0 0 8px #f56c6c);
}

/* ================= 面板 ================= */
.chat-panel {
  position: fixed;
  width: 360px;
  height: 560px;
  z-index: 9999;

  display: flex;
  flex-direction: column;

  border-radius: 10px;

  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(12px);

  border: 1px solid rgba(255, 255, 255, 0.3);

  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 0 16px rgba(64, 158, 255, 0.15);

  overflow: hidden;

  /* 关键：撑满布局 */
  ::v-deep(.el-card__body) {
    padding: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  ::v-deep(.el-card__header) {
    padding: 0;
    border: none;
  }
}

/* 发光边框 */
.chat-panel::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 10px;
  padding: 1px;

  background: linear-gradient(
    120deg,
    rgba(64, 158, 255, 0.5),
    rgba(102, 177, 255, 0.2),
    rgba(64, 158, 255, 0.5)
  );

  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;

  pointer-events: none;
}

/* ================= header ================= */
.header {
  height: 38px;
  padding: 0 10px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  font-size: 13px;

  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #fff;

  border-radius: 0; /* 去圆角 */
}

.title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.title img {
  width: 15px;
  height: 15px;
}

.close {
  cursor: pointer;
  opacity: 0.7;
}
.close:hover {
  opacity: 1;
}

/* ================= toolbar ================= */
.toolbar {
  height: 32px;
  padding: 0 6px;

  display: flex;
  align-items: center;

  background: rgba(248, 250, 252, 0.85);
  border-bottom: 1px solid #eee;
}

.tool-group {
  display: flex;
  gap: 6px;
  width: 100%;
}

.tool-btn {
  flex: 1;
  font-size: 12px;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  border-radius: 6px;
  cursor: pointer;
  color: #666;

  transition: all 0.2s;
}

.tool-btn:hover {
  background: #ecf5ff;
  color: #409eff;
}

.tool-btn.danger:hover {
  background: #fef0f0;
  color: #f56c6c;
}

/* ================= 内容（核心修复） ================= */
.content {
  flex: 1;
  min-height: 0; /* ⭐必须 */
  overflow-y: auto;

  padding: 10px;

  background: linear-gradient(
    180deg,
    rgba(245, 247, 250, 0.6),
    rgba(255, 255, 255, 0.9)
  );
}

/* ================= 消息 ================= */
.msg-row {
  display: flex;
  margin-bottom: 8px;
}

.msg-row.user {
  justify-content: flex-end;
}

.msg-row.ai {
  justify-content: flex-start;
}

.msg {
  max-width: 80%;
  width: fit-content;
  padding: 6px 10px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.4;
}

/* 用户 */
.msg-row.user .msg {
  background: #409eff;
  color: #fff;
}

/* AI */
.msg-row.ai .msg {
  background: #409eff;
  color: #333;

  backdrop-filter: blur(6px);

  border: 1px solid rgba(0, 0, 0, 0.05);

  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* ================= Markdown ================= */
.markdown-body {
  background: transparent !important;
  font-size: 12px;
}

.markdown-body p {
  margin: 4px 0;
}

/* ================= 输入（彻底固定） ================= */
.input-area {
  flex-shrink: 0; /* 关键 */
  height: 52px;

  display: flex;
  align-items: center;

  padding: 0 8px;

  border-top: 1px solid #eee;
  background: rgba(255, 255, 255, 0.95);
}

/* 输入容器 */
.input-box {
  position: relative;
  width: 100%;
}

/* 输入框 */
::v-deep(.el-input__wrapper) {
  border-radius: 20px;
  padding-right: 40px;
}

/* 发送按钮 */
.send-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);

  width: 28px;
  height: 28px;
  border-radius: 50%;

  background: linear-gradient(135deg, #409eff, #66b1ff);

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  transition: all 0.2s;
}

.send-btn img {
  width: 14px;
  height: 14px;
}

.send-btn:hover {
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.5);
}

.send-btn:active {
  transform: translateY(-50%) scale(0.95);
}

/* ================= 光标 ================= */
.cursor {
  animation: blink 1s infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
