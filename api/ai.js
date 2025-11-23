const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!GEMINI_API_KEY) {
    res.status(500).json({ 
      success: false,
      error: 'Gemini API key not configured' 
    });
    return;
  }

  try {
    const { prompt, message } = req.body;

    if (!prompt && !message) {
      res.status(400).json({ 
        success: false,
        error: 'prompt or message is required' 
      });
      return;
    }

    const contextPath = path.join(__dirname, 'context.txt');
    let systemInstruction = '';
    try {
        systemInstruction = fs.readFileSync(contextPath, 'utf8');
    } catch (e) {
        console.error('Failed to read context.txt:', e);
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction
    });
    
    const result = await model.generateContent(prompt || message);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({
      success: true,
      response: text,
      model: 'gemini-2.5-flash-lite'
    });
  } catch (error) {
    console.error('Gemini API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate response',
      details: error.message
    });
  }
};
