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
    language: props.language, // json、javascript、yaml 都可以
    readOnly: props.readOnly,
    theme: props.theme, // vs=白色, vs-dark=黑色
    automaticLayout: true, // 自动根据容器大小调整
    wordWrap: "on", // 自动换行
    minimap: { enabled: false }, // 关闭右侧缩略图
    lineNumbers: "on", // 显示行号
    folding: true, // 开启折叠
    scrollBeyondLastLine: false,
    renderWhitespace: "none", // 不显示空格符
    fontSize: 13,
    lineHeight: 20,
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      alwaysConsumeMouseWheel: false,
    },
    contextmenu: true, // 右键菜单
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
