import { Router } from 'express';
import { db } from '../db';
import { getGeminiAI } from '../ai';

const router = Router();

router.post('/ideas', async (req, res) => {
  const { prompt, mood } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });

  try {
    const ai = getGeminiAI();
    const systemPrompt = `You are a warm, sweet, romantic AI Love Assistant for a long-distance relationship app called MuTu.
    The user is feeling a ${mood || 'romantic'} mood today.
    The user's query or draft request is: "${prompt}".

    Please reply with highly creative, caring, and actionable romantic advice, suggestions, or drafts as requested.
    Present your suggestions in direct, clear, beautifully formatted markdown. Keep the response compact and incredibly heartwarming.
    Do NOT include any container ports, telemetry stats, mock console lines, or metadata. Be direct, sweet, and highly supportive!`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt
    });

    res.json({ ideas: response.text });
  } catch (err) {
    console.error('AI Love Ideas generator failure:', err);
    res.status(500).json({ error: 'Failed to consult dynamic love ideas.', ideas: 'The companion had a tiny error dreaming that up. Please retry!' });
  }
});

router.post('/love-assistant', async (req, res) => {
  const { category, promptText } = req.body;
  try {
    const ai = getGeminiAI();
    let promptPrefix = '';

    switch (category) {
      case 'date_night':
        promptPrefix = 'Suggest 3 unique, charming, LDR-friendly date night ideas that couples can do together online (e.g. streaming, shared games, co-cooking). Keep the ideas practical but incredibly intimate, cozy, and heartfelt. ';
        break;
      case 'conversations':
        promptPrefix = 'Generate 3 deep, interesting conversational prompts to help long-distance couples understand each other more intimately and spark warm discussions. ';
        break;
      case 'ldr_games':
        promptPrefix = 'Suggest 3 fun, lighthearted digital games, quizzes, or interactive activities designed specifically to keep LDR couples laughing and feeling present with each other. ';
        break;
      case 'reminders':
        promptPrefix = 'Suggest 3 sweet surprise gestures, online gifts, care Package ideas, or cute reminder messages a lover can send to make their partner feel incredibly special today. ';
        break;
      default:
        promptPrefix = 'Provide warm, encouraging advice and customized coaching ideas for a long-distance couple dealing with distance. ';
    }

    const fullPrompt = `${promptPrefix} ${promptText ? `Additional customization from user: "${promptText}".` : ''} Please present suggestions in a concise, beautifully formatted markdown list. Keep the tone completely human, supportive, and romantic yet down-to-earth. Do NOT use fake telemetry, technical meta, or flowery marketing speak.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: fullPrompt
    });

    res.json({ result: response.text });
  } catch (err) {
    console.error('AI Love Assistant failure:', err);
    res.status(500).json({ error: 'Failed to generate companion insights.' });
  }
});

router.post('/relationship-health', async (req, res) => {
  const { coupleId: bodyCoupleId, userId } = req.body || {};
  let coupleId = bodyCoupleId;
  if (!coupleId && userId) {
    const user = db.users.find(u => u.id === userId);
    if (user) coupleId = user.coupleId;
  }
  if (!coupleId) return res.status(400).json({ error: 'coupleId or userId required' });

  try {
    const messagesCount = db.messages.filter(m => m.coupleId === coupleId).length;
    const memoriesCount = db.memories.filter(m => m.coupleId === coupleId).length;
    const journalCount = db.journalEntries.filter(j => j.coupleId === coupleId).length;
    const answerCount = db.dailyAnswers.filter(a => a.coupleId === coupleId).length;
    const bucketCount = (db.bucketList || []).filter(b => b.coupleId === coupleId && b.completed).length;

    const systemPrompt = `You are an empathetic, world-class relationship mentor specializing in supporting long-distance couples.
    Based on the following active relationship metrics, write a supportive LDR status assessment report:
    - Messages typed: ${messagesCount}
    - Polaroids uploaded: ${memoriesCount}
    - Journal entries: ${journalCount}
    - Daily answers: ${answerCount}
    - Bucket list completed: ${bucketCount}

    Please structure your reply in a cozy, beautiful markdown design containing:
    1. **Love Connection Assessment**: A warm interpretation of these figures.
    2. **Customized LDR Action Plan**: 2 ideas to enrich their connection.
    3. **A Heartfelt Reminder**: Why distance makes connections deeper.`;

    const ai = getGeminiAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt
    });

    res.json({ result: response.text });
  } catch (err) {
    console.error('AI Health failure:', err);
    res.status(500).json({ error: 'Failed to generate health insights.' });
  }
});

export default router;
