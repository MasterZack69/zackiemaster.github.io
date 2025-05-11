/**
 * Story Website - Script for loading story content dynamically
 * AMOLED Black theme permanently enabled
 */

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
        // Load stories configuration
        await loadStories();

        // Set up event listeners
        setupEventListeners();

        // Initialize UI based on URL
        handleURLChange();

        // Load font size preference
        loadFontSizePreference();

        // Load sidebar state
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
    // Re-enable transitions after page has loaded (Firefox-specific)
if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
    setTimeout(() => {
        document.documentElement.classList.add('transitions-enabled');
    }, 300); // Longer delay to ensure everything is rendered
}

});

// ================= CORE FUNCTIONS =================

/**
 * Load stories configuration from stories.json
 */
async function loadStories() {
    try {
        const response = await fetch('stories.json');
        if (!response.ok) throw new Error('Failed to load stories configuration');
        
        const data = await response.json();
        stories = data.stories;
        
        // Populate sidebar with stories
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

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Sidebar toggle
    sidebarToggle.addEventListener('click', toggleSidebar);
    
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-active');
        });
    }
    
    // URL/hash change
    window.addEventListener('hashchange', handleURLChange);
    
    // Font size controls
    fontSizeDecrease.addEventListener('click', () => adjustFontSize(-1));
    fontSizeReset.addEventListener('click', resetFontSize);
    fontSizeIncrease.addEventListener('click', () => adjustFontSize(1));
    
    // Search input
    searchInput.addEventListener('input', searchStories);
    
    // Navigation buttons
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

/**
 * Handle URL changes to load the appropriate story
 */
function handleURLChange() {
    // Get the story ID from the URL hash
    const hash = window.location.hash.replace('#/', '');
    
    // If no hash or invalid, default to home
    const storyId = hash || 'home';
    
    // Load the story
    loadStory(storyId);
}

/**
 * Load a story by ID
 */
async function loadStory(storyId) {
    // Update current story
    currentStory = storyId;
    
    // Find the story object
    const story = stories.find(s => s.id === storyId) || stories.find(s => s.id === 'home');
    
    if (!story) {
        showError('Story not found');
        return;
    }
    
    // Update active state in sidebar
    updateSidebarActive(storyId);
    
    // Update navigation buttons
    updateNavButtons(storyId);
    
    // Update page title
    storyTitle.textContent = story.title;
    document.title = `${story.title} | My Stories`;
    
    try {
        // Show loading state
        storyContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading story...</div>';
        
        // Fetch the story content
        const content = await fetchStoryContent(story.path || `stories/${storyId}.html`);
        
        // Update the content with fade effect
        storyContent.innerHTML = '';
        const contentDiv = document.createElement('div');
        contentDiv.className = 'fade-in';
        contentDiv.innerHTML = content;
        storyContent.appendChild(contentDiv);
        
        // Reset scroll position
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
    // This function extracts the actual content from your HTML files
    // You may need to adjust the selector based on how your HTML files are structured
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Try to find content with a specific ID or class
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

/**
 * Update navigation buttons based on current story
 */
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

/**
 * Navigate to previous story
 */
function navigateToPrevStory() {
    if (!prevStoryBtn.disabled && prevStoryBtn.dataset.target) {
        window.location.hash = `#/${prevStoryBtn.dataset.target}`;
    }
}

/**
 * Navigate to next story
 */
function navigateToNextStory() {
    if (!nextStoryBtn.disabled && nextStoryBtn.dataset.target) {
        window.location.hash = `#/${nextStoryBtn.dataset.target}`;
    }
}

/**
 * Show error message in content area
 */
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

/**
 * Toggle sidebar between expanded and collapsed states
 */
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

/**
 * Search through stories in the sidebar
 */
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

/**
 * Adjust font size
 */
function adjustFontSize(amount) {
    fontSizeLevel = Math.max(-2, Math.min(4, fontSizeLevel + amount));
    applyFontSize();
    localStorage.setItem('fontSize', fontSizeLevel.toString());
}

/**
 * Reset font size to default
 */
function resetFontSize() {
    fontSizeLevel = 0;
    applyFontSize();
    localStorage.setItem('fontSize', '0');
}

/**
 * Apply current font size level to content
 */
function applyFontSize() {
    let size = 1.2; // Increased base size
    
    switch (fontSizeLevel) {
        case -2: size = 1.0; break;
        case -1: size = 1.1; break;
        case 0: size = 1.2; break;
        case 1: size = 1.3; break;
        case 2: size = 1.4; break;
        case 3: size = 1.5; break;
        case 4: size = 1.6; break;
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
