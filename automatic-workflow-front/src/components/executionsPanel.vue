<script setup>
import { ref, computed, onMounted } from "vue";
import service from "../service/index.js";

const executions = ref([]);
const props = defineProps({
  workflowId: {
    type: Number,
    required: true,
  },
});

const activeId = ref(null);

onMounted(() => {
  service
    .get("api/workflowExecute/list", {
      params: {
        workflowId: props.workflowId,
      },
    })
    .then((res) => {
      console.log("res", res.data);
      executions.value = res.data;
    });
});
const activeExecution = computed(() =>
  executions.value.find((e) => e.id === activeId.value),
);

function selectExecution(exec) {
  activeId.value = exec.id;
}

function formatTime(ts) {
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
    <!-- 左：执行列表 -->
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

    <!-- 右：执行详情 -->
    <div class="exec-detail" v-if="activeExecution">
      <h3>Execution {{ activeExecution.id }}</h3>

      <div class="detail-meta">
        <span>状态：{{ activeExecution.status }}</span>
        <span> 开始：{{ formatTime(activeExecution.startTime) }} </span>
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
          <span class="event-time">
            {{ formatTime(ev.time) }}
          </span>
          <span class="event-node">
            {{ ev.id }}
          </span>
          <span class="event-type">
            {{ ev.event }}
          </span>
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

/* 左侧列表 */
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

.exec-meta {
  font-size: 12px;
  display: flex;
  justify-content: space-between;
  color: #999;
}

/* 右侧详情 */
.exec-detail {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
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
