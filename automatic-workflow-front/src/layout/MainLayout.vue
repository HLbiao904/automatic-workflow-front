<template>
  <div class="layout">
    <!-- 左侧 -->
    <SideBar @navigate="handleNavigate" />

    <!-- 右侧 -->
    <div class="main">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";
import SideBar from "@/components/sideBar.vue";

const router = useRouter();

function handleNavigate(path) {
  router.push(path);
}
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
}
.main {
  flex: 1;
  overflow: hidden;
}
</style>
