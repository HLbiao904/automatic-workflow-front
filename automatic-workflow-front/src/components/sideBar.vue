<template>
  <aside :class="['sideBar', { collapsed }]">
    <div class="header item">
      <div class="icon" v-if="!collapsed"></div>
      <div class="item-group header-icons" @click="toggle">
        <img src="../assets/sidebar.svg" />
        <img src="../assets/sidebar.svg" />
        <img src="../assets/sidebar.svg" />
      </div>
    </div>
    <div class="center item">
      <div class="menuItem" @click="goOverwrite">
        <div class="menuIcon"><img src="../assets/home.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Overwrite</div>
      </div>
      <div class="menuItem" @click="goPerson">
        <div class="menuIcon"><img src="../assets/user.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Personal</div>
      </div>
      <div class="menuItem" @click="goChat">
        <div class="menuIcon"><img src="../assets/chat.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Chat</div>
      </div>
    </div>
    <div class="bottom item">
      <div class="menuItem">
        <div class="menuIcon"><img src="../assets/insight.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">Insights</div>
      </div>
      <div class="menuItem">
        <div class="menuIcon"><img src="../assets/chat.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">MenuItem2</div>
      </div>
      <div class="menuItem">
        <div class="menuIcon"><img src="../assets/chat.svg" /></div>
        <div class="menuTitle" v-if="!collapsed">MenuItem3</div>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { defineProps, defineEmits, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

function goChat() {
  emit("showChat");
}
function goOverwrite() {
  emit("showOverwrite");
}
function goPerson() {
  emit("showPerson");
}

const props = defineProps({
  showSidebar: {
    type: Boolean,
    default: true,
  },
});
const collapsed = computed(() => !props.showSidebar);

const emit = defineEmits([
  "update:showSidebar",
  "showOverwrite",
  "showPerson",
  "showChat",
]);
function toggle() {
  emit("update:showSidebar", !props.showSidebar);
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
    .icon {
      height: 100%;
      width: 50%;
      background-color: antiquewhite;
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
    gap: 4px;
    img {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    flex-direction: row;
    gap: 6px;
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
</style>
