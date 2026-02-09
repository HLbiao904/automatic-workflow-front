import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/components/LoginView.vue"),
    },
    {
      path: "/",
      name: "home",
      component: () => import("@/index.vue"),
    },
  ],
});

export default router;
