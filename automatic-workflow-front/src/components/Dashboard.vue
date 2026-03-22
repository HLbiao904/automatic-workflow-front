<template>
  <div class="dashboard">
    <h1>工作流仪表盘</h1>

    <!-- 统计卡片 -->

    <div class="cards">
      <div class="card">
        <h3>总运行数</h3>
        <p>{{ overview.totalRuns }}</p>
      </div>

      <div class="card success">
        <h3>成功</h3>
        <p>{{ overview.successCount }}</p>
      </div>

      <div class="card error">
        <h3>失败</h3>
        <p>{{ overview.errorCount }}</p>
      </div>

      <div class="card">
        <h3>平均运行时间</h3>
        <p>
          {{
            overview.avgDuration >= 1000
              ? (overview.avgDuration / 1000).toFixed(1) + " s"
              : Math.floor(overview.avgDuration) + " ms"
          }}
        </p>
      </div>
    </div>

    <!-- 图表 -->

    <div class="charts">
      <div id="trendChart" class="chart"></div>

      <div id="statusChart" class="chart"></div>
    </div>

    <div class="charts">
      <div id="nodeRankChart" class="chart"></div>

      <div id="nodeTimeChart" class="chart"></div>
    </div>

    <!-- 最近执行 -->

    <h2 class="section-title">最近执行</h2>

    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Workflow</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Start Time</th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="r in recent" :key="r.startTime">
            <td class="wf">{{ r.workflowName }}</td>

            <td>
              <span class="status" :class="r.status.toLowerCase()">
                {{ r.status }}
              </span>
            </td>

            <td>{{ formatDuration(r.durationMs) }}</td>

            <td>{{ formatTime(r.startTime) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import * as echarts from "echarts";
import service from "../service/index.js";

const overview = ref({});
const recent = ref([]);

onMounted(async () => {
  const res = await service.get("/api/dashboard/workflow");

  const data = res.data;

  overview.value = data.overview;
  recent.value = data.recent;

  initTrend(data.trend);
  initStatus(data.status);
  initNodeRank(data.nodeRank);
  initNodeTime(data.nodeTime);
});
function formatTime(t) {
  if (!t) return "-";

  const d = new Date(t);

  const pad = (n) => n.toString().padStart(2, "0");

  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds())
  );
}

function formatDuration(ms) {
  if (!ms) return "-";

  if (ms < 1000) return ms + " ms";

  return (ms / 1000).toFixed(2) + " s";
}
function initTrend(data) {
  const chart = echarts.init(document.getElementById("trendChart"));

  chart.setOption({
    title: { text: "执行趋势" },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        const item = params[0];
        return `
          日期：${item.name}<br/>
          执行次数：${item.value}
        `;
      },
    },
    xAxis: {
      type: "category",
      data: data.map((i) => i.day),
    },

    yAxis: { type: "value" },

    series: [
      {
        type: "line",
        data: data.map((i) => i.runCount),
        // smooth: true,

        label: {
          show: true,
          position: "top",
        },
      },
    ],
  });
}

function initStatus(data) {
  const chart = echarts.init(document.getElementById("statusChart"));

  const statusMap = {
    SUCCESS: "成功",
    ERROR: "失败",
    RUNNING: "运行中",
  };

  const colorMap = {
    SUCCESS: "#67C23A", // 绿色
    ERROR: "#F56C6C", // 红色
    RUNNING: "#409EFF", // 蓝色
  };

  chart.setOption({
    title: { text: "状态分布" },

    tooltip: {
      trigger: "item",
      formatter: function (params) {
        return `
          ${params.name}<br/>
          数量：${params.value}<br/>
          占比：${params.percent}%
        `;
      },
    },

    legend: {
      bottom: 0,
    },

    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],

        label: {
          formatter: "{b}: {d}%",
        },

        data: data.map((i) => ({
          name: statusMap[i.status] || i.status,
          value: i.count,
          itemStyle: {
            color: colorMap[i.status] || "#ccc", //  核心
          },
        })),
      },
    ],
  });
}

function initNodeRank(data) {
  const chart = echarts.init(document.getElementById("nodeRankChart"));
  const visibleCount = 10;
  const total = data.length;

  const endPercent = (visibleCount / total) * 100;
  chart.setOption({
    title: { text: "节点运行排名" },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        const item = params[0];
        return `
      节点：${item.name}<br/>
      运行次数：${item.value}
    `;
      },
    },
    grid: {
      left: 120, //  给y轴留空间
    },

    dataZoom: [
      {
        type: "inside", // 鼠标滚动
        yAxisIndex: 0,
        start: 0,
        end: endPercent,
      },
      {
        type: "slider", // 右侧滚动条
        yAxisIndex: 0,
        start: 0,
        end: endPercent,
      },
    ],

    xAxis: { type: "value" },

    yAxis: {
      type: "category",
      data: data.map((i) => i.nodeName),
      axisLabel: {
        interval: 0,
      },
    },

    series: [
      {
        type: "bar",
        data: data.map((i) => i.runCount),
      },
    ],
  });
}

function initNodeTime(data) {
  const chart = echarts.init(document.getElementById("nodeTimeChart"));
  const visibleCount = 10;
  const total = data.length;

  const endPercent = (visibleCount / total) * 100;
  chart.setOption({
    title: { text: "节点平均时间" },
    tooltip: {
      trigger: "axis",
      formatter: function (params) {
        const item = params[0];
        let value = item.value;

        let display;

        if (value >= 1000) {
          display = (value / 1000).toFixed(1) + " s"; //  转秒
        } else {
          display = value.toFixed(1) + " ms"; //  保留1位小数
        }

        return `
    节点：${item.name}<br/>
    平均耗时：${display}
  `;
      },
    },
    grid: {
      left: 120, //  给节点名称留空间（很重要）
    },

    //  核心：纵向滚动
    dataZoom: [
      {
        type: "inside", // 鼠标滚轮滚动
        yAxisIndex: 0,
        start: 0,
        end: endPercent,
      },
      {
        type: "slider", // 右侧滚动条
        yAxisIndex: 0,
        start: 0,
        end: endPercent,
        minSpan: 10, // 最少显示10%
        maxSpan: 50, // 最多显示50%
      },
    ],

    xAxis: {
      type: "value",
    },

    yAxis: {
      type: "category",
      data: data.map((i) => i.nodeName),

      axisLabel: {
        interval: 0,

        //  防止名字太长撑爆
        formatter: function (value) {
          return value.length > 8 ? value.slice(0, 8) + "..." : value;
        },
      },
    },

    series: [
      {
        type: "bar",
        data: data.map((i) => i.avgTime),
      },
    ],
  });
}
</script>

<style>
.dashboard {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* 统计卡片 */
.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.card {
  background: linear-gradient(135deg, #1e293b, #0f172a);
  padding: 20px;
  border-radius: 14px;
  text-align: center;

  color: #e5e7eb;

  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);

  transition: all 0.25s ease;
}

.card:hover {
  transform: translateY(-4px);
}

.card h3 {
  margin-bottom: 10px;
  font-size: 14px;
  color: #9ca3af; /* 灰一点更高级 */
}

.card p {
  font-size: 30px;
  font-weight: bold;
  color: #f9fafb;
}

.card.success {
  background: linear-gradient(135deg, #064e3b, #022c22);
  color: #d1fae5;
}

.card.error {
  background: linear-gradient(135deg, #7f1d1d, #450a0a);
  color: #fee2e2;
}

/* 图表 */
.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.chart {
  height: 350px;
  background: white;
  border-radius: 10px;
  padding: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* 表格 */
.table {
  width: 100%;
  margin-top: 20px;
  border-collapse: collapse;
  background: white;
}

.table th,
.table td {
  border: 1px solid #eee;
  padding: 10px;
  text-align: left;
}

.table th {
  background: #fafafa;
}

.section-title {
  margin-top: 40px;
}

.wf {
  font-weight: 500;
}

/* 状态标签 */

.status {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.status.success {
  background: #e8f5e9;
  color: #2e7d32;
}

.status.error {
  background: #ffebee;
  color: #c62828;
}

.status.running {
  background: #e3f2fd;
  color: #1565c0;
}
</style>
