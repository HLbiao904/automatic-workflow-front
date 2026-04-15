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

export default router;
