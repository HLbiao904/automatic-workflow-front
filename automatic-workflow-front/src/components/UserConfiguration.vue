<template>
  <div class="profile">
    <el-card>
      <h2>个人信息</h2>

      <!-- 头像 -->

      <div class="avatar-box">
        <img v-if="user.avatar" :src="user.avatar" class="avatar" />
        <img v-else src="../assets/defaultAvatar.svg" class="avatar" />

        <el-upload
          :show-file-list="false"
          :before-upload="checkFile"
          :http-request="uploadAvatar"
        >
          <el-button size="small">更换头像</el-button>
        </el-upload>
      </div>

      <!-- 表单 -->

      <el-form :model="user" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="user.username" />
        </el-form-item>

        <el-form-item label="邮箱">
          <el-input v-model="user.email" />
        </el-form-item>
      </el-form>

      <el-button type="primary" @click="saveUser"> 保存修改 </el-button>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import service from "../service/index.js";

const user = ref({});

const userId = ref(null);

onMounted(loadUser);

async function loadUser() {
  userId.value = Number(localStorage.getItem("userId"));
  const res = await service.get(`/user/queryUserById/${userId.value}`);

  user.value = res.data;
}

/* 保存用户 */

async function saveUser() {
  await service.post("/user/update", user.value);

  ElMessage.success("保存成功");
}

/* 上传头像 */

async function uploadAvatar(file) {
  const formData = new FormData();

  formData.append("avatar", file.file);
  formData.append("userId", userId.value);

  const res = await service.post("/user/uploadAvatar", formData);

  user.value.avatar = res.data;
}

/* 校验 */

function checkFile(file) {
  const allow = ["image/png", "image/jpeg", "image/jpg"];

  if (!allow.includes(file.type)) {
    ElMessage.error("只允许PNG/JPG图片");
    return false;
  }

  const isLt2M = file.size / 1024 / 1024 < 2;

  if (!isLt2M) {
    ElMessage.error("图片不能超过2MB");
    return false;
  }

  return true;
}
</script>

<style>
.profile {
  width: 500px;
  margin: 40px auto;
}

.avatar-box {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
}
</style>
