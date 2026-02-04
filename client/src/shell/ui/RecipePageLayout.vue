<template>
  <main>
    <slot name="topbar" />
    <div id="editor">
      <slot name="sidebar" />
      <slot name="workspace" />
    </div>
    <slot name="overlay" />
  </main>
</template>

<style lang="scss">
header {
  background: var(--dark);
}

body {
  background: var(--light);
}

button {
  cursor: pointer;
  appearance: none;
  border: none;
  outline: none;
  background: none;
}

.app {
  display: flex;
}

main {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  flex-grow: 1;
}

#editor {
  overflow: hidden;
  box-sizing: border-box;
  width: 100%;
  display: flex;
  flex-grow: 1;
}
</style>
