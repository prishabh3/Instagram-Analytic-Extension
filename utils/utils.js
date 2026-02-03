// Utility functions for data processing

/**
 * Find users who are in the 'following' list but not in the 'followers' list
 * @param {Array} following - List of users you follow
 * @param {Array} followers - List of users who follow you
 * @returns {Array} Users who don't follow back
 */
function findNonFollowers(following, followers) {
    const followerUsernames = new Set(followers.map(user => user.username.toLowerCase()));
    return following.filter(user => !followerUsernames.has(user.username.toLowerCase()));
}

/**
 * Find users who haven't engaged with any content
 * @param {Array} followers - List of followers
 * @param {Array} storyViewers - List of story viewers
 * @param {Array} postLikers - List of users who liked posts
 * @returns {Array} Users with zero engagement
 */
function findNoEngagement(followers, storyViewers, postLikers) {
    // Create a set of all users who have engaged
    const engagedUsers = new Set();

    storyViewers.forEach(user => engagedUsers.add(user.username.toLowerCase()));
    postLikers.forEach(user => engagedUsers.add(user.username.toLowerCase()));

    // Filter followers who haven't engaged
    return followers.filter(user => !engagedUsers.has(user.username.toLowerCase()));
}

/**
 * Remove duplicates from an array of user objects
 * @param {Array} users - Array of user objects
 * @returns {Array} Deduplicated array
 */
function deduplicateUsers(users) {
    const seen = new Set();
    return users.filter(user => {
        const username = user.username.toLowerCase();
        if (seen.has(username)) {
            return false;
        }
        seen.add(username);
        return true;
    });
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the specified time
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scroll an element to the bottom to load more content
 * @param {Element} element - The element to scroll
 * @param {number} maxScrolls - Maximum number of scroll attempts
 * @returns {Promise<boolean>} True if scrolled successfully
 */
async function scrollToLoadMore(element, maxScrolls = 10) {
    let scrollCount = 0;
    let previousHeight = 0;

    while (scrollCount < maxScrolls) {
        const currentHeight = element.scrollHeight;

        // If height hasn't changed, we've reached the end
        if (currentHeight === previousHeight && scrollCount > 0) {
            break;
        }

        previousHeight = currentHeight;
        element.scrollTo(0, currentHeight);

        await sleep(1500); // Wait for content to load
        scrollCount++;
    }

    return scrollCount > 0;
}

/**
 * Extract username from Instagram profile link
 * @param {string} url - Instagram URL
 * @returns {string|null} Username or null
 */
function extractUsername(url) {
    const match = url.match(/instagram\.com\/([^/?]+)/);
    return match ? match[1] : null;
}

/**
 * Wait for an element to appear in the DOM
 * @param {string} selector - CSS selector
 * @param {number} timeout - Maximum wait time in ms
 * @returns {Promise<Element>} The found element
 */
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Save data to Chrome storage
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
async function saveToStorage(key, value) {
    return new Promise((resolve) => {
        chrome.storage.local.set({ [key]: value }, resolve);
    });
}

/**
 * Get data from Chrome storage
 * @param {string} key - Storage key
 * @returns {Promise<any>} Stored value
 */
async function getFromStorage(key) {
    return new Promise((resolve) => {
        chrome.storage.local.get([key], (result) => {
            resolve(result[key]);
        });
    });
}
