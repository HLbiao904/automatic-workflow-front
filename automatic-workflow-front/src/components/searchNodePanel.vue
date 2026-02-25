<script setup>
import { ref, computed, watch } from "vue";
import { Search } from "@element-plus/icons-vue";

/* props */
const props = defineProps({
  nodes: {
    type: Array,
    required: true,
  },
  isReplaceNode: {
    type: Boolean,
    default: false,
  },
});

/* emit */
const emit = defineEmits([
  "node-drag-start",
  "replace-node",
  "update:isReplaceNode",
]);

/* state */
const keyword = ref("");
const activeCategories = ref([]);

/* 1️⃣ 分组 */
const groupedNodes = computed(() => {
  const map = {};

  props.nodes.forEach((node) => {
    const code = node.categoryCode || "DEFAULT";

    if (!map[code]) {
      map[code] = {
        categoryCode: code,
        categoryLabel: node.categoryLabel || "未分类",
        categoryOrder: node.categoryOrder ?? 999,
        nodes: [],
      };
    }

    map[code].nodes.push(node);
  });

  return Object.values(map).sort((a, b) => a.categoryOrder - b.categoryOrder);
});

/* 2️⃣ 搜索过滤 */
const filteredGroups = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return groupedNodes.value;

  const result = [];

  groupedNodes.value.forEach((group) => {
    const matched = group.nodes.filter((n) => {
      return (
        n.label?.toLowerCase().includes(kw) ||
        n.nodeId?.toLowerCase().includes(kw) ||
        n.type?.toLowerCase().includes(kw) ||
        n.description?.toLowerCase().includes(kw) ||
        n.params?.some((p) => p.name?.toLowerCase().includes(kw))
      );
    });

    if (matched.length) {
      result.push({
        ...group,
        nodes: matched,
      });
    }
  });

  return result;
});

/* 3️⃣ 搜索时自动展开 */
watch(keyword, () => {
  activeCategories.value = filteredGroups.value.map((g) => g.categoryCode);
});

/* 4️⃣ 拖拽 */
function onMouseDown(node) {
  emit("node-drag-start", node);
}

/* 5️⃣ 替换 */
function replaceNode(node) {
  emit("replace-node", node);
  // 告诉父组件关闭替换模式
  emit("update:isReplaceNode", false);
}
</script>

<template>
  <div class="node-search-panel">
    <!-- 搜索框 -->
    <el-input
      v-model="keyword"
      clearable
      placeholder="搜索节点 / 参数 / 描述"
      :prefix-icon="Search"
      class="search-input"
    />

    <!-- 分类 -->
    <el-collapse v-model="activeCategories">
      <el-collapse-item
        v-for="group in filteredGroups"
        :key="group.categoryCode"
        :name="group.categoryCode"
      >
        <template #title>
          <span class="category-title">
            {{ group.categoryLabel }}
          </span>
        </template>

        <!-- 节点列表 -->
        <el-card
          v-for="n in group.nodes"
          :key="n.id"
          shadow="hover"
          class="node-item"
        >
          <div class="node-container">
            <!-- 左侧拖拽区域 -->
            <div class="drag-area" @mousedown.prevent="onMouseDown(n)">⠿</div>

            <!-- 中间内容 -->
            <div class="node-content">
              <div class="node-row">
                <span class="node-name">{{ n.label }}</span>
                <span class="node-type">{{ n.type }}</span>
              </div>

              <div class="node-params">
                <el-tag
                  v-for="p in n.params"
                  :key="p.name"
                  size="small"
                  type="success"
                  effect="light"
                  class="param-tag"
                >
                  {{ p.name }}
                </el-tag>
              </div>
            </div>

            <!-- 右侧替换按钮 -->
            <div
              v-if="isReplaceNode"
              class="replace-btn"
              @mousedown.stop
              @click.stop="replaceNode(n)"
            >
              替换
            </div>
          </div>
        </el-card>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<style scoped>
.node-search-panel {
  padding: 8px;
}

.search-input {
  margin-bottom: 8px;
}

.node-item {
  margin-bottom: 6px;
  user-select: none;
}

.node-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 拖拽区域 */
.drag-area {
  cursor: grab;
  font-size: 16px;
  padding: 4px 6px;
  color: #666;
}

.drag-area:active {
  cursor: grabbing;
}

/* 内容区域 */
.node-content {
  flex: 1;
}

.node-row {
  display: flex;
  justify-content: space-between;
}

.node-name {
  font-weight: 500;
}

.node-type {
  font-size: 12px;
  color: #999;
}

.node-params {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.param-tag {
  border-radius: 8px;
}

/* 替换按钮 */
.replace-btn {
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
}

.replace-btn:hover {
  text-decoration: underline;
}
</style>
