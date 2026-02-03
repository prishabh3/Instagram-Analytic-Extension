// Background service worker for Chrome extension

chrome.runtime.onInstalled.addListener(() => {
    console.log('Instagram Analytics Pro extension installed');
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'log') {
        console.log('Content Script Log:', request.message);
    }

    if (request.action === 'cacheData') {
        chrome.storage.local.set({ [request.key]: request.data }, () => {
            sendResponse({ success: true });
        });
        return true; // Keep channel open for async response
    }

    if (request.action === 'getCachedData') {
        chrome.storage.local.get([request.key], (result) => {
            sendResponse({ success: true, data: result[request.key] });
        });
        return true;
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    if (tab.url.includes('instagram.com')) {
        chrome.action.openPopup();
    } else {
        chrome.tabs.create({ url: 'https://www.instagram.com' });
    }
});
