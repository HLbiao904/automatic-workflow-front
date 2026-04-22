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

  max-width: 240px; /* 再收窄一点 */
  min-width: 100px;

  padding: 8px 10px; /* 原来 12 → 8 */

  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);

  border-radius: 12px;

  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);

  font-size: 12px;
  line-height: 1.4;

  word-break: break-word;

  display: flex;
  flex-direction: column;
  gap: 4px; /* 再缩 */
}

/* 内容 */
.bubble-content {
  color: #333;
  padding-bottom: 6px;

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
}
.bubble-close:hover {
  opacity: 1;
}
</style>
