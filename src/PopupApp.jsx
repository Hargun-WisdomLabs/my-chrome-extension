import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';

const POPUP_WIDTH      = 620; //   popup width from popup.html
const INNER_MAX_WIDTH  = 560;
/* Promote “### Achievements/Experience” → **Achievements/Experience** */
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

  const rootRef = useRef(null);
  const boxRef  = useRef(null);

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
  }, [open, result]);

  /* ───────── dynamic height ───────── */
  useEffect(() => {
    if (open && boxRef.current)
      setH(Math.min(boxRef.current.scrollHeight + 90, 600));
    else
      setH(100);
  }, [open, result]);

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
    </div>
  );
}

export default PopupApp;
