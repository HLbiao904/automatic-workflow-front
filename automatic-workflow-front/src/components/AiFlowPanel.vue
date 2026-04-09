<template>
  <div class="ai-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="title">✨ AI流程生成</div>
      <div class="desc">输入需求，自动生成流程</div>
    </div>

    <!-- 输入区域 -->
    <div class="input-section">
      <el-input
        type="textarea"
        :rows="6"
        v-model="prompt"
        placeholder="例如：遍历文件，根据类型处理并压缩"
      />
    </div>

    <!-- 快捷示例 -->
    <div class="examples">
      <div class="examples-title">常用示例</div>
      <div class="example-list">
        <el-tag class="tag">文件处理</el-tag>
        <el-tag class="tag">视频处理</el-tag>
        <el-tag class="tag">AI生成</el-tag>
        <el-tag class="tag">批量处理</el-tag>
      </div>
    </div>

    <!-- 按钮 -->
    <div class="actions">
      <el-button type="primary" class="generate-btn" @click="generateFlow">
        生成流程
      </el-button>
      <el-button> 清空 </el-button>
    </div>

    <!-- 预览区 -->
    <div class="preview">
      <div class="preview-title">流程预览</div>
      <div class="preview-box">
        <span class="placeholder">生成后显示流程JSON...</span>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="footer">
      <el-button type="success" class="apply-btn"> 应用到画布 </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import service from "../service/index.js";
import validateAndFixFlow from "../tools/AIAutomaticFlowTools.js";
const emit = defineEmits(["generate-flow"]);
const prompt = ref("");
async function generateFlow() {
  if (!prompt.value) {
    ElMessage.warning("请输入需求描述");
    return;
  }
  const response = await service.post("/chat/AIDecisionWorkflow", {
    memoryId: Date.now(),
    message: prompt.value,
  });
  const aiFlowData = parseAIStreamData(response.data);
  console.log("AI生成的流程数据:", aiFlowData);
  const validatedFlowData = validateAndFixFlow(
    aiFlowData.nodes,
    aiFlowData.edges,
  );
  console.log("验证修复后的流程数据:", validatedFlowData);
  emit("generate-flow", validatedFlowData);
}
function parseAIStreamData(raw) {
  if (!raw) return null;

  try {
    // ===== 1. 标准化输入 =====
    let text = String(raw);

    text = text.replace(/```json/g, "").replace(/```/g, "");

    // ===== 2. 提取 data（核心修复点）=====
    if (text.includes("data:")) {
      const lines = text.split("\n");

      let buffer = "";

      for (let line of lines) {
        if (!line.startsWith("data:")) continue;

        let content = line.replace(/^data:\s*/, "");

        if (content === "[DONE]") continue;

        // 关键：不再 trim，保留结构
        buffer += content;
      }

      text = buffer;
    }

    // ===== 3. 修复 token 被拆问题（核心增强）=====

    // node + id → nodeid
    text = text.replace(/node\s*id/gi, "nodeid");

    // 驼峰断裂：create File → createFile
    text = text.replace(/([a-z])\s+([A-Z])/g, "$1$2");

    // ===== 4. 修复常见字符 =====
    text = text
      .replace(/“|”/g, '"')
      .replace(/‘|’/g, "'")
      .replace(/\r/g, "")
      .trim();

    // ===== 5. 提取 JSON =====
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error("没有找到JSON结构");
      return null;
    }

    let jsonStr = match[0];

    // ===== 6. 修复 JSON =====
    jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

    if (!jsonStr.includes('"')) {
      jsonStr = jsonStr.replace(/'/g, '"');
    }

    // ===== 7. 解析 =====
    const parsed = JSON.parse(jsonStr);

    if (parsed.nodes && parsed.edges) {
      return parsed;
    }

    console.error("JSON结构不符合流程");
    return null;
  } catch (err) {
    console.error("解析异常:", err);
    return null;
  }
}
</script>
<style scoped>
.ai-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  gap: 16px;
  background: #ffffff;
  margin-bottom: 25px;
}

/* 头部 */
.panel-header .title {
  font-size: 18px;
  font-weight: 600;
}

.panel-header .desc {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
}

/* 输入 */
.input-section textarea {
  border-radius: 8px;
}

/* 示例 */
.examples-title {
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.example-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  cursor: pointer;
  border-radius: 6px;
}

/* 按钮 */
.actions {
  display: flex;
  gap: 10px;
}

.generate-btn {
  flex: 1;
}

/* 预览 */
.preview {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.preview-title {
  font-size: 13px;
  margin-bottom: 6px;
  color: #666;
}

.preview-box {
  flex: 1;
  background: #f7f7f7;
  border-radius: 8px;
  padding: 10px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
}

.placeholder {
  color: #aaa;
}

/* 底部 */
.footer {
  border-top: 1px solid #eee;
  padding-top: 10px;
}

.apply-btn {
  width: 100%;
}
</style>
