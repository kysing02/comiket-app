function scrapeCurrentTweet() {
  // 1. Extract Post ID from URL
  const url = window.location.href;
  const statusMatch = url.match(/\/status\/(\d+)/);
  if (!statusMatch) return null;
  
  const postId = statusMatch[1];
  // Standardize the URL to the main status page
  const tweetUrl = url.split('/photo/')[0].split('?')[0];

  // 2. Extract Text
  // Try multiple selectors as X layout changes frequently
  let text = "";
  const textSelectors = [
    '[data-testid="tweetText"]',
    'article[data-testid="tweet"] [data-testid="tweetText"]',
    'div[dir="auto"]' // Fallback for some views
  ];

  for (const selector of textSelectors) {
    const el = document.querySelector(selector);
    if (el && el.innerText.trim()) {
      text = el.innerText;
      break;
    }
  }

  // 3. Extract Images
  // On /photo/N views, the image is in a modal. In normal view, it's in the article.
  // We collect all media images visible on the page.
  const imageElements = Array.from(document.querySelectorAll('img[src*="pbs.twimg.com/media"]'));
  
  let image_urls = imageElements.map(img => {
    // Standardize to large version
    const base = img.src.split('?')[0];
    return `${base}?format=jpg&name=large`;
  });

  // Remove duplicates
  image_urls = [...new Set(image_urls)];

  // 4. Fallback if no text but images exist (common in media-heavy posts)
  if (!text && image_urls.length === 0) return null;

  return {
    post_id: postId,
    url: tweetUrl,
    content: text,
    image_urls: image_urls
  };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape") {
    try {
      const data = scrapeCurrentTweet();
      sendResponse({ data: data });
    } catch (err) {
      console.error("Scrape error:", err);
      sendResponse({ data: null, error: err.message });
    }
  }
  return true;
});
