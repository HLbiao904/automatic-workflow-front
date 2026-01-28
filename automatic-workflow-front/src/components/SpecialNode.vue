<script setup>
import { computed, onMounted } from "vue";
import { Position, Handle } from "@vue-flow/core";

const props = defineProps({
  id: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },
  position: {
    type: Object,
    required: true,
  },
});

const x = computed(() => `${Math.round(props.position.x)}px`);
const y = computed(() => `${Math.round(props.position.y)}px`);
const data = {
  label: "Special Node",
};
onMounted(() => {
  console.log("SpecialNode mounted with data:", props.data);
  console.log("Node ID:", props.id);
  console.log("Node Position:", props.position);
});
</script>

<template>
  <div class="vue-flow__node-default">
    <div>{{ data.label }}</div>

    <div>{{ x }} {{ y }}</div>

    <Handle type="source" :position="Position.Top" />
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>
