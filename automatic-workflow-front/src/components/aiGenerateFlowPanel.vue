<template>
  <div class="ai-panel" :class="{ flash: flashActive }">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="title">✨ AI流程生成</div>
      <div class="desc">输入需求，自动生成流程</div>
    </div>

    <!-- 输入 -->
    <el-input
      type="textarea"
      :rows="5"
      v-model="prompt"
      placeholder="例如：遍历文件，根据类型处理并压缩"
    />

    <!-- 模板示例 -->
    <div class="section">
      <div class="section-title">📦 模板示例</div>

      <!-- 搜索 -->
      <el-input
        v-model="templateKeyword"
        placeholder="搜索模板..."
        size="small"
        clearable
      />

      <!-- 模板列表 -->
      <div class="template-list">
        <div
          v-for="item in filteredTemplates"
          :key="item.name"
          class="template-item"
          @click="fillExample(item.content)"
        >
          <div class="template-name">{{ item.name }}</div>
          <div class="template-desc">{{ item.desc }}</div>
        </div>
      </div>
    </div>

    <!-- 按钮 -->
    <div class="actions">
      <el-button type="primary" :loading="loading" @click="generateFlow">
        {{ loading ? "生成中..." : "生成流程" }}
      </el-button>
      <el-button type="primary" :loading="loading" @click="applyFlow">
        应用到画布
      </el-button>
      <el-button @click="clearInput">清空</el-button>
    </div>

    <!-- 历史记录 -->
    <div class="section">
      <div class="section-title">🕘 历史记录</div>

      <div v-if="historyList.length === 0" class="empty">暂无记录</div>
      <div class="history-item-wrapper">
        <div
          v-for="item in historyList"
          :key="item.id"
          class="history-item"
          @click="reuseHistory(item)"
        >
          <div class="history-content">
            <!-- 文本 -->
            <div class="history-text">
              {{ item.prompt }}
            </div>

            <!-- 时间（放底部） -->
            <div class="history-time">
              {{ formatTime(item.createdAt) }}
            </div>
          </div>

          <!-- 右侧操作 -->
          <div class="history-actions">
            <el-button
              class="btn"
              size="small"
              type="primary"
              text
              @click.stop="previewFlow(item)"
            >
              预览
            </el-button>
            <el-button
              class="btn"
              size="small"
              type="danger"
              text
              @click.stop="deleteHistory(item)"
            >
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import service from "../service/index.js";
import validateAndFixFlow from "../tools/AIAutomaticFlowTools.js";
const props = defineProps({ refreshKey: [String, Number] });
const emit = defineEmits(["generate-success", "apply-flow", "preview-flow"]);

const prompt = ref("");
const loading = ref(false);
const flashActive = ref(false);
onMounted(async () => {
  const res = await service.get("/ai/workflow/history/list", {
    params: {
      userId: Number(localStorage.getItem("userId")),
    },
  });
  historyList.value = res.data || [];
  console.log("历史记录:", res);
});
watch(
  () => props.refreshKey,
  () => {
    fetchHistory(); // 重新请求
  },
);

function triggerFlash() {
  flashActive.value = true;
  setTimeout(() => {
    flashActive.value = false;
  }, 600);
}

defineExpose({
  triggerFlash,
});
// ================= 模板 =================
const templateKeyword = ref("");

const templates = ref([
  {
    name: "文件处理",
    desc: "遍历文件并分类处理",
    content: "遍历文件，根据类型处理并压缩",
  },
  {
    name: "视频处理",
    desc: "批量视频操作",
    content: "批量处理视频并添加水印",
  },
  {
    name: "AI生成",
    desc: "调用AI生成内容",
    content: "调用AI生成内容并保存",
  },
  {
    name: "批量任务",
    desc: "批量执行任务",
    content: "批量处理多个任务并输出结果",
  },
]);

const filteredTemplates = computed(() => {
  if (!templateKeyword.value) return templates.value;

  return templates.value.filter((t) =>
    (t.name + t.desc + t.content)
      .toLowerCase()
      .includes(templateKeyword.value.toLowerCase()),
  );
});

function fillExample(text) {
  prompt.value = text;
}

function fetchHistory() {
  service
    .get("/ai/workflow/history/list", {
      params: {
        userId: Number(localStorage.getItem("userId")),
      },
    })
    .then((res) => {
      historyList.value = res.data || [];
      console.log("历史记录:", res);
    });
}
// ================= 历史记录 =================
const historyList = ref([]);

// 生成流程
async function generateFlow() {
  if (!prompt.value.trim()) {
    ElMessage.warning("请输入需求描述");
    return;
  }

  loading.value = true;

  try {
    const response = await service.post("/chat/AIDecisionWorkflow", {
      memoryId: Date.now(),
      message: prompt.value,
    });

    const aiFlowData = parseAIStreamData(response.data);
    console.log("AI原始返回数据:", aiFlowData);
    if (!aiFlowData) {
      ElMessage.error("AI生成失败");
      return;
    }

    const validatedFlowData = validateAndFixFlow(
      aiFlowData.nodes,
      aiFlowData.edges,
    );

    // 通知父组件
    emit("generate-success", validatedFlowData, prompt.value);

    // ElMessage.success("生成成功");
  } catch (err) {
    ElMessage.error("生成异常");
  } finally {
    loading.value = false;
  }
}
// 预览
function previewFlow(item) {
  emit("preview-flow", item);
}
function deleteHistory(item) {
  ElMessageBox.confirm("确定要删除这条历史记录吗？", "删除确认", {
    confirmButtonText: "删除",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      service
        .delete(`/ai/workflow/history/${item.id}`)
        .then(() => {
          ElMessage.success("删除成功");
          fetchHistory(); // 刷新列表
        })
        .catch((e) => {
          console.error("删除历史记录失败", e);
          ElMessage.error("删除失败");
        });
    })
    .catch(() => {});
}
// 应用到画布
function applyFlow() {
  emit("apply-flow");
}
// 复用历史
function reuseHistory(item) {
  prompt.value = item.prompt;
}

// 清空
function clearInput() {
  prompt.value = "";
}

// ================= AI解析 =================
function parseAIStreamData(raw) {
  if (!raw) return null;

  try {
    let text = String(raw);

    text = text.replace(/```json/g, "").replace(/```/g, "");

    if (text.includes("data:")) {
      const lines = text.split("\n");
      let buffer = "";

      for (let line of lines) {
        if (!line.startsWith("data:")) continue;
        let content = line.replace(/^data:\s*/, "");
        if (content === "[DONE]") continue;
        buffer += content;
      }

      text = buffer;
    }

    text = text.replace(/node\s*id/gi, "nodeid");
    text = text.replace(/([a-z])\s+([A-Z])/g, "$1$2");

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;

    let jsonStr = match[0];

    jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

    if (!jsonStr.includes('"')) {
      jsonStr = jsonStr.replace(/'/g, '"');
    }

    const parsed = JSON.parse(jsonStr);

    return parsed.nodes && parsed.edges ? parsed : null;
  } catch (err) {
    return null;
  }
}
function formatTime(timeStr) {
  if (!timeStr) return "";

  const date = new Date(timeStr);

  const pad = (n) => (n < 10 ? "0" + n : n);

  return (
    date.getFullYear() +
    "-" +
    pad(date.getMonth() + 1) +
    "-" +
    pad(date.getDate()) +
    " " +
    pad(date.getHours()) +
    ":" +
    pad(date.getMinutes()) +
    ":" +
    pad(date.getSeconds())
  );
}
</script>

<style scoped lang="scss">
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 10px;
  box-sizing: border-box;
  padding: 10px;
  border-left: 3px solid transparent;
}

.ai-panel.flash {
  animation: panelFlash 0.6s ease;
}

@keyframes panelFlash {
  0% {
    box-shadow: 0 0 0 rgba(64, 158, 255, 0);
    border-left: 3px solid transparent;
  }
  30% {
    box-shadow: 0 0 12px rgba(64, 158, 255, 0.6);
    border-left: 3px solid #409eff;
    background: rgba(64, 158, 255, 0.08);
  }
  100% {
    box-shadow: 0 0 0 rgba(64, 158, 255, 0);
    border-left: 3px solid transparent;
    background: transparent;
  }
}
/* ===== 标题 ===== */
.panel-header .title {
  font-size: 15px;
  font-weight: bold;
}

.panel-header .desc {
  font-size: 12px;
  color: #888;
}

/* ===== 分区 ===== */
.section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-title {
  margin: 15px 0 2px;
  font-size: 13px;
  color: #666;
}

/* ===== 模板区域 ===== */
.template-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-height: 140px;
  overflow-y: auto;
  padding-right: 4px;
  margin-top: 8px;
}

/* 模板卡片 */
.template-item {
  padding: 10px;
  border-radius: 8px;
  background: #f7f8fa;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.template-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
  /* transform: translateY(-1px); */
}

/* 模板文字 */
.template-name {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 2px;
}

.template-desc {
  font-size: 11px;
  color: #888;
}

/* ===== 按钮 ===== */
.actions {
  display: flex;
  gap: 8px;
}

/* ===== 历史记录 ===== */
.section:last-child {
  /* flex: 1; */
  min-height: 0;
}

.history-item-wrapper {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

/* ===== 历史记录卡片 ===== */
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;

  padding: 10px 12px;
  margin-bottom: 6px;

  border-radius: 8px;
  background: #fafafa;
  border: 1px solid #eee;

  cursor: pointer;
  transition: all 0.25s ease;
}

/* hover 效果 */
.history-item:hover {
  background: #f0f7ff;
  border-color: #409eff;
  box-shadow: 0 2px 6px rgba(64, 158, 255, 0.15);
  /* transform: translateY(-1px); */
}

.history-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 文本 */
.history-text {
  font-size: 13px;
  font-weight: 500;
  color: #333;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 时间在底部 */
.history-time {
  font-size: 11px;
  color: #999;
  margin-top: 6px;
}

/* 右侧按钮 */
.history-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-left: 10px;
  .btn {
    padding: 0;
    margin: 0;
  }
}

/* ===== 滚动条美化 ===== */
.template-list::-webkit-scrollbar,
.history-item-wrapper::-webkit-scrollbar {
  width: 6px;
}

.template-list::-webkit-scrollbar-thumb,
.history-item-wrapper::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.15);
  border-radius: 3px;
}

.template-list::-webkit-scrollbar-thumb:hover,
.history-item-wrapper::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.template-list::-webkit-scrollbar-track,
.history-item-wrapper::-webkit-scrollbar-track {
  background: transparent;
}

/* Firefox */
.template-list,
.history-item-wrapper {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}
</style>
