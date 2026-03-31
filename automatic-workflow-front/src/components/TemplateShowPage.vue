<template>
  <div class="template-market">
    <!-- 搜索 + 新建 -->
    <div class="top-bar">
      <el-input
        v-model="keyword"
        placeholder="搜索模板..."
        clearable
        style="width: 300px"
      />
      <el-button type="primary" @click="createDialog = true">
        新建模板
      </el-button>
    </div>

    <!-- 分类筛选 -->
    <el-tabs v-model="activeCategory" class="category-tabs" type="card">
      <el-tab-pane
        v-for="c in sortedCategories"
        :key="c.id"
        :label="c.categoryName"
        :name="String(c.id)"
      >
        <div style="padding: 10px"></div>
      </el-tab-pane>
    </el-tabs>

    <!-- 没有模板 -->
    <el-empty v-if="filteredTemplates.length === 0" description="暂无模板">
      <el-button type="primary" @click="createDialog = true">
        新建模板
      </el-button>
    </el-empty>

    <!-- 模板列表 -->
    <el-row v-else :gutter="20">
      <el-col v-for="item in filteredTemplates" :key="item.id" :span="6">
        <el-card class="template-card" shadow="hover">
          <div class="cover">
            <span>工作流模版</span>
            <el-tag size="small" class="cate-tag">
              {{ getCategoryName(item.categoryId) }}
            </el-tag>
          </div>

          <div class="card-header">
            <span class="title">{{ item.templateName }}</span>
            <el-tag size="small" :type="item.status === 1 ? 'success' : 'info'">
              {{ item.status === 1 ? "已发布" : "草稿" }}
            </el-tag>
          </div>
          <div class="desc">{{ item.description || "暂无描述" }}</div>
          <div class="creator">
            <img :src="getTemplateAvatar(item.id)" class="avatar" />
            <span class="username">{{ getTemplateUsername(item.id) }}</span>
          </div>

          <div class="meta">
            <div class="node-icons">
              <img
                v-for="icon in getTemplateIcons(item.id)"
                :key="icon"
                :src="icon"
                class="node-icon"
              />
            </div>
            <div class="stats">
              <span>⬛ 节点 {{ getNodeCount(item.nodesJson) }}</span>
              <span>🔥 使用 {{ item.useCount || 0 }}</span>
            </div>
          </div>

          <div class="actions">
            <el-button size="small" @click="preview(item)"> 预览 </el-button>
            <el-button
              v-if="item.status === 1"
              type="primary"
              size="small"
              @click="useTemplate(item)"
            >
              使用模板
            </el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新建模板 Dialog -->
    <el-dialog v-model="createDialog" title="新建模板" width="500px">
      <el-form :model="templateForm" label-width="90px">
        <el-form-item label="模板名称">
          <el-input v-model="templateForm.name" />
        </el-form-item>

        <el-form-item label="模板描述">
          <el-input v-model="templateForm.description" type="textarea" />
        </el-form-item>

        <el-form-item label="模板分类">
          <div style="display: flex; gap: 10px; width: 100%">
            <el-select
              v-model="templateForm.categoryId"
              placeholder="选择分类"
              style="flex: 1"
            >
              <el-option
                v-for="c in sortedCategories"
                :key="c.id"
                :label="c.categoryName"
                :value="c.id"
              />
            </el-select>
            <el-button @click="categoryDialog = true"> 添加 </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialog = false"> 取消 </el-button>
        <el-button type="primary" @click="submitTemplate"> 确定 </el-button>
      </template>
    </el-dialog>

    <!-- 新增分类 Dialog -->
    <el-dialog v-model="categoryDialog" title="新增分类" width="400px">
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="分类名称">
          <el-input v-model="categoryForm.name" />
        </el-form-item>

        <el-form-item label="分类描述">
          <el-input v-model="categoryForm.description" />
        </el-form-item>

        <el-form-item label="优先级">
          <el-input-number
            v-model="categoryForm.sort"
            :min="0"
            :max="10"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="categoryDialog = false"> 取消 </el-button>
        <el-button type="primary" @click="submitCategory"> 确定 </el-button>
      </template>
    </el-dialog>
    <TemplatePreview
      :preViewData="preViewData"
      v-model:visible="showPreview"
      @delete="deleteTemplate"
      @publish="publishTemplate"
      @draft="draftTemplate"
    />
  </div>
</template>

<script setup>
import { ElMessage } from "element-plus";
import { ref, computed, onMounted } from "vue";
import service from "../service/index.js";
import TemplatePreview from "./TemplatePreview.vue";

const keyword = ref("");
const activeCategory = ref("0"); // 默认选中“全部”

const createDialog = ref(false);
const categoryDialog = ref(false);
const showPreview = ref(false);
const preViewData = ref(null);
const templateInfoList = ref([]);
const templateForm = ref({
  name: "",
  description: "",
  categoryId: null,
});

const categoryForm = ref({
  name: "",
  description: "",
  sort: 1,
});

const templates = ref([]);
const categories = ref([]);
const emit = defineEmits(["use-template", "create-template"]);

defineExpose({
  preview,
});
// 获取分类和模板
onMounted(async () => {
  const res = await service.get("/workflowTemplate/templateList");

  if (res.status === 200) {
    templates.value = res.data;
    for (const item of res.data) {
      const templateNodes = await getTemplateInfo(
        item.nodesJson,
        item.id,
        item.userId,
      );

      templateInfoList.value.push(templateNodes);
    }
  }

  const cate = await service.get("/workflowTemplate/templateCategoryList");

  if (cate.status === 200) {
    categories.value = cate.data;
  }
});

// 给分类加“全部”选项，优先级最大
const sortedCategories = computed(() => {
  // const all = { id: 0, categoryName: "全部", sort: 999 };
  return [...categories.value].sort((a, b) => b.sort - a.sort);
});

// 筛选模板
const filteredTemplates = computed(() => {
  let list = templates.value;
  console.log(activeCategory.value, templates.value);
  if (activeCategory.value !== "0") {
    list = list.filter(
      (t) => Number(t.categoryId) === Number(activeCategory.value),
    );
  }
  if (keyword.value) {
    list = list.filter((t) => t.templateName.includes(keyword.value));
  }
  console.log("list", list);
  return list;
});
async function getTemplateInfo(nodesJson, templateId, userId) {
  const templateNodes = {
    templateId,
    nodeIcons: [],
    userAvatar: null,
    userName: null,
  };

  const nodes = JSON.parse(nodesJson);

  const nodeIdList = [
    ...new Set(
      nodes
        .filter((item) => item.data && item.data.nodeId)
        .map((item) => item.data.nodeId),
    ),
  ];

  // 发送 POST 请求，body 直接传数组
  const iconRes = await service.post(
    "/workflowTemplate/getTemplateNodeIconsByNodeIdList",
    nodeIdList,
  );
  // console.log("iconRes", iconRes);
  const OssIcons = []; //云图标
  const localIcons = []; //本地图标
  iconRes.data.forEach((item) => {
    OssIcons.push(item.icon);
    localIcons.push(item.local_icon);
  });
  templateNodes.nodeIcons = localIcons || OssIcons;

  // 获取用户信息
  const user = await service.get(`/user/queryUserById/${userId}`);

  templateNodes.userAvatar = user.data.avatar;
  templateNodes.userName = user.data.username;

  return templateNodes;
}
function getTemplateIcons(templateId) {
  const info = templateInfoList.value.find((t) => t.templateId === templateId);

  if (!info) return [];

  // 去重
  const uniqueIcons = [...new Set(info.nodeIcons)];

  // 最多显示5个
  return uniqueIcons.slice(0, 7);
}

function getTemplateAvatar(templateId) {
  const info = templateInfoList.value.find((t) => t.templateId == templateId);
  return info?.userAvatar || "";
}
function getTemplateUsername(templateId) {
  const info = templateInfoList.value.find((t) => t.templateId == templateId);
  return info?.userName || "";
}
function getCategoryName(categoryId) {
  const cate = categories.value.find((c) => c.id == categoryId);
  return cate ? cate.categoryName : "";
}
async function deleteTemplate(templateId) {
  const res = await service.delete(`/workflowTemplate/${templateId}`);
  if (res.status === 200) {
    ElMessage.success("模板删除成功");
    service.get("/workflowTemplate/templateList").then((res) => {
      if (res.status === 200) templates.value = res.data;
    });
  }
}
async function publishTemplate(data) {
  const res = await service.put(
    `/workflowTemplate/updateTemplateStatus/${data.id}/${data.status}`,
  );
  if (res.status === 200) {
    ElMessage.success("模板发布成功");
    service.get("/workflowTemplate/templateList").then((res) => {
      if (res.status === 200) templates.value = res.data;
    });
    preViewData.value.status = 1;
  }
}
async function draftTemplate(data) {
  const res = await service.put(
    `/workflowTemplate/updateTemplateStatus/${data.id}/${data.status}`,
  );
  if (res.status === 200) {
    ElMessage.success("设为草稿成功");
    service.get("/workflowTemplate/templateList").then((res) => {
      if (res.status === 200) templates.value = res.data;
    });
    preViewData.value.status = 0;
  }
}
function getNodeCount(nodesJson) {
  try {
    return JSON.parse(nodesJson).length;
  } catch {
    return 0;
  }
}

function preview(row) {
  console.log("预览模板", row);
  // 获取模版创建者
  service.get(`/user/queryUserById/${row.userId}`).then((res) => {
    if (res.status === 200) {
      showPreview.value = true;
      preViewData.value = {
        ...row,
      };
      preViewData.value.username = res.data.username;
      preViewData.value.avatar = res.data.avatar;
    }
  });
}

function useTemplate(row) {
  ElMessageBox.confirm("使用模板将创建一个新的工作流，是否继续？", "使用模板", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      emit("use-template", row);
    })
    .catch(() => {});
}
// 新建模板
function submitTemplate() {
  emit("create-template", templateForm.value);
  createDialog.value = false;
}

// 新增分类
function submitCategory() {
  service
    .post("/workflowTemplate/createTemplateCategory", {
      categoryName: categoryForm.value.name,
      description: categoryForm.value.description,
      sort: categoryForm.value.sort,
    })
    .then((res) => {
      if (res.status === 200) {
        service.get("/workflowTemplate/templateCategoryList").then((res) => {
          if (res.status === 200) categories.value = res.data;
        });
      }
    });

  categoryDialog.value = false;
  categoryForm.value = { name: "", description: "", sort: 1 };
}
</script>

<style scoped>
.template-market {
  padding: 20px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.category-tabs {
  margin-bottom: 20px;
}

.template-card {
  margin-bottom: 20px;
  transition: all 0.25s;
}

.template-card:hover {
  transform: translateY(-6px);
}

.cover {
  height: 48px;
  background: linear-gradient(135deg, #5b8cff, #7f9cff);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  color: white;
  font-weight: 600;
  margin-bottom: 10px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 22px;
  flex: 1;

  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desc {
  color: #606266;
  font-size: 13px;
  line-height: 18px;

  height: 36px;

  display: flex;
  align-items: center;

  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  font-size: 12px;
  color: #999;
  display: flex;
  justify-content: space-between;
  flex-direction: column;
  margin-bottom: 10px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.cate-tag {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}
.node-icons {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.node-icon {
  width: 20px;
  height: 20px;
}

.creator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}
.stats {
  display: flex;
  justify-content: end;
  gap: 14px;
  font-size: 12px;
  color: #666;
}
.creator {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.username {
  font-size: 12px;
  color: #666;
}
</style>
