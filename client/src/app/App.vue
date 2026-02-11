<template>
  <div id="app">
    <router-view></router-view>
  </div>
</template>

<script setup>
</script>

<style lang="scss">
:root {
  --primary: #47c575;
  --primary-alt: #30a15a;
  --grey: #64748b;
  --dark: #1e293b;
  --dark-alt: #334155;
  --light: #f1f5f9;
  --red: red;

  --sidebar-width: auto;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Fira sans', sans-serif;
}

#app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

router-view {
  flex-grow: 1;
}
</style>
