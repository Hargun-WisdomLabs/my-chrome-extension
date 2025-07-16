import React from 'react';
import { createRoot } from 'react-dom/client';
import PopupApp from './PopupApp';

const root = createRoot(document.getElementById('root'));
root.render(<PopupApp />);

/**
 * When the user clicks the button:
 *   1. Ask content.js for the scraped profile.
 *   2. POST it to https://my-chrome-extension.onrender.com/summarize.
 *   3. Show the summary or error.
 */
document.getElementById('btn').addEventListener('click', () => {
  const out = document.getElementById('res');
  out.textContent = 'Scraping profile…';

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.tabs.sendMessage(tab.id, { action: 'scrapeProfile' }, async (profile) => {
      if (!profile?.success) {
        out.textContent = profile?.error || 'Could not scrape this page.';
        return;
      }

      out.textContent = 'Summarizing…';
      try {
        const r = await fetch('https://my-chrome-extension.onrender.com/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile)
        });
        const { summary, error } = await r.json();
        out.textContent = summary || error || 'No summary returned.';
      } catch (e) {
        out.textContent = 'Backend unreachable – is the server running?';
      }
    });
  });
});
