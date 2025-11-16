const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not set');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!genAI) {
    res.status(500).json({ error: 'Gemini API key not configured' });
    return;
  }

  try {
    const { prompt, message } = req.body;

    if (!prompt && !message) {
      res.status(400).json({ error: 'prompt or message is required' });
      return;
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(prompt || message);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({
      success: true,
      response: text,
      model: 'gemini-pro'
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      details: error.message
    });
  }
};
