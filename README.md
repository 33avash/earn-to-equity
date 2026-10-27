# Earn to Equity

A 20-year financial plan for salaried professionals in India. You enter your CTC, spending, loans, savings and goals, and the planner works out your take-home pay under the 2026-27 tax rules, then projects every year that follows: tax, EPF, EMIs, SIPs, inflation, the goals you can pay for, the ones you can't, and what a market crash or a career break would do to all of it.

It runs entirely in your browser. There is no sign-up and no server holding your data.

**[Open the live site →](https://33avash.github.io/earn-to-equity/)**

![Earn to Equity home page](docs/screenshots/home.png)

---

## Contents

- [Why we built it](#why-we-built-it)
- [Using it](#using-it)
- [The demo: Riya's plan](#the-demo-riyas-plan)
- [What the planner does](#what-the-planner-does)
- [How the numbers are worked out](#how-the-numbers-are-worked-out)
- [Default assumptions](#default-assumptions)
- [What it does not model](#what-it-does-not-model)
- [Your data](#your-data)
- [Running it locally](#running-it-locally)
- [Project layout](#project-layout)
- [Tests](#tests)
- [Deployment](#deployment)
- [Team](#team)
- [License](#license)
- [Disclaimer](#disclaimer)

---

## Why we built it

Most people in India get their first salary with very little guidance on what to do with it. Online SIP calculators answer one question (what does ₹10,000 a month become?) and ignore everything around it: income tax that rises as your CTC crosses slabs, EPF, the loan you will take for an MBA, the flat you want in your thirties, the year you take off work.

Earn to Equity puts all of that into one model. Every screen reads from the same profile and the same year-by-year projection, so changing your rent on the Budget page moves your FI age on the next screen.

## Using it

There are two ways in:

- **See the demo plan.** Loads a made-up person, Riya, so you can look around without typing anything. Her plan has gaps on purpose, and **Fix my plan** shows what closing them does. See [the demo](#the-demo-riyas-plan) below for who she is and why her plan looks the way it does.
- **Start in 2 minutes.** Five answers on one screen: age, CTC (or monthly take-home), city, monthly spending (rent can be split out) and one top goal. Everything else starts from defaults: the Labour Codes salary structure, the cheaper tax regime each year, a six-month emergency target. Overview then shows a **plan accuracy** meter and links to each missing detail, with how far it could move your FI age.
- **Detailed setup.** The eight-step setup (`/start/detailed`): about you, income and career, monthly cash flow, what you own and owe, protection, goals, investment mix, and a review. Every step says why it asks what it asks.

The planner opens in **simple mode**: Overview, Salary & offers, Goals, My plan and Learn. **Advanced tools** at the foot of the sidebar adds Budget, Emergency & debt, Portfolio, SIP, Life events, the full Simulator, Risk lab, Financial independence, Financial health and News. Search (⌘K) finds every screen in either mode.

Press **⌘K** (or **Ctrl+K**) anywhere to search pages, lessons, glossary terms, your goals and your own figures, or to run actions such as adding a goal or starting a stress test.

<table>
  <tr>
    <td><img src="docs/screenshots/overview.png" alt="Overview dashboard" /></td>
    <td><img src="docs/screenshots/goals.png" alt="Goals planner" /></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/simulator.png" alt="Wealth simulator" /></td>
    <td><img src="docs/screenshots/risk-lab.png" alt="Risk lab" /></td>
  </tr>
</table>

## The demo: Riya's plan

The planner opens on a demo so that someone seeing it for the first time can watch it work before entering anything about themselves. The demo is a single made-up person, Riya. Every figure is illustrative, and none of it comes from a real person. The profile is in [`src/state/demo.ts`](src/state/demo.ts).

**Who she is.** Riya is 26 and works as a software analyst in Pune. Her CTC is ₹11.5 L under the new Labour Codes pay structure, with 10% of it as variable pay. After PF, tax and the rest of CTC, about ₹72,200 a month reaches her bank.

| Each month | Amount |
|---|---|
| Take-home pay | ₹72,200 |
| Spending (₹17,000 rent and ₹5,000 sent to her parents included) | ₹44,800 |
| EMIs: education loan and credit card | ₹11,000 |
| SIPs | ₹15,000 |
| Savings | ₹3,000 |

She already has about ₹4.95 L invested (Indian and international equity, debt, PPF, gold), ₹2.8 L in EPF, and ₹1.25 L between her savings account and emergency fund. She owes ₹2.8 L on an education loan at 9.5% and ₹22,000 on a credit card at 36%. She has ₹10 L of health cover and no term life cover.

**What she's planning.** Her goals and life events, in the order they fall:

| Year | Plan |
|---|---|
| 2027 | Trip to Japan, ₹2 L |
| 2029 | Part-time MBA, ₹10.5 L |
| 2030 | First car, ₹8 L |
| 2031 | A new role after the MBA, with pay up 40% |
| 2033 | Wedding, ₹6 L |
| 2039 | A ₹60 L flat in Pune, with a 20% down payment and a 20-year loan |

She wants to be financially independent by 55. (Years shift with the current year: the demo always starts this year.)

**Where her plan falls short, on purpose.** The demo is tuned, using real engine runs, to have the gaps most first plans have:

- The MBA and the car are a year apart, and savings can't pay for both. The car is about ₹4.3 L short in 2030.
- Her emergency reserve covers about 2.7 months of essential bills and EMIs against a 6-month target.
- The credit card charges 36%, the most expensive money in her plan.
- Her employer puts nothing into NPS, although up to 14% of basic paid that way is not taxed.
- Her parents rely on the money she sends home, but she has no term life cover.

**What "Fix my plan" does with it.** It tries each change on her projection and on 300 simulated market paths, then shows what each one moves before anything is applied. The changes are: clear the card, pause part of the SIP to fill the reserve, ask HR for employer NPS, move the car a year or let a loan cover the gap, and keep lifestyle creep down. Applied together, the result reported on the landing page ([`src/content/demoFix.json`](src/content/demoFix.json)) is: no unpaid goals (from one), the chance of reaching FI by 55 goes from 43% to 68%, and plan health goes from 62 to 78.

**How it looks in the app.** A banner on every planner screen says the plan is a demo. Its **Who is Riya?** link opens the summary above, and Overview shows the same summary as a card you can fold away. The summary reads the live plan, so it stays correct if you edit the demo: a gap you close drops off the list. If you already have your own plan, opening the demo sets it aside instead of overwriting it, and the plan switcher at the top of the sidebar brings it back. **Settings → Reset to demo** puts every gap back.

The demo also anchors the tests: a saved snapshot of its 21-point projection catches any change to the numbers, and a test checks that the summary names each gap.

## What the planner does

The planner lives at `/app` and has fourteen modules in four groups.

### Today

**Overview.** Net worth, monthly surplus, savings rate, FI age and plan health, each with a small trend line and the change expected over the next year. Below that: the 20-year net-worth chart in both future and today's rupees with your life events marked on it, a breakdown of this month's take-home (essentials, lifestyle, EMIs, SIPs, savings, and whatever is left unassigned), and a short list of next steps you can tick off. If a goal can't be paid for, a warning at the top says which one, by how much, and links to the fix.

**News.** The day's Indian money headlines from Economic Times, ET Wealth, Mint, Business Standard and the RBI, newest first, split into today and earlier (Indian time). Each headline is tagged markets, rates and loans, tax, investing, property or global, can be filtered by topic, and links to the planner screen it affects: a repo-rate change to your loans and EMIs, a tax change to your take-home pay, a market fall to your allocation. Global market headlines are optional: paste a free [Finnhub](https://finnhub.io/register) API key on the page. The key is checked once, kept in your browser and sent only to Finnhub.

**Financial health.** A score from 0 to 100 built from six parts. The rule for each part is shown on the page:

| Part | Weight | How it is scored |
|---|---|---|
| Emergency preparedness | 20 | Liquid savings, plus any top-up already scheduled from a SIP pause, ÷ your emergency target. Full marks at or above target. |
| Savings rate | 20 | Income left after expenses and repayments; NPS paid from your CTC counts as income and as savings. 0 at 0%, full marks at 30%. |
| Debt burden | 15 | EMIs as a share of income. Full marks at 10% or less, 0 at 50%. |
| Investment consistency | 15 | Monthly investing, including NPS paid from your CTC, as a share of income. 0 at 0%, full marks at 20%. |
| Goal readiness | 15 | Average share of each goal's required monthly contribution your surplus covers. 50 if you have no goals. |
| Protection | 15 | Half for health cover at or above the benchmark for your city and household, half for term cover of 10× annual income (given automatically if nobody depends on your income). |

The score is an educational measure. It is not a credit score.

**Budget.** CTC to take-home under both tax regimes side by side, with the cheaper one used by default. Monthly essentials, lifestyle spending, EMIs, SIPs and savings as editable line items, plus an optional 50/30/20 comparison.

**Emergency & debt.** Your emergency reserve target (3 to 12 months of essentials plus EMIs, the bills that keep coming if your income stops), how many months you hold now and how long it takes to close the gap. For loans, a month-by-month payoff comparison of avalanche (highest rate first) and snowball (smallest balance first) with any extra monthly amount you choose, including total interest and the month each loan is cleared.

### Plan

**Goals.** Each goal is entered in today's prices and inflated to its target year (education costs use a separate, higher inflation rate). Each goal is funded in one of three ways:

- **Savings:** paid from your liquid savings in the target year. If there isn't enough, the goal is left unpaid and reported as a shortfall.
- **Loan:** paid by a new loan taken that year.
- **Savings, then a loan:** savings first and a loan for the rest. This is the default for education and cars.

Goals receive money in priority order. You can drag them to reorder, and the priority labels follow the position. Each goal shows its cost today, its cost in the target year, and how much comes from savings, from a loan, or is still unpaid. There are list, board and timeline views.

**Portfolio.** A target mix across seven asset classes (Indian equity, international equity, debt, government schemes such as PPF, gold, cash, other), with four example mixes from conservative to aggressive. It shows the expected return after fund costs, an estimated volatility, how far your current holdings have drifted from the target, and how to rebalance using new SIP money only (no selling).

**Fund check** (on Portfolio). Search for a mutual fund you hold by name and add it. Each fund shows its AMFI category, the asset class it counts as, whether it is a direct or regular plan, and its 1-, 3- and 5-year past returns from NAV history. Enter what each fund is worth and those values fill your holdings, and the share in regular plans sets the extra cost the projection charges. A regular-plan fund also shows roughly what that cost adds up to over the plan on its amount. It describes funds you already hold; it never ranks them or suggests one.

**Markets strip.** A row under the top bar (and on the landing page) with live figures from Yahoo Finance: the Nifty 50, the Sensex, international gold in rupees per 10 g (before Indian import duty and GST) and USD/INR. It refreshes every minute while the page is open, and also shows the RBI repo rate and the latest CPI inflation. If the Yahoo endpoint can't be reached, the Nifty 50 and gold are read from the NAV of a fund that tracks each one, and the rupee from the ECB's daily reference rate. Each figure shows its time and source and links to the screen it affects. Changes are small signed numbers, not red and green. On phones the row scrolls slowly and stops when touched; wider screens and reduced motion show it still.

**Life events.** Promotions, career breaks, a wedding, a home purchase or any one-off cost, each with its before-and-after effect on net worth. Buying a home includes the state's stamp duty and registration, GST on an under-construction flat, interiors, and a check against the 50% limit lenders put on EMIs as a share of take-home.

**SIP.** A monthly SIP projection with an optional lump sum, a yearly step-up, a choice of investing at the start or end of each month, and a comparison of a flat SIP against a stepped-up one. Results are shown before and after long-term capital-gains tax.

### What if

**Wealth simulator.** The full year-by-year projection. Edit salary growth, inflation, SIP step-up and portfolio return and every module updates. Click any year on the chart or the table to open a year inspector showing that year's income, tax, spending, EMIs, investments, EPF, goals paid and events. It also has three scenarios (conservative, base, high growth) with a breakdown of how much of the difference each assumption causes, a tornado chart ranking which assumption moves the outcome most, and a CSV export.

**Risk lab.** Stress tests run through the same engine as your plan, shown against your baseline year by year. One-click presets: a 2008-style crash in year 4, a six-month job loss, 8% inflation for three years, raises half as big, and a ₹5 L medical bill next year. You can also move each control yourself (salary growth, inflation, extra savings, lifestyle creep, SIP step-up, a delayed FI date, career breaks and purchases). A Monte Carlo section runs 1,000 market paths and shows the 10th, 50th and 90th percentile of net worth each year, the probability that each goal gets paid, and the probability of reaching your FI target. It includes your income, spending and event tests, but not the single market decline, which is shown separately.

**Financial independence.** Your FI target corpus, the corpus you are projected to have, the gap, your estimated FI age, and the extra monthly SIP needed to reach the target by the age you chose.

### Learn

**Coach.** Ask questions about your plan in plain language ("Can I afford a flat in 2035?", "What is a SIP step-up?"). A language model running in your browser explains figures the engine has calculated for you. It opens as a side panel from **Ask coach** in the top bar (or ⌘K) on every screen, with suggested questions for the screen you're on, and as a full page. See [the coach](#the-coach) for how it works.

**Learning centre.** Eleven lessons of 4 to 8 minutes each, with a worked example from the planner's engine, key points and a three-question check: budgeting, compounding, inflation, SIPs and step-ups, asset allocation, diversification, volatility and drawdowns, good and costly debt, tax awareness, EPF/PPF/NPS, and financial independence. A separate tax reference lists every dated rate with its official source.

### Public pages

The landing page has a live preview of the coach on the demo plan, six one-minute interactive lessons, a live SIP calculator, three what-if scenarios and the real planner panels running on the demo plan. There are also How it works, Features, Calculators (SIP, loan EMI, inflation), Learn, About and Legal pages.

## How the numbers are worked out

All of the maths is in `src/finance/`, written as plain TypeScript with no React, so it can be tested on its own. The core is `simulate.ts`, one projection engine that every screen calls.

### Timing

- The plan starts on 1 January of the current year. A 20-year plan has 21 points: today, then 1 January of each following year.
- Your age is your age on 1 January of each year.
- The engine steps month by month. Within a month, loan interest accrues, then repayments are made, then the surplus is invested or saved.
- Salary growth, inflation and SIP step-ups apply at the start of each year from the second year.
- Goals and life events dated in a year happen at the start of that year.

### Rates

- Investment returns are effective annual rates, compounded monthly as `(1 + r)^(1/12) − 1`, so twelve months reproduce the stated yearly return exactly.
- Loan rates are APRs, the Indian EMI convention: the monthly rate is APR ÷ 12, and EMIs use the standard reducing-balance formula.
- Returns are always after fund costs (expense ratios).
- "Today's rupees" means a future amount divided by cumulative inflation, so you can compare it with prices now.

### Salary and tax

When you enter a CTC, in-hand pay is recalculated from it every year. Basic + DA defaults to 50% of CTC, the floor the Labour Codes set for "wages" from 21 November 2025. CTC is carved up in this order: employer PF, employer NPS, gratuity (4.81% of basic, when it is part of CTC) and the variable-pay target. What is left is fixed pay, paid monthly. Variable pay arrives once a year at target × expected payout and is taxed that year; the extra tax it causes comes out of the payout, so the monthly figure covers fixed pay only. Each year the engine deducts:

- **EPF:** 12% of basic pay from you and 12% from your employer (or 12% of ₹25,000 a month, ₹3,000, if your employer uses the wage ceiling, which rose from ₹15,000 on 17 September 2026). The part of your employer's share that goes to the pension scheme (8.33% of up to ₹25,000 a month) is not counted as savings.
- **Professional tax** for your state (₹2,500 a year in Maharashtra, Karnataka and Tamil Nadu; ₹2,400 in Telangana, West Bengal and Gujarat; nil in Delhi, Haryana and Uttar Pradesh).
- **Income tax** under both regimes, using whichever is cheaper each year unless you pick one. Slab tax, then the rebate with marginal relief, then surcharge with marginal relief, then 4% cess. Sections are named by their Income-tax Act, 2025 numbers with the old number alongside, for example "Sec 123 (old 80C)", and by the old number alone where we couldn't confirm the new one.
  - New regime (Sec 202, old 115BAC): nil up to ₹4 L, then 5% for each ₹4 L band up to 30% above ₹24 L, a ₹75,000 standard deduction and a rebate (Sec 156, old 87A) of up to ₹60,000 on income up to ₹12 L. Employer NPS is deductible up to 14% of basic (Sec 124, old 80CCD(2)).
  - Old regime: nil up to ₹2.5 L, 5% to ₹5 L, 20% to ₹10 L, 30% above, a ₹50,000 standard deduction, Sec 123 (old 80C) up to ₹1.5 L (your PF and home-loan principal count towards it), your own NPS up to ₹50,000 more (old 80CCD(1B)), employer NPS up to 10% of basic, health cover up to ₹25,000 for you and ₹25,000 or ₹50,000 for parents (Sec 126, old 80D), interest on a self-occupied home loan up to ₹2 L (Sec 22, old 24(b)), and HRA.
  - HRA is worked out, not typed: the least of HRA received, rent minus 10% of basic, and 50% of basic in Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Pune or Ahmedabad (40% elsewhere). Rent comes from the rent line in your budget and stops when you move into a home you buy. You can still type your payslip figure to override it.
  - Home-loan interest and principal come from the projection's own loan schedule for that year.
  - Employer PF and NPS above ₹7.5 L a year are taxed as salary.
- **Gratuity** is earned each year but paid only when you leave after 5 years (1 year on a fixed-term contract), so it is shown separately and left out of net worth.
- **NPS** contributions, yours and your employer's, build a balance locked until 60. It counts towards FI and is flagged, like EPF.

Because raises apply to CTC, take-home grows more slowly than CTC as you move into higher slabs. In a year with a career break, tax is worked out on the months you were paid.

If you enter a take-home figure instead of a CTC, it simply grows at your salary-growth rate.

**Lifestyle creep.** By default, 40% of every above-inflation rise in take-home is added to lifestyle spending for good. You can change this.

### Investments and capital gains

- Selling investments realises gains in proportion to how much of the portfolio is gain rather than cost. Holdings are assumed to be long-term and held in your target mix.
- Equity gains above ₹1.25 L a year are taxed at 12.5%. Gold, international and other funds at 12.5%. Debt funds and cash at your slab rate. Government schemes such as PPF are tax-free.
- When tax is due on a sale, a little more is sold to pay it.

### What counts as spending

- Moving money into savings or investments is a transfer, not an expense.
- Repaying loan principal moves money from cash to a smaller loan. Only interest, taxes and costs reduce net worth.
- Buying a home turns the down payment into a property asset and adds a loan. Stamp duty, registration, GST and interiors are costs. Maintenance and property tax become recurring expenses.
- Money set aside for a goal is assumed to already sit inside your cash or investments, so it isn't counted twice.

### Goals and shortfalls

- A goal is paid once, in its target year, according to its funding choice.
- A savings-only goal that can't be afforded is left unpaid and shown as a shortfall. It is not quietly paid with money that doesn't exist.
- Retirement and FI goals are targets for your corpus and are never withdrawn.
- If a goal goes unpaid, life events linked to it (for example, the career break for an MBA) are dropped and the projection is rerun without them, unless you choose to keep them.
- For goals paid partly by a loan, enough savings are held back to cover rent and EMIs through any linked career break, so the loan pays the fees and your savings pay the bills.

### When money runs short

If spending is more than income in a month, the engine uses cash above your emergency reserve first, then investments, then the reserve itself. Anything still unpaid becomes short-term borrowing charged at 14% a year. While that borrowing is outstanding, surpluses repay it before any SIP is made. Cash above your emergency target is invested at the end of each year (you can turn this off).

### Financial independence

FI target = (yearly living costs + extra healthcare after FI) ÷ the withdrawal rate, plus any debt still owed. Healthcare grows at its own inflation rate. Financial assets count after the tax that would be due if they were sold, and include EPF (flagged, because it can't be withdrawn before 58). Your home is not counted.

### Scenarios and stress tests

- The conservative and high-growth scenarios shift your own assumptions: salary growth −3 / +3 points, returns −2 / +1.5 points, inflation +1 / −0.5 points, SIP step-up −5 / +5 points. You can edit these.
- The attribution changes one assumption at a time to see how much of the difference each one causes. Because assumptions interact, the parts don't always add up to the total, and the remainder is shown separately.
- The Monte Carlo draws a return path for each run, after fund costs, and runs every path through the same engine. Two return models are available: fat-tailed returns (Student-t with 5 degrees of freedom, scaled to your assumed return and volatility), or actual Nifty 50 total-return years from 2005 to 2025 for the Indian-equity share, taken in three-year blocks. The random generator is seeded, so the same inputs always give the same result.
- Portfolio volatility uses a correlation matrix (Indian and international equity 0.5, debt and government schemes 0.6, everything else 0), a planning convention you can edit in Settings. The app checks that an edited matrix is still positive semi-definite.
- The historical model replays Nifty 50 total-return years in blocks of three consecutive years (wrapping from 2025 back to 2005), so bad years cluster as they did in 2008 and 2011.

### The coach

The engine always does the maths; a language model, when one is available, explains the result.

1. Every question first goes through the rule-based coach. It recognises six kinds of question (whether you can afford a home and when, why a goal is behind, a different salary growth rate, a market fall in a given year, how much more to save, and an explanation of your projection) and, for those, runs the real calculation with your numbers: a fresh simulation for a salary or crash what-if, the home-affordability check for a flat.
2. That calculated answer goes to the model as **FACTS**, together with a compact summary of your plan (no name) and, for concept questions such as "what is 80C?", the matching glossary entries and lesson notes. The model is told to use only those figures, quote them exactly, state the assumptions behind them, say what is missing if it can't answer, and not recommend specific funds or insurers. The last four turns are kept so follow-up questions work.
3. Every rupee amount and percentage in the model's answer is checked against those figures (₹12.4 L, ₹12.4 lakh and ₹12,40,000 all count as the same figure). Anything that doesn't match is listed under the answer, and the calculated answer is always one click away.

Which model answers depends on what is available. **Automatic** (the default) picks the first that is ready:

| Engine | Where it runs | Limits | Notes |
|---|---|---|---|
| Gemini | Google, through `server/coach.ts` or `worker/coach.ts` | Your API key's free quota | Only where the deployment has set a key (see below). Falls back to the next engine if the quota runs out. |
| Chrome built-in AI | On the device (Gemini Nano, managed by Chrome) | None | Used when Chrome's Prompt API is available. |
| Ollama | Your own computer | None | Off until switched on in AI settings; never contacts `localhost` otherwise. |
| In-browser model | In the browser over WebGPU ([WebLLM](https://github.com/mlc-ai/web-llm)), in a Web Worker | None | **Recommended** (default): Gemma 2 2B, about 1.5 GB. **Smaller**: Qwen 2.5 1.5B, about 0.9 GB, used automatically if a device can't load Gemma. |
| Rule-based | In the browser | None | Always available, offline. |

Nothing needs setting up. When no model is ready, the first question starts downloading the in-browser model: that question is answered from the calculations, with a note and a progress bar, and the model answers from then on. The download happens once; later visits load the model from the browser's cache. Browsers without WebGPU get the rule-based coach, and the coach says why.

The default was picked by running the same four grounded questions through five WebLLM models (Qwen 2.5 1.5B and 3B, Qwen 3 1.7B, Gemma 2 2B, Llama 3.2 3B) and checking every figure each one quoted. Gemma 2 2B was the only one with none that failed the check, at about 16 seconds an answer; the 3B models were slower and still invented numbers. Tested end to end in Edge on Windows with integrated graphics (AMD Radeon 780M): first question, automatic download, answers, stopping an answer part-way and a follow-up, and loading from the cache on a second visit.

The engine choice, model size and Ollama options are in the coach's **AI settings** and on the Settings page. If a model fails or returns nothing, the rule-based answer is shown instead.

## Default assumptions

Every dated rule and rate is kept in one file, `src/finance/assumptions.ts`, with the date it was checked and the official page it was checked against. Section numbers under the Income-tax Act, 2025 are in `src/finance/sections.ts`. The Settings page lists them all with their sources. Last full review: 27 October 2026.

| Assumption | Default |
|---|---|
| Inflation | 6% a year |
| Education cost inflation | 9% a year |
| Healthcare inflation after FI | 10% a year |
| EPF interest | 8.25% a year |
| SIP step-up | 10% a year |
| Lifestyle creep | 40% of real raises |
| Property price growth | 5% a year |
| Home-loan rate | 8% |
| Education loan | 10.5% over 7 years, 12-month moratorium |
| Car loan | 9.5% over 5 years |
| Lender EMI limit | 50% of take-home |
| Basic + DA | 50% of CTC (Labour Codes floor) |
| EPF wage ceiling | ₹25,000 a month (from 17 Sep 2026); EPS 8.33% up to the same ceiling |
| Gratuity | 15/26 × 1/12 of basic = 4.81% a year, part of CTC by default, not in net worth |
| Variable pay | None by default; paid once a year at target × expected payout |
| Employer NPS | None by default; deductible to 14% of basic (new regime), 10% (old) |
| HRA | 40% of basic; exemption worked out from your rent and city |
| Regular-plan cost | +0.75 points a year on equity funds, +0.4 on debt funds (approximate), only if you say your funds are regular plans |
| Rupee depreciation vs USD | 0% (added to international equity if you change it) |
| Correlations | Indian–international equity 0.5, debt–government schemes 0.6, others 0 |
| Safe withdrawal rate | 3.5% |
| Short-term borrowing rate | 14% |
| Plan length | 20 years |

| Asset class | Return before costs | Fund cost | Volatility |
|---|---|---|---|
| Indian equity | 11% | 0.2% | 18% |
| International equity | 9% | 0.5% | 16% |
| Debt | 7% | 0.3% | 4% |
| Government schemes (PPF etc.) | 7.1% | 0% | 1% |
| Gold | 7.5% | 0.2% | 15% |
| Cash | 3.5% | 0.2% | 0.5% |
| Other | 8% | 0.8% | 10% |

These are long-run planning assumptions, not forecasts, and they can all be changed in Settings, the Simulator or the Portfolio page.

## What it does not model

We would rather list these than have them found later:

- **Tax.** Exit loads, surcharge on capital gains, and deductions other than Sec 123 (old 80C), Sec 126 (old 80D), NPS, home-loan interest and HRA are not modelled. Only one self-occupied home loan is assumed. Tax rules are for a resident individual under 60.
- **Salary.** Gratuity is accrued at 4.81% of basic a year but never paid out in the projection, because the plan doesn't know when you will change jobs. Variable pay is assumed to be paid in the year it is earned. The planner assumes you are an EPS member; if your basic was above the ceiling when you first joined EPF, more of your employer's share would go to EPF.
- **Investments.** Holdings are assumed to be long-term and in your target mix, so short-term capital-gains tax on recent purchases isn't applied. Correlations are fixed round numbers, not estimated from data. The historical bootstrap clusters bad years within three-year blocks only.
- **Lock-ins.** EPF and NPS count towards FI but are flagged as locked until 58 and 60. Lock-in periods on PPF are not enforced, and the NPS annuity at exit isn't modelled.
- **Insurance.** The plan checks your health and term cover against benchmarks. Premiums are whatever you enter as expenses, and claims being paid out are not modelled.
- **Data.** There is no import yet. The JSON export is a copy for your records, but you can't load it back into the app.
- **Coach.** The in-browser model needs WebGPU and a one-time download of about 1.5 GB; without WebGPU the coach gives rule-based answers. Gemini needs a key on the server (dev or preview server, or the Cloudflare Worker described below), and on Google's free tier an answer currently takes about 20 seconds. The figure check compares values, not meaning, so a real figure quoted about the wrong thing passes it.

## Your data

- Your profile, goals, events, assumptions and settings are saved in your browser's local storage on this device, under the key `e2e:v1` (the theme choice is under `e2e:theme`). Nothing is sent to an Earn to Equity server, because there isn't one.
- Local storage isn't encrypted and doesn't sync between devices or browsers. Clearing site data deletes your plan.
- The app never asks for bank logins, card numbers, PAN, Aadhaar or other identity documents.
- The markets strip and fund check read free public sources: Yahoo Finance's chart data (through `/api/markets` or the Worker; nothing is sent, the endpoint fetches a fixed list of four symbols), [MFapi.in](https://www.mfapi.in/) for fund search and NAV history, AMFI's daily NAV file (through `/api/amfi` or the Worker), [Frankfurter](https://frankfurter.dev/) for the ECB rate and the World Bank for CPI. Only what you type in the fund search and scheme codes are sent, never anything from your plan. Results are cached for up to 12 hours under `e2e:data:` keys, and dated copies committed in `src/services/data/snapshots/` are shown, marked as saved copies, when a source can't be reached. See [docs/data-sources.md](docs/data-sources.md).
- From Settings you can download a summary (`.txt`), the full data (`.json`) or the year-by-year projection (`.csv`), reset to the demo plan, or erase everything.
- The coach's on-device, Chrome and Ollama models run on your own device, so your questions stay there; only the model files are downloaded (from Hugging Face for the on-device model). Plan data leaves your browser only on a deployment that has Gemini set up: Automatic then uses Gemini first, sending your question and a summary of calculated figures (no name) to Google. Choose another engine in AI settings to keep everything on the device.

## Running it locally

You'll need Node.js 22.19 or newer.

```bash
git clone https://github.com/33avash/earn-to-equity.git
cd earn-to-equity
npm install
npm run dev
```

Then open http://localhost:5173.

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server |
| `npm test` | Run the full test suite |
| `npm run typecheck` | Type-check the project |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |

### Optional: other coach engines

**Gemini on your machine.**

```bash
cp .env.example .env
```

Set `GEMINI_API_KEY` in `.env` (a free key from [Google AI Studio](https://aistudio.google.com/apikey)). The key is read only by `server/coach.ts`, which the dev and preview servers mount at `/api/coach`. Don't prefix it with `VITE_`, or Vite would put it into the browser bundle.

**Gemini on the live site.** GitHub Pages can't keep a key secret, so the key lives in a free [Cloudflare Worker](https://developers.cloudflare.com/workers/) (`worker/coach.ts`), which only answers requests from the origins listed in `worker/wrangler.toml`:

```bash
cd worker
npx wrangler login
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy
```

Then add the worker's URL (for example `https://earn-to-equity-coach.<you>.workers.dev`) as a repository variable named `COACH_API_URL` (Settings → Secrets and variables → Actions → Variables) and push. The deploy workflow passes it to the build as `VITE_COACH_API_URL`. Both handlers share `server/handler.ts`, add their own system prompt (from `src/services/coach/prompt.ts`) and cap requests at 64 KB. The handler uses `gemini-flash-lite-latest` (set `GEMINI_MODEL` to change it) and retries once on `gemini-flash-latest` if the first model is busy, out of quota or takes longer than 35 seconds. Google's free tier is shared by every visitor; when it runs out, the coach moves on to the in-browser model.

**Ollama.** Install [Ollama](https://ollama.com), run `ollama pull gemma3:4b`, then switch on **Use Ollama on this computer** in the coach's AI settings. To use it from the hosted site rather than `localhost`, start Ollama with `OLLAMA_ORIGINS=https://33avash.github.io`.

### Optional: news and live markets on the live site

Indian headlines come from the publishers' RSS feeds, which need no key but can't be read by a browser on another site. `server/news.ts` fetches and merges them; the dev and preview servers mount it at `/api/news`, and the Cloudflare Worker serves it at `/news`. Once the worker is deployed and `COACH_API_URL` is set, the hosted site uses it automatically (or set `VITE_NEWS_API_URL` to point elsewhere). Results are cached for 10 minutes. Without the worker, the News page still offers Finnhub's global headlines with a reader's own key.

The same worker serves the live market figures at `/markets` (the dev and preview servers at `/api/markets`). `server/markets.ts` reads Yahoo Finance's chart data for the Nifty 50, Sensex, gold and USD/INR and caches it for a minute. Yahoo sends no CORS headers, so the browser can't read it directly. Without the worker, the strip falls back to fund NAVs and the ECB rate.

It also serves AMFI's official NAV file at `/amfi?codes=…` (the dev and preview servers at `/api/amfi`); `server/amfi.ts` fetches the 1.5 MB file, keeps it for 12 hours and returns only the scheme codes asked for. The fund check uses it to read each fund's plan type, and falls back to the scheme name without it. To refresh the committed fallback snapshots, run `node scripts/refresh-snapshots.mjs`.

## Project layout

```
src/
  finance/      The calculation engine: tax, salary, simulation, goals, debt, FI, Monte Carlo.
                Plain TypeScript with no React. Every dated rate lives in assumptions.ts.
  state/        Zustand store (saved to local storage), the demo profile, and selectors that
                turn a profile into a computed plan.
  types/        The FinancialProfile model and simulation types.
  components/   UI primitives, charts, layout (public site and planner shell) and motion helpers.
  features/     Larger pieces: onboarding, editors, the coach chat and side panel, landing-page sections, lessons.
  pages/        The public pages and the fourteen planner screens.
  services/     The coach (rule-based answers, prompt, retrieval, figure check and model engines), news clients and data export.
  theme/        Light, dark and system theme handling.
server/         The optional Gemini and news handlers (shared logic, plus the dev/preview middleware).
worker/         The same handlers as a Cloudflare Worker, for Gemini and news on the live site.
tests/          Engine, accessibility and copy tests.
docs/           Screenshots used in this README.
```

Built with React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts, Zustand, Motion, cmdk, WebLLM and Lucide icons. Tested with Vitest, Testing Library and axe.

## Tests

`npm test` runs 272 tests across ten files:

- **Engine (`tests/finance`).** Formula checks for tax, EMIs, SIPs and inflation; invariants that must always hold, such as net worth equalling assets minus liabilities in every year and a zero-return run giving back exactly what was put in; goal funding, shortfalls and linked events; and a saved snapshot of the demo plan's 21-point projection, so any change to the numbers is caught and has to be reviewed on purpose.
- **Accessibility (`tests/a11y`).** Every public page and planner screen, and the coach side panel, is rendered and checked with axe in both light and dark themes, and colour contrast is computed from the theme tokens (at least 4.5:1 for text and 3:1 for controls).
- **Coach (`tests/coach`).** The figure check (accepts quoted figures in any rupee format, flags invented ones, passes every figure in the engine's own answers), the prompt (facts added for recognised questions, history trimmed, no name in the context), reference retrieval, the order engines are chosen in, and answer formatting.
- **News (`tests/news`).** RSS parsing (CDATA, HTML entities, http links upgraded, routine RBI notices dropped), merging duplicates across publishers, topic tagging and the Indian-time cut-off for today.
- **Copy (`tests/copy`).** Fails the build if retired taglines or banned words come back into the interface.

## Deployment

Every push to `main` runs the tests, builds the site and publishes it to GitHub Pages through `.github/workflows/deploy.yml`. The build sets `BASE_PATH=/earn-to-equity/` so assets and routes work under the repository path, and copies `index.html` to `404.html` so links straight to a planner page (such as `/app/goals`) still load. GitHub Pages only serves static files, so Gemini there needs the optional worker described above; the in-browser model, Chrome's built-in model and Ollama work without it.

## Team

Atulya Singh · Avash Srivastava · Aayushi Paul · Agustyae Gupta

## License

Released under the [MIT License](LICENSE). You can use, change and share the code, including commercially, as long as the copyright notice stays with it. The licence covers the code only; it doesn't make the projections financial advice (see below).

## Disclaimer

Earn to Equity is an educational project. It is not a SEBI-registered investment adviser, research analyst, stockbroker, insurance intermediary or tax practitioner, and it does not give personal investment, tax, legal or insurance advice. Every projection is an estimate built from assumptions you can change, and real outcomes will differ, sometimes by a lot. Example portfolios are there to show how allocations work, not to recommend anything. Tax figures are dated reference material; check them against official sources or with a qualified professional before acting on them.
