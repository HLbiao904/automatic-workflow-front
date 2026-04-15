<template>
  <div>
    <!-- 新建模板 Dialog -->
    <el-dialog
      v-model="visible"
      :title="isCreateTemplate ? '保存模版' : '新建模版'"
      width="500px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="90px">
        <el-form-item label="模板名称" prop="templateName">
          <el-input v-model="form.templateName" />
        </el-form-item>

        <el-form-item label="模板描述" prop="description">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>

        <el-form-item label="模板分类" prop="categoryId">
          <div style="display: flex; gap: 10px; width: 100%">
            <el-select
              v-model="form.categoryId"
              style="flex: 1"
              placeholder="请选择分类"
            >
              <el-option
                v-for="c in categories"
                :key="c.id"
                :label="c.categoryName"
                :value="c.id"
              />
            </el-select>
            <el-button @click="categoryDialog = true"> 添加分类 </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="visible = false"> 取消 </el-button>
        <el-button type="primary" @click="submit">
          {{ isCreateTemplate ? "保存" : "创建" }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增分类 Dialog -->
    <el-dialog v-model="categoryDialog" title="新增分类" width="400px">
      <el-form
        :model="categoryForm"
        :rules="categoryRules"
        ref="categoryFormRef"
        label-width="80px"
      >
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="categoryForm.name" />
        </el-form-item>

        <el-form-item label="分类描述" prop="description">
          <el-input v-model="categoryForm.description" />
        </el-form-item>

        <el-form-item label="优先级" prop="sort">
          <el-input-number
            v-model="categoryForm.sort"
            :min="0"
            :max="10"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="categoryDialog = false"> 取消 </el-button>
        <el-button type="primary" @click="submitCategory"> 确定 </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import service from "../../service/index.js";

// 新增分类弹窗
const categoryDialog = ref(false);
const categoryFormRef = ref(null);
const categoryForm = ref({
  name: "",
  description: "",
  sort: 1,
});

// 新建模板
const props = defineProps({
  modelValue: Boolean,
  categories: Array,
  templateForm: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits(["update:modelValue", "submit", "update-categories"]);

const visible = ref(false);
const formRef = ref(null);
const isCreateTemplate = ref(false);
const form = ref({
  templateName: "",
  description: "",
  categoryId: null,
});

// 模板表单校验
const rules = {
  templateName: [
    { required: true, message: "请输入模板名称", trigger: "blur" },
  ],
  categoryId: [
    { required: true, message: "请选择模板分类", trigger: "change" },
  ],
};

// 分类表单校验
const categoryRules = {
  name: [{ required: true, message: "请输入分类名称", trigger: "blur" }],
  sort: [
    {
      type: "number",
      required: true,
      message: "请输入优先级",
      trigger: "change",
    },
    {
      type: "number",
      min: 0,
      max: 10,
      message: "优先级范围 0-10",
      trigger: "change",
    },
  ],
};
watch(
  () => props.templateForm,
  (newVal) => {
    isCreateTemplate.value = true;
    form.value.templateName = newVal.name;
    form.value.description = newVal.description;
    form.value.categoryId = newVal.categoryId;
  },
  { deep: true },
);
// watch 模板弹窗显示
watch(
  () => props.modelValue,
  (v) => (visible.value = v),
);
watch(visible, (v) => {
  emit("update:modelValue", v);
  if (!v && formRef.value) {
    // 关闭 Dialog 时重置表单和校验
    formRef.value.resetFields();
    // 默认选择优先级最高的分类
    if (props.categories && props.categories.length > 0) {
      const sorted = [...props.categories].sort((a, b) => b.sort - a.sort);
      form.value.categoryId = sorted[0].id;
    }
  }
});

// 默认选择优先级最高的分类
watch(
  () => props.categories,
  (val) => {
    if (val && val.length > 0) {
      const sorted = [...val].sort((a, b) => b.sort - a.sort);
      form.value.categoryId = sorted[0].id;
    } else {
      form.value.categoryId = null;
    }
  },
  { immediate: true },
);

// 提交模板
function submit() {
  formRef.value.validate((valid) => {
    if (!valid) return;
    emit("submit", { ...form.value });
    visible.value = false;
    isCreateTemplate.value = false;
  });
}

// 关闭新增分类 Dialog 时清空表单和校验
watch(categoryDialog, (v) => {
  if (!v && categoryFormRef.value) {
    categoryFormRef.value.resetFields();
    categoryForm.value = { name: "", description: "", sort: 1 };
  }
});

// 提交新增分类
function submitCategory() {
  categoryFormRef.value.validate(async (valid) => {
    if (!valid) return;

    try {
      const res = await service.post(
        "/workflowTemplate/createTemplateCategory",
        {
          categoryName: categoryForm.value.name,
          description: categoryForm.value.description,
          sort: categoryForm.value.sort,
        },
      );
      if (res.status === 200) {
        const categoryId = res.data.id;
        // 刷新分类列表
        const listRes = await service.get(
          "/workflowTemplate/templateCategoryList",
        );
        if (listRes.status === 200) {
          emit("update-categories", listRes.data);
          form.value.categoryId = categoryId; // 自动选择新创建的分类
        }
        ElMessage.success("模版分类添加成功");
        categoryDialog.value = false;
      }
    } catch (err) {
      ElMessage.error("添加分类失败");
    }
  });
}
</script>
