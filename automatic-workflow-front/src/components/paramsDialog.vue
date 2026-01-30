<template>
  <el-dialog
    title="节点参数"
    :model-value="showParamsDialog"
    @update:model-value="emit('update:showParamsDialog', $event)"
    width="500px"
    :close-on-click-modal="false"
  >
    <el-form
      :model="paramsDialogFormData"
      ref="paramsFormRef"
      :rules="paramsDialogRules"
      label-width="100px"
      :inline="false"
    >
      <el-form-item label="nodeId">
        <el-input
          v-model="paramsDialogFormData.nodeId"
          :disabled="true"
        ></el-input>
      </el-form-item>
      <el-form-item label="Description">
        <el-input
          v-model="paramsDialogFormData.description"
          :disabled="true"
        ></el-input>
      </el-form-item>
      <el-form-item label="Type">
        <el-input
          v-model="paramsDialogFormData.type"
          :disabled="true"
        ></el-input>
      </el-form-item>
      <!-- <el-form-item label="Label">
          <el-input v-model="paramsDialogFormData.label"></el-input>
        </el-form-item> -->
      <el-form-item
        v-for="p in activeNode.data.params"
        :key="p.name"
        :label="p.name"
      >
        <el-input
          :id="`param-${p.name}`"
          v-model="p.value"
          :placeholder="p.desc"
        ></el-input>
      </el-form-item>

      <el-form-item>
        <el-button type="primary" @click="onSubmit">保存</el-button>
        <el-button @click="onCancel">取消</el-button>
      </el-form-item>
    </el-form>
  </el-dialog>
</template>

<script setup>
import { ref } from "vue";
defineProps({
  showParamsDialog: {
    type: Boolean,
    required: true,
  },
  paramsDialogFormData: {
    type: Object,
    required: true,
  },
  paramsDialogRules: {
    type: Object,
    required: true,
  },
  activeNode: {
    type: Object,
    required: true,
    default: null,
  },
});
const emit = defineEmits([
  "update:showParamsDialog",
  "update:showParamsDialog",
]);
function onSubmit() {
  emit("update:showParamsDialog", false);
}
function onCancel() {
  emit("update:showParamsDialog", false);
}
</script>

<style lang="scss" scoped></style>
