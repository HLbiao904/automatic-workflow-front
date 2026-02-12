<script setup>
import { ref, computed, onMounted, onUpdated } from "vue";
import { Handle, Position, useVueFlow } from "@vue-flow/core";
const emit = defineEmits(["add-node"]);
const { removeNodes, edges } = useVueFlow();
function addNode() {
  emit("add-node");
}
const isConnected = computed(() =>
  edges.value.some((e) => e.source === props.id && e.sourceHandle === "out"),
);
const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  position: {
    type: Object,
    required: true,
  },
  showToolBar: {
    type: Boolean,
    default: true,
  },
});
</script>

<template>
  <div class="start-node">
    <div class="start-circle">
      <img src="../assets/mousepointer.svg" />
    </div>

    <!-- 只有一个输出点（n8n 就是这样） -->
    <Handle
      id="out"
      type="source"
      :position="Position.Right"
      class="start-handle"
    />
    <!-- n8n 风格加号 -->
    <div v-if="!isConnected" class="start-wrapper" @click.stop="addNode">
      <span class="solid-line"></span>
      <span class="plus"><img src="../assets/add.svg" alt="" /></span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.start-node {
  position: relative;
}

/* 主体 */
.start-circle {
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 30px 5px 5px 30px;
  border: 2px solid #dcdcdc;
  background: #fff;
  font-size: 16px;
  text-align: center;
  line-height: 90px;
  user-select: none;
  img {
    width: 45px;
    height: 45px;
  }
}

/* 连接点 */
.start-handle {
  width: 15px;
  height: 15px;
  background: #f9f9f9;
  border: 1px solid #999;
}
.start-wrapper {
  position: absolute;
  right: -75px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  cursor: pointer;
}
.solid-line {
  width: 42px;
  height: 2px;
  /*   background: repeating-linear-gradient(
    to right,
    #c0c4cc,
    #c0c4cc 4px,
    transparent 4px,
    transparent 8px
  ); */
  background: #c0c4cc;
}
.plus {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  border: 1px solid #c0c4cc;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  img {
    width: 12px;
    height: 12px;
  }
}
</style>
