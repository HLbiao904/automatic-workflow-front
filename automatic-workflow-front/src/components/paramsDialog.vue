<template>
  <el-dialog
    v-model="visible"
    title="节点调试"
    width="95%"
    top="3vh"
    :fullscreen="isFullscreen"
    :close-on-click-modal="false"
    destroy-on-close
    @closed="handleClose"
  >
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <el-button size="small" @click="toggleFullscreen">
        {{ isFullscreen ? "退出全屏" : "全屏模式" }}
      </el-button>
    </div>

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

        <!-- 中：规则或参数 -->
        <pane size="30" :min-size="20">
          <div class="panel">
            <div class="panel-header">
              {{ activeNode?.type === "switch" ? "规则配置" : "参数配置" }}
            </div>

            <!-- switch规则 -->
            <template v-if="activeNode?.type === 'switch'">
              <div class="rule-panel">
                <div
                  v-for="(rule, index) in switchBranches"
                  :key="rule.id"
                  class="rule-row"
                >
                  <template v-if="rule.id !== 'default'">
                    <!-- 字段选择 -->
                    <el-select
                      v-model="rule.field"
                      placeholder="选择字段"
                      size="small"
                      style="width: 120px"
                    >
                      <el-option
                        v-for="field in availableFields"
                        :key="field"
                        :label="field === '$value' ? '整个元素' : field"
                        :value="field"
                      />
                    </el-select>

                    <el-select
                      v-model="rule.operator"
                      size="small"
                      style="width: 100px"
                    >
                      <el-option label="等于" value="==" />
                      <el-option label="不等于" value="!=" />
                      <el-option label="大于" value=">" />
                      <el-option label="小于" value="<" />
                      <el-option label="包含" value="includes" />
                    </el-select>

                    <el-input
                      v-model="rule.value"
                      placeholder="比较值"
                      size="small"
                      style="width: 100px"
                    />

                    <el-button
                      type="danger"
                      size="small"
                      @click="removeRule(index)"
                    >
                      删除
                    </el-button>
                  </template>

                  <template v-else>
                    <div class="default-label">默认分支 (default)</div>
                  </template>
                </div>

                <div style="margin-top: 10px">
                  <el-button type="primary" size="small" @click="addRule">
                    新增规则
                  </el-button>
                </div>
              </div>
            </template>

            <!-- 普通参数 -->
            <template v-else>
              <el-form :model="paramsDialogFormData" label-width="110px">
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
                </el-form-item>
              </el-form>
            </template>
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
import { ref, computed, watch, reactive, onMounted, toRaw } from "vue";
import { Splitpanes, Pane } from "splitpanes";
import "splitpanes/dist/splitpanes.css";
import VueJsonPretty from "vue-json-pretty";
import "vue-json-pretty/lib/styles.css";

/* ================== props ================== */

const props = defineProps({
  showParamsDialog: Boolean,
  paramsDialogFormData: Object,
  activeNode: Object,
  relations: Object,
  inputData: { type: Object, default: () => ({}) },
  outputData: { type: Object, default: () => ({}) },
});

const emit = defineEmits([
  "update:showParamsDialog",
  "run-before-node",
  "execute-step",
  "close-params-dialog",
  "branch-data",
]);

/* ================== 基础状态 ================== */

const running = ref(false);
const isFullscreen = ref(false);
const renderSplit = ref(false);
const isFirstNode = ref(false);

const visible = computed({
  get: () => props.showParamsDialog,
  set: (val) => emit("update:showParamsDialog", val),
});

const switchBranches = reactive([]);

/* ================== 初始化 ================== */

onMounted(() => {
  props.relations?.forEach((obj) => {
    if (obj.curId == props.activeNode?.id && obj.preId == 1) {
      isFirstNode.value = true;
    }
  });
});

/* ================== 节点切换同步规则 ================== */

watch(
  () => props.activeNode?.id,
  () => {
    if (!props.activeNode || props.activeNode.type !== "switch") return;

    if (!props.activeNode.data.branches) {
      props.activeNode.data.branches = [
        {
          id: `case-${Date.now()}`,
          field: "",
          operator: "==",
          value: "",
        },
        { id: "default" },
      ];
    }

    switchBranches.splice(
      0,
      switchBranches.length,
      ...props.activeNode.data.branches,
    );
  },
  { immediate: true },
);

/* ================== 规则变动监听 ================== */

watch(
  switchBranches,
  () => {
    if (!props.activeNode || props.activeNode.type !== "switch") return;
    props.activeNode.data.branches = [...switchBranches];
    triggerBranchRebuild();
    console.log("switchBranches:", props.activeNode.data.branches);
  },
  { deep: true },
);
// 统一把 props.inputData 转为 JS 对象数组
const normalizedInputData = computed(() => {
  let data = props.inputData;

  if (data == null) return [];

  //  如果是字符串，尝试解析成 JSON
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // 解析失败说明它只是普通字符串
      return [{ _value: data }];
    }
  }

  // 对象数组
  if (Array.isArray(data) && typeof data[0] === "object") {
    return data;
  }

  // 单个对象
  if (!Array.isArray(data) && typeof data === "object") {
    return [data];
  }

  // 普通值数组
  if (Array.isArray(data)) {
    return data.map((v) => ({ _value: v }));
  }

  // 单个普通值
  return [{ _value: data }];
});
function extractKeys(obj, prefix = "") {
  const keys = [];
  if (!obj || typeof obj !== "object") return keys;

  Object.keys(obj).forEach((k) => {
    const value = obj[k];
    const path = prefix ? `${prefix}.${k}` : k;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...extractKeys(value, path));
    } else {
      keys.push(path);
    }
  });

  return keys;
}

const availableFields = computed(() => {
  const data = normalizedInputData.value;
  if (!data) return [];

  // 字符串/数字/布尔数组
  if (Array.isArray(data) && typeof data[0] !== "object") {
    return ["$value"]; // 占位，表示整个元素
  }

  // 单个对象或对象数组
  if (Array.isArray(data)) {
    return extractKeys(data[0] || {});
  }
  if (typeof data === "object") {
    return extractKeys(data);
  }
  // 普通值
  return ["$value"];
});
/* ================== 输入变动监听 ================== */

watch(
  () => props.inputData,
  () => {
    triggerBranchRebuild();
  },
  { deep: true },
);

/* ================== 规则操作 ================== */

function addRule() {
  if (!props.activeNode || props.activeNode.type !== "switch") return;

  const newRule = {
    id: `case-${Date.now()}`,
    field: "",
    operator: "==",
    value: "",
  };

  switchBranches.splice(switchBranches.length - 1, 0, newRule);
}

function removeRule(index) {
  if (switchBranches[index].key === "default") return;
  switchBranches.splice(index, 1);
}

/* ================== 分支计算 ================== */

function triggerBranchRebuild() {
  if (!props.activeNode || props.activeNode.type !== "switch") return;
  if (!props.inputData || !Object.keys(props.inputData).length) return;

  const result = buildSwitchBranches(
    normalizedInputData.value,
    props.activeNode,
  );

  emit("branch-data", {
    nodeId: props.activeNode.id,
    branches: result,
  });
}

function buildSwitchBranches(rawInput, node) {
  const items = Array.isArray(rawInput) ? rawInput : [rawInput];
  const branches = node.data?.branches || [];
  const result = {};

  branches.forEach((b) => (result[b.id] = []));

  items.forEach((item) => {
    let matched = false;

    for (const branch of branches) {
      if (branch.id === "default") continue;
      const fieldValue = getFieldValue(item, branch.field);
      if (evaluate(fieldValue, branch.operator, branch.value)) {
        result[branch.id].push(item);
        matched = true;
        break;
      }
    }

    if (!matched) {
      const defaultBranch = branches.find((b) => b.id === "default");
      if (defaultBranch) result[defaultBranch.id].push(item);
    }
  });

  return result;
}
function getFieldValue(obj, path) {
  if (!path) return obj; // 空就返回整个对象

  return path.split(".").reduce((acc, key) => {
    if (acc && typeof acc === "object") {
      return acc[key];
    }
    return undefined;
  }, obj);
}
function evaluate(inputValue, operator, compareValue) {
  // 尝试转数字
  const numInput = Number(inputValue);
  const numCompare = Number(compareValue);

  const isNumberCompare = !isNaN(numInput) && !isNaN(numCompare);

  switch (operator) {
    case "==":
      return inputValue == compareValue;

    case "!=":
      return inputValue != compareValue;

    case ">":
      return isNumberCompare
        ? numInput > numCompare
        : inputValue > compareValue;

    case "<":
      return isNumberCompare
        ? numInput < numCompare
        : inputValue < compareValue;

    case "includes":
      return String(inputValue).includes(compareValue);

    default:
      return false;
  }
}

/* ================== 其它 ================== */

function runBeforeNodes() {
  emit("run-before-node", { id: props.activeNode.id });
}

function executeStep() {
  emit("execute-step", { id: props.activeNode.id });
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
}

function handleClose() {
  renderSplit.value = false;
  emit("close-params-dialog");
}

watch(
  visible,
  (val) => {
    renderSplit.value = val;
  },
  { immediate: true },
);

const hasInput = computed(
  () => props.inputData && Object.keys(props.inputData).length > 0,
);

const hasOutput = computed(
  () => props.outputData && Object.keys(props.outputData).length > 0,
);
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
  background: #fff;
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
.rule-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.default-label {
  font-weight: 500;
  color: #909399;
}
</style>
