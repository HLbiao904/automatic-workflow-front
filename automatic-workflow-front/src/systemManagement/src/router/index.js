import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    redirect: "/login",
  },

  {
    path: "/login",
    component: () => import("../views/login.vue"),
    meta: { title: "登录" },
  },

  {
    path: "/admin",
    component: () => import("../layout/index.vue"),
    children: [
      {
        path: "user",
        component: () => import("../views/user.vue"),
        meta: { title: "用户管理" },
      },
      {
        path: "workflow",
        component: () => import("../views/workflow.vue"),
        meta: { title: "工作流管理" },
      },
      {
        path: "template",
        component: () => import("../views/template.vue"),
        meta: { title: "模版管理" },
      },
      {
        path: "chat",
        component: () => import("../views/chat.vue"),
        meta: { title: "聊天管理" },
      },
      {
        path: "dashboard",
        component: () => import("../views/dashboard.vue"),
        meta: { title: "系统概览" },
      },
      {
        path: "nodeConfig",
        component: () => import("../views/nodeConfig.vue"),
        meta: { title: "节点配置" },
      },
    ],
  },
];
const router = createRouter({ history: createWebHistory(), routes });
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
