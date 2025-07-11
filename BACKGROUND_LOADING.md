# Background Summary Loading

## How It Works

The LinkedIn Profile Summarizer now automatically generates summaries in the background when you visit a LinkedIn profile page. This means the summary is ready instantly when you open the extension popup.

### Process Flow

1. **Page Load**: When you visit a LinkedIn profile, the content script automatically runs
2. **Profile Scraping**: The script scrapes the profile data and sends it to the background script
3. **Background Processing**: The background script fetches both LinkedIn and web summaries from your backend
4. **Caching**: Results are cached for 30 minutes to avoid repeated API calls
5. **Instant Display**: When you open the popup, cached summaries appear immediately

### Visual Indicators

- **⚡ Instant (cached)**: Summary was pre-generated and loaded instantly
- **⏳ Generating in background...**: Summary is being generated, check back in a few seconds
- **🔄 Fresh**: Summary was just generated (fallback when no cache exists)

### Benefits

- **Instant Results**: No waiting when opening the popup
- **Background Processing**: Summaries generate while you browse
- **Smart Caching**: 30-minute cache prevents unnecessary API calls
- **Automatic Refresh**: New profiles automatically trigger fresh summaries

### Technical Details

- Cache key format: `summary:{profile_url}`
- Cache TTL: 30 minutes
- Background script runs on LinkedIn profile pages only
- Popup checks cache every 2 seconds when generating
- Automatic cache clearing when visiting new profiles

## Troubleshooting

If summaries aren't loading automatically:
1. Make sure you're on a LinkedIn profile page
2. Check that the backend server is running on localhost:3001
3. Try refreshing the page to trigger background generation
4. Check browser console for any error messages 