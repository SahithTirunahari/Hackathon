# 🏛️ PolicyImpact AI

**Governance Track — Claude Social Impact Hackathon 2025**

Predict the multi-dimensional impact of policy decisions across economic, social, environmental, political & technological dimensions over 1, 5, and 10 year horizons 

---

## 🚀 Quick Setup (3 steps)

### Step 1: Install dependencies

```bash
cd policy-impact-ai
npm install
```

### Step 2: Set your Claude API key

Get your API key from [console.anthropic.com](https://console.anthropic.com)

**Option A** — Environment variable (recommended):
```bash
CLAUDE_API_KEY=API_KEY node server.js
```

**Option B** — Edit `server.js` directly:
Open `server.js` and replace `YOUR_API_KEY_HERE` with your key.

### Step 3: Open in browser

```
http://localhost:3001
```

That's it! Click an example policy or enter your own, then hit "Analyze Policy Impact".

---

## 📁 Project Structure

```
policy-impact-ai/
├── server.js          # Express backend (proxies to Claude API)
├── package.json       # Dependencies
├── public/
│   └── index.html     # Complete frontend (single file, no build needed)
└── README.md
```

---

## 🧠 How It Works

1. User enters a policy proposal (title, description, sector, region)
2. Backend sends a structured prompt to Claude API
3. Claude analyzes the policy across 5 dimensions × 3 time horizons
4. Frontend displays animated scores, trends, risks & opportunities

### Five Analysis Dimensions
- 📊 **Economic** — GDP, employment, trade, inflation, business impact
- 👥 **Social** — Equity, health, education, community effects
- 🌍 **Environmental** — Climate, pollution, resources, sustainability
- 🏛️ **Political** — Governance, democracy, stability, public trust
- ⚡ **Technological** — Innovation, digital infrastructure, R&D

### Three Time Horizons
- **1 Year** — Implementation friction, immediate effects
- **5 Years** — Institutional adaptation, second-order effects
- **10 Years** — Structural transformation, compounding impacts

---

## 🏆 Hackathon Alignment

| Criteria | How We Address It |
|----------|-------------------|
| **Impact (25pts)** | Solves real governance problem — helps policymakers & citizens preview consequences |
| **Technical (30pts)** | Claude API integration with structured multi-dimensional analysis |
| **Ethics (25pts)** | Built-in ethical notice, empowers humans, transparent about AI limitations |
| **Presentation (20pts)** | Polished UI, animated visualizations, clear data presentation |

---



