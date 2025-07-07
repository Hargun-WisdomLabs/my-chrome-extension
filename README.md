This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# LinkedIn Profile Summarizer Chrome Extension

## Features
- Scrapes LinkedIn profile data (education, experience, patents, activities, etc.)
- Sends data to a local Node.js backend
- Backend uses OpenAI API to summarize and generate icebreaker questions
- Results are shown in the extension popup

## Setup

### 1. Backend (Node.js)
1. Go to the `backend` directory:
   ```sh
   cd backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Add your OpenAI API key to `.env`:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Start the backend server:
   ```sh
   node server.js
   ```
   The backend will run on `http://localhost:3001`.

### 2. Chrome Extension
1. In Chrome, go to `chrome://extensions` and enable Developer Mode.
2. Click "Load unpacked" and select the root directory of this project.
3. Make sure you are on a LinkedIn profile page (URL like `https://www.linkedin.com/in/...`).
4. Click the extension icon and press the button to scrape and summarize the profile.

## Notes
- The backend must be running locally for the extension to work.
- The extension only works on LinkedIn profile pages.
- For best results, use a valid OpenAI API key with GPT-4 access.
