<template>
  <div class="layout">
    <!-- ============ Sidebar ============ -->
    <aside class="sidebar" :class="{ collapse: isCollapse }">
      <!-- Logo -->
      <div class="logo">
        <img src="../assets/logo.svg" class="logo-img" />
        <span v-show="!isCollapse">AI工作流后台</span>
      </div>

      <!-- Menu -->
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        class="menu"
        background-color="#ffffff"
        text-color="#374151"
        active-text-color="#409EFF"
        unique-opened
      >
        <el-menu-item index="/admin/user">
          <img class="icon" src="../assets/userManagement.svg" />
          <span v-show="!isCollapse">用户管理</span>
        </el-menu-item>

        <el-menu-item index="/admin/workflow">
          <img class="icon" src="../assets/workflowManagement.svg" />
          <span v-show="!isCollapse">工作流管理</span>
        </el-menu-item>

        <el-menu-item index="/admin/template">
          <img class="icon" src="../assets/template.svg" />
          <span v-show="!isCollapse">模版管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/chat">
          <img class="icon" src="../assets/chat.svg" />
          <span v-show="!isCollapse">聊天管理</span>
        </el-menu-item>
        <el-menu-item index="/admin/nodeConfig">
          <img class="icon" src="../assets/nodeConfig.svg" />
          <span v-show="!isCollapse">节点配置</span>
        </el-menu-item>

        <el-menu-item index="/admin/dashboard">
          <img class="icon" src="../assets/systemdashboard.svg" />
          <span v-show="!isCollapse">系统总览</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- ============ Main ============ -->
    <div class="main">
      <!-- Top Bar -->
      <header class="header">
        <div class="left">
          <button class="collapse-btn" @click="toggleCollapse">☰</button>
          <!-- 返回按钮 -->
          <button class="back-btn" @click="goBack">返回工作流</button>
          <div class="breadcrumb">后台管理 / {{ currentTitle }}</div>
        </div>

        <div class="right">
          <div class="user">
            <img class="avatar" :src="loginUser?.avatar" />
            <span>Admin</span>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { queryUserById } from "@/systemManagement/src/api/user";

const route = useRoute();
const router = useRouter();
const loginUser = ref(null);

onMounted(async () => {
  queryUserById(localStorage.getItem("userId")).then((res) => {
    loginUser.value = res;
  });
});
const goBack = () => {
  router.push("/");
};
/* 折叠状态 */
const isCollapse = ref(false);

/*  优化：避免频繁DOM抖动 */
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value;
};

/* 当前菜单 */
const activeMenu = computed(() => {
  return route.path;
});

/* 标题 */
const currentTitle = computed(() => {
  return route.meta?.title || "首页";
});
</script>

<style scoped>
/* ============ Layout ============ */
.layout {
  display: flex;
  height: 100vh;
  background: #f4f6fa;
}

/* ============ Sidebar ============ */
.sidebar {
  width: 220px;
  background: #ffffff;
  color: #1f2937;
  transition: width 0.2s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e5e7eb;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.03);
}

.sidebar.collapse {
  width: 64px;
}

/* Logo */
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  font-weight: bold;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.logo-img {
  width: 28px;
  height: 28px;
}

/* Menu */
.menu {
  border-right: none;
  flex: 1;
}

/* icon */
.icon {
  width: 18px;
  height: 18px;
  margin-right: 8px;
}

/* ============ Main ============ */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.header {
  height: 56px;
  background: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #eee;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

/* Left */
.left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  border: none;
  background: #f0f2f5;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
}

.collapse-btn:hover {
  background: #e6f4ff;
}

/* breadcrumb */
.breadcrumb {
  font-size: 14px;
  color: #666;
}

/* Right */
.right {
  display: flex;
  align-items: center;
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
}

.user:hover {
  background: #f5f5f5;
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}

/* Content */
.content {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.back-btn {
  border: none;
  background: transparent;
  font-size: 14px;
  color: #409eff;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: 0.2s;
}

.back-btn:hover {
  background: #ecf5ff;
}
</style>
