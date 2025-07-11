// src/content.js  — ultra-robust LinkedIn scraper

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrapeProfile') {
    waitAndScrapeProfile().then(profile => sendResponse(profile));
    return true; // Indicate async response
  }
  return false;
});

/* ------------------------------------------------------------------ */
/* Profile collection logic                                           */
/* ------------------------------------------------------------------ */

async function waitAndScrapeProfile(maxWaitMs = 2000, intervalMs = 100) {
  const start = Date.now();
  let name = '';
  while (Date.now() - start < maxWaitMs) {
    // Try several selectors and log them for debugging
    const h1s = Array.from(document.querySelectorAll('h1'));
    const textHeading = document.querySelector('.text-heading-xlarge');
    console.log('DEBUG: All h1s:', h1s.map(el => el.innerText));
    if (textHeading) console.log('DEBUG: .text-heading-xlarge:', textHeading.innerText);

    // Try to get the name
    name = (textHeading && textHeading.innerText.trim()) ||
           (h1s.length > 0 && h1s[0].innerText.trim()) ||
           '';
    if (name) break;
    await new Promise(res => setTimeout(res, intervalMs));
  }
  if (!name) {
    return { success: false, error: 'Could not detect profile name after waiting. Check the console for debug info.' };
  }
  // Now scrape the rest
  return scrapeLinkedInProfile(name);
}

function getText(selector) {
  const el = document.querySelector(selector);
  return el ? el.innerText.trim() : '';
}

function getAllVisibleText() {
  function isVisible(node) {
    return !!(
      node.offsetWidth || node.offsetHeight || node.getClientRects().length
    );
  }
  function getTextNodes(node) {
    let text = '';
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      // Only include visible text nodes
      if (isVisible(node.parentElement)) {
        text += node.textContent.trim() + ' ';
      }
    } else if (node.nodeType === Node.ELEMENT_NODE &&
      !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName) &&
      isVisible(node)
    ) {
      for (const child of node.childNodes) {
        text += getTextNodes(child);
      }
    }
    return text;
  }
  return getTextNodes(document.body).replace(/\s+/g, ' ').trim();
}

function scrapeLinkedInProfile(nameFromWait) {
  const name = nameFromWait || getText('h1.text-heading-xlarge') || getText('.text-heading-xlarge');
  const headline = getText('.text-body-medium.break-words');
  const location = getText('.text-body-small.inline.t-black--light.break-words');

  // Education section (by aria-label)
  let education = [];
  const eduSection = Array.from(document.querySelectorAll('section[aria-label]')).find(sec => sec.getAttribute('aria-label') && sec.getAttribute('aria-label').toLowerCase().includes('education'));
  if (eduSection) {
    education = Array.from(eduSection.querySelectorAll('li')).map(li => li.innerText.trim());
  }

  // Experience section (by aria-label)
  let experience = [];
  const expSection = Array.from(document.querySelectorAll('section[aria-label]')).find(sec => sec.getAttribute('aria-label') && sec.getAttribute('aria-label').toLowerCase().includes('experience'));
  if (expSection) {
    experience = Array.from(expSection.querySelectorAll('li')).map(li => li.innerText.trim());
  }

  // Patents (look for links with 'patent' in text or href)
  const patents = Array.from(document.querySelectorAll('a')).filter(a => a.innerText.toLowerCase().includes('patent') || (a.href && a.href.toLowerCase().includes('patent'))).map(a => a.innerText.trim());

  // Activities (look for links with 'activity' in text or href)
  const activities = Array.from(document.querySelectorAll('a')).filter(a => a.innerText.toLowerCase().includes('activity') || (a.href && a.href.toLowerCase().includes('activity'))).map(a => a.innerText.trim());

  // Add full page visible text
  const fullText = getAllVisibleText();

  return {
    success: true,
    name,
    headline,
    location,
    education,
    experience,
    patents,
    activities,
    fullText
  };
}

/* ------------------------------------------------------------------ */
/* Name-finding helpers                                               */
/* ------------------------------------------------------------------ */

function findName() {
  // ① h1 with test-id (new LinkedIn layout)
  let el = document.querySelector('h1[data-test-id="hero-title"]');
  if (el?.innerText) return clean(el.innerText);

  // ② classic desktop header
  el = document.querySelector('h1.text-heading-xlarge');
  if (el?.innerText) return clean(el.innerText);

  // ③ og:title
  const og = document.querySelector('meta[property="og:title"]')?.content;
  if (og) return clean(og.split('|')[0]);

  // ④ document.title
  if (document.title.includes('|')) return clean(document.title.split('|')[0]);

  // ⑤ very small screens: first span inside hero
  el = document.querySelector('section div span[dir="ltr"]');
  if (el?.innerText) return clean(el.innerText);

  return '';
}

function clean(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ */
/* Build the full profile object                                      */
/* ------------------------------------------------------------------ */

function txt(sel) {
  const el = document.querySelector(sel);
  return el ? clean(el.innerText) : '';
}

function sectionByAria(label) {
  label = label.toLowerCase();
  return Array.from(document.querySelectorAll('section[aria-label]'))
    .find(s => (s.getAttribute('aria-label') || '').toLowerCase().includes(label));
}

function liTexts(section) {
  return section
    ? Array.from(section.querySelectorAll('li'))
        .map(li => clean(li.innerText))
        .filter(Boolean)
    : [];
}

(function () {
  // avoid double-fire when LinkedIn swaps DOM
  if (window.__summariserPrefetched) return;
  window.__summariserPrefetched = true;

  // Clear any existing cache for this URL to ensure fresh data
  const currentUrl = window.location.href.split('?')[0];
  const cacheKey = 'summary:' + currentUrl;
  chrome.storage.local.remove(cacheKey);

  // Wait a bit for the page to load, then scrape and prefetch
  setTimeout(async () => {
    const profile = await waitAndScrapeProfile();
    if (profile.success) {
      chrome.runtime.sendMessage({
        type: 'PREFETCH_SUMMARY',
        payload: { profile }
      });
    }
  }, 1000);
})();
