<script setup>
import { ref, computed, watch } from "vue";
import { Search, Close } from "@element-plus/icons-vue";

/* props */
const props = defineProps({
  nodes: {
    type: Array,
    required: true,
  },
});

/* emit */
const emit = defineEmits(["node-drag-start"]);

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
</script>

<template>
  <div class="node-search-panel">
    <!-- 搜索框 -->
    <el-input
      v-model="keyword"
      clearable
      size="default"
      placeholder="搜索节点 / 参数 / 描述"
      :prefix-icon="Search"
      class="search-input"
    />

    <!-- 分类 + 节点 -->
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
        <el-card
          v-for="n in group.nodes"
          :key="n.id"
          shadow="hover"
          class="node-item"
          @mousedown.prevent="onMouseDown(n)"
        >
          <div class="node-row">
            <span class="node-name">{{ n.label }}</span>
            <span class="node-type">{{ n.type }}</span>
          </div>
          <!-- 参数 Tags -->
          <div class="node-params">
            <el-tag
              v-for="p in n.params"
              :key="p.key"
              size="small"
              type="success"
              effect="light"
              class="param-tag"
            >
              {{ p.name }}
            </el-tag>
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
  cursor: grab;
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
}

.param-tag {
  border-radius: 8px;
}
</style>
