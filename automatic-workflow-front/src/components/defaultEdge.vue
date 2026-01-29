<script setup>
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@vue-flow/core";
import { computed } from "vue";

const props = defineProps([
  "id",
  "sourceX",
  "sourceY",
  "targetX",
  "targetY",
  "sourcePosition",
  "targetPosition",
  "data",
  "style",
  "markerEnd",
  "markerStart",
  "selected",
]);

const pathData = computed(() => {
  return getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
  });
});

const edgePath = computed(() => pathData.value[0]);
const labelX = computed(() => pathData.value[1]);
const labelY = computed(() => pathData.value[2]);
</script>

<template>
  <g
    ><BaseEdge
      :path="edgePath"
      :marker-end="markerEnd"
      :style="{
        stroke: selected ? '#409EFF' : '#909399',
        strokeWidth: selected ? 2.5 : 2,
      }"
    />

    <EdgeLabelRenderer v-if="data?.label">
      <div
        class="edge-label"
        :style="{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        }"
      >
        {{ data?.label }}
      </div>
    </EdgeLabelRenderer></g
  >
</template>

<style scoped>
.edge-label.selected {
  border-color: #409eff;
  color: #409eff;
  background: #ecf5ff;
}

.edge-label {
  position: absolute;
  background: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
  color: #606266;
  white-space: nowrap;

  pointer-events: all;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}
</style>
