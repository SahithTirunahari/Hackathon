const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// PUT YOUR CLAUDE API KEY HERE
// Get it from: https://console.anthropic.com
// ============================================
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'YOUR_API_KEY_HERE';

if (CLAUDE_API_KEY === 'YOUR_API_KEY_HERE') {
  console.log('\n⚠️  WARNING: No API key set!');
  console.log('   Set it via: CLAUDE_API_KEY=sk-ant-... node server.js');
  console.log('   Or edit server.js and replace YOUR_API_KEY_HERE\n');
}

app.post('/api/analyze', async (req, res) => {
  if (CLAUDE_API_KEY === 'YOUR_API_KEY_HERE') {
    return res.status(400).json({ error: 'API key not configured. Set CLAUDE_API_KEY environment variable.' });
  }

  try {
    const { policy } = req.body;

    const prompt = `You are PolicyImpact AI — an expert policy analyst. Analyze this policy and predict its multi-dimensional impact over 1, 5, and 10 years.

Policy Title: "${policy.title}"
Description: ${policy.description}
Sector: ${policy.sector || "General"}
Region: ${policy.region || "Global"}

For each time horizon (1_year, 5_year, 10_year), assess these 5 dimensions:
- economic (jobs, GDP, trade, inflation, business)
- social (equity, health, education, community)
- environmental (climate, pollution, resources, biodiversity)
- political (governance, democracy, stability, public trust)
- technological (innovation, digital, infrastructure, R&D)

Draw on real historical precedents, academic research, and comparable policies.
Be specific — cite actual examples (e.g., "similar to Finland's 2017 UBI pilot which showed...").

Return ONLY valid JSON (no markdown, no backticks, no explanation before or after):
{
  "horizons": {
    "1_year": {
      "summary": "2-3 sentence overview of first year outlook",
      "overallScore": 65,
      "dimensions": {
        "economic": {"score": 45, "trend": "negative", "detail": "Specific analysis with evidence..."},
        "social": {"score": 70, "trend": "positive", "detail": "..."},
        "environmental": {"score": 55, "trend": "positive", "detail": "..."},
        "political": {"score": 40, "trend": "negative", "detail": "..."},
        "technological": {"score": 60, "trend": "positive", "detail": "..."}
      },
      "risks": ["Specific risk 1", "Specific risk 2", "Specific risk 3"],
      "opportunities": ["Specific opportunity 1", "Specific opportunity 2", "Specific opportunity 3"]
    },
    "5_year": { "...same structure..." },
    "10_year": { "...same structure..." }
  }
}

Rules:
- Scores 0-100 (50=neutral, >50=positive, <50=negative)
- trend must be "positive", "negative", or "neutral"
- Be SPECIFIC and evidence-based, cite real precedents
- Show how impacts COMPOUND over time (not just bigger numbers)
- ONLY output valid JSON`;

    console.log(`[${new Date().toISOString()}] Analyzing: "${policy.title}"`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`API error ${response.status}:`, errText);
      return res.status(response.status).json({ error: `Claude API error: ${response.status}`, details: errText });
    }

    const data = await response.json();
    const text = data.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    // Parse JSON from response
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return res.status(500).json({ error: 'Could not parse analysis', raw: text });
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log(`[${new Date().toISOString()}] Analysis complete for: "${policy.title}"`);
    res.json({ analysis, source: 'claude-api' });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🏛️  PolicyImpact AI Backend running on http://localhost:${PORT}`);
  console.log(`   API Key: ${CLAUDE_API_KEY === 'YOUR_API_KEY_HERE' ? '❌ NOT SET' : '✅ Configured'}\n`);
});
