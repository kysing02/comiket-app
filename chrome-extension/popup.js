// Initial state
const previewDiv = document.getElementById('preview');
const noTweetDiv = document.getElementById('noTweet');
const tweetText = document.getElementById('tweetText');
const imageCount = document.getElementById('imageCount');
const sendBtn = document.getElementById('sendBtn');
const statusDiv = document.getElementById('status');

// Configurations (User should replace these)
const SUPABASE_URL = "https://xebworbpoabbmqzcqxql.supabase.co";
const SUPABASE_KEY = "sb_publishable_gpG_7GXwaSrWEYd8-aEz8w_rpamn_DZ";

let currentData = null;

function setStatus(msg, type = "") {
  statusDiv.innerText = msg;
  statusDiv.className = type;
}

// Initialize: Ask content script to scrape
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (!tabs[0]) return;
  
  chrome.tabs.sendMessage(tabs[0].id, { action: "scrape" }, (response) => {
    if (chrome.runtime.lastError) {
      setStatus("Error: Cannot connect to page. Refresh X and try again.", "error");
      return;
    }

    if (response && response.data) {
      currentData = response.data;
      noTweetDiv.style.display = 'none';
      previewDiv.style.display = 'block';
      tweetText.innerText = currentData.content || "(No text content)";
      imageCount.innerText = `${currentData.image_urls.length} images detected`;
      
      if (SUPABASE_URL === "YOUR_SUPABASE_URL") {
        setStatus("Warning: Update SUPABASE_URL in popup.js", "error");
        sendBtn.disabled = true;
      }
    } else {
      setStatus("No tweet data found on this page.", "error");
    }
  });
});

sendBtn.addEventListener('click', async () => {
  if (!currentData) return;
  if (SUPABASE_URL === "YOUR_SUPABASE_URL") return;
  
  sendBtn.disabled = true;
  setStatus("Sending...", "");

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/scraped_posts`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        post_id: currentData.post_id,
        url: currentData.url,
        content: currentData.content,
        image_urls: currentData.image_urls,
        is_read: false,
        is_ignored: false
      })
    });

    if (response.ok) {
      setStatus("Successfully added to Feed!", "success");
    } else {
      const err = await response.json();
      throw new Error(err.message || 'Failed to save');
    }
  } catch (err) {
    setStatus(`Error: ${err.message}`, "error");
    sendBtn.disabled = false;
  }
});
