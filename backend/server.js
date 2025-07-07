import express from 'express';
import cors    from 'cors';
import dotenv  from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app  = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post('/summarize', async (req, res) => {
  const profile = req.body;
  if (!profile || profile.success === false) {
    return res.status(400).json({ error: 'Bad profile payload.' });
  }

  const prompt = `You are a helpful assistant that turns raw LinkedIn data
into a terse sales briefing.

Data:
${JSON.stringify(profile, null, 2)}

Return exactly:
- 3 bullet icebreaker questions
- 5 bullet achievements/experince 
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    });

    res.json({ summary: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI call failed.' });
  }
});

app.post('/chat', async (req, res) => {
  const { profile, question } = req.body;
  if (!profile || profile.success === false || !question) {
    return res.status(400).json({ error: 'Bad request payload.' });
  }

  const prompt = `You are a helpful assistant answering questions about a LinkedIn profile.

Profile Data:
${JSON.stringify(profile, null, 2)}

Question: ${question}

Please answer the question based on the profile data provided. Be conversational and helpful. If the information isn't available in the profile data, say so politely.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500
    });

    res.json({ answer: completion.choices[0].message.content.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OpenAI call failed.' });
  }
});

app.listen(port, () =>
  console.log(`✅ Backend listening on http://localhost:${port}`)
);
