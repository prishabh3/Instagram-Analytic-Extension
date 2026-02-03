// Engagement analyzer - Scrapes post pages to get likers since API is blocked

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeEngagement') {
    handleAnalyzeEngagement(sendResponse);
    return true;
  }
});

async function handleAnalyzeEngagement(sendResponse) {
  try {
    console.log('Starting engagement analysis...');

    // Scrape posts from profile page
    const posts = extractPostsFromProfilePage();

    if (!posts || posts.length === 0) {
      sendResponse({
        success: false,
        error: 'No posts found. Make sure you are on your Instagram profile page with posts visible.'
      });
      return;
    }

    console.log(`Found ${posts.length} posts on your profile`);

    // Get likers from each post's embedded page data
    const allLikers = new Set();

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      console.log(`Checking post ${i + 1}/${posts.length} (${post.shortcode})...`);

      // Scrape likers from the post page
      const likers = await scrapePostLikers(post.shortcode);
      console.log(`  Found ${likers.length} likers`);

      likers.forEach(liker => allLikers.add(liker));

      // Small delay between requests
      if (i < posts.length - 1) {
        await sleep(2000);
      }
    }

    console.log(`Total unique people who liked your posts: ${allLikers.size}`);

    if (allLikers.size === 0) {
      sendResponse({
        success: false,
        error: 'Could not fetch post likes. Instagram may be blocking automated access. Try refreshing and running again.'
      });
      return;
    }

    // Get user ID
    const userId = await getUserIdFromPage();
    if (!userId) {
      sendResponse({
        success: false,
        error: 'Could not find your user ID.'
      });
      return;
    }

    // Fetch followers
    console.log('Fetching your followers...');
    const followers = await fetchFollowersForEngagement(userId);
    if (!followers) {
      sendResponse({
        success: false,
        error: 'Failed to fetch followers.'
      });
      return;
    }

    // Find followers who never liked any post
    const noEngagement = followers.filter(follower => !allLikers.has(follower.username));

    console.log(`Found ${noEngagement.length} followers with zero engagement (never liked any post)`);

    sendResponse({
      success: true,
      data: {
        postsChecked: posts.length,
        storiesChecked: 0,
        noEngagement: noEngagement
      }
    });

  } catch (error) {
    console.error('Error analyzing engagement:', error);
    sendResponse({
      success: false,
      error: `Error: ${error.message}`
    });
  }
}

function extractPostsFromProfilePage() {
  try {
    // Look for post links
    const postLinks = document.querySelectorAll('a[href*="/p/"]');
    const posts = [];
    const seen = new Set();

    postLinks.forEach(link => {
      const href = link.getAttribute('href');
      const match = href.match(/\/p\/([A-Za-z0-9_-]+)\//);
      if (match && !seen.has(match[1])) {
        seen.add(match[1]);
        posts.push({ shortcode: match[1] });
      }
    });

    if (posts.length > 0) {
      console.log(`Found ${posts.length} posts from page links`);
      return posts.slice(0, 12); // Max 12 posts
    }

    // Fallback: Extract from scripts
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;
      if (text.includes('shortcode')) {
        const shortcodes = text.match(/"shortcode":"([A-Za-z0-9_-]+)"/g);
        if (shortcodes && shortcodes.length > 0) {
          const uniqueCodes = new Set();
          shortcodes.forEach(match => {
            const code = match.match(/"shortcode":"([A-Za-z0-9_-]+)"/)[1];
            uniqueCodes.add(code);
          });

          const postsFromScript = Array.from(uniqueCodes).map(code => ({ shortcode: code }));
          console.log(`Found ${postsFromScript.length} posts from scripts`);
          return postsFromScript.slice(0, 12);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting posts:', error);
    return null;
  }
}

async function scrapePostLikers(shortcode) {
  try {
    // Fetch the post page HTML
    const postUrl = `https://www.instagram.com/p/${shortcode}/`;
    console.log(`  Fetching post page: ${postUrl}`);

    const response = await fetch(postUrl, {
      credentials: 'include',
      headers: {
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9'
      }
    });

    if (!response.ok) {
      console.error(`  Failed to fetch post page: ${response.status}`);
      return [];
    }

    const html = await response.text();

    // Extract JSON data from page
    const likers = [];

    // Look for edge_liked_by in the HTML
    const likedByMatch = html.match(/"edge_liked_by":\{"count":(\d+),"edges":\[([^\]]*)\]/);

    if (likedByMatch) {
      const count = parseInt(likedByMatch[1]);
      console.log(`  Post has ${count} likes total`);

      const edgesText = likedByMatch[2];

      // Extract usernames from edges
      const usernameMatches = edgesText.matchAll(/"username":"([^"]+)"/g);
      for (const match of usernameMatches) {
        likers.push(match[1]);
      }
    }

    // Alternative: Look for likers in the shared data
    const sharedDataMatch = html.match(/window\._sharedData = ({.+?});<\/script>/);
    if (sharedDataMatch && likers.length === 0) {
      try {
        const sharedData = JSON.parse(sharedDataMatch[1]);
        const media = sharedData?.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;

        if (media?.edge_liked_by?.edges) {
          media.edge_liked_by.edges.forEach(edge => {
            if (edge?.node?.username) {
              likers.push(edge.node.username);
            }
          });
        }
      } catch (e) {
        console.log(`  Could not parse shared data`);
      }
    }

    console.log(`  Scraped ${likers.length} likers from page`);
    return likers;

  } catch (error) {
    console.error(`  Error scraping post ${shortcode}:`, error);
    return [];
  }
}

async function getUserIdFromPage() {
  try {
    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent;

      if (text.includes('"owner":{"id":"')) {
        const match = text.match(/"owner":\{"id":"(\d+)"/);
        if (match) return match[1];
      }

      if (text.includes('"profilePage_')) {
        const match = text.match(/"profilePage_(\d+)"/);
        if (match) return match[1];
      }

      if (text.includes('"viewer_id"')) {
        const match = text.match(/"viewer_id":"(\d+)"/);
        if (match) return match[1];
      }
    }

    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

async function fetchFollowersForEngagement(userId) {
  try {
    const followers = [];
    let hasNext = true;
    let endCursor = null;

    console.log('Fetching followers for engagement check...');

    while (hasNext) {
      const url = `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=${encodeURIComponent(JSON.stringify({
        id: userId,
        include_reel: false,
        fetch_mutual: false,
        first: 200,
        after: endCursor
      }))}`;

      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'x-ig-app-id': '936619743392459'
        }
      });

      if (!response.ok) break;

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

      console.log(`Fetched ${followers.length} followers...`);

      if (hasNext) await sleep(1500);
    }

    console.log(`Fetched ${followers.length} followers total`);
    return followers;

  } catch (error) {
    console.error('Error fetching followers:', error);
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
