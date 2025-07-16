const CACHE_TTL = 1000 * 60 * 30;      // 30 min
const SUMMARY_KEY_PREFIX = 'summary:'; // storage key namespace

// helper
const cacheKey = (url) => SUMMARY_KEY_PREFIX + url;

chrome.runtime.onMessage.addListener(async (msg, _sender, sendResponse) => {
  if (msg.type !== 'PREFETCH_SUMMARY') return;

  const { profile } = msg.payload;
  const tabUrl = _sender.url.split('?')[0];        // unique per profile

  // if we already have a fresh summary for this URL, skip
  const data = await chrome.storage.local.get(cacheKey(tabUrl));
  if (data[cacheKey(tabUrl)] && Date.now() - data[cacheKey(tabUrl)].ts < CACHE_TTL) {
    return;
  }

  // fire both requests in parallel
  const [li, web] = await Promise.all([
    fetch('https://my-chrome-extension.onrender.com/summarize', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ profile })
    }).then(r => r.json()),

    fetch('https://my-chrome-extension.onrender.com/web-summarize', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ profile })
    }).then(r => r.json())
  ]);

  // store under one object
  await chrome.storage.local.set({
    [cacheKey(tabUrl)]: { ts: Date.now(), li, web }
  });

  // optional: show a badge when ready
  chrome.action.setBadgeText({ text: '✓', tabId: _sender.tab.id });
  setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: _sender.tab.id }), 4000);
});

export {};
