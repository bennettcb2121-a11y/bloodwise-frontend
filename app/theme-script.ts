/**
 * Runs before first paint to set data-theme from localStorage or system preference.
 * Prevents flash of wrong theme.
 */
export const themeScript = `
(function() {
  var key = 'clarion-theme';
  var stored = null;
  try { stored = localStorage.getItem(key); } catch (e) {}
  var mode = stored === 'light' || stored === 'dark' ? stored : 'system';
  var resolved = mode === 'system'
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode;
  document.documentElement.setAttribute('data-theme', resolved);
})();
`
