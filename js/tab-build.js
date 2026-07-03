(function () {

    const SAVE_KEY = 'genshin_build_tab_v1';

    const LEVEL_STEPS = ['1', '20', '40', '50', '60', '70', '80', '90'];
    const SOFT_CAP = 10;
    const HARD_CAP = 99;

    // Ascension breakpoints — which level unlocks which ascension phase (95/100 are weapon-only, ignored here)
    const ASCENSION_NOTES = {
        '1': { label: 'Freshly Pulled', stars: 0 },
        '20': { label: 'No', stars: 0 },
        '40': { label: '1st', stars: 1 },
        '50': { label: '2nd', stars: 2 },
        '60': { label: '3rd', stars: 3 },
        '70': { label: '4th', stars: 4 },
        '80': { label: '5th', stars: 5 },
        '90': { label: '6th', stars: 6 },
    };

    function levelStepNoteHtml(step) {
        const note = ASCENSION_NOTES[step];
        if (!note) return '';
        const stars = note.stars > 0 ? `<span class="level-item-stars">${'✦'.repeat(note.stars)}</span>` : '';
        return `<span class="level-item-note">${note.label}${step === '1' ? '' : ' ascension'}${stars ? ' ' + stars : ''}</span>`;
    }

    let builds = [];
    let swapOpenIds = new Set();

    function uid() {
        return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function elementIconPath(element) {
        if (!element || element === 'None') return null;
        return `assets/data/element_icons/Element_${element}.svg`;
    }

    function elementBadgeImg(element, size) {
        const path = elementIconPath(element);
        if (!path) return '';
        return `<img class="el-badge-icon" src="${path}" alt="" style="width:${size}px;height:${size}px;">`;
    }

    function iconHtml(entry) {
        if (entry && entry.icon) return `<img src="${entry.icon}" alt="">`;
        return `<div class="ac-icon-placeholder">?</div>`;
    }

    function starsHtml(rarity) {
        const cls = rarity === 5 ? 'gold-star' : '';
        return `<span class="${cls}" style="${rarity === 4 ? 'color:#c39bf0;font-weight:700;' : ''}">${rarity || 5}★</span>`;
    }

    // --- search (characters can be 4* or 5*, so we search the full DB directly) ---

    function searchAllCharacters(query) {
        const pool = GENSHIN_CHARACTER_DB;
        const trimmed = (query || '').trim().toLowerCase();
        const chosen = new Set(builds.filter(b => b.character).map(b => b.character.name));
        const available = pool.filter(c => !chosen.has(c.name));
        if (!trimmed) return available.slice(0, 8);
        return available.filter(c => c.name.toLowerCase().includes(trimmed)).slice(0, 8);
    }

    function searchAllWeapons(query) {
        const pool = GENSHIN_WEAPON_DB;
        const trimmed = (query || '').trim().toLowerCase();
        if (!trimmed) return pool.slice(0, 8);
        return pool.filter(w => w.name.toLowerCase().includes(trimmed)).slice(0, 8);
    }

    // --- build lifecycle ---

    function addBlankBuild() {
        if (builds.length >= HARD_CAP) return;
        builds.push({
            id: uid(),
            character: null,
            level: { from: '1', to: '90' },
            talents: {
                basic: { from: '1', to: '1' },
                skill: { from: '1', to: '1' },
                burst: { from: '1', to: '1' },
            },
            weapon: null,
            weaponLevel: null,
        });
        renderBuilds();
        saveState();
    }

    function setBuildCharacter(buildId, characterEntry) {
        const build = builds.find(b => b.id === buildId);
        if (!build) return;
        if (builds.some(b => b.id !== buildId && b.character && b.character.name === characterEntry.name)) return;
        build.character = characterEntry;
        swapOpenIds.delete(buildId);
        renderBuilds();
        saveState();
    }

    function removeBuild(id) {
        builds = builds.filter(b => b.id !== id);
        renderBuilds();
        saveState();
    }

    // --- per-card character autocomplete (for blank cards) ---

    function renderCharListFor(buildId, query) {
        const list = document.getElementById(`charList_${buildId}`);
        if (!list) return;
        const results = searchAllCharacters(query);
        if (!results.length) {
            list.classList.add('hidden');
            list.innerHTML = '';
            return;
        }
        list.innerHTML = results.map(entry => `
            <div class="autocomplete-item" data-name="${entry.name.replace(/"/g, '&quot;')}">
                ${iconHtml(entry)}
                <span class="ac-name">${entry.name}</span>
                <span class="ac-sub">${entry.element ? `<img class="el-icon" src="${elementIconPath(entry.element)}" alt="">${entry.element} • ` : ''}${starsHtml(entry.rarity)}</span>
            </div>
        `).join('');
        list.classList.remove('hidden');
    }

    // --- per-card weapon autocomplete ---

    function renderWeaponList(buildId, query) {
        const list = document.getElementById(`weaponList_${buildId}`);
        if (!list) return;
        const results = searchAllWeapons(query);
        if (!results.length) {
            list.classList.add('hidden');
            list.innerHTML = '';
            return;
        }
        list.innerHTML = results.map(entry => `
            <div class="autocomplete-item" data-wname="${entry.name.replace(/"/g, '&quot;')}">
                ${iconHtml(entry)}
                <span class="ac-name">${entry.name}</span>
                <span class="ac-sub">${entry.weaponType ? `${entry.weaponType} • ` : ''}${starsHtml(entry.rarity)}</span>
            </div>
        `).join('');
        list.classList.remove('hidden');
    }

    function setBuildWeapon(buildId, weaponEntry) {
        const build = builds.find(b => b.id === buildId);
        if (!build) return;
        build.weapon = weaponEntry;
        build.weaponLevel = { from: '1', to: '90' };
        renderBuilds();
        saveState();
    }

    function clearBuildWeapon(buildId) {
        const build = builds.find(b => b.id === buildId);
        if (!build) return;
        build.weapon = null;
        build.weaponLevel = null;
        renderBuilds();
        saveState();
    }

    // --- render ---

    function renderBlankCard(build) {
        return `
        <div class="section-card build-card" data-build-id="${build.id}">
            <div style="display:flex; align-items:center; gap:14px; margin-bottom:6px;">
                <div style="flex:1;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Choose a character</label>
                        <div class="autocomplete-wrap">
                            <input type="text" class="build-char-input" data-build-id="${build.id}" placeholder="e.g. Sandrone" autocomplete="off">
                            <div class="autocomplete-list hidden" id="charList_${build.id}"></div>
                        </div>
                    </div>
                </div>
                <button type="button" class="build-remove-btn" data-remove-build="${build.id}" title="Remove" aria-label="Remove" style="margin-top:26px;">&times;</button>
            </div>
        </div>`;
    }

    function renderBuildCard(build) {
        if (!build.character) return renderBlankCard(build);

        const c = build.character;
        const elBadge = elementBadgeImg(c.element, 20);

        const weaponBlock = build.weapon ? `
            <div class="selected-asset-chip" style="margin-top:14px;">
                ${iconHtml(build.weapon)}
                <div class="sac-name" style="font-size:1.05rem;">${build.weapon.name} <span class="sac-sub">${starsHtml(build.weapon.rarity)}</span></div>
                <button type="button" class="sac-clear" data-clear-weapon="${build.id}" title="Remove weapon">&times;</button>
            </div>

            <div class="form-group" style="margin-top:16px; margin-bottom:0;">
                <label>Weapon level</label>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <div class="range-sublabel">From</div>
                        <div class="updown-select" data-build-id="${build.id}">
                            <button type="button" class="updown-select-btn" data-level-toggle="${build.id}" data-range-dir="from" data-level-field="weaponLevel">
                                <span>${build.weaponLevel.from}</span>
                                <span class="chev">▾</span>
                            </button>
                            <div class="updown-select-list hidden" id="weaponLevelList_${build.id}_from">
                                ${LEVEL_STEPS.map(s => `<div class="updown-select-item ${s === build.weaponLevel.from ? 'active' : ''}" data-level-val="${s}">${s}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="range-sublabel">To</div>
                        <div class="updown-select" data-build-id="${build.id}">
                            <button type="button" class="updown-select-btn" data-level-toggle="${build.id}" data-range-dir="to" data-level-field="weaponLevel">
                                <span>${build.weaponLevel.to}</span>
                                <span class="chev">▾</span>
                            </button>
                            <div class="updown-select-list hidden" id="weaponLevelList_${build.id}_to">
                                ${LEVEL_STEPS.map(s => `<div class="updown-select-item ${s === build.weaponLevel.to ? 'active' : ''}" data-level-val="${s}">${s}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        ` : `
            <div class="autocomplete-wrap" style="margin-top:14px;">
                <input type="text" class="build-weapon-input" data-build-id="${build.id}" placeholder="Add weapon" autocomplete="off">
                <div class="autocomplete-list hidden" id="weaponList_${build.id}"></div>
            </div>
        `;

        const weaponCostRows = build.weapon ? `
                <div class="cost-row" style="margin-top:14px;">
                    <span class="cost-row-label">Weapon Mora <span class="cost-row-plan">→ ${build.weaponLevel.to}</span></span>
                    <span class="cost-row-value"><span class="cost-placeholder">—</span> Mora</span>
                </div>
                <div class="cost-row cost-row-sub">
                    <span class="cost-row-label">(other)</span>
                    <span class="cost-row-value"><span class="cost-placeholder">—</span></span>
                </div>
        ` : '';

        const headerBlock = swapOpenIds.has(build.id) ? `
            <div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:22px;">
                <span class="avatar-badge">
                    ${c.icon ? `<img src="${c.icon}" alt="" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);display:block;">` : `<div class="ac-icon-placeholder" style="width:52px;height:52px;">?</div>`}
                    ${elBadge}
                </span>
                <div style="flex:1;">
                    <div class="autocomplete-wrap">
                        <input type="text" class="build-char-input" data-build-id="${build.id}" placeholder="Swap character..." autocomplete="off">
                        <div class="autocomplete-list hidden" id="charList_${build.id}"></div>
                    </div>
                </div>
                <button type="button" class="build-remove-btn" data-remove-build="${build.id}" title="Remove character" aria-label="Remove character">&times;</button>
            </div>
        ` : `
            <div style="display:flex; align-items:center; gap:14px; margin-bottom:22px;">
                <button type="button" class="char-header-swap" data-swap-toggle="${build.id}" title="Click to change character">
                    <span class="avatar-badge">
                        ${c.icon ? `<img src="${c.icon}" alt="" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);display:block;">` : `<div class="ac-icon-placeholder" style="width:52px;height:52px;">?</div>`}
                        ${elBadge}
                    </span>
                    <div style="flex:1; text-align:left;">
                        <div style="font-size:1.2rem; font-weight:700;">${c.name}</div>
                        <div style="font-size:0.9rem; color:var(--text-muted); display:flex; align-items:center; gap:5px; margin-top:2px;">
                            ${c.element ? `${c.element} • ` : ''}${starsHtml(c.rarity)}
                        </div>
                    </div>
                </button>
                <button type="button" class="build-remove-btn" data-remove-build="${build.id}" title="Remove character" aria-label="Remove character">&times;</button>
            </div>
        `;

        return `
        <div class="section-card build-card" data-build-id="${build.id}">
            ${headerBlock}

            <div class="form-group">
                <label>Level</label>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                    <div>
                        <div class="range-sublabel">From</div>
                        <div class="updown-select" data-build-id="${build.id}">
                            <button type="button" class="updown-select-btn" data-level-toggle="${build.id}" data-range-dir="from" data-level-field="level">
                                <span>${build.level.from}</span>
                                <span class="chev">▾</span>
                            </button>
                            <div class="updown-select-list hidden" id="levelList_${build.id}_from">
                                ${LEVEL_STEPS.map(s => `<div class="updown-select-item ${s === build.level.from ? 'active' : ''}" data-level-val="${s}"><span class="level-item-main">${s}</span>${levelStepNoteHtml(s)}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                    <div>
                        <div class="range-sublabel">To</div>
                        <div class="updown-select" data-build-id="${build.id}">
                            <button type="button" class="updown-select-btn" data-level-toggle="${build.id}" data-range-dir="to" data-level-field="level">
                                <span>${build.level.to}</span>
                                <span class="chev">▾</span>
                            </button>
                            <div class="updown-select-list hidden" id="levelList_${build.id}_to">
                                ${LEVEL_STEPS.map(s => `<div class="updown-select-item ${s === build.level.to ? 'active' : ''}" data-level-val="${s}"><span class="level-item-main">${s}</span>${levelStepNoteHtml(s)}</div>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="form-group" style="margin-bottom:0;">
                <label>Talents <span style="color: var(--text-muted); font-weight:400; font-size:0.8rem;">— 1 to 10</span></label>
                <div class="talent-stack">
                    ${[
                        { key: 'basic', label: 'Basic Attack' },
                        { key: 'skill', label: 'Skill' },
                        { key: 'burst', label: 'Burst' },
                    ].map(({ key, label }) => `
                        <div class="talent-row">
                            <div class="talent-row-label">${label}</div>
                            <div class="talent-row-fields">
                                <div>
                                    <div class="range-sublabel">From</div>
                                    <input type="number" class="talent-input" data-build-id="${build.id}" data-talent="${key}" data-range-dir="from" min="1" max="10" step="1" value="${build.talents[key].from}">
                                </div>
                                <div>
                                    <div class="range-sublabel">To</div>
                                    <input type="number" class="talent-input" data-build-id="${build.id}" data-talent="${key}" data-range-dir="to" min="1" max="10" step="1" value="${build.talents[key].to}">
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div style="border-top:1px solid var(--border-color); margin:22px 0 0;"></div>
            ${weaponBlock}

            <div style="border-top:1px solid var(--border-color); margin:22px 0 0;"></div>
            <div class="cost-block">
                <div class="cost-block-title">Total Cost</div>

                <div class="cost-total-row">
                    <span class="cost-total-label">Total Mora</span>
                    <span class="cost-total-value"><span class="cost-placeholder">—</span> Mora</span>
                </div>

                <div class="cost-row" style="margin-top:14px;">
                    <span class="cost-row-label">Character level <span class="cost-row-plan" id="planLevel_${build.id}">→ ${build.level.to}</span></span>
                    <span class="cost-row-value"><span class="cost-placeholder">—</span> Mora</span>
                </div>
                <div class="cost-row cost-row-sub">
                    <span class="cost-row-label">(other)</span>
                    <span class="cost-row-value"><span class="cost-placeholder">—</span></span>
                </div>

                <div class="cost-row" style="margin-top:14px;">
                    <span class="cost-row-label">Talents <span class="cost-row-plan" id="planTalents_${build.id}">→ ${build.talents.basic.to}/${build.talents.skill.to}/${build.talents.burst.to}</span></span>
                    <span class="cost-row-value"><span class="cost-placeholder">—</span> Mora</span>
                </div>
                <div class="cost-row cost-row-sub">
                    <span class="cost-row-label">(other)</span>
                    <span class="cost-row-value"><span class="cost-placeholder">—</span></span>
                </div>
                ${weaponCostRows}
            </div>
        </div>`;
    }

    function renderBuilds() {
        const wrap = document.getElementById('buildCardsWrap');
        const emptyHint = document.getElementById('buildEmptyHint');
        const softHint = document.getElementById('buildSoftCapHint');
        const addBtn = document.getElementById('buildAddBtn');

        if (emptyHint) emptyHint.classList.toggle('hidden', builds.length > 0);

        if (softHint) {
            if (builds.length >= HARD_CAP) {
                softHint.textContent = `You've hit the ${HARD_CAP}-build cap. Remove one to add another.`;
                softHint.classList.remove('hidden');
            } else if (builds.length >= SOFT_CAP) {
                softHint.textContent = `${builds.length} builds and counting — this is a resin-based game, maybe pace yourself.`;
                softHint.classList.remove('hidden');
            } else {
                softHint.classList.add('hidden');
            }
        }

        if (addBtn) addBtn.disabled = builds.length >= HARD_CAP;

        if (!builds.length) {
            wrap.innerHTML = '';
            attachCardListeners();
            return;
        }
        wrap.innerHTML = builds.map(renderBuildCard).join('');
        attachCardListeners();
    }

    function attachCardListeners() {
        document.querySelectorAll('[data-remove-build]').forEach(btn => {
            btn.addEventListener('click', () => removeBuild(btn.dataset.removeBuild));
        });

        document.querySelectorAll('[data-swap-toggle]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                swapOpenIds.add(btn.dataset.swapToggle);
                renderBuilds();
            });
        });

        document.querySelectorAll('[data-level-toggle]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const buildId = btn.dataset.levelToggle;
                const dir = btn.dataset.rangeDir;
                const list = document.getElementById(`levelList_${buildId}_${dir}`);
                const isOpen = !list.classList.contains('hidden');
                closeAllLevelLists();
                if (!isOpen) {
                    list.classList.remove('hidden');
                    btn.classList.add('open');
                    const card = btn.closest('.build-card');
                    if (card) card.classList.add('has-open-dropdown');
                }
            });
        });

        document.querySelectorAll('.updown-select-item').forEach(item => {
            item.addEventListener('click', () => {
                const list = item.closest('.updown-select-list');
                const btn = list.previousElementSibling;
                const wrap = item.closest('.updown-select');
                const buildId = wrap.dataset.buildId;
                const dir = btn.dataset.rangeDir;
                const field = btn.dataset.levelField || 'level';
                const build = builds.find(b => b.id === buildId);
                if (build && build[field]) {
                    build[field][dir] = item.dataset.levelVal;
                    saveState();
                    renderBuilds();
                }
            });
        });

        document.querySelectorAll('.talent-input').forEach(input => {
            input.addEventListener('input', () => {
                let val = parseInt(input.value, 10);
                if (isNaN(val)) val = 1;
                val = Math.max(1, Math.min(10, val));
                input.value = val;
                const build = builds.find(b => b.id === input.dataset.buildId);
                if (build) {
                    build.talents[input.dataset.talent][input.dataset.rangeDir] = String(val);
                    saveState();
                    const planEl = document.getElementById(`planTalents_${build.id}`);
                    if (planEl) planEl.textContent = `→ ${build.talents.basic.to}/${build.talents.skill.to}/${build.talents.burst.to}`;
                }
            });
            input.addEventListener('blur', () => {
                if (input.value === '') { input.value = 1; }
            });
        });

        document.querySelectorAll('[data-clear-weapon]').forEach(btn => {
            btn.addEventListener('click', () => clearBuildWeapon(btn.dataset.clearWeapon));
        });

        attachWeaponInputListeners();
        attachCharInputListeners();
    }

    function closeAllLevelLists() {
        document.querySelectorAll('.updown-select-list').forEach(l => l.classList.add('hidden'));
        document.querySelectorAll('[data-level-toggle]').forEach(b => b.classList.remove('open'));
        document.querySelectorAll('.build-card.has-open-dropdown').forEach(c => c.classList.remove('has-open-dropdown'));
    }

    function attachCharInputListeners() {
        document.querySelectorAll('.build-char-input').forEach(input => {
            const buildId = input.dataset.buildId;
            input.addEventListener('input', (e) => renderCharListFor(buildId, e.target.value));
            input.addEventListener('focus', (e) => renderCharListFor(buildId, e.target.value));

            const list = document.getElementById(`charList_${buildId}`);
            if (list) {
                list.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const item = e.target.closest('.autocomplete-item');
                    if (!item) return;
                    const name = item.dataset.name;
                    const entry = GENSHIN_CHARACTER_DB.find(c => c.name === name);
                    if (entry) setBuildCharacter(buildId, entry);
                });
            }
        });
    }

    function attachWeaponInputListeners() {
        document.querySelectorAll('.build-weapon-input').forEach(input => {
            const buildId = input.dataset.buildId;
            input.addEventListener('input', (e) => renderWeaponList(buildId, e.target.value));
            input.addEventListener('focus', (e) => renderWeaponList(buildId, e.target.value));

            const list = document.getElementById(`weaponList_${buildId}`);
            if (list) {
                list.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    const item = e.target.closest('.autocomplete-item');
                    if (!item) return;
                    const name = item.dataset.wname;
                    const entry = GENSHIN_WEAPON_DB.find(w => w.name === name);
                    if (entry) setBuildWeapon(buildId, entry);
                });
            }
        });
    }

    // --- migration for older saved data (pre from/to ranges) ---

    function migrateBuild(b) {
        if (b && typeof b.level === 'string') {
            b.level = { from: '1', to: b.level };
        }
        if (b && b.talents) {
            ['basic', 'skill', 'burst'].forEach(t => {
                if (typeof b.talents[t] === 'string') {
                    const v = b.talents[t] === '0' ? '1' : b.talents[t];
                    b.talents[t] = { from: '1', to: v };
                }
            });
        }
        if (b && b.character === undefined) b.character = null;
        if (b && b.weapon && !b.weaponLevel) {
            b.weaponLevel = { from: '1', to: '90' };
        }
        if (b && !b.weapon) {
            b.weaponLevel = null;
        }
        return b;
    }

    // --- persistence ---

    function saveState() {
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(builds));
        } catch (e) { /* ignore, non-critical */ }
    }

    function loadState() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) builds = parsed.map(migrateBuild);
        } catch (e) { builds = []; }
    }

    // --- global wiring ---

    function initGlobalHandlers() {
        const addBtn = document.getElementById('buildAddBtn');
        if (addBtn && !addBtn.dataset.wired) {
            addBtn.dataset.wired = '1';
            addBtn.addEventListener('click', addBlankBuild);
        }

        if (!document.body.dataset.buildOutsideClickWired) {
            document.body.dataset.buildOutsideClickWired = '1';
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.autocomplete-wrap')) {
                    document.querySelectorAll('.autocomplete-list').forEach(l => {
                        l.classList.add('hidden');
                        l.innerHTML = '';
                    });
                }
                if (!e.target.closest('.updown-select')) {
                    closeAllLevelLists();
                }
                if (swapOpenIds.size && !e.target.closest('.build-card')) {
                    swapOpenIds.clear();
                    renderBuilds();
                }
            });
        }
    }

    let initialized = false;

    window.activateBuildTab = function () {
        if (!initialized) {
            loadState();
            initGlobalHandlers();
            initialized = true;
        }
        renderBuilds();
    };

})();
