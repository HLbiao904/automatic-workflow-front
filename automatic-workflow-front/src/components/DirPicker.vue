<template>
  <div>
    <el-input v-model="dirName" readonly placeholder="请选择目录">
      <template #append>
        <el-button @click="selectDir"> 选择目录 </el-button>
      </template>
    </el-input>

    <input
      ref="dirInput"
      type="file"
      webkitdirectory
      directory
      style="display: none"
      @change="handleDir"
    />
  </div>
</template>

<script setup>
import { ref, watch } from "vue";

const props = defineProps({
  modelValue: String,
});

const emit = defineEmits(["update:modelValue"]);

const dirInput = ref();

const dirName = ref(props.modelValue || "");

watch(
  () => props.modelValue,
  (v) => (dirName.value = v),
);

function selectDir() {
  dirInput.value.click();
}

function handleDir(e) {
  const files = e.target.files;

  if (files.length > 0) {
    const path = files[0].webkitRelativePath;
    const folder = path.split("/")[0];

    dirName.value = folder + "/";

    emit("update:modelValue", folder + "/");
  }
}
</script>
