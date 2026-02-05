<script setup>
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@vue-flow/core";
import { ref, computed, onMounted } from "vue";
import { useVueFlow } from "@vue-flow/core";
const { removeEdges } = useVueFlow();

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

function deleteEdge() {
  removeEdges(props.id);
}
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
    <EdgeLabelRenderer>
      <div
        class="edge-label-wrapper"
        :style="{
          left: `${labelX}px`,
          top: `${labelY}px`,
          transform: 'translate(-50%, -50%)',
        }"
      >
        <div
          class="edge-button"
          v-show="data?.hovered"
          @mouseenter.stop
          @mouseleave.stop
        >
          <div class="buttonItem">
            <img
              src="../assets/delete.svg"
              alt="Delete Edge"
              @click.stop="deleteEdge"
            />
          </div>
        </div>
      </div>
    </EdgeLabelRenderer>
  </g>
</template>

<style scoped lang="scss">
.edge-button {
  .buttonItem {
    width: 24px;
    height: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: 4px;
    background-color: #cccccc;
  }
  img {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
}

.edge-label-wrapper {
  position: absolute;
  pointer-events: all;
}

.edge-delete {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: #f56c6c;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  line-height: 18px;
  text-align: center;
  padding: 0;
}

.edge-delete:hover {
  background: #f78989;
}
</style>
