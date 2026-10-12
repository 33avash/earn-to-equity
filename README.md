# Earn to Equity

> From your first paycheck to your future wealth.

Earn to Equity is a wealth-planning web app for young Indian earners. You describe where you are today (income, spending, savings, loans and goals), and it builds a 20-year projection showing where that path leads and which decisions change it.

Everything runs in the browser. There are no bank logins and no accounts, and your data never leaves your device.

**Team:** Atulya Singh · Avash Srivastava · Aayushi Paul · Agustyae Gupta

---

## What's inside

**Public site:** a landing page with a live SIP calculator, life-scenario comparisons and a preview of the real dashboard, plus How It Works, Features, Tools and Learn pages.

**The planner (`/app`):**

| Area | What it does |
|---|---|
| Overview | Net worth, this month's cash flow, the 20-year trajectory, goals, FI progress and prioritised next steps |
| Financial Health | A 0–100 score built from six documented components (educational, not a credit score) |
| Budget Planner | Editable monthly cash flow with an optional 50/30/20 comparison |
| Emergency Fund & Debt | 3–12 month reserve planning, plus avalanche vs snowball repayment comparison |
| Goals Planner | Inflation-adjusted goal costs, required contributions, priority-based funding and shortfalls |
| Portfolio Builder | Target allocation across seven asset classes, drift, rebalancing and projected growth |
| SIP Calculator | Lump sum, step-up, contribution timing, flat vs step-up comparison |
| Wealth Simulator | The year-by-year engine, a year inspector, and three scenarios with attribution |
| Life Events | Promotions, career breaks, marriage, a home, with before-and-after impact |
| Risk Lab | Stress tests, market declines with recovery paths, and a 1,000-path Monte Carlo |
| Financial Independence | Target corpus, projected corpus, gap and estimated FI age |
| Wealth Coach | Plain-language explanations of your own figures (rule-based, or Gemini if configured) |
| Learning Centre | Eleven short modules with worked examples and quizzes, plus dated tax-awareness notes |

## Getting started

You'll need Node.js 18 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:5173. Use **Explore the demo** to look around with a fictional profile, or **Build My Wealth Plan** to enter your own numbers.

| Command | |
|---|---|
| `npm run dev` | Start the development server |
| `npm test` | Run the financial engine tests |
| `npm run typecheck` | Type-check the project |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Serve the production build locally |

### Optional: Gemini-powered coach

By default the Wealth Coach uses a rule-based explainer that works from the app's own calculations. To use Gemini instead:

```bash
cp .env.example .env
# then set GEMINI_API_KEY in .env
```

The key is read only by a small server-side handler (`server/coach.ts`) that the dev and preview servers mount at `/api/coach`. It is never bundled into the frontend. The model only sees figures the engine has already calculated, and it's instructed to explain them, not invent new ones.

## Project structure

```
src/
  finance/      Pure calculation modules: no React, fully unit-tested
  state/        Zustand store (persisted to localStorage), demo profile, shared selectors
  types/        The FinancialProfile model and simulation types
  components/   Design-system primitives, charts, layout and motion helpers
  features/     Domain UI: onboarding, editors, landing sections, learning content
  pages/        Public pages and the planner screens
  services/     Wealth Coach logic and data export
server/         Optional Gemini proxy
tests/          Formula and simulation invariant tests
```

The key idea: every screen reads from **one profile** and **one simulation engine** (`src/finance/simulate.ts`). Change your rent in the Budget Planner, and the dashboard, goals, FI estimate and stress tests all update together.

## How the numbers work

- **Returns** are effective annual rates, compounded monthly as `(1 + r)^(1/12) − 1`. Loans use APR ÷ 12.
- **Contributions** land at month-end by default (month-start is optional). A 0% return gives back exactly what you put in.
- **Annual changes** (salary growth, inflation, SIP step-up) apply from the start of each year.
- **Goals and life events** are entered in today's rupees and inflated to the year they happen.
- **No double counting.** Money moved into savings or investments is a transfer, not an expense. Repaying loan principal moves money rather than losing it, so only interest is a cost. Buying a home converts savings into property plus a loan.
- **Shortfalls are shown, not hidden.** A goal is funded in the projection only if there is money to pay for it. If spending outruns income, the gap is drawn from savings and then shown as borrowing.

These rules are covered by tests in `tests/finance`, including checks that net worth always equals assets minus liabilities, and that a zero-return run conserves every rupee.

## Built with

React 18 · TypeScript · Vite · Tailwind CSS · Recharts · Zustand · Lucide icons · Vitest

## Disclaimer

Earn to Equity is an educational project. It is not a SEBI-registered investment adviser and does not provide investment, tax or legal advice. All projections are illustrative estimates based on assumptions you can change, and real outcomes will differ.
