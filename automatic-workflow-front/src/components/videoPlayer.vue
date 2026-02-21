<template>
  <div class="video-wrapper">
    <video
      ref="videoRef"
      class="video-player"
      controls
      :src="videoUrl"
      @error="onError"
    >
      您的浏览器不支持 video 标签
    </video>
  </div>
</template>

<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  path: {
    type: String,
    required: true,
  },
});

const videoRef = ref(null);

// 拼接后端接口
const videoUrl = computed(() => {
  if (!props.path) return "";
  return `http://localhost:8080/video?path=${encodeURIComponent(props.path)}`;
});

// path变化时重新加载视频
watch(
  () => props.path,
  () => {
    if (videoRef.value) {
      videoRef.value.load();
    }
  },
);

function onError(e) {
  console.error("视频加载失败", e);
}
</script>

<style scoped>
.video-wrapper {
  width: 100%;
  height: 100%;
  background: black;
  display: flex;
  justify-content: center;
  align-items: center;
}

.video-player {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  background: black;
}
</style>
