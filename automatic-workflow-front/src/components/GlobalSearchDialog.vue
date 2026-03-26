<template>
  <div class="command-wrapper">
    <el-dialog
      :model-value="modelValue"
      width="680px"
      top="15vh"
      :show-close="false"
      destroy-on-close
      class="command-dialog"
      @close="close"
    >
      <!-- 搜索框 -->
      <el-input
        v-model="keyword"
        placeholder="搜索节点或工作流..."
        class="command-input"
        clearable
      />

      <div class="result-box" ref="scrollBox">
        <!-- 节点 -->
        <template v-if="display.nodes.length">
          <div class="section-title">
            {{ keyword ? "搜索节点" : "推荐节点" }}
          </div>

          <div
            v-for="(n, index) in display.nodes"
            :key="'node-' + n.id"
            :ref="(el) => setItemRef(el, index)"
            class="result-item"
            :class="{ active: selectedIndex === index }"
            @click="handleSelect({ type: 'node', data: n })"
          >
            <!-- 左侧图标 -->
            <div class="node-icon">
              <img :src="getIcon(n)" />
            </div>
            <!-- 内容 -->
            <div class="node-content">
              <div class="title" v-html="highlight(n.label)" />
              <div class="sub">{{ n.type }}</div>
            </div>
          </div>
        </template>

        <!-- 工作流 -->
        <template v-if="display.workflows.length">
          <div class="section-title">
            {{ keyword ? "搜索工作流" : "最近工作流" }}
          </div>

          <div
            v-for="(w, i) in display.workflows"
            :key="'workflow-' + w.id"
            :ref="(el) => setItemRef(el, display.nodes.length + i)"
            class="result-item workflow-item"
            :class="{ active: selectedIndex === display.nodes.length + i }"
            @click="handleSelect({ type: 'workflow', data: w })"
          >
            <div class="title" v-html="highlight(w.name)" />
            <div class="sub">
              创建：{{ formatTime(w.createdAt) }} ｜ 更新：{{
                formatTime(w.updatedAt)
              }}
            </div>
          </div>
        </template>

        <el-empty
          v-if="keyword && flatResults.length === 0"
          description="没有搜索结果"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import dayjs from "dayjs";
import commonIcon from "../assets/code-solid-full.svg";
import switchIcon from "../assets/flagSwitch.svg";
import forIcon from "../assets/ForNode.svg";
import whenIcon from "../assets/parallel.svg";
import booleanIcon from "../assets/flagBoolean.svg";
/* props */
const props = defineProps({
  modelValue: Boolean,
  nodes: { type: Array, default: () => [] },
  workflows: { type: Array, default: () => [] },
});

/* emit */
const emit = defineEmits(["update:modelValue", "add-node", "open-workflow"]);

/* state */
const keyword = ref("");
const selectedIndex = ref(0);
const scrollBox = ref(null);
const itemRefs = ref([]);

/* ================= 默认推荐 ================= */
const defaultData = computed(() => {
  return {
    nodes: props.nodes.slice(0, 6),
    workflows: [...props.workflows]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5),
  };
});

/* ================= 搜索逻辑 ================= */
const searchData = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return null;

  const nodes = props.nodes.filter((n) =>
    [n.label, n.nodeId, n.type, n.description]
      .join(" ")
      .toLowerCase()
      .includes(kw),
  );
  const workflows = props.workflows.filter((w) =>
    [w.name, w.description].join(" ").toLowerCase().includes(kw),
  );
  return { nodes, workflows };
});

/* ================= 最终展示 ================= */
const display = computed(() => {
  return searchData.value || defaultData.value;
});

/* ================= 扁平列表 ================= */
const flatResults = computed(() => {
  return [
    ...display.value.nodes.map((n) => ({ type: "node", data: n })),
    ...display.value.workflows.map((w) => ({
      type: "workflow",
      data: w,
    })),
  ];
});

/* ================= 打开时自动聚焦 ================= */
watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      selectedIndex.value = 0;
      nextTick(() => {
        const input = document.querySelector(".command-input input");
        input?.focus();
      });
    }
  },
);

function getIcon(n) {
  if (n.localIcon) {
    return n.localIcon; // 优先使用本地icon
  } else if (n.icon) {
    return n.icon; // 其次使用oss图标
  }
  // 默认本地图标
  switch ((n.type || "").toUpperCase()) {
    case "COMMON":
      return commonIcon;
    case "SWITCH":
      return switchIcon;
    case "FOR":
      return forIcon;
    case "WHEN":
      return whenIcon;
    case "BOOLEAN":
      return booleanIcon;
    default:
      return commonIcon;
  }
}
/* ================= 键盘控制 ================= */
function handleKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    emit("update:modelValue", true);
  }

  if (!props.modelValue || !flatResults.value.length) return;

  if (e.key === "Escape") close();

  if (e.key === "ArrowDown") {
    e.preventDefault();
    selectedIndex.value = (selectedIndex.value + 1) % flatResults.value.length;
    scrollIntoView();
  }

  if (e.key === "ArrowUp") {
    e.preventDefault();
    selectedIndex.value =
      (selectedIndex.value - 1 + flatResults.value.length) %
      flatResults.value.length;
    scrollIntoView();
  }

  if (e.key === "Enter") {
    const item = flatResults.value[selectedIndex.value];
    if (item) handleSelect(item);
  }
}

onMounted(() => window.addEventListener("keydown", handleKeyDown));
onBeforeUnmount(() => window.removeEventListener("keydown", handleKeyDown));

/* ================= 滚动到可视区域 ================= */
function scrollIntoView() {
  nextTick(() => {
    const el = itemRefs.value[selectedIndex.value];
    el?.scrollIntoView({ block: "nearest" });
  });
}

function setItemRef(el, index) {
  if (el) itemRefs.value[index] = el;
}

/* ================= 选择 ================= */
function handleSelect(item) {
  if (item.type === "node") {
    saveRecent(item);
    emit("add-node", item.data);
  } else {
    saveRecent(item);
    emit("open-workflow", item.data);
  }
  close();
}

/* ================= 最近使用缓存 ================= */
function saveRecent(item) {
  const list = JSON.parse(localStorage.getItem("recent_command") || "[]");
  const newList = [
    item,
    ...list.filter((i) => i.data.id !== item.data.id),
  ].slice(0, 10);
  localStorage.setItem("recent_command", JSON.stringify(newList));
}

/* ================= 关闭 ================= */
function close() {
  emit("update:modelValue", false);
  keyword.value = "";
  selectedIndex.value = 0;
}

/* ================= 高亮 ================= */
function highlight(text) {
  if (!keyword.value) return text;
  const reg = new RegExp(`(${keyword.value})`, "gi");
  return text?.replace(reg, "<mark>$1</mark>");
}

/* ================= 时间格式化 ================= */
function formatTime(t) {
  return t ? dayjs(t).format("YYYY-MM-DD HH:mm") : "";
}
</script>

<style scoped>
.command-dialog :deep(.el-dialog) {
  border-radius: 14px;
  padding: 16px;
}

.command-input {
  margin-bottom: 12px;
}

.result-box {
  max-height: 420px;
  overflow-y: auto;
}

.section-title {
  font-size: 12px;
  color: #888;
  margin: 12px 0 6px;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.15s;
}
.result-item.workflow-item {
  flex-direction: column;
  align-items: flex-start;
}

.result-item:hover,
.result-item.active {
  background: #f0f7ff;
}

.node-icon {
  width: 32px; /* 左侧固定宽度 */
  height: 32px;
  flex-shrink: 0;
  margin-right: 8px;
}

.node-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.node-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.title {
  font-weight: 500;
}

.sub {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

mark {
  background: #ffd666;
  padding: 0 2px;
  border-radius: 3px;
}
</style>
