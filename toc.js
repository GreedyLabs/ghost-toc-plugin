/*!
 * ghost-toc-plugin — a portable, theme-independent floating table of contents.
 * https://github.com/GreedyLabs/ghost-toc-plugin
 * MIT License
 *
 * Embed (e.g. Ghost → Settings → Code Injection → Site Footer):
 *   <link rel="stylesheet" href=".../toc.css">
 *   <script src=".../toc.js"
 *           data-content=".gh-content"
 *           data-headings="h2,h3"
 *           data-position="right"
 *           data-title="목차"></script>
 *
 * All data-* options (with defaults):
 *   data-content       CSS selector for the article body   (".gh-content, article, main, .post-content, .entry-content")
 *   data-headings      headings to include                 ("h2,h3")
 *   data-position      "right" | "left"                    ("right")
 *   data-title         heading shown above the list         ("목차")  — empty string hides it
 *   data-accent        active-item color (any CSS color)    (theme default)
 *   data-min-width     hide below this viewport width (px)   (1200)
 *   data-min-headings  don't render below this many headings (2)
 *   data-top           distance from top of viewport (px)    (100)
 *   data-width         panel width (px)                      (240)
 *   data-gap           gap between content and panel (px)    (28)
 *   data-auto          set to "false" to skip auto-init      ("true")
 *
 * Programmatic API (for tools / live previews):
 *   var toc = GreedyLabsGhostTOC.create({ content: '.article', position: 'left', ... });
 *   toc.destroy();   // removes the panel and all listeners
 *
 * Everything is namespaced under the unique class "greedylabs-ghost-toc"
 * (and --greedylabs-ghost-toc-* CSS variables) to avoid clashes with any theme.
 */
(function () {
    'use strict';

    var NS = 'greedylabs-ghost-toc';

    var DEFAULTS = {
        content: '.gh-content, article, main, .post-content, .entry-content',
        headings: 'h2,h3',
        position: 'right',
        title: '목차',
        accent: '',
        minWidth: 1200,
        minHeadings: 2,
        top: 100,
        width: 240,
        gap: 28
    };

    function slugifier() {
        var used = {};
        return function (text) {
            var s = (text || '').trim().toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^\p{L}\p{N}-]+/gu, '')
                .replace(/-+/g, '-')
                .replace(/^-+|-+$/g, '');
            if (!s) { s = 'section'; }
            if (used[s] === undefined) { used[s] = 0; return s; }
            used[s] += 1;
            return s + '-' + used[s];
        };
    }

    // Build a TOC instance. Returns { element, destroy } or null if nothing to render.
    function create(options) {
        var cfg = {};
        var k;
        for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { cfg[k] = DEFAULTS[k]; } }
        if (options) { for (k in options) { if (options.hasOwnProperty(k) && options[k] !== undefined && options[k] !== null) { cfg[k] = options[k]; } } }
        cfg.position = cfg.position === 'left' ? 'left' : 'right';

        var content = typeof cfg.content === 'string' ? document.querySelector(cfg.content) : cfg.content;
        if (!content) { return null; }

        var headings = Array.prototype.slice.call(content.querySelectorAll(cfg.headings));
        if (headings.length < cfg.minHeadings) { return null; }

        var slugify = slugifier();

        var panel = document.createElement('aside');
        panel.className = NS + ' ' + NS + '--' + cfg.position;
        panel.style.setProperty('--' + NS + '-top', cfg.top + 'px');
        panel.style.setProperty('--' + NS + '-width', cfg.width + 'px');
        if (cfg.accent) { panel.style.setProperty('--' + NS + '-accent', cfg.accent); }

        var nav = document.createElement('nav');
        nav.className = NS + '__inner';
        nav.setAttribute('aria-label', cfg.title || 'Table of contents');

        if (cfg.title) {
            var titleEl = document.createElement('p');
            titleEl.className = NS + '__title';
            titleEl.textContent = cfg.title;
            nav.appendChild(titleEl);
        }

        var listEl = document.createElement('ul');
        listEl.className = NS + '__list';

        var linkMap = {};
        headings.forEach(function (h) {
            if (!h.id) { h.id = slugify(h.textContent); }
            h.style.scrollMarginTop = cfg.top + 'px';

            var li = document.createElement('li');
            li.className = NS + '__item ' + NS + '__item--' + h.tagName.toLowerCase();

            var a = document.createElement('a');
            a.className = NS + '__link';
            a.href = '#' + h.id;
            a.textContent = h.textContent || '';

            li.appendChild(a);
            listEl.appendChild(li);
            linkMap[h.id] = a;
        });

        nav.appendChild(listEl);
        panel.appendChild(nav);
        document.body.appendChild(panel);

        var ACTIVE = NS + '__link--active';

        // Horizontal placement + visibility. Aligns to the *readable text column*,
        // not the content wrapper (in Ghost .gh-content is a full-width grid, so its
        // right edge is the page edge — we want the heading column instead).
        function layout() {
            var vw = document.documentElement.clientWidth;
            if (vw < cfg.minWidth) { panel.style.display = 'none'; return; }

            var rect = headings[0].getBoundingClientRect();
            if (!rect.width) { rect = content.getBoundingClientRect(); }
            var left;
            if (cfg.position === 'left') {
                left = rect.left - cfg.gap - cfg.width;
                if (left < 8) { panel.style.display = 'none'; return; }
            } else {
                left = rect.right + cfg.gap;
                if (left + cfg.width > vw - 8) { panel.style.display = 'none'; return; }
            }
            panel.style.display = 'block';
            panel.style.left = Math.round(left) + 'px';
            verticalAlign();
        }

        // Vertical: cap the top at the article body so the panel never overlaps the
        // header / feature image, then ride up with the content end (sticky within
        // the article — matches an in-flow sticky TOC).
        function verticalAlign() {
            if (panel.style.display === 'none') { return; }
            var cr = content.getBoundingClientRect();
            var top = Math.max(cfg.top, cr.top);
            var maxTop = cr.bottom - panel.offsetHeight;
            if (top > maxTop) { top = maxTop; }
            panel.style.top = Math.round(top) + 'px';
        }

        layout();
        var ticking = false;
        function onScroll() {
            if (ticking) { return; }
            ticking = true;
            window.requestAnimationFrame(function () { verticalAlign(); ticking = false; });
        }
        window.addEventListener('resize', layout);
        window.addEventListener('scroll', onScroll, { passive: true });

        var activeId = null, visible = {};
        function setActive(id) {
            if (id === activeId) { return; }
            if (activeId && linkMap[activeId]) { linkMap[activeId].classList.remove(ACTIVE); }
            activeId = id;
            if (id && linkMap[id]) { linkMap[id].classList.add(ACTIVE); }
        }

        var observer = null;
        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (e.isIntersecting) { visible[e.target.id] = true; }
                    else { delete visible[e.target.id]; }
                });
                var current = null, i;
                for (i = 0; i < headings.length; i++) {
                    if (visible[headings[i].id]) { current = headings[i].id; break; }
                }
                if (!current) {
                    for (i = headings.length - 1; i >= 0; i--) {
                        if (headings[i].getBoundingClientRect().top < cfg.top + 20) { current = headings[i].id; break; }
                    }
                }
                if (current) { setActive(current); }
            }, { rootMargin: '-' + cfg.top + 'px 0px -70% 0px', threshold: 0 });
            headings.forEach(function (h) { observer.observe(h); });
        }

        return {
            element: panel,
            destroy: function () {
                window.removeEventListener('resize', layout);
                window.removeEventListener('scroll', onScroll);
                if (observer) { observer.disconnect(); }
                if (panel.parentNode) { panel.parentNode.removeChild(panel); }
            }
        };
    }

    // Expose the programmatic API.
    window.GreedyLabsGhostTOC = { create: create, defaults: DEFAULTS };

    // Auto-init from this script's own data-* attributes (unless data-auto="false").
    var thisScript = document.currentScript;
    function ready(fn) {
        if (document.readyState !== 'loading') { fn(); }
        else { document.addEventListener('DOMContentLoaded', fn); }
    }
    ready(function () {
        var script = thisScript || document.querySelector('script[src*="toc.js"]');
        if (!script || script.getAttribute('data-auto') === 'false') { return; }
        function num(name, def) {
            var v = script.getAttribute('data-' + name);
            return v === null ? def : parseInt(v, 10);
        }
        function str(name, def) {
            var v = script.getAttribute('data-' + name);
            return v === null ? def : v;
        }
        create({
            content: str('content', undefined),
            headings: str('headings', undefined),
            position: str('position', undefined),
            title: script.getAttribute('data-title'), // allow empty string
            accent: str('accent', undefined),
            minWidth: num('min-width', undefined),
            minHeadings: num('min-headings', undefined),
            top: num('top', undefined),
            width: num('width', undefined),
            gap: num('gap', undefined)
        });
    });
})();
