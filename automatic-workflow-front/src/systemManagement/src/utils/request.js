import axios from "axios";
import { ElMessage } from "element-plus";

/**
 * 创建 axios 实例
 */
const request = axios.create({
  baseURL: "http://localhost:8080", // 改成你的后端地址
  timeout: 10000,
});

/**
 * 请求拦截器（统一加token）
 */
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = token;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * 响应拦截器（统一处理返回）
 */
request.interceptors.response.use(
  (response) => {
    const res = response.data;

    // ===============================
    // 1. null / undefined
    // ===============================
    if (res == null) {
      return null;
    }

    // ===============================
    // 2. 数组
    // ===============================
    if (Array.isArray(res)) {
      return res;
    }

    // ===============================
    // 3. 数字（1 / 0 / count）
    // ===============================
    if (typeof res === "number") {
      return res;
    }

    // ===============================
    // 4. 字符串
    // ===============================
    if (typeof res === "string") {
      return res;
    }

    // ===============================
    // 5. 标准对象（Spring Result / status / code）
    // ===============================
    if (res.code === 200 || res.status === 200) {
      return res.data ?? res;
    }

    // ===============================
    // 6. 兜底（对象但没结构）
    // ===============================
    if (typeof res === "object") {
      return res.data ?? res;
    }

    // ===============================
    // 7. 失败
    // ===============================
    ElMessage.error(res.message || "请求失败");
    return Promise.reject(res);
  },
  (error) => {
    ElMessage.error(error.message || "网络异常");
    return Promise.reject(error);
  },
);

export default request;
