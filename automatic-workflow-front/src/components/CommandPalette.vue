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
import dayjs from "dayjs";
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

/* ================= 数据适配（核心） ================= */
const allData = computed(() => {
  const list = [];

  if (props.viewMode !== "chat") {
    list.push(
      ...store.nodes.map((n) => ({
        type: "node",
        weight: 3,
        data: { ...n, _name: n.label, _desc: n.description },
      })),

      ...store.workflows.map((w) => ({
        type: "workflow",
        weight: 2,
        data: { ...w, _name: w.name, _desc: w.description },
      })),

      ...store.templates.map((t) => ({
        type: "template",
        weight: 1,
        data: { ...t, _name: t.templateName, _desc: t.description },
      })),

      ...store.configs.map((c, i) => ({
        type: "config",
        weight: 0,
        data: {
          id: i,
          _name: typeof c === "string" ? c : c.name,
          _desc: "",
        },
      })),
    );
  }

  if (props.viewMode === "chat") {
    list.push(
      ...store.sessions.map((s) => ({
        type: "session",
        weight: 2,
        data: { ...s, _name: s.title, _desc: "" },
      })),
      {
        type: "action",
        weight: 3,
        data: { _name: "新建会话", action: "create" },
      },
    );
  }

  return list;
});

/* ================= 最近使用 ================= */
function getRecent() {
  return JSON.parse(localStorage.getItem("cmd_recent") || "[]");
}

/* ================= 搜索（Fuse.js） ================= */
const searchData = computed(() => {
  if (!keyword.value) return null;

  const fuse = new Fuse(allData.value, {
    keys: ["data._name", "data._desc"],
    threshold: 0.4,
  });

  const result = fuse.search(keyword.value).map((r) => r.item);

  // 权重排序 + 最近使用优先
  const recent = getRecent();

  return result.sort((a, b) => {
    const ra = recent.findIndex((r) => r.data.id === a.data.id);
    const rb = recent.findIndex((r) => r.data.id === b.data.id);

    if (ra !== -1 || rb !== -1) return ra - rb;

    return b.weight - a.weight;
  });
});

/* ================= 默认 ================= */
const defaultData = computed(() => {
  //  chat 模式
  if (props.viewMode === "chat") {
    return [
      {
        type: "action",
        data: { _name: "新建会话", action: "create" },
      },

      ...store.sessions.slice(0, 6).map((s) => ({
        type: "session",
        data: { ...s, _name: s.title, _desc: "" },
      })),
    ];
  }

  // editor 模式
  return [
    ...getRecent(),

    ...store.nodes.slice(0, 4).map((n) => ({
      type: "node",
      data: { ...n, _name: n.label, _desc: n.description },
    })),

    ...store.workflows.slice(0, 2).map((w) => ({
      type: "workflow",
      data: { ...w, _name: w.name, _desc: w.description },
    })),

    ...store.templates.slice(0, 2).map((t) => ({
      type: "template",
      data: { ...t, _name: t.templateName, _desc: t.description },
    })),

    ...store.configs.slice(0, 2).map((c, i) => ({
      type: "config",
      data: {
        id: i,
        _name: typeof c === "string" ? c : c.name,
        _desc: "",
      },
    })),
  ];
});

const flatResults = computed(() => searchData.value || defaultData.value);

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

/* ================= 高亮 ================= */
function highlight(text) {
  if (!text || !keyword.value) return text;
  return text.replace(
    new RegExp(`(${keyword.value})`, "gi"),
    "<mark>$1</mark>",
  );
}

/* ================= icon ================= */
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

  console.log("选择:", item);

  close();
}

/* ================= 最近记录 ================= */
function saveRecent(item) {
  const list = getRecent();
  const newList = [
    item,
    ...list.filter((i) => i.data.id !== item.data.id),
  ].slice(0, 10);

  localStorage.setItem("cmd_recent", JSON.stringify(newList));
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
  }

  if (e.key === "ArrowUp") {
    selectedIndex.value =
      (selectedIndex.value - 1 + flatResults.value.length) %
      flatResults.value.length;
  }

  if (e.key === "Enter") {
    handleSelect(flatResults.value[selectedIndex.value]);
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeyDown);
});
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
