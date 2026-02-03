// Debug script - Run this in the browser console while on your Instagram profile

console.log('=== Instagram Analytics Debug Script ===');

// Check if we're on profile page
console.log('Current URL:', window.location.href);

// Try to find followers/following buttons
console.log('\n--- Looking for Followers/Following Buttons ---');

// Method 1: By href
const byHref = document.querySelectorAll('a[href*="/followers"], a[href*="/following"]');
console.log('Found by href:', byHref.length);
byHref.forEach((el, i) => console.log(`  ${i}: ${el.href} - "${el.textContent.trim()}"`));

// Method 2: By text content
const allLinks = document.querySelectorAll('a');
const followerLinks = Array.from(allLinks).filter(a =>
    a.textContent.toLowerCase().includes('follower') ||
    a.textContent.toLowerCase().includes('following')
);
console.log('\nFound by text:', followerLinks.length);
followerLinks.forEach((el, i) => console.log(`  ${i}: ${el.href} - "${el.textContent.trim()}"`));

// Try clicking the followers button manually
console.log('\n--- Attempting to Click Followers Button ---');
const followersBtn = document.querySelector('a[href*="/followers"]');
if (followersBtn) {
    console.log('Followers button found:', followersBtn);
    console.log('Clicking...');
    followersBtn.click();

    // Wait and check for dialog
    setTimeout(() => {
        console.log('\n--- Checking for Dialog (after 2s) ---');

        const dialogByRole = document.querySelector('[role="dialog"]');
        console.log('Dialog by role:', dialogByRole);

        const allDivs = document.querySelectorAll('div');
        const fixedDivs = Array.from(allDivs).filter(div => {
            const style = window.getComputedStyle(div);
            return style.position === 'fixed' && parseInt(style.zIndex) > 100;
        });
        console.log('Fixed position divs (z-index > 100):', fixedDivs.length);
        fixedDivs.slice(0, 5).forEach((div, i) => {
            console.log(`  ${i}:`, div.className, 'z-index:', window.getComputedStyle(div).zIndex);
        });

        // Check for any recent DOM changes
        const recentDivs = Array.from(allDivs).filter(div =>
            div.className.includes('_a') || div.className.includes('x')
        );
        console.log('Divs with Instagram classes:', recentDivs.length);

    }, 2000);
} else {
    console.log('Followers button NOT found!');
}

console.log('\n=== End Debug ===');
