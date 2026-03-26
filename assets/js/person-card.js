/**
 * PersonCard — Kişi kartı paneli
 * Hiyerarşik gezinme: çocuk / ebeveyn / kardeşlere tıklayarak geçiş
 */
const PersonCard = (() => {
    'use strict';

    // ── State ──────────────────────────────────────────
    let flat      = {};   // id → { id, name, gen, parent_id, children:[] }
    let navStack  = [];   // gezinme geçmişi (id dizisi)

    // ── SVG ikonları ──────────────────────────────────
    const ICONS = {
        back:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>`,
        close:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        chevron:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>`,
        children: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
        siblings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M15 11a4 4 0 0 1 0-8"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
        parent:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`,
    };

    // ── Yardımcılar ────────────────────────────────────
    function el(id)   { return document.getElementById(id); }
    function node(id) { return flat[id]; }

    function getAncestors(id) {
        const path = [];
        let cur = flat[id];
        while (cur && cur.parent_id != null) {
            cur = flat[cur.parent_id];
            if (cur) path.unshift(cur);
        }
        return path;
    }

    function getInitials(name) {
        return name
            .split(/[\s\-\(]+/)
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    // ── DOM oluşturma ──────────────────────────────────
    function makeEl(tag, cls, content = '') {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (content) e.textContent = content;
        return e;
    }

    // ── Panel render ───────────────────────────────────
    function render(id) {
        const person    = node(id);
        if (!person) return;

        const panel     = el('person-card-panel');
        const ancestors = getAncestors(id);
        const children  = person.children || [];
        const parent    = person.parent_id != null ? node(person.parent_id) : null;
        const siblings  = parent ? parent.children.filter(c => c.id !== id) : [];
        const hasBack   = navStack.length > 1;

        panel.innerHTML = '';

        // ── Topbar ──
        const topbar = makeEl('div', 'card__topbar');

        const backBtn = makeEl('button', `card__back-btn${hasBack ? '' : ' hidden'}`);
        backBtn.innerHTML = ICONS.back;
        backBtn.title = 'Geri';
        backBtn.addEventListener('click', navigateBack);

        const label = makeEl('span', 'card__topbar-label', 'Kişi Kartı');

        const closeBtn = makeEl('button', 'card__close-btn');
        closeBtn.innerHTML = ICONS.close;
        closeBtn.title = 'Kapat';
        closeBtn.addEventListener('click', close);

        topbar.append(backBtn, label, closeBtn);
        panel.appendChild(topbar);

        // ── Body ──
        const body = makeEl('div', 'card__body');

        // Breadcrumb
        if (ancestors.length > 0) {
            const bc = makeEl('div', 'card__breadcrumb');
            ancestors.forEach(a => {
                const crumb = makeEl('span', 'card__crumb', a.name);
                crumb.addEventListener('click', () => navigateTo(a.id));
                const sep   = makeEl('span', 'card__crumb-sep', '›');
                bc.append(crumb, sep);
            });
            const cur = makeEl('span', 'card__crumb card__crumb--current', person.name);
            bc.appendChild(cur);
            body.appendChild(bc);
        }

        // Hero
        const hero   = makeEl('div', 'card__hero');
        const avatar = makeEl('div', 'card__avatar', getInitials(person.name));
        const info   = makeEl('div', 'card__hero-info');
        const name   = makeEl('h2', 'card__name', person.name);
        const badges = makeEl('div', 'card__badges');

        const genBadge  = makeEl('span', 'card__badge badge--generation', `${person.gen}. Kuşak`);
        badges.appendChild(genBadge);

        if (children.length === 0) {
            const leafBadge = makeEl('span', 'card__badge badge--leaf', 'Son kuşak');
            badges.appendChild(leafBadge);
        }

        info.append(name, badges);
        hero.append(avatar, info);
        body.appendChild(hero);

        // Ebeveyn
        if (parent) {
            const sec   = makeEl('div', 'card__section');
            const title = makeEl('h3', 'card__section-title');
            title.innerHTML = ICONS.parent + ' Ebeveyn';
            const row   = makeEl('div', 'card__parent-row');
            const pName = makeEl('span', 'card__parent-name', parent.name);
            const pGen  = makeEl('span', 'card__parent-gen', `${parent.gen}. Kuşak`);
            const arr   = makeEl('span', 'card__list-arrow');
            arr.innerHTML = ICONS.chevron;
            row.append(pName, pGen, arr);
            row.addEventListener('click', () => navigateTo(parent.id));
            sec.append(title, row);
            body.appendChild(sec);
        }

        // Çocuklar
        {
            const sec   = makeEl('div', 'card__section');
            sec.style.marginTop = '14px';
            const title = makeEl('h3', 'card__section-title');
            title.innerHTML = ICONS.children + ` Çocuklar (${children.length})`;
            sec.appendChild(title);

            if (children.length > 0) {
                const ul = makeEl('ul', 'card__list');
                children.forEach(c => {
                    const li    = makeEl('li', 'card__list-item');
                    const cName = makeEl('span', 'card__list-name', c.name);
                    li.appendChild(cName);

                    const grandCount = (c.children || []).length;
                    if (grandCount > 0) {
                        const meta = makeEl('span', 'card__list-meta', `${grandCount} çocuk`);
                        li.appendChild(meta);
                    }

                    const arr = makeEl('span', 'card__list-arrow');
                    arr.innerHTML = ICONS.chevron;
                    li.appendChild(arr);

                    li.addEventListener('click', () => navigateTo(c.id));
                    ul.appendChild(li);
                });
                sec.appendChild(ul);
            } else {
                sec.appendChild(makeEl('p', 'card__empty', 'Bu kişinin çocuğu bulunmuyor.'));
            }

            body.appendChild(sec);
        }

        // Kardeşler (collapsible)
        if (siblings.length > 0) {
            const sec    = makeEl('div', 'card__section');
            sec.style.marginTop = '10px';

            const toggle = makeEl('div', 'card__siblings-toggle');
            toggle.innerHTML = ICONS.chevron + ` Kardeşler (${siblings.length})`;
            toggle.title = 'Aç/Kapat';

            const list = makeEl('div', 'card__siblings-list');
            const ul   = makeEl('ul', 'card__list');

            siblings.forEach(s => {
                const li    = makeEl('li', 'card__list-item');
                const sName = makeEl('span', 'card__list-name', s.name);
                const arr   = makeEl('span', 'card__list-arrow');
                arr.innerHTML = ICONS.chevron;
                li.append(sName, arr);
                li.addEventListener('click', () => navigateTo(s.id));
                ul.appendChild(li);
            });

            list.appendChild(ul);

            toggle.addEventListener('click', () => {
                const open = list.classList.toggle('is-open');
                toggle.classList.toggle('is-open', open);
            });

            sec.append(toggle, list);
            body.appendChild(sec);
        }

        panel.appendChild(body);
    }

    // ── Gezinme ────────────────────────────────────────
    function navigateTo(id) {
        navStack.push(id);
        render(id);
    }

    function navigateBack() {
        if (navStack.length > 1) {
            navStack.pop();
            render(navStack[navStack.length - 1]);
        }
    }

    // ── Aç / Kapat ─────────────────────────────────────
    function open(id) {
        navStack = [id];
        render(id);
        el('person-card').classList.add('is-open');
    }

    function close() {
        el('person-card').classList.remove('is-open');
        navStack = [];
    }

    // ── Init: veriyi düz haritaya çevir ───────────────
    function buildFlat(nodeData, parentId = null) {
        flat[nodeData.id] = {
            id:        nodeData.id,
            name:      nodeData.name,
            gen:       nodeData.gen,
            parent_id: parentId,
            children:  nodeData.children || [],
        };
        (nodeData.children || []).forEach(child => buildFlat(child, nodeData.id));
    }

    function init(hierarchyRoot) {
        flat = {};
        buildFlat(hierarchyRoot);
    }

    return { init, open, close, navigateTo, navigateBack };
})();
