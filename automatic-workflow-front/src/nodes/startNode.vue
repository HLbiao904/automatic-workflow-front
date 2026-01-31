<script setup>
import { Handle, Position } from "@vue-flow/core";
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
</style>
