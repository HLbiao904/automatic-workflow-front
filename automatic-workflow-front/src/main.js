/* these are necessary styles for vue flow */
import "@vue-flow/core/dist/style.css";

/* this contains the default theme, these are optional styles */
import "@vue-flow/core/dist/theme-default.css";
import "element-plus/dist/index.css";
import JsonViewer from "vue3-json-viewer";

import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";

import App from "./App.vue";
import router from "./router";

const app = createApp(App);

app.use(createPinia());
app.use(ElementPlus);
app.use(router);
app.use(JsonViewer);

app.mount("#app");
