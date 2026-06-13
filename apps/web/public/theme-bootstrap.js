// Pre-hydration: decide the initial theme and apply data-theme to <html>
// before React mounts, to prevent dark↔light flash (FOUC). External file
// (not inline) to keep the layout free of dangerouslySetInnerHTML.
//
// Resolution order:
//   1. explicit user choice in localStorage ('light' | 'dark')
//   2. OS preference via prefers-color-scheme
//   3. default: light — a non-tech PME visitor lands on the editorial
//      light theme, not a dark "generator" look.
(function () {
  var t;
  try {
    t = localStorage.getItem('aiq-theme');
  } catch (_e) {
    // localStorage unavailable (private mode, etc.) — ignore.
  }
  if (t !== 'light' && t !== 'dark') {
    try {
      t =
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    } catch (_e) {
      t = 'light';
    }
  }
  document.documentElement.setAttribute('data-theme', t);
})();
