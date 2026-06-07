<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
html, body {
  background-color: #060c18;
  color: #e2e8f0;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #0b1120; }
::-webkit-scrollbar-thumb { background: rgba(6, 182, 212, 0.25); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(6, 182, 212, 0.45); }

/* Selection */
::selection { background: rgba(6, 182, 212, 0.25); color: #e2e8f0; }

/* Checkbox & radio accent */
input[type="checkbox"], input[type="radio"] { accent-color: #06b6d4; }

/* Code / mono */
code { font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace; }
</style>
