import axios from "axios";
import router from "@/router";
import { ElMessage } from "element-plus";

const service = axios.create({
  baseURL: "http://127.0.0.1:10086",
  timeout: 180000,
});

// ================= 请求拦截 =================
service.interceptors.request.use(
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

// ================= 响应拦截 =================
service.interceptors.response.use(
  (response) => {
    const res = response;

    // 成功
    if (response.status == 200) {
      return res;
    }

    // 未登录 / token失效
    if (res.code === 401) {
      ElMessage.error("登录已过期，请重新登录");
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("userName");

      router.push("/login");
      return Promise.reject(res);
    }

    // 其他业务错误
    showErrorOnce(res.message || "请求失败");
    return Promise.reject(res);
  },
  (error) => {
    // ================= 网络错误处理 =================
    if (error.response) {
      const status = error.response.status;

      if (status === 401) {
        showErrorOnce("未登录或登录过期");
        localStorage.removeItem("token");
        router.push("/login");
      } else if (status === 403) {
        showErrorOnce("没有权限访问");
      } else if (status === 404) {
        showErrorOnce("接口不存在");
      } else if (status === 500) {
        showErrorOnce("服务器错误");
      } else {
        showErrorOnce("请求失败");
      }
    } else {
      showErrorOnce("网络异常，请检查后端服务");
    }

    return Promise.reject(error);
  },
);

// ================= 错误提示去重 =================
const errorMap = new Map();
const ERROR_DURATION = 2000; // 2秒内相同错误只提示一次

function showErrorOnce(message) {
  const now = Date.now();

  if (errorMap.has(message)) {
    const lastTime = errorMap.get(message);

    if (now - lastTime < ERROR_DURATION) {
      return; // 不重复弹
    }
  }

  errorMap.set(message, now);
  ElMessage.error(message);
}
export default service;
