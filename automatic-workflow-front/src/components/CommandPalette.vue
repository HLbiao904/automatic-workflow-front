<template>
  <el-dialog
    v-model="store.visible"
    width="680px"
    top="15vh"
    :show-close="false"
    destroy-on-close
    class="command-dialog"
  >
    <!-- 搜索框 -->
    <el-input
      v-model="keyword"
      placeholder="输入关键词或命令..."
      class="command-input"
      clearable
    />

    <!-- 结果 -->
    <div class="result-box">
      <template v-for="(list, type) in grouped" :key="type">
        <template v-if="list.length">
          <div class="section-title">{{ getTitle(type) }}</div>

          <div
            v-for="(item, index) in list"
            :key="type + index"
            class="result-item"
            :class="{ active: isActive(item) }"
            @click="handleSelect(item)"
          >
            <!-- 节点 -->
            <template v-if="item.type === 'node'">
              <div class="node-icon">
                <img :src="getIcon(item.data)" />
              </div>
              <div>
                <div class="title" v-html="highlight(item.data._name)" />
                <div class="sub">{{ item.data.type }}</div>
              </div>
            </template>

            <!-- 通用 -->
            <template v-else>
              <div class="content">
                <div class="title" v-html="highlight(item.data._name)" />
                <div class="sub" v-if="item.data._desc">
                  {{ item.data._desc }}
                </div>
              </div>
            </template>
          </div>
        </template>
      </template>

      <el-empty
        v-if="keyword && flatResults.length === 0"
        description="无结果"
      />
    </div>
  </el-dialog>
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
import { useRoute } from "vue-router";
import Fuse from "fuse.js";
import { useCommandStore } from "../stores/command";

/* icons */
import commonIcon from "../assets/code-solid-full.svg";
import switchIcon from "../assets/nodeIcons/flagSwitch.svg";
import forIcon from "../assets/nodeIcons/ForNode.svg";
import whenIcon from "../assets/nodeIcons/parallel.svg";
import booleanIcon from "../assets/nodeIcons/flagBoolean.svg";

const store = useCommandStore();
const route = useRoute();

const keyword = ref("");
const selectedIndex = ref(0);

const props = defineProps({
  viewMode: {
    type: String,
    default: "editor",
  },
});
const emit = defineEmits(["changeViewMode"]);
/* ================= 工具函数 ================= */

// 统一包装（解决 id 问题）
function wrap(type, item, nameKey, descKey, fallbackId, weight) {
  return {
    type,
    weight,
    data: {
      ...item,
      id: item.id ?? fallbackId,
      _name: item[nameKey],
      _desc: item[descKey] || "",
    },
  };
}

// 去重（核心）
function unique(list) {
  const seen = new Set();
  return list.filter((item) => {
    const key = `${item.type}_${item.data.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function getKey() {
  const userId = store.user?.id || "guest";
  return `cmd_recent_${userId}`;
}
// 最近记录
function getRecent() {
  return JSON.parse(localStorage.getItem(getKey()) || "[]");
}

function saveRecent(item) {
  const key = getKey();
  const list = getRecent();

  const newList = [
    item,
    ...list.filter(
      (i) => `${i.type}_${i.data.id}` !== `${item.type}_${item.data.id}`,
    ),
  ].slice(0, 10);

  localStorage.setItem(key, JSON.stringify(newList));
}
/* ================= 数据源 ================= */

const allData = computed(() => {
  const list = [];

  if (props.viewMode !== "chat") {
    list.push(
      ...store.nodes.map((n, i) =>
        wrap("node", n, "label", "description", `node_${i}`, 3),
      ),

      ...store.workflows.map((w, i) =>
        wrap("workflow", w, "name", "description", `workflow_${i}`, 2),
      ),

      ...store.templates.map((t, i) =>
        wrap("template", t, "templateName", "description", `template_${i}`, 1),
      ),

      ...store.configs.map((c, i) =>
        wrap(
          "config",
          typeof c === "string" ? { name: c } : c,
          "name",
          "",
          `config_${i}`,
          0,
        ),
      ),
    );
  }

  if (props.viewMode === "chat") {
    list.push(
      ...store.sessions.map((s, i) =>
        wrap("session", s, "title", "", `session_${i}`, 2),
      ),
      {
        type: "action",
        weight: 3,
        data: { id: "create", _name: "新建会话" },
      },
    );
  }

  return list;
});

/* ================= 搜索 ================= */

const searchData = computed(() => {
  if (!keyword.value) return null;

  const fuse = new Fuse(allData.value, {
    keys: ["data._name", "data._desc"],
    threshold: 0.35,
    ignoreLocation: true,
  });

  const result = fuse.search(keyword.value).map((r) => r.item);

  const recent = getRecent();

  return result.sort((a, b) => {
    const ra = recent.findIndex(
      (r) => `${r.type}_${r.data.id}` === `${a.type}_${a.data.id}`,
    );
    const rb = recent.findIndex(
      (r) => `${r.type}_${r.data.id}` === `${b.type}_${b.data.id}`,
    );

    // 最近优先
    if (ra !== -1 || rb !== -1) return ra - rb;

    // 权重
    return b.weight - a.weight;
  });
});

/* ================= 默认 ================= */

const defaultData = computed(() => {
  if (props.viewMode === "chat") {
    return unique([
      {
        type: "action",
        data: { id: "create", _name: "新建会话" },
      },
      ...store.sessions
        .slice(0, 6)
        .map((s, i) => wrap("session", s, "title", "", `session_${i}`, 2)),
    ]);
  }

  return unique([
    ...getRecent(),

    ...store.nodes
      .slice(0, 4)
      .map((n, i) => wrap("node", n, "label", "description", `node_${i}`, 3)),

    ...store.workflows
      .slice(0, 2)
      .map((w, i) =>
        wrap("workflow", w, "name", "description", `workflow_${i}`, 2),
      ),

    ...store.templates
      .slice(0, 2)
      .map((t, i) =>
        wrap("template", t, "templateName", "description", `template_${i}`, 1),
      ),
  ]);
});

/* ================= 最终结果 ================= */

const flatResults = computed(() =>
  unique(searchData.value || defaultData.value),
);

/* ================= 分组 ================= */

const grouped = computed(() => {
  const map = {
    node: [],
    workflow: [],
    template: [],
    config: [],
    session: [],
    action: [],
  };
  flatResults.value.forEach((i) => map[i.type]?.push(i));
  return map;
});

/* ================= UI ================= */

function getTitle(type) {
  return {
    node: "节点",
    workflow: "工作流",
    template: "模板",
    config: "配置",
    session: "会话",
    action: "操作",
  }[type];
}

function highlight(text) {
  if (!text || !keyword.value) return text;
  return text.replace(
    new RegExp(`(${keyword.value})`, "gi"),
    "<mark>$1</mark>",
  );
}

function getIcon(n) {
  if (n.localIcon) return n.localIcon;
  if (n.icon) return n.icon;

  switch ((n.type || "").toUpperCase()) {
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

/* ================= 选择 ================= */

function handleSelect(item) {
  saveRecent(item);
  emit("changeViewMode", item);
  close();
}

/* ================= 键盘 ================= */

function handleKeyDown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    store.open();
  }

  if (!store.visible || !flatResults.value.length) return;

  if (e.key === "Escape") close();

  if (e.key === "ArrowDown") {
    selectedIndex.value = (selectedIndex.value + 1) % flatResults.value.length;
    scrollIntoView();
  }

  if (e.key === "ArrowUp") {
    selectedIndex.value =
      (selectedIndex.value - 1 + flatResults.value.length) %
      flatResults.value.length;
    scrollIntoView();
  }

  if (e.key === "Enter") {
    handleSelect(flatResults.value[selectedIndex.value]);
  }
}

/* ================= 滚动跟随 ================= */

function scrollIntoView() {
  nextTick(() => {
    const el = document.querySelector(".result-item.active");
    el?.scrollIntoView({ block: "nearest" });
  });
}

onMounted(() => window.addEventListener("keydown", handleKeyDown));
onBeforeUnmount(() => window.removeEventListener("keydown", handleKeyDown));

/* ================= 聚焦 ================= */

watch(
  () => store.visible,
  (v) => {
    if (v) {
      selectedIndex.value = 0;
      nextTick(() => {
        document.querySelector(".command-input input")?.focus();
      });
    }
  },
);

/* ================= 关闭 ================= */

function close() {
  store.close();
  keyword.value = "";
  selectedIndex.value = 0;
}

function isActive(item) {
  return flatResults.value[selectedIndex.value] === item;
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
}

.result-item:hover,
.result-item.active {
  background: #f0f7ff;
}

.node-icon {
  width: 32px;
  height: 32px;
  margin-right: 8px;
}

.node-icon img {
  width: 100%;
}

.content {
  display: flex;
  flex-direction: column; /* 关键：上下排列 */
}

.title {
  font-weight: 500;
}

.sub {
  font-size: 12px;
  color: #999;
  margin-top: 4px;

  display: -webkit-box;
  -webkit-line-clamp: 1; /* 最多一行 */
  -webkit-box-orient: vertical;
  overflow: hidden;
}

mark {
  background: #ffd666;
}
</style>
