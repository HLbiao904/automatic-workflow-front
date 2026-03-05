<template>
  <div class="file-search">
    <!-- 顶部搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="keyword"
        :placeholder="props.param?.desc || '搜索文件...'"
        clearable
        @input="handleInput"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>

      <div class="switch">
        <span>自动</span>
        <el-switch v-model="autoSearch" />
      </div>
    </div>

    <!-- 搜索结果 -->
    <el-scrollbar v-if="results.length" class="result-panel">
      <div
        v-for="item in results"
        :key="item.path"
        class="result-item"
        @click="selectPath(item.full)"
      >
        <el-icon class="file-icon">
          <Document v-if="!item.isFolder" />
          <Folder v-else />
        </el-icon>

        <div class="file-info">
          <div class="file-name">{{ item.name }}</div>
          <div class="file-path">{{ item.path }}</div>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { ref } from "vue";
import axios from "axios";
import { Search, Document, Folder } from "@element-plus/icons-vue";

const emit = defineEmits(["update:modelValue"]);
const props = defineProps(["param"]);
const keyword = ref("");
const autoSearch = ref(true);
const results = ref([]);

let timer = null;

/* 防抖输入 */
function handleInput() {
  if (!autoSearch.value) return;

  clearTimeout(timer);

  timer = setTimeout(() => {
    if (!keyword.value) {
      results.value = [];
      return;
    }

    searchFile();
  }, 400);
}

/* 搜索 */
async function searchFile() {
  try {
    const res = await axios.get("/everything/", {
      params: {
        search: keyword.value,
        count: 10,
        json: 1,
        path_column: 1,
      },
    });

    results.value = res.data.results.map((e) => ({
      name: e.name,
      path: e.path,
      isFolder: !e.name.includes("."),
      full: e.path + "\\" + e.name,
    }));
  } catch (e) {
    console.error("search error", e);
  }
}

/* 选择路径 */
function selectPath(fullPath) {
  keyword.value = fullPath;
  results.value = [];

  const path1 = fullPath.replace(/\\/g, "\\\\");
  console.log("selected path:", path1);

  emit("update:modelValue", path1);
}
</script>

<style scoped>
.file-search {
  width: 100%;
}

/* 顶部搜索栏 */
.search-bar {
  display: flex;
  gap: 10px;
  align-items: center;
}

.switch {
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}

/* 结果面板 */
.result-panel {
  margin-top: 10px;
  max-height: 260px;
  height: 260px; /* 加上这一行 */
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

/* 单条结果 */
.result-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  cursor: pointer;
  transition: 0.2s;
}

.result-item:hover {
  background: #f5f7fa;
}

/* 图标 */
.file-icon {
  font-size: 20px;
  margin-right: 8px;
  color: #409eff;
}

/* 文件信息 */
.file-info {
  display: flex;
  flex-direction: column;
}

/* 文件名 */
.file-name {
  font-size: 14px;
  font-weight: 500;
}

/* 路径 */
.file-path {
  font-size: 12px;
  color: #909399;
}
</style>
