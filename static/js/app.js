document.addEventListener('DOMContentLoaded', () => {
    // State variables
    let allReleases = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let isFetching = false;

    // Tweet State
    let currentTweet = {
        id: '',
        date: '',
        type: '',
        baseText: '',
        customText: '',
        link: '',
        includeHash: true,
        includeLink: true
    };

    // DOM Elements
    const timelineEl = document.getElementById('timeline');
    const btnRefresh = document.getElementById('btn-refresh');
    const syncTimeEl = document.getElementById('sync-time');
    const searchInput = document.getElementById('search-input');
    const filterPills = document.querySelectorAll('.filter-pill');
    
    // Modal Elements
    const tweetModal = document.getElementById('tweet-modal');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const toggleHash = document.getElementById('toggle-hash');
    const toggleLink = document.getElementById('toggle-link');
    const toggleLinkLabel = document.getElementById('toggle-link-label');
    const charCountNum = document.getElementById('char-count-num');
    const charProgressRing = document.getElementById('char-progress-ring');
    const btnPostTweet = document.getElementById('btn-post-tweet');
    const toastContainer = document.getElementById('toast-container');

    // SVGs for use in rendering
    const copySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
    const twitterSvg = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    const linkSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>`;

    // Initialization
    fetchReleases();

    // Event Listeners
    btnRefresh.addEventListener('click', () => fetchReleases(true));
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTimeline();
    });

    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            activeFilter = pill.getAttribute('data-type');
            renderTimeline();
        });
    });

    // Modal Event Listeners
    btnCloseModal.addEventListener('click', closeModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeModal();
    });

    tweetTextarea.addEventListener('input', () => {
        currentTweet.customText = tweetTextarea.value;
        updateTweetComposer();
    });

    toggleHash.addEventListener('change', (e) => {
        currentTweet.includeHash = e.target.checked;
        rebuildTweetText();
    });

    toggleLink.addEventListener('change', (e) => {
        currentTweet.includeLink = e.target.checked;
        rebuildTweetText();
    });

    btnPostTweet.addEventListener('click', sendTweetIntent);

    // Toast Notification helper
    function showToast(message, isError = false) {
        const toast = document.createElement('div');
        toast.className = `toast ${isError ? 'error' : ''}`;
        toast.innerHTML = `
            ${isError ? '✕' : '✓'}
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        
        // Remove toast after animation completes
        setTimeout(() => {
            toast.style.animation = 'none';
            // Trigger reflow
            toast.offsetHeight;
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Fetch releases from API
    async function fetchReleases(force = false) {
        if (isFetching) return;
        
        isFetching = true;
        btnRefresh.classList.add('loading');
        
        // Render skeletons while loading
        renderSkeletons();
        
        try {
            const response = await fetch(`/api/releases${force ? '?refresh=true' : ''}`);
            const result = await response.json();
            
            if (result.status === 'success') {
                allReleases = result.data.entries;
                
                // Update sync status text
                const formattedTime = result.cached 
                    ? `Cached (${result.last_fetched})` 
                    : `Synced (${result.last_fetched})`;
                syncTimeEl.textContent = formattedTime;
                
                showToast(force ? "Release notes refreshed!" : "Release notes loaded!");
            } else {
                throw new Error(result.message || "Failed to fetch data");
            }
        } catch (error) {
            console.error("Fetch error:", error);
            showToast(error.message, true);
            renderErrorState(error.message);
        } finally {
            isFetching = false;
            btnRefresh.classList.remove('loading');
            renderTimeline();
        }
    }

    // Render Skeletons for Loading State
    function renderSkeletons() {
        timelineEl.innerHTML = `
            <div class="loading-wrapper">
                ${Array(3).fill().map(() => `
                    <div class="skeleton-card">
                        <div class="skeleton-badge"></div>
                        <div class="skeleton-text medium"></div>
                        <div class="skeleton-text"></div>
                        <div class="skeleton-text short"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Render Error State
    function renderErrorState(message) {
        timelineEl.innerHTML = `
            <div class="state-container">
                <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <div class="state-title">Error Loading Release Notes</div>
                <div class="state-desc">${message || "Please check your network connection and try again."}</div>
                <button id="btn-error-retry" class="btn-secondary">Retry Fetching</button>
            </div>
        `;
        document.getElementById('btn-error-retry')?.addEventListener('click', () => fetchReleases(true));
    }

    // Render the Timeline and cards with filters applied
    function renderTimeline() {
        if (allReleases.length === 0) return;

        // Apply filters
        const filteredEntries = [];
        
        allReleases.forEach(entry => {
            const matchedUpdates = entry.updates.filter(update => {
                // Category Filter
                const categoryMatches = activeFilter === 'all' || 
                    update.type.toLowerCase() === activeFilter.toLowerCase();
                
                // Search Query Filter
                const searchMatches = searchQuery === '' || 
                    update.type.toLowerCase().includes(searchQuery) ||
                    update.plain_text.toLowerCase().includes(searchQuery) ||
                    entry.date.toLowerCase().includes(searchQuery);
                    
                return categoryMatches && searchMatches;
            });

            if (matchedUpdates.length > 0) {
                filteredEntries.push({
                    ...entry,
                    updates: matchedUpdates
                });
            }
        });

        // Check if there are no results
        if (filteredEntries.length === 0) {
            timelineEl.innerHTML = `
                <div class="state-container">
                    <svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <div class="state-title">No results found</div>
                    <div class="state-desc">We couldn't find any release notes matching your filters. Try clearing search or category filter.</div>
                    <button id="btn-clear-filters" class="btn-secondary">Clear Filters</button>
                </div>
            `;
            document.getElementById('btn-clear-filters')?.addEventListener('click', clearFilters);
            return;
        }

        // Generate the timeline HTML
        let timelineHTML = '';

        filteredEntries.forEach(entry => {
            timelineHTML += `
                <div class="timeline-group">
                    <div class="timeline-dot"></div>
                    <h2 class="timeline-date-header">
                        ${entry.date}
                    </h2>
                    <div class="timeline-cards-list">
                        ${entry.updates.map(update => `
                            <div class="release-card" data-id="${update.id}" data-type="${update.type}">
                                <div class="card-header">
                                    <span class="badge-type">${update.type}</span>
                                    <div class="card-actions">
                                        <button class="btn-icon btn-copy-action" title="Copy update text" data-text="${update.plain_text}">
                                            ${copySvg}
                                        </button>
                                        <button class="btn-icon btn-tweet-action" title="Compose a Tweet about this" data-id="${update.id}">
                                            ${twitterSvg}
                                        </button>
                                    </div>
                                </div>
                                <div class="card-body">
                                    ${update.html}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        timelineEl.innerHTML = timelineHTML;

        // Attach action handlers
        document.querySelectorAll('.btn-copy-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const text = button.getAttribute('data-text');
                copyToClipboard(text, button);
            });
        });

        document.querySelectorAll('.btn-tweet-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const updateId = e.currentTarget.getAttribute('data-id');
                openTweetModal(updateId);
            });
        });
    }

    // Clear filters helper
    function clearFilters() {
        searchInput.value = '';
        searchQuery = '';
        activeFilter = 'all';
        filterPills.forEach(p => p.classList.remove('active'));
        document.querySelector('.filter-pill[data-type="all"]').classList.add('active');
        renderTimeline();
    }

    // Copy to clipboard helper
    async function copyToClipboard(text, buttonElement) {
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied to clipboard!");
            
            // Temporary visual feedback on the button
            const originalHTML = buttonElement.innerHTML;
            buttonElement.innerHTML = `✓`;
            buttonElement.style.color = 'var(--color-feature)';
            setTimeout(() => {
                buttonElement.innerHTML = originalHTML;
                buttonElement.style.color = '';
            }, 1500);
        } catch (err) {
            console.error('Could not copy text: ', err);
            showToast('Failed to copy text', true);
        }
    }

    // Open Tweet Composer Modal
    function openTweetModal(updateId) {
        // Find the update in our state
        let foundUpdate = null;
        let entryDate = '';
        
        for (const entry of allReleases) {
            foundUpdate = entry.updates.find(u => u.id === updateId);
            if (foundUpdate) {
                entryDate = entry.date;
                break;
            }
        }

        if (!foundUpdate) return;

        // Set state for modal
        currentTweet = {
            id: foundUpdate.id,
            date: entryDate,
            type: foundUpdate.type,
            baseText: foundUpdate.plain_text,
            customText: foundUpdate.plain_text, // Initial draft text
            link: foundUpdate.first_link || 'https://docs.cloud.google.com/bigquery/docs/release-notes',
            includeHash: true,
            includeLink: foundUpdate.first_link ? true : false
        };

        // Populate controls in UI
        toggleHash.checked = currentTweet.includeHash;
        
        if (foundUpdate.first_link) {
            toggleLink.checked = true;
            toggleLink.disabled = false;
            toggleLinkLabel.innerHTML = `${linkSvg} Include link: <span style="font-family: monospace; opacity: 0.7; font-size: 0.75rem;">${currentTweet.link.substring(0, 30)}...</span>`;
        } else {
            toggleLink.checked = false;
            toggleLink.disabled = true;
            toggleLinkLabel.innerHTML = `${linkSvg} No links inside this update`;
        }

        rebuildTweetText();
        
        // Show modal
        tweetModal.classList.add('active');
        tweetTextarea.focus();
    }

    // Close Tweet Composer Modal
    function closeModal() {
        tweetModal.classList.remove('active');
    }

    // Rebuild the final Tweet text based on switches
    function rebuildTweetText() {
        let textParts = [];
        
        // Base prefix: "BigQuery Feature (June 15, 2026): "
        const prefix = `BigQuery ${currentTweet.type} (${currentTweet.date}): `;
        
        let draftText = currentTweet.customText;
        
        // If the custom text has not been modified yet and starts with the prefix,
        // we clean it up so we don't double prefix.
        if (draftText.startsWith(prefix)) {
            draftText = draftText.replace(prefix, '');
        }

        // Add prefix + body
        let fullText = `${prefix}${draftText}`;

        // Append link
        if (currentTweet.includeLink && currentTweet.link) {
            fullText += `\n\nLink: ${currentTweet.link}`;
        }

        // Append Hashtag
        if (currentTweet.includeHash) {
            fullText += ` #BigQuery`;
        }

        tweetTextarea.value = fullText;
        updateTweetComposer();
    }

    // Update character counts and limit rules in Modal
    function updateTweetComposer() {
        const text = tweetTextarea.value;
        const length = text.length;
        const limit = 280;
        
        charCountNum.textContent = `${length} / ${limit}`;
        
        // Set colors based on length
        charCountNum.className = 'character-count';
        if (length > limit) {
            charCountNum.classList.add('danger');
            btnPostTweet.disabled = true;
        } else if (length > limit - 30) {
            charCountNum.classList.add('warning');
            btnPostTweet.disabled = false;
        } else {
            btnPostTweet.disabled = length === 0;
        }

        // Animate progress circle
        const circle = charProgressRing;
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        
        const percentage = Math.min(length / limit, 1);
        const offset = circumference - (percentage * circumference);
        circle.style.strokeDashoffset = offset;

        // Change progress ring color
        if (length > limit) {
            circle.style.stroke = '#ef4444'; // Red
        } else if (length > limit - 30) {
            circle.style.stroke = '#fb923c'; // Orange
        } else {
            circle.style.stroke = 'var(--color-twitter)'; // Blue
        }
    }

    // Open Twitter intent window
    function sendTweetIntent() {
        const text = tweetTextarea.value;
        if (text.length > 280) {
            showToast("Tweet exceeds the 280 character limit!", true);
            return;
        }
        
        const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterIntentUrl, '_blank', 'width=550,height=420,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes');
        closeModal();
        showToast("Opened Twitter sharing tab!");
    }
});
