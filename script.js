// ================= DOM ELEMENTS =================
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');
const storyContent = document.getElementById('story-content');
const storyList = document.getElementById('story-list');
const storyTitle = document.getElementById('story-title');
const sidebarToggle = document.getElementById('sidebar-toggle');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const searchInput = document.getElementById('search-input');
const fontSizeDecrease = document.getElementById('font-size-decrease');
const fontSizeReset = document.getElementById('font-size-reset');
const fontSizeIncrease = document.getElementById('font-size-increase');
const prevStoryBtn = document.getElementById('prev-story');
const nextStoryBtn = document.getElementById('next-story');

// ================= STATE VARIABLES =================
let stories = []; // Will store all story information
let currentStory = 'home';
let fontSizeLevel = 0; // For tracking font size adjustments
let isSidebarCollapsed = false; // Track sidebar state

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadStories();

        setupEventListeners();

        handleURLChange();

        loadFontSizePreference();

        loadSidebarState();

    } catch (error) {
        console.error('Initialization error:', error);
        storyContent.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load stories</h3>
                <p>Please check your internet connection or try again later.</p>
                <p>Error: ${error.message}</p>
                <button onclick="window.location.reload()">Try Again</button>
            </div>
        `;
    }
});

// ================= CORE FUNCTIONS =================
async function loadStories() {
    try {
        const response = await fetch('stories.json');
        if (!response.ok) throw new Error('Failed to load stories configuration');
        
        const data = await response.json();
        stories = data.stories;
        
        populateSidebar();
        
    } catch (error) {
        console.error('Error loading stories:', error);
        throw error;
    }
}

/**
 * Populate the sidebar with story links
 */
function populateSidebar() {
    storyList.innerHTML = '';
    
    stories.forEach(story => {
        const li = document.createElement('li');
        li.dataset.story = story.id;
        li.innerHTML = `
            <a href="#/${story.id}">
                <span>${story.title}</span>
            </a>
        `;
        storyList.appendChild(li);
    });
}

function setupEventListeners() {
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-active');
        });
    }
    
    window.addEventListener('hashchange', handleURLChange);
    
    fontSizeDecrease.addEventListener('click', () => adjustFontSize(-1));
    fontSizeReset.addEventListener('click', resetFontSize);
    fontSizeIncrease.addEventListener('click', () => adjustFontSize(1));
    
    searchInput.addEventListener('input', searchStories);
    
    prevStoryBtn.addEventListener('click', navigateToPrevStory);
    nextStoryBtn.addEventListener('click', navigateToNextStory);
    
    // Close mobile sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 992) {
            if (!sidebar.contains(e.target) && !mobileMenuToggle.contains(e.target) && sidebar.classList.contains('mobile-active')) {
                sidebar.classList.remove('mobile-active');
            }
        }
    });
}

function handleURLChange() {
    // Get the story ID from the URL hash
    const hash = window.location.hash.replace('#/', '');
    
    // If no hash or invalid, default to home
    const storyId = hash || 'home';
    
    loadStory(storyId);
}

async function loadStory(storyId) {
    currentStory = storyId;
    
    const story = stories.find(s => s.id === storyId);
    
    if (!story) {
        try {
            const content = await fetchStoryContent('stories/404.html');
            storyTitle.textContent = 'Page Not Found';
            document.title = "404 - Page Not Found | MasterZack's Jeevankatha";
            
            storyContent.innerHTML = '';
            const contentDiv = document.createElement('div');
            contentDiv.className = 'fade-in';
            contentDiv.innerHTML = content;
            storyContent.appendChild(contentDiv);
            
            // Reset scroll position
            window.scrollTo(0, 0);
            
            // Update sidebar to show no active item
            updateSidebarActive('');
            
            // Disable navigation buttons
            prevStoryBtn.disabled = true;
            nextStoryBtn.disabled = true;
            
            return;
        } catch (error) {
            console.error('Failed to load 404 page:', error);
            showError('Story not found');
            return;
        }
    }
    
    updateSidebarActive(storyId);
    updateNavButtons(storyId);
    
    // Update page title
    storyTitle.textContent = story.title;
    document.title = `${story.title} | MasterZack's JeevanKatha`;
    
    try {
        storyContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading story...</div>';
        
        const content = await fetchStoryContent(story.path || `stories/${storyId}.html`);
        
        storyContent.innerHTML = '';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'fade-in';
        contentDiv.innerHTML = content;
        storyContent.appendChild(contentDiv);
        
        window.scrollTo(0, 0);
        
    } catch (error) {
        console.error(`Error loading story ${storyId}:`, error);
        showError(`Failed to load story: ${error.message}`);
    }
}

/**
 * Fetch story content from HTML file
 */
async function fetchStoryContent(path) {
    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const html = await response.text();
        return extractStoryContent(html);
    } catch (error) {
        throw error;
    }
}

/**
 * Extract only the content part from HTML file
 */
function extractStoryContent(html) {
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const content = doc.querySelector('#content') || 
                   doc.querySelector('.story-content') || 
                   doc.querySelector('main') ||
                   doc.body;
    
    return content ? content.innerHTML : html;
}

/**
 * Update active story in sidebar
 */
function updateSidebarActive(storyId) {
    const items = storyList.querySelectorAll('li');
    items.forEach(item => {
        item.classList.toggle('active', item.dataset.story === storyId);
    });
}

function updateNavButtons(storyId) {
    const currentIndex = stories.findIndex(s => s.id === storyId);
    
    if (currentIndex > 0) {
        prevStoryBtn.disabled = false;
        prevStoryBtn.dataset.target = stories[currentIndex - 1].id;
    } else {
        prevStoryBtn.disabled = true;
        prevStoryBtn.dataset.target = '';
    }
    
    if (currentIndex < stories.length - 1) {
        nextStoryBtn.disabled = false;
        nextStoryBtn.dataset.target = stories[currentIndex + 1].id;
    } else {
        nextStoryBtn.disabled = true;
        nextStoryBtn.dataset.target = '';
    }
}

function navigateToPrevStory() {
    if (!prevStoryBtn.disabled && prevStoryBtn.dataset.target) {
        window.location.hash = `#/${prevStoryBtn.dataset.target}`;
    }
}

function navigateToNextStory() {
    if (!nextStoryBtn.disabled && nextStoryBtn.dataset.target) {
        window.location.hash = `#/${nextStoryBtn.dataset.target}`;
    }
}

function showError(message) {
    storyContent.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>Error</h3>
            <p>${message}</p>
            <button onclick="window.location.hash = '#/home'">Go to Home</button>
        </div>
    `;
}

// ================= UI FUNCTIONS =================


function toggleSidebar() {
    if (window.innerWidth <= 992) {
        // On mobile, toggle the mobile-active class
        sidebar.classList.toggle('mobile-active');
    } else {
        // On desktop, toggle collapsed state
        isSidebarCollapsed = !isSidebarCollapsed;
        sidebar.classList.toggle('collapsed', isSidebarCollapsed);
        localStorage.setItem('sidebarState', isSidebarCollapsed ? 'collapsed' : 'expanded');

        // Dynamically adjust the sidebar's width
        if (isSidebarCollapsed) {
            sidebar.style.width = 'var(--sidebar-collapsed-width)';
        } else {
            sidebar.style.width = 'var(--sidebar-width)';
        }
    }
}



/**
 * Load sidebar state from localStorage
 */
function loadSidebarState() {
    const sidebarState = localStorage.getItem('sidebarState');
    isSidebarCollapsed = sidebarState === 'collapsed';
    sidebar.classList.toggle('collapsed', isSidebarCollapsed);
}

function searchStories() {
    const searchTerm = searchInput.value.toLowerCase();
    const items = storyList.querySelectorAll('li');
    
    items.forEach(item => {
        const title = item.querySelector('span').textContent.toLowerCase();
        if (title.includes(searchTerm)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

function adjustFontSize(amount) {
    fontSizeLevel = Math.max(-5, Math.min(5, fontSizeLevel + amount));
    applyFontSize();
    localStorage.setItem('fontSize', fontSizeLevel.toString());
}

function resetFontSize() {
    fontSizeLevel = 0;
    applyFontSize();
    localStorage.setItem('fontSize', '0');
}

function applyFontSize() {
    let size = 1.05; // Increase or decrease base size
    
    switch (fontSizeLevel) {
        case -5: size = 0.80; break;
        case -4: size = 0.85; break;
        case -3: size = 0.90; break;
        case -2: size = 0.95; break;
        case -1: size = 1.00; break;
        case 0: size = 1.05; break;
        case 1: size = 1.10; break;
        case 2: size = 1.15; break;
        case 3: size = 1.20; break;
        case 4: size = 1.25; break;
        case 5: size = 1.30; break;
    }
    
    storyContent.style.fontSize = `${size}rem`;
}

/**
 * Load font size preference from localStorage
 */
function loadFontSizePreference() {
    const savedFontSize = localStorage.getItem('fontSize');
    
    if (savedFontSize !== null) {
        fontSizeLevel = parseInt(savedFontSize);
        applyFontSize();
    }
}
