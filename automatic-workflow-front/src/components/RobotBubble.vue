<template>
  <transition name="bubble-fade">
    <div v-if="visible" ref="bubbleRef" class="robot-bubble" :style="style">
      <!-- 内容 -->
      <div class="bubble-content">
        {{ message }}
      </div>

      <!-- 按钮 -->
      <div class="bubble-actions" v-if="actions.length">
        <el-button
          v-for="(btn, index) in actions"
          :key="index"
          size="small"
          :type="btn.type || 'default'"
          @click="handleClick(btn)"
        >
          {{ btn.label }}
        </el-button>
      </div>

      <!-- 关闭 -->
      <div class="bubble-close" @click="close">×</div>
    </div>
  </transition>
</template>

<script setup>
import { ref, watch } from "vue";
const bubbleRef = ref(null);

defineExpose({
  bubbleRef,
});
const props = defineProps({
  message: String,
  actions: {
    type: Array,
    default: () => [],
  },
  show: Boolean,
  style: Object, // 定位（跟机器人走）
  autoClose: {
    type: Number,
    default: 0, // 毫秒，0 = 不自动关闭
  },
});
const emit = defineEmits(["update:show"]);

const visible = ref(false);

watch(
  () => props.show,
  (val) => {
    console.log("bubble-show", val);
    visible.value = val;

    if (val && props.autoClose > 0) {
      setTimeout(() => {
        close();
      }, props.autoClose);
    }
  },
  { immediate: true },
);

const handleClick = (btn) => {
  if (btn.onClick) {
    btn.onClick();
  }
};

const close = () => {
  visible.value = false;
  emit("update:show", false);
};
</script>

<style scoped>
.robot-bubble {
  position: fixed;
  z-index: 10001;
  max-width: 260px;
  min-width: 50px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);

  border-radius: 12px;

  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);

  font-size: 13px;
  line-height: 1.4;

  word-break: break-word;

  display: flex;
  flex-direction: column;
  gap: 4px; /* 再缩 */
  font-family: "JetBrains Mono", "Fira Code", Consolas, monospace;
}

/* 内容 */
.bubble-content {
  color: #333;
  padding-bottom: 6px;
  text-align: center;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
}

/* 按钮区域 */
.bubble-actions {
  display: flex;
  justify-content: flex-end;
  gap: 3px; /* 再压 */
  margin-top: 2px;

  padding: 4px 4px 0 4px; /* 去掉上下多余空间 */
}

/* 按钮 */
:deep(.el-button) {
  padding: 2px 8px; /* 更小 */
  font-size: 11px;
  border-radius: 6px;
}

/* 关闭按钮 */
.bubble-close {
  position: absolute;
  right: 4px;
  top: 2px;

  font-size: 12px;
  opacity: 0.5;
  cursor: pointer;
}
.bubble-close:hover {
  opacity: 1;
}

/* ===== 气泡弹出动画 ===== */
.bubble-fade-enter-active {
  animation: bubbleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.bubble-fade-leave-active {
  animation: bubbleOut 0.15s ease forwards;
}

/* 出现（带一点弹性） */
@keyframes bubbleIn {
  0% {
    opacity: 0;
    transform: scale(0.7) translateY(8px);
  }
  60% {
    opacity: 1;
    transform: scale(1.05) translateY(-2px);
  }
  100% {
    transform: scale(1) translateY(0);
  }
}

/* 消失 */
@keyframes bubbleOut {
  0% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  100% {
    opacity: 0;
    transform: scale(0.8) translateY(6px);
  }
}
</style>
