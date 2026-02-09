<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <div class="auth-header">
        <h1>Workflow Platform</h1>
        <p>登录或注册以继续</p>
      </div>

      <el-tabs v-model="activeTab" stretch>
        <!-- 登录 -->
        <el-tab-pane label="登录" name="login">
          <el-form :model="loginForm" @submit.prevent>
            <el-form-item>
              <el-input
                v-model="loginForm.account"
                placeholder="用户名或邮箱"
                size="large"
                clearable
              />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="密码"
                size="large"
                show-password
              />
            </el-form-item>
            <el-button
              type="primary"
              size="large"
              class="submit-btn"
              @click="handleLogin"
            >
              登录
            </el-button>
          </el-form>
        </el-tab-pane>

        <!-- 注册 -->
        <el-tab-pane label="注册" name="register">
          <el-form :model="registerForm" @submit.prevent>
            <el-form-item>
              <el-input
                v-model="registerForm.username"
                placeholder="用户名"
                size="large"
                clearable
              />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="registerForm.password"
                type="password"
                placeholder="密码"
                size="large"
                show-password
              />
            </el-form-item>
            <el-form-item>
              <el-input
                v-model="registerForm.email"
                placeholder="邮箱（可选）"
                size="large"
                clearable
              />
            </el-form-item>
            <el-button
              type="primary"
              size="large"
              class="submit-btn"
              @click="handleRegister"
            >
              注册
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { ElMessage } from "element-plus";
import service from "@/service";
import { useRouter } from "vue-router";

const router = useRouter();
const activeTab = ref("login");

const loginForm = ref({
  account: "",
  password: "",
});

const registerForm = ref({
  username: "",
  password: "",
  email: "",
});

async function handleLogin() {
  if (!loginForm.value.account || !loginForm.value.password) {
    ElMessage.warning("请输入用户名和密码");
    return;
  }

  const res = await service.post("/auth/login", loginForm.value);
  if (res.status === 200 && res.data) {
    // 设置当前登录用户id
    localStorage.setItem("userId", res.data.id);
    ElMessage.success("登录成功");
    // 跳转到首页
    router.push("/");
  } else {
    ElMessage.warning("用户名或密码不正确");
  }
}

async function handleRegister() {
  if (!registerForm.value.username || !registerForm.value.password) {
    ElMessage.warning("用户名和密码必填");
    return;
  }
  const res = await service.post("/auth/register", registerForm.value);
  if (res.status === 200) {
    ElMessage.success("注册成功，请登录");
    activeTab.value = "login";
  } else {
    ElMessage.warning("注册失败");
  }
}
</script>

<style scoped lang="scss">
.auth-wrapper {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
}

.auth-card {
  width: 380px;
  padding: 28px 24px 24px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.08);
}

.auth-header {
  text-align: center;
  margin-bottom: 20px;

  h1 {
    font-size: 22px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  p {
    font-size: 13px;
    color: #909399;
  }
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}
</style>
