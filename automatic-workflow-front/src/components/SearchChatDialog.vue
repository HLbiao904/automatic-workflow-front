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
            <div class="title">{{ item.title }}</div>
            <div class="time">{{ formatDate(item.createdAt) }}</div>
          </div>
        </div>
      </template>

      <el-empty v-if="!hasResult" description="没有匹配的聊天" />
    </div>
  </el-dialog>
</template>
<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { Search } from "@element-plus/icons-vue";
import dayjs from "dayjs";

const props = defineProps({
  modelValue: Boolean,
  sessions: {
    type: Array,
    default: () => [],
  },
});
onMounted(() => {
  console.log("sessions in search dialog:", props.sessions);
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
function isLast14Days(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  return diff > 7 && diff <= 14;
}

function isLast30Days(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = (now - d) / (1000 * 60 * 60 * 24);
  return diff > 14 && diff <= 30;
}
const groupedSessions = computed(() => {
  const today = [];
  const yesterday = [];
  const last7Days = [];
  const last14Days = [];
  const last30Days = [];
  const older = [];

  filtered.value.forEach((s) => {
    if (isToday(s.createdAt)) {
      today.push(s);
    } else if (isYesterday(s.createdAt)) {
      yesterday.push(s);
    } else if (isLast7Days(s.createdAt)) {
      last7Days.push(s);
    } else if (isLast14Days(s.createdAt)) {
      last14Days.push(s);
    } else if (isLast30Days(s.createdAt)) {
      last30Days.push(s);
    } else {
      older.push(s);
    }
  });

  const sortDesc = (arr) =>
    arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return [
    { label: "今天", list: sortDesc(today) },
    { label: "昨天", list: sortDesc(yesterday) },
    { label: "前七天", list: sortDesc(last7Days) },
    { label: "两星期内", list: sortDesc(last14Days) },
    { label: "一个月内", list: sortDesc(last30Days) },
    { label: "更早", list: sortDesc(older) },
  ];
});
function formatDate(date) {
  return dayjs(date).format("YYYY-MM-DD HH:mm");
}
const hasResult = computed(() =>
  groupedSessions.value.some((g) => g.list.length),
);
</script>

<style scoped lang="scss">
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
  transition: background 0.15s;
  display: flex;
  justify-content: space-between;
  align-items: center;

  &:hover {
    background: #f3f4f6;
  }
}

.title {
  font-size: 14px;
}

.time {
  font-size: 12px;
  color: #9ca3af;
}
</style>
