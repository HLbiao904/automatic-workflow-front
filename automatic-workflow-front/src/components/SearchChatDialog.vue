<template>
  <el-dialog
    v-model="visible"
    title="搜索聊天记录"
    width="520px"
    :close-on-click-modal="false"
  >
    <!-- 搜索框 -->
    <el-input
      v-model="keyword"
      placeholder="搜索聊天标题..."
      clearable
      size="large"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>

    <!-- 搜索结果 -->
    <div class="result-box">
      <template v-for="group in groupedSessions">
        <div v-if="group.list.length" :key="group.label">
          <div class="group-title">{{ group.label }}</div>

          <div
            v-for="item in group.list"
            :key="item.id"
            class="result-item"
            @click="select(item)"
          >
            {{ item.title }}
          </div>
        </div>
      </template>

      <el-empty v-if="!hasResult" description="没有匹配的聊天" />
    </div>
  </el-dialog>
</template>
<script setup>
import { ref, computed, watch } from "vue";
import { Search } from "@element-plus/icons-vue";
import dayjs from "dayjs";

const props = defineProps({
  modelValue: Boolean,
  sessions: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(["update:modelValue", "select"]);

const visible = ref(false);
const keyword = ref("");

watch(
  () => props.modelValue,
  (v) => (visible.value = v),
);

watch(visible, (v) => emit("update:modelValue", v));

function select(session) {
  emit("select", session);
}

const filtered = computed(() => {
  if (!keyword.value) return props.sessions;
  return props.sessions.filter((s) =>
    s.title.toLowerCase().includes(keyword.value.toLowerCase()),
  );
});

/* ====== 时间分组 ====== */
function isToday(date) {
  return dayjs(date).isSame(dayjs(), "day");
}
function isYesterday(date) {
  return dayjs(date).isSame(dayjs().subtract(1, "day"), "day");
}
function isLast7Days(date) {
  return dayjs(date).isAfter(dayjs().subtract(7, "day"));
}

const groupedSessions = computed(() => {
  const today = [];
  const yesterday = [];
  const last7Days = [];

  filtered.value.forEach((s) => {
    if (isToday(s.updatedAt)) today.push(s);
    else if (isYesterday(s.updatedAt)) yesterday.push(s);
    else if (isLast7Days(s.updatedAt)) last7Days.push(s);
  });

  return [
    { label: "今天", list: today },
    { label: "昨天", list: yesterday },
    { label: "前七天", list: last7Days },
  ];
});

const hasResult = computed(() =>
  groupedSessions.value.some((g) => g.list.length),
);
</script>

<style scoped>
.result-box {
  margin-top: 16px;
  max-height: 360px;
  overflow-y: auto;
}

.group-title {
  font-size: 13px;
  color: #6b7280;
  margin: 12px 0 6px;
}

.result-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.15s;

  &:hover {
    background: #f3f4f6;
  }
}
</style>
