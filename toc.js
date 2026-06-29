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

    // Merge defined option values over DEFAULTS and normalise `position`.
    function resolveConfig(options) {
        var cfg = {}, k;
        for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { cfg[k] = DEFAULTS[k]; } }
        if (options) {
            for (k in options) {
                if (options.hasOwnProperty(k) && options[k] !== undefined && options[k] !== null) { cfg[k] = options[k]; }
            }
        }
        cfg.position = cfg.position === 'left' ? 'left' : 'right';
        return cfg;
    }

    // Return a function that turns heading text into a unique, URL-safe slug id.
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

    // Build the panel DOM (title + linked list); returns { panel, linkMap }.
    // Also assigns ids and scroll-margin to the headings as a side effect.
    function buildPanel(cfg, headings, slugify) {
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

        var list = document.createElement('ul');
        list.className = NS + '__list';

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
            list.appendChild(li);
            linkMap[h.id] = a;
        });

        nav.appendChild(list);
        panel.appendChild(nav);
        return { panel: panel, linkMap: linkMap };
    }

    // Create a TOC instance. Returns { element, destroy } or null if there's
    // nothing to render (no content element, or too few headings).
    function create(options) {
        var cfg = resolveConfig(options);

        var content = typeof cfg.content === 'string' ? document.querySelector(cfg.content) : cfg.content;
        if (!content) { return null; }

        var headings = Array.prototype.slice.call(content.querySelectorAll(cfg.headings));
        if (headings.length < cfg.minHeadings) { return null; }

        var built = buildPanel(cfg, headings, slugifier());
        var panel = built.panel, linkMap = built.linkMap;
        document.body.appendChild(panel);

        var ACTIVE = NS + '__link--active';
        var activeId = null;

        // Place the panel beside the readable text column and hide it when it
        // won't fit. Aligns to the first heading, not the content wrapper (in Ghost
        // .gh-content is a full-width grid whose edge is the page edge).
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

        // Keep the panel within the article vertically: pinned at `cfg.top`, but
        // capped to the article box so it never overlaps the header or scrolls past
        // the content end (behaves like an in-flow sticky TOC).
        function verticalAlign() {
            if (panel.style.display === 'none') { return; }
            var cr = content.getBoundingClientRect();
            var top = Math.max(cfg.top, cr.top);
            var maxTop = cr.bottom - panel.offsetHeight;
            if (top > maxTop) { top = maxTop; }
            panel.style.top = Math.round(top) + 'px';
        }

        // Move the --active class to the link for `id` (no-op if unchanged).
        function setActive(id) {
            if (id === activeId) { return; }
            if (activeId && linkMap[activeId]) { linkMap[activeId].classList.remove(ACTIVE); }
            activeId = id;
            if (id && linkMap[id]) { linkMap[id].classList.add(ACTIVE); }
        }

        // Index of the heading the reader is currently in. Each heading has an
        // activation scroll point (where its top reaches the reading line at
        // `cfg.top`); the active one is the last point already passed. Reachable
        // headings keep their exact point (precise); a tail too close to the page
        // bottom to ever reach the line is spread across the final scroll so those
        // headings still activate in order, the last one exactly at the bottom.
        function activeIndex() {
            var scrollY = window.scrollY;
            var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

            var pts = headings.map(function (h) {
                return h.getBoundingClientRect().top + scrollY - cfg.top;
            });

            var tail = -1;
            for (var i = 0; i < pts.length; i++) { if (pts[i] > maxScroll) { tail = i; break; } }
            if (tail !== -1) {
                var anchor = tail > 0 ? Math.min(pts[tail - 1], maxScroll) : 0;
                var n = pts.length - tail;
                for (var j = tail; j < pts.length; j++) {
                    pts[j] = anchor + (maxScroll - anchor) * ((j - tail + 1) / n);
                }
            }

            var idx = 0;
            for (var k = 0; k < pts.length; k++) { if (scrollY + 1 >= pts[k]) { idx = k; } }
            return idx;
        }

        // Recompute and apply the active heading.
        function updateActive() { setActive(headings[activeIndex()].id); }

        // Coalesce scroll / content-grow events into one realign + recompute per frame.
        var ticking = false;
        function tick() {
            if (ticking) { return; }
            ticking = true;
            window.requestAnimationFrame(function () { verticalAlign(); updateActive(); ticking = false; });
        }

        // Full re-place (used on resize, where the horizontal fit can change too).
        function relayout() { layout(); updateActive(); }

        layout();
        updateActive();
        window.addEventListener('scroll', tick, { passive: true });
        window.addEventListener('resize', relayout);

        // The page can grow after load — lazy images, embeds, comment widgets
        // (giscus/Disqus), ad slots. That shifts which headings are reachable, so
        // recompute on document-height changes, not only on scroll.
        var ro = window.ResizeObserver ? new ResizeObserver(tick) : null;
        if (ro) { ro.observe(document.documentElement); }

        return {
            element: panel,
            destroy: function () {
                window.removeEventListener('scroll', tick);
                window.removeEventListener('resize', relayout);
                if (ro) { ro.disconnect(); }
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
