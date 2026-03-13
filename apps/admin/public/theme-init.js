// Apply saved theme before first paint (prevents FOUC)
(() => {
  const t = localStorage.getItem('pawmeet-admin-theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme:dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
})();
