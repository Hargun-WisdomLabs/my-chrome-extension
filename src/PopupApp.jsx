import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

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

  /* ───────── auto-scrape on mount ───────── */
  useEffect(() => {
    setOpen(true);
    setLoading(true);
    setResult('');
    setError('');
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.tabs.sendMessage(tab.id, { action: 'scrapeProfile' }, async (p) => {
        if (!p?.success) {
          setLoading(false);
          setError(p?.error || 'Switch to a LinkedIn profile then try again.');
          return;
        }
        setProfile(p);
        try {
          const r = await fetch('http://localhost:3001/summarize', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify(p),
          });
          const d = await r.json();
          setLoading(false);
          setResult(format(d.summary || ''));
        } catch {
          setLoading(false);
          setError('Backend unreachable.');
        }
      });
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
        body: JSON.stringify({ profile, question }),
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

  /* ───────── render helpers ───────── */
  const render = (txt) =>
    txt.split('\n').map((ln, i) =>
      /^\*\*(.+)\*\*$/.test(ln) ? (
        <div key={i} style={{ fontWeight: 700, textAlign: 'center', margin: '14px 0 6px' }}>
          {ln.replace(/^\*\*|\*\*$/g, '')}
        </div>
      ) : (
        <div key={i}>{ln}</div>
      )
    );

  /* ───────── JSX ───────── */
  return (
    <div
      ref={rootRef}
      style={{
        width: POPUP_WIDTH,
        minHeight: h,
        maxHeight: 600,
        padding: open ? 24 : 16,
        boxSizing: 'border-box',
        fontFamily: 'Arial, sans-serif',
        transition: 'width .25s ease, height .25s ease',
        overflow: 'hidden',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* summary box */}
      <div
        ref={boxRef}
        style={{
          marginTop: 0,
          padding: 24,
          border: '2px solid #0073b1',
          borderRadius: 14,
          background: '#fff',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxSizing: 'border-box',
          maxWidth: '100%',
          overflowY: 'auto',
          maxHeight: 420,
          fontSize: 17,
          width: '100%',
        }}
      >
        {loading ? (
          <div style={{ color: '#0073b1', fontWeight: 700, fontSize: 22, textAlign: 'center' }}>Loading…</div>
        ) : error ? (
          <div style={{ color: 'red', textAlign: 'center' }}>{error}</div>
        ) : (
          render(result)
        )}
      </div>

      {/* chat section */}
      <div style={{
        width: '100%',
        maxWidth: POPUP_WIDTH,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <form onSubmit={handleChatSubmit} style={{
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: 8,
          gap: 0,
        }}>
          <input
            ref={chatInputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={profile ? `Ask about ${profile.name}...` : 'Profile not loaded yet'}
            disabled={chatLoading || !profile}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #0073b1',
              borderRadius: '14px',
              fontSize: 15,
              outline: 'none',
              color: chatInput ? '#333' : '#999',
              background: !profile ? '#f3f3f3' : '#fff',
              boxSizing: 'border-box',
              marginBottom: 8,
            }}
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || chatLoading || !profile}
            style={{
              width: '100%',
              padding: '12px 24px',
              background: chatInput.trim() && !chatLoading && profile ? '#0073b1' : '#ccc',
              color: '#fff',
              border: '2px solid #0073b1',
              borderRadius: '14px',
              cursor: chatInput.trim() && !chatLoading && profile ? 'pointer' : 'not-allowed',
              fontSize: 15,
              fontWeight: 500,
              height: '48px',
            }}
          >
            Ask
          </button>
        </form>
        {/* Answer or loading below the Ask button */}
        <div style={{ width: '100%', maxWidth: POPUP_WIDTH, marginTop: 12, boxSizing: 'border-box', alignSelf: 'center' }}>
          {chatLoading && (
            <div style={{
              width: '100%',
              maxWidth: '100%',
              padding: '16px',
              border: '2px solid #0073b1',
              borderRadius: 14,
              background: '#f3f3f3',
              color: '#0073b1',
              fontSize: 16,
              fontStyle: 'italic',
              textAlign: 'center',
              boxSizing: 'border-box',
            }}>
              Loading…
            </div>
          )}
          {!chatLoading && chatMessages.length > 0 && (
            <div style={{
              width: '100%',
              maxWidth: '100%',
              padding: '16px',
              border: '2px solid #0073b1',
              borderRadius: 14,
              background: '#fff',
              color: '#333',
              fontSize: 15,
              marginTop: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              boxSizing: 'border-box',
            }}>
              {chatMessages[chatMessages.length - 1].content}
            </div>
          )}
        </div>
        {!profile && (
          <div style={{ color: '#999', fontSize: 13, marginTop: 8, textAlign: 'center', width: '100%' }}>
            Profile not loaded yet. Chat will be enabled once profile data is available.
          </div>
        )}
      </div>
    </div>
  );
}

export default PopupApp;
