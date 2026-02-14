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
        <pane size="33">
          <div class="panel">
            <div class="panel-header">输入数据</div>
            <div class="json-box">
              <vue-json-pretty
                :data="inputData"
                :deep="3"
                :showLineNumber="true"
                :collapsedOnClickBrackets="true"
              />
            </div>
          </div>
        </pane>

        <!-- 中：参数 -->
        <pane size="34">
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
                <el-button type="success" :loading="running" @click="runNode">
                  执行节点
                </el-button>

                <!-- <el-button @click="closeDialog"> 关闭 </el-button> -->
              </el-form-item>
            </el-form>
          </div>
        </pane>

        <!-- 右：输出 -->
        <pane size="33">
          <div class="panel">
            <div class="panel-header">输出数据</div>
            <div class="json-box">
              <vue-json-pretty
                :data="outputData"
                :deep="3"
                :showLineNumber="true"
                :collapsedOnClickBrackets="true"
              />
            </div>
          </div>
        </pane>
      </splitpanes>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

const props = defineProps({
  showParamsDialog: Boolean,
  paramsDialogFormData: Object,
  paramsDialogRules: Object,
  activeNode: Object,
  inputData: {
    type: Object,
    default: () => ({}),
  },
  outputData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(["update:showParamsDialog", "run-node"]);

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

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

function closeDialog() {
  emit("update:showParamsDialog", false);
}

async function runNode() {
  try {
    running.value = true;

    await emit("run-node", {
      nodeId: props.paramsDialogFormData.nodeId,
      params: props.activeNode?.data?.params || [],
      input: props.inputData,
    });
  } finally {
    running.value = false;
  }
}
</script>

<style scoped>
.toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
}

.panel-wrapper {
  height: 75vh;
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
</style>
