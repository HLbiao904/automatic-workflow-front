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
      @mouseenter="handleEnter"
      @mouseleave="handleLeave"
    ></div>
    <div
      v-if="showTools"
      class="robot-tools animate"
      :class="toolDirection"
      :style="toolStyle"
      @mouseenter="handleEnter"
      @mouseleave="handleLeave"
    >
      <div class="tool" @click="handleGenerateFlow">
        <img src="../assets/generateWorkflow.svg" />
        <span class="tip">生成</span>
      </div>
      <div class="tool" @click="handleExplain">
        <img src="../assets/explainWorkflow.svg" />
        <span class="tip">解释</span>
      </div>
    </div>
    <!-- 聊天面板 -->
    <el-card
      v-if="showChat"
      class="chat-panel"
      ref="panelRef"
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
            <el-icon><Connection /></el-icon>
            <span>解释</span>
          </div>

          <div class="tool-btn" @click="handleOptimize">
            <el-icon><MagicStick /></el-icon>
            <span>优化</span>
          </div>

          <div class="tool-btn danger" @click="handleClear">
            <el-icon><DeleteFilled /></el-icon>
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
// import "github-markdown-css/github-markdown.css";
import { buildFlowForAI } from "@/tools/formatJson.js";
import { Connection, MagicStick, DeleteFilled } from "@element-plus/icons-vue";

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
const panelRef = ref(null);
const aiState = ref("idle"); // idle | thinking | talking | success | error
let isSending = false; // 防止重复发送
const memoryId = ref(Date.now());
// 机器人hover面板
const showTools = ref(false);
let hoverTimer = null;
// lottie动画
const lottieRef = ref(null);
let animation = null;
// ================== 拖动 ==================
const x = ref(900);
const y = ref(500);

let dragging = false;
let offsetX = 0;
let offsetY = 0;
let moved = false;
const props = defineProps({
  workflowData: {
    type: Object,
    default: null,
  },
});
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

  window.addEventListener("resize", updatePosition);
});
onUnmounted(() => {
  animation && animation.destroy();
  window.removeEventListener("resize", updatePosition);
});

const updatePosition = () => {
  x.value = Math.min(x.value, window.innerWidth - 100);
  y.value = Math.min(y.value, window.innerHeight - 100);
};
const startDrag = (e) => {
  dragging = true;
  moved = false;
  offsetX = e.clientX - x.value;
  offsetY = e.clientY - y.value;

  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", stopDrag);
};

const panelStyle = computed(() => {
  const gap = 5;

  const panelWidth = panelRef.value?.offsetWidth || 360;
  const panelHeight = panelRef.value?.offsetHeight || 560;

  let left = x.value + 100 + gap;
  let top = y.value;

  // 右边放不下 → 放左边
  if (left + panelWidth > window.innerWidth) {
    left = x.value - panelWidth - gap;
  }

  // 左边也超了 → 贴边
  if (left < 0) {
    left = 10;
  }

  // 下边超出
  if (top + panelHeight > window.innerHeight) {
    top = window.innerHeight - panelHeight - 10;
  }

  // 上边超出
  if (top < 0) {
    top = 10;
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
  showTools.value = false; // 关闭工具栏
  showChat.value = !showChat.value;
};
const handleEnter = () => {
  if (showChat.value) return;

  clearTimeout(hoverTimer);

  hoverTimer = setTimeout(() => {
    setAIState("thinking");
    showTools.value = true;
  }, 80); // 延迟一点点更自然
};

const handleLeave = () => {
  hoverTimer = setTimeout(() => {
    showTools.value = false;
    setAIState("idle");
  }, 200); // 防止抖动
};

const toolDirection = computed(() => {
  const toolHeight = 36;
  const gap = 8;

  const top = y.value - toolHeight - gap;

  // 上面放不下 → 在下面 → 箭头朝上
  if (top < 0) {
    return "arrow-top";
  }

  // 默认在上面 → 箭头朝下
  return "arrow-bottom";
});
const toolStyle = computed(() => {
  const gap = 4;
  const arrowSize = 6;

  const robotSize = 100;
  const toolWidth = 120;
  const toolHeight = 36;

  let left = x.value + robotSize / 2 - toolWidth / 2;
  let top = y.value - toolHeight - gap - arrowSize;

  // 上方不够 → 放下面
  if (top < 0) {
    top = y.value + robotSize + gap + arrowSize;
  }

  // 左右边界
  if (left + toolWidth > window.innerWidth) {
    left = window.innerWidth - toolWidth - 10;
  }

  if (left < 0) {
    left = 10;
  }

  return {
    left: left + "px",
    top: top + "px",
  };
});
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
  setAIState("thinking");

  const nodes = JSON.parse(props.workflowData.nodesJson);
  const edges = JSON.parse(props.workflowData.edgesJson);
  const formatData = buildFlowForAI(nodes, edges);

  const aiMsg = {
    id: Date.now(),
    role: "ai",
    text: "",
    html: "",
    streaming: true,
  };
  messages.value.push(aiMsg);

  await nextTick();
  scrollToBottom();

  const response = await fetch(
    "http://127.0.0.1:8080/AIRobot/explainWorkflow",
    {
      method: "POST",
      headers: {
        authorization: localStorage.getItem("token"),
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        memoryId: Date.now(),
        message: JSON.stringify(formatData),
      }),
    },
  );

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let buffer = "";
  let result = "";

  setAIState("talking");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;

      const text = line.slice(5).trim();

      if (text === "") {
        result += "\n";
        continue;
      }

      if (text === "[DONE]") break;

      result += text;
    }

    // 实时更新
    aiMsg.text = result;
    messages.value = [...messages.value];

    scrollToBottom();
  }

  // 渲染 markdown
  aiMsg.streaming = false;
  aiMsg.html = md.render(result);

  messages.value = [...messages.value];

  setAIState("idle");
};

const handleGenerateFlow = async () => {
  console.log("生成工作流");
  /*   const res = await service.post("/api/ai/generateFlow", {
    prompt: "根据当前上下文生成工作流",
  });

  window.executeAction && window.executeAction(res.data);

  messages.value.push({
    id: Date.now(),
    role: "ai",
    text: "已帮你生成工作流",
  }); */
};
const handleOptimize = async () => {
  const res = await service.post("/api/ai/action", {
    prompt: "优化当前工作流",
  });

  // 执行画布操作
  window.executeAction && window.executeAction(res.data);

  messages.value.push({
    id: Date.now(),
    role: "ai",
    text: "已帮你添加节点",
  });
};

const handleClear = async () => {
  try {
    await ElMessageBox.confirm(
      "确定要清空所有对话记录吗？该操作不可恢复。",
      "提示",
      {
        confirmButtonText: "清空",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    messages.value = [];

    ElMessage({
      type: "success",
      message: "已清空对话",
    });
  } catch (e) {
    // 用户点击取消
  }
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
  transition: all 0.25s ease;
}

.robot.idle {
  filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.2));
}
.robot.thinking {
  filter: drop-shadow(0 0 14px rgba(64, 158, 255, 0.6));
}
.robot.talking {
  filter: drop-shadow(0 0 12px rgba(103, 194, 58, 0.5));
}
.robot.error {
  filter: drop-shadow(0 0 10px rgba(245, 108, 108, 0.5));
}

/* ================= 面板 ================= */
.chat-panel {
  position: fixed;
  width: 380px;
  height: 580px;
  z-index: 9999;

  display: flex;
  flex-direction: column;

  border-radius: 16px;

  /* 明亮玻璃感 */
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(18px);

  border: 1px solid rgba(255, 255, 255, 0.6);

  /* 科技阴影 */
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 0 30px rgba(64, 158, 255, 0.15);

  overflow: hidden;

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

/* ================= header ================= */
.header {
  height: 42px;
  padding: 0 14px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  font-size: 14px;

  background: linear-gradient(135deg, #409eff, #6ec1ff);
  color: #fff;
}

.title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.title img {
  width: 16px;
  height: 16px;
}

.close {
  cursor: pointer;
  opacity: 0.7;
  font-size: 16px;
}
.close:hover {
  opacity: 1;
}

/* ================= toolbar ================= */
.toolbar {
  height: 34px;
  padding: 0 8px;

  display: flex;
  align-items: center;

  background: rgba(248, 250, 252, 0.9);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.tool-group {
  display: flex;
  gap: 8px;
  width: 100%;
}

.tool-btn {
  flex: 1;
  font-size: 13px;
  font-weight: 500;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  border-radius: 10px;
  cursor: pointer;

  color: #666;

  padding: 6px 0;
  transition: all 0.25s ease;
}

/* icon 放大 */
.tool-btn .el-icon {
  font-size: 16px;
}

/* hover更明显 */
.tool-btn:hover {
  background: rgba(64, 158, 255, 0.1);
  color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(64, 158, 255, 0.15);
}

/* danger状态 */
.tool-btn.danger:hover {
  background: rgba(245, 108, 108, 0.1);
  color: #f56c6c;
  box-shadow: 0 4px 10px rgba(245, 108, 108, 0.15);
}

/* ================= 内容 ================= */
.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  padding: 12px;

  background: linear-gradient(180deg, #f7f9fc, #ffffff);
}

/* ================= 消息 ================= */
.msg-row {
  display: flex;
  margin-bottom: 10px;
}

.msg-row.user {
  justify-content: flex-end;
}

.msg-row.ai {
  justify-content: flex-start;
}

.msg {
  max-width: 80%;
  padding: 8px 12px;
  border-radius: 14px;
  font-size: 12px;
  line-height: 1.5;
}

/* 用户气泡 */
.msg-row.user .msg {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #fff;

  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* AI气泡（高级灰白） */
.msg-row.ai .msg {
  background: #f2f4f7;
  color: #333;

  border: 1px solid #e5e7eb;

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

/* ================= 输入 ================= */
.input-area {
  flex-shrink: 0;
  height: 60px;

  display: flex;
  align-items: center;

  padding: 0 10px;

  border-top: 1px solid #eee;
  background: #ffffff;
}

/* 输入容器 */
.input-box {
  position: relative;
  width: 100%;
}

/* 输入框 */
::v-deep(.el-input__wrapper) {
  border-radius: 24px;
  padding-right: 44px;

  background: #f5f7fa;
  box-shadow: none;
}

/* 发送按钮 */
.send-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);

  width: 32px;
  height: 32px;
  border-radius: 50%;

  background: linear-gradient(135deg, #409eff, #66b1ff);

  display: flex;
  align-items: center;
  justify-content: center;

  cursor: pointer;
  transition: all 0.2s;
}

.send-btn img {
  width: 16px;
  height: 16px;
}

.send-btn:hover {
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
}

.send-btn:active {
  transform: translateY(-50%) scale(0.95);
}
.robot-tools {
  position: fixed;
  z-index: 10000;

  display: flex;
  gap: 8px;
  padding: 6px 10px;

  border-radius: 16px;

  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);

  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);

  animation: popIn 0.2s ease;
}
.robot-tools.arrow-bottom::after {
  content: "";
  position: absolute;

  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);

  width: 0;
  height: 0;

  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid rgba(255, 255, 255, 0.95);
}
.robot-tools.arrow-top::after {
  content: "";
  position: absolute;

  top: -6px;
  left: 50%;
  transform: translateX(-50%);

  width: 0;
  height: 0;

  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 6px solid rgba(255, 255, 255, 0.95);
}
.tool {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  white-space: nowrap;

  background: #f5f7fa;
  transition: all 0.2s;
  img {
    width: 14px;
    height: 14px;
  }
  .tip {
    margin-left: 4px;
  }
}

.tool:hover {
  background: #409eff;
  color: #fff;
}
@keyframes popIn {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.robot-tools.animate {
  transform-origin: center;
  animation: toolPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes toolPop {
  0% {
    opacity: 0;
    transform: scale(0.6) translateY(10px);
  }
  60% {
    opacity: 1;
    transform: scale(1.05) translateY(-2px);
  }
  100% {
    transform: scale(1) translateY(0);
  }
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
