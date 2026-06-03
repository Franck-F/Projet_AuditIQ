/* AuditIQ — App shell partials: sidebar + topbar
   Usage in app pages:
     <div data-app-partial="sidebar" data-active="dashboard"></div>
     <div data-app-partial="topbar" data-crumbs="Dashboard · Vue d'ensemble"></div>
*/
(function () {
  const SIDEBAR = [
    { section: 'Espace de travail' },
    { key: 'dashboard',       label: 'Vue d’ensemble', href: 'app-dashboard.html',   icon: 'grid' },
    { key: 'audits',          label: 'Audits',          href: 'app-historique.html',     icon: 'pulse', count: 12 },
    { key: 'rapports',        label: 'Rapports',        href: 'app-rapports.html',       icon: 'doc' },
    { key: 'recos',           label: 'Recommandations', href: 'app-recommandations.html', icon: 'bulb', count: 8 },

    { section: 'Modules d’audit' },
    { key: 'm1',              label: 'M1 — Audit supervisé',     href: 'app-audit-m1.html', icon: 'm1' },
    { key: 'm2',              label: 'M2 — Non supervisé',       href: 'app-audit-m2.html', icon: 'm2' },
    { key: 'm3',              label: 'M3 — Audit LLM',              href: 'app-audit-m3.html', icon: 'm3' },

    { section: 'Organisation' },
    { key: 'equipe',          label: 'Équipe & permissions', href: 'app-equipe.html',     icon: 'team' },
    { key: 'parametres',      label: 'Paramètres',           href: 'app-parametres.html', icon: 'gear' },
    { key: 'support',         label: 'Aide & support',         href: 'app-support.html',    icon: 'help' },
  ];

  // Tiny inline SVG icons (24x24 stroke-based)
  const ICONS = {
    grid:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></svg>',
    pulse: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h3l3-7 4 14 3-7h5"/></svg>',
    doc:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h6"/></svg>',
    bulb:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.4c.8.7 1.5 1.5 1.5 2.6h5c0-1.1.7-1.9 1.5-2.6A6 6 0 0 0 12 3z"/></svg>',
    m1:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V10l9-7 9 7v11"/><path d="M9 21v-7h6v7"/></svg>',
    m2:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="9" r="3"/><circle cx="16" cy="7" r="2.2"/><circle cx="15" cy="16" r="3.4"/></svg>',
    m3:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-12.6 6.6L4 20l1.4-4.4A8 8 0 1 1 21 12z"/><path d="M9 12h.01M12 12h.01M15 12h.01"/></svg>',
    team:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><path d="M14 14c2 0 5 1 5 4"/></svg>',
    gear:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1A1.6 1.6 0 0 0 4.7 15a1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.7 9 1.6 1.6 0 0 0 4.4 7.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9 4.7 1.6 1.6 0 0 0 10 3.2V3a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 15 4.7a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 19.4 9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>',
    help:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
    search:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    bell:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1 1 12 0v5l1.5 2.5h-15L6 13z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg>',
    caret: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    plus:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  };

  function buildSidebar(active) {
    let html = '';
    SIDEBAR.forEach(it => {
      if (it.section) {
        html += `<div class="sidebar__section-label">${it.section}</div>`;
        return;
      }
      const cls = it.key === active ? 'sidebar__item sidebar__item--active' : 'sidebar__item';
      const count = it.count != null ? `<span class="sidebar__item-count">${it.count}</span>` : '';
      html += `<a class="${cls}" href="${it.href}"><span class="sidebar__item-icon">${ICONS[it.icon] || ''}</span>${it.label}${count}</a>`;
    });

    return `
      <aside class="sidebar">
        <a href="index.html" class="sidebar__brand">
          <span class="nav__brand-mark">A</span>
          AuditIQ
        </a>
        <div class="sidebar__workspace">
          <span class="sidebar__workspace-avatar">TS</span>
          <div>
            <div class="sidebar__workspace-name">Cabinet Tessier</div>
            <div class="sidebar__workspace-plan">Plan Équipe · 5 sièges</div>
          </div>
          <span class="sidebar__workspace-caret">${ICONS.caret}</span>
        </div>
        <nav class="sidebar__nav">${html}</nav>
        <div class="sidebar__footer">
          <a class="btn btn--primary btn--sm btn--block" href="app-audit-m1.html">
            <span style="display:inline-flex;">${ICONS.plus}</span>
            Lancer un audit
          </a>
          <div class="sidebar__user">
            <span class="sidebar__user-avatar">CT</span>
            <div>
              <div class="sidebar__user-name">Claire Tessier</div>
              <div class="sidebar__user-role">Responsable conformité</div>
            </div>
          </div>
        </div>
      </aside>`;
  }

  function buildTopbar(crumbs, opts) {
    const opt = opts || {};
    const parts = (crumbs || '').split('·').map(s => s.trim()).filter(Boolean);
    const crumbHtml = parts.map((p, i) => {
      if (i === parts.length - 1) {
        return `<span class="topbar__breadcrumb-current">${p}</span>`;
      }
      return `<a href="app-dashboard.html">${p}</a><span class="topbar__sep">/</span>`;
    }).join('');

    return `
      <header class="topbar">
        <div class="topbar__breadcrumb">${crumbHtml}</div>
        <div class="topbar__actions">
          <div class="topbar__search">
            <span>${ICONS.search}</span>
            <span>Rechercher un audit, un rapport…</span>
            <span class="topbar__kbd">⌘K</span>
          </div>
          <a class="icon-btn" href="app-historique.html" title="Notifications">
            ${ICONS.bell}
            <span class="icon-btn__dot"></span>
          </a>
          ${opt.cta !== false ? '<a class="btn btn--primary btn--sm" href="app-audit-m1.html">Lancer un audit</a>' : ''}
        </div>
      </header>`;
  }

  function render() {
    document.querySelectorAll('[data-app-partial="sidebar"]').forEach(el => {
      const active = el.getAttribute('data-active') || '';
      el.outerHTML = buildSidebar(active);
    });
    document.querySelectorAll('[data-app-partial="topbar"]').forEach(el => {
      const crumbs = el.getAttribute('data-crumbs') || '';
      const noCta = el.getAttribute('data-no-cta') === 'true';
      el.outerHTML = buildTopbar(crumbs, { cta: !noCta });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
