/**
 * MobileNav — Mobil aile gezgini
 *
 * Ağaç görünümünün mobil karşılığı:
 * Ebeveyn → Mevcut Kişi → Çocuklar şeklinde tek ekranda gezinme.
 */
const MobileNav = (() => {
    'use strict';

    let flat         = {};   // id → kişi (parent_id + children dahil)
    let navStack     = [];   // gezinme geçmişi
    let containerEl  = null;

    // ── Düz harita ────────────────────────────────────
    function buildFlat(node, parentId = null) {
        flat[node.id] = {
            id:        node.id,
            name:      node.name,
            gen:       node.gen,
            parent_id: parentId,
            children:  node.children || [],
        };
        (node.children || []).forEach(c => buildFlat(c, node.id));
    }

    function current() { return flat[navStack[navStack.length - 1]]; }

    // ── Gezinme ────────────────────────────────────────
    function goTo(id, pushHistory = true) {
        if (!flat[id]) return;
        if (pushHistory) navStack.push(id);
        render();
    }

    function goBack() {
        if (navStack.length > 1) { navStack.pop(); render(); }
    }

    // ── Render ────────────────────────────────────────
    function render() {
        const person   = current();
        if (!person) return;
        const parent   = person.parent_id != null ? flat[person.parent_id] : null;
        const children = person.children;

        containerEl.innerHTML = '';
        containerEl.className = 'mob-navigator';

        // ── Geri + ata yolu çubuğu ──
        const topbar = make('div', 'mob-topbar');

        if (navStack.length > 1) {
            const backBtn = make('button', 'mob-topbar__back');
            backBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="15 18 9 12 15 6"/></svg> Geri`;
            backBtn.addEventListener('click', goBack);
            topbar.appendChild(backBtn);
        }

        // Ata yolu (son 4)
        const path = getAncestorPath(person.id).slice(-4);
        if (path.length) {
            const crumbs = make('div', 'mob-topbar__path');
            path.forEach((anc, i) => {
                const c = make('span', 'mob-crumb', anc.name);
                c.addEventListener('click', () => {
                    navStack = navStack.slice(0, navStack.indexOf(anc.id) + 1);
                    if (!navStack.includes(anc.id)) navStack.push(anc.id);
                    goTo(anc.id, false);
                });
                crumbs.appendChild(c);
                if (i < path.length - 1) crumbs.appendChild(make('span', 'mob-crumb-sep', '›'));
            });
            topbar.appendChild(crumbs);
        }

        containerEl.appendChild(topbar);

        // ── Ebeveyn bandı ──
        if (parent) {
            const band = make('button', 'mob-parent-band');
            band.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="18 15 12 9 6 15"/></svg>
                <span class="mob-parent-band__name">${esc(parent.name)}</span>
                <span class="mob-parent-band__gen">${parent.gen}. Kuşak</span>`;
            band.addEventListener('click', () => goTo(parent.id));
            containerEl.appendChild(band);
        }

        // ── Mevcut kişi kartı ──
        const hero = make('div', 'mob-hero');

        const avatar = make('div', 'mob-hero__avatar', getInitials(person.name));

        const info = make('div', 'mob-hero__info');
        const nameEl = make('h2', 'mob-hero__name', person.name);
        const genEl  = make('span', 'mob-hero__gen', person.gen + '. Kuşak');
        const childCountEl = make('span', 'mob-hero__meta',
            children.length ? `${children.length} çocuk` : 'Son kuşak');
        info.append(nameEl, genEl, childCountEl);

        const cardBtn = make('button', 'mob-hero__card-btn', 'Kişi Kartını Aç →');
        cardBtn.addEventListener('click', () => PersonCard.open(person.id));

        hero.append(avatar, info, cardBtn);
        containerEl.appendChild(hero);

        // ── Çocuklar ──
        if (children.length > 0) {
            const section = make('div', 'mob-section');
            const title   = make('h3', 'mob-section__title',
                `Çocuklar  (${children.length})`);
            section.appendChild(title);

            const ul = make('ul', 'mob-child-list');
            children.forEach(child => {
                const li       = make('li', 'mob-child-item');
                const nameSpan = make('span', 'mob-child-item__name', child.name);
                const meta     = make('div', 'mob-child-item__meta');
                const genBadge = make('span', 'mob-child-item__gen', child.gen + '. K');
                meta.appendChild(genBadge);

                if (child.children && child.children.length) {
                    meta.appendChild(
                        make('span', 'mob-child-item__count', child.children.length + ' çocuk')
                    );
                }

                const chevron = make('span', 'mob-child-item__arrow');
                chevron.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="9 18 15 12 9 6"/></svg>`;

                li.append(meta, nameSpan, chevron);
                li.addEventListener('click', () => goTo(child.id));
                ul.appendChild(li);
            });

            section.appendChild(ul);
            containerEl.appendChild(section);
        }
    }

    // ── Arama sonuçları ───────────────────────────────
    function renderSearch(query) {
        containerEl.innerHTML = '';
        containerEl.className = 'mob-navigator';

        const results = [];
        Object.values(flat).forEach(p => {
            if (p.name.toLocaleUpperCase('tr').includes(query)) results.push(p);
        });

        const header = make('div', 'mob-search-header');
        header.appendChild(make('h3', 'mob-search-title',
            results.length ? `${results.length} kişi bulundu` : 'Sonuç yok'));
        containerEl.appendChild(header);

        if (!results.length) {
            containerEl.appendChild(make('p', 'mob-empty', `"${query}" için eşleşme bulunamadı.`));
            return;
        }

        const ul = make('ul', 'mob-child-list');
        results.forEach(p => {
            const li       = make('li', 'mob-child-item');
            const nameSpan = make('span', 'mob-child-item__name', p.name);
            const meta     = make('div', 'mob-child-item__meta');
            meta.appendChild(make('span', 'mob-child-item__gen', p.gen + '. K'));

            // Ata yolu özeti
            const path = getAncestorPath(p.id).slice(-2).map(a => a.name).join(' › ');
            if (path) meta.appendChild(make('span', 'mob-child-item__path', path));

            const chevron = make('span', 'mob-child-item__arrow');
            chevron.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="9 18 15 12 9 6"/></svg>`;

            li.append(meta, nameSpan, chevron);
            li.addEventListener('click', () => {
                navStack = buildPathIds(p.id);
                render();
            });
            ul.appendChild(li);
        });
        containerEl.appendChild(ul);
    }

    // ── Yardımcılar ───────────────────────────────────
    function make(tag, cls, text = '') {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (text) el.textContent = text;
        return el;
    }

    function esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function getInitials(name) {
        return name.split(/[\s\-\(]+/).filter(Boolean)
            .slice(0, 2).map(w => w[0]).join('').toUpperCase().slice(0, 2);
    }

    function getAncestorPath(id) {
        const path = [];
        let cur = flat[id];
        while (cur && cur.parent_id != null) {
            cur = flat[cur.parent_id];
            if (cur) path.unshift(cur);
        }
        return path;
    }

    function buildPathIds(id) {
        const path = getAncestorPath(id);
        return [...path.map(p => p.id), id];
    }

    // ── Public API ────────────────────────────────────
    function init(containerSelector, hierarchyRoot) {
        containerEl = document.querySelector(containerSelector);
        flat = {};
        buildFlat(hierarchyRoot);
        navStack = [hierarchyRoot.id];
        render();
    }

    function search(query) {
        if (!query) render();
        else        renderSearch(query);
    }

    return { init, goTo, goBack, search };
})();
