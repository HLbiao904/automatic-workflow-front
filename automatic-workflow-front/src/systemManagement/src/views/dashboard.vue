<template>
  <div class="dashboard">
    <!-- ================= KPI 卡片 ================= -->
    <el-row :gutter="16" class="kpi-row">
      <el-col :span="6" v-for="item in kpiList" :key="item.title">
        <el-card class="kpi-card">
          <div class="kpi-content">
            <div>
              <div class="kpi-title">{{ item.title }}</div>
              <div class="kpi-value">{{ item.value }}</div>
            </div>
            <div class="kpi-icon">{{ item.icon }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- ================= 图表区域 ================= -->
    <el-row :gutter="16" class="chart-row">
      <!-- 执行趋势 -->
      <el-col :span="16">
        <el-card>
          <div class="chart-title">📈 执行趋势</div>
          <div ref="trendRef" class="chart"></div>
        </el-card>
      </el-col>

      <!-- 状态饼图 -->
      <el-col :span="8">
        <el-card>
          <div class="chart-title">🥧 状态分布</div>
          <div ref="pieRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="chart-row">
      <!-- 工作流排行 -->
      <el-col :span="12">
        <el-card class="bar-card">
          <div class="chart-title">🏆 工作流执行排行</div>
          <div ref="barRef" class="chart"></div>
        </el-card>
      </el-col>

      <!-- 节点性能分析 -->
      <el-col :span="12">
        <el-card class="node-card">
          <div class="chart-title">🧠 节点性能分析（Top10 平均耗时）</div>
          <div ref="nodeRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import * as echarts from "echarts";

/* ================= API（使用你封装好的） ================= */
import {
  getDashboardOverview,
  getExecutionTrend,
  getStatusPie,
  getWorkflowTop,
  getNodePerformance,
} from "@/systemManagement/src/api/dashboard.js";
const nodeRef = ref();
let nodeChart;
/* ================= KPI ================= */
const kpi = ref({});

const kpiList = ref([
  { title: "用户数量", value: 0, icon: "👤" },
  { title: "工作流数量", value: 0, icon: "⚙️" },
  { title: "执行次数", value: 0, icon: "🚀" },
  { title: "成功率", value: "0%", icon: "📊" },
]);

/* ================= DOM ================= */
const trendRef = ref();
const pieRef = ref();
const barRef = ref();

/* ================= 图表实例 ================= */
let trendChart, pieChart, barChart;

/* ================= 初始化 ================= */
onMounted(async () => {
  /* ========== KPI ========== */
  const res = await getDashboardOverview();
  kpi.value = res;

  kpiList.value = [
    { title: "用户数量", value: res.userCount, icon: "👤" },
    { title: "工作流数量", value: res.workflowCount, icon: "⚙️" },
    { title: "执行次数", value: res.executionCount, icon: "🚀" },
    {
      title: "成功率",
      value: (res.successRate * 100).toFixed(1) + "%",
      icon: "📊",
    },
  ];

  /* ========== 趋势图 ========== */
  const trendRes = await getExecutionTrend();

  trendChart = echarts.init(trendRef.value);
  trendChart.setOption({
    tooltip: { trigger: "axis" },
    grid: { left: 30, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: trendRes.dates,
    },
    yAxis: { type: "value" },
    series: [
      {
        type: "line",
        smooth: true,
        data: trendRes.counts,
        areaStyle: {},
      },
    ],
  });

  /* ========== 饼图 ========== */
  const resPie = await getStatusPie();
  const list = resPie;

  /* ===== 总数 ===== */
  const total = list.reduce((sum, i) => sum + i.value, 0);

  /* ===== 数据 ===== */
  const pieData = list.map((item) => ({
    name: item.name,
    value: item.value,
  }));

  pieChart = echarts.init(pieRef.value);

  pieChart.setOption({
    tooltip: {
      trigger: "item",
      formatter: "{b}<br/>数量：{c}<br/>占比：{d}%",
    },

    legend: {
      orient: "vertical",
      left: "left",
      textStyle: {
        color: "#666",
      },
    },

    color: [
      "#67C23A", // SUCCESS
      "#F56C6C", // ERROR
      "#E6A23C", // RUNNING
      "#909399", // CANCELLED
    ],

    series: [
      {
        name: "执行状态",
        type: "pie",
        radius: ["55%", "78%"],

        avoidLabelOverlap: true,

        label: {
          show: false, // 企业级一般不直接显示在扇区上
        },

        emphasis: {
          scale: true,
          scaleSize: 8,
          itemStyle: {
            shadowBlur: 15,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.2)",
          },
        },

        data: pieData,
      },
    ],

    /* ===== 中心总数（核心升级） ===== */
    graphic: [
      {
        type: "text",
        left: "center",
        top: "40%",
        style: {
          text: "总执行",
          fontSize: 14,
          fill: "#999",
        },
      },
      {
        type: "text",
        left: "center",
        top: "50%",
        style: {
          text: total.toString(),
          fontSize: 28,
          fontWeight: "bold",
          fill: "#333",
        },
      },
    ],
  });

  /* ========== 柱状图（优化版） ========== */
  const topRes = await getWorkflowTop();
  console.log("工作流执行排行数据", topRes);

  barChart = echarts.init(barRef.value);
  barChart.setOption({
    tooltip: {
      trigger: "axis",
    },

    grid: {
      left: 120,
      right: 20,
      top: 20,
      bottom: 20,
    },

    xAxis: {
      type: "value",
      name: "次数",
    },

    yAxis: {
      type: "category",
      data: topRes.names,
      inverse: true, // 排名从上到下
    },

    series: [
      {
        type: "bar",
        data: topRes.counts,
        itemStyle: {
          borderRadius: [0, 6, 6, 0],
          color: "#409EFF",
        },
        label: {
          show: true,
          position: "right",
        },
      },
    ],
  });

  /* ========== 自适应 ========== */
  window.addEventListener("resize", () => {
    trendChart?.resize();
    pieChart?.resize();
    barChart?.resize();
  });
  /* ========== 节点性能 ========== */
  const nodeRes = await getNodePerformance();
  const nodeList = nodeRes.data || nodeRes;

  /* 排序 */
  nodeList.sort((a, b) => b.avgTime - a.avgTime);

  /* 永远用 ms 做图表 */
  const rawValues = nodeList.map((i) => i.avgTime);
  const names = nodeList.map((i) => i.nodeName);

  nodeChart = echarts.init(nodeRef.value);

  nodeChart.setOption({
    tooltip: {
      trigger: "axis",
      formatter: (params) => {
        const i = params[0].dataIndex;
        return `${names[i]}<br/>耗时: ${formatTime(rawValues[i])}`;
      },
    },

    grid: {
      left: 120,
      right: 20,
      top: 20,
      bottom: 20,
    },

    xAxis: {
      type: "value",
      name: "ms",
      axisLabel: {
        formatter: (val) => `${val} ms`,
      },
    },

    yAxis: {
      type: "category",
      data: names,
      inverse: true,
    },

    series: [
      {
        type: "bar",
        data: rawValues, // 💥 核心：永远 ms

        itemStyle: {
          color: "#409EFF",
          borderRadius: [0, 6, 6, 0],
        },

        label: {
          show: true,
          position: "right",
          formatter: (params) => {
            return formatTime(rawValues[params.dataIndex]);
          },
        },
      },
    ],
  });
});

const formatTime = (ms) => {
  if (ms == null) return "-";

  if (ms < 1000) {
    return `${Math.round(ms)} ms`;
  }

  return `${(ms / 1000).toFixed(2)} s`;
};
</script>

<style scoped>
.dashboard {
  padding: 16px;
  background: #f6f8fb;
}

/* KPI卡片 */
.kpi-card {
  border-radius: 12px;
  transition: all 0.3s;
}
.kpi-card:hover {
  transform: translateY(-3px);
}

.kpi-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.kpi-title {
  font-size: 13px;
  color: #666;
}

.kpi-value {
  font-size: 24px;
  font-weight: bold;
  margin-top: 6px;
}

.kpi-icon {
  font-size: 26px;
}

/* 图表 */
.chart-row {
  margin-top: 16px;
}

.chart {
  height: 340px;
}

.bar-card {
  height: 100%;
}

.chart-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 10px;
}
.node-card {
  height: 100%;
}
</style>
