/* AuditIQ — shared nav + footer injection
   Usage: in each page, add <div data-partial="nav" data-active="produit"></div>
          and  <div data-partial="footer"></div>
   This script runs at parse time and replaces these slots. */

(function () {
  const NAV_ITEMS = [
    { key: 'produit',     label: 'Produit',     href: 'produit.html' },
    { key: 'modules',     label: 'Modules',     href: 'modules.html' },
    { key: 'cas-usage',   label: "Cas d'usage", href: 'cas-usage.html' },
    { key: 'ai-act',      label: 'AI Act',      href: 'ai-act.html' },
    { key: 'tarifs',      label: 'Tarifs',      href: 'tarifs.html' },
    { key: 'ressources',  label: 'Ressources',  href: 'blog.html' },
  ];

  function buildNav(activeKey) {
    const links = NAV_ITEMS
      .map(item => {
        const cls = item.key === activeKey ? 'nav__link nav__link--active' : 'nav__link';
        return `<a class="${cls}" href="${item.href}">${item.label}</a>`;
      })
      .join('');

    return `
    <nav class="nav">
      <div class="container nav__inner">
        <a href="index.html" class="nav__brand"><span class="nav__brand-mark">A</span>AuditIQ</a>
        <div class="nav__links">${links}</div>
        <div class="nav__cta">
          <a class="btn btn--ghost hide-mobile" href="connexion.html">Connexion</a>
          <a class="btn btn--primary btn--sm" href="contact.html">Demander une démo</a>
        </div>
      </div>
    </nav>`;
  }

  function buildFooter() {
    return `
    <footer class="footer">
      <div class="container">
        <div class="footer__grid">
          <div class="footer__col">
            <div class="nav__brand"><span class="nav__brand-mark">A</span> AuditIQ</div>
            <p class="footer__brand-text">Audit de fairness IA pour les PME françaises et européennes. Détectez, expliquez et documentez les biais de vos systèmes d'IA en moins d'une heure, sans écrire une ligne de code.</p>
          </div>
          <div class="footer__col">
            <h5>Produit</h5>
            <ul>
              <li><a href="produit.html">Vue d'ensemble</a></li>
              <li><a href="modules.html">Modules</a></li>
              <li><a href="comment-ca-marche.html">Comment ça marche</a></li>
              <li><a href="tarifs.html">Tarifs</a></li>
              <li><a href="comparatif.html">Comparatif</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h5>Cas d'usage</h5>
            <ul>
              <li><a href="cas-usage.html">RH &amp; recrutement</a></li>
              <li><a href="cas-usage.html">Crédit &amp; scoring</a></li>
              <li><a href="cas-usage.html">Service client / chatbot</a></li>
              <li><a href="cas-usage.html">Finance &amp; assurance</a></li>
              <li><a href="pme.html">PME : pourquoi maintenant</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h5>Ressources</h5>
            <ul>
              <li><a href="ai-act.html">AI Act &amp; conformité</a></li>
              <li><a href="blog.html">Blog &amp; ressources</a></li>
              <li><a href="faq.html">FAQ</a></li>
              <li><a href="temoignages.html">Études de cas</a></li>
              <li><a href="article.html">Guide AI Act</a></li>
            </ul>
          </div>
          <div class="footer__col">
            <h5>Entreprise</h5>
            <ul>
              <li><a href="a-propos.html">À propos</a></li>
              <li><a href="contact.html">Contact</a></li>
              <li><a href="contact.html">Demander une démo</a></li>
              <li><a href="connexion.html">Se connecter</a></li>
              <li><a href="inscription.html">Créer un compte</a></li>
            </ul>
          </div>
        </div>
        <div class="footer__bar">
          <span>© 2026 AuditIQ SAS · Tous droits réservés · Siège : Paris, France</span>
          <span style="display: flex; gap: 16px;">
            <a href="#">Mentions légales</a>
            <a href="#">CGU</a>
            <a href="#">Politique de confidentialité</a>
            <a href="#">RGPD</a>
            <a href="#">Sécurité</a>
          </span>
        </div>
      </div>
    </footer>`;
  }

  function render() {
    document.querySelectorAll('[data-partial="nav"]').forEach(slot => {
      const active = slot.getAttribute('data-active') || '';
      slot.outerHTML = buildNav(active);
    });
    document.querySelectorAll('[data-partial="footer"]').forEach(slot => {
      slot.outerHTML = buildFooter();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
