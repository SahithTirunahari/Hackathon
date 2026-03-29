const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// PUT YOUR CLAUDE API KEY HERE
// Get it from: https://console.anthropic.com
// ============================================
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || 'YOUR_API_KEY_HERE';

const DATA_FILE = path.join(__dirname, 'policies.json');

// ── Helper: read/write policies from disk ──
function readPolicies() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) { console.error('Read error:', e.message); }
  return [];
}
function writePolicies(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── Helper: call Claude API ──
async function callClaude(prompt, maxTokens = 4000) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API ${response.status}: ${errText.substring(0, 200)}`);
  }
  const data = await response.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('');
}

// ══════════════════════════════════════════════
// ROUTE 1: Analyze policy (EXISTING — unchanged)
// ══════════════════════════════════════════════
app.post('/api/analyze', async (req, res) => {
  if (CLAUDE_API_KEY === 'YOUR_API_KEY_HERE') {
    return res.status(400).json({ error: 'API key not configured.' });
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
Be specific — cite actual examples.

Return ONLY valid JSON (no markdown, no backticks):
{
  "horizons": {
    "1_year": {
      "summary": "2-3 sentence overview",
      "overallScore": 65,
      "dimensions": {
        "economic": {"score": 45, "trend": "negative", "detail": "..."},
        "social": {"score": 70, "trend": "positive", "detail": "..."},
        "environmental": {"score": 55, "trend": "positive", "detail": "..."},
        "political": {"score": 40, "trend": "negative", "detail": "..."},
        "technological": {"score": 60, "trend": "positive", "detail": "..."}
      },
      "risks": ["risk1", "risk2", "risk3"],
      "opportunities": ["opp1", "opp2", "opp3"]
    },
    "5_year": { "...same..." },
    "10_year": { "...same..." }
  }
}

Rules: Scores 0-100 (50=neutral). trend: "positive"/"negative"/"neutral". Be specific. ONLY output JSON.`;

    console.log(`[ANALYZE] "${policy.title}"`);
    const text = await callClaude(prompt);
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Could not parse analysis', raw: text });
    const analysis = JSON.parse(match[0]);
    console.log(`[ANALYZE] Done: "${policy.title}"`);
    res.json({ analysis, source: 'claude-api' });
  } catch (err) {
    console.error('Analyze error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// ROUTE 2: Summarize comments (NEW)
// ══════════════════════════════════════════════
app.post('/api/summarize', async (req, res) => {
  if (CLAUDE_API_KEY === 'YOUR_API_KEY_HERE') {
    return res.status(400).json({ error: 'API key not configured.' });
  }
  try {
    const { policy, comments } = req.body;
    const commentList = comments.map((c, i) =>
      `${i + 1}. [${c.sentiment.toUpperCase()}] "${c.text}" — ${c.author}`
    ).join('\n');

    const prompt = `You are a public policy analyst. Generate a professional Public Sentiment Report for this policy.

Policy: "${policy.title}"
Description: ${policy.description}
Region: ${policy.region || "Global"}

${comments.length} public comments received:
${commentList}

Write a structured report with these sections:
1. EXECUTIVE SUMMARY (2-3 sentences)
2. SENTIMENT BREAKDOWN (count and % of support/oppose/neutral)
3. KEY THEMES (top 3-5 recurring themes with how many comments mention each)
4. REPRESENTATIVE VOICES (1 quote from each sentiment group)
5. RECOMMENDATIONS FOR POLICYMAKER (3 actionable items based on public feedback)
6. OVERALL ASSESSMENT (1 paragraph)

Return ONLY valid JSON:
{
  "executiveSummary": "...",
  "sentimentBreakdown": { "support": 5, "oppose": 3, "neutral": 2, "supportPct": 50, "opposePct": 30, "neutralPct": 20 },
  "keyThemes": [{"theme": "...", "count": 3, "description": "..."}],
  "representativeVoices": {"support": "...", "oppose": "...", "neutral": "..."},
  "recommendations": ["...", "...", "..."],
  "overallAssessment": "..."
}`;

    console.log(`[SUMMARIZE] ${comments.length} comments for "${policy.title}"`);
    const text = await callClaude(prompt, 2000);
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Could not parse summary', raw: text });
    const summary = JSON.parse(match[0]);
    console.log(`[SUMMARIZE] Done`);
    res.json({ summary, source: 'claude-api' });
  } catch (err) {
    console.error('Summarize error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// ROUTE 3-6: CRUD for policies (NEW)
// ══════════════════════════════════════════════

// GET all policies
app.get('/api/policies', (req, res) => {
  res.json(readPolicies());
});

// POST create new policy
app.post('/api/policies', (req, res) => {
  const policies = readPolicies();
  const newPolicy = {
    id: `pol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...req.body,
    votes: { up: 0, down: 0 },
    comments: [],
    summary: null,
    status: req.body.status || 'draft',
    createdAt: Date.now(),
    publishedAt: null,
    implementedAt: null,
  };
  policies.unshift(newPolicy);
  writePolicies(policies);
  console.log(`[CREATE] "${newPolicy.title}" (${newPolicy.id})`);
  res.json(newPolicy);
});

// PUT update policy (vote, comment, status change)
app.put('/api/policies/:id', (req, res) => {
  const policies = readPolicies();
  const idx = policies.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Policy not found' });
  policies[idx] = { ...policies[idx], ...req.body };
  writePolicies(policies);
  res.json(policies[idx]);
});

// POST add comment to policy
app.post('/api/policies/:id/comments', (req, res) => {
  const policies = readPolicies();
  const idx = policies.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Policy not found' });
  const comment = {
    id: `c_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    text: req.body.text,
    sentiment: req.body.sentiment || 'neutral',
    author: req.body.author || 'Citizen',
    role: req.body.role || 'citizen',
    replyTo: req.body.replyTo || null,
    createdAt: Date.now(),
  };
  policies[idx].comments.push(comment);
  writePolicies(policies);
  console.log(`[COMMENT] ${comment.role} on "${policies[idx].title}" ${comment.replyTo ? '(reply)' : ''}`);
  res.json(comment);
});

// POST vote on policy — each click = +1, no toggle restriction
app.post('/api/policies/:id/vote', (req, res) => {
  const policies = readPolicies();
  const idx = policies.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Policy not found' });
  const { direction } = req.body;
  if (direction === 'up') policies[idx].votes.up++;
  else if (direction === 'down') policies[idx].votes.down++;
  writePolicies(policies);
  res.json(policies[idx].votes);
});

// POST verify publisher code
app.post('/api/auth/verify', (req, res) => {
  const PUBLISHER_CODE = process.env.PUBLISHER_CODE || 'policy2025';
  const { code } = req.body;
  console.log(`[AUTH] Attempt with code: "${code}" (expected: "${PUBLISHER_CODE}")`);
  if (code && code.trim() === PUBLISHER_CODE.trim()) {
    console.log('[AUTH] ✅ Verified as publisher');
    res.json({ valid: true, role: 'publisher' });
  } else {
    console.log('[AUTH] ❌ Invalid code');
    res.json({ valid: false, error: 'Invalid publisher code' });
  }
});

// ══════════════════════════════════════════════
// ROUTE: What-If Scenario Simulator
// ══════════════════════════════════════════════
app.post('/api/policies/:id/whatif', async (req, res) => {
  if (CLAUDE_API_KEY === 'YOUR_API_KEY_HERE') {
    return res.status(400).json({ error: 'API key not configured.' });
  }
  const policies = readPolicies();
  const idx = policies.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Policy not found' });
  const p = policies[idx];
  const { modification } = req.body;

  const origPred = p.analysis?.horizons?.['1_year'];
  const origDims = origPred?.dimensions || {};
  const origSummary = Object.entries(origDims).map(([k,v]) =>
    `${k}: ${v.score}/100 (${v.trend}) — "${v.detail}"`
  ).join('\n');

  const prompt = `You are PolicyImpact AI. A citizen has proposed a modification to an existing policy. Compare the ORIGINAL policy impact vs the MODIFIED version.

ORIGINAL POLICY: "${p.title}"
Description: ${p.description}
Sector: ${p.sector || "General"}
Region: ${p.region || "Global"}

ORIGINAL 1-YEAR PREDICTIONS:
${origSummary}

PROPOSED MODIFICATION:
"${modification}"

Analyze how this modification would change the 1-year impact across all 5 dimensions. For each dimension, show the original score, the new predicted score, and explain what changed and why.

Return ONLY valid JSON:
{
  "modifiedTitle": "Brief title for the modified version",
  "summary": "2-3 sentence overview of how this modification changes outcomes",
  "dimensions": {
    "economic": {"original": ${origDims.economic?.score||50}, "modified": 55, "change": "+5", "explanation": "The modification would..."},
    "social": {"original": ${origDims.social?.score||50}, "modified": 60, "change": "+10", "explanation": "..."},
    "environmental": {"original": ${origDims.environmental?.score||50}, "modified": 45, "change": "-5", "explanation": "..."},
    "political": {"original": ${origDims.political?.score||50}, "modified": 50, "change": "0", "explanation": "..."},
    "technological": {"original": ${origDims.technological?.score||50}, "modified": 58, "change": "+8", "explanation": "..."}
  },
  "tradeoffs": ["Key tradeoff 1 introduced by this modification", "Tradeoff 2"],
  "recommendation": "Would you recommend this modification? Why or why not — 1-2 sentences"
}`;

  try {
    console.log(`[WHAT-IF] "${modification.substring(0,60)}..." for "${p.title}"`);
    const text = await callClaude(prompt, 2000);
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Parse failed' });
    const result = JSON.parse(match[0]);

    // Save scenario to policy
    if (!policies[idx].scenarios) policies[idx].scenarios = [];
    policies[idx].scenarios.push({
      id: `wf_${Date.now()}`,
      modification,
      result,
      author: req.body.author || 'Citizen',
      role: req.body.role || 'citizen',
      createdAt: Date.now()
    });
    writePolicies(policies);

    console.log(`[WHAT-IF] Done`);
    res.json({ result });
  } catch (err) {
    console.error('What-if error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ──
if (CLAUDE_API_KEY === 'YOUR_API_KEY_HERE') {
  console.log('\n⚠️  WARNING: No API key set!');
  console.log('   Run: CLAUDE_API_KEY=sk-ant-... node server.js\n');
}

const PORT = process.env.PORT || 3001;
const PUBLISHER_CODE = process.env.PUBLISHER_CODE || 'policy2025';
app.listen(PORT, () => {
  console.log(`\n🏛️  PolicyImpact AI v2 running on http://localhost:${PORT}`);
  console.log(`   API Key: ${CLAUDE_API_KEY === 'YOUR_API_KEY_HERE' ? '❌ NOT SET' : '✅ Configured'}`);
  console.log(`   Publisher Code: ${PUBLISHER_CODE}`);
  console.log(`   Policies stored in: ${DATA_FILE}\n`);
});
