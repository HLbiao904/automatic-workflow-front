<script setup>
import { ref, computed, onMounted, markRaw, onUpdated, watch } from "vue";
import { VueFlow } from "@vue-flow/core";
import { Background } from "@vue-flow/background";
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
      status: null, // 🔥 execution 回放不带运行态
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
      execNodes.value = normalizeNodes(JSON.parse(res.data.nodesJson) || []);
      execEdges.value = JSON.parse(res.data.edgesJson) || [];
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
          <Background />
        </VueFlow>
      </div>

      <!-- 下半区信息 -->
      <div class="exec-info">
        <h3>Execution {{ activeExecution.id }}</h3>

        <div class="detail-meta">
          <span>状态：{{ activeExecution.status }}</span>
          <span>开始：{{ formatTime(activeExecution.startTime) }}</span>
          <span v-if="activeExecution.endTime">
            结束：{{ formatTime(activeExecution.endTime) }}
          </span>
        </div>

        <div class="event-timeline">
          <div
            v-for="(ev, i) in activeExecution.events"
            :key="i"
            class="event-item"
            :class="ev.event.toLowerCase()"
          >
            <span class="event-time">{{ formatTime(ev.time) }}</span>
            <span class="event-node">{{ ev.id }}</span>
            <span class="event-type">{{ ev.event }}</span>
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
  flex: 1; // 吃掉剩余高度
  min-height: 300px; // 防止太小
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #fafafa;
  margin-bottom: 12px;
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
</style>
