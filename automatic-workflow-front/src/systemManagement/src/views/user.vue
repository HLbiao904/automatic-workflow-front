<template>
  <div>
    <h2>用户管理</h2>

    <!-- 搜索区 -->
    <el-card style="margin-bottom: 10px">
      <el-input
        v-model="query.keyword"
        placeholder="搜索用户名/邮箱"
        style="width: 200px; margin-right: 10px"
        clearable
      />
      <el-select v-model="query.status" placeholder="状态" style="width: 120px">
        <el-option label="全部" :value="null" />
        <el-option label="正常" :value="1" />
        <el-option label="禁用" :value="0" />
      </el-select>

      <el-button type="primary" style="margin-left: 10px" @click="loadData">
        搜索
      </el-button>
      <el-button type="success" style="margin-left: 10px" @click="openCreate">
        + 创建用户
      </el-button>
    </el-card>

    <!-- 表格 -->
    <el-card>
      <el-table :data="tableData" border style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />

        <el-table-column prop="avatar" label="头像" width="80">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" />
          </template>
        </el-table-column>

        <el-table-column prop="username" label="用户名" />

        <el-table-column prop="email" label="邮箱" />

        <el-table-column prop="status" label="状态" width="120">
          <template #default="{ row }">
            <el-switch
              v-model="row.status"
              :active-value="1"
              :inactive-value="0"
              :disabled="row.role === 'ADMIN'"
              @change="changeStatus(row)"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="openEdit(row)">
              编辑
            </el-button>

            <el-button
              size="small"
              type="danger"
              :disabled="row.role === 'ADMIN'"
              @click="remove(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="row.role === 'ADMIN' ? 'danger' : 'info'">
              {{ row.role === "ADMIN" ? "管理员" : "普通用户" }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div style="margin-top: 15px; text-align: right">
        <el-pagination
          background
          layout="prev, pager, next"
          :total="total"
          :page-size="query.pageSize"
          v-model:current-page="query.page"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" title="编辑用户" width="400px">
      <el-form :model="form">
        <el-form-item label="用户名">
          <el-input v-model="form.username" />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="form.email" />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="普通用户" value="USER" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建用户 -->
    <el-dialog v-model="createVisible" title="创建用户" width="400px">
      <el-form :model="createForm">
        <el-form-item label="用户名">
          <el-input v-model="createForm.username" />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="createForm.email" />
        </el-form-item>

        <el-form-item label="密码">
          <el-input v-model="createForm.password" type="password" />
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="createForm.status">
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item label="角色">
          <el-select v-model="createForm.role">
            <el-option label="管理员" value="ADMIN" />
            <el-option label="普通用户" value="USER" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" @click="createUser">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from "vue";
import {
  getUserList,
  deleteUser,
  updateUser,
  updateUserStatus,
  addUser,
} from "@/systemManagement/src/api/user";

// 创建用户
const createVisible = ref(false);
const createForm = reactive({
  username: "",
  email: "",
  password: "",
  status: 1,
  role: "USER",
});

const openCreate = () => {
  createVisible.value = true;

  Object.assign(createForm, {
    username: "",
    email: "",
    password: "",
    status: 1,
    role: "USER",
  });
};

const createUser = async () => {
  await addUser(createForm);

  ElMessage.success("创建成功");

  createVisible.value = false;
  loadData();
};
/* 查询条件 */
const query = reactive({
  keyword: "",
  status: "",
  page: 1,
  pageSize: 10,
});

/* 数据 */
const tableData = ref([]);
const total = ref(0);

/* 弹窗 */
const dialogVisible = ref(false);
const form = reactive({
  id: null,
  username: "",
  email: "",
  status: 1,
  role: "USER",
});

/* 加载数据 */
const loadData = async () => {
  const res = await getUserList(query);

  tableData.value = res.list;
  total.value = res.total;
};

/* 删除 */
const remove = async (id) => {
  try {
    await ElMessageBox.confirm(
      "确定要删除该用户吗？删除后不可恢复！",
      "⚠️ 警告",
      {
        confirmButtonText: "确定删除",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    await deleteUser(id);
    ElMessage.success("删除成功");
    loadData();
  } catch (e) {
    // 用户取消
    ElMessage.info("已取消删除");
  }
};

/* 打开编辑 */
const openEdit = (row) => {
  Object.assign(form, {
    ...row,
    role: row.role || "USER", // 防止 null
  });

  dialogVisible.value = true;
};

/* 保存 */
const save = async () => {
  await updateUser(form);
  dialogVisible.value = false;
  loadData();
};

/* 状态修改 */
const changeStatus = async (row) => {
  await updateUserStatus(row.id, row.status);
};

onMounted(() => {
  loadData();
});
</script>
