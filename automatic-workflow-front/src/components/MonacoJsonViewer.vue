<script setup>
import { onMounted, ref, watch } from "vue";
import loader from "@monaco-editor/loader";

const props = defineProps({
  modelValue: { type: String, default: "{}" },
  language: { type: String, default: "json" },
  readOnly: { type: Boolean, default: true },
  height: { type: String, default: "400px" },
  theme: { type: String, default: "vs" }, // vs = 白色, vs-dark = 黑色
});

const editorContainer = ref(null);
let editorInstance = null;

onMounted(async () => {
  const monaco = await loader.init(); // ✅ 注意这里是 loader.init()
  editorInstance = monaco.editor.create(editorContainer.value, {
    value: props.modelValue,
    language: props.language,
    readOnly: props.readOnly,
    theme: props.theme,
    minimap: { enabled: false },
    automaticLayout: true,
    wordWrap: "on",
  });
});

watch(
  () => props.modelValue,
  (val) => {
    if (editorInstance && val !== editorInstance.getValue()) {
      editorInstance.setValue(val);
    }
  },
);
</script>

<template>
  <div ref="editorContainer" :style="{ height: height, width: '100%' }"></div>
</template>
