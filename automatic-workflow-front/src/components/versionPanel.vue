<script setup>
import { ref, onMounted, markRaw } from "vue";
import { ElMessage } from "element-plus";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
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
          <div class="version-sub">{{ formatTime(v.createdAt) }}</div>
        </div>
      </div>
    </div>

    <!-- 右侧：版本预览 -->
    <div class="version-preview">
      <div class="preview-header">版本预览</div>

      <div class="preview-canvas">
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

.version-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

/* 右侧预览区 */
.version-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.preview-header {
  height: 40px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #606266;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}

.preview-canvas {
  flex: 1;
}
</style>
