<template>
  <div class="dashboard">
    <h1>Workflow Dashboard</h1>

    <!-- 统计卡片 -->

    <div class="cards">
      <div class="card">
        <h3>Total Runs</h3>
        <p>{{ overview.totalRuns }}</p>
      </div>

      <div class="card success">
        <h3>Success</h3>
        <p>{{ overview.successCount }}</p>
      </div>

      <div class="card error">
        <h3>Error</h3>
        <p>{{ overview.errorCount }}</p>
      </div>

      <div class="card">
        <h3>Avg Duration</h3>
        <p>{{ overview.avgDuration }}</p>
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

    <h2 class="section-title">Recent Execution</h2>

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
    title: { text: "Execution Trend" },

    xAxis: {
      type: "category",
      data: data.map((i) => i.day),
    },

    yAxis: { type: "value" },

    series: [
      {
        type: "line",
        data: data.map((i) => i.runCount),
      },
    ],
  });
}

function initStatus(data) {
  const chart = echarts.init(document.getElementById("statusChart"));

  chart.setOption({
    title: { text: "Status Distribution" },

    series: [
      {
        type: "pie",
        data: data.map((i) => ({
          name: i.status,
          value: i.count,
        })),
      },
    ],
  });
}

function initNodeRank(data) {
  const chart = echarts.init(document.getElementById("nodeRankChart"));

  chart.setOption({
    title: { text: "Node Run Rank" },

    xAxis: { type: "value" },

    yAxis: {
      type: "category",
      data: data.map((i) => i.nodeName),
      axisLabel: { interval: 0 },
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

  chart.setOption({
    title: { text: "Node Avg Time" },

    xAxis: { type: "value" },

    yAxis: {
      type: "category",
      data: data.map((i) => i.nodeName),
      axisLabel: { interval: 0 },
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
  background: #f5f5f5;
  padding: 20px;
  border-radius: 10px;
  text-align: center;
}

.card h3 {
  margin-bottom: 10px;
  font-size: 16px;
  color: #666;
}

.card p {
  font-size: 28px;
  font-weight: bold;
}

.card.success {
  background: #e8f5e9;
}

.card.error {
  background: #ffebee;
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
