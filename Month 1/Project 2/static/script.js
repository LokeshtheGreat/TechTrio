document.addEventListener('DOMContentLoaded', () => {
    checkStatusAndLoad();

    const scrapeBtn = document.getElementById('run-scraper-btn');
    scrapeBtn.addEventListener('click', () => {
        startScraper();
    });

    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('movie-modal').style.display = 'none';
            document.body.classList.remove('modal-open');
    });
    
    document.getElementById('movie-modal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('movie-modal')) {
            document.getElementById('movie-modal').style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('movie-modal').style.display === 'flex') {
            document.getElementById('movie-modal').style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    });

    document.getElementById('search-input').addEventListener('input', applyFiltersAndRender);
    document.getElementById('sort-select').addEventListener('change', applyFiltersAndRender);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFiltersAndRender();
        });
    });
});

let currentEventSource = null;
let allMovies = []; 
let allChanges = null;
const detailsCache = {}; 

const posterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const card = entry.target;
            const imdbId = card.getAttribute('data-imdb-id');
            if (imdbId) {
                loadMoviePoster(imdbId, card);
                observer.unobserve(card);
            }
        }
    });
}, { rootMargin: '100px 0px' });

async function checkStatusAndLoad() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.scrape_required) {
            startScraper();
        } else {
            fetchMovies();
        }
    } catch (error) {
        console.error('Error checking status:', error);
    }
}

async function startScraper() {
    const scrapeBtn = document.getElementById('run-scraper-btn');
    
    if (scrapeBtn.disabled) return;
    
    try {
        const response = await fetch('/api/scrape', { method: 'POST' });
        const data = await response.json();
        
        if (data.started || data.status === 'running') {
            showConsole();
            connectSSE();
            scrapeBtn.disabled = true;
            scrapeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scraping...';
        }
    } catch (error) {
        console.error('Error starting scraper:', error);
    }
}

function showConsole() {
    document.getElementById('live-console-section').style.display = 'flex';
    document.getElementById('movies-container').style.display = 'none';
    const output = document.getElementById('console-output');
    output.innerHTML = '';
    updateProgress(0);
}

function updateProgress(count) {
    const total = 250;
    document.getElementById('console-progress-text').textContent = `${count} / ${total}`;
    const percent = Math.min((count / total) * 100, 100);
    document.getElementById('console-progress-fill').style.width = `${percent}%`;
}

function connectSSE() {
    if (currentEventSource) {
        currentEventSource.close();
    }
    
    currentEventSource = new EventSource('/api/logs');
    const output = document.getElementById('console-output');
    
    currentEventSource.onmessage = function(event) {
        const msg = event.data;
        const line = document.createElement('div');
        line.textContent = msg;
        
        const match = msg.match(/\[(\d+)\/250\]/);
        if (match) {
            line.className = 'log-highlight';
            updateProgress(parseInt(match[1], 10));
        }
        
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    };
    
    currentEventSource.addEventListener('complete', function(event) {
        currentEventSource.close();
        currentEventSource = null;
        
        const line = document.createElement('div');
        line.className = 'log-success';
        line.textContent = 'Scraping successfully completed. Loading dashboard...';
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
        
        setTimeout(() => {
            document.getElementById('live-console-section').style.display = 'none';
            document.getElementById('movies-container').style.display = 'grid';
            
            const scrapeBtn = document.getElementById('run-scraper-btn');
            scrapeBtn.disabled = false;
            scrapeBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Fetch Latest Data';
            
            fetchMovies();
        }, 1500);
    });
    
    currentEventSource.addEventListener('error', function(event) {
        currentEventSource.close();
        currentEventSource = null;
        
        let errorMsg = 'Connection lost or an error occurred.';
        try {
            const data = JSON.parse(event.data);
            if (data.message) errorMsg = data.message;
        } catch(e) {}
        
        const line = document.createElement('div');
        line.className = 'log-error';
        line.textContent = `ERROR: ${errorMsg}`;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
        
        const scrapeBtn = document.getElementById('run-scraper-btn');
        scrapeBtn.disabled = false;
        scrapeBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Try Again';
    });
}

async function fetchMovies() {
    try {
        document.getElementById('movies-container').style.display = 'grid';
        
        const ts = new Date().getTime();
        const [moviesResponse, changesResponse] = await Promise.all([
            fetch('/api/movies?t=' + ts),
            fetch('/api/changes?t=' + ts).catch(() => null)
        ]);
        
        if (!moviesResponse.ok) {
            console.error('Movies not available');
            return;
        }
        
        const data = await moviesResponse.json();
        allMovies = data.movies;
        
        if (changesResponse && changesResponse.ok) {
            allChanges = await changesResponse.json();
            data.summary.new_entries = allChanges.summary.new_entries;
            data.summary.ranking_changes = allChanges.summary.ranking_changes;
            renderRecentChanges(allChanges);
        } else {
            allChanges = { new_entries: [], ranking_changes: [], rating_changes: [] };
            renderRecentChanges(allChanges);
        }
        
        updateSummary(data.summary);
        applyFiltersAndRender();
    } catch (error) {
        console.error('Error fetching movies:', error);
    }
}

function updateSummary(summary) {
    document.getElementById('stat-total').textContent = summary.total_movies;
    document.getElementById('stat-avg').textContent = summary.avg_rating;
    document.getElementById('stat-new').textContent = '+' + (summary.new_entries || 0);
    document.getElementById('stat-changes').textContent = summary.ranking_changes || 0;
    document.getElementById('stat-updated').textContent = summary.last_update;
}

function renderRecentChanges(changes) {
    const list = document.querySelector('.notification-list');
    list.innerHTML = '';
    
    let combined = [];
    if (changes.new_entries) changes.new_entries.forEach(c => combined.push({...c, priority: 1}));
    if (changes.ranking_changes) {
        let sortedRank = [...changes.ranking_changes].sort((a,b) => b.change_amount - a.change_amount);
        sortedRank.forEach(c => combined.push({...c, priority: 2}));
    }
    if (changes.rating_changes) {
        let sortedRating = [...changes.rating_changes].sort((a,b) => b.change_amount - a.change_amount);
        sortedRating.forEach(c => combined.push({...c, priority: 3}));
    }
    
    combined = combined.slice(0, 15);
    
    if (combined.length === 0) {
        list.innerHTML = '<div style="padding: 1rem; color: var(--text-muted);">No recent changes found.</div>';
        return;
    }
    
    combined.forEach(change => {
        const item = document.createElement('div');
        
        if (change.change_type === 'new') {
            item.className = 'notification new-entry';
            item.innerHTML = `
                <i class="fas fa-plus-circle"></i>
                <div>
                    <p><strong>${change.title}</strong></p>
                    <span>Entered Top 250 at #${change.current_rank}</span>
                </div>
            `;
        } else if (change.change_type === 'up') {
            item.className = 'notification rank-up';
            item.innerHTML = `
                <i class="fas fa-arrow-up"></i>
                <div>
                    <p><strong>${change.title}</strong></p>
                    <span>Moved from #${change.previous_rank} to #${change.current_rank}</span>
                </div>
            `;
        } else if (change.change_type === 'down') {
            item.className = 'notification rank-down';
            item.innerHTML = `
                <i class="fas fa-arrow-down"></i>
                <div>
                    <p><strong>${change.title}</strong></p>
                    <span>Moved from #${change.previous_rank} to #${change.current_rank}</span>
                </div>
            `;
        } else if (change.change_type === 'rating') {
            item.className = 'notification';
            item.innerHTML = `
                <i class="fas fa-star" style="color: var(--accent);"></i>
                <div>
                    <p><strong>${change.title}</strong></p>
                    <span>Rating changed from ${change.previous_rating} to ${change.current_rating}</span>
                </div>
            `;
        }
        
        list.appendChild(item);
    });
}

function applyFiltersAndRender() {
    let filtered = [...allMovies];
    
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    if (searchTerm) {
        filtered = filtered.filter(m => m.title.toLowerCase().includes(searchTerm));
    }
    
    const activeFilter = document.querySelector('.filter-btn.active').textContent;
    if (activeFilter === 'Top 10') {
        filtered = filtered.filter(m => m.rank <= 10);
    } else if (activeFilter === 'New Entries') {
        if (allChanges && allChanges.new_entries) {
            const newTitles = allChanges.new_entries.map(c => c.title);
            filtered = filtered.filter(m => newTitles.includes(m.title));
        } else {
            filtered = [];
        }
    }
    
    const sortVal = document.getElementById('sort-select').value;
    if (sortVal === 'rank-asc') {
        filtered.sort((a, b) => a.rank - b.rank);
    } else if (sortVal === 'rank-desc') {
        filtered.sort((a, b) => b.rank - a.rank);
    } else if (sortVal === 'rating-desc') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortVal === 'year-desc') {
        filtered.sort((a, b) => (b.year || 0) - (a.year || 0));
    }
    
    renderMovies(filtered);
}

function getImdbId(url) {
    if (!url) return null;
    const parts = url.split('/');
    for (let part of parts) {
        if (part.startsWith('tt')) return part;
    }
    return null;
}

async function loadMoviePoster(imdbId, cardElement) {
    const posterDiv = cardElement.querySelector('.movie-poster');
    if (!posterDiv) return;
    
    try {
        let details = detailsCache[imdbId];
        if (!details) {
            const response = await fetch(`/api/movie/${imdbId}`);
            if (response.ok) {
                details = await response.json();
                detailsCache[imdbId] = details;
            }
        }
        
        if (details && details.poster_url) {
            const img = document.createElement('img');
            img.src = details.poster_url;
            img.className = 'movie-poster';
            img.alt = 'Poster';
            
            img.onerror = () => {
                const fallback = document.createElement('div');
                fallback.className = 'movie-poster';
                fallback.style = "background-color: #1a1a20; color: #f5c518; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; text-align: center;";
                fallback.textContent = 'IMDb';
                if (img.parentNode) {
                    img.parentNode.replaceChild(fallback, img);
                }
            };
            
            img.onload = () => {
                if (posterDiv.parentNode) {
                    posterDiv.parentNode.replaceChild(img, posterDiv);
                }
            };
        }
    } catch (error) {
        console.error('Failed to load poster:', error);
    }
}

function renderMovies(movies, containerId = 'movies-container') {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    if (!movies || movies.length === 0) {
        container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;">No movies found.</div>';
        return;
    }
    
    movies.forEach(movie => {
        const imdbId = getImdbId(movie.url);
        const card = document.createElement('div');
        card.className = 'movie-card';
        if (imdbId) card.setAttribute('data-imdb-id', imdbId);
        
        card.innerHTML = `
            <div class="movie-rank">${movie.rank}</div>
            <div class="movie-poster" style="background-color: #1a1a20; color: #f5c518; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; text-align: center;">IMDb</div>
            <div class="movie-info">
                <div class="movie-title">${movie.title}</div>
                <div class="movie-meta">
                    <span>${movie.year}</span>
                    <span class="movie-rating"><i class="fas fa-star"></i> ${movie.rating || 'N/A'}</span>
                </div>
            </div>
        `;
        
        card.addEventListener('click', () => showMovieDetails(movie, imdbId));
        container.appendChild(card);
        
        if (imdbId) posterObserver.observe(card);
    });
}

async function showMovieDetails(movie, imdbId) {
    const modal = document.getElementById('movie-modal');
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; width: 100%; min-height: 300px; color: var(--text-muted);">
            <i class="fas fa-spinner fa-spin fa-3x" style="margin-bottom: 1rem; color: var(--accent);"></i>
            <p>Loading details...</p>
        </div>
    `;
    modal.style.display = 'flex';
    document.body.classList.add('modal-open');
    
    let details = null;
    let failed = false;
    
    if (imdbId) {
        if (detailsCache[imdbId]) {
            details = detailsCache[imdbId];
        } else {
            try {
                const response = await fetch(`/api/movie/${imdbId}`);
                if (response.ok) {
                    details = await response.json();
                    detailsCache[imdbId] = details;
                } else {
                    failed = true;
                }
            } catch (error) {
                console.error("Failed to fetch movie details:", error);
                failed = true;
            }
        }
    } else {
        failed = true;
    }
    
    const posterHtml = details && details.poster_url 
        ? `<img src="${details.poster_url}" style="width: 250px; border-radius: 8px; box-shadow: 0 10px 20px rgba(0,0,0,0.5);" alt="Poster" onerror="this.style.display='none'">` 
        : `<div style="width: 250px; height: 375px; background-color: #1a1a20; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #4a4d55;"><i class="fas fa-film fa-4x"></i></div>`;
        
    let plotHtml = '<em>Details unavailable.</em>';
    let genreHtml = '';
    let directorHtml = '';
    let castHtml = '';
    let runtimeHtml = '';
    
    if (!failed) {
        plotHtml = details && details.plot ? details.plot : '<em>Not available.</em>';
        genreHtml = `<div style="margin-bottom: 0.5rem;"><strong style="color: var(--accent);">Genre:</strong> ${details && details.genre ? details.genre : 'Not available'}</div>`;
        directorHtml = details && details.director ? `<div style="margin-bottom: 0.5rem;"><strong style="color: var(--accent);">Director:</strong> ${details.director}</div>` : '';
        
        if (details && Array.isArray(details.cast)) {
            let castCards = details.cast.map(actor => {
                const imgUrl = actor.image_url 
                    ? `<img src="${actor.image_url}" alt="${actor.name}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;" onerror="this.outerHTML='<div style=\'width: 50px; height: 50px; border-radius: 50%; background-color: #1a1a20; color: #f5c518; display: flex; align-items: center; justify-content: center; font-size: 1rem;\'><i class=\'fas fa-user\'></i></div>'">` 
                    : `<div style="width: 50px; height: 50px; border-radius: 50%; background-color: #1a1a20; color: #f5c518; display: flex; align-items: center; justify-content: center; font-size: 1rem;"><i class="fas fa-user"></i></div>`;
                
                const roleText = actor.role ? `<div style="font-size: 0.8rem; color: var(--text-muted);">${actor.role}</div>` : '';
                
                return `
                    <div style="display: flex; align-items: center; gap: 1rem; background-color: var(--bg-card); padding: 0.8rem; border-radius: 8px;">
                        ${imgUrl}
                        <div>
                            <div style="font-weight: 600;">${actor.name}</div>
                            ${roleText}
                        </div>
                    </div>
                `;
            }).join('');
            
            castHtml = `
                <div style="margin-bottom: 1.5rem; width: 100%;">
                    <strong style="color: var(--accent); display: block; margin-bottom: 1rem; font-size: 1.2rem;">Cast</strong>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem;">
                        ${castCards}
                    </div>
                </div>
            `;
        } else {
            castHtml = details && details.cast ? `<div style="margin-bottom: 1.5rem;"><strong style="color: var(--accent);">Cast:</strong> ${details.cast}</div>` : '';
        }

        runtimeHtml = details && details.runtime ? `<div style="margin-bottom: 1.5rem;"><strong style="color: var(--accent);">Runtime:</strong> ${details.runtime}</div>` : '';
    }
    
    modalBody.innerHTML = `
        <div style="display: flex; gap: 2rem; width: 100%; flex-wrap: wrap;">
            <div style="flex-shrink: 0;">
                ${posterHtml}
            </div>
            <div style="display: flex; flex-direction: column; justify-content: flex-start; flex-grow: 1; min-width: 300px;">
                <h2 style="font-size: 2.5rem; margin-bottom: 0.5rem;">${movie.title} <span style="color: var(--text-muted); font-weight: 300; font-size: 1.5rem;">(${movie.year})</span></h2>
                
                <div style="display: flex; gap: 2rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                    <div style="font-size: 1.2rem;"><strong style="color: var(--accent);">Rank:</strong> #${movie.rank}</div>
                    <div style="font-size: 1.2rem;"><strong style="color: var(--accent);"><i class="fas fa-star"></i> Rating:</strong> ${movie.rating || 'N/A'}/10</div>
                </div>
                
                ${genreHtml}
                ${directorHtml}
                ${castHtml}
                ${runtimeHtml}
                
                <div style="margin-top: 1rem; margin-bottom: 1.5rem;">
                    <strong style="color: var(--accent); display: block; margin-bottom: 0.5rem; font-size: 1.2rem;">Plot / Description</strong>
                    <p style="color: var(--text-muted); line-height: 1.6; margin: 0;">
                        ${plotHtml}
                    </p>
                </div>
                
                <div style="margin-top: auto;">
                    <a href="${movie.url}" target="_blank" style="background-color: var(--accent); color: #000; text-decoration: none; padding: 0.8rem 1.5rem; border-radius: 8px; font-weight: 600; display: inline-block; transition: background 0.3s;">
                        View on IMDb <i class="fas fa-external-link-alt" style="margin-left: 0.5rem;"></i>
                    </a>
                </div>
            </div>
        </div>
    `;
}



// ==========================================
// SPA NAVIGATION LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('#sidebar-nav .nav-item');
    const spaPages = document.querySelectorAll('.spa-page');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Update active state
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            // Show target page
            const targetId = item.getAttribute('data-target');
            spaPages.forEach(page => {
                if (page.id === targetId) {
                    page.style.display = 'block';
                    page.classList.add('active-page');
                } else {
                    page.style.display = 'none';
                    page.classList.remove('active-page');
                }
            });

            // Load specific page data
            if (targetId === 'history-page') {
                loadHistoryDates();
            } else if (targetId === 'notifications-page') {
                loadNotifications();
            }
        });
    });

    // --- History Logic ---
    const historySelect = document.getElementById('history-date-select');
    const historyContainer = document.getElementById('history-movies-container');
    const historySearchContainer = document.getElementById('history-search-container');
    const historySearchInput = document.getElementById('history-search-input');
    let currentHistoryMovies = [];

    async function loadHistoryDates() {
        if (historySelect.options.length > 1) return; // Already loaded
        try {
            const res = await fetch('/api/history/dates');
            const dates = await res.json();
            historySelect.innerHTML = '<option value="">Select a historical snapshot...</option>';
            dates.forEach(date => {
                const opt = document.createElement('option');
                opt.value = date;
                opt.textContent = date;
                historySelect.appendChild(opt);
            });
        } catch (err) {
            console.error("Failed to load history dates:", err);
        }
    }

    historySelect.addEventListener('change', async (e) => {
        const date = e.target.value;
        
        // Reset search state
        historySearchInput.value = '';
        currentHistoryMovies = [];
        
        if (!date) {
            historySearchContainer.style.display = 'none';
            historyContainer.innerHTML = '';
            return;
        }
        try {
            historyContainer.innerHTML = '<div style="color: var(--text-muted);">Loading movies...</div>';
            const res = await fetch(`/api/history/${date}`);
            const data = await res.json();
            currentHistoryMovies = data.movies;
            historySearchContainer.style.display = 'flex';
            renderHistoryMovies(currentHistoryMovies);
        } catch (err) {
            historySearchContainer.style.display = 'none';
            historyContainer.innerHTML = '<div style="color: red;">Failed to load movies.</div>';
        }
    });

    historySearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (!query) {
            renderHistoryMovies(currentHistoryMovies);
            return;
        }
        const filtered = currentHistoryMovies.filter(movie => 
            movie.title.toLowerCase().includes(query)
        );
        renderHistoryMovies(filtered);
    });

    function renderHistoryMovies(movies) {
        renderMovies(movies, 'history-movies-container');
    }

    // --- Notifications Logic ---
    const notifContainer = document.getElementById('notifications-container');
    let notificationsLoaded = false;

    async function loadNotifications() {
        if (notificationsLoaded) return;
        try {
            notifContainer.innerHTML = '<div style="color: var(--text-muted);">Loading changes...</div>';
            const res = await fetch('/api/changes');
            const data = await res.json();
            
            notifContainer.innerHTML = '';
            let hasChanges = false;
            
            if (data.new_entries && data.new_entries.length > 0) {
                hasChanges = true;
                const section = document.createElement('div');
                section.innerHTML = `<h3 style="color: var(--success); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem;">New Entries</h3>`;
                data.new_entries.forEach(item => {
                    const el = document.createElement('div');
                    el.style.background = 'var(--surface)';
                    el.style.padding = '1rem';
                    el.style.borderRadius = '8px';
                    el.style.marginBottom = '0.5rem';
                    el.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">${item.date}</div><strong>#${item.current_rank || item.rank || "?"}</strong> ${item.title} - <i class="fas fa-star" style="color: var(--accent);"></i> ${item.rating || "?"}`;
                    section.appendChild(el);
                });
                notifContainer.appendChild(section);
            }
            
            if (data.ranking_changes && data.ranking_changes.length > 0) {
                hasChanges = true;
                const section = document.createElement('div');
                section.innerHTML = `<h3 style="color: var(--warning); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem; margin-top: 1rem;">Ranking Changes</h3>`;
                data.ranking_changes.forEach(item => {
                    const el = document.createElement('div');
                    el.style.background = 'var(--surface)';
                    el.style.padding = '1rem';
                    el.style.borderRadius = '8px';
                    el.style.marginBottom = '0.5rem';
                    const diff = item.previous_rank - item.current_rank;
                    const diffHtml = diff > 0 
                        ? `<span style="color: var(--success);"><i class="fas fa-arrow-up"></i> ${diff}</span>` 
                        : `<span style="color: var(--danger);"><i class="fas fa-arrow-down"></i> ${Math.abs(diff)}</span>`;
                    el.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">${item.date}</div><strong>${item.title}</strong> moved from #${item.previous_rank} to #${item.current_rank} (${diffHtml})`;
                    section.appendChild(el);
                });
                notifContainer.appendChild(section);
            }
            
            if (data.rating_changes && data.rating_changes.length > 0) {
                hasChanges = true;
                const section = document.createElement('div');
                section.innerHTML = `<h3 style="color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin-bottom: 1rem; margin-top: 1rem;">Rating Changes</h3>`;
                data.rating_changes.forEach(item => {
                    const el = document.createElement('div');
                    el.style.background = 'var(--surface)';
                    el.style.padding = '1rem';
                    el.style.borderRadius = '8px';
                    el.style.marginBottom = '0.5rem';
                    const diff = (item.current_rating - item.previous_rating).toFixed(1);
                    const diffHtml = diff > 0 
                        ? `<span style="color: var(--success);"><i class="fas fa-arrow-up"></i> ${diff}</span>` 
                        : `<span style="color: var(--danger);"><i class="fas fa-arrow-down"></i> ${Math.abs(diff)}</span>`;
                    el.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem;">${item.date}</div><strong>${item.title}</strong> rating changed from ${item.previous_rating} to ${item.current_rating} (${diffHtml})`;
                    section.appendChild(el);
                });
                notifContainer.appendChild(section);
            }
            
            if (!hasChanges) {
                notifContainer.innerHTML = '<div style="color: var(--text-muted); text-align: center; padding: 2rem;">No recent changes detected.</div>';
            }
            notificationsLoaded = true;
        } catch (err) {
            notifContainer.innerHTML = '<div style="color: red;">Failed to load notifications.</div>';
        }
    }
});
