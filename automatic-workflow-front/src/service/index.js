import axios from "axios";
const service = axios.create({
  baseURL: "http://127.0.0.1:10086",
  timeout: 180000,
});
export default service;
