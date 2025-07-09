# LinkedIn Profile Summarizer - Standalone Version

This is a standalone version of the LinkedIn Profile Summarizer Chrome extension that works without requiring a backend server. It makes direct API calls to OpenAI from the browser.

## Features

- **No Backend Required**: Works entirely in the browser
- **Direct OpenAI Integration**: Makes API calls directly to OpenAI
- **Profile Scraping**: Extracts LinkedIn profile data
- **AI Summarization**: Generates icebreaker questions and achievement summaries
- **Chat Interface**: Ask questions about the profile
- **Secure**: API key is stored only in session storage (cleared when browser closes)

## Setup Instructions

### 1. Load the Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the folder containing this extension

### 2. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### 3. Use the Extension

1. Navigate to any LinkedIn profile page
2. Click the extension icon in your browser toolbar
3. Enter your OpenAI API key when prompted
4. The extension will automatically scrape and summarize the profile
5. Use the chat interface to ask questions about the profile

## Files Included

- `standalone-manifest.json` - Extension manifest (no backend permissions)
- `standalone-popup.html` - Popup HTML file
- `src/standalone-popup.dist.js` - Built JavaScript bundle
- `src/content.js` - LinkedIn profile scraper
- `src/background.js` - Extension background script
- `icons/` - Extension icons

## Security Notes

- Your OpenAI API key is stored only in session storage
- The key is automatically cleared when you close the browser
- API calls are made directly to OpenAI's servers
- No data is stored on any third-party servers

## Troubleshooting

- **"Profile not loaded"**: Make sure you're on a LinkedIn profile page
- **"OpenAI API error"**: Check that your API key is valid and has sufficient credits
- **Extension not working**: Try refreshing the LinkedIn page and clicking the extension again

## API Usage

The extension uses OpenAI's GPT-4 model for:
- Profile summarization (generates icebreaker questions and achievements)
- Chat responses (answers questions about the profile)

Each API call costs approximately $0.01-0.03 depending on the length of the profile and questions.

## Sharing

To share this extension with others:
1. Zip all the files in this folder
2. Send the zip file
3. Recipients follow the "Load the Extension" steps above
4. Each person needs their own OpenAI API key 