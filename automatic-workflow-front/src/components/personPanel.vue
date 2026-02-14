<template>
  <div class="workflow-page">
    <div
      class="delete-batch"
      v-if="selectedExecutionsIds.length && currentPan == 'executions'"
    >
      <el-button type="danger" @click="deleteBatch">批量删除</el-button>
    </div>
    <div class="blank">
      <!-- 顶部标题栏 -->
      <div class="header-bar">
        <h2 class="page-title">Personal</h2>

        <el-button type="primary" size="small" @click="showCreateDialog = true">
          + 创建工作流
        </el-button>
      </div>

      <!-- Tabs 区域 -->
      <el-tabs
        v-model="activeTab"
        class="workflow-tabs"
        @tab-click="handleTabClick"
      >
        <!-- ============ Workflows ============ -->
        <el-tab-pane label="Workflows" name="workflows">
          <!-- 搜索 + 排序（只在 workflows 中） -->
          <div class="toolbar">
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

          <!-- workflow 列表 -->
          <div class="workflow-list">
            <div
              v-for="item in filteredWorkflows"
              :key="item.id"
              class="workflow-item"
              @click="goExistingWorkflow(item.name, item.id)"
            >
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

              <!-- 三个点 -->
              <el-dropdown
                trigger="click"
                @command="handleDropdownCommand(item, $event)"
              >
                <template #default>
                  <span class="more-btn" @click.stop>⋯</span>
                </template>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="rename"> 修改 </el-dropdown-item>
                    <el-dropdown-item command="delete" divided class="danger">
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </el-tab-pane>

        <!-- ============ Executions ============ -->
        <el-tab-pane label="Executions" name="executions">
          <div class="filter-wrapper">
            <span class="filter" ref="buttonRef" @click="toggleFilter">
              <img src="../assets/filter.svg" />
            </span>

            <!-- 筛选弹层 -->
            <div v-if="showFilter" ref="panelRef" class="filter-panel">
              <el-form
                :model="filterForm"
                :rules="filterRules"
                label-width="90px"
                size="small"
                ref="filterFormRef"
              >
                <el-form-item label="工作流">
                  <el-select
                    v-model="filterForm.workflowName"
                    clearable
                    placeholder="请选择工作流"
                    filterable
                  >
                    <el-option
                      v-for="wf in workflows"
                      :key="wf.id"
                      :label="wf.name"
                      :value="wf.name"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="状态">
                  <el-select v-model="filterForm.status" clearable>
                    <el-option label="RUNNING" value="RUNNING" />
                    <el-option label="SUCCESS" value="SUCCESS" />
                    <el-option label="ERROR" value="ERROR" />
                    <el-option label="CANCELLED" value="CANCELLED" />
                  </el-select>
                </el-form-item>

                <el-form-item label="开始时间">
                  <el-date-picker
                    v-model="filterForm.startTimeRange"
                    type="datetimerange"
                    range-separator="至"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    value-format="YYYY-MM-DD HH:mm:ss"
                  />
                </el-form-item>

                <el-form-item label="最小运行时间(ms)" prop="durationMin">
                  <el-input
                    v-model="filterForm.durationMin"
                    type="number"
                    min="0"
                  />
                </el-form-item>

                <el-form-item label="最大运行时间(ms)" prop="durationMax">
                  <el-input
                    v-model="filterForm.durationMax"
                    type="number"
                    min="0"
                  />
                </el-form-item>

                <div class="filter-actions">
                  <el-button size="small" @click="resetFilter">重置</el-button>
                  <el-button type="primary" size="small" @click="applyFilter">
                    搜索
                  </el-button>
                </div>
              </el-form>
            </div>
          </div>

          <el-table
            :data="executions"
            style="width: 100%"
            height="600"
            @selection-change="handleSelectionChange"
            size="default"
            stripe
          >
            <!-- 勾选框 -->
            <el-table-column type="selection" width="50" />

            <!-- 工作流名称 -->
            <el-table-column prop="workflowName" label="所属工作流" />

            <!-- 状态 -->
            <el-table-column label="状态">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)" size="small">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>

            <!-- 开始时间 -->
            <el-table-column label="开始时间">
              <template #default="scope">
                {{ formatTime(scope.row.startTime) }}
              </template>
            </el-table-column>

            <!-- 运行时间 -->
            <el-table-column label="运行时间">
              <template #default="scope">
                {{ formatDuration(scope.row.duration) }}
              </template>
            </el-table-column>

            <!-- 执行ID -->
            <el-table-column prop="id" label="执行ID" />

            <!-- 右侧操作 -->
            <el-table-column width="80" align="right">
              <template #default="scope">
                <el-dropdown
                  trigger="click"
                  @command="handleExecutionCommand(scope.row, $event)"
                >
                  <span class="more-btn" @click.stop>⋯</span>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="delete" class="danger">
                        删除
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
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
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { ref, onMounted, onBeforeUnmount, computed, toRaw } from "vue";
import service from "../service/index.js";

const emit = defineEmits(["goEditorFromPerson"]);

const executions = ref([]);
const createFormRef = ref(null);
const modifyFormRef = ref(null);
const workflows = ref([]);
const showCreateDialog = ref(false);
const keyword = ref("");
const sortBy = ref("updatedAt");
const activeTab = ref("workflows");
const selectedExecutionsIds = ref([]);
const showFilter = ref(false);
const buttonRef = ref(null);
const panelRef = ref(null);
const filterFormRef = ref(null);
const currentPan = ref("");

const filterForm = ref({
  workflowName: "",
  status: "",
  startTimeBegin: [],
  durationMin: "",
  durationMax: "",
});

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
function handleClickOutside(event) {
  const btn = buttonRef.value;
  const panel = panelRef.value;

  // 点击按钮或弹层内部，不收起
  if (
    (btn && btn.contains(event.target)) ||
    (panel && panel.contains(event.target))
  ) {
    return;
  }

  // 点击 el-date-picker 弹层，也不收起
  const pickerPanel = document.querySelector(".el-picker-panel");
  if (pickerPanel && pickerPanel.contains(event.target)) {
    return;
  }

  // 其他情况收起
  showFilter.value = false;
}

onMounted(async () => {
  document.addEventListener("click", handleClickOutside);
  const res = await service.get("/api/workflow/list", {
    params: { userId: localStorage.getItem("userId") },
  });
  workflows.value = res.data || [];
  console.log(workflows.value);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", handleClickOutside);
});
function toggleFilter() {
  showFilter.value = !showFilter.value;
}

const validateDuration = (rule, value, callback) => {
  const min = filterForm.value.durationMin;
  const max = filterForm.value.durationMax;

  // 只要有一个为空就不校验
  if (!min || !max) {
    return callback();
  }

  // 转成数字比较
  if (Number(max) < Number(min)) {
    callback(new Error("最大运行时间必须大于或等于最小运行时间"));
  } else {
    callback();
  }
};
const filterRules = {
  durationMin: [{ validator: validateDuration, trigger: "blur" }],
  durationMax: [{ validator: validateDuration, trigger: "blur" }],
};

async function resetFilter() {
  filterForm.value = {
    userId: localStorage.getItem("userId"),
    workflowName: null,
    status: null,
    startTimeBegin: null,
    startTimeEnd: null,
    durationMin: null,
    durationMax: null,
    offset: null,
    pageSize: null,
  };
  const res = await service.post(
    "/api/workflowExecute/listExecutions",
    filterForm.value,
  );
  executions.value = res.data;
}

async function applyFilter() {
  if (!filterFormRef.value) return;

  try {
    await filterFormRef.value.validate();
    // 校验通过
    fetchFilterExecutions();
  } catch (err) {
    // 校验失败
    ElMessage.error("校验未通过");
  }
}

async function fetchFilterExecutions() {
  const params = buildQueryParams();
  const res = await service.post("/api/workflowExecute/listExecutions", params);
  executions.value = res.data;
  console.log("filterExecutions:", res.data);
}
function buildQueryParams() {
  return {
    userId: localStorage.getItem("userId"),

    workflowName: filterForm.value.workflowName || null,
    status: filterForm.value.status || null,

    startTimeBegin: filterForm.value.startTimeRange?.[0] || null,
    startTimeEnd: filterForm.value.startTimeRange?.[1] || null,

    durationMin: filterForm.value.durationMin
      ? Number(filterForm.value.durationMin)
      : null,

    durationMax: filterForm.value.durationMax
      ? Number(filterForm.value.durationMax)
      : null,

    // offset: 0,
    // pageSize: 10,
  };
}

function getStatusType(status) {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "ERROR":
      return "danger";
    case "RUNNING":
      return "info";
    default:
      return "";
  }
}
function formatDuration(ms) {
  if (ms == null) return "-";

  if (ms < 1000) {
    return ms + " ms";
  }

  if (ms < 60000) {
    return (ms / 1000).toFixed(2) + " s";
  }

  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(1);

  return `${minutes} min ${seconds} s`;
}

function handleExecutionCommand(row, command) {
  if (command === "delete") {
    ElMessageBox.confirm(`确定删除执行记录 ${row.id}？`, "危险操作", {
      type: "warning",
    })
      .then(async () => {
        const res = await service.delete("api/workflowExecute/delete", {
          params: { id: row.id },
        });
        if (res.status == 200) {
          executions.value = executions.value.filter((e) => e.id !== row.id);
          ElMessage.success("已删除");
        } else {
          ElMessage.success("删除失败");
        }
      })
      .catch(() => {});
  }
}

function handleSelectionChange(val) {
  // TODO 调用批量删除接口
  selectedExecutionsIds.value = val.map((item) => item.id);
}
async function deleteBatch() {
  ElMessageBox.confirm("确定要删除这些执行记录吗？", "危险操作", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    confirmButtonClass: "el-button--danger",
    type: "warning",
  })
    .then(async () => {
      // 点击确定后执行
      await service.put(
        "/api/workflowExecute/deleteBatch",
        toRaw(selectedExecutionsIds.value),
      );

      ElMessage.success("删除成功");
      // 调接口重新渲染
      const res = await service.post("/api/workflowExecute/listExecutions", {
        userId: localStorage.getItem("userId"),
      });
      executions.value = res.data;
    })
    .catch(() => {});
}
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
  emit("goEditorFromPerson", { name, id });
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
      userId: localStorage.getItem("userId"),
      name: form.value.name,
      description: form.value.description,
    });

    workflows.value.unshift(res.data);
    showCreateDialog.value = false;
    ElMessage.success("创建成功");
    emit("goEditorFromPerson", { name: res.data.name, id: res.data.id });
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
      modifyFormRef.value.clearValidate();
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

async function loadExecutions() {
  const res = await service.post("/api/workflowExecute/listExecutions", {
    userId: localStorage.getItem("userId"),
    pageNum: 1,
    pageSize: 10,
  });

  executions.value = res.data;
}

function handleTabClick(tab) {
  currentPan.value = tab.props.name;
  if (tab.props.name === "executions") {
    loadExecutions();
  }
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
  position: relative;
  .delete-batch {
    width: 60px;
    height: 30px;
    position: absolute;
    bottom: 10%;
    left: 50%;
    transform: translateX(-50%);
  }
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
.workflow-tabs {
  margin-top: 10px;
  .filter-wrapper {
    width: 100%;
    height: 45px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 5px;
    position: relative;
    .filter {
      width: 30px;
      height: 30px;
      border: 1px solid #303133;
      padding: 4px;
      box-sizing: border-box;
      border-radius: 5px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      img {
        width: 100%;
        height: 100%;
      }
    }
    .filter:hover {
      cursor: pointer;
    }
    .filter-panel {
      position: absolute;
      top: 45px; // 在按钮下方
      right: 0;
      width: 340px;
      background: #fff;
      border: 1px solid #ebeef5;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      z-index: 1000;
    }
    .filter-actions {
      display: flex;
      justify-content: flex-end;
    }
  }
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.empty-box {
  padding: 40px 0;
  text-align: center;
  color: #909399;
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
