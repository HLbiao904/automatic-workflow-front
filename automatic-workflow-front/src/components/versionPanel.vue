<script setup>
import { ref, onMounted, markRaw, watch } from "vue";
import { ElMessage } from "element-plus";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import service from "@/service";
import StartNode from "../nodes/startNode.vue";
import CommonNode from "../nodes/commonNode.vue";
import SwitchNode from "../nodes/switchNode.vue";
import ForNode from "../nodes/forNode.vue";
import BooleanNode from "../nodes/booleanNode.vue";
import WhenNode from "../nodes/whenNode.vue";
import DefaultEdge from "../components/defaultEdge.vue";
const nodeTypes = {
  common: markRaw(CommonNode),
  switch: markRaw(SwitchNode),
  for: markRaw(ForNode),
  boolean: markRaw(BooleanNode),
  when: markRaw(WhenNode),
  start: markRaw(StartNode),
};
const edgeTypes = {
  default: markRaw(DefaultEdge),
};
const props = defineProps({
  workflowId: {
    type: Number,
    required: true,
  },
});
//监听工作流切换,查询该workflow的versions列表
watch(
  () => props.workflowId,
  (newId) => {
    service
      .get("/workflow/version/list", {
        params: { workflowId: newId },
      })
      .then((res) => {
        versions.value = res.data || [];
      });
  },
);
const loading = ref(false);
const versions = ref([]);

const previewNodes = ref([]);
const previewEdges = ref([]);

async function loadVersions() {
  if (!props.workflowId) return;

  loading.value = true;
  try {
    const res = await service.get("/workflow/version/list", {
      params: { workflowId: props.workflowId },
    });
    versions.value = res.data || [];
    versions.value.sort((a, b) => b.version - a.version);
    console.log("versions", versions);
  } catch (e) {
    ElMessage.error("加载版本列表失败");
  } finally {
    loading.value = false;
  }
}

const activeVersionId = ref(null);

async function loadVersion(version) {
  activeVersionId.value = version.id;

  try {
    const res = await service.get("/workflow/version/getVersion", {
      params: { id: version.id },
    });

    previewNodes.value = JSON.parse(res.data.nodesJson);
    previewEdges.value = JSON.parse(res.data.edgesJson);
  } catch (e) {
    ElMessage.error("加载版本内容失败");
  }
}
function deleteVersion(versionId) {
  ElMessageBox.confirm(`确定删除 Version #${versionId} 吗？`, "危险操作", {
    type: "warning",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
    confirmButtonClass: "el-button--danger",
  }).then(async () => {
    const res = await service.delete("/workflow/version/delete", {
      params: { id: versionId },
    });
    if (res.status == 200) {
      versions.value = versions.value.filter((v) => v.id !== versionId);
      activeVersionId.value = null;
      previewNodes.value = [];
      previewEdges.value = [];
      ElMessage.success("版本已删除");
    } else {
      ElMessage.success("删除失败");
    }
  });
}

function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, "0");
  const D = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}
onMounted(loadVersions);
</script>

<template>
  <div class="workflow-versions-page">
    <!-- 左侧：版本列表 -->
    <div class="version-panel">
      <div class="header">版本历史</div>

      <div class="version-list" v-loading="loading">
        <div
          v-for="v in versions"
          :key="v.id"
          class="version-item"
          :class="{ active: v.id === activeVersionId }"
          @click="loadVersion(v)"
        >
          <div class="version-main">
            <span class="version-tag">v{{ v.version }}</span>
          </div>
          <div class="time">{{ formatTime(v.createdAt) }}</div>
        </div>
      </div>
    </div>

    <!-- 右侧：版本预览 -->
    <div class="version-preview">
      <div class="preview-canvas">
        <!-- 左上：版本信息 -->
        <div v-if="activeVersionId" class="version-overlay version-info">
          <div class="version-date">
            {{
              formatTime(
                versions.find((v) => v.id === activeVersionId)?.createdAt,
              )
            }}
          </div>
          <div class="version-meta">
            <span class="createBy">
              创建者:{{
                versions.find((v) => v.id === activeVersionId)?.createdBy
              }}
            </span>
            <span class="createBy">
              执行次数:{{
                versions.find((v) => v.id === activeVersionId)?.executionCount
              }}
            </span>
          </div>
        </div>

        <!-- 右上：工具栏 -->
        <div v-if="activeVersionId" class="version-overlay version-toolbar">
          <div class="deleteBtn" @click="deleteVersion(activeVersionId)">
            <img src="../assets/deleteExecution.svg" alt="" />
          </div>
        </div>
        <VueFlow
          :nodes="previewNodes"
          :edges="previewEdges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          fit-view
          :nodes-draggable="false"
          :nodes-connectable="false"
          :elements-selectable="false"
          :zoom-on-scroll="false"
          :pan-on-drag="true"
        >
          <template #node-common="nodeProps">
            <CommonNode v-bind="nodeProps" :showToolBar="false" />
          </template>
          <template #node-switch="nodeProps">
            <SwitchNode v-bind="nodeProps" :showToolBar="false" />
          </template>
          <template #node-boolean="nodeProps">
            <BooleanNode v-bind="nodeProps" :showToolBar="false" />
          </template>
          <template #node-for="nodeProps">
            <ForNode v-bind="nodeProps" :showToolBar="false" />
          </template>
          <template #node-when="nodeProps">
            <WhenNode v-bind="nodeProps" :showToolBar="false" />
          </template>
          <Controls />
          <MiniMap pannable zoomable />
          <Background />
        </VueFlow>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.workflow-versions-page {
  height: 100%;
  display: flex;
  background: #f0f2f5;
}

/* 左侧版本面板 */
.version-panel {
  width: 320px;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
}

.header {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  font-weight: 600;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.version-list {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}

.version-item {
  background: #fff;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;

  &:hover {
    border-color: #409eff;
    transform: translateY(-1px);
  }

  &.active {
    border-color: #409eff;
    background: #ecf5ff;
  }
}

.version-tag {
  font-weight: 600;
  color: #409eff;
}

.time {
  margin-top: 4px;
  font-size: 14px;
  color: #909399;
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
    "Courier New", monospace;

  background: transparent;
}

/* 右侧预览区 */
.version-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.preview-canvas {
  position: relative;
  flex: 1;
}
/* 通用浮层 */
.version-overlay {
  position: absolute;
  z-index: 10;
  pointer-events: auto;
  user-select: none;
}
.version-info {
  top: 16px;
  left: 16px;
  padding: 12px 16px;
  border-radius: 14px;

  /* 关键：更透明 + 毛玻璃 */
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);

  /* 轻描边 + 阴影 */
  border: 1px solid rgba(255, 255, 255, 0.35);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);

  user-select: none;

  .version-date {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 8px;
    letter-spacing: 0.2px;
  }

  .version-meta {
    display: flex;
    gap: 10px;
    font-size: 12px;
    color: #606266;

    .createBy {
      padding: 3px 8px;
      border-radius: 6px;

      /* 更柔和的标签 */
      background: rgba(64, 158, 255, 0.15);
      color: #409eff;
      font-weight: 500;
      white-space: nowrap;
    }
  }
}

.version-toolbar {
  top: 12px;
  right: 14px;
  .deleteBtn {
    border: 2px solid black;
    padding: 5px;
    cursor: pointer;
    width: 22px;
    height: 22px;
    img {
      width: 100%;
      height: 100%;
    }
  }
}
</style>
