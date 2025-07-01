const DOM = {
    sidebar: document.getElementById('sidebar'),
    mainContent: document.getElementById('main-content'),
    storyContent: document.getElementById('story-content'),
    storyList: document.getElementById('story-list'),
    storyTitle: document.getElementById('story-title'),
    sidebarToggle: document.getElementById('sidebar-toggle'),
    mobileMenuToggle: document.getElementById('mobile-menu-toggle'),
    searchInput: document.getElementById('search-input'),
    fontControls: {
        decrease: document.getElementById('font-size-decrease'),
        reset: document.getElementById('font-size-reset'),
        increase: document.getElementById('font-size-increase')
    },
    navigation: {
        prev: document.getElementById('prev-story'),
        next: document.getElementById('next-story')
    }
};

// ================= CONFIGURATION =================
const CONFIG = {
    fontSize: {
        min: -5,
        max: 5,
        default: 0,
        baseSize: 1.05,
        step: 0.05
    },
    storage: {
        fontSize: 'fontSize'
    },
    selectors: {
        contentAreas: ['#content', '.story-content', 'main'],
        storyItem: 'li'
    },
    animation: {
        fadeIn: 'fade-in'
    }
};

// ================= STATE MANAGEMENT =================
class AppState {
    constructor() {
        this.stories = [];
        this.currentStory = 'home';
        this.fontSizeLevel = CONFIG.fontSize.default;
        this.searchDebounceTimer = null;
    }

    getCurrentStoryIndex() {
        return this.stories.findIndex(s => s.id === this.currentStory);
    }

    getStoryById(id) {
        return this.stories.find(s => s.id === id);
    }

    isValidStoryIndex(index) {
        return index >= 0 && index < this.stories.length;
    }
}

const state = new AppState();

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    try {
        await loadStories();
        setupEventListeners();
        handleURLChange();
        loadUserPreferences();
        DOM.sidebar.classList.remove('active', 'mobile-active');
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to load stories', error.message, true);
    }
}

// ================= STORY MANAGEMENT =================
async function loadStories() {
    try {
        const response = await fetch('stories.json');
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: Failed to load stories configuration`);
        }
        
        const data = await response.json();
        state.stories = data.stories || [];
        
        if (state.stories.length === 0) {
            throw new Error('No stories found in configuration');
        }
        
        populateSidebar();
    } catch (error) {
        console.error('Error loading stories:', error);
        throw error;
    }
}

function populateSidebar() {
    const fragment = document.createDocumentFragment();
    
    state.stories.forEach(story => {
        const li = document.createElement('li');
        li.dataset.story = story.id;
        
        const link = document.createElement('a');
        link.href = `#/${story.id}`;
        link.innerHTML = `<span>${escapeHtml(story.title)}</span>`;
        
        link.addEventListener('click', handleStoryClick);
        
        li.appendChild(link);
        fragment.appendChild(li);
    });
    
    DOM.storyList.innerHTML = '';
    DOM.storyList.appendChild(fragment);
}

function handleStoryClick(e) {
    if (window.innerWidth <= 992) {
        closeSidebar();
    }
}

async function loadStory(storyId) {
    state.currentStory = storyId;
    const story = state.getStoryById(storyId);
    
    if (!story) {
        await handle404();
        return;
    }
    
    updateUI(story);
    
    try {
        showLoading();
        const content = await fetchStoryContent(story.path || `stories/${storyId}.html`);
        displayStoryContent(content);
    } catch (error) {
        console.error(`Error loading story ${storyId}:`, error);
        showError(`Failed to load story`, error.message);
    }
}

async function fetchStoryContent(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch ${path}`);
    }
    
    const html = await response.text();
    return extractStoryContent(html);
}

function extractStoryContent(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    for (const selector of CONFIG.selectors.contentAreas) {
        const content = doc.querySelector(selector);
        if (content) return content.innerHTML;
    }
    
    return doc.body ? doc.body.innerHTML : html;
}

// ================= UI UPDATES =================
function updateUI(story) {
    updateSidebarActive(story.id);
    updateNavButtons();
    updatePageTitle(story.title);
}

function updateSidebarActive(storyId) {
    DOM.storyList.querySelectorAll('li').forEach(item => {
        item.classList.toggle('active', item.dataset.story === storyId);
    });
}

function updateNavButtons() {
    const currentIndex = state.getCurrentStoryIndex();
    
    // Previous button
    const hasPrev = currentIndex > 0;
    DOM.navigation.prev.disabled = !hasPrev;
    DOM.navigation.prev.dataset.target = hasPrev ? state.stories[currentIndex - 1].id : '';
    
    // Next button
    const hasNext = currentIndex < state.stories.length - 1;
    DOM.navigation.next.disabled = !hasNext;
    DOM.navigation.next.dataset.target = hasNext ? state.stories[currentIndex + 1].id : '';
}

function updatePageTitle(title) {
    DOM.storyTitle.textContent = title;
    document.title = `${title} | MasterZack's JeevanKatha`;
}

// ================= DISPLAY FUNCTIONS =================
function showLoading() {
    DOM.storyContent.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i> Loading story...
        </div>
    `;
}

function displayStoryContent(content) {
    DOM.storyContent.innerHTML = '';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = CONFIG.animation.fadeIn;
    contentDiv.innerHTML = content;
    
    DOM.storyContent.appendChild(contentDiv);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(title, message, showReload = false) {
    DOM.storyContent.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(message)}</p>
            ${showReload 
                ? '<button onclick="window.location.reload()">Try Again</button>'
                : '<button onclick="window.location.hash = \'#/home\'">Go to Home</button>'
            }
        </div>
    `;
}

async function handle404() {
    try {
        const content = await fetchStoryContent('stories/404.html');
        updatePageTitle('Page Not Found');
        displayStoryContent(content);
        updateSidebarActive('');
        DOM.navigation.prev.disabled = true;
        DOM.navigation.next.disabled = true;
    } catch (error) {
        console.error('Failed to load 404 page:', error);
        showError('Page Not Found', 'The requested story could not be found.');
    }
}

// ================= EVENT HANDLING =================
function setupEventListeners() {
    DOM.sidebarToggle?.addEventListener('click', toggleSidebar);
    DOM.mobileMenuToggle?.addEventListener('click', toggleSidebar);
    
    window.addEventListener('hashchange', handleURLChange);
    
    DOM.fontControls.decrease.addEventListener('click', () => adjustFontSize(-1));
    DOM.fontControls.reset.addEventListener('click', resetFontSize);
    DOM.fontControls.increase.addEventListener('click', () => adjustFontSize(1));
    
    DOM.searchInput.addEventListener('input', debounce(searchStories, 90));
    
    DOM.navigation.prev.addEventListener('click', navigateToPrevStory);
    DOM.navigation.next.addEventListener('click', navigateToNextStory);
    
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function handleURLChange() {
    const hash = window.location.hash.replace('#/', '').trim();
    const storyId = hash || 'home';
    loadStory(storyId);
}

function handleKeyboardNavigation(e) {
    if (e.altKey) {
        if (e.key === 'ArrowLeft') {
            navigateToPrevStory();
        } else if (e.key === 'ArrowRight') {
            navigateToNextStory();
        }
    }
    if (e.key === 'Escape' && (DOM.sidebar.classList.contains('active') || DOM.sidebar.classList.contains('mobile-active'))) {
        closeSidebar();
    }
}

// ================= NEW SIDEBAR FUNCTIONS =================
function toggleSidebar() {
    if (DOM.sidebar.classList.contains('active') || DOM.sidebar.classList.contains('mobile-active')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

function openSidebar() {
    const isMobile = window.innerWidth <= 992;
    
    if (isMobile) {
        DOM.sidebar.classList.add('mobile-active');
    } else {
        DOM.sidebar.classList.add('active');
    }
    
    // Add overlay
    if (!document.getElementById('sidebar-overlay')) {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebar-overlay';
        overlay.addEventListener('click', closeSidebar);
        document.body.appendChild(overlay);
    }
}

function closeSidebar() {
    DOM.sidebar.classList.remove('active', 'mobile-active');
    
    // Remove overlay
    const overlay = document.getElementById('sidebar-overlay');
    if (overlay) {
        overlay.remove();
    }
}

// ================= NAVIGATION FUNCTIONS =================
function navigateToPrevStory() {
    const target = DOM.navigation.prev.dataset.target;
    if (target && !DOM.navigation.prev.disabled) {
        window.location.hash = `#/${target}`;
    }
}

function navigateToNextStory() {
    const target = DOM.navigation.next.dataset.target;
    if (target && !DOM.navigation.next.disabled) {
        window.location.hash = `#/${target}`;
    }
}

// ================= SEARCH FUNCTIONALITY =================
function searchStories() {
    const searchTerm = DOM.searchInput.value.toLowerCase().trim();
    const items = DOM.storyList.querySelectorAll('li');
    
    requestAnimationFrame(() => {
        items.forEach(item => {
            const title = item.querySelector('span').textContent.toLowerCase();
            const isVisible = !searchTerm || title.includes(searchTerm);
            
            if (isVisible) {
                item.classList.remove('hidden');
            } else {
                item.classList.add('hidden');
            }
        });
    });
}

// ================= FONT SIZE MANAGEMENT =================
function adjustFontSize(delta) {
    state.fontSizeLevel = Math.max(
        CONFIG.fontSize.min, 
        Math.min(CONFIG.fontSize.max, state.fontSizeLevel + delta)
    );
    applyFontSize();
    savePreference(CONFIG.storage.fontSize, state.fontSizeLevel);
}

function resetFontSize() {
    state.fontSizeLevel = CONFIG.fontSize.default;
    applyFontSize();
    savePreference(CONFIG.storage.fontSize, CONFIG.fontSize.default);
}

function applyFontSize() {
    const size = CONFIG.fontSize.baseSize + (state.fontSizeLevel * CONFIG.fontSize.step);
    DOM.storyContent.style.fontSize = `${size}rem`;
}

// ================= PREFERENCE MANAGEMENT =================
function loadUserPreferences() {
    const savedFontSize = loadPreference(CONFIG.storage.fontSize);
    if (savedFontSize !== null) {
        state.fontSizeLevel = Math.max(
            CONFIG.fontSize.min,
            Math.min(CONFIG.fontSize.max, parseInt(savedFontSize))
        );
        applyFontSize();
    }
}

function savePreference(key, value) {
    try {
        localStorage.setItem(key, value.toString());
    } catch (error) {
        console.warn(`Failed to save preference ${key}:`, error);
    }
}

function loadPreference(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.warn(`Failed to load preference ${key}:`, error);
        return null;
    }
}

// ================= UTILITY FUNCTIONS =================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}
