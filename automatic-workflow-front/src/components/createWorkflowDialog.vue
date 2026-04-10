<template>
  <el-dialog
    title="创建新工作流"
    v-model="visible"
    width="450px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="createFormRef"
      :model="form"
      :rules="createFormRules"
      label-width="80px"
    >
      <el-form-item label="名称" prop="name">
        <el-input v-model="form.name" />
      </el-form-item>

      <el-form-item label="描述">
        <el-input type="textarea" v-model="form.description" :rows="3" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="cancelCreate">取消</el-button>
      <el-button type="primary" @click="createWorkflow"> 创建 </el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { ElMessage } from "element-plus";
import service from "../service/index.js";

// 接收父组件 v-model
const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
});

// 定义事件
const emit = defineEmits(["update:modelValue", "goEditor"]);

// 计算属性：实现 v-model 双向绑定
const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit("update:modelValue", val),
});

const createFormRef = ref(null);

const form = ref({
  name: "",
  description: "",
});

// 校验规则
const createFormRules = {
  name: [
    {
      required: true,
      message: "请输入工作流名称",
      trigger: "blur",
    },
  ],
};

// 创建工作流
async function createWorkflow() {
  if (!createFormRef.value) return;

  createFormRef.value.validate(async (valid) => {
    if (!valid) return;

    try {
      const res = await service.post("/api/workflow/create", {
        userId: localStorage.getItem("userId"),
        name: form.value.name,
        description: form.value.description,
      });

      ElMessage.success("创建成功");

      // 关闭弹窗（通知父组件）
      visible.value = false;

      // 通知父组件跳转编辑器
      emit("goEditor", {
        name: res.data.name,
        id: res.data.id,
      });

      resetForm();
    } catch (err) {
      ElMessage.error("创建失败");
    }
  });
}

// 取消
function cancelCreate() {
  visible.value = false;
  resetForm();
}

// 重置表单
function resetForm() {
  form.value = {
    name: "",
    description: "",
  };
  createFormRef.value?.clearValidate();
}

// 监听关闭时自动清理
watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      resetForm();
    }
  },
);
</script>

<style scoped></style>
