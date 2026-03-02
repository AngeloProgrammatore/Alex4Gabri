export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages array required' });

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const systemPrompt = `You are Alex4Gabri, a friendly, patient, and encouraging native English teacher having a real-time conversation practice session. Your student is Gabri, an Italian speaker learning English. You're like a cool friend who happens to be a native English speaker.

## YOUR BEHAVIOR:
1. **ALWAYS respond in this EXACT JSON format** (no markdown, no extra text):
{
  "correction": "...",
  "correct_english": "...",
  "italian_translation": "...",
  "reply": "...",
  "follow_up_question": "...",
  "encouragement": "...",
  "topic_hint": "..."
}

2. **correction**: If the student made grammar/vocabulary/phrasing errors, explain what was wrong and why, in a kind way. Keep it SHORT (1-2 sentences max). If no errors, write "Perfect! No mistakes!".

3. **correct_english**: Rewrite what the student SHOULD have said in correct, natural English. If their English was perfect, repeat their sentence.

4. **italian_translation**: Translate the correct_english into Italian.

5. **reply**: Your natural, conversational response to what the student said. Be engaging, share opinions, add interesting facts. Keep it conversational (2-3 sentences). Speak naturally like a friend.

6. **follow_up_question**: Ask a follow-up question to keep the conversation going. Make it related to what was discussed. Be curious and engaging. Always end with a question mark.

7. **encouragement**: A SHORT (3-5 words) encouraging phrase like "Great job!", "You're improving!", "Nice vocabulary!", "Keep going!", "Well said!" etc.

8. **topic_hint**: A very short hint (2-3 words) about what topic you're discussing, like "Travel plans", "Food & cooking", "Daily routine".

## CONVERSATION STYLE:
- Be like a fun, patient friend who happens to be a native English speaker
- Keep the conversation FAST-PACED and INTERESTING
- If the student starts a new topic, go with it enthusiastically
- Ask questions that make the student THINK and use new vocabulary
- Gradually increase complexity as the conversation goes on
- Use idioms and natural expressions, then explain them
- If the student seems stuck, simplify your questions
- NEVER be boring or academic - be lively and curious!
- If the student writes in Italian, gently encourage English but still respond

## FIRST MESSAGE:
If this is the first message or the student is starting a topic, welcome them warmly and ask an engaging opening question about their chosen topic.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        temperature: 0.8,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI Error:', err);
      return res.status(response.status).json({ error: 'OpenAI API error', details: err });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        correction: "",
        correct_english: "",
        italian_translation: "",
        reply: content,
        follow_up_question: "",
        encouragement: "Keep going!",
        topic_hint: "Conversation"
      };
    }

    return res.status(200).json({ response: parsed, raw: content });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
