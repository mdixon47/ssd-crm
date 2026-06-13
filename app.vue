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

/* Shared component utilities */
.btn-primary {
  @apply px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed;
}
.btn-secondary {
  @apply px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-slate-100 transition;
  border: 1px solid rgba(148,163,184,0.2);
}
.card {
  @apply rounded-xl p-5;
  background: #0d1628;
  border: 1px solid rgba(148,163,184,0.08);
}
.stat-card {
  @apply rounded-xl p-4;
  background: #0d1628;
  border: 1px solid rgba(148,163,184,0.08);
}
.stat-label {
  @apply text-xs text-slate-500 uppercase tracking-wide mb-1;
}
.stat-value {
  @apply text-2xl font-bold text-white;
}
.field-label {
  @apply block text-xs font-semibold text-slate-500 uppercase mb-1.5;
}
.field-input {
  @apply w-full rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none;
  background: #070c18;
  border: 1px solid rgba(148,163,184,0.15);
}
</style>
