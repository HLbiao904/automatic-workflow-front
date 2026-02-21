<template>
  <el-dialog
    v-model="visible"
    title="节点调试"
    width="95%"
    top="3vh"
    :fullscreen="isFullscreen"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="renderSplit = false"
  >
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <el-button size="small" @click="toggleFullscreen">
        {{ isFullscreen ? "退出全屏" : "全屏模式" }}
      </el-button>
    </div>

    <!-- 三栏横向结构 -->
    <div class="panel-wrapper">
      <splitpanes class="default-theme" v-if="renderSplit">
        <!-- 左：输入 -->
        <pane size="33" :min-size="30">
          <div class="panel">
            <div class="panel-header">输入数据</div>
            <div class="json-box">
              <template v-if="hasInput">
                <vue-json-pretty
                  :data="inputData"
                  :deep="3"
                  :showLineNumber="true"
                  :collapsedOnClickBrackets="true"
                />
              </template>

              <template v-else>
                <div class="empty-box" v-if="!isFirstNode">
                  <div class="empty-info">暂无输入数据</div>
                  <el-button type="primary" @click="runBeforeNodes">
                    执行上游节点
                  </el-button>
                </div>
                <div class="empty-box" v-else>
                  <div class="empty-info">无输入数据</div>
                </div>
              </template>
            </div>
          </div>
        </pane>

        <!-- 中：参数 -->
        <pane size="30" :min-size="20">
          <div class="panel">
            <div class="panel-header">参数配置</div>

            <el-form :model="paramsDialogFormData" label-width="110px">
              <el-form-item label="Node ID">
                <el-input v-model="paramsDialogFormData.nodeId" disabled />
              </el-form-item>

              <el-form-item label="Description">
                <el-input v-model="paramsDialogFormData.description" disabled />
              </el-form-item>

              <el-form-item label="Type">
                <el-input v-model="paramsDialogFormData.type" disabled />
              </el-form-item>

              <el-divider />

              <el-form-item
                v-for="p in activeNode?.data?.params || []"
                :key="p.name"
                :label="p.name"
              >
                <el-input v-model="p.value" :placeholder="p.desc" clearable />
              </el-form-item>

              <el-form-item>
                <el-button
                  type="success"
                  :loading="running"
                  @click="executeStep"
                >
                  执行下一步
                </el-button>

                <!-- <el-button @click="closeDialog"> 关闭 </el-button> -->
              </el-form-item>
            </el-form>
            <div>
              <VideoPlayer v-if="videoPath" :path="videoPath" />
            </div>
          </div>
        </pane>

        <!-- 右：输出 -->
        <pane size="33" :min-size="30">
          <div class="panel">
            <div class="panel-header">输出数据</div>
            <div class="json-box">
              <template v-if="hasOutput">
                <vue-json-pretty
                  :data="outputData"
                  :deep="3"
                  :showLineNumber="true"
                  :collapsedOnClickBrackets="true"
                />
              </template>

              <template v-else>
                <div class="empty-box">
                  <div class="empty-info">暂无输出数据</div>
                  <el-button type="primary" @click="executeStep">
                    执行下一步
                  </el-button>
                </div>
              </template>
            </div>
          </div>
        </pane>
      </splitpanes>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";
import VideoPlayer from "../components/videoPlayer.vue";

const videoPath = ref("");
const isFirstNode = ref(false);
const props = defineProps({
  showParamsDialog: Boolean,
  paramsDialogFormData: Object,
  paramsDialogRules: Object,
  activeNode: Object,
  relations: Object,
  inputData: {
    type: Object,
    default: () => ({}),
  },
  outputData: {
    type: Object,
    default: () => ({}),
  },
});
onMounted(() => {
  props.relations.forEach((obj, index) => {
    if (obj.curId == props.activeNode.id && obj.preId == 1) {
      isFirstNode.value = true;
    }
  });
});
const emit = defineEmits([
  "update:showParamsDialog",
  "run-before-node",
  "execute-step",
]);

const running = ref(false);
const isFullscreen = ref(false);
const renderSplit = ref(false);
const visible = computed({
  get: () => props.showParamsDialog,
  set: (val) => emit("update:showParamsDialog", val),
});
watch(
  visible,
  (val) => {
    renderSplit.value = val;
  },
  { immediate: true },
);
const hasInput = computed(() => {
  return props.inputData && Object.keys(props.inputData).length > 0;
});
const hasOutput = computed(() => {
  return props.outputData && Object.keys(props.outputData).length > 0;
});

async function runBeforeNodes() {
  running.value = true;
  try {
    emit("run-before-node", { id: props.activeNode.id });
  } finally {
    running.value = false;
  }
}
async function executeStep() {
  try {
    running.value = true;
    emit("execute-step", { id: props.activeNode.id });
  } finally {
    running.value = false;
  }
}
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

function closeDialog() {
  emit("update:showParamsDialog", false);
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.panel-wrapper {
  height: 80vh;
  min-height: 600px;
}

.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
}

.panel-header {
  font-weight: 600;
  margin-bottom: 10px;
  font-size: 15px;
}

.json-box {
  flex: 1;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px;
}
.empty-box {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}
.empty-info {
  margin-bottom: 5px;
}
</style>
