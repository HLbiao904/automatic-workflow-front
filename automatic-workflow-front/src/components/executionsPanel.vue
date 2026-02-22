<script setup>
import { ref, computed, onMounted, markRaw, onUpdated, watch } from "vue";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { MiniMap } from "@vue-flow/minimap";
import service from "../service/index.js";
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
/* ========== props ========== */
const props = defineProps({
  workflowId: {
    type: Number,
    required: true,
  },
});

/* ========== execution list ========== */
const executions = ref([]);
const activeId = ref(null);

const collapsed = ref(false);
const activeNodeId = ref(null);
const ioTab = ref("input");

function toggleExecPanel() {
  collapsed.value = !collapsed.value;
}

const activeNodeEvent = computed(() => {
  if (!activeExecution.value || !activeNodeId.value) return null;
  return activeExecution.value.events.find((e) => e.id === activeNodeId.value);
});

const activeExecution = computed(() =>
  executions.value.find((e) => e.id === activeId.value),
);

/* ========== workflow snapshot for execution ========== */
const execNodes = ref([]);
const execEdges = ref([]);

/* ========== lifecycle ========== */
onMounted(() => {
  service
    .get("api/workflowExecute/list", {
      params: { workflowId: props.workflowId },
    })
    .then((res) => {
      executions.value = res.data || [];
    });
});
//监听工作流切换,查询该workflow的execution列表
watch(
  () => props.workflowId,
  (newId) => {
    service
      .get("api/workflowExecute/list", {
        params: { workflowId: newId },
      })
      .then((res) => {
        console.log("executions:", res.data);
        executions.value = res.data || [];
      });
  },
);
/* ========== helpers ========== */
function normalizeNodes(nodes) {
  return (nodes || []).map((n) => ({
    ...n,
    data: {
      ...(n.data || {}),
      status: null, // execution 回放不带运行态
    },
  }));
}

function selectExecution(exec) {
  activeId.value = exec.id;

  service
    .get("api/workflowExecute/executionVersion", {
      params: { id: exec.workflowVersionId },
    })
    .then((res) => {
      // execNodes.value = normalizeNodes(JSON.parse(res.data.nodesJson) || []);
      execNodes.value = JSON.parse(res.data.nodesJson) || []; // executions回放展示运行状态
      execEdges.value = JSON.parse(res.data.edgesJson) || [];
    });
}
function formatDuration(ms) {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}
function deleteExecution(exec) {
  ElMessageBox.confirm(`确定删除 Execution #${exec.id} 吗？`, "危险操作", {
    type: "warning",
    confirmButtonText: "确认删除",
    cancelButtonText: "取消",
    confirmButtonClass: "el-button--danger",
  })
    .then(async () => {
      const res = await service.delete("api/workflowExecute/delete", {
        params: { id: exec.id },
      });
      if (res.status == 200) {
        executions.value = executions.value.filter((e) => e.id !== exec.id);
        activeId.value = null;
        ElMessage.success("已删除");
      } else {
        ElMessage.success("删除失败");
      }
    })
    .catch(() => {});
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
</script>

<template>
  <div class="executions-panel">
    <!-- 左：execution 列表 -->
    <div class="exec-list">
      <div
        v-for="exec in executions"
        :key="exec.id"
        class="exec-item"
        :class="[exec.status.toLowerCase(), { active: exec.id === activeId }]"
        @click="selectExecution(exec)"
      >
        <div class="exec-id">#{{ exec.id }}</div>
        <div class="exec-meta">
          <span class="status">{{ exec.status }}</span>
          <span class="time">{{ formatTime(exec.startTime) }}</span>
        </div>
      </div>
    </div>

    <!-- 右：execution 详情 -->
    <div class="exec-detail" v-if="activeExecution">
      <!-- workflow 快照（只读） -->
      <div class="exec-workflow">
        <!-- 左上角：execution 信息 -->
        <div class="exec-overlay exec-info-bar">
          <span class="status" :class="activeExecution.status.toLowerCase()">
            {{ activeExecution.status }}
          </span>
          <span class="time">
            {{ formatTime(activeExecution.startTime) }}
          </span>
          <span class="duration">
            ⏱ {{ formatDuration(activeExecution.duration) }}
          </span>
        </div>

        <!-- 右上角：工具栏 -->
        <div class="exec-overlay exec-toolbar">
          <div class="deleteBtn" @click="deleteExecution(activeExecution)">
            <img src="../assets/deleteExecution.svg" />
          </div>
        </div>
        <VueFlow
          id="execution-flow"
          :nodes="execNodes"
          :edges="execEdges"
          :node-types="nodeTypes"
          :edge-types="edgeTypes"
          :nodes-draggable="false"
          :nodes-connectable="false"
          :edges-updatable="false"
          :zoom-on-scroll="true"
          :pan-on-drag="true"
          fit-view
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

      <!-- 下半区信息 -->
      <div
        class="exec-info n8n-style"
        :class="{ collapsed }"
        v-if="activeExecution"
      >
        <!-- 顶部折叠栏 -->
        <div class="exec-collapse-bar" @click="toggleExecPanel">
          <div class="collapse-left">
            <span class="title"> Execution {{ activeExecution.id }} Logs </span>
            <span class="summary">
              {{ activeExecution.status }}
              · {{ formatTime(activeExecution.startTime) }}
            </span>
          </div>

          <div class="collapse-right">
            <span class="arrow">
              {{ collapsed ? "▲" : "▼" }}
            </span>
          </div>
        </div>

        <!-- 内容区 -->
        <div v-show="!collapsed" class="exec-body">
          <!-- 左侧节点列表 -->
          <div class="node-list">
            <div
              v-for="(ev, i) in activeExecution.events"
              :key="i"
              class="node-item"
              :class="{ active: ev.id === activeNodeId }"
              @click.stop="activeNodeId = ev.id"
            >
              <div class="node-name">
                {{ ev.id }}
              </div>

              <div class="node-status" :class="ev.event.toLowerCase()">
                {{ ev.event }}
              </div>
            </div>
          </div>

          <!-- 右侧详情 -->
          <div class="node-detail">
            <template v-if="activeNodeEvent">
              <!-- 顶部节点信息 -->
              <div class="node-header">
                <div class="left">
                  <span class="title">
                    {{ activeNodeEvent.id }}
                  </span>

                  <span
                    class="status"
                    :class="activeNodeEvent.event.toLowerCase()"
                  >
                    {{ activeNodeEvent.event }}
                  </span>

                  <span class="duration">
                    ⏱ {{ formatDuration(activeNodeEvent.duration) }}
                  </span>
                </div>

                <!-- IO 切换 -->
                <div class="right">
                  <button
                    :class="{ active: ioTab === 'input' }"
                    @click="ioTab = 'input'"
                  >
                    Input
                  </button>

                  <button
                    :class="{ active: ioTab === 'output' }"
                    @click="ioTab = 'output'"
                  >
                    Output
                  </button>
                </div>
              </div>

              <!-- JSON 数据区 -->
              <div class="node-json">
                <pre v-if="ioTab === 'input'"
                  >{{ JSON.stringify(activeNodeEvent.input || {}, null, 2) }}
          </pre
                >

                <pre v-else
                  >{{ JSON.stringify(activeNodeEvent.output || {}, null, 2) }}
          </pre
                >
              </div>
            </template>

            <!-- 未选择节点 -->
            <div v-else class="node-empty">请选择一个节点查看运行数据</div>
          </div>
        </div>
      </div>
    </div>

    <div class="exec-empty" v-else>请选择一次执行</div>
  </div>
</template>

<style scoped lang="scss">
.executions-panel {
  display: flex;
  height: 100%;
  background: #f7f8fa;
}

/* 左侧 execution 列表 */
.exec-list {
  width: 280px;
  border-right: 1px solid #e4e7ed;
  background: #fff;
  overflow-y: auto;
}

.exec-item {
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  user-select: none;

  &:hover {
    background: #f5f7fa;
  }

  &.active {
    background: #ecf5ff;
  }

  &.running .status {
    color: #409eff;
  }
  &.success .status {
    color: #67c23a;
  }
  &.error .status {
    color: #f56c6c;
  }
}

.exec-id {
  font-weight: 600;
  font-size: 13px;
}
.exec-info {
  max-height: 40%;
  overflow-y: auto;
}

.exec-meta {
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  color: #999;
  .time {
    font-size: 12px;
    color: #909399;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;

    background: transparent;
  }
}

/* 右侧详情 */
.exec-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  overflow: hidden; // 防止 VueFlow 溢出
}

.exec-workflow {
  position: relative;
  flex: 1;
  min-height: 300px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
  margin-bottom: 12px;
}
.exec-overlay {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.exec-info-bar {
  top: 20px;
  left: 10px;

  .status {
    font-weight: 600;

    &.success {
      color: #67c23a;
    }
    &.running {
      color: #409eff;
    }
    &.error {
      color: #f56c6c;
    }
  }

  .time {
    font-size: 12px;
    color: #909399;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;

    background: transparent;
  }

  .duration {
    color: #333;
  }
}
.exec-toolbar {
  top: 10px;
  right: 10px;
  .deleteBtn {
    cursor: pointer;
    width: 22px;
    height: 22px;
    img {
      width: 100%;
      height: 100%;
    }
  }
}

.icon-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 6px;
  border-radius: 4px;

  &:hover {
    background: #f5f7fa;
  }

  &.danger {
    color: #f56c6c;
  }
}

.detail-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 14px;
  font-size: 13px;
  color: #666;
}

/* 时间线 */
.event-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.event-item {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  gap: 10px;
  font-size: 13px;
  padding: 6px 8px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #ebeef5;

  &.node_start {
    border-left: 4px solid #409eff;
  }
  &.node_success {
    border-left: 4px solid #67c23a;
  }
  &.node_error {
    border-left: 4px solid #f56c6c;
  }
}

.exec-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}
/* =============================
   Execution Panel - n8n Style
   ============================= */

.exec-info.n8n-style {
  display: flex;
  flex-direction: column;
  height: 40%;
  min-height: 42px;
  border-top: 1px solid #e4e7ed;
  background: #fff;
  transition: height 0.25s ease;
}

/* 折叠状态 */
.exec-info.collapsed {
  height: 42px;
}

/* =============================
   折叠顶部栏
   ============================= */

.exec-collapse-bar {
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  cursor: pointer;
  border-bottom: 1px solid #ebeef5;
  background: #f5f7fa;
  user-select: none;

  &:hover {
    background: #eaeef2;
  }

  .collapse-left {
    display: flex;
    align-items: center;
    gap: 12px;

    .title {
      font-weight: 600;
      font-size: 13px;
    }

    .summary {
      font-size: 12px;
      color: #909399;
    }
  }

  .collapse-right {
    .arrow {
      font-size: 12px;
      color: #909399;
    }
  }
}

/* =============================
   主体区域
   ============================= */

.exec-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* =============================
   左侧节点列表
   ============================= */

.node-list {
  width: 240px;
  border-right: 1px solid #e4e7ed;
  overflow-y: auto;
  background: #fafafa;
}

.node-item {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.2s ease;

  &:hover {
    background: #f0f3f6;
  }

  &.active {
    background: #ecf5ff;
  }

  .node-name {
    font-weight: 500;
    font-size: 13px;
  }

  .node-status {
    font-size: 12px;
    margin-top: 4px;

    &.node_success {
      color: #67c23a;
    }

    &.node_error {
      color: #f56c6c;
    }

    &.node_start {
      color: #409eff;
    }

    &.running {
      color: #e6a23c;
    }
  }
}

/* =============================
   右侧详情区域
   ============================= */

.node-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

/* 顶部节点信息栏 */
.node-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;

  .left {
    display: flex;
    align-items: center;
    gap: 12px;

    .title {
      font-weight: 600;
      font-size: 14px;
    }

    .status {
      font-size: 13px;

      &.node_success {
        color: #67c23a;
      }

      &.node_error {
        color: #f56c6c;
      }

      &.node_start {
        color: #409eff;
      }

      &.running {
        color: #e6a23c;
      }
    }

    .duration {
      font-size: 12px;
      color: #666;
    }
  }

  /* Input / Output 切换按钮 */
  .right {
    display: flex;
    gap: 6px;

    button {
      border: 1px solid #dcdfe6;
      background: #fff;
      padding: 4px 10px;
      font-size: 12px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #f5f7fa;
      }

      &.active {
        background: #409eff;
        border-color: #409eff;
        color: #fff;
      }
    }
  }
}

/* =============================
   JSON 数据展示区
   ============================= */

.node-json {
  flex: 1;
  overflow: auto;
  padding: 14px;
  background: #1e1e1e;
  color: #d4d4d4;

  pre {
    margin: 0;
    font-family:
      ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
      "Courier New", monospace;
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

/* =============================
   空状态
   ============================= */

.node-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 13px;
}
</style>
