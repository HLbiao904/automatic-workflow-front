<template>
  <div class="overwrite-page">
    <!-- 顶部 TopBar -->
    <header class="topbar">
      <div class="topbar-left">
        <span class="title">AI Workflow</span>
      </div>

      <div class="topbar-right">
        <el-button type="primary" size="small" @click="showCreateDialog = true">
          + 创建工作流
        </el-button>
      </div>
    </header>

    <!-- 主区：已有 workflow 列表 -->
    <main class="workflow-list-area">
      <ul class="workflow-list">
        <li
          v-for="item in workflows"
          :key="item.id"
          @click="goExistingWorkflow(item.name, item.id)"
        >
          <h3>{{ item.name }}</h3>
          <p>{{ item.description }}</p>
        </li>
      </ul>
    </main>

    <!-- 创建工作流弹窗 -->
    <el-dialog
      title="创建新工作流"
      v-model="showCreateDialog"
      width="450px"
      :close-on-click-modal="false"
    >
      <el-form :model="form" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="form.name" placeholder="My workflow" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            type="textarea"
            v-model="form.description"
            placeholder="请输入工作流描述"
            :rows="3"
          />
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createWorkflow">创建</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from "vue";
import service from "../service/index.js";

const showCreateDialog = ref(false);
const emit = defineEmits(["goEditor"]);
const form = ref({
  name: "My workflow",
  description: "",
});

// 模拟已有 workflow 数据
const workflows = ref([]);

onMounted(async () => {
  const res = await service.get("/api/workflow/list", {
    params: { userId: 1 },
  });
  workflows.value = res.data;
});

function goExistingWorkflow(name, id) {
  emit("goEditor", { name, id });
}
async function createWorkflow() {
  const name = form.value.name.trim() || "My workflow";
  const description = form.value.description.trim();

  try {
    // 调用后端 Spring Boot 接口
    const res = await service.post("/api/workflow/create", {
      name,
      description,
      userId: 1, // 默认 admin
    });

    const newWorkflow = res.data; // 后端返回的 workflow 对象，带 id
    console.log("创建成功:", newWorkflow);

    // 更新前端列表（可选，保持列表同步）
    workflows.value.push(newWorkflow);

    showCreateDialog.value = false;

    // 跳转到 Editor 页面
    emit("goEditor", { name: newWorkflow.name, id: newWorkflow.id });
  } catch (err) {
    console.error("创建失败:", err);
    ElMessage.error("创建工作流失败，请稍后重试");
  }
}
</script>

<style scoped lang="scss">
.overwrite-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 顶部 TopBar */
.topbar {
  height: 48px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  background: #fff;
  border-bottom: 1px solid #ebeef5;

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

/* 主区：workflow 列表 */
.workflow-list-area {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.workflow-list {
  list-style: none;
  padding: 0;
  margin: 0;

  li {
    background: #fff;
    padding: 16px 20px;
    border-radius: 8px;
    margin-bottom: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    cursor: pointer;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    p {
      margin: 4px 0 0 0;
      font-size: 14px;
      color: #606266;
    }

    &:hover {
      background: #f5f7fa;
    }
  }
}
</style>
