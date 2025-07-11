import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import './styles.css';

const POPUP_WIDTH      = 620; //   popup width from popup.html
const INNER_MAX_WIDTH  = 560;
/* Promote "### Achievements/Experience" → **Achievements/Experience** */
const format = (s) =>
  (s || '').replace(
    /###\s*(Achievements\/Experience|Icebreaker Questions)/g,
    (_, h) => `**${h}**`,
  );

function PopupApp() {
  /* ───────── state & refs ───────── */
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const [result, setResult]     = useState('');
  const [error,  setError]      = useState('');
  const [profile, setProfile]   = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(false);
  const [summarySource, setSummarySource] = useState(''); // 'cached' or 'fresh'

  const rootRef = useRef(null);
  const boxRef  = useRef(null);
  const chatInputRef = useRef(null);

  const [w, setW] = useState(360);
  const [h, setH] = useState(100);

  /* ───────── dynamic width ───────── */
  useLayoutEffect(() => {
    const measure = () => {
      if (!rootRef.current) return;
      const root  = rootRef.current;
      const prev  = root.style.width;
      root.style.width = 'auto';
      const natural = root.scrollWidth;
      root.style.width = prev;
      const maxPopup   = Math.min(800, window.innerWidth - 4);
      setW(Math.min(natural, maxPopup));
    };
    measure();
    const ro = new ResizeObserver(measure);
    [rootRef, boxRef].forEach((r) => r.current && ro.observe(r.current));
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [open, result, chatMessages]);

  /* ───────── dynamic height ───────── */
  useEffect(() => {
    if (open && boxRef.current) {
      const chatHeight = chatMessages.length > 0 ? 200 : 60;
      setH(Math.min(boxRef.current.scrollHeight + 90 + chatHeight, 600));
    } else {
      setH(100);
    }
  }, [open, result, chatMessages]);

  /* ───────── auto-load cached summary on mount ───────── */
  useEffect(() => {
    setOpen(true);
    setLoading(true);
    setResult('');
    setError('');
    
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      const tabUrl = tab.url.split('?')[0]; // unique per profile
      const cacheKey = 'summary:' + tabUrl;
      
      // First, try to get cached summary
      const cachedData = await chrome.storage.local.get(cacheKey);
      const cachedSummary = cachedData[cacheKey];
      
      if (cachedSummary && Date.now() - cachedSummary.ts < 1000 * 60 * 30) { // 30 min TTL
        // Use cached summary
        setResult(format(cachedSummary.li.summary || ''));
        setLoading(false);
        setSummarySource('cached');
        
        // Still get the profile for chat functionality
        chrome.tabs.sendMessage(tab.id, { action: 'scrapeProfile' }, (p) => {
          if (p?.success) {
            setProfile(p);
          }
        });
        return;
      }
      
      // If no cached summary, show background generation message
      setResult('Generating summary...');
      setLoading(false);
      setSummarySource('generating');
      
      // Still get the profile for chat functionality
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeProfile' }, (p) => {
        if (p?.success) {
          setProfile(p);
        }
      });
      
      // Check for cached summary every 2 seconds
      const checkInterval = setInterval(async () => {
        const cachedData = await chrome.storage.local.get(cacheKey);
        const cachedSummary = cachedData[cacheKey];
        
        if (cachedSummary && Date.now() - cachedSummary.ts < 1000 * 60 * 30) {
          setResult(format(cachedSummary.li.summary || ''));
          setSummarySource('cached');
          clearInterval(checkInterval);
        }
      }, 2000);
      
      // Stop checking after 30 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (summarySource === 'generating') {
          setResult('Summary generation is taking longer than expected. Try refreshing.');
          setSummarySource('');
        }
      }, 30000);
    });
  }, []);

  /* ───────── chat functionality ───────── */
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !profile) return;

    const question = chatInput.trim();
    setChatInput('');
    setChatLoading(true);

    // Add user message
    const userMessage = { type: 'user', content: question };
    setChatMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('http://localhost:3001/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, question, useWebSearch }),
      });
      const data = await response.json();
      
      if (data.error) {
        setChatMessages(prev => [...prev, { type: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
      } else {
        setChatMessages(prev => [...prev, { type: 'assistant', content: data.answer }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { type: 'assistant', content: 'Sorry, I cannot connect to the server right now.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  /* ───────── summary functionality ───────── */
  const fetchSummary = async (p, useWeb = false) => {
    setError('');
    setLoading(true);

    // Try to get cached summary first
    chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
      const tabUrl = tab.url.split('?')[0];
      const cacheKey = 'summary:' + tabUrl;
      const cachedData = await chrome.storage.local.get(cacheKey);
      const cachedSummary = cachedData[cacheKey];
      
      if (cachedSummary && Date.now() - cachedSummary.ts < 1000 * 60 * 30) {
        // Use cached summary
        const summaryData = useWeb ? cachedSummary.web : cachedSummary.li;
        setResult(format(summaryData.summary || ''));
        setLoading(false);
        setSummarySource('cached');
        return;
      }
      
      // If no cached summary, fetch from backend
      const endpoint = useWeb
        ? 'http://localhost:3001/web-summarize'
        : 'http://localhost:3001/summarize';

      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: p })
        });
        const { summary, error } = await r.json();
        setResult(format(summary || ''));
        if (error) setError(error);
        setSummarySource('fresh');
      } catch {
        setError('Backend unreachable.');
      } finally {
        setLoading(false);
      }
    });
  };

  /* ───────── render helpers ───────── */
  const render = (txt) => {
    const lines = txt.split('\n');
    const elements = [];
    let bullets = [];
    let currentSection = null;
    const flushBullets = (key) => {
      if (!bullets.length) return;
      if (currentSection === 'Icebreaker Questions') {
        elements.push(
          <ol key={`ol-${key}`} className="icebreaker-list">
            {bullets.map((b, j) => (
              <li key={j} className="list-item">{b}</li>
            ))}
          </ol>
        );
      } else if (currentSection === 'Achievements/Experience') {
        elements.push(
          <ul key={`ul-${key}`} className="achievements-list">
            {bullets.map((b, j) => (
              <li key={j} className="list-item">{b}</li>
            ))}
          </ul>
        );
      } else {
        // fallback
        elements.push(
          <ul key={`ul-${key}`} className="achievements-list">
            {bullets.map((b, j) => (
              <li key={j} className="list-item">{b}</li>
            ))}
          </ul>
        );
      }
      bullets = [];
    };
    lines.forEach((ln, i) => {
      const headerMatch = ln.match(/^\*\*(.+)\*\*$/);
      if (headerMatch) {
        flushBullets(i);
        currentSection = headerMatch[1].trim();
        elements.push(
          <div key={i} className="section-header">
            {currentSection}
          </div>
        );
      } else if (/^- /.test(ln)) {
        bullets.push(ln.replace(/^- /, ''));
      } else if (ln.trim() === '') {
        // skip empty lines
      } else {
        flushBullets(i);
        elements.push(<div key={i}>{ln}</div>);
      }
    });
    flushBullets('last');
    return elements;
  };

  /* ───────── JSX ───────── */
  return (
    <div ref={rootRef} className="popup-container">
      {/* summary box */}
      <div ref={boxRef} className="summary-box">
        {loading ? (
          <div className="loading-text">Loading…</div>
        ) : error ? (
          <div className="error-text">{error}</div>
        ) : (
          render(result)
        )}
      </div>

      {/* control row */}
      <div className="control-row">
        {/* Remove the Refresh LinkedIn Summary button */}
        <button
          onClick={() => fetchSummary(profile, true)}
          disabled={!profile || loading}
          className="btn"
        >
          Web Summary
        </button>
      </div>

      {/* chat section */}
      <div className="chat-section">
        <form onSubmit={handleChatSubmit} className="chat-form">
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={profile ? `Ask about ${profile.name}...` : 'Profile not loaded yet'}
                disabled={chatLoading || !profile}
                className="chat-input"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (chatInput.trim() && !chatLoading && profile) handleChatSubmit(e);
                  }
                }}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || chatLoading || !profile}
                className="chat-submit-btn"
                tabIndex={-1}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="12" fill="none"/>
                  <path d="M12 6v12M12 6l-5 5M12 6l5 5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <label className="web-search-label">
              <input
                type="checkbox"
                checked={useWebSearch}
                onChange={(e) => setUseWebSearch(e.target.checked)}
                disabled={chatLoading || !profile}
                className="web-search-checkbox"
              />
              Web Search
            </label>
          </div>
          {/* Removed the old Ask button */}
        </form>
        {/* Answer or loading below the Ask button */}
        <div className="chat-messages-container">
          {chatLoading && (
            <div className="chat-loading">
              Loading…
            </div>
          )}
          {!chatLoading && chatMessages.length > 0 && (
            <div className="chat-message">
              {chatMessages[chatMessages.length - 1].content}
            </div>
          )}
        </div>
        {!profile && (
          <div className="profile-not-loaded">
            Profile not loaded yet. Chat will be enabled once profile data is available.
          </div>
        )}
      </div>
    </div>
  );
}

export default PopupApp;
