<div align="center">
  <h1>🏛️ PolicyImpact AI</h1>
  <p><strong>Predict, Simulate, and Strategize the Future of Public Policy</strong></p>
</div>

<br />

**PolicyImpact AI** is an advanced, AI-powered platform designed for policymakers, urban planners, and citizens to analyze the multi-dimensional impacts of proposed policies over time. Built with the Anthropic Claude API, it transforms static policy proposals into living, interactive simulations that predict outcomes across economic, social, environmental, political, and technological dimensions.

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

## ✨ Key Features

### 🔍 Multi-Dimensional Impact Predictions
Input any proposed policy and generate a comprehensive forecast of its effects at **1-year, 5-year, and 10-year** horizons. The AI predicts specific trends, scores (out of 100), detailed outcomes, risks, and opportunities across five core dimensions:
* 💰 Economic
* 🤝 Social
* 🌱 Environmental
* 🗳️ Political
* 💻 Technological

### 🛣️ AI-Generated Implementation Roadmaps
Automatically generate a phased rollout plan for any policy. The interactive, visual roadmap includes:
* **Interactive Timeline Tracks:** Read phases in order on the left, and click to view deep-dive details on the right.
* **Dependencies & Critical Paths:** Shows what must happen first.
* **Stakeholders & Risk Tracking:** Identifies key actors and categorizes phases by implementation risk.

### 🧪 "What-If" Scenario Simulator
Don't like the predicted outcome? Citizens and policymakers can test alternative versions of a policy (e.g., *"What happens if we add a $1 base fare instead of making it free?"*). The AI instantly simulates the modified scenario, highlights the trade-offs, and provides "Suggested Scenario" alerts if the modification yields a higher net positive impact than the original baseline.

### ⚖️ Side-by-Side Policy Comparison
Policymakers can select two competing policies and use the AI to determine which should be prioritized. Adjust interactive sliders to prioritize certain dimensions (e.g., 80% Environmental, 20% Economic), and the AI will generate a custom recommendation explaining which policy wins under those conditions and why.

### 📊 Public Deliberation & Sentiment Analysis
Citizens can read published policies, vote, and leave comments. When a critical mass of feedback is reached, the AI generates a structured "Public Sentiment Report," summarizing the overall sentiment (Support vs. Oppose), highlighting key themes, and providing actionable recommendations for policymakers.

---

## 🛠️ Tech Stack & Architecture

* **Frontend:** Vanilla HTML, CSS (Custom Glassmorphism & Ambient UI System), Vanilla JavaScript.
* **Backend:** Node.js, Express.js.
* **AI Engine:** Anthropic Claude API (`claude-sonnet`).
* **Data Persistence:** Local JSON storage (`policies.json`) for hackathon prototype simplicity.
