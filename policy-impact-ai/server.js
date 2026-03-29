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

function parseClaudeJson(text) {
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse JSON from model response');
  return JSON.parse(match[0]);
}

// ── Helper: call Claude API ──
async function callClaude(prompt, maxTokens = 4000, system = null) {
  const body = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }]
  };
  if (system) body.system = system;
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
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
    let analysis;
    try {
      analysis = parseClaudeJson(text);
    } catch (e) {
      return res.status(500).json({ error: 'Could not parse analysis', raw: text });
    }
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
    let summary;
    try {
      summary = parseClaudeJson(text);
    } catch (e) {
      return res.status(500).json({ error: 'Could not parse summary', raw: text });
    }
    console.log(`[SUMMARIZE] Done`);
    res.json({ summary, source: 'claude-api' });
  } catch (err) {
    console.error('Summarize error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════
// ROUTE: Implementation roadmap (structured + UI-ready)
// ══════════════════════════════════════════════
app.post('/api/roadmap', async (req, res) => {
  if (CLAUDE_API_KEY === 'YOUR_API_KEY_HERE') {
    return res.status(400).json({ error: 'API key not configured.' });
  }
  try {
    const { policy, analysis } = req.body;
    const ctx = analysis
      ? `\nExisting AI impact summary (align phases with these risks/opportunities):\n${JSON.stringify(analysis.horizons || {}, null, 0).slice(0, 3500)}`
      : '';

    const system = `You output only valid JSON for a policy implementation roadmap. No markdown fences. Phases must have stable unique "id" strings (e.g. phase_1, phase_2). "dependencies" lists ids of prior phases that must complete first — use [] for the first phase(s).`;

    const prompt = `Design a realistic, phased implementation roadmap for this policy.

Policy title: "${policy.title}"
Description: ${policy.description}
Sector: ${policy.sector || 'General'}
Region: ${policy.region || 'Global'}
${ctx}

Return ONLY valid JSON with this exact shape:
{
  "overview": "One compelling sentence on rollout strategy.",
  "totalHorizonLabel": "e.g. 18–36 months",
  "phases": [
    {
      "id": "phase_1",
      "order": 1,
      "title": "Short title",
      "windowLabel": "e.g. Months 0–6",
      "summary": "One-line purpose",
      "detail": "2–4 sentences: concrete actions, governance, and what could go wrong.",
      "milestones": ["Verifiable milestone 1", "Milestone 2", "Milestone 3"],
      "dependencies": [],
      "actors": ["Agency or group 1", "Stakeholder 2"],
      "riskLevel": "low",
      "checkpoint": "Objective signal that this phase is complete"
    }
  ],
  "criticalPath": ["phase_1", "phase_2"],
  "successMetrics": ["Measurable outcome 1", "Outcome 2"]
}

Rules: 4–7 phases in logical order. riskLevel must be "low", "medium", or "high". criticalPath must name phase ids that are rate-limiting. Be specific to this policy and region. ONLY output JSON.`;

    console.log(`[ROADMAP] "${policy.title}"`);
    const text = await callClaude(prompt, 5000, system);
    const roadmap = parseClaudeJson(text);
    if (!roadmap.phases || !Array.isArray(roadmap.phases)) {
      return res.status(500).json({ error: 'Invalid roadmap structure', raw: text });
    }
    console.log(`[ROADMAP] Done (${roadmap.phases.length} phases)`);
    res.json({ roadmap, source: 'claude-api' });
  } catch (err) {
    console.error('Roadmap error:', err.message);
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
    console.log('[AUTH]  Verified as publisher');
    res.json({ valid: true, role: 'publisher' });
  } else {
    console.log('[AUTH]  Invalid code');
    res.json({ valid: false, error: 'Invalid publisher code' });
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
