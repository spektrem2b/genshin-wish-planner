const CODES_API_URL = 'https://db.hashblen.com/codes';
const CODES_REDEEM_BASE = 'https://genshin.hoyoverse.com/en/gift?code=';

let codesInitialized = false;
let codesCache = null;

function activateOtherTab() {
    const panel = document.getElementById('codesPanel');
    if (!panel) return;

    if (codesCache) {
        renderCodes(codesCache);
        return;
    }
    if (codesInitialized) return;
    codesInitialized = true;

    panel.innerHTML = `<div class="explanation">Loading current codes…</div>`;

    fetch(CODES_API_URL)
        .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(data => {
            const codes = Array.isArray(data.genshin) ? data.genshin : [];
            codesCache = codes;
            renderCodes(codes);
        })
        .catch(() => {
            codesInitialized = false;
            panel.innerHTML = `<div class="explanation">Couldn't load codes right now — the tracker might be down. Try again in a bit, or check <a href="https://genshin.hoyoverse.com/en/gift" target="_blank" rel="noopener">the official redeem page</a> directly.</div>`;
        });
}

function renderCodes(codes) {
    const panel = document.getElementById('codesPanel');
    if (!panel) return;

    if (!codes.length) {
        panel.innerHTML = `<div class="explanation">No active codes right now — check back later.</div>`;
        return;
    }

    const sorted = codes.slice().sort((a, b) => (b.added_at || 0) - (a.added_at || 0));

    const esc = (s) => String(s || '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

    panel.innerHTML = sorted.map((c, i) => `
        <div class="codes-row">
            <div>
                <span class="codes-code">${esc(c.code)}</span>
                ${c.description ? `<div class="explanation" style="margin-top:6px;">${esc(c.description)}</div>` : ''}
            </div>
            <div class="codes-actions">
                <a class="codes-claim-link" href="${CODES_REDEEM_BASE}${encodeURIComponent(c.code)}" target="_blank" rel="noopener">Claim</a>
                <button type="button" class="codes-copy-btn" data-code="${esc(c.code)}" data-idx="${i}">Copy</button>
            </div>
        </div>
    `).join('');

    panel.querySelectorAll('.codes-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.dataset.code;
            navigator.clipboard.writeText(code).then(() => {
                const original = btn.textContent;
                btn.textContent = 'Copied!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = original;
                    btn.classList.remove('copied');
                }, 1500);
            });
        });
    });
}
