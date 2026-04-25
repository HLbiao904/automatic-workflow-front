import { defineStore } from "pinia";

export const useCommandStore = defineStore("command", {
  state: () => ({
    visible: false,

    nodes: [],
    workflows: [],
    templates: [],
    configs: ["节点配置", "用户配置"],
    sessions: [],
    role: localStorage.getItem("role") || "user",
  }),

  actions: {
    open() {
      this.visible = true;
    },
    close() {
      this.visible = false;
    },
    setData(data) {
      Object.assign(this, data);
    },
    setRole(role) {
      this.role = role;
      localStorage.setItem("role", role);
    },
  },
});
