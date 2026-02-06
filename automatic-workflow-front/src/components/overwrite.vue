<template>
  <div class="workflow-page">
    <div class="blank">
      <!-- 顶部操作栏 -->
      <div class="header-bar">
        <div class="header-left">
          <h2 class="page-title">Overwrite</h2>

          <el-input
            v-model="keyword"
            size="small"
            placeholder="搜索 workflow"
            clearable
            class="search-input"
          />

          <el-select v-model="sortBy" size="small" class="sort-select">
            <el-option label="最近更新" value="updatedAt" />
            <el-option label="最近创建" value="createdAt" />
            <el-option label="名称" value="name" />
          </el-select>
        </div>

        <el-button type="primary" size="small" @click="showCreateDialog = true">
          + 创建工作流
        </el-button>
      </div>

      <!-- workflow 列表 -->
      <div class="workflow-list">
        <div
          v-for="item in filteredWorkflows"
          :key="item.id"
          class="workflow-item"
          @click="goExistingWorkflow(item.name, item.id)"
        >
          <!-- 左侧信息 -->
          <div class="workflow-left">
            <div class="workflow-main">
              <span class="workflow-name">{{ item.name }}</span>
              <span class="workflow-desc">
                {{ item.description || "暂无描述" }}
              </span>
            </div>

            <div class="workflow-meta">
              <span>创建于：{{ formatTime(item.createdAt) }}</span>
              <span>更新于：{{ formatTime(item.updatedAt) }}</span>
            </div>
          </div>
          <!-- 右侧操作（三个点） -->
          <el-dropdown
            trigger="click"
            @command="handleDropdownCommand(item, $event)"
          >
            <template #default>
              <span class="more-btn" @click.stop>⋯</span>
            </template>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">修改</el-dropdown-item>
                <el-dropdown-item command="delete" divided class="danger"
                  >删除</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <!-- 修改 workflow 弹窗 -->
      <el-dialog
        title="修改工作流"
        v-model="showModifyDialog"
        width="450px"
        :close-on-click-modal="false"
      >
        <el-form
          :model="modifyForm"
          label-width="80px"
          :rules="modifyFormRules"
          ref="modifyFormRef"
        >
          <el-form-item label="名称" prop="name">
            <el-input v-model="modifyForm.name" />
          </el-form-item>
          <el-form-item label="描述">
            <el-input
              type="textarea"
              v-model="modifyForm.description"
              :rows="3"
            />
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="cancelModify">取消</el-button>
          <el-button type="primary" @click="submitModify">保存</el-button>
        </template>
      </el-dialog>

      <!-- 创建工作流弹窗 -->
      <el-dialog
        title="创建新工作流"
        v-model="showCreateDialog"
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
          <el-button type="primary" @click="createWorkflow">创建</el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from "vue";
import service from "../service/index.js";

const emit = defineEmits(["goEditor"]);

const createFormRef = ref(null);
const modifyFormRef = ref(null);
const workflows = ref([]);
const showCreateDialog = ref(false);
const keyword = ref("");
const sortBy = ref("updatedAt");

const form = ref({
  name: "My workflow",
  description: "",
});
const createFormRules = {
  name: [
    {
      type: "string",
      required: true,
      message: "请输入工作流名称",
      trigger: "blur",
    },
  ],
};
const modifyFormRules = {
  name: [
    {
      type: "string",
      required: true,
      message: "请输入工作流名称",
      trigger: "blur",
    },
  ],
};
const showModifyDialog = ref(false);
const modifyForm = ref({
  id: null,
  name: "",
  description: "",
});

onMounted(async () => {
  const res = await service.get("/api/workflow/list", {
    params: { userId: 1 },
  });
  workflows.value = res.data || [];
  console.log(workflows.value);
});

function handleDropdownCommand(item, command) {
  if (command === "rename") {
    modifyWorkflow(item);
  } else if (command === "delete") {
    deleteWorkflow(item);
  }
}

/* ===== 列表过滤 + 排序 ===== */
const filteredWorkflows = computed(() => {
  let list = workflows.value.filter((w) =>
    w.name.toLowerCase().includes(keyword.value.toLowerCase()),
  );

  return list.sort((a, b) => {
    if (sortBy.value === "name") {
      return a.name.localeCompare(b.name);
    }
    return new Date(b[sortBy.value]) - new Date(a[sortBy.value]);
  });
});

function goExistingWorkflow(name, id) {
  emit("goEditor", { name, id });
}
//取消创建工作流
function cancelCreate() {
  showCreateDialog.value = false;
  // 重置表单校验
  createFormRef.value.clearValidate();
}
async function createWorkflow() {
  if (!createFormRef.value) return;

  createFormRef.value.validate(async (valid) => {
    if (!valid) return;
    const res = await service.post("/api/workflow/create", {
      userId: 1,
      name: form.value.name,
      description: form.value.description,
    });

    workflows.value.unshift(res.data);
    showCreateDialog.value = false;

    emit("goEditor", { name: res.data.name, id: res.data.id });
    // 重置表单校验
    createFormRef.value.clearValidate();
  });
}
function modifyWorkflow(item) {
  modifyForm.value.id = item.id;
  modifyForm.value.name = item.name;
  modifyForm.value.description = item.description || "";
  showModifyDialog.value = true;
}
// 取消更改工作流
function cancelModify() {
  showModifyDialog.value = false;
  // 重置表单校验
  modifyFormRef.value.clearValidate();
}
// 保存修改
async function submitModify() {
  if (!modifyFormRef.value) {
    return;
  }
  try {
    modifyFormRef.value.validate(async (valid) => {
      if (!valid) {
        ElMessage.waring("表单不合法");
        return;
      }
      const res = await service.post("/api/workflow/modify", {
        id: modifyForm.value.id,
        workflowName: modifyForm.value.name,
        description: modifyForm.value.description,
      });

      // 更新前端列表
      const workflow = workflows.value.find(
        (w) => w.id === modifyForm.value.id,
      );
      if (workflow) {
        workflow.name = modifyForm.value.name;
        workflow.description = modifyForm.value.description;
      }

      ElMessage.success("修改成功");
      showModifyDialog.value = false;
      // 重置表单
      modifyFormRef.value.resetField();
    });
  } catch (err) {
    console.error(err);
    ElMessage.error("修改失败，请稍后重试");
  }
}
function deleteWorkflow(item) {
  ElMessageBox.confirm(`确定删除工作流「${item.name}」？`, "危险操作", {
    type: "warning",
  })
    .then(async () => {
      const res = await service.post("/api/workflow/delete", null, {
        params: {
          workflowId: item.id,
        },
      });
      if (res.status == 200) {
        workflows.value = workflows.value.filter((w) => w.id !== item.id);
        ElMessage.success("已删除");
      } else {
        ElMessage.success("删除失败");
      }
    })
    .catch(() => {});
}
function formatTime(ts) {
  if (!ts) return "-";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}
</script>

<style scoped lang="scss">
.workflow-page {
  height: 100%;
  display: flex;
  justify-content: center;
  padding: 16px 24px;
  background: #f7f8fa;
}
.blank {
  width: 80%;
}
/* 顶部栏 */
.header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.search-input {
  width: 200px;
}

.sort-select {
  width: 120px;
}

/* workflow 列表 */
.workflow-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.workflow-item {
  background: #fff;
  padding: 14px 18px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #ebeef5;

  &:hover {
    background: #f5f7fa;
  }
}

.workflow-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workflow-name {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
}

.workflow-desc {
  font-size: 13px;
  color: #909399;
}

.workflow-meta {
  margin-top: 6px;
  font-size: 12px;
  color: #999;
  display: flex;
  gap: 16px;
}
.workflow-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  padding: 14px 18px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #ebeef5;

  &:hover {
    background: #f5f7fa;
  }
}

.workflow-left {
  flex: 1;
  overflow: hidden;
}

.more-btn {
  font-size: 20px;
  padding: 0 6px;
  cursor: pointer;
  user-select: none;
}

.el-dropdown-menu .danger {
  color: #f56c6c;
}
</style>
