// Response Spectrum: static site generator (no npm packages needed).
// Run:  node build.mjs   ->  writes the finished site to /dist
import { readFileSync, writeFileSync, mkdirSync, readdirSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const DIST = join(ROOT, 'dist');
const rd = (...p) => readFileSync(join(ROOT, ...p), 'utf8');
const wr = (rel, data) => { const f = join(DIST, rel); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, data); };

const site = JSON.parse(rd('content', 'site.json'));
const AR = JSON.parse(rd('src', 'ar.json'));
const V = Date.now().toString(36);
const BASE = (site.general?.site_url || '').replace(/\/$/, '');

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const L = (o, key, lang) => (o && (o[`${key}_${lang}`] || o[`${key}_en`])) || '';
const ui = (lang, s) => (lang === 'ar' && AR[s]) || s;
const paras = (t) => String(t || '').split(/\n{2,}/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
const href = (lang, p) => (lang === 'ar' ? '/ar' : '') + p;
const load = (dir) => {
  const d = join(ROOT, 'content', dir);
  if (!existsSync(d)) return [];
  return readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => ({ slug: f.replace(/\.json$/, ''), ...JSON.parse(readFileSync(join(d, f), 'utf8')) }))
    .sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
};
const services = load('services'), projects = load('projects'), team = load('team'), clients = load('clients');
const hasLocal = (f) => existsSync(join(ROOT, 'static', 'vendor', f));
const P5 = hasLocal('p5.min.js') ? '/vendor/p5.min.js' : 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.7.0/p5.min.js';
const THREE = hasLocal('three.min.js') ? '/vendor/three.min.js' : 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

const ARCS = '<svg class="rs-arcs" viewBox="0 0 40 22" width="30" height="16" aria-hidden="true" focusable="false"><path d="M5 3c4 7 26 7 30 0M11 9.5c3 4.5 15 4.5 18 0M16.5 16c2 2.5 5 2.5 7 0" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const initial = (s) => (String(s).trim()[0] || '').toUpperCase();

/* ---------- shared pieces ---------- */
function header(lang, path) {
  const h = (hash) => `${href(lang, '/')}${hash}`;
  const other = lang === 'ar' ? 'en' : 'ar';
  return `<div class="rs-progress" aria-hidden="true"></div>
<a class="skip-link" href="#main">${esc(ui(lang, 'Skip to content'))}</a>
<header class="rs-header"><div class="rs-wrap rs-header__in">
<a class="rs-brand" href="${href(lang, '/')}"><span class="rs-wordmark">${esc(site.general?.name || 'response spectrum')}</span>${ARCS}</a>
<button class="rs-menu-toggle" aria-expanded="false" aria-controls="rs-nav" aria-label="${esc(ui(lang, 'Menu'))}"><span></span><span></span></button>
<nav class="rs-nav" id="rs-nav" aria-label="${esc(ui(lang, 'Primary'))}">
<ul class="rs-menu">
<li><a href="${h('#about')}">${esc(ui(lang, 'About'))}</a></li>
<li><a href="${h('#services')}">${esc(ui(lang, 'Services'))}</a></li>
<li><a href="${h('#process')}">${esc(ui(lang, 'Process'))}</a></li>
<li><a href="${h('#projects')}">${esc(ui(lang, 'Projects'))}</a></li>
</ul>
<ul class="rs-lang"><li><a href="${href(other, path)}" hreflang="${other}" lang="${other}">${other === 'ar' ? 'العربية' : 'English'}</a></li></ul>
<a class="rs-btn rs-btn--gold" href="${h('#contact')}">${esc(ui(lang, 'Contact'))}</a>
</nav></div></header>`;
}

function footer(lang) {
  const c = site.contact || {};
  const social = [['linkedin', 'LinkedIn'], ['instagram', 'Instagram'], ['facebook', 'Facebook']]
    .filter(([k]) => c[k]).map(([k, n]) => `<li><a href="${esc(c[k])}" rel="noopener" target="_blank">${n}</a></li>`).join('');
  const wa = String(c.whatsapp || '').replace(/[^0-9]/g, '');
  return `<footer class="rs-footer"><div class="rs-wrap rs-footer__in">
<a class="rs-brand" href="${href(lang, '/')}"><span class="rs-wordmark">${esc(site.general?.name || 'response spectrum')}</span>${ARCS}</a>
<ul class="rs-social">${social}</ul>
<small>&copy; ${new Date().getFullYear()} ${esc(site.general?.name || 'Response Spectrum')}</small></div></footer>
${wa ? `<a class="rs-wa" href="https://wa.me/${wa}" target="_blank" rel="noopener" aria-label="${esc(ui(lang, 'Chat on WhatsApp'))}"><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 19L4 20z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M9 9.5c.3 2.5 2.5 4.7 5.5 5.5l1.2-1.4-1.9-1-.9.7c-.9-.4-1.8-1.3-2.2-2.2l.7-.9-1-1.9L9 9.5z" fill="currentColor"/></svg></a>` : ''}
<div class="rs-cursor" aria-hidden="true">${esc(ui(lang, 'View'))}</div>`;
}

function layout({ lang, path, title, desc, body, home = false, libs = [] }) {
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const alt = ['en', 'ar'].map((l) => `<link rel="alternate" hreflang="${l}" href="${BASE}${href(l, path)}">`).join('');
  const scripts = libs.map((s) => `<script defer src="${s}"></script>`).join('') + `<script defer src="/assets/main.js?v=${V}"></script>`;
  let ld = '';
  if (home) {
    const c = site.contact || {};
    ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'ProfessionalService', name: site.general?.name || 'Response Spectrum', url: BASE || undefined, description: desc, email: c.email || undefined, telephone: c.phone || undefined }).replace(/</g, '\\u003c')}</script>`;
  }
  return `<!doctype html>
<html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${BASE}${href(lang, path)}">${alt}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Jura:wght@300;400;500;600&family=Tajawal:wght@300;400;500;700&display=swap">
<link rel="stylesheet" href="/assets/style.css?v=${V}">
<script>document.documentElement.classList.add('js')</script>${ld}</head>
<body class="${home ? 'home' : 'inner'}">
${header(lang, path)}
${body}
${footer(lang)}
${scripts}
</body></html>`;
}

const tagline = (lang) => `<div class="rs-tagline">${esc(L(site.general, 'tagline', lang))}</div>`;
const pageHero = (lang, title, lead) => `<section class="rs-pagehero"><div class="rs-wrap"><h1 class="rs-display rs-pagehero__title"><span class="rs-line"><span>${esc(title)}</span></span></h1>${lead ? `<p class="rs-pagehero__lead">${esc(lead)}</p>` : ''}${tagline(lang)}</div></section>`;

function projectCard(lang, p) {
  const media = p.image ? `<img src="${esc(p.image)}" alt="${esc(L(p, 'title', lang))}" loading="lazy">` : ARCS;
  const info = [L(p, 'type', lang), L(p, 'location', lang), p.year].filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('');
  return `<a class="rs-project" href="${href(lang, `/projects/${p.slug}/`)}"><div class="rs-project__media">${media}</div><div class="rs-project__meta"><h3>${esc(L(p, 'title', lang))}</h3><p class="rs-project__info">${info}</p></div></a>`;
}
function teamCard(lang, m) {
  const media = m.photo ? `<img src="${esc(m.photo)}" alt="" loading="lazy">` : `<span class="rs-member__mono">${esc(initial(L(m, 'name', lang)))}</span>`;
  return `<article class="rs-member"><div class="rs-member__media">${media}</div><h3>${esc(L(m, 'name', lang))}</h3>${L(m, 'role', lang) ? `<p class="rs-member__role">${esc(L(m, 'role', lang))}</p>` : ''}${L(m, 'bio', lang) ? `<p class="rs-member__bio">${esc(L(m, 'bio', lang))}</p>` : ''}</article>`;
}
const teamSection = (lang, cls, title) => team.length ? `<section class="rs-section ${cls}" id="team"><div class="rs-wrap"><h2 class="rs-h2 rs-display rs-reveal">${esc(title)}</h2><div class="rs-team">${team.map((m) => teamCard(lang, m)).join('')}</div></div></section>` : '';

/* ---------- pages ---------- */
function home(lang) {
  const S = (sec, key) => L(site[sec], key, lang);
  const hero = site.hero || {}, sim = site.sim || {}, c = site.contact || {};
  const showSpec = hero.show_spectrum !== false, showSim = sim.show !== false && !sim.image;
  const libs = [...(showSpec ? [P5] : []), ...(showSim ? [THREE] : [])];
  const stats = (site.about?.stats || []).map((s) => `<li><span class="rs-num">${esc(s.number)}</span><span>${esc(L(s, 'label', lang))}</span></li>`).join('');
  const svc = services.map((s, i) => `<li class="rs-service${i === 0 ? ' is-open' : ''}"><button class="rs-service__btn" aria-expanded="${i === 0}"><span>${esc(L(s, 'title', lang))}</span><span class="rs-plus" aria-hidden="true"></span></button><div class="rs-service__panel"><div><p>${esc(L(s, 'excerpt', lang))}</p><p><a class="rs-more" href="${href(lang, `/services/${s.slug}/`)}">${esc(ui(lang, 'Read more'))}</a></p></div></div></li>`).join('');
  const steps = (site.process || []).map((s, i) => `<li class="rs-step rs-reveal"><span class="rs-step__n">0${i + 1}</span><h3>${esc(L(s, 'title', lang))}</h3><p>${esc(L(s, 'text', lang))}</p></li>`).join('');
  const clientsHtml = clients.length ? `<section class="rs-section rs-section--paper" id="clients"><div class="rs-wrap"><div class="rs-clients__head"><h2 class="rs-h2 rs-display rs-reveal">${esc(S('titles', 'clients'))}</h2>${S('titles', 'clients_text') ? `<p class="rs-clients__text">${esc(S('titles', 'clients_text'))}</p>` : ''}</div><ul class="rs-clients rs-reveal">${clients.map((cl) => {
    const inner = cl.logo ? `<img src="${esc(cl.logo)}" alt="${esc(cl.name_en || '')}" loading="lazy">` : `<span class="rs-client__name">${esc(L(cl, 'name', lang))}</span>`;
    return `<li class="rs-client">${cl.url ? `<a href="${esc(cl.url)}" target="_blank" rel="noopener">${inner}</a>` : `<span>${inner}</span>`}</li>`;
  }).join('')}</ul></div></section>` : '';
  const bg = hero.image ? `<div class="rs-hero__bg" aria-hidden="true"><img src="${esc(hero.image)}" alt="" data-parallax="0.12"></div>` : '';
  const phone = String(c.phone || '');
  const action = c.form_action ? `method="post" action="${esc(c.form_action)}"` : 'name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field"';
  const formExtra = c.form_action ? (c.form_key ? `<input type="hidden" name="access_key" value="${esc(c.form_key)}">` : '') : '<input type="hidden" name="form-name" value="contact"><p class="rs-hp" aria-hidden="true"><label>Do not fill <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>';
  const body = `<main id="main">
<section class="rs-hero rs-hero--spectrum" id="top">${bg}${showSpec ? '<div class="rs-hero__art" aria-hidden="true"><div id="rs-spectrum"></div></div>' : ''}
<div class="rs-wrap rs-hero__main"><div class="rs-hero__copy"><h1 class="rs-display"><span class="rs-line"><span>${esc(S('hero', 'title'))}</span></span></h1>
<div class="rs-hero__side"><p>${esc(S('hero', 'text'))}</p><div class="rs-actions">
<a class="rs-btn rs-btn--gold" data-magnet href="${esc(hero.cta1_url || '#projects')}">${esc(S('hero', 'cta1'))}</a>
<a class="rs-btn" data-magnet href="${esc(hero.cta2_url || '#contact')}">${esc(S('hero', 'cta2'))}</a></div></div></div></div>
<div class="rs-wrap">${tagline(lang)}</div></section>

<section class="rs-section rs-section--paper" id="about"><div class="rs-wrap rs-about"><div class="rs-reveal"><h2 class="rs-h2 rs-display">${esc(S('about', 'title'))}</h2><p class="rs-about__text">${esc(S('about', 'text'))}</p></div><ul class="rs-stats rs-reveal">${stats}</ul></div></section>

${sim.show !== false ? `<section class="rs-section rs-section--deep" id="simulator"><div class="rs-wrap rs-sim"><div class="rs-reveal"><h2 class="rs-h2 rs-display">${esc(S('sim', 'title'))}</h2><p class="rs-sim__text">${esc(S('sim', 'text'))}</p>
${sim.image ? '' : `<div class="rs-sim__ctl"><button class="rs-btn rs-btn--gold" id="rs-shake" type="button" data-magnet>${esc(S('sim', 'button'))}</button><label for="rs-amp"><span>${esc(S('sim', 'label'))}</span><input id="rs-amp" type="range" min="1" max="10" value="5"></label></div>
<div class="rs-seg" role="group"><button type="button" id="rs-br-on" aria-pressed="true">${esc(ui(lang, 'Braced frame'))}</button><button type="button" id="rs-br-off" aria-pressed="false">${esc(ui(lang, 'Unbraced frame'))}</button></div>`}</div>
<div class="rs-sim__stage rs-reveal${sim.image ? ' rs-sim__stage--img' : ''}">${sim.image ? `<img src="${esc(sim.image)}" alt="" data-parallax="0.08">` : `<div class="rs-sim__panel"><div class="rs-sim__view"><canvas id="rs-3d" role="img" aria-label="${esc(ui(lang, 'Interactive 3D model of a five-storey building shaking in a simulated earthquake. Drag to rotate.'))}"></canvas><p class="rs-nogl" hidden>${esc(ui(lang, 'Your browser cannot show the 3D model.'))}</p></div><svg id="rs-trace" viewBox="0 0 640 110" preserveAspectRatio="none" aria-hidden="true"></svg><div class="rs-sim__meta"><span class="rs-key rs-key--a"><i></i>${esc(ui(lang, 'Ground acceleration'))}</span><span class="rs-key rs-key--d"><i></i>${esc(ui(lang, 'Roof displacement'))}</span><span class="rs-drift">${esc(ui(lang, 'Peak roof drift'))} <b id="rs-drift">0.00 %</b></span></div><p class="rs-sim__note">${esc(ui(lang, 'Illustrative model, displacement exaggerated. Drag the building to rotate it.'))}</p></div>`}</div></div></section>` : ''}

<section class="rs-section rs-section--graphite" id="services"><div class="rs-wrap"><h2 class="rs-h2 rs-display rs-reveal">${esc(S('titles', 'services'))}</h2><ul class="rs-services">${svc}</ul></div></section>
<section class="rs-section" id="process"><div class="rs-wrap"><h2 class="rs-h2 rs-display rs-reveal">${esc(S('titles', 'process'))}</h2><ol class="rs-steps">${steps}</ol></div></section>
<section class="rs-section rs-section--paper" id="projects"><div class="rs-wrap"><div class="rs-projects__head"><h2 class="rs-h2 rs-display rs-reveal">${esc(S('titles', 'projects'))}</h2><a class="rs-btn" data-magnet href="${href(lang, '/projects/')}">${esc(S('titles', 'projects_all'))}</a></div><div class="rs-grid-projects">${projects.slice(0, 6).map((p) => projectCard(lang, p)).join('')}</div></div></section>
${teamSection(lang, 'rs-section--deep', S('titles', 'team'))}
${clientsHtml}
<section class="rs-section rs-section--graphite" id="contact"><div class="rs-wrap rs-contact"><div><h2 class="rs-h2 rs-display rs-reveal">${esc(S('contact', 'title'))}</h2><p style="margin-top:2rem;max-width:44ch">${esc(S('contact', 'text'))}</p>
<ul class="rs-contact__list">${c.email ? `<li><small>${esc(ui(lang, 'Email'))}</small><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : ''}${phone ? `<li><small>${esc(ui(lang, 'Phone'))}</small><a dir="ltr" href="tel:${esc(phone.replace(/[^0-9+]/g, ''))}">${esc(phone)}</a></li>` : ''}${S('contact', 'address') ? `<li><small>${esc(ui(lang, 'Office'))}</small>${esc(S('contact', 'address'))}</li>` : ''}</ul></div>
<form class="rs-form" ${action}>${formExtra}
<p><label for="rs_name">${esc(ui(lang, 'Name'))}</label><input id="rs_name" name="name" type="text" required></p>
<p><label for="rs_email">${esc(ui(lang, 'Email'))}</label><input id="rs_email" name="email" type="email" required></p>
<p><label for="rs_phone">${esc(ui(lang, 'Phone (optional)'))}</label><input id="rs_phone" name="phone" type="tel"></p>
<p><label for="rs_message">${esc(ui(lang, 'Message'))}</label><textarea id="rs_message" name="message" rows="4" required></textarea></p>
<button class="rs-btn rs-btn--gold" data-magnet type="submit">${esc(ui(lang, 'Send message'))}</button></form></div>
${c.map ? `<div class="rs-wrap rs-map"><iframe src="${esc(c.map)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${esc(ui(lang, 'Map'))}"></iframe></div>` : ''}</section>
</main>`;
  return layout({ lang, path: '/', title: L(site.general, 'meta_title', lang), desc: L(site.general, 'meta_description', lang), body, home: true, libs });
}

function aboutPage(lang) {
  const S = (sec, key) => L(site[sec], key, lang);
  const values = (site.values || []).map((v) => `<li class="rs-step rs-reveal"><h3>${esc(L(v, 'title', lang))}</h3><p>${esc(L(v, 'text', lang))}</p></li>`).join('');
  const body = `<main id="main">${pageHero(lang, ui(lang, 'About'), S('about', 'title'))}
<section class="rs-section rs-section--paper"><div class="rs-narrow rs-content">${paras(S('about', 'body') || S('about', 'text'))}</div></section>
<section class="rs-section rs-section--graphite"><div class="rs-wrap"><h2 class="rs-h2 rs-display rs-reveal">${esc(S('titles', 'values'))}</h2><ol class="rs-steps rs-steps--3">${values}</ol></div></section>
${teamSection(lang, 'rs-section--deep', S('titles', 'team'))}
<section class="rs-section rs-section--paper"><div class="rs-wrap rs-cta"><h2 class="rs-h2 rs-display rs-reveal">${esc(S('contact', 'title'))}</h2><a class="rs-btn" data-magnet href="${href(lang, '/')}#contact">${esc(ui(lang, 'Start a project'))}</a></div></section></main>`;
  return layout({ lang, path: '/about/', title: `${ui(lang, 'About')} | ${site.general?.name || ''}`, desc: S('about', 'text'), body });
}

function projectsIndex(lang) {
  const body = `<main id="main">${pageHero(lang, ui(lang, 'Projects'), '')}<section class="rs-section rs-section--paper"><div class="rs-wrap"><div class="rs-grid-projects">${projects.map((p) => projectCard(lang, p)).join('') || `<p>${esc(ui(lang, 'Nothing here yet.'))}</p>`}</div></div></section></main>`;
  return layout({ lang, path: '/projects/', title: `${ui(lang, 'Projects')} | ${site.general?.name || ''}`, desc: L(site.general, 'meta_description', lang), body });
}
function projectPage(lang, p) {
  const facts = [['Type', L(p, 'type', lang)], ['Location', L(p, 'location', lang)], ['Year', p.year]].filter(([, v]) => v)
    .map(([k, v]) => `<li><small style="display:block;opacity:.65">${esc(ui(lang, k))}</small>${esc(v)}</li>`).join('');
  const body = `<main id="main">${pageHero(lang, L(p, 'title', lang), L(p, 'excerpt', lang))}<section class="rs-section rs-section--paper"><div class="rs-wrap">${facts ? `<ul class="rs-facts">${facts}</ul>` : ''}${p.image ? `<div class="rs-project__media" style="margin-bottom:2.5rem"><img src="${esc(p.image)}" alt="${esc(L(p, 'title', lang))}"></div>` : ''}<div class="rs-narrow rs-content">${paras(L(p, 'body', lang))}<p><a class="rs-btn" href="${href(lang, '/projects/')}">${esc(ui(lang, 'Projects'))}</a></p></div></div></section></main>`;
  return layout({ lang, path: `/projects/${p.slug}/`, title: `${L(p, 'title', lang)} | ${site.general?.name || ''}`, desc: L(p, 'excerpt', lang), body });
}
function servicesIndex(lang) {
  const list = services.map((s) => `<li class="rs-service"><a class="rs-service__btn" href="${href(lang, `/services/${s.slug}/`)}"><span>${esc(L(s, 'title', lang))}</span><span class="rs-plus" aria-hidden="true"></span></a><p class="rs-service__lead">${esc(L(s, 'excerpt', lang))}</p></li>`).join('');
  const body = `<main id="main">${pageHero(lang, ui(lang, 'Services'), '')}<section class="rs-section rs-section--graphite"><div class="rs-wrap"><ul class="rs-services rs-services--links" style="margin-top:0">${list}</ul></div></section></main>`;
  return layout({ lang, path: '/services/', title: `${ui(lang, 'Services')} | ${site.general?.name || ''}`, desc: L(site.general, 'meta_description', lang), body });
}
function servicePage(lang, s) {
  const others = services.filter((x) => x.slug !== s.slug).map((x) => `<li class="rs-service"><a class="rs-service__btn" href="${href(lang, `/services/${x.slug}/`)}"><span>${esc(L(x, 'title', lang))}</span><span class="rs-plus" aria-hidden="true"></span></a></li>`).join('');
  const body = `<main id="main">${pageHero(lang, L(s, 'title', lang), L(s, 'excerpt', lang))}<section class="rs-section rs-section--paper"><div class="rs-narrow rs-content">${paras(L(s, 'body', lang))}<p><a class="rs-btn" href="${href(lang, '/')}#contact">${esc(ui(lang, 'Start a project'))}</a></p></div></section>
${others ? `<section class="rs-section rs-section--graphite"><div class="rs-wrap"><h2 class="rs-h2 rs-display rs-reveal">${esc(ui(lang, 'Other services'))}</h2><ul class="rs-services rs-services--links">${others}</ul></div></section>` : ''}</main>`;
  return layout({ lang, path: `/services/${s.slug}/`, title: `${L(s, 'title', lang)} | ${site.general?.name || ''}`, desc: L(s, 'excerpt', lang), body });
}

/* ---------- build ---------- */
rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST, { recursive: true });
if (existsSync(join(ROOT, 'static'))) cpSync(join(ROOT, 'static'), DIST, { recursive: true });
wr('assets/style.css', rd('src', 'style.css'));
wr('assets/main.js', rd('src', 'main.js'));

const urls = [];
const emit = (lang, path, html) => { wr(`${lang === 'ar' ? 'ar' : ''}${path}index.html`.replace(/^\//, ''), html); urls.push(href(lang, path)); };
for (const lang of ['en', 'ar']) {
  emit(lang, '/', home(lang));
  emit(lang, '/about/', aboutPage(lang));
  emit(lang, '/projects/', projectsIndex(lang));
  emit(lang, '/services/', servicesIndex(lang));
  projects.forEach((p) => emit(lang, `/projects/${p.slug}/`, projectPage(lang, p)));
  services.forEach((s) => emit(lang, `/services/${s.slug}/`, servicePage(lang, s)));
}
wr('404.html', layout({ lang: 'en', path: '/', title: 'Page not found', desc: '', body: `<main id="main"><section class="rs-pagehero"><div class="rs-wrap"><h1 class="rs-display rs-pagehero__title"><span class="rs-line"><span>Page not found</span></span></h1><p class="rs-pagehero__lead"><a class="rs-btn" href="/">Back to home</a></p></div></section></main>` }));
if (BASE) {
  wr('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${BASE}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
  wr('robots.txt', `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${BASE}/sitemap.xml\n`);
}
console.log(`Built ${urls.length} pages -> dist/`);
