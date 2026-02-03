// Instagram scraper V2 - Uses Instagram's internal API instead of DOM scraping

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'analyzeFollowers') {
        handleAnalyzeFollowersV2(sendResponse);
        return true;
    }
});

async function handleAnalyzeFollowersV2(sendResponse) {
    try {
        console.log('Starting follower analysis (API method)...');

        // Get user ID from the profile page
        const userId = await getUserId();
        if (!userId) {
            sendResponse({
                success: false,
                error: 'Could not find your user ID. Please make sure you are on your profile page.'
            });
            return;
        }

        console.log('User ID:', userId);

        // Fetch followers and following using Instagram's API
        const following = await fetchFollowing(userId);
        const followers = await fetchFollowers(userId);

        if (!following || !followers) {
            sendResponse({
                success: false,
                error: 'Failed to fetch data. Instagram may be rate limiting.'
            });
            return;
        }

        // Find non-followers
        const nonFollowers = findNonFollowers(following, followers);

        sendResponse({
            success: true,
            data: {
                following: following,
                followers: followers,
                nonFollowers: nonFollowers
            }
        });

    } catch (error) {
        console.error('Error analyzing followers:', error);
        sendResponse({
            success: false,
            error: `Error: ${error.message}. Make sure you're logged in and on your profile page.`
        });
    }
}

async function getUserId() {
    try {
        // Method 1: From page source
        const scriptTags = document.querySelectorAll('script');
        for (const script of scriptTags) {
            const content = script.textContent;
            if (content.includes('"profilePage_')) {
                const match = content.match(/"profilePage_(\d+)"/);
                if (match) return match[1];
            }
            if (content.includes('"owner":{"id":"')) {
                const match = content.match(/"owner":\{"id":"(\d+)"/);
                if (match) return match[1];
            }
        }

        // Method 2: From window.__additionalDataLoaded
        if (window._sharedData) {
            const userId = window._sharedData?.config?.viewer?.id;
            if (userId) return userId;
        }

        // Method 3: Try to extract from profile page HTML
        const html = document.documentElement.innerHTML;
        const userIdMatch = html.match(/"owner":\{"id":"(\d+)"/);
        if (userIdMatch) return userIdMatch[1];

        return null;
    } catch (error) {
        console.error('Error getting user ID:', error);
        return null;
    }
}

async function fetchFollowers(userId) {
    try {
        const followers = [];
        let hasNext = true;
        let endCursor = null;
        let count = 0;
        const maxPages = 20; // Limit to prevent infinite loops

        while (hasNext && count < maxPages) {
            const url = `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=${encodeURIComponent(JSON.stringify({
                id: userId,
                include_reel: false,
                fetch_mutual: false,
                first: 50,
                after: endCursor
            }))}`;

            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'x-ig-app-id': '936619743392459'
                }
            });

            if (!response.ok) {
                console.error('Followers fetch failed:', response.status);
                break;
            }

            const data = await response.json();
            const edges = data?.data?.user?.edge_followed_by?.edges || [];

            edges.forEach(edge => {
                followers.push({
                    username: edge.node.username,
                    id: edge.node.id
                });
            });

            const pageInfo = data?.data?.user?.edge_followed_by?.page_info;
            hasNext = pageInfo?.has_next_page || false;
            endCursor = pageInfo?.end_cursor || null;
            count++;

            // Small delay to avoid rate limiting
            if (hasNext) await sleep(1000);
        }

        console.log(`Fetched ${followers.length} followers`);
        return followers;

    } catch (error) {
        console.error('Error fetching followers:', error);
        return null;
    }
}

async function fetchFollowing(userId) {
    try {
        const following = [];
        let hasNext = true;
        let endCursor = null;
        let count = 0;
        const maxPages = 20;

        while (hasNext && count < maxPages) {
            const url = `https://www.instagram.com/graphql/query/?query_hash=d04b0a864b4b54837c0d870b0e77e076&variables=${encodeURIComponent(JSON.stringify({
                id: userId,
                include_reel: false,
                fetch_mutual: false,
                first: 50,
                after: endCursor
            }))}`;

            const response = await fetch(url, {
                credentials: 'include',
                headers: {
                    'x-ig-app-id': '936619743392459'
                }
            });

            if (!response.ok) {
                console.error('Following fetch failed:', response.status);
                break;
            }

            const data = await response.json();
            const edges = data?.data?.user?.edge_follow?.edges || [];

            edges.forEach(edge => {
                following.push({
                    username: edge.node.username,
                    id: edge.node.id
                });
            });

            const pageInfo = data?.data?.user?.edge_follow?.page_info;
            hasNext = pageInfo?.has_next_page || false;
            endCursor = pageInfo?.end_cursor || null;
            count++;

            // Small delay to avoid rate limiting
            if (hasNext) await sleep(1000);
        }

        console.log(`Fetched ${following.length} following`);
        return following;

    } catch (error) {
        console.error('Error fetching following:', error);
        return null;
    }
}
