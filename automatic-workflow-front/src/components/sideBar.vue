<template>
  <aside :class="['sideBar', { collapsed }]">
    <div class="header item">
      <div class="logo" v-if="!collapsed">
        <img src="../assets/logo.png" />
      </div>
      <div class="item-group header-icons">
        <img src="../assets/sideBarAdd.svg" />
        <img src="../assets/sideBarSearch.svg" @click="showSearchDialog" />
        <img src="../assets/sidebar.svg" @click="toggle" />
      </div>
    </div>
    <div class="center item">
      <div
        class="menuItem"
        :class="{ active: activeMenu === 'overwrite' }"
        @click="goOverwrite"
      >
        <div class="menuIcon"><img src="../assets/home.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Overwrite</div>
      </div>
      <div
        class="menuItem"
        :class="{ active: activeMenu === 'person' }"
        @click="goPerson"
      >
        <div class="menuIcon"><img src="../assets/user.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Personal</div>
      </div>
      <div
        class="menuItem"
        :class="{ active: activeMenu === 'chat' }"
        @click="goChat"
      >
        <div class="menuIcon"><img src="../assets/chat.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Chat</div>
      </div>
    </div>
    <div class="bottom item">
      <div
        class="menuItem"
        :class="{ active: activeMenu === 'insights' }"
        @click="goInsights"
      >
        <div class="menuIcon"><img src="../assets/insight.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Insights</div>
      </div>
      <div
        class="menuItem"
        :class="{ active: activeMenu === 'templates' }"
        @click="goTemplates"
      >
        <div class="menuIcon"><img src="../assets/template.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Templates</div>
      </div>

      <el-dropdown @command="handleConfig" trigger="click">
        <div
          class="menuItem"
          :class="{ active: activeMenu === 'configuration' }"
        >
          <div class="menuIcon">
            <img src="../assets/configuration.svg" />
          </div>
          <div class="menuTitle" v-if="!collapsed">Configuration</div>
        </div>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="node">节点配置</el-dropdown-item>
            <el-dropdown-item command="user">用户配置</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </aside>
</template>

<script setup>
import {
  defineProps,
  defineEmits,
  computed,
  ref,
  watch,
  watchEffect,
} from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const activeMenu = ref("overwrite");
function goChat() {
  activeMenu.value = "chat";
  emit("showChat");
}
function goOverwrite() {
  activeMenu.value = "overwrite";
  emit("showOverwrite");
}
function goPerson() {
  activeMenu.value = "person";
  emit("showPerson");
}
function goInsights() {
  activeMenu.value = "insights";
  emit("showInsights");
}
function goTemplates() {
  activeMenu.value = "templates";
  emit("showTemplates");
}
function goConfiguration() {
  activeMenu.value = "configuration";
  emit("showConfiguration");
}
const props = defineProps({
  showSidebar: {
    type: Boolean,
    default: true,
  },
  activeMenu: {
    type: Object,
    default: "",
  },
});
const collapsed = computed(() => !props.showSidebar);

const emit = defineEmits([
  "update:showSidebar",
  "showOverwrite",
  "showPerson",
  "showChat",
  "showInsights",
  "showConfiguration",
  "showTemplates",
  "showGlobalSearchDialog",
]);
watch(
  () => props.activeMenu,
  (newVal) => {
    activeMenu.value = newVal.viewMode;
  },
);

function toggle() {
  emit("update:showSidebar", !props.showSidebar);
}
function showSearchDialog() {
  emit("showGlobalSearchDialog");
}
function handleConfig(command) {
  if (command === "node") {
    emit("showConfiguration", "nodeConfig");
  }

  if (command === "user") {
    emit("showConfiguration", "userConfig");
  }
}
</script>

<style lang="scss" scoped>
.sideBar:not(.collapsed) {
  padding: 0 10px; // 只有展开时有内边距
}
.sideBar {
  width: 220px;
  display: flex;
  border-right: 1px solid #eee;
  //   transition: width 0.25s ease;
  flex-direction: column;

  .header {
    padding: 0;
    height: 32px;
    margin-top: 10px;
    .logo {
      height: 100%;
      width: 50%;
      background-color: antiquewhite;
      img {
        width: 100%;
        height: 100%;
      }
    }
  }
  .center {
    flex: 1;
    margin-top: 15px;
    display: flex;
    flex-direction: column;
    .menuItem {
      height: 35px;
      width: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      .menuIcon {
        width: 18px;
        height: 18px;
        margin-right: 8px;
        // background-color: lightgreen;
        img {
          width: 100%;
          height: 100%;
        }
      }
      .menuTitle {
        flex: 1;
        font-size: 14px;
      }
    }
    .menuItem:hover {
      background: #f5f5f5;
      border-radius: 5px;
    }

    .menuItem.active {
      background: #e6f4ff;
    }
    // border-bottom: 1px solid #eee;
  }
  .bottom {
    height: 160px;
    margin-top: 15px;
    display: flex;
    flex-direction: column;
    // border-top: 1px solid #eee;
    .menuItem {
      height: 35px;
      width: 100%;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 4px;
      .menuIcon {
        width: 18px;
        height: 18px;
        margin-right: 8px;
        // background-color: lightgreen;
        img {
          width: 100%;
          height: 100%;
        }
      }
      .menuTitle {
        flex: 1;
        font-size: 14px;
      }
    }
    .menuItem:hover {
      background: #f5f5f5;
      border-radius: 5px;
    }

    .menuItem.active {
      background: #e6f4ff;
    }
  }
  .item-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .header-icons {
    width: 50%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: row;
    gap: 10px;
    img {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }
  }
}
.sideBar.collapsed {
  width: 52px;
  .item {
    justify-content: center;
    padding: 8px 0;
  }

  .header {
    height: auto;
    .header-icons {
      flex-direction: column;
      gap: 10px;
    }
  }
  .center {
    display: flex;
    justify-content: start;
    align-items: center;
    margin: 0;
    .menuItem {
      width: auto;
      justify-content: center;
      padding: 0;
    }
    .menuIcon {
      margin-right: 0;
    }
  }

  .bottom {
    display: flex;
    justify-content: start;
    align-items: center;
    margin: 0;
    .menuItem {
      width: auto;
      justify-content: center;
      padding: 0;
    }
    .menuIcon {
      margin-right: 0;
    }
  }
}

.item {
  display: flex;
  align-items: center;
  padding: 0;
}
.bottom :deep(.el-dropdown) {
  width: 100%;
  display: block;
}
</style>
