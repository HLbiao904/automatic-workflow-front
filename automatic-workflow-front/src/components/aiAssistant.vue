<template>
  <div>
    <!-- 悬浮机器人 -->
    <div
      class="robot"
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
          <span>🤖 AI助手</span>
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
        <div v-for="msg in messages" :key="msg.id" :class="['msg', msg.role]">
          {{ msg.text }}
        </div>
      </div>

      <!-- 输入 -->
      <div class="input-area">
        <el-input
          v-model="input"
          placeholder="输入你的问题..."
          @keyup.enter="sendMessage"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import lottie from "lottie-web";
import service from "@/service/index.js";
import animationData from "@/json/Anima Bot.json";

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

// ================== 面板 ==================
const showChat = ref(false);

const handleClick = () => {
  if (moved) return; // 防止拖动触发点击
  showChat.value = !showChat.value;
};

// ================== 聊天 ==================
const messages = ref([{ id: 1, role: "ai", text: "你好，我是你的AI助手 🤖" }]);

const input = ref("");

const sendMessage = async () => {
  if (!input.value.trim()) return;
  animation && animation.setSpeed(2);
  const userMsg = {
    id: Date.now(),
    role: "user",
    text: input.value,
  };

  messages.value.push(userMsg);

  const userText = input.value;
  input.value = "";

  try {
    // 调你的后端AI接口
    const res = await service.post("/api/ai/chat", {
      message: userText,
    });

    messages.value.push({
      id: Date.now() + 1,
      role: "ai",
      text: res.data || "AI暂无回复",
    });
    animation && animation.setSpeed(1);
  } catch (e) {
    messages.value.push({
      id: Date.now() + 2,
      role: "ai",
      text: "请求失败，请检查接口",
    });
    animation && animation.setSpeed(1);
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
/* 机器人 */
.robot {
  position: fixed;
  z-index: 9999;
  cursor: move;
  user-select: none;
  width: 100px;
  height: 100px;
}

/* 面板 */
.chat-panel {
  position: fixed;
  width: 340px;
  height: 460px;
  z-index: 9999;
  display: flex;
  flex-direction: column;

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

/* 头部 */
.header {
  padding: 12px 14px;
  font-weight: 600;
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.close {
  cursor: pointer;
  font-size: 16px;
  opacity: 0.8;
}
.close:hover {
  opacity: 1;
}

/* 工具栏 */
.toolbar {
  padding: 8px 10px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.tool-group {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}
.tool-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  padding: 6px 8px;
  border-radius: 8px;
  font-size: 12px;
  color: #555;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;

  border: 1px solid #eee;
}

/* hover效果（关键） */
.tool-btn:hover {
  background: #409eff;
  color: #fff;
  border-color: #409eff;
  transform: translateY(-1px);
}

/* 图标 */
.tool-btn .icon {
  font-size: 14px;
}

/* 危险按钮 */
.tool-btn.danger:hover {
  background: #f56c6c;
  border-color: #f56c6c;
}
/* 内容 */
.content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

/* 消息 */
.msg {
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 12px;
  max-width: 80%;
  line-height: 1.5;
  font-size: 13px;
  word-break: break-word;
}

.msg.user {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #fff;
  margin-left: auto;
}

.msg.ai {
  background: #f4f6f8;
  color: #333;
}
/* 输入 */
.input-area {
  padding: 10px;
  border-top: 1px solid #eee;
  background: #fff;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
