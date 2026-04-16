import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/loginView.vue"),
    },
    {
      path: "/",
      name: "home",
      component: () => import("@/index.vue"),
    },
    {
      path: "/systemManagement",
      name: "systemManagement",
      component: () => import("@/systemManagement/src/layout/index.vue"),
    },

    {
      path: "/",
      redirect: "/login",
    },

    {
      path: "/login",
      component: () => import("@/systemManagement/src/views/login.vue"),
      meta: { title: "登录" },
    },
    // 系统管理路由
    {
      path: "/admin",
      component: () => import("@/systemManagement/src/layout/index.vue"),
      children: [
        {
          path: "user",
          component: () => import("@/systemManagement/src/views/user.vue"),
          meta: { title: "用户管理" },
        },
        {
          path: "workflow",
          component: () => import("@/systemManagement/src/views/workflow.vue"),
          meta: { title: "工作流管理" },
        },
        {
          path: "template",
          component: () => import("@/systemManagement/src/views/template.vue"),
          meta: { title: "模版管理" },
        },
        {
          path: "chat",
          component: () => import("@/systemManagement/src/views/chat.vue"),
          meta: { title: "聊天管理" },
        },
        {
          path: "dashboard",
          component: () => import("@/systemManagement/src/views/dashboard.vue"),
          meta: { title: "系统概览" },
        },
        {
          path: "nodeConfig",
          component: () =>
            import("@/systemManagement/src/views/nodeConfig.vue"),
          meta: { title: "节点配置" },
        },
      ],
    },
  ],
});
/* const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      component: () => import("@/views/loginView.vue"),
    },

    {
      path: "/",
      component: () => import("@/layout/MainLayout.vue"),
      children: [
        {
          path: "",
          redirect: "/workflow/editor",
        },
        {
          path: "workflow/editor/:id?",
          component: () => import("@/views/WorkflowEditor.vue"),
        },
        {
          path: "overwrite",
          component: () => import("@/views/overwriteView.vue"),
        },
        {
          path: "person",
          component: () => import("@/views/personView.vue"),
        },
        {
          path: "chat",
          component: () => import("@/views/chatView.vue"),
        },
        {
          path: "insights",
          component: () => import("@/views/dashboardView.vue"),
        },
        {
          path: "templates",
          component: () => import("@/views/templateView.vue"),
        },
        {
          path: "config/node",
          component: () => import("@/views/nodeConfigView.vue"),
        },
        {
          path: "config/user",
          component: () => import("@/views/userConfigView.vue"),
        },
      ],
    },
  ],
}); */

router.beforeEach((to) => {
  const token = localStorage.getItem("token");

  // 去登录页直接放行
  if (to.path === "/login") {
    return true;
  }

  // 没 token → 跳登录
  if (!token) {
    return "/login";
  }

  // 放行
  return true;
});
export default router;
