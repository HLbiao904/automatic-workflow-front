<template>
  <div class="page">
    <!-- ================= 左侧 ================= -->
    <div class="left">
      <el-input
        v-model="keyword"
        placeholder="搜索节点..."
        clearable
        class="search"
      />

      <div class="section-title">
        <div class="icon-title">
          <img src="../assets/category.svg" />
          <span>分类</span>
        </div>
      </div>

      <div
        v-for="c in categoryList"
        :key="c.id"
        class="category-item"
        :class="{
          active: activeCategory === c.id && viewMode === 'category',
        }"
        @click="switchCategory(c)"
      >
        <img class="cat-icon" :src="c.localIcon || defaultCatIcon" />
        <span>{{ c.label }}</span>
      </div>

      <div class="divider"></div>

      <div class="section-title">
        <div class="icon-title">
          <img src="../assets/node.svg" />
          <span>全部节点</span>
        </div>
      </div>

      <div class="node-list">
        <div
          v-for="n in filteredAllNodes"
          :key="n.nodeId"
          class="node-item"
          @click="selectAllNode(n)"
        >
          <img :src="n.localIcon || n.icon || defaultIcon" />
          <div class="text">
            <div class="name">{{ n.label }}</div>
            <div class="type">{{ n.type }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 中间 ================= -->
    <div class="center">
      <div class="header">
        <div class="title">
          <img class="title-icon" src="../assets/node.svg" />
          <span>系统节点</span>
          <span class="breadcrumb"> / {{ breadcrumb }} </span>
        </div>

        <el-button type="primary" @click="openCreate"> + 新建节点 </el-button>
      </div>

      <div class="grid">
        <div
          v-for="n in filteredNodes"
          :key="n.nodeId"
          class="card"
          @click="openDetail(n)"
        >
          <!-- 上半部分 -->
          <div class="card-body">
            <img :src="n.localIcon || n.icon || defaultIcon" class="icon" />

            <div class="info">
              <div class="name">{{ n.label }}</div>
              <div class="desc">{{ n.description }}</div>

              <div class="tags">
                <el-tag size="small">{{ n.type }}</el-tag>
                <el-tag
                  size="small"
                  :type="n.status === 1 ? 'success' : 'danger'"
                >
                  {{ n.status === 1 ? "启用" : "禁用" }}
                </el-tag>
              </div>
            </div>
          </div>

          <!-- 下半部分（右下角操作区） -->
          <div class="card-footer">
            <el-button
              size="small"
              text
              type="primary"
              @click.stop="openEdit(n)"
            >
              编辑
            </el-button>

            <el-switch
              v-model="n.status"
              :active-value="1"
              :inactive-value="0"
              @change="toggleStatus(n)"
              @click.stop
            />
          </div>
        </div>
      </div>
    </div>

    <!-- ================= 右侧详情 ================= -->
    <el-drawer v-model="drawer" size="420px" title="节点详情">
      <div v-if="currentNode" class="detail">
        <img class="detail-icon" :src="currentNode.localIcon || defaultIcon" />

        <h3>{{ currentNode.label }}</h3>
        <el-tag>{{ currentNode.type }}</el-tag>

        <p class="desc">{{ currentNode.description }}</p>

        <div class="meta">
          <div><b>NodeID：</b>{{ currentNode.nodeId }}</div>
          <div><b>分类：</b>{{ getCategoryName(currentNode.id) }}</div>
          <div>
            <b>状态：</b>
            <el-tag :type="currentNode.status === 1 ? 'success' : 'danger'">
              {{ currentNode.status === 1 ? "启用" : "禁用" }}
            </el-tag>
          </div>
        </div>

        <div class="json-box">
          <div class="title">参数配置</div>
          <pre>{{ formatJson(currentNode.params) }}</pre>
        </div>
      </div>

      <div v-else class="empty">请选择节点查看详情</div>
    </el-drawer>

    <!-- ================= 新建 Dialog ================= -->
    <el-dialog v-model="createDialog" title="新建节点" width="520px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="类型" prop="type">
          <el-input v-model="form.type" disabled />
        </el-form-item>

        <el-form-item label="名称" prop="label">
          <el-input v-model="form.label" />
        </el-form-item>

        <el-form-item label="NodeID" prop="nodeId">
          <el-input v-model="form.nodeId" />
        </el-form-item>

        <el-form-item label="描述" prop="description">
          <el-input v-model="form.description" type="textarea" />
        </el-form-item>

        <el-form-item label="分类" prop="categoryId">
          <el-select v-model="form.categoryId">
            <el-option
              v-for="c in categoryList"
              :key="c.id"
              :label="c.label"
              :value="c.id"
              :disabled="c.categoryOrder == 1"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-switch
            v-model="form.status"
            :active-value="1"
            :inactive-value="0"
          />
        </el-form-item>

        <!-- 本地图标 -->
        <el-form-item label="本地图标">
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handleLocalUpload"
          >
            <img
              v-if="form.localIcon"
              :src="form.localIcon"
              class="upload-preview"
            />
            <div v-else class="upload-box">点击上传</div>
          </el-upload>
        </el-form-item>

        <!-- 云端图标 -->
        <el-form-item label="云端图标">
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handleRemoteUpload"
          >
            <img v-if="form.icon" :src="form.icon" class="upload-preview" />
            <div v-else class="upload-box">上传到云端</div>
          </el-upload>
        </el-form-item>

        <el-form-item label="参数(JSON)" prop="params">
          <el-input v-model="form.params" type="textarea" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="createDialog = false">取消</el-button>
        <el-button type="primary" @click="submitCreate">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="editDialog" title="编辑节点" width="520px">
      <el-form :model="editForm" label-width="100px">
        <el-form-item label="NodeID">
          <el-input v-model="editForm.nodeId" disabled />
        </el-form-item>
        <el-form-item label="节点名称">
          <el-input v-model="editForm.label" />
        </el-form-item>

        <el-form-item label="节点描述">
          <el-input v-model="editForm.description" type="textarea" />
        </el-form-item>
        <!-- 图标 -->
        <el-form-item label="节点图标">
          <el-upload
            :show-file-list="false"
            :auto-upload="false"
            :on-change="handleEditUpload"
          >
            <img
              v-if="editForm.localIcon"
              :src="editForm.localIcon"
              class="upload-preview"
            />
            <div v-else class="upload-box">上传图标</div>
          </el-upload>
        </el-form-item>

        <!-- 参数 -->
        <el-form-item label="参数(JSON)">
          <el-input v-model="editForm.params" type="textarea" disabled />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialog = false">取消</el-button>
        <el-button type="primary" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import {
  getNodeList,
  getAllNodeList,
  getCategoryList,
  updateNode,
  uploadIcon,
  uploadLocalIcon,
  addNode,
} from "@/systemManagement/src/api/node";
/* ================= 编辑 ================= */
const editDialog = ref(false);

const editForm = ref({
  id: null,
  nodeId: "",
  description: "",
  label: "",
  icon: "",
  params: "{}",
});

/* 打开编辑 */
const openEdit = (node) => {
  editDialog.value = true;

  editForm.value = {
    ...node,
    params:
      typeof node.params === "string"
        ? node.params
        : JSON.stringify(node.params, null, 2),
  };
};

/* 上传图标 */
const handleEditUpload = async (file) => {
  const res = await uploadLocalIcon(file.raw, editForm.value.nodeId);
  editForm.value.localIcon = res.url;
};

/* 提交编辑 */
const submitEdit = async () => {
  if (!editForm.value.label) {
    ElMessage.warning("节点名称不能为空");
    return;
  }

  try {
    JSON.parse(editForm.value.params);
  } catch (e) {
    ElMessage.error("参数必须是合法JSON");
    return;
  }

  await updateNode({
    ...editForm.value,
    params: editForm.value.params,
  });

  ElMessage.success("修改成功");

  editDialog.value = false;

  loadNodes();
  allNodeList.value = await getAllNodeList();
};
/* ================= 状态 ================= */
const keyword = ref("");
const drawer = ref(false);

const activeCategory = ref(null);
const viewMode = ref("category");

const categoryList = ref([]);
const nodeList = ref([]);
const allNodeList = ref([]);

const currentNode = ref(null);

/* ================= 新建 ================= */
const createDialog = ref(false);
const formRef = ref(null);

const form = ref({
  type: "COMMON",
  label: "",
  nodeId: "",
  description: "",
  params: "{}",
  localIcon: "",
  icon: "",
  status: 1,
  categoryId: null,
});

const rules = {
  type: [{ required: true }],
  label: [{ required: true, message: "必填", trigger: "blur" }],
  nodeId: [{ required: true, message: "必填", trigger: "blur" }],

  description: [{ required: true, message: "请输入描述", trigger: "blur" }],

  categoryId: [{ required: true, message: "请选择分类", trigger: "change" }],

  params: [
    { required: true, message: "请输入参数", trigger: "blur" },
    {
      validator: (rule, value, callback) => {
        try {
          JSON.parse(value);
          callback();
        } catch (e) {
          callback(new Error("必须是合法JSON"));
        }
      },
      trigger: "blur",
    },
  ],
};

/* ================= 图标 ================= */
const defaultIcon = "https://cdn-icons-png.flaticon.com/512/4712/4712027.png";

const defaultCatIcon =
  "https://cdn-icons-png.flaticon.com/512/3767/3767084.png";

/* ================= 本地图标上传 ================= */
const handleLocalUpload = async (file) => {
  try {
    if (!form.value.nodeId) {
      ElMessage.warning("请先填写 NodeID");
      return;
    }

    const res = await uploadLocalIcon(file.raw, form.value.nodeId);

    form.value.localIcon = res.url;

    ElMessage.success("本地图标上传成功");
  } catch (e) {
    ElMessage.error("上传失败");
  }
};

/* ================= 云端图标上传 ================= */
const handleRemoteUpload = async (file) => {
  try {
    if (!form.value.nodeId) {
      ElMessage.warning("请先填写 NodeID");
      return;
    }

    const res = await uploadIcon(file.raw, form.value.nodeId);

    form.value.icon = res.url;

    ElMessage.success("云端图标上传成功");
  } catch (e) {
    ElMessage.error("上传失败");
  }
};

/* ================= 初始化 ================= */
onMounted(async () => {
  categoryList.value = await getCategoryList();
  console.log("分类list", categoryList.value);

  if (categoryList.value.length > 0) {
    activeCategory.value = categoryList.value[0].id;
    loadNodes();
  }

  allNodeList.value = await getAllNodeList();
});

/* ================= 加载 ================= */
const loadNodes = async () => {
  nodeList.value = await getNodeList({
    categoryId: activeCategory.value,
  });
};

/* ================= 切换分类 ================= */
const switchCategory = (c) => {
  activeCategory.value = c.id;
  viewMode.value = "category";
  loadNodes();
};

/* ================= 全部节点 ================= */
const selectAllNode = (node) => {
  viewMode.value = "all";
  currentNode.value = node;
  drawer.value = true;
};

/* ================= 展示 ================= */
const filteredNodes = computed(() => {
  const list = viewMode.value === "all" ? allNodeList.value : nodeList.value;

  return list.filter((n) => n.label?.includes(keyword.value));
});

const filteredAllNodes = computed(() =>
  allNodeList.value.filter((n) => n.label?.includes(keyword.value)),
);

/* ================= breadcrumb ================= */
const breadcrumb = computed(() => {
  if (viewMode.value === "all") return "全部节点";

  const cat = categoryList.value.find((c) => c.id === activeCategory.value);

  return cat?.label || "未分类";
});

/* ================= 详情 ================= */
const openDetail = (node) => {
  currentNode.value = node;
  drawer.value = true;
};

const getCategoryName = (id) => {
  return categoryList.value.find((c) => c.id === id)?.label || "未知";
};

/* ================= 状态 ================= */
const toggleStatus = async (node) => {
  await updateNode({
    ...node,
    status: node.status,
  });
};

/* ================= 新建 ================= */
const openCreate = () => {
  createDialog.value = true;

  form.value = {
    type: "COMMON",
    label: "",
    nodeId: "",
    description: "",
    params: "{}",
    localIcon: "",
    icon: "",
    status: 1,
    categoryId: null,
  };
};

const submitCreate = async () => {
  await formRef.value.validate();

  const res = await addNode({
    ...form.value,
    type: "COMMON",
  });
  if (res) {
    ElMessage.success("节点创建成功");
  } else {
    ElMessage.error(res.message || "节点创建失败");
    return;
  }
  createDialog.value = false;
  loadNodes();
  allNodeList.value = await getAllNodeList();
};
/* ================= JSON ================= */
const formatJson = (val) => {
  try {
    return JSON.stringify(
      typeof val === "string" ? JSON.parse(val) : val,
      null,
      2,
    );
  } catch {
    return val || "{}";
  }
};
</script>

<style scoped lang="scss">
.page {
  display: flex;
  height: 100%;
  background: #f5f7fb;
}

/* ================= 左侧 ================= */
.left {
  width: 260px;
  background: #fff;
  border-right: 1px solid #eee;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.search {
  margin-bottom: 8px;
}

.section-title {
  font-size: 14px;
  color: #999;
  margin-top: 10px;
  .icon-title {
    display: flex;
    align-items: center;
    gap: 6px;
    img {
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }
  }
}

/* 分类项 */
.category-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
}

.category-item:hover {
  background: #f0f6ff;
}

.category-item.active {
  background: #409eff;
  color: #fff;
}

.cat-icon {
  width: 18px;
  height: 18px;
}

/* 全部节点列表 */
.node-list {
  flex: 1;
  overflow-y: auto;
}

.node-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}

.node-item:hover {
  background: #f5f7ff;
}

.node-item img {
  width: 28px;
  height: 28px;
  border-radius: 6px;
}

/* ================= 中间 ================= */
.center {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
/* 上传 */
.upload-box {
  width: 60px;
  height: 60px;
  border: 1px dashed #ccc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #999;
  cursor: pointer;
}

.upload-preview {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #eee;
}
/* 标题 + breadcrumb */
.title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
}

.title-icon {
  width: 20px;
  height: 20px;
}

.breadcrumb {
  font-size: 13px;
  color: #999;
}

/* 卡片网格 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  overflow-y: auto;
}

/* 卡片 */
/* 卡片网格 */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  overflow-y: auto;
}

/* 卡片 */
.card {
  background: #fff;
  padding: 14px;
  border-radius: 12px;

  display: flex;
  flex-direction: column; // 关键：纵向布局
  // justify-content: space-between;

  min-height: 95px; // 建议加，统一高度
  transition: 0.2s;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
}

/* 上半部分 */
.card-body {
  display: flex;
  gap: 12px;
  align-items: center;
}

/* 图标 */
.icon {
  width: 42px;
  height: 42px;
  border-radius: 8px;
}

/* 信息区 */
.info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.name {
  font-weight: 600;
  font-size: 14px;
}

.desc {
  font-size: 12px;
  color: #888;
}

.tags {
  display: flex;
  gap: 6px;
}

/* 底部操作区（右下角） */
.card-footer {
  display: flex;
  justify-content: flex-end; // 靠右
  align-items: center;
  gap: 10px;
}

/* ================= 右侧 ================= */
.detail {
  padding: 10px;
}

.detail-icon {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  margin-bottom: 10px;
}

.meta {
  margin-top: 12px;
  font-size: 13px;
  line-height: 26px;
}

.json-box {
  margin-top: 16px;
  background: #f6f8fb;
  padding: 10px;
  border-radius: 8px;
}

.json-box pre {
  font-size: 12px;
  white-space: pre-wrap;
}

.empty {
  text-align: center;
  color: #999;
  margin-top: 40px;
}

.card-footer {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
</style>
