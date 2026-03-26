/**
 * app.js — Ana uygulama kontrolcüsü
 */
(function () {
    'use strict';

    const API_URL   = 'data/family.json';
    const MOBILE_BP = 768;

    let sidebarOpen   = true;
    let hierarchyRoot = null;

    const isMobile = () => window.innerWidth <= MOBILE_BP;
    const $ = id => document.getElementById(id);

    // ── Veri yükleme ──────────────────────────────────
    async function fetchData() {
        $('view-container').innerHTML = '<p class="loading-msg">Yükleniyor…</p>';
        try {
            const res = await fetch(API_URL);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json();
        } catch (err) {
            $('view-container').innerHTML =
                `<p class="error-msg">Veri yüklenemedi: ${err.message}</p>`;
            return null;
        }
    }

    function buildHierarchy(people) {
        const map = {};
        people.forEach(p => { map[p.id] = { ...p, children: [] }; });
        let root = null;
        people.forEach(p => {
            if (!p.parent_id) root = map[p.id];
            else if (map[p.parent_id]) map[p.parent_id].children.push(map[p.id]);
        });
        return root;
    }

    function renderStats(people, root) {
        const maxGen = Math.max(...people.map(p => p.gen));
        const set = (id, v) => { const e = $(id); if (e) e.textContent = v; };
        set('stat-total', people.length);
        set('stat-gen',   maxGen);
        set('stat-root',  root ? root.name.split(' ').slice(0, 2).join(' ') : '—');
    }

    // ── Gezgini başlat ────────────────────────────────
    function initView() {
        const vc = $('view-container');
        vc.innerHTML = '';
        const navDiv = document.createElement('div');
        navDiv.id = 'nav-view';
        navDiv.style.cssText = 'flex:1;min-height:0;';
        vc.appendChild(navDiv);
        MobileNav.init('#nav-view', hierarchyRoot);
    }

    // ── Sidebar (desktop) ──────────────────────────────
    function openSidebar() {
        sidebarOpen = true;
        $('sidebar').classList.add('sidebar--open');
        $('burger-btn').classList.add('is-open');
        $('main-content').classList.remove('sidebar-hidden');
    }

    function closeSidebar() {
        sidebarOpen = false;
        $('sidebar').classList.remove('sidebar--open');
        $('burger-btn').classList.remove('is-open');
        $('main-content').classList.add('sidebar-hidden');
    }

    // ── Arama ─────────────────────────────────────────
    function handleSearch(query) {
        MobileNav.search(query.trim().toLocaleUpperCase('tr'));
    }

    // ── Events ────────────────────────────────────────
    function bindEvents() {
        $('burger-btn').addEventListener('click', () => {
            sidebarOpen ? closeSidebar() : openSidebar();
        });

        $('sidebar-overlay').addEventListener('click', closeSidebar);

        const si = $('search-input');
        if (si) si.addEventListener('input', e => handleSearch(e.target.value));

        const mi = $('mobile-search-input');
        if (mi) mi.addEventListener('input', e => handleSearch(e.target.value));

        $('person-card-backdrop').addEventListener('click', () => PersonCard.close());

        let wasMobile = isMobile();
        window.addEventListener('resize', () => {
            const nowMobile = isMobile();
            if (nowMobile !== wasMobile) {
                wasMobile = nowMobile;
                if (!isMobile()) openSidebar();
            }
        }, { passive: true });
    }

    // ── Başlangıç ─────────────────────────────────────
    async function init() {
        bindEvents();
        const people = await fetchData();
        if (!people) return;
        hierarchyRoot = buildHierarchy(people);
        renderStats(people, hierarchyRoot);
        PersonCard.init(hierarchyRoot);
        initView();
        if (!isMobile()) openSidebar();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
