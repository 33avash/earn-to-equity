import { formatINR, formatPct } from '@/finance/money';
import { projectSip, sipFutureValue } from '@/finance/sip';
import { inflate, realReturn, toReal, emi } from '@/finance/rates';
import { simulatePayoff } from '@/finance/debt';
import { PRESETS, portfolioVolatility, weightedReturn, DEFAULT_RETURNS, DEFAULT_VOLATILITY } from '@/finance/portfolio';

export interface QuizQ {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}
export interface LearnModule {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  body: string[];
  example: { title: string; lines: [string, string][]; note: string };
  takeaways: string[];
  quiz: QuizQ[];
  links: { label: string; url: string }[];
  tool?: { label: string; to: string };
}

const L = {
  sebi: { label: 'SEBI — Investor education portal', url: 'https://investor.sebi.gov.in/' },
  rbi: { label: 'Reserve Bank of India — public awareness', url: 'https://www.rbi.org.in/' },
  amfi: { label: 'AMFI — Mutual fund investor resources', url: 'https://www.amfiindia.com/' },
  nism: { label: 'NISM — Investor awareness', url: 'https://www.nism.ac.in/' },
  pfrda: { label: 'PFRDA — National Pension System', url: 'https://www.pfrda.org.in/' },
  epfo: { label: 'EPFO — Provident Fund', url: 'https://www.epfindia.gov.in/' },
  it: { label: 'Income Tax Department', url: 'https://www.incometax.gov.in/' },
  ncfe: { label: 'NCFE — National Centre for Financial Education', url: 'https://ncfe.org.in/' },
};

const sip20 = projectSip({ monthly: 10000, years: 20, annualReturn: 0.11 });
const sip10 = projectSip({ monthly: 10000, years: 10, annualReturn: 0.11 });
const late = sipFutureValue(20000, 0.11, 120);
const ccRes = simulatePayoff([{ id: 'c', kind: 'creditCard', label: 'Card', balance: 100000, rate: 0.36, emi: 5000 }], 0, 'avalanche');
const balancedRet = weightedReturn(PRESETS.balanced.weights, DEFAULT_RETURNS);
const growthVol = portfolioVolatility(PRESETS.growth.weights, DEFAULT_VOLATILITY);
const consVol = portfolioVolatility(PRESETS.conservative.weights, DEFAULT_VOLATILITY);

export const MODULES: LearnModule[] = [
  {
    id: 'budgeting',
    title: 'Budgeting that survives real life',
    minutes: 5,
    summary: 'Separate what you must pay, what you choose to spend and what you move towards your future.',
    body: [
      'A budget is a decision about where each rupee of take-home pay goes before the month begins. It is not a record of what already happened. The most useful split is essentials (rent, groceries, EMIs), lifestyle choices (dining, shopping, travel) and transfers to savings and investments.',
      'Transfers are not expenses. Money moved into a SIP or an emergency fund still belongs to you. Counting it as spending makes your situation look worse than it is, and it hides how much you are really saving.',
      'The 50/30/20 framework (needs, wants, savings) is a useful reference, not a rule. With high rent in a metro or support to parents, "needs" can be well above 50%. What matters is that the savings line is deliberate and positive.',
    ],
    example: {
      title: 'Take-home pay of ₹60,000',
      lines: [
        ['Essentials (rent, food, transport)', formatINR(30000)],
        ['Lifestyle', formatINR(15000)],
        ['Investable surplus', formatINR(15000)],
        ['Savings rate', formatPct(15000 / 60000)],
      ],
      note: 'Cutting lifestyle spending by ₹3,000 raises the savings rate from 25% to 30%.',
    },
    takeaways: ['Pay yourself first: set up the SIP the day salary arrives.', 'Savings and investments are transfers, not costs.', 'Use 50/30/20 as a mirror, not a mould.'],
    quiz: [
      { q: 'Which of these is a transfer rather than an expense?', options: ['Rent', 'A monthly SIP', 'A phone bill', 'A restaurant meal'], answer: 1, explain: 'A SIP moves money into an asset you still own.' },
      { q: 'In 50/30/20, the 20% refers to…', options: ['Rent', 'Wants', 'Savings and debt repayment', 'Taxes'], answer: 2, explain: '20% goes to savings and extra debt repayment.' },
      { q: 'Your savings rate is best measured as…', options: ['Savings ÷ expenses', 'Surplus ÷ income', 'Investments ÷ net worth', 'EMI ÷ income'], answer: 1, explain: 'Share of income left after expenses and repayments.' },
    ],
    links: [L.rbi, L.ncfe],
    tool: { label: 'Open the Budget Planner', to: '/app/budget' },
  },
  {
    id: 'compounding',
    title: 'Compounding: why time beats timing',
    minutes: 4,
    summary: 'Returns earn returns. The earlier you start, the more of your final corpus comes from growth, not from your own contributions.',
    body: [
      'Compounding means your gains are reinvested and earn gains of their own. In the early years the effect is barely visible. In later years it does most of the work.',
      'This is why starting early matters more than investing large amounts later. A decade of delay usually cannot be made up by doubling your contributions.',
    ],
    example: {
      title: '₹10,000 a month at an assumed 11% a year',
      lines: [
        ['After 10 years', formatINR(sip10.corpus)],
        ['After 20 years', formatINR(sip20.corpus)],
        ['Contributed over 20 years', formatINR(sip20.totalContributions)],
        ['₹20,000/month for only 10 years', formatINR(late)],
      ],
      note: `Doubling the amount but starting 10 years later ends with ${formatINR(late)}, far short of ${formatINR(sip20.corpus)}.`,
    },
    takeaways: ['Start small, start now.', 'The final years of a long plan generate most of the growth.', 'Interrupting an SIP costs more than the missed instalments.'],
    quiz: [
      { q: 'Compounding means…', options: ['Earning a fixed amount every year', 'Earning returns on previous returns', 'Investing in many funds', 'Paying less tax'], answer: 1, explain: 'Gains are reinvested and earn their own gains.' },
      { q: 'Which usually builds a larger corpus?', options: ['₹10k/month for 20 years', '₹20k/month for 10 years', 'They are always equal', 'It depends only on the fund'], answer: 0, explain: 'The longer period gives compounding more time to work.' },
      { q: 'In a long SIP, most growth tends to occur…', options: ['In the first year', 'Evenly every year', 'In the later years', 'Only when markets crash'], answer: 2, explain: 'Growth accelerates as the base becomes larger.' },
    ],
    links: [L.sebi, L.amfi],
    tool: { label: 'Try the SIP Calculator', to: '/app/sip' },
  },
  {
    id: 'inflation',
    title: 'Inflation and the value of future rupees',
    minutes: 4,
    summary: 'A crore in 20 years will not buy what a crore buys today. Always ask: in today’s rupees, what is that worth?',
    body: [
      'Inflation steadily raises prices. At 6% a year, prices roughly double every 12 years. Projections in future rupees can therefore look impressive while buying far less.',
      'Earn to Equity shows both values: nominal future rupees (the amount on your statement) and real values in today’s purchasing power. Goals are entered in today’s prices and inflated to their target year.',
      `Your real return is roughly the nominal return minus inflation. More precisely it is (1 + return) ÷ (1 + inflation) − 1. An 11% return with 6% inflation is a real return of about ${formatPct(realReturn(0.11, 0.06))}.`,
    ],
    example: {
      title: 'At 6% inflation',
      lines: [
        ['₹1 crore in 20 years, in today’s rupees', formatINR(toReal(1e7, 0.06, 20))],
        ['A ₹10 lakh car today costs in 10 years', formatINR(inflate(1e6, 0.06, 10))],
        ['Real return on a 7% FD', formatPct(realReturn(0.07, 0.06))],
      ],
      note: 'Cash and low-yield deposits can lose purchasing power even when the balance grows.',
    },
    takeaways: ['Compare goals in today’s rupees.', 'Real return = growth above inflation.', 'Education and healthcare costs often rise faster than general inflation.'],
    quiz: [
      { q: 'At 6% inflation, prices double roughly every…', options: ['6 years', '12 years', '20 years', '50 years'], answer: 1, explain: 'Rule of 72: 72 ÷ 6 ≈ 12 years.' },
      { q: 'A 7% deposit with 7% inflation has a real return of about…', options: ['7%', '14%', '0%', '−7%'], answer: 2, explain: 'Growth exactly matches price increases.' },
      { q: '“Today’s rupees” means…', options: ['Nominal value', 'Purchasing power adjusted for inflation', 'Value after tax', 'Value in US dollars'], answer: 1, explain: 'It removes the effect of assumed inflation.' },
    ],
    links: [L.rbi, L.sebi],
  },
  {
    id: 'sip',
    title: 'SIPs and step-ups',
    minutes: 4,
    summary: 'A systematic investment plan turns investing into a habit. Raising it every year keeps pace with your salary.',
    body: [
      'A SIP invests a fixed amount at regular intervals, usually monthly, into a mutual fund. Because the amount is fixed, it buys more units when prices are low and fewer when they are high. This is called rupee-cost averaging.',
      'A step-up SIP raises the monthly amount each year, for example by 10% when your salary is revised. It is one of the simplest ways to stop lifestyle creep from absorbing raises.',
    ],
    example: {
      title: '₹10,000 a month for 20 years at an assumed 11%',
      lines: [
        ['Flat SIP', formatINR(sip20.corpus)],
        ['With a 10% annual step-up', formatINR(projectSip({ monthly: 10000, years: 20, annualReturn: 0.11, stepUp: 0.1 }).corpus)],
      ],
      note: 'The step-up contributes more money, and that extra money also compounds.',
    },
    takeaways: ['Automate the SIP so it does not depend on willpower.', 'Step up the SIP when your salary rises.', 'Returns vary year to year; SIPs smooth entry prices but not outcomes.'],
    quiz: [
      { q: 'Rupee-cost averaging means a fixed SIP buys…', options: ['The same units each month', 'More units when prices are low', 'Only when markets rise', 'Guaranteed returns'], answer: 1, explain: 'A fixed amount buys more units at lower prices.' },
      { q: 'A step-up SIP…', options: ['Reduces risk to zero', 'Raises the monthly amount periodically', 'Is a type of FD', 'Locks money for 15 years'], answer: 1, explain: 'It typically rises once a year.' },
      { q: 'Do SIPs guarantee positive returns?', options: ['Yes', 'No', 'Only in debt funds', 'Only after 5 years'], answer: 1, explain: 'Market-linked investments can lose value.' },
    ],
    links: [L.amfi, L.sebi],
    tool: { label: 'Compare flat and step-up SIPs', to: '/app/sip' },
  },
  {
    id: 'allocation',
    title: 'Asset allocation',
    minutes: 5,
    summary: 'How you split money between equity, debt, gold and cash matters more for your experience than which individual fund you pick.',
    body: [
      'Each asset class behaves differently. Equities have historically offered higher long-run growth with deep drawdowns. Debt and government-backed schemes are steadier with lower expected returns. Gold often behaves differently from both.',
      'Your allocation should reflect when you need the money. Money for a goal two years away does not belong in equities. Money for retirement in 30 years can usually tolerate more volatility.',
    ],
    example: {
      title: 'Balanced example allocation (educational)',
      lines: [
        ['Indian equities', '40%'],
        ['International equities', '10%'],
        ['Debt & government schemes', '40%'],
        ['Gold & cash', '10%'],
        ['Weighted assumed return', formatPct(balancedRet)],
      ],
      note: 'An example of how the arithmetic works, not a recommendation.',
    },
    takeaways: ['Match the asset to the goal’s time horizon.', 'Allocation drives most of the ups and downs you experience.', 'Rebalance occasionally instead of chasing recent winners.'],
    quiz: [
      { q: 'Money needed in 18 months is usually better suited to…', options: ['Small-cap equity', 'Debt or liquid instruments', 'Crypto', 'Real estate'], answer: 1, explain: 'Short horizons cannot wait out equity drawdowns.' },
      { q: 'Weighted return is…', options: ['The best-performing fund', 'The average of asset returns weighted by allocation', 'Return after tax', 'A guaranteed rate'], answer: 1, explain: 'Each asset’s return × its share, summed.' },
      { q: 'Rebalancing means…', options: ['Selling everything', 'Restoring target weights', 'Switching funds monthly', 'Stopping SIPs'], answer: 1, explain: 'Bringing drifted weights back to target.' },
    ],
    links: [L.sebi, L.nism],
    tool: { label: 'Open the Portfolio Builder', to: '/app/portfolio' },
  },
  {
    id: 'diversification',
    title: 'Diversification',
    minutes: 3,
    summary: 'Spreading money across assets that do not move together reduces the damage any one of them can do.',
    body: [
      'Diversification is not owning many funds. Five large-cap funds largely hold the same companies. True diversification spreads across asset classes, sectors, company sizes and geographies.',
      'It cannot remove market-wide risk, but it reduces the chance that one bad bet derails a goal.',
    ],
    example: {
      title: 'Overlap check',
      lines: [
        ['5 large-cap equity funds', 'Low diversification'],
        ['Equity + debt + gold + international', 'Broader diversification'],
      ],
      note: 'Check the underlying holdings as well as the fund names.',
    },
    takeaways: ['Diversify across asset classes, not fund names.', 'International equity adds geographic diversification.', 'Concentration in your employer’s stock adds career and portfolio risk together.'],
    quiz: [
      { q: 'Owning five large-cap funds is…', options: ['Highly diversified', 'Often heavily overlapping', 'Risk-free', 'Required by SEBI'], answer: 1, explain: 'They frequently hold the same top companies.' },
      { q: 'Diversification can eliminate…', options: ['All risk', 'Market-wide risk', 'Some company-specific risk', 'Inflation'], answer: 2, explain: 'It reduces specific risk, not systemic risk.' },
      { q: 'Which adds geographic diversification?', options: ['A second Nifty fund', 'International equity', 'More FDs', 'A savings account'], answer: 1, explain: 'It spreads exposure beyond India.' },
    ],
    links: [L.sebi, L.amfi],
  },
  {
    id: 'volatility',
    title: 'Volatility and drawdowns',
    minutes: 4,
    summary: 'Volatility measures how much values swing. A drawdown is the fall from a peak. Both are normal, and both are survivable if you plan for them.',
    body: [
      'A portfolio with 15% volatility might typically move 15% above or below its average in a year, and occasionally much more. Equity markets in India have experienced falls of 30–50% during crises before recovering over periods that varied widely.',
      'The real risk is being forced to sell during a fall, for example because there is no emergency fund or the money is needed for a near-term goal. The Risk Lab lets you test exactly this.',
    ],
    example: {
      title: 'Simplified volatility estimates (educational)',
      lines: [
        ['Conservative example', formatPct(consVol)],
        ['Growth example', formatPct(growthVol)],
      ],
      note: 'These use assumed volatilities and a single correlation. They are not forecasts.',
    },
    takeaways: ['Expect declines; plan so you never have to sell during one.', 'An emergency fund protects your investments.', 'Past recoveries do not guarantee future ones.'],
    quiz: [
      { q: 'A drawdown is…', options: ['A withdrawal', 'A fall from a previous peak', 'An annual fee', 'A tax'], answer: 1, explain: 'Measured from the high point to the low point.' },
      { q: 'What most often turns volatility into permanent loss?', options: ['Holding', 'Selling at the bottom', 'Rebalancing', 'Diversifying'], answer: 1, explain: 'Forced or panic selling crystallises the loss.' },
      { q: 'Higher volatility usually means…', options: ['Guaranteed higher returns', 'Larger swings in value', 'Lower fees', 'Tax benefits'], answer: 1, explain: 'It describes the size of the swings, not the reward.' },
    ],
    links: [L.sebi, L.nism],
    tool: { label: 'Stress-test in the Risk Lab', to: '/app/risk-lab' },
  },
  {
    id: 'debt',
    title: 'Good debt, costly debt',
    minutes: 5,
    summary: 'Interest is the price of time. Credit card balances at 36%+ a year cost more than almost any investment can be expected to earn.',
    body: [
      'Debt is not automatically bad. A reasonably priced home or education loan can fund an appreciating asset or a higher income. Revolving credit card balances and high-rate personal loans erode wealth quickly.',
      'There are two common repayment strategies. Avalanche pays the highest interest rate first and minimises interest. Snowball pays the smallest balance first and gives quick wins. The Debt Planner compares both with your own loans.',
      `A useful check is the EMI-to-income ratio. Many lenders become cautious above 40–50%. Planning comfortably is easier below about 30%.`,
    ],
    example: {
      title: '₹1 lakh card balance at 36%, paying ₹5,000 a month',
      lines: [
        ['Months to clear', String(ccRes.months)],
        ['Interest paid', formatINR(ccRes.totalInterest)],
        ['EMI on ₹10 lakh at 9% over 5 years', formatINR(emi(1e6, 0.09, 60))],
      ],
      note: 'Paying only the minimum on a card can take years and cost a large share of the original balance.',
    },
    takeaways: ['Clear high-interest debt before investing aggressively.', 'Avalanche saves the most interest; snowball can build momentum.', 'Watch your EMI-to-income ratio.'],
    quiz: [
      { q: 'The avalanche method pays first…', options: ['The smallest balance', 'The highest interest rate', 'The newest loan', 'The home loan'], answer: 1, explain: 'That minimises total interest.' },
      { q: 'Credit card interest in India is often around…', options: ['3–4% a year', '8–10% a year', '30–45% a year', '0%'], answer: 2, explain: 'Revolving card balances carry very high rates.' },
      { q: 'EMI-to-income ratio measures…', options: ['Repayments ÷ income', 'Debt ÷ assets', 'Interest ÷ principal', 'Income ÷ expenses'], answer: 0, explain: 'The share of income going to loan payments.' },
    ],
    links: [L.rbi, L.ncfe],
    tool: { label: 'Compare repayment strategies', to: '/app/emergency-debt' },
  },
  {
    id: 'tax',
    title: 'Tax awareness for young investors',
    minutes: 6,
    summary: 'How common Indian investments are taxed: equity, debt, EPF, PPF, NPS and ELSS. This is education, not tax advice.',
    body: [
      'Tax treatment changes with Union Budgets, and from April 2026 provisions may be renumbered under the new Income-tax Act, 2025. The figures in this module are dated reference values you can edit. Always verify with official sources or a qualified professional.',
      'Since FY 2023-24 the new tax regime has been the default. Many deductions familiar from the old regime, such as Section 80C for ELSS, PPF and EPF, are not available under it.',
    ],
    example: {
      title: 'See the Tax Awareness page',
      lines: [['Equity, debt, EPF, PPF, NPS, ELSS', 'Dated & configurable']],
      note: 'The Tax Awareness page includes an illustrative capital-gains calculator using the editable assumptions.',
    },
    takeaways: ['Check which tax regime you are in before choosing tax-saving products.', 'Holding period changes how equity gains are taxed.', 'Tax rules change; verify before acting.'],
    quiz: [
      { q: 'Under the new regime, Section 80C deductions are…', options: ['Fully available', 'Generally not available', 'Doubled', 'Only for ELSS'], answer: 1, explain: 'Most 80C deductions apply only under the old regime.' },
      { q: 'ELSS funds have a lock-in of…', options: ['None', '1 year', '3 years', '15 years'], answer: 2, explain: 'ELSS has a 3-year lock-in.' },
      { q: 'PPF has a maturity period of…', options: ['5 years', '10 years', '15 years', '30 years'], answer: 2, explain: 'PPF matures after 15 years, with extensions possible.' },
    ],
    links: [L.it, L.epfo, L.pfrda],
    tool: { label: 'Open Tax Awareness', to: '/app/learn/tax-awareness' },
  },
  {
    id: 'retirement',
    title: 'Retirement building blocks: EPF, PPF and NPS',
    minutes: 5,
    summary: 'India’s retirement products are long-term, partly locked in and often tax-advantaged. Understand what each one is for.',
    body: [
      'EPF is the salaried default. Employer and employee each contribute a share of basic pay, and EPFO declares the interest rate annually. PPF is a 15-year government-backed scheme open to anyone. NPS is a market-linked pension product regulated by PFRDA, with part of the corpus used to buy an annuity at retirement.',
      'These products work best as the steady base of a retirement plan. Your flexible investments sit on top.',
    ],
    example: {
      title: '₹3,600 a month into EPF for 30 years at an assumed 8.25%',
      lines: [
        ['Projected balance', formatINR(sipFutureValue(3600, 0.0825, 360))],
        ['Contributed', formatINR(3600 * 360)],
      ],
      note: 'Simplified. Real EPF contributions rise with salary, and rates are declared each year.',
    },
    takeaways: ['EPF, PPF and NPS are long-term and partly illiquid.', 'Rates and rules change; check official sites.', 'Do not count locked-in money towards near-term goals.'],
    quiz: [
      { q: 'Who regulates NPS?', options: ['RBI', 'SEBI', 'PFRDA', 'IRDAI'], answer: 2, explain: 'The Pension Fund Regulatory and Development Authority.' },
      { q: 'The EPF interest rate is…', options: ['Fixed forever', 'Declared periodically by EPFO', 'Set by your employer', 'Linked to gold'], answer: 1, explain: 'EPFO declares it, usually annually.' },
      { q: 'Should EPF count towards a car purchase next year?', options: ['Yes', 'No — it is long-term money', 'Only half', 'Only after tax'], answer: 1, explain: 'Withdrawals are restricted; keep it for its purpose.' },
    ],
    links: [L.epfo, L.pfrda, L.it],
  },
  {
    id: 'fi',
    title: 'Financial independence',
    minutes: 5,
    summary: 'Financial independence means your investments could cover your living costs. Work becomes a choice, not a requirement.',
    body: [
      'A common simplification divides annual expenses by a withdrawal rate. At 3.5%, ₹10 lakh of annual spending implies a corpus of about ₹2.86 crore. Many Indian planners suggest a lower rate than the US-derived 4% because of higher inflation and longer lifespans.',
      'This is a planning shorthand, not a guarantee. Sequence-of-returns risk, healthcare costs, longevity and changing tax rules can all undermine a simple withdrawal-rate model.',
    ],
    example: {
      title: 'Annual expenses of ₹8 lakh in today’s rupees',
      lines: [
        ['FI target at 3.5% withdrawal', formatINR(800000 / 0.035)],
        ['FI target at 4% withdrawal', formatINR(800000 / 0.04)],
        ['Same target in 20 years at 6% inflation (3.5%)', formatINR(inflate(800000 / 0.035, 0.06, 20))],
      ],
      note: 'Small changes in the withdrawal assumption change the target a lot.',
    },
    takeaways: ['FI target ≈ annual expenses ÷ withdrawal rate.', 'Lower spending cuts the target and frees more to invest.', 'No withdrawal rate is guaranteed to be safe.'],
    quiz: [
      { q: 'At a 4% withdrawal rate, the target corpus is…', options: ['4× annual expenses', '25× annual expenses', '40× annual expenses', '100× monthly expenses'], answer: 1, explain: '1 ÷ 0.04 = 25.' },
      { q: 'Reducing expenses affects FI by…', options: ['Only lowering the target', 'Only increasing savings', 'Lowering the target and increasing savings', 'Nothing'], answer: 2, explain: 'It works on both sides of the equation.' },
      { q: 'A withdrawal-rate model…', options: ['Guarantees lifelong income', 'Is a simplified planning estimate', 'Is set by SEBI', 'Ignores inflation by law'], answer: 1, explain: 'It is a rule of thumb with real limitations.' },
    ],
    links: [L.sebi, L.pfrda],
    tool: { label: 'Open Financial Independence', to: '/app/fi' },
  },
];

export const LANDING_TOPICS = ['compounding', 'inflation', 'debt', 'diversification', 'fi'];
