<template>
  <div>
    <h2>工作流管理</h2>

    <!-- 搜索 -->
    <el-card style="margin-bottom: 10px">
      <el-input
        v-model="query.keyword"
        placeholder="搜索工作流名称"
        style="width: 220px"
        clearable
      />

      <el-button type="primary" @click="loadData" style="margin-left: 10px">
        查询
      </el-button>

      <el-button type="success" @click="openCreate"> 新建工作流 </el-button>
    </el-card>

    <!-- 表格 -->
    <el-card>
      <el-table :data="list" border>
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column prop="name" label="工作流名称" />

        <el-table-column prop="description" label="描述" />

        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column label="操作" width="320">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="edit(row)">
              编辑
            </el-button>

            <el-button size="small" type="danger" @click="remove(row.id)">
              删除
            </el-button>

            <el-button size="small" @click="openVersion(row)"> 版本 </el-button>

            <el-button size="small" type="info" @click="openExec(row)">
              执行记录
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- ================= 版本 ================= -->
    <el-dialog v-model="versionVisible" title="版本记录" width="600px">
      <el-table :data="versionList" border height="500">
        <el-table-column prop="version" label="版本号" width="100" />
        <el-table-column prop="createdAt" label="创建时间">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="previewFlow(row)">
              查看
            </el-button>
          </template>
        </el-table-column>
        <!-- <el-table-column prop="workflowId" label="所属工作流" />
        <el-table-column prop="username" label="用户名" /> -->
      </el-table>
    </el-dialog>

    <!-- ================= 执行记录 ================= -->
    <el-dialog v-model="execVisible" title="执行记录" width="990px">
      <el-table :data="execList" border height="600">
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ formatStatus(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="startTime" label="开始时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.startTime) }}
          </template></el-table-column
        >

        <el-table-column prop="duration" label="耗时" width="120">
          <template #default="{ row }">
            <el-tag :type="getDurationType(row.duration)">
              {{ formatDuration(row.duration) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="triggerType" label="触发方式" width="120" />

        <el-table-column prop="userId" label="用户ID" width="100" />

        <el-table-column prop="workflowVersionId" label="版本ID" width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <div class="action-btns">
              <el-button size="small" type="primary" @click="previewExec(row)">
                查看
              </el-button>

              <el-button
                size="small"
                type="danger"
                @click="handleDeleteExec(row.id)"
              >
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>

        <!-- <el-table-column prop="errorMessage" label="错误信息" /> -->
      </el-table>
    </el-dialog>

    <el-dialog v-model="createVisible" title="新建工作流" width="400px">
      <el-form :model="createForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="createForm.name" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="createForm.description" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="createSubmit">创建</el-button>
      </template>
    </el-dialog>
    <el-dialog v-model="editVisible" title="编辑工作流" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.workflowName" />
        </el-form-item>

        <el-form-item label="描述">
          <el-input v-model="form.description" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存</el-button>
      </template>
    </el-dialog>
    <FlowPreview
      v-model:visible="showFlowPreview"
      :preViewData="preViewFlowData"
      :previewMode="previewMode"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { formatDateTime } from "@/systemManagement/src/utils/tools";
import FlowPreview from "@/systemManagement/src/components/showWorkflowPanel.vue";

const showFlowPreview = ref(false);
const preViewFlowData = ref(null);
const previewMode = ref(false);
/* API */
import {
  createWorkflow,
  getWorkflowList,
  deleteWorkflow,
  modifyWorkflow,
  getWorkflowVersions,
  getWorkflowExecutions,
  getVersionById,
} from "@/systemManagement/src/api/workflow";
import { deleteExecution } from "@/systemManagement/src/api/execution";

/* 编辑 */
const editVisible = ref(false);
const createVisible = ref(false);

const createForm = reactive({
  name: "",
  description: "",
});
const form = reactive({
  id: null,
  name: "",
  description: "",
});
/* 查询 */
const query = reactive({
  keyword: "",
  userId: 1, // 后面换成登录用户
});

/* 数据 */
const list = ref([]);

/* 版本 */
const versionVisible = ref(false);
const versionList = ref([]);

/* 执行记录 */
const execVisible = ref(false);
const execList = ref([]);

/* ================= 加载工作流列表 ================= */
const loadData = async () => {
  const res = await getWorkflowList(query.userId);
  list.value = res || [];
};

onMounted(() => {
  loadData();
});

/* ================= 操作 ================= */

const openCreate = () => {
  createVisible.value = true;
};
const createSubmit = async () => {
  if (!createForm.name) {
    ElMessage.warning("请输入工作流名称");
    return;
  }

  await createWorkflow({
    userId: query.userId,
    name: createForm.name,
    description: createForm.description,
  });

  ElMessage.success("创建成功");

  createVisible.value = false;

  createForm.name = "";
  createForm.description = "";

  loadData();
};
const edit = (row) => {
  form.id = row.id;
  form.workflowName = row.name;
  form.description = row.description;

  editVisible.value = true;
};

const saveEdit = async () => {
  await modifyWorkflow({
    id: form.id,
    workflowName: form.workflowName,
    description: form.description,
  });

  ElMessage.success("修改成功");

  editVisible.value = false;
  loadData();
};
/* 删除 */
const remove = async (id) => {
  try {
    await ElMessageBox.confirm("确定删除该工作流吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    await deleteWorkflow(id);

    ElMessage.success("删除成功");
    loadData();
  } catch (err) {
    // 用户点取消不会报错
    console.log("用户取消删除操作");
  }
};
/* ================= 版本 ================= */
const openVersion = async (row) => {
  versionVisible.value = true;

  getWorkflowVersions({
    workflowId: row.id,
  }).then((res) => {
    versionList.value = res || [];
  });
};
// 预览版本工作流
const previewFlow = (row) => {
  // 后端如果是 JSON 字符串，需要 parse
  let nodes = row.nodesJson;
  let edges = row.edgesJson;

  if (typeof nodes === "string") {
    nodes = JSON.parse(nodes);
  }

  if (typeof edges === "string") {
    edges = JSON.parse(edges);
  }

  // 赋值给预览组件
  preViewFlowData.value = {
    nodesJson: nodes,
    edgesJson: edges,
  };

  showFlowPreview.value = true;
  previewMode.value = true; // 版本预览模式
};
/* ================= 执行记录 ================= */
const openExec = async (row) => {
  execVisible.value = true;
  getWorkflowExecutions({
    workflowId: row.id,
  }).then((res) => {
    console.log("执行记录接口返回：", res);
    execList.value = res || [];
  });
};
// 删除执行记录
const handleDeleteExec = (id) => {
  ElMessageBox.confirm("确认删除该执行记录？", "提示", {
    type: "warning",
  })
    .then(async () => {
      const res = await deleteExecution(id);
      console.log("删除执行记录接口返回：", res);
      if (res.code !== 200) {
        ElMessage.error(res.message);
        return;
      }

      ElMessage.success("删除成功");

      // 刷新当前执行记录列表
      execList.value = execList.value.filter((item) => item.id !== id);
    })
    .catch(() => {});
};
// 状态格式化
function formatStatus(status) {
  switch (status) {
    case "SUCCESS":
      return "成功";
    case "ERROR":
      return "失败";
    case "RUNNING":
      return "运行中";
    case "WAIT":
      return "等待";
    default:
      return status;
  }
}

function getStatusType(status) {
  switch (status) {
    case "SUCCESS":
      return "success";
    case "ERROR":
      return "danger";
    case "RUNNING":
      return "warning";
    case "WAIT":
      return "info";
    default:
      return "";
  }
}
// 耗时格式化
function getDurationType(ms) {
  if (ms == null) return "info";

  if (ms < 1000) return "success"; // 很快
  if (ms < 5000) return "warning"; // 一般
  return "danger"; // 慢
}
// 预览执行记录工作流
const previewExec = async (execRow) => {
  console.log("点击执行记录", execRow);

  // 获取版本数据（直接用接口返回）
  const versionData = await getVersionById({
    id: execRow.workflowVersionId,
  });

  let nodes = versionData.nodesJson;
  let edges = versionData.edgesJson;

  //  JSON 解析
  if (typeof nodes === "string") {
    nodes = JSON.parse(nodes);
  }

  if (typeof edges === "string") {
    edges = JSON.parse(edges);
  }

  //  解析执行状态
  let nodeStatusList = execRow.nodesStatus || [];
  let edgeStatusList = execRow.edgesStatus || [];

  if (typeof nodeStatusList === "string") {
    nodeStatusList = JSON.parse(nodeStatusList);
  }

  if (typeof edgeStatusList === "string") {
    edgeStatusList = JSON.parse(edgeStatusList);
  }

  //  转成 map（方便匹配）
  const nodeStatusMap = {};
  nodeStatusList.forEach((n) => {
    nodeStatusMap[n.id] = n.status;
  });

  const edgeStatusMap = {};
  edgeStatusList.forEach((e) => {
    edgeStatusMap[e.id] = e.status;
  });

  //  把 status 注入 nodes
  nodes = nodes.map((node) => {
    return {
      ...node,
      data: {
        ...node.data,
        status: nodeStatusMap[node.id] || "WAIT", // 默认未执行
      },
    };
  });

  //  把 status 注入 edges
  edges = edges.map((edge) => {
    return {
      ...edge,
      data: {
        ...edge.data,
        status: edgeStatusMap[edge.id] || "WAIT",
      },
    };
  });

  //  赋值给预览
  preViewFlowData.value = {
    nodesJson: nodes,
    edgesJson: edges,
  };

  showFlowPreview.value = true;
  previewMode.value = false; // 执行记录预览模式
};
function formatDuration(ms) {
  if (ms == null) return "-";

  // 小于 1 秒
  if (ms < 1000) {
    return `${ms}ms`;
  }

  // 小于 1 分钟
  if (ms < 60 * 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }

  // 大于 1 分钟
  const min = Math.floor(ms / 60000);
  const sec = ((ms % 60000) / 1000).toFixed(0);

  return `${min}min ${sec}s`;
}
</script>
<style scoped>
.action-btns {
  display: flex;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
}
</style>
