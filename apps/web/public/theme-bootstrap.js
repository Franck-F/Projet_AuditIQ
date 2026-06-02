// Pre-hydration: read aiq-theme from localStorage and apply data-theme
// to <html> before React mounts, to prevent dark↔light flash (FOUC).
// External file (not inline) to keep the layout free of dangerouslySetInnerHTML.
try {
  var t = localStorage.getItem('aiq-theme');
  if (t === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  }
} catch (e) {
  // localStorage unavailable (private mode, etc.) — keep default dark.
}
