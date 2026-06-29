#!/usr/bin/env node
/* Generates the localized demo pages from i18n/translations.json:
 *   /<lang>/index.html   — fully translated, indexable, hreflang-linked
 *   /index.html          — language detector that redirects to /<lang>/
 *   /sitemap.xml         — root + every language URL
 * Shared assets (toc.css, toc.js, demo.css, demo.js, og-image.png) stay at root
 * and are referenced with absolute paths so every language page shares them.
 *
 * Run from the repo root:  node scripts/build-i18n.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://ghost-toc-plugin.greedylabs.kr';
const data = JSON.parse(readFileSync(join(ROOT, 'i18n/translations.json'), 'utf8'));
const ORDER = data.order;
const DEFAULT = data.default;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => esc(s).replace(/"/g, '&quot;');

// giscus UI language codes (fall back to en for unsupported)
const GISCUS_LANG = { ko: 'ko', en: 'en', ja: 'ja', zh: 'zh-CN', es: 'es', fr: 'fr', de: 'de', pt: 'pt', hi: 'en' };

// language-neutral filler body (kept as lorem so we don't pretend to translate prose)
const LOREM = {
  p1: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.',
  p2: 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.',
  p3: 'Totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo nemo enim.',
  p4: 'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt neque porro.',
  p5: 'Quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore.',
  p6: 'Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur autem.',
  p7: 'Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat.',
  p8: 'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores.',
  p9: 'Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.',
  p10: 'Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.'
};

const FAVICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%231a73e8'/%3E%3Cg fill='white'%3E%3Crect x='8' y='9' width='12' height='2.5' rx='1.25'/%3E%3Crect x='8' y='15' width='16' height='2.5' rx='1.25'/%3E%3Crect x='8' y='21' width='10' height='2.5' rx='1.25'/%3E%3C/g%3E%3C/svg%3E";

function hreflangs(currentUrl) {
  const links = ORDER.map(
    (l) => `    <link rel="alternate" hreflang="${l}" href="${ORIGIN}/${l}/">`
  );
  links.push(`    <link rel="alternate" hreflang="x-default" href="${ORIGIN}/">`);
  return links.join('\n');
}

function langSwitch(cur) {
  const opts = ORDER.map(
    (l) => `<option value="/${l}/"${l === cur ? ' selected' : ''}>${esc(data.langs[l].name)}</option>`
  ).join('\n                    ');
  return `<select id="lang-select">
                    ${opts}
                </select>`;
}

function themeSwitch(t) {
  return `<select id="theme-select">
                    <option value="system">${esc(t.themeSystem)}</option>
                    <option value="light">${esc(t.themeLight)}</option>
                    <option value="dark">${esc(t.themeDark)}</option>
                </select>`;
}

function page(lang) {
  const t = data.langs[lang];
  const url = `${ORIGIN}/${lang}/`;
  const i18nJson = JSON.stringify({ copy: t.copy, copyDone: t.copyDone, defaultTitle: t.defaultTitle });
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>${esc(t.title)}</title>
    <meta name="description" content="${escAttr(t.description)}">
    <meta name="author" content="GreedyLabs">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${url}">
    <meta name="theme-color" content="#1a73e8">
    <link rel="icon" href="${FAVICON}">

    <!-- Set the theme before paint to avoid a flash (system unless the user chose one) -->
    <script>
      (function () {
        try {
          var m = localStorage.getItem('gtoc-theme') || 'system';
          var dark = m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
          document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        } catch (e) {}
      })();
    </script>

${hreflangs(url)}

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="ghost-toc-plugin">
    <meta property="og:title" content="${escAttr(t.title)}">
    <meta property="og:description" content="${escAttr(t.description)}">
    <meta property="og:url" content="${url}">
    <meta property="og:image" content="${ORIGIN}/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:locale" content="${t.locale}">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escAttr(t.title)}">
    <meta name="twitter:description" content="${escAttr(t.description)}">
    <meta name="twitter:image" content="${ORIGIN}/og-image.png">

    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "ghost-toc-plugin",
      "description": ${JSON.stringify(t.description)},
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Web (Ghost)",
      "url": "${url}",
      "codeRepository": "https://github.com/GreedyLabs/ghost-toc-plugin",
      "license": "https://opensource.org/licenses/MIT",
      "author": { "@type": "Organization", "name": "GreedyLabs" },
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    }
    </script>

    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5/400.css">
    <link rel="stylesheet" href="/toc.css">
    <link rel="stylesheet" href="/demo.css">

    <script defer src="https://umami.greedylabs.kr/script.js"
            data-website-id="ffcc7476-be44-4af2-8a9a-4a232dc31a0d"></script>
</head>
<body>
    <aside class="panel">
        <h1>ghost-toc-plugin</h1>
        <div class="panel-meta">
            <div class="field row">
                <div>
                    <label for="lang-select">${esc(t.langLabel)}</label>
                    ${langSwitch(lang)}
                </div>
                <div>
                    <label for="theme-select">${esc(t.themeLabel)}</label>
                    ${themeSwitch(t)}
                </div>
            </div>
        </div>

        <div class="field">
            <label for="f-content">${esc(t.lblContent)} <span style="font-weight:400;color:var(--ui-muted)">${esc(t.hintContent)}</span></label>
            <input type="text" id="f-content" value=".gh-content">
        </div>
        <div class="field">
            <label for="f-headings">${esc(t.lblHeadings)}</label>
            <input type="text" id="f-headings" value="h2,h3">
        </div>
        <div class="field">
            <label for="f-title">${esc(t.lblTitle)} <span style="font-weight:400;color:var(--ui-muted)">${esc(t.hintTitle)}</span></label>
            <input type="text" id="f-title" value="${escAttr(t.defaultTitle)}">
        </div>
        <div class="field">
            <label for="f-position">${esc(t.lblPosition)}</label>
            <select id="f-position">
                <option value="right" selected>${esc(t.optRight)}</option>
                <option value="left">${esc(t.optLeft)}</option>
            </select>
        </div>

        <div class="field check">
            <input type="checkbox" id="f-useThemeAccent" checked>
            <label for="f-useThemeAccent">${esc(t.lblAutoAccent)}</label>
        </div>
        <div class="field">
            <label for="f-accent">${esc(t.lblAccent)} <span style="font-weight:400;color:var(--ui-muted)">${esc(t.hintAccent)}</span></label>
            <input type="color" id="f-accent" value="#1a73e8" disabled>
        </div>

        <div class="field row">
            <div><label for="f-minWidth">${esc(t.lblMinWidth)}</label><input type="number" id="f-minWidth" value="1200" step="10"></div>
            <div><label for="f-width">${esc(t.lblWidth)}</label><input type="number" id="f-width" value="240" step="10"></div>
        </div>
        <div class="field row">
            <div><label for="f-gap">${esc(t.lblGap)}</label><input type="number" id="f-gap" value="28" step="2"></div>
            <div><label for="f-top">${esc(t.lblTop)}</label><input type="number" id="f-top" value="100" step="10"></div>
        </div>

        <div class="code">
            <div class="code-head"><strong>${esc(t.embedLabel)}</strong><button class="copy" id="copy">${esc(t.copy)}</button></div>
            <pre><code id="snippet"></code></pre>
            <p class="hint">${esc(t.hint)}</p>
        </div>

        <div class="panel-support">
            <p>${esc(t.support)}</p>
            <script type="text/javascript" src="https://cdnjs.buymeacoffee.com/1.0.0/button.prod.min.js" data-name="bmc-button" data-slug="daeho.ro" data-color="#FFDD00" data-emoji="" data-font="Cookie" data-text="Buy me a coffee" data-outline-color="#000000" data-font-color="#000000" data-coffee-color="#ffffff"></script>
        </div>
    </aside>

    <div class="demo-hero">${esc(t.heroText)}</div>

    <article class="demo-article">
        <h1>${esc(t.demoTitle)}</h1>
        <p>${esc(t.demoIntro)}</p>

        <h2>${esc(t.h_intro)}</h2>
        <p>${LOREM.p1}</p>
        <p>${LOREM.p2}</p>

        <h2>${esc(t.h_install)}</h2>
        <p>${LOREM.p3}</p>
        <h3>${esc(t.h_codeinjection)}</h3>
        <p>${LOREM.p4}</p>
        <h3>${esc(t.h_options)}</h3>
        <p>${LOREM.p5}</p>

        <h2>${esc(t.h_customize)}</h2>
        <p>${LOREM.p6}</p>
        <h3>${esc(t.h_color)}</h3>
        <p>${LOREM.p7}</p>
        <h3>${esc(t.h_position)}</h3>
        <p>${LOREM.p8}</p>

        <h2>${esc(t.h_closing)}</h2>
        <p>${LOREM.p9}</p>
        <p>${LOREM.p10}</p>
    </article>

    <section class="demo-comments">
        <h2 class="demo-comments-title">${esc(t.commentsTitle)}</h2>
        <script src="https://giscus.app/client.js"
                data-repo="GreedyLabs/giscus-comment"
                data-repo-id="R_kgDOTHbOrw"
                data-category="ghost-toc-plugin.greedylabs.kr"
                data-category-id="DIC_kwDOTHbOr84DAEUn"
                data-mapping="specific"
                data-term="ghost-toc-plugin"
                data-reactions-enabled="1"
                data-emit-metadata="0"
                data-input-position="top"
                data-theme="preferred_color_scheme"
                data-lang="${GISCUS_LANG[lang] || 'en'}"
                data-loading="lazy"
                crossorigin="anonymous"
                async>
        </script>
    </section>

    <script src="/toc.js" data-auto="false"></script>
    <script>window.GTOC_I18N = ${i18nJson};</script>
    <script src="/demo.js"></script>
</body>
</html>
`;
}

function redirector() {
  const noscript = ORDER.map((l) => `<li><a href="/${l}/">${esc(data.langs[l].name)}</a></li>`).join('');
  return `<!DOCTYPE html>
<html lang="${DEFAULT}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>ghost-toc-plugin — Floating table of contents for Ghost</title>
    <meta name="description" content="${escAttr(data.langs[DEFAULT].description)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${ORIGIN}/">
    <link rel="icon" href="${FAVICON}">
${hreflangs(`${ORIGIN}/`)}
    <script>
        (function () {
            var supported = ${JSON.stringify(ORDER)};
            var def = ${JSON.stringify(DEFAULT)};
            var n = ((navigator.languages && navigator.languages[0]) || navigator.language || def).toLowerCase();
            var pick = def;
            for (var i = 0; i < supported.length; i++) {
                if (n === supported[i] || n.indexOf(supported[i] + '-') === 0) { pick = supported[i]; break; }
            }
            location.replace('/' + pick + '/');
        })();
    </script>
</head>
<body>
    <noscript>
        <p>Choose a language / 언어 선택:</p>
        <ul>${noscript}</ul>
    </noscript>
    <p><a href="/${DEFAULT}/">Continue in English →</a></p>
</body>
</html>
`;
}

function sitemap() {
  // root + each language
  const items = [`  <url>\n    <loc>${ORIGIN}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>`];
  for (const l of ORDER) {
    items.push(`  <url>\n    <loc>${ORIGIN}/${l}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</urlset>\n`;
}

// --- write everything ---
for (const lang of ORDER) {
  mkdirSync(join(ROOT, lang), { recursive: true });
  writeFileSync(join(ROOT, lang, 'index.html'), page(lang));
  console.log('wrote', `${lang}/index.html`);
}
writeFileSync(join(ROOT, 'index.html'), redirector());
console.log('wrote', 'index.html (redirector)');
writeFileSync(join(ROOT, 'sitemap.xml'), sitemap());
console.log('wrote', 'sitemap.xml');
console.log('done:', ORDER.length, 'languages');
