<template>
  <div class="avatar" :style="{ backgroundColor: bgColor }" :title="name">
    {{ initials }}
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    default: 32,
  },
});

const initials = computed(() => {
  const name = props.name;
  if (/[\u4e00-\u9fa5]/.test(name)) {
    return name.substring(0, 1);
  }
  const parts = name.trim().split(/\s+/);
  return parts.length === 1
    ? parts[0].substring(0, 2).toUpperCase()
    : (parts[0][0] + parts[1][0]).toUpperCase();
});

const colors = [
  "#5A67D8",
  "#38B2AC",
  "#ED8936",
  "#E53E3E",
  "#805AD5",
  "#3182CE",
];

const bgColor = computed(() => {
  let hash = 0;
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
});
</script>

<style scoped>
.avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  width: 32px;
  height: 32px;
  border-radius: 50%;

  color: #fff;
  font-weight: 600;
  font-size: 14px;
  user-select: none;
}
</style>
