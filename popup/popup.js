// Popup interaction logic
document.addEventListener('DOMContentLoaded', () => {
  // Analyze followers button
  document.getElementById('analyze-btn').addEventListener('click', async () => {
    showLoading('Analyzing your followers...', 'This may take a few minutes');

    try {
      // Send message to content script
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.url.includes('instagram.com')) {
        hideLoading();
        alert('Please navigate to Instagram.com first!');
        return;
      }

      chrome.tabs.sendMessage(tab.id, { action: 'analyzeFollowers' }, (response) => {
        hideLoading();

        if (chrome.runtime.lastError) {
          showError('Please refresh the Instagram page and try again.');
          return;
        }

        if (response && response.success) {
          displayNonFollowers(response.data);
        } else {
          showError(response?.error || 'Failed to analyze followers. Make sure you\'re on your Instagram profile page.');
        }
      });
    } catch (error) {
      hideLoading();
      showError('An error occurred: ' + error.message);
    }
  });
});

function showLoading(text, subtext) {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  const loadingSubtext = document.getElementById('loading-subtext');

  loadingText.textContent = text;
  loadingSubtext.textContent = subtext;
  overlay.classList.remove('hidden');
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('hidden');
}

function showError(message) {
  const resultsDiv = document.querySelector('.tab-content.active .results');
  resultsDiv.innerHTML = `
    <div class="empty-state" style="color: #F87171;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      <p>${message}</p>
    </div>
  `;
}

function displayNonFollowers(data) {
  const { following, followers, nonFollowers } = data;

  // Update stats
  document.getElementById('following-count').textContent = following.length;
  document.getElementById('followers-count').textContent = followers.length;
  document.getElementById('non-followers-count').textContent = nonFollowers.length;

  // Display results
  const resultsDiv = document.getElementById('non-followers-results');

  if (nonFollowers.length === 0) {
    resultsDiv.innerHTML = `
      <div class="empty-state" style="color: #34D399;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>Everyone you follow follows you back! 🎉</p>
      </div>
    `;
    return;
  }

  resultsDiv.innerHTML = nonFollowers.map(user => `
    <div class="user-card" data-username="${user.username}" data-user-id="${user.id}">
      <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
      <div class="user-info">
        <div class="user-username">${user.username}</div>
        <div class="user-meta">Not following back</div>
      </div>
      <button class="unfollow-btn" data-username="${user.username}" data-user-id="${user.id}">Unfollow</button>
    </div>
  `).join('');

  // Add event listeners to unfollow buttons
  document.querySelectorAll('.unfollow-btn').forEach(btn => {
    btn.addEventListener('click', handleUnfollow);
  });
}

async function handleUnfollow(event) {
  const button = event.target;
  const username = button.dataset.username;
  const userId = button.dataset.userId;
  const userCard = button.closest('.user-card');

  if (!confirm(`Are you sure you want to unfollow @${username}?`)) {
    return;
  }

  // Disable button and show loading state
  button.disabled = true;
  button.textContent = 'Unfollowing...';

  try {
    // Send message to content script to unfollow
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, {
      action: 'unfollowUser',
      userId: userId,
      username: username
    }, (response) => {
      if (chrome.runtime.lastError) {
        button.disabled = false;
        button.textContent = 'Unfollow';
        alert('Error: Please refresh the Instagram page and try again.');
        return;
      }

      if (response && response.success) {
        // Successfully unfollowed - remove card from UI
        userCard.style.opacity = '0.5';
        button.textContent = 'Unfollowed ✓';
        button.style.background = 'rgba(34, 197, 94, 0.2)';
        button.style.color = '#22C55E';
        button.style.borderColor = 'rgba(34, 197, 94, 0.5)';

        // Update counts
        const currentCount = parseInt(document.getElementById('non-followers-count').textContent);
        document.getElementById('non-followers-count').textContent = currentCount - 1;

        setTimeout(() => {
          userCard.remove();
        }, 1000);
      } else {
        button.disabled = false;
        button.textContent = 'Unfollow';
        alert(response?.error || 'Failed to unfollow. Please try again.');
      }
    });
  } catch (error) {
    button.disabled = false;
    button.textContent = 'Unfollow';
    alert('An error occurred: ' + error.message);
  }
}

function displayNoEngagement(data) {
  const { storiesChecked, postsChecked, noEngagement } = data;

  // Update stats
  document.getElementById('posts-count').textContent = postsChecked;
  document.getElementById('no-engagement-count').textContent = noEngagement.length;

  // Display results
  const resultsDiv = document.getElementById('no-engagement-results');

  if (noEngagement.length === 0) {
    resultsDiv.innerHTML = `
      <div class="empty-state" style="color: #34D399;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>All your followers have liked at least one of your posts! 🎉</p>
      </div>
    `;
    return;
  }

  resultsDiv.innerHTML = noEngagement.map(user => `
    <div class="user-card">
      <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
      <div class="user-info">
        <div class="user-username">${user.username}</div>
        <div class="user-meta">Never liked any of your posts</div>
      </div>
      <a href="https://www.instagram.com/${user.username}/" target="_blank" class="user-action">Visit</a>
    </div>
  `).join('');
}


// Store current data globally for filtering
let currentNonFollowers = [];

// Override displayNonFollowers to add search functionality
const originalDisplayNonFollowers = displayNonFollowers;
displayNonFollowers = function (data) {
  const { following, followers, nonFollowers } = data;

  // Store for filtering
  currentNonFollowers = nonFollowers;

  // Update stats
  document.getElementById('following-count').textContent = following.length;
  document.getElementById('followers-count').textContent = followers.length;
  document.getElementById('non-followers-count').textContent = nonFollowers.length;

  // Show search box if there are results
  const controlsDiv = document.getElementById('results-controls');
  if (nonFollowers.length > 0) {
    controlsDiv.style.display = 'block';

    // Setup search
    const searchInput = document.getElementById('search-input');
    searchInput.value = '';
    searchInput.oninput = (e) => {
      filterNonFollowers(e.target.value);
    };
  } else {
    controlsDiv.style.display = 'none';
  }

  // Display results
  renderNonFollowersList(nonFollowers);
};

function renderNonFollowersList(nonFollowers) {
  const resultsDiv = document.getElementById('non-followers-results');

  if (nonFollowers.length === 0) {
    resultsDiv.innerHTML = `
      <div class="empty-state" style="color: #34D399;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <path d="M9 12L11 14L15 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <p>Everyone you follow follows you back! 🎉</p>
      </div>
    `;
    return;
  }

  resultsDiv.innerHTML = nonFollowers.map(user => `
    <div class="user-card" data-username="${user.username}" data-user-id="${user.id}">
      <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
      <div class="user-info">
        <div class="user-username">${user.username}</div>
        <div class="user-meta">Not following back</div>
      </div>
      <button class="unfollow-btn" data-username="${user.username}" data-user-id="${user.id}">Unfollow</button>
    </div>
  `).join('');

  // Add event listeners to unfollow buttons
  document.querySelectorAll('.unfollow-btn').forEach(btn => {
    btn.addEventListener('click', handleUnfollow);
  });
}

function filterNonFollowers(searchTerm) {
  const filtered = currentNonFollowers.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );
  renderNonFollowersList(filtered);
}
