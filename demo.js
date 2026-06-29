/* Configurator logic for the ghost-toc-plugin demo page.
   Drives the widget (loaded from ./toc.js with data-auto="false") via its
   create()/destroy() API, regenerates the embed snippet, and reports usage to
   Umami. None of this ships with the distributed widget. */
(function () {
    var CDN = 'https://cdn.jsdelivr.net/gh/GreedyLabs/ghost-toc-plugin@1';
    var DEF = window.GreedyLabsGhostTOC.defaults;
    // per-page localized strings (set by each generated /<lang>/index.html)
    var I = window.GTOC_I18N || { copy: '복사', copyDone: '복사됨', defaultTitle: '목차' };
    var instance = null;
    var $ = function (id) { return document.getElementById(id); };

    // Safe Umami event tracker (no-op if the script is blocked/unloaded)
    function track(name, data) {
        try { if (window.umami && window.umami.track) { window.umami.track(name, data); } } catch (e) {}
    }

    // Parse an integer field, falling back to the default only when it's empty/
    // invalid — NOT when it's a legitimate 0 (a `|| DEF` would swallow zero).
    function intField(id, def) {
        var v = parseInt($(id).value, 10);
        return isNaN(v) ? def : v;
    }

    function read() {
        return {
            content: $('f-content').value.trim() || '.gh-content',
            headings: $('f-headings').value.trim() || 'h2,h3',
            title: $('f-title').value,
            position: $('f-position').value,
            useThemeAccent: $('f-useThemeAccent').checked,
            accent: $('f-accent').value,
            minWidth: intField('f-minWidth', DEF.minWidth),
            width: intField('f-width', DEF.width),
            gap: intField('f-gap', DEF.gap),
            top: intField('f-top', DEF.top)
        };
    }

    function render() {
        var o = read();
        $('f-accent').disabled = o.useThemeAccent;
        // move the control panel to the side opposite the TOC so it's always visible
        document.querySelector('.panel').classList.toggle('panel--right', o.position === 'left');

        if (instance) { instance.destroy(); instance = null; }
        instance = window.GreedyLabsGhostTOC.create({
            content: '.demo-article',
            headings: o.headings, title: o.title, position: o.position,
            accent: o.useThemeAccent ? undefined : o.accent,
            minWidth: o.minWidth, width: o.width, gap: o.gap, top: o.top
        });
        updateSnippet(o);
    }

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

    function updateSnippet(o) {
        var a = [];
        a.push('data-content="' + esc(o.content) + '"');
        a.push('data-headings="' + esc(o.headings) + '"');
        a.push('data-position="' + esc(o.position) + '"');
        a.push('data-title="' + esc(o.title) + '"');
        if (!o.useThemeAccent) { a.push('data-accent="' + esc(o.accent) + '"'); }
        if (o.minWidth !== DEF.minWidth) { a.push('data-min-width="' + o.minWidth + '"'); }
        if (o.width !== DEF.width) { a.push('data-width="' + o.width + '"'); }
        if (o.gap !== DEF.gap) { a.push('data-gap="' + o.gap + '"'); }
        if (o.top !== DEF.top) { a.push('data-top="' + o.top + '"'); }

        var code =
            '<link rel="stylesheet" href="' + CDN + '/toc.css">\n' +
            '<script src="' + CDN + '/toc.min.js"\n        ' +
            a.join('\n        ') + '><\/script>';
        $('snippet').textContent = code;
    }

    ['f-content', 'f-headings', 'f-title', 'f-position', 'f-useThemeAccent', 'f-accent', 'f-minWidth', 'f-width', 'f-gap', 'f-top']
        .forEach(function (id) {
            var el = $(id);
            el.addEventListener('input', render);
            // 'change' = committed value (fires once on blur/select), so it's the
            // right granularity for analytics — one event per actual adjustment.
            el.addEventListener('change', function () {
                render();
                track('config_change', {
                    field: id.slice(2), // strip "f-"
                    value: String(el.type === 'checkbox' ? el.checked : el.value).slice(0, 60)
                });
            });
        });

    $('copy').addEventListener('click', function () {
        var btn = this, o = read();
        track('copy_code', {
            position: o.position,
            headings: o.headings,
            useThemeAccent: o.useThemeAccent,
            customTitle: o.title !== I.defaultTitle,
            hidden: o.title === ''
        });
        navigator.clipboard.writeText($('snippet').textContent).then(function () {
            btn.textContent = I.copyDone; btn.classList.add('ok');
            setTimeout(function () { btn.textContent = I.copy; btn.classList.remove('ok'); }, 1500);
        });
    });

    // language dropdown → navigate to the selected /<lang>/
    var langSel = $('lang-select');
    if (langSel) { langSel.addEventListener('change', function () { location.href = this.value; }); }

    // theme switcher: light / dark / system. "system" follows the OS and reacts
    // to OS changes live; the chosen mode is persisted. Light/dark set on <html>
    // drive both the demo page and the TOC widget (via its CSS variables); giscus
    // is kept in sync over postMessage.
    var themeSel = $('theme-select');
    var mql = window.matchMedia('(prefers-color-scheme: dark)');
    function effectiveTheme(mode) { return mode === 'system' ? (mql.matches ? 'dark' : 'light') : mode; }
    function syncGiscus(theme) {
        var f = document.querySelector('iframe.giscus-frame');
        if (f && f.contentWindow) {
            f.contentWindow.postMessage({ giscus: { setConfig: { theme: theme } } }, 'https://giscus.app');
        }
    }
    function applyTheme(mode) {
        document.documentElement.setAttribute('data-theme', effectiveTheme(mode));
        syncGiscus(mode === 'system' ? 'preferred_color_scheme' : effectiveTheme(mode));
    }
    if (themeSel) {
        var saved = 'system';
        try { saved = localStorage.getItem('gtoc-theme') || 'system'; } catch (e) {}
        themeSel.value = saved;
        applyTheme(saved);
        themeSel.addEventListener('change', function () {
            try { localStorage.setItem('gtoc-theme', this.value); } catch (e) {}
            applyTheme(this.value);
            track('theme_change', { theme: this.value });
        });
        mql.addEventListener('change', function () {
            if (themeSel.value === 'system') { applyTheme('system'); }
        });
        // giscus loads lazily — push the current theme once it's ready (its
        // initial data-theme is preferred_color_scheme, which only matches "system").
        var giscusSynced = false;
        window.addEventListener('message', function (e) {
            if (e.origin !== 'https://giscus.app' || giscusSynced) { return; }
            if (e.data && e.data.giscus) {
                giscusSynced = true;
                if (themeSel.value !== 'system') { syncGiscus(effectiveTheme(themeSel.value)); }
            }
        });
    }

    render();
})();
