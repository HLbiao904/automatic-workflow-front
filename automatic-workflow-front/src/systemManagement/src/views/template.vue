<template>
  <div class="page-wrapper">
    <!-- 顶部 -->
    <div class="page-header">
      <div class="title">模板管理</div>
    </div>
    <div class="page">
      <!-- 左侧分类 -->
      <div class="left">
        <div class="header">
          <span>分类管理</span>
          <el-button size="small" type="primary" @click="openCategoryDialog()">
            新增
          </el-button>
        </div>

        <el-menu
          :default-active="String(activeCategoryId)"
          @select="handleCategorySelect"
        >
          <el-menu-item index="0">全部模板</el-menu-item>

          <el-menu-item
            v-for="item in categoryList"
            :key="item.id"
            :index="String(item.id)"
          >
            <span>{{ item.categoryName }}</span>

            <span class="actions">
              <el-icon @click.stop="openCategoryDialog(item)">
                <Edit />
              </el-icon>
              <el-icon @click.stop="handleDeleteCategory(item.id)">
                <Delete />
              </el-icon>
            </span>
          </el-menu-item>
        </el-menu>
      </div>

      <!-- 右侧模板 -->
      <div class="right">
        <!-- 搜索 -->
        <div class="toolbar">
          <el-input
            v-model="keyword"
            placeholder="搜索模板..."
            clearable
            @input="loadTemplateList"
          />
          <el-button type="primary" @click="openTemplateDialog()">
            新增模板
          </el-button>
        </div>

        <!-- 表格 -->
        <el-table :data="templateList" border>
          <el-table-column prop="templateName" label="名称" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="useCount" label="使用次数" width="100" />

          <el-table-column label="状态" width="120">
            <template #default="{ row }">
              <el-switch
                v-model="row.status"
                :active-value="1"
                :inactive-value="0"
                @change="(val) => handleStatusChange(row, val)"
              />
            </template>
          </el-table-column>

          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" @click="openTemplateDialog(row)">
                  编辑
                </el-button>

                <el-button
                  type="danger"
                  size="small"
                  @click="handleDeleteTemplate(row.id)"
                >
                  删除
                </el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分类弹窗 -->
      <el-dialog v-model="categoryDialogVisible" title="分类">
        <el-form :model="categoryForm">
          <el-form-item label="名称">
            <el-input v-model="categoryForm.categoryName" />
          </el-form-item>

          <el-form-item label="描述">
            <el-input v-model="categoryForm.description" />
          </el-form-item>

          <el-form-item label="排序">
            <el-input-number v-model="categoryForm.sort" />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="categoryDialogVisible = false"> 取消 </el-button>
          <el-button type="primary" @click="submitCategory"> 确定 </el-button>
        </template>
      </el-dialog>
      <!-- 模板弹窗 -->
      <el-dialog v-model="templateDialogVisible" title="模板">
        <el-form :model="templateForm">
          <el-form-item label="名称">
            <el-input v-model="templateForm.templateName" />
          </el-form-item>

          <el-form-item label="描述">
            <el-input v-model="templateForm.description" />
          </el-form-item>

          <el-form-item label="分类">
            <el-select v-model="templateForm.categoryId" placeholder="选择分类">
              <el-option
                v-for="item in categoryList"
                :key="item.id"
                :label="item.categoryName"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="templateDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitTemplate">确定</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import {
  getCategoryList,
  createCategory,
  updateCategory,
  deleteCategory,
  getTemplateList,
  deleteTemplate,
  updateTemplateStatus,
  createTemplate,
  updateTemplate,
} from "@/systemManagement/src/api/template";

import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Delete } from "@element-plus/icons-vue";

/** 分类 */
const categoryList = ref([]);
const activeCategoryId = ref(0);

/** 模板 */
const templateList = ref([]);
const keyword = ref("");
/** 模板弹窗 */
const templateDialogVisible = ref(false);

const templateForm = ref({
  id: null,
  templateName: "",
  description: "",
  categoryId: null,
});
/** 分类弹窗 */
const categoryDialogVisible = ref(false);
const categoryForm = ref({
  id: null,
  categoryName: "",
  description: "",
  sort: 0,
});

/** 初始化 */
onMounted(() => {
  loadCategoryList();
  loadTemplateList();
});

/** 分类列表 */
async function loadCategoryList() {
  const res = await getCategoryList();
  categoryList.value = res.data || res;
}

/** 模板列表 */
async function loadTemplateList() {
  const res = await getTemplateList({
    keyword: keyword.value,
    categoryId: activeCategoryId.value,
  });
  templateList.value = res.data || res;
}

/** 打开模板弹窗 */
function openTemplateDialog(row) {
  if (row) {
    templateForm.value = { ...row };
  } else {
    templateForm.value = {
      id: null,
      templateName: "",
      description: "",
      categoryId: null,
    };
  }
  templateDialogVisible.value = true;
}

/** 提交模板 */
async function submitTemplate() {
  if (templateForm.value.id) {
    await updateTemplate(templateForm.value);
    ElMessage.success("修改成功");
  } else {
    await createTemplate(templateForm.value);
    ElMessage.success("新增成功");
  }

  templateDialogVisible.value = false;
  loadTemplateList();
}
/** 选择分类 */
function handleCategorySelect(id) {
  activeCategoryId.value = Number(id);
  loadTemplateList();
}

/** 打开分类弹窗 */
function openCategoryDialog(row) {
  if (row) {
    categoryForm.value = { ...row };
  } else {
    categoryForm.value = {
      id: null,
      categoryName: "",
      description: "",
      sort: 0,
    };
  }
  categoryDialogVisible.value = true;
}

/** 提交分类 */
async function submitCategory() {
  if (categoryForm.value.id) {
    await updateCategory(categoryForm.value);
    ElMessage.success("修改成功");
  } else {
    await createCategory(categoryForm.value);
    ElMessage.success("新增成功");
  }

  categoryDialogVisible.value = false;
  loadCategoryList();
}

/** 删除分类 */
function handleDeleteCategory(id) {
  ElMessageBox.confirm("确认删除该分类？", "提示")
    .then(async () => {
      const res = await deleteCategory(id);
      if (res.code !== 200) {
        ElMessage.error(res.message);
        return;
      }
      ElMessage.success("删除成功");
      loadCategoryList();
    })
    .catch(() => {});
}

/** 删除模板 */
function handleDeleteTemplate(id) {
  ElMessageBox.confirm("确认删除该模板？", "提示")
    .then(async () => {
      await deleteTemplate(id);
      ElMessage.success("删除成功");
      loadTemplateList();
    })
    .catch(() => {});
}

/** 修改状态 */
async function handleStatusChange(row, val) {
  await updateTemplateStatus(row.id, val);
  ElMessage.success("状态已更新");
}
</script>

<style scoped>
.page-wrapper {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  padding: 10px 10px;
  border-bottom: 1px solid #ebeef5;
}

.page-header .title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.page {
  flex: 1;
  display: flex;
  overflow: hidden;
}
.page {
  display: flex;
  height: 100%;
  background: #f5f7fa;
}

/* 左侧 */
.left {
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #ebeef5;
  padding: 12px;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.04);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 14px;
}

/* 菜单优化 */
:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item) {
  border-radius: 6px;
  margin-bottom: 4px;
}

:deep(.el-menu-item.is-active) {
  background: #ecf5ff;
  color: #409eff;
}

/* 右侧 */
.right {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

/* 表格容器卡片化 */
:deep(.el-table) {
  border-radius: 10px;
  overflow: hidden;
}

:deep(.el-table__header) {
  background: #fafafa;
}

/* 卡片感 */
.right {
  background: #ffffff;
  margin: 12px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}
/* 操作列样式 */
.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
/* 分类操作按钮 */
.actions {
  float: right;
  display: flex;
  gap: 6px;
  opacity: 1; /* 一直显示 */
}

/* 图标点击效果 */
.actions .el-icon {
  cursor: pointer;
  color: #999;
}

.actions .el-icon:hover {
  color: #409eff;
}
</style>
