document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const repoInput = $('repoInput');
  const searchForm = $('searchForm');
  const resultsSection = $('resultsSection');
  const welcomeState = $('welcomeState');
  const loadingState = $('loadingState');
  const errorState = $('errorState');
  const errorMessage = $('errorMessage');
  const errorTitle = $('errorTitle');
  const historyList = $('historyList');
  const favoritesList = $('favoritesList');
  const toast = $('toast');
  const releaseFilter = $('releaseFilter');
  let currentRepo = null;
  let currentReleases = [];
  let deferredInstallPrompt = null;

  const storage = {
    get(key, fallback = []) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } },
    set(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  };

  const formatNumber = (value) => Number(value || 0).toLocaleString('en-US');
  const formatDate = (value) => value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : 'Unknown date';
  const normalizeRepo = (value) => value.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/^github\.com\//i, '').replace(/\/$/, '').split('?')[0];
  const validRepo = (value) => /^[^/\s]+\/[^/\s]+$/.test(value);

  function showToast(message) {
    toast.textContent = message; toast.classList.add('show');
    clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  function setView(view) {
    welcomeState.classList.toggle('hidden', view !== 'welcome');
    resultsSection.classList.toggle('hidden', view !== 'results');
    loadingState.classList.toggle('hidden', view !== 'loading');
    errorState.classList.toggle('hidden', view !== 'error');
  }

  function renderHistory() {
    const history = storage.get('pulse-history');
    historyList.innerHTML = history.length ? history.map(item => `<button class="history-item" data-repo="${escapeHtml(item.repo)}"><i class="history-dot"></i><strong>${escapeHtml(item.repo)}</strong><small>${escapeHtml(item.time)}</small></button>`).join('') : '<div class="empty-side">Your recent searches<br>will appear here.</div>';
    historyList.querySelectorAll('[data-repo]').forEach(button => button.addEventListener('click', () => { repoInput.value = button.dataset.repo; fetchRepository(button.dataset.repo); }));
  }

  function renderFavorites() {
    const favorites = storage.get('pulse-favorites');
    $('favoriteCount').textContent = favorites.length;
    favoritesList.innerHTML = favorites.length ? favorites.map(item => `<button class="history-item" data-repo="${escapeHtml(item)}"><i class="history-dot"></i><strong>${escapeHtml(item)}</strong><small>★</small></button>`).join('') : '<div class="empty-side">Save a repository to keep<br>it close at hand.</div>';
    favoritesList.querySelectorAll('[data-repo]').forEach(button => button.addEventListener('click', () => { repoInput.value = button.dataset.repo; fetchRepository(button.dataset.repo); }));
  }

  function addHistory(repo) {
    let history = storage.get('pulse-history').filter(item => item.repo !== repo);
    history.unshift({ repo, time: 'now' });
    storage.set('pulse-history', history.slice(0, 7)); renderHistory();
  }

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[char])); }

  async function fetchRepository(rawValue = repoInput.value) {
    const repo = normalizeRepo(rawValue);
    repoInput.value = repo;
    if (!validRepo(repo)) { showError('Use the format owner/repository, for example vercel/next.js.'); return; }
    setView('loading');
    try {
      const [repoResponse, releasesResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${encodeURIComponent(repo).replace('%2F','/')}`),
        fetch(`https://api.github.com/repos/${encodeURIComponent(repo).replace('%2F','/')}/releases?per_page=30`)
      ]);
      if (repoResponse.status === 404 || releasesResponse.status === 404) throw new Error('Repository not found or access is restricted.');
      if (!repoResponse.ok || !releasesResponse.ok) throw new Error(`GitHub API returned status ${repoResponse.status || releasesResponse.status}.`);
      const repository = await repoResponse.json();
      const releases = await releasesResponse.json();
      currentRepo = repository; currentReleases = releases;
      addHistory(repo); renderDashboard(repository, releases); setView('results');
    } catch (error) { showError(error.message || 'Something went wrong while reading GitHub.'); }
  }

  function renderDashboard(repository, releases) {
    const totalDownloads = releases.reduce((sum, release) => sum + (release.assets || []).reduce((assetSum, asset) => assetSum + (asset.download_count || 0), 0), 0);
    $('repoPath').textContent = repository.full_name;
    $('repoName').textContent = repository.name;
    $('repoDescription').textContent = repository.description || 'No description provided.';
    $('repoAvatar').textContent = (repository.owner?.login || repository.name).slice(0, 2).toUpperCase();
    $('githubLink').href = repository.html_url;
    $('totalDownloads').textContent = formatNumber(totalDownloads);
    $('totalReleases').textContent = formatNumber(releases.length);
    $('latestVersion').textContent = releases[0]?.tag_name || '—';
    $('latestDate').textContent = releases[0] ? `Published ${formatDate(releases[0].published_at || releases[0].created_at)}` : 'No published releases';
    $('repoStars').textContent = formatNumber(repository.stargazers_count);
    $('repoForks').textContent = `${formatNumber(repository.forks_count)} forks`;
    $('releaseCaption').textContent = releases.length === 30 ? 'Latest 30 releases' : 'In the visible release history';
    $('downloadCaption').textContent = totalDownloads ? 'Across published release assets' : 'No downloadable assets yet';
    $('lastUpdated').textContent = `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    updateFavoriteButton(); renderReleases(releases);
  }

  function renderReleases(releases) {
    let visible = [...releases];
    if (releaseFilter.value === 'top') visible.sort((a,b) => releaseDownloads(b) - releaseDownloads(a));
    if (releaseFilter.value === 'recent') visible = visible.slice(0, 8);
    const maxDownloads = Math.max(1, ...visible.map(releaseDownloads));
    $('releasesList').innerHTML = visible.length ? visible.map((release, index) => {
      const downloads = releaseDownloads(release); const assets = release.assets || [];
      const assetMarkup = assets.length ? `<div class="asset-list">${assets.slice(0, 4).map(asset => `<div class="asset-line"><span>▧ ${escapeHtml(asset.name)}</span><span>${formatNumber(asset.download_count)}</span></div>`).join('')}</div>` : '';
      return `<article class="release-item"><div class="release-main"><div class="release-title"><span>${escapeHtml(release.name || release.tag_name || 'Untitled release')}</span>${index === 0 && releaseFilter.value === 'all' ? '<i>latest</i>' : ''}</div><div class="release-date">${escapeHtml(formatDate(release.published_at || release.created_at))} · ${assets.length} asset${assets.length === 1 ? '' : 's'}</div><div class="asset-bar"><span style="width:${Math.max(3, Math.round(downloads / maxDownloads * 100))}%"></span></div>${assetMarkup}</div><div class="release-total">${formatNumber(downloads)}<small>downloads</small></div></article>`;
    }).join('') : '<div class="empty-side">No published releases found for this repository.</div>';
  }

  function releaseDownloads(release) { return (release.assets || []).reduce((sum, asset) => sum + (asset.download_count || 0), 0); }

  function updateFavoriteButton() {
    if (!currentRepo) return; const favorites = storage.get('pulse-favorites'); const saved = favorites.includes(currentRepo.full_name);
    $('favoriteBtn').classList.toggle('is-saved', saved); $('favoriteBtn').innerHTML = `<span>${saved ? '★' : '☆'}</span> ${saved ? 'Saved' : 'Save'}`;
  }

  function toggleFavorite() {
    if (!currentRepo) return; let favorites = storage.get('pulse-favorites'); const name = currentRepo.full_name;
    if (favorites.includes(name)) { favorites = favorites.filter(item => item !== name); showToast('Removed from favorites.'); } else { favorites.unshift(name); showToast('Saved to your favorites.'); }
    storage.set('pulse-favorites', favorites.slice(0, 10)); renderFavorites(); updateFavoriteButton();
  }

  function showError(message) { setView('error'); errorTitle.textContent = 'We could not load that repository.'; errorMessage.textContent = message; }

  searchForm.addEventListener('submit', event => { event.preventDefault(); fetchRepository(); });
  $('retryBtn').addEventListener('click', () => fetchRepository());
  $('favoriteBtn').addEventListener('click', toggleFavorite);
  releaseFilter.addEventListener('change', () => renderReleases(currentReleases));
  $('clearHistory').addEventListener('click', () => { storage.set('pulse-history', []); renderHistory(); showToast('Search history cleared.'); });
  document.querySelectorAll('.example-link').forEach(button => button.addEventListener('click', () => { repoInput.value = button.dataset.example; fetchRepository(button.dataset.example); }));
  $('themeBtn').addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = next; localStorage.setItem('pulse-theme', next); showToast(`${next === 'light' ? 'Light' : 'Dark'} theme enabled.`); });
  $('widgetBtn').addEventListener('click', async () => { if (deferredInstallPrompt) { deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt = null; $('installBtn').hidden = true; } else if (navigator.share) { navigator.share({ title: 'Pulse — GitHub release analytics', text: 'Track release downloads with Pulse.', url: location.href }).catch(() => {}); } else { showToast('Use your browser menu to add Pulse to your home screen.'); } });
  $('installBtn').addEventListener('click', () => $('widgetBtn').click());
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; $('installBtn').hidden = false; });
  window.addEventListener('appinstalled', () => showToast('Pulse was added to your home screen.'));

  document.documentElement.dataset.theme = localStorage.getItem('pulse-theme') || 'dark';
  renderHistory(); renderFavorites();
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
});
