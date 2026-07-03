
function setActiveRarityTab(tab) {
    const is5 = tab === '5star';
    const is4 = tab === '4star';
    const isOdds = tab === 'odds';
    const isOther = tab === 'other';

    document.getElementById('tab5starContent').classList.toggle('hidden', !is5);
    document.getElementById('tab4starContent').classList.toggle('hidden', !is4);
    document.getElementById('tabOddsContent').classList.toggle('hidden', !isOdds);
    document.getElementById('tabOtherContent').classList.toggle('hidden', !isOther);

    const btn5 = document.getElementById('tab5starBtn');
    const btn4 = document.getElementById('tab4starBtn');
    const btnOdds = document.getElementById('tabOddsBtn');
    const btnOther = document.getElementById('tabOtherBtn');
    [[btn5, is5], [btn4, is4], [btnOdds, isOdds], [btnOther, isOther]].forEach(([btn, active]) => {
        btn.style.background = active ? 'linear-gradient(135deg, var(--accent-purple), var(--accent-purple-dark))' : 'transparent';
        btn.style.color = active ? 'white' : 'var(--text-muted)';
    });

    if (isOdds && typeof activateOddsTab === 'function') activateOddsTab();
    if (isOther && typeof activateOtherTab === 'function') activateOtherTab();
}

document.getElementById('tab5starBtn').addEventListener('click', () => setActiveRarityTab('5star'));
document.getElementById('tab4starBtn').addEventListener('click', () => setActiveRarityTab('4star'));
document.getElementById('tabOddsBtn').addEventListener('click', () => setActiveRarityTab('odds'));
document.getElementById('tabOtherBtn').addEventListener('click', () => setActiveRarityTab('other'));

