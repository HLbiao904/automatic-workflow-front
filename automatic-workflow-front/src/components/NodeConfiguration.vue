<template>
  <div style="padding: 20px">
    <el-table :data="nodes" border style="width: 100%">
      <el-table-column prop="nodeId" label="节点ID" width="200" />

      <el-table-column prop="label" label="节点名称" width="200" />

      <el-table-column prop="type" label="节点类型" width="150" />

      <el-table-column label="图标" width="120">
        <template #default="{ row }">
          <img
            accept="image/png,image/jpeg,image/svg+xml"
            v-if="row.localIcon || row.icon"
            :src="row.localIcon || row.icon"
            style="width: 32px; height: 32px"
          />
          <span v-else>无</span>
        </template>
      </el-table-column>

      <el-table-column label="操作">
        <template #default="{ row }">
          <div style="display: flex; gap: 10px">
            <!-- 上传到阿里云 -->
            <el-upload
              :show-file-list="false"
              :before-upload="checkFile"
              :http-request="(file) => uploadOss(file, row)"
            >
              <el-button size="small" type="primary"> 云图标 </el-button>
            </el-upload>
            <!-- 上传到本地 -->
            <el-upload
              style="margin-left: 10px"
              :show-file-list="false"
              :before-upload="checkFile"
              :http-request="(file) => uploadLocal(file, row)"
            >
              <el-button size="small" type="primary"> 本地图标 </el-button>
            </el-upload>
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import service from "../service/index.js";

const nodes = ref([]);

onMounted(async () => {
  const res = await service.get("/api/workflow/getNodes");
  nodes.value = res.data;
});

/* 文件格式校验 */
function checkFile(file) {
  const allowTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml"];

  if (!allowTypes.includes(file.type)) {
    ElMessage.error("只允许上传 PNG / JPG / SVG 格式图标");
    return false;
  }

  const isLt2M = file.size / 1024 / 1024 < 2;

  if (!isLt2M) {
    ElMessage.error("图标大小不能超过 2MB");
    return false;
  }

  return true;
}

async function uploadOss(file, row) {
  const formData = new FormData();
  formData.append("file", file.file);
  formData.append("nodeId", row.nodeId);

  const res = await service.post("/nodes/uploadIcon", formData);

  row.icon = res.data.url;
}
async function uploadLocal(file, row) {
  const formData = new FormData();
  formData.append("file", file.file);
  formData.append("nodeId", row.nodeId);

  const res = await service.post("/nodes/uploadLocalIcon", formData);
  // 返回本地路径
  row.localIcon = res.data.url;

  ElMessage.success("本地图标上传成功");
}
</script>
