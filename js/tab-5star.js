
let priorityPipeline = [];
    let draggedElementId = null;

    const currentWishesEl = document.getElementById('currentWishes');
    const currentStarglitterEl = document.getElementById('currentStarglitter');
    const wishesPerPatchEl = document.getElementById('wishesPerPatch');
    const totalPatchesEl = document.getElementById('totalPatchesPlan');
    const starglitterEl = document.getElementById('starglitterRate');
    const charSoftPityEl = document.getElementById('charSoftPity');
    const wepSoftPityEl = document.getElementById('wepSoftPity');
    const charPityEl = document.getElementById('charPity');
    const wepPityEl = document.getElementById('wepPity');

    const hasWelkinEl = document.getElementById('hasWelkin');
    const hasBPEl = document.getElementById('hasBP');

    function updateStarglitterHint() {
        const sg = parseInt(currentStarglitterEl.value) || 0;
        const wishes = Math.floor(sg / 5);
        const hint = document.getElementById('starglitterWishCount');
        hint.textContent = wishes > 0 ? `→ ${wishes} wish${wishes !== 1 ? 'es' : ''} (+${sg % 5} leftover)` : '';
    }

    currentStarglitterEl.addEventListener('input', () => { updateStarglitterHint(); calculateForecast(); });
    updateStarglitterHint();

    [currentWishesEl, wishesPerPatchEl, starglitterEl, charSoftPityEl, wepSoftPityEl, charPityEl, wepPityEl].forEach(el => el.addEventListener('input', calculateForecast));
    [hasWelkinEl, hasBPEl].forEach(el => el.addEventListener('change', calculateForecast));

    function updateTargetPatchOptions(extendTo) {
        const patchSelect = document.getElementById('targetPatch');
        const totalPatches = parseInt(totalPatchesEl.value) || 0;
        const rangeMax = typeof extendTo === 'number' ? Math.max(totalPatches, extendTo) : totalPatches;
        const currentValue = patchSelect.value;

        patchSelect.innerHTML = '';
        for(let i = 0; i <= rangeMax; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            if (i === 0) opt.innerText = "Current Patch";
            else if (i === 1) opt.innerText = "Next Patch";
            else if (i === 2) opt.innerText = "2 Patches Later";
            else opt.innerText = `${i} Patches Later`;
            patchSelect.appendChild(opt);
        }

        if (currentValue && parseInt(currentValue) <= rangeMax) {
            patchSelect.value = currentValue;
        } else {
            patchSelect.value = "0";
        }

        updateTimelineExplanation();
        if (typeof syncTargetPatchUIFromValue === 'function') syncTargetPatchUIFromValue();
    }

    const targetPatchSelect = document.getElementById('targetPatch');
    const targetPatchCurrentEl = document.getElementById('targetPatchCurrent');
    const targetPatchLaterEl = document.getElementById('targetPatchLater');
    const targetPatchLaterGroup = document.getElementById('targetPatchLaterGroup');
    const targetPatchLaterInput = document.getElementById('targetPatchLaterInput');

    function applyTargetPatchValue(value) {
        const v = Math.min(8, Math.max(0, value));
        updateTargetPatchOptions(v);
        targetPatchSelect.value = String(v);
        syncTargetPatchUIFromValue();
        targetPatchSelect.dispatchEvent(new Event('change'));
        calculateForecast();
        saveState();
    }

    function syncTargetPatchUIFromValue() {
        const v = parseInt(targetPatchSelect.value) || 0;
        if (v === 0) {
            targetPatchCurrentEl.checked = true;
            targetPatchLaterGroup.classList.add('hidden');
            targetPatchLaterInput.value = '';
        } else {
            targetPatchLaterEl.checked = true;
            targetPatchLaterGroup.classList.remove('hidden');
            targetPatchLaterInput.value = v;
        }
    }

    targetPatchCurrentEl.addEventListener('change', () => {
        if (targetPatchCurrentEl.checked) {
            targetPatchLaterGroup.classList.add('hidden');
            applyTargetPatchValue(0);
        }
    });

    targetPatchLaterEl.addEventListener('change', () => {
        if (targetPatchLaterEl.checked) {
            targetPatchLaterGroup.classList.remove('hidden');
            targetPatchLaterInput.focus();
            applyTargetPatchValue(parseInt(targetPatchLaterInput.value) || 1);
        }
    });

    targetPatchLaterInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (e.target.value === '' || isNaN(val)) return;
        if (val > 8) e.target.value = 8;
        else if (val < 1) e.target.value = 1;
        applyTargetPatchValue(parseInt(e.target.value));
    });

    targetPatchLaterInput.addEventListener('blur', (e) => {
        if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
            e.target.value = 1;
            applyTargetPatchValue(1);
        }
    });

    totalPatchesEl.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (e.target.value === '' || isNaN(val)) return;
        if (val > 8) e.target.value = 8;
        else if (val < 0) e.target.value = 0;
        renderCustomIncomeRows();
        updateTargetPatchOptions();
        calculateForecast();
    });

    totalPatchesEl.addEventListener('blur', (e) => {
        if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
            e.target.value = 0;
            renderCustomIncomeRows();
            updateTargetPatchOptions();
            calculateForecast();
        }
    });

    document.querySelectorAll('input[name="incomeMode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'average') {
                document.getElementById('averageIncomeGroup').classList.remove('hidden');
                document.getElementById('customIncomeGroup').classList.add('hidden');
                document.getElementById('subscriptionsGroup').classList.remove('hidden');
            } else {
                document.getElementById('averageIncomeGroup').classList.add('hidden');
                document.getElementById('customIncomeGroup').classList.remove('hidden');
                document.getElementById('subscriptionsGroup').classList.add('hidden');
                hasWelkinEl.checked = false;
                hasBPEl.checked = false;
            }
            calculateForecast();
        });
    });

    function renderCustomIncomeRows() {
        const total = parseInt(totalPatchesEl.value) || 0;
        const container = document.getElementById('customIncomeGroup');
        container.innerHTML = '<label>Custom Base Wishes Per Patch</label>';
        for (let i = 0; i <= total; i++) {
            let labelStr;
            if (i === 0) labelStr = "Current Patch";
            else if (i === 1) labelStr = "Next Patch";
            else if (i === 2) labelStr = "2 Patches Later";
            else labelStr = `${i} Patches Later`;
            container.innerHTML += `
                <div class="custom-patch-row">
                    <div class="custom-patch-label">${labelStr}</div>
                    <input type="number" class="custom-val-input" data-index="${i}" value="80" min="0">
                </div>
            `;
        }
        document.querySelectorAll('.custom-val-input').forEach(inp => {
            inp.addEventListener('input', calculateForecast);
            inp.addEventListener('input', saveState);
        });
    }
    renderCustomIncomeRows();

    function getPatchIncome(index) {
        let baseIncome = 0;
        const mode = document.querySelector('input[name="incomeMode"]:checked').value;
        if (mode === 'average') {
            baseIncome = parseInt(wishesPerPatchEl.value) || 0;
        } else {
            const el = document.querySelector(`.custom-val-input[data-index="${index}"]`);
            baseIncome = el ? parseInt(el.value) || 0 : 0;
        }
        const welkinBonus = hasWelkinEl.checked ? 23 : 0;
        const bpBonus = hasBPEl.checked ? 9 : 0;
        return baseIncome + welkinBonus + bpBonus;
    }

    document.querySelectorAll('input[name="assetType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const nameInput = document.getElementById('assetName');
            if (e.target.value === 'character') {
                document.getElementById('charOptions').classList.remove('hidden');
                document.getElementById('weaponOptions').classList.add('hidden');
                nameInput.placeholder = 'e.g. Sandrone';
            } else {
                document.getElementById('charOptions').classList.add('hidden');
                document.getElementById('weaponOptions').classList.remove('hidden');
                nameInput.placeholder = 'e.g. A Teaspoon of Transcendence';
            }
            clearSelectedAsset();
            hideAssetList();
        });
    });

    let selectedAsset = null;

    function currentAssetType() {
        return document.querySelector('input[name="assetType"]:checked').value;
    }

    function assetIconHtml(entry, sizeClass) {
        if (entry && entry.icon) {
            return `<img src="${entry.icon}" alt="">`;
        }
        return `<div class="ac-icon-placeholder">?</div>`;
    }

    function elementIconPath(element) {
        if (!element || element === 'None') return null;
        return `assets/data/element_icons/Element_${element}.svg`;
    }

    function avatarBadgeHtml(iconUrl, elementPath, size, badgeSize) {
        const avatarHtml = iconUrl
            ? `<img src="${iconUrl}" alt="" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:1px solid var(--border-color);display:block;">`
            : `<div class="ac-icon-placeholder" style="width:${size}px;height:${size}px;">?</div>`;
        const badgeHtml = elementPath
            ? `<img class="el-badge-icon" src="${elementPath}" alt="" style="width:${badgeSize}px;height:${badgeSize}px;">`
            : '';
        return `<span class="avatar-badge">${avatarHtml}${badgeHtml}</span>`;
    }

    function assetSubLabel(entry) {
        if (!entry) return '';
        if (entry.isCustom) return 'Custom • Unreleased';
        if (entry.element) {
            const iconPath = elementIconPath(entry.element);
            const iconHtml = iconPath ? `<img class="el-icon" src="${iconPath}" alt="">` : '';
            return `${iconHtml}${entry.element} • <span class="gold-star">5★</span>`;
        }
        if (entry.weaponType) return `${entry.weaponType} • <span class="gold-star">5★</span>`;
        return `<span class="gold-star">5★</span>`;
    }

    function hideAssetList() {
        const list = document.getElementById('assetNameList');
        list.classList.add('hidden');
        list.innerHTML = '';
    }

    function renderAssetList(query) {
        const list = document.getElementById('assetNameList');
        const type = currentAssetType();
        const results = type === 'character' ? searchGenshinCharacters(query) : searchGenshinWeapons(query);
        const trimmed = query.trim();
        const exactMatch = results.some(r => r.name.toLowerCase() === trimmed.toLowerCase());

        let html = results.slice(0, 8).map(entry => `
            <div class="autocomplete-item" data-name="${entry.name.replace(/"/g, '&quot;')}">
                ${assetIconHtml(entry)}
                <span class="ac-name">${entry.name}</span>
                <span class="ac-sub">${assetSubLabel(entry)}</span>
            </div>
        `).join('');

        if (trimmed && !exactMatch) {
            const customIcon = type === 'character'
                ? 'assets/data/custom_icons/Lumine_Placeholder_custom.webp'
                : 'assets/data/custom_icons/Weapon_Dull_Blade_custom.webp';
            html += `
                <div class="autocomplete-item ac-custom" data-custom="${trimmed.replace(/"/g, '&quot;')}">
                    <img src="${customIcon}" alt="">
                    <span class="ac-name">Custom: "${trimmed}"</span>
                </div>
            `;
        }

        if (!html) {
            hideAssetList();
            return;
        }
        list.innerHTML = html;
        list.classList.remove('hidden');
    }

    function selectAssetByName(name) {
        const type = currentAssetType();
        const entry = type === 'character' ? getGenshinCharacter(name) : getGenshinWeapon(name);
        applySelectedAsset(entry || (type === 'character' ? makeCustomCharacter(name) : makeCustomWeapon(name)));
    }

    function selectCustomAsset(name) {
        const type = currentAssetType();
        applySelectedAsset(type === 'character' ? makeCustomCharacter(name) : makeCustomWeapon(name));
    }

    function applySelectedAsset(entry) {
        selectedAsset = entry;
        document.getElementById('assetName').value = entry.name;
        renderSelectedAssetChip();
        hideAssetList();
    }

    function clearSelectedAsset() {
        selectedAsset = null;
        const chip = document.getElementById('selectedAssetChip');
        chip.classList.add('hidden');
        chip.innerHTML = '';
    }

    function assetNameLine(entry) {
        if (!entry) return '';
        if (entry.isCustom) return `${entry.name} <span style="color: var(--text-muted); font-weight:500; font-size:0.7em;">(Custom)</span>`;
        const iconPath = elementIconPath(entry.element);
        const icon = iconPath ? `<img class="el-icon" src="${iconPath}" alt="" style="width:22px;height:22px;margin:0 2px;">` : '';
        const wepType = (!iconPath && entry.weaponType) ? `<span style="color: var(--text-muted); font-weight:500; font-size:0.6em; vertical-align:2px; margin: 0 8px 0 6px;">(${entry.weaponType})</span>` : ' ';
        return `${entry.name}${icon}${wepType}<span class="gold-star">5★</span>`;
    }

    function renderSelectedAssetChip() {
        const chip = document.getElementById('selectedAssetChip');
        if (!selectedAsset) { chip.classList.add('hidden'); chip.innerHTML = ''; return; }
        chip.innerHTML = `
            ${assetIconHtml(selectedAsset)}
            <div class="sac-name">${assetNameLine(selectedAsset)}</div>
            <button type="button" class="sac-clear" id="sacClearBtn" title="Clear selection">&times;</button>
        `;
        chip.classList.remove('hidden');
        document.getElementById('sacClearBtn').addEventListener('click', () => {
            clearSelectedAsset();
            document.getElementById('assetName').value = '';
            document.getElementById('assetName').focus();
        });
    }

    const assetNameInput = document.getElementById('assetName');

    assetNameInput.addEventListener('input', (e) => {
        if (selectedAsset && selectedAsset.name !== e.target.value) clearSelectedAsset();
        renderAssetList(e.target.value);
    });

    assetNameInput.addEventListener('focus', (e) => {
        renderAssetList(e.target.value);
    });

    document.getElementById('assetNameList').addEventListener('mousedown', (e) => {

        e.preventDefault();
        const item = e.target.closest('.autocomplete-item');
        if (!item) return;
        if (item.dataset.custom !== undefined) {
            selectCustomAsset(item.dataset.custom);
        } else if (item.dataset.name !== undefined) {
            selectAssetByName(item.dataset.name);
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.autocomplete-wrap')) hideAssetList();
    });

    function updateTimelineExplanation() {
        const pSelect = document.getElementById('targetPatch');
        const hSelect = document.querySelector('input[name="bannerHalf"]:checked');
        if(!pSelect || !hSelect) return;
        const val = parseInt(pSelect.value) || 0;
        let patchLabel;
        if (val === 0) patchLabel = "current patch";
        else if (val === 1) patchLabel = "next patch";
        else patchLabel = `${val} patches from now`;
        let text = val === 0 ? "Allocating base wishes" : `Allocating base + income through ${patchLabel}`;
        text += hSelect.value === 'first' ? " + 65% of banner patch." : " + 100% of banner patch.";
        document.getElementById('timelineExplanation').innerText = text;
    }

    document.getElementById('targetPatch').addEventListener('change', updateTimelineExplanation);
    document.querySelectorAll('input[name="bannerHalf"]').forEach(r => r.addEventListener('change', updateTimelineExplanation));

    function enforceGoalFloor() {
        const charCurEl = document.getElementById('charCurrentConst');
        const charGoalEl = document.getElementById('charConst');
        if (charCurEl && charGoalEl) {
            const current = parseInt(charCurEl.value);
            const floor = Math.max(0, current + 1);
            Array.from(charGoalEl.options).forEach(opt => {
                opt.disabled = parseInt(opt.value) < floor;
            });
            if (parseInt(charGoalEl.value) < floor) charGoalEl.value = String(floor);
        }
        const wepCurEl = document.getElementById('weaponCurrentRefine');
        const wepGoalEl = document.getElementById('weaponRefinement');
        if (wepCurEl && wepGoalEl) {
            const current = parseInt(wepCurEl.value);
            const floor = Math.max(1, current + 1);
            Array.from(wepGoalEl.options).forEach(opt => {
                opt.disabled = parseInt(opt.value) < floor;
            });
            if (parseInt(wepGoalEl.value) < floor) wepGoalEl.value = String(floor);
        }
    }

    function updateCopiesExplanation() {
        enforceGoalFloor();
        const charGoalEl = document.getElementById('charConst');
        const charCurEl = document.getElementById('charCurrentConst');
        if (charGoalEl && charCurEl) {
            const goal = parseInt(charGoalEl.value);
            const current = parseInt(charCurEl.value);
            const needed = Math.max(0, goal - current);
            const el = document.getElementById('charCopiesExplanation');
            if (el) el.innerText = needed === 0 ? "Goal already met — 0 pulls needed." : `Need ${needed} more cop${needed === 1 ? 'y' : 'ies'} to go from C${current < 0 ? '(none)' : current} to C${goal}.`;
        }
        const wepGoalEl = document.getElementById('weaponRefinement');
        const wepCurEl = document.getElementById('weaponCurrentRefine');
        if (wepGoalEl && wepCurEl) {
            const goal = parseInt(wepGoalEl.value);
            const current = parseInt(wepCurEl.value);
            const needed = Math.max(0, goal - current);
            const el = document.getElementById('wepCopiesExplanation');
            if (el) el.innerText = needed === 0 ? "Goal already met — 0 pulls needed." : `Need ${needed} more cop${needed === 1 ? 'y' : 'ies'} to go from R${current < 1 ? '(none)' : current} to R${goal}.`;
        }
    }
    ['charConst', 'charCurrentConst', 'weaponRefinement', 'weaponCurrentRefine'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', updateCopiesExplanation);
    });

    function renderPipeline() {
        const container = document.getElementById('priorityContainer');
        container.innerHTML = '';
        priorityPipeline.forEach((item) => {
            const div = document.createElement('div');
            div.className = 'priority-item';
            div.draggable = true;
            div.setAttribute('data-id', item.id);
            let strategyClass = item.strategy === 'Hard Lock' ? 'tag-hard-lock' : (item.strategy === 'One Shot' ? 'tag-one-shot' : 'tag-optional');
            const patchLabel = item.targetPatch === 0 ? 'Current Patch' : item.targetPatch === 1 ? 'Next Patch' : item.targetPatch === 2 ? '2 Patches Later' : `${item.targetPatch} Patches Later`;
            let meta = `${patchLabel} (${item.bannerHalf === 'first' ? '1st' : '2nd'} Half) • ${item.type === 'character' ? item.constellation : 'R' + (item.refinement || 1)}`;
            const isEnabled = item.enabled !== false;
            if (!isEnabled) div.classList.add('disabled-item');
            const iconHtml = avatarBadgeHtml(item.icon, elementIconPath(item.element), 52, 20);
            div.innerHTML = `
                <div class="drag-handle">⋮⋮</div>
                ${iconHtml}
                <div class="item-details">
                    <div class="item-name">${item.name} <span class="item-tag ${strategyClass}">${item.strategy}</span></div>
                    <div class="item-meta">${meta}</div>
                </div>
                <button class="toggle-btn ${isEnabled ? 'enabled' : ''}" title="${isEnabled ? 'Disable' : 'Enable'}" onclick="togglePipelineItem('${item.id}')">${isEnabled ? '●' : '○'}</button>
                <button class="edit-btn" onclick="editPipelineItem('${item.id}')">✏️</button>
                <button class="delete-btn" onclick="removePipelineItem('${item.id}')">&times;</button>
            `;
            div.addEventListener('dragstart', (e) => { draggedElementId = item.id; });
            div.addEventListener('dragover', (e) => e.preventDefault());
            div.addEventListener('drop', (e) => {
                e.preventDefault();
                const targetId = div.getAttribute('data-id');
                if (draggedElementId !== targetId) {
                    const dragIdx = priorityPipeline.findIndex(x => x.id === draggedElementId);
                    const dropIdx = priorityPipeline.findIndex(x => x.id === targetId);
                    const temp = priorityPipeline[dragIdx];
                    priorityPipeline.splice(dragIdx, 1);
                    priorityPipeline.splice(dropIdx, 0, temp);
                    pipelineUpdated();
                }
            });
            container.appendChild(div);
        });
    }

    function removePipelineItem(id) {
        priorityPipeline = priorityPipeline.filter(x => x.id !== id);
        pipelineUpdated();
    }

    function togglePipelineItem(id) {
        const item = priorityPipeline.find(x => x.id === id);
        if (!item) return;
        item.enabled = item.enabled === false ? true : false;
        pipelineUpdated();
    }

    let editingId = null;

    function editPipelineItem(id) {
        const item = priorityPipeline.find(x => x.id === id);
        if (!item) return;
        editingId = id;
        updateTargetPatchOptions();

        document.querySelector(`input[name="assetType"][value="${item.type}"]`).checked = true;
        document.getElementById('charOptions').classList.toggle('hidden', item.type !== 'character');
        document.getElementById('weaponOptions').classList.toggle('hidden', item.type !== 'weapon');
        document.getElementById('assetName').placeholder = item.type === 'character' ? 'e.g. Sandrone' : 'e.g. A Teaspoon of Transcendence';

        document.getElementById('assetName').value = item.name;
        hideAssetList();
        applySelectedAsset({
            name: item.name,
            rarity: 5,
            element: item.element || null,
            weaponType: item.weaponType || null,
            icon: item.icon || null,
            isCustom: item.isCustom !== false && !item.icon
        });

        document.getElementById('targetPatch').value = item.targetPatch;
        syncTargetPatchUIFromValue();

        document.querySelector(`input[name="bannerHalf"][value="${item.bannerHalf}"]`).checked = true;

        document.getElementById('strategyRule').value = item.strategy;

        if (item.type === 'character') {
            document.getElementById('charConst').value = item.constellation.replace('C', '');
            document.getElementById('charCurrentConst').value = (item.currentConst !== undefined) ? item.currentConst : -1;
            document.querySelector(`input[name="charGuar"][value="${item.guaranteed}"]`).checked = true;
        } else {
            document.getElementById('weaponRefinement').value = item.refinement || 1;
            document.getElementById('weaponCurrentRefine').value = (item.currentRefine !== undefined) ? item.currentRefine : 0;
            document.querySelector(`input[name="wepGuar"][value="${item.guaranteed || 'no'}"]`).checked = true;
        }

        updateTimelineExplanation();
        updateCopiesExplanation();
        document.getElementById('sec-creator').classList.remove('hidden');
        document.getElementById('openCreatorBtn').classList.add('hidden');
        document.getElementById('saveAsset').textContent = 'Update';
        document.getElementById('sec-creator').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    document.getElementById('openCreatorBtn').addEventListener('click', () => {
        updateTargetPatchOptions();
        document.getElementById('sec-creator').classList.remove('hidden');
        document.getElementById('openCreatorBtn').classList.add('hidden');
        document.getElementById('sec-creator').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('cancelAsset').addEventListener('click', (e) => { e.preventDefault(); closeCreator(); });

    document.getElementById('saveAsset').addEventListener('click', (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="assetType"]:checked').value;
        const typedName = document.getElementById('assetName').value.trim() || (type === 'character' ? 'Sandrone' : 'A Teaspoon of Transcendence');

        let resolved = (selectedAsset && selectedAsset.name === typedName) ? selectedAsset : null;
        if (!resolved) {
            resolved = type === 'character' ? getGenshinCharacter(typedName) : getGenshinWeapon(typedName);
            if (!resolved) resolved = type === 'character' ? makeCustomCharacter(typedName) : makeCustomWeapon(typedName);
        }
        const name = resolved.name;
        const strategy = document.getElementById('strategyRule').value;
        const chosenTargetPatch = parseInt(document.getElementById('targetPatch').value) || 0;
        if (chosenTargetPatch > (parseInt(totalPatchesEl.value) || 0)) {
            totalPatchesEl.value = chosenTargetPatch;
            renderCustomIncomeRows();
            updateTargetPatchOptions();
        }
        let item = {
            id: editingId || Date.now().toString(), type, name, strategy,
            icon: resolved.icon || null,
            element: resolved.element || null,
            weaponType: resolved.weaponType || null,
            isCustom: !!resolved.isCustom,
            targetPatch: chosenTargetPatch,
            bannerHalf: document.querySelector('input[name="bannerHalf"]:checked').value
        };
        if (type === 'character') {
            const goal = parseInt(document.getElementById('charConst').value);
            const current = parseInt(document.getElementById('charCurrentConst').value);
            item.constellation = 'C' + goal;
            item.currentConst = current;
            item.copies = Math.max(0, goal - current);
            item.guaranteed = document.querySelector('input[name="charGuar"]:checked').value;
        } else {
            const goal = parseInt(document.getElementById('weaponRefinement').value);
            const current = parseInt(document.getElementById('weaponCurrentRefine').value);
            item.refinement = goal;
            item.currentRefine = current;
            item.copies = Math.max(0, goal - current);
            item.guaranteed = document.querySelector('input[name="wepGuar"]:checked').value;
        }
        if (editingId) {
            const idx = priorityPipeline.findIndex(x => x.id === editingId);
            if (idx !== -1) priorityPipeline[idx] = item;
        } else {
            priorityPipeline.push(item);
        }
        closeCreator();
        pipelineUpdated();
    });

    function closeCreator() {
        editingId = null;
        document.getElementById('sec-creator').classList.add('hidden');
        document.getElementById('openCreatorBtn').classList.remove('hidden');
        document.getElementById('assetName').value = '';
        document.getElementById('saveAsset').textContent = 'Save';
        clearSelectedAsset();
        hideAssetList();
    }

    let wishTotalsExpanded = false;
    function renderWishTotals() {
        const finalEl = document.getElementById('wishTotalsFinal');
        const bodyEl = document.getElementById('wishTotalsBody');
        if (!finalEl || !bodyEl) return;
        const baseWishes = (parseInt(currentWishesEl.value) || 0) + Math.floor((parseInt(currentStarglitterEl.value) || 0) / 5);
        const totalPatches = Math.max(0, Math.min(8, parseInt(totalPatchesEl.value) || 0));

        let rows = '';

        let running = baseWishes;
        for (let i = 0; i <= totalPatches; i++) {
            const full = getPatchIncome(i);
            const firstHalf = Math.floor(full * 0.65);
            const firstHalfTotal = running + firstHalf;
            const fullTotal = running + full;
            const label = i === 0 ? 'Current Patch' : i === 1 ? 'Next Patch' : `${i} Patches Later`;

            rows += `
                <div class="wish-totals-row">
                    <div class="wish-totals-label">${label}</div>
                    <div class="wish-totals-vals">
                        <span>First Half: <strong>${firstHalfTotal}</strong></span>
                        <span>Total: <strong>${fullTotal}</strong></span>
                    </div>
                </div>
            `;
            running = fullTotal;
        }

        finalEl.textContent = running;
        bodyEl.innerHTML = rows;
        bodyEl.classList.toggle('hidden', !wishTotalsExpanded);
    }

    const wishTotalsToggleEl = document.getElementById('wishTotalsToggle');
    if (wishTotalsToggleEl) {
        const wishTotalsToggleLabel = wishTotalsToggleEl.firstChild;
        wishTotalsToggleEl.addEventListener('click', () => {
            wishTotalsExpanded = !wishTotalsExpanded;
            wishTotalsToggleEl.classList.toggle('expanded', wishTotalsExpanded);
            wishTotalsToggleLabel.textContent = wishTotalsExpanded ? 'Hide breakdown ' : 'Show breakdown ';
            document.getElementById('wishTotalsBody').classList.toggle('hidden', !wishTotalsExpanded);
        });
    }

    function calculateForecast() {
        renderWishTotals();
        const baseWishes = (parseInt(currentWishesEl.value) || 0) + Math.floor((parseInt(currentStarglitterEl.value) || 0) / 5);
        const sgRate = (parseInt(starglitterEl.value) || 8) / 100;
        const outputSpace = document.getElementById('outputLogSpace');
        if (priorityPipeline.length === 0 || priorityPipeline.every(x => x.enabled === false)) {
            outputSpace.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 20px 0;">Add targets to see scenarios.</div>';
            return;
        }

        outputSpace.innerHTML = '';
        const scenarios = [
            { key: 'best', title: '🟢 BEST — everything wins' },
            { key: 'ok', title: '🟡 OK — mixed luck, no disasters' },
            { key: 'worst', title: '🔴 WORST — but Hard Locks always safe' }
        ];

        function getIncomeCeiling(item) {
            let income = baseWishes;
            for (let i = 0; i < item.targetPatch; i++) { income += getPatchIncome(i); }
            const patchIncome = getPatchIncome(item.targetPatch);
            income += item.bannerHalf === 'first' ? Math.floor(patchIncome * 0.65) : patchIncome;
            return income;
        }

        function effectiveCost(rawCost) {
            const refund = Math.floor(rawCost * sgRate);
            return rawCost - refund;
        }

        function getRawCost(item, loses, isFirstChar, isFirstWep) {
            const copies = item.copies !== undefined ? item.copies : 1;
            if (copies <= 0) return 0;
            const charWin = parseInt(charSoftPityEl.value) || 76;
            const wepWin = parseInt(wepSoftPityEl.value) || 65;
            if (item.type === 'character') {
                const pitySaved = isFirstChar ? Math.min(parseInt(charPityEl.value) || 0, charWin - 1) : 0;
                if (item.strategy === 'One Shot') return Math.max(1, charWin - pitySaved);

                const loseCount = Math.min(loses, 1);
                const firstCopyCost = (item.guaranteed === 'yes') ? charWin : charWin * (loseCount + 1);
                const firstCopy = firstCopyCost - pitySaved;
                const restCopyCost = loseCount > 0 ? charWin * 2 : charWin;
                return firstCopy + (copies - 1) * restCopyCost;
            } else {
                const pitySaved = isFirstWep ? Math.min(parseInt(wepPityEl.value) || 0, wepWin - 1) : 0;
                if (item.strategy === 'One Shot') return Math.max(1, wepWin - pitySaved);

                const loseCount = Math.min(loses, 1);
                const firstCopyCost = (item.guaranteed === 'yes') ? wepWin : wepWin * (loseCount + 1);
                const firstCopy = firstCopyCost - pitySaved;
                const restCopyCost = loseCount > 0 ? wepWin * (loseCount + 1) : wepWin;
                return firstCopy + (copies - 1) * restCopyCost;
            }
        }

        function getOutcome(item, loses) {
            const label = item.type === 'character' ? item.constellation : 'R' + (item.refinement || 1);
            if (item.strategy === 'One Shot') return loses > 0 ? 'lose (stop)' : `win ${label}`;
            return loses > 0 ? `lose→win ${label}` : `win ${label}`;
        }

        function runScenario(losePattern) {
            let totalSpent = 0;
            let rows = [];
            let skipRemaining = false;
            let failed = false;
            let isFirstChar = true;
            let isFirstWep = true;
            const enabledItems = priorityPipeline.filter(x => x.enabled !== false);

            enabledItems.forEach((item, idx) => {
                const incomeCeiling = getIncomeCeiling(item);
                const currentPool = incomeCeiling - totalSpent;
                const loses = losePattern[idx] || 0;
                const label = item.type === 'character' ? item.constellation : 'R' + (item.refinement || 1);
                const patchLabel = item.targetPatch === 0 ? 'This Patch' : item.targetPatch === 1 ? 'Next Patch' : `+${item.targetPatch} Patches`;
                const halfLabel = item.bannerHalf === 'first' ? '1st Half' : '2nd Half';
                const timing = `${patchLabel} · ${halfLabel}`;

                if (skipRemaining) {
                    rows.push({ type: 'skip', itemType: item.type, name: item.name, icon: item.icon, element: item.element, label, timing, strategy: item.strategy, reason: 'One Shot stopped here' });
                    return;
                }

                const rawCost = getRawCost(item, loses, isFirstChar, isFirstWep);
                if (item.type === 'character') isFirstChar = false;
                else isFirstWep = false;
                const cost = effectiveCost(rawCost);
                const sgRefund = rawCost - cost;

                if (currentPool >= cost) {
                    totalSpent += cost;
                    const remaining = currentPool - cost;
                    rows.push({ type: loses > 0 ? 'lose-win' : 'win', itemType: item.type, name: item.name, icon: item.icon, element: item.element, label, timing, strategy: item.strategy, loses, rawCost, cost, sgRefund, remaining });
                } else {
                    if (item.strategy === 'Hard Lock') {
                        totalSpent += cost;
                        failed = true;
                        const deficit = incomeCeiling - totalSpent;
                        rows.push({ type: 'deficit', itemType: item.type, name: item.name, icon: item.icon, element: item.element, label, timing, strategy: item.strategy, loses, rawCost, cost, sgRefund, deficit });
                    } else if (item.strategy === 'One Shot') {
                        rows.push({ type: 'skip', itemType: item.type, name: item.name, icon: item.icon, element: item.element, label, timing, strategy: item.strategy, reason: 'Not enough wishes — One Shot skipped', remaining: Math.max(0, currentPool) });
                        skipRemaining = true;
                    } else {
                        rows.push({ type: 'skip', itemType: item.type, name: item.name, icon: item.icon, element: item.element, label, timing, strategy: item.strategy, reason: 'Not enough wishes — skipped', remaining: Math.max(0, currentPool) });
                    }
                }
            });

            return { rows, failed };
        }

        function renderRow(row) {
            const rowIcon = avatarBadgeHtml(row.icon, elementIconPath(row.element), 44, 17);
            if (row.type === 'skip') {
                return `<div class="log-row row-skip">
                    ${rowIcon}
                    <div>
                        <div class="log-name">${row.name} <span style="color:var(--text-muted);font-weight:400;font-size:0.85rem;">${row.label}</span></div>
                        <div class="log-name-sub">${row.timing} · ${row.reason}</div>
                    </div>
                    <div class="log-outcome oc-skip">SKIPPED</div>
                    <div class="log-right">
                        ${row.remaining != null ? `<div class="log-remaining rem-ok">${row.remaining} left</div>` : ''}
                    </div>
                </div>`;
            }
            if (row.type === 'deficit') {
                const sgHtml = (row.sgRefund > 0) ? `<div class="log-sg">~${row.sgRefund} wishes back via Starglitter</div>` : '';
                return `<div class="log-row row-deficit">
                    ${rowIcon}
                    <div>
                        <div class="log-name">${row.name} <span style="color:var(--text-muted);font-weight:400;font-size:0.85rem;">${row.label}</span></div>
                        <div class="log-name-sub">${row.timing} · ${row.loses > 0 ? (row.itemType === 'weapon' ? 'Lost 75/25' : 'Lost 55/45') : (row.itemType === 'weapon' ? 'Won 75/25' : 'Won 55/45')} · ${row.strategy}</div>
                    </div>
                    <div class="log-outcome oc-deficit">DEFICIT</div>
                    <div class="log-right">
                        <div class="log-pulls">${row.rawCost} pulls${row.cost < row.rawCost ? ` · ${row.cost} net` : ''}</div>
                        ${sgHtml}
                        <div class="log-remaining rem-deficit">${row.deficit} wishes short</div>
                    </div>
                </div>`;
            }

            const rowClass = row.type === 'lose-win' ? 'row-lose-win' : 'row-win';
            const ocClass = row.type === 'lose-win' ? 'oc-lose' : 'oc-win';
            const isWep = row.itemType === 'weapon';
            const ocLabel = row.loses === 1
                ? (isWep ? 'Lost 75/25' : 'Lost 55/45')
                : (isWep ? 'Won 75/25' : 'Won 55/45');
            const sgHtml = (row.sgRefund > 0) ? `<div class="log-sg">~${row.sgRefund} wishes back via Starglitter</div>` : '';
            const remClass = row.remaining > 50 ? 'rem-ok' : row.remaining > 0 ? 'rem-low' : 'rem-deficit';
            return `<div class="log-row ${rowClass}">
                ${rowIcon}
                <div>
                    <div class="log-name">${row.name} <span style="color:var(--text-muted);font-weight:400;font-size:0.85rem;">${row.label}</span></div>
                    <div class="log-name-sub">${row.timing} · ${row.strategy}</div>
                </div>
                <div class="log-outcome ${ocClass}">${ocLabel}</div>
                <div class="log-right">
                    <div class="log-pulls">${row.rawCost} pulls${row.cost < row.rawCost ? ` · ${row.cost} net` : ''}</div>
                    ${sgHtml}
                    <div class="log-remaining ${remClass}">${row.remaining} left</div>
                </div>
            </div>`;
        }

        const n = priorityPipeline.length;
        const enabledPipeline = priorityPipeline.filter(x => x.enabled !== false);
        const ne = enabledPipeline.length;

        const bestPattern = new Array(ne).fill(0);

        const worstPattern = enabledPipeline.map(item => item.type === 'weapon' ? 1 : 1);

        const okScenarios = [];

        if (ne >= 2) {
            const p = new Array(ne).fill(0);
            p[0] = enabledPipeline[0].type === 'weapon' ? 1 : 1;
            okScenarios.push({ title: '🟡 OK-A — first target loses once, rest win', pattern: p });
        }

        if (ne >= 2) {
            const p = new Array(ne).fill(0);
            p[ne - 1] = 1;
            okScenarios.push({ title: '🟡 OK-B — last target loses once, rest win', pattern: p });
        }

        if (ne >= 3) {
            const p = enabledPipeline.map((_, i) => i % 2 === 1 ? 1 : 0);
            okScenarios.push({ title: '🟡 OK-C — alternating (every other loses once)', pattern: p });
        }

        const hasWeapon = enabledPipeline.some(item => item.type === 'weapon');
        if (hasWeapon && ne >= 2) {
            const p = enabledPipeline.map(item => item.type === 'weapon' ? 1 : 0);
            okScenarios.push({ title: '🟠 OK-D — weapon(s) hit fate point (lose→guaranteed), chars win', pattern: p });
        }

        const allScenarios = [
            { title: '🟢 BEST — everyone wins (55/45 chars, 75/25 weapons)', pattern: bestPattern },
            ...okScenarios,
            { title: '🔴 WORST — everyone loses (55/45 chars, 75/25 weapons)', pattern: worstPattern },
        ];

        allScenarios.forEach(scen => {
            const { rows, failed } = runScenario(scen.pattern);
            const rowsHtml = rows.map(renderRow).join('');
            const summaryClass = failed ? 'sum-fail' : 'sum-ok';
            const summaryText = failed ? '❌ Requires more wishes' : '✅ Plan is viable';
            outputSpace.innerHTML += `
                <div class="scenario-block">
                    <h4 class="scenario-title">${scen.title}</h4>
                    <div class="scenario-log">
                        ${rowsHtml}
                        <div class="log-summary ${summaryClass}">${summaryText}</div>
                    </div>
                </div>
            `;
        });
    }

    const SAVE_KEY = 'genshin_planner_v1';
    const banner = document.getElementById('failsafeBanner');

    function showBanner(html) {
        banner.innerHTML = html;
        banner.classList.remove('hidden');
    }
    function hideBanner() {
        banner.classList.add('hidden');
    }

    function storageIsWorking() {
        try {
            const probe = '__planner_probe__';
            localStorage.setItem(probe, '1');
            const ok = localStorage.getItem(probe) === '1';
            localStorage.removeItem(probe);
            return ok;
        } catch (e) {
            return false;
        }
    }

    function buildState() {
        return {
            pipeline: priorityPipeline,
            wishes: currentWishesEl.value,
            starglitter: currentStarglitterEl.value,
            wishesPerPatch: wishesPerPatchEl.value,
            totalPatches: totalPatchesEl.value,
            sgRate: starglitterEl.value,
            charSoftPity: charSoftPityEl.value,
            wepSoftPity: wepSoftPityEl.value,
            charPity: charPityEl.value,
            wepPity: wepPityEl.value,
            welkin: hasWelkinEl.checked,
            bp: hasBPEl.checked,
            incomeMode: document.querySelector('input[name="incomeMode"]:checked')?.value || 'average',

            customPatches: Array.from(document.querySelectorAll('.custom-val-input')).map(inp => inp.value),
        };
    }

    function saveState() {
        const state = buildState();
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(state));
            if (!banner.dataset.userDismissed) hideBanner();
        } catch (e) {
            showBanner(
                '⚠️ Your browser is blocking saved data for this page, so your inputs will reset on reload. ' +
                'This usually means cookies/site data are blocked (check Brave Shields → this site → Cookies), ' +
                'or "Clear cookies and site data on exit" is enabled. ' +
                'Use <b>Export</b> below to save your plan to a file as a workaround.'
            );
        }
    }

    function applyState(s) {
        priorityPipeline = s.pipeline || [];
        currentWishesEl.value = s.wishes ?? '';
        currentStarglitterEl.value = s.starglitter ?? '';
        wishesPerPatchEl.value = s.wishesPerPatch ?? '80';
        totalPatchesEl.value = s.totalPatches ?? '0';
        starglitterEl.value = s.sgRate ?? '8';
        charSoftPityEl.value = s.charSoftPity ?? '76';
        wepSoftPityEl.value = s.wepSoftPity ?? '65';
        charPityEl.value = s.charPity ?? '0';
        wepPityEl.value = s.wepPity ?? '0';
        hasWelkinEl.checked = s.welkin || false;
        hasBPEl.checked = s.bp || false;
        const modeEl = document.querySelector(`input[name="incomeMode"][value="${s.incomeMode || 'average'}"]`);
        if (modeEl) { modeEl.checked = true; modeEl.dispatchEvent(new Event('change')); }
        updateStarglitterHint();
        renderCustomIncomeRows();
        updateTargetPatchOptions();
        if (s.customPatches) {
            document.querySelectorAll('.custom-val-input').forEach((inp, idx) => {
                if (s.customPatches[idx] !== undefined) inp.value = s.customPatches[idx];
            });
        }
    }

    function loadState() {
        if (!storageIsWorking()) {
            showBanner(
                '⚠️ This browser/tab is blocking saved data, so nothing will persist between visits. ' +
                'Check Brave Shields (cookie/site-data blocking) or "Clear on exit" settings for this site. ' +
                'You can still use <b>Export</b>/<b>Import</b> below to save and reload your plan manually.'
            );
            return false;
        }
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            applyState(JSON.parse(raw));
            return true;
        } catch (e) { return false; }
    }

    function exportState() {
        const blob = new Blob([JSON.stringify(buildState(), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'genshin-wish-plan.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importStateFromFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                applyState(JSON.parse(e.target.result));
                saveState();
                pipelineUpdated();
            } catch (err) {
                showBanner('⚠️ That file could not be read as a valid plan export.');
            }
        };
        reader.readAsText(file);
    }

    function pipelineUpdated() { renderPipeline(); calculateForecast(); saveState(); }

    [currentWishesEl, wishesPerPatchEl, starglitterEl, charSoftPityEl, wepSoftPityEl, charPityEl, wepPityEl, totalPatchesEl].forEach(el =>
        el.addEventListener('input', saveState)
    );
    currentStarglitterEl.addEventListener('input', saveState);
    [hasWelkinEl, hasBPEl].forEach(el => el.addEventListener('change', saveState));
    document.querySelectorAll('input[name="incomeMode"]').forEach(r => r.addEventListener('change', saveState));

    document.getElementById('exportBtn').addEventListener('click', exportState);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', (e) => {
        if (e.target.files[0]) importStateFromFile(e.target.files[0]);
        e.target.value = '';
    });

    document.getElementById('resetBtn').addEventListener('click', () => {

        try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
        priorityPipeline = [];
        currentWishesEl.value = '';
        currentStarglitterEl.value = '';
        wishesPerPatchEl.value = '80';
        totalPatchesEl.value = '0';
        starglitterEl.value = '8';
        charSoftPityEl.value = '76';
        wepSoftPityEl.value = '65';
        charPityEl.value = '0';
        wepPityEl.value = '0';
        hasWelkinEl.checked = false;
        hasBPEl.checked = false;
        const avgMode = document.querySelector('input[name="incomeMode"][value="average"]');
        avgMode.checked = true;
        avgMode.dispatchEvent(new Event('change'));
        updateStarglitterHint();
        renderCustomIncomeRows();
        updateTargetPatchOptions();
        pipelineUpdated();
    });

    loadState();
    pipelineUpdated();

