// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = 'mc' | 'tf';

export type Question = {
  type: QuestionType;
  q: string;
  options: string[];
  correct: number;
  explanation: string;
};

export type Lesson = {
  id: string;
  title: string;
  icon: string;
  topics: string[];
  questions: Question[];
  xpReward: number;
  isBonus?: boolean;
};

export type Chapter = {
  id: string;
  unitNumber: number;
  title: string;
  subtitle: string;
  color: string;
  icon: string;
  verse: string;
  verseRef: string;
  lessons: Lesson[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const HEARTS_PER_QUIZ = 3;
export const XP_PER_CORRECT = 10;
export const PERFECT_BONUS = 25;
export const CHAPTER_COMPLETE_BONUS = 50;

export const LEVELS = [
  { level: 1, title: 'Beginner', minXP: 0, maxXP: 49 },
  { level: 2, title: 'Student', minXP: 50, maxXP: 149 },
  { level: 3, title: 'Learner', minXP: 150, maxXP: 299 },
  { level: 4, title: 'Scholar', minXP: 300, maxXP: 499 },
  { level: 5, title: 'Alim', minXP: 500, maxXP: 749 },
  { level: 6, title: 'Master', minXP: 750, maxXP: 99999 },
];

export function getLevel(xp: number) {
  let result = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.minXP) result = l;
  }
  return result;
}

// ─── Helper to build questions ────────────────────────────────────────────────

function mc(q: string, options: [string, string, string, string], correct: 0 | 1 | 2 | 3, explanation: string): Question {
  return { type: 'mc', q, options, correct, explanation };
}

function tf(q: string, correct: boolean, explanation: string): Question {
  return {
    type: 'tf',
    q,
    options: ['True', 'False'],
    correct: correct ? 0 : 1,
    explanation,
  };
}

// ─── CHAPTER 1: Foundations of Islamic Finance ─────────────────────────────────

const ch1_lessons: Lesson[] = [
  {
    id: 'foundations_intro',
    title: 'What is Islamic Finance?',
    icon: 'book-outline',
    topics: ['Core principles', 'Maqasid al-Shariah', 'Real economy focus'],
    xpReward: 40,
    questions: [
      mc('What is the primary goal of Islamic finance?', ['Maximise profit at all costs', 'Comply with Shariah while meeting financial needs', 'Avoid all forms of investment', 'Only serve Muslim customers'], 1, 'Islamic finance aims to meet financial needs while complying with Shariah principles rooted in the Quran and Sunnah.'),
      mc('Which of these is a core principle of Islamic finance?', ['Guaranteed returns on investment', 'Risk and profit sharing', 'Fixed interest on loans', 'Unlimited speculation'], 1, 'Risk and profit sharing (Mudarabah/Musharakah) is fundamental. Both parties must share the outcome rather than one party bearing all risk.'),
      tf('Islamic finance only applies to banking and does not cover insurance or investments.', false, 'Islamic finance covers banking, insurance (Takaful), investments, bonds (Sukuk), mortgages, and more.'),
      mc('Maqasid al-Shariah refers to:', ['Tax regulations', 'The objectives/purposes of Islamic law', 'A type of contract', 'The central bank of Saudi Arabia'], 1, 'Maqasid al-Shariah are the higher objectives of Islamic law: preserving faith, life, intellect, lineage, and wealth.'),
    ],
  },
  {
    id: 'foundations_riba',
    title: 'The Prohibition of Riba',
    icon: 'ban-outline',
    topics: ['What riba means', 'Types of riba', 'Why it is prohibited'],
    xpReward: 40,
    questions: [
      mc('"Riba" literally means:', ['Trade', 'Increase / Excess', 'Decrease', 'Charity'], 1, 'Riba literally means "increase" or "excess." It covers any guaranteed surplus on a loan, not just excessive rates.'),
      mc('Which Surah explicitly states "Allah has permitted trade and forbidden riba"?', ['Surah Al-Imran', 'Surah Al-Baqarah', 'Surah An-Nisa', 'Surah Al-Fatiha'], 1, 'Surah Al-Baqarah (2:275) contains this definitive verse on the prohibition of riba.'),
      tf('Riba only applies to excessively high interest rates, not small ones.', false, 'Any amount of guaranteed interest on a loan is riba, regardless of the rate. The prohibition is absolute.'),
      mc('Riba al-Fadl refers to:', ['Interest on a loan', 'Unequal exchange of the same commodity', 'Late payment penalty', 'Currency speculation'], 1, 'Riba al-Fadl is exchanging the same type of commodity (e.g., gold for gold) in unequal amounts. The Prophet prohibited this.'),
    ],
  },
  {
    id: 'foundations_contracts',
    title: 'Key Islamic Contracts',
    icon: 'document-text-outline',
    topics: ['Murabaha', 'Ijarah', 'Musharakah', 'Mudarabah'],
    xpReward: 40,
    questions: [
      mc('In a Murabaha contract, the bank:', ['Lends money at interest', 'Buys the asset and sells it at a disclosed markup', 'Shares profits equally', 'Acts as a guarantor only'], 1, 'Murabaha: the bank buys an asset at cost and sells it to the customer at a disclosed profit margin. Common in home and car finance.'),
      mc('Ijarah is best described as:', ['A donation contract', 'A leasing/rental contract', 'A loan agreement', 'A profit-sharing arrangement'], 1, 'Ijarah is an Islamic lease. The bank owns the asset and charges rent. Ownership may transfer at the end (Ijarah wa Iqtina).'),
      mc('In Musharakah, who bears the losses?', ['Only the bank', 'Only the customer', 'All partners proportionally', 'No one, losses are insured'], 2, 'In Musharakah, all partners contribute capital and share profits AND losses proportionally. No guaranteed return for any party.'),
      tf('In Mudarabah, the investor provides capital and the entrepreneur provides expertise.', true, 'In Mudarabah, the Rabb-ul-Maal (investor) provides 100% of the capital. The Mudarib contributes expertise. Profits are shared; losses fall on the investor.'),
    ],
  },
  {
    id: 'foundations_halal_haram',
    title: 'Halal vs Haram Wealth',
    icon: 'checkmark-circle-outline',
    topics: ['Prohibited sectors', 'Permissible earnings', 'Purification'],
    xpReward: 40,
    questions: [
      mc('Which sector is generally permissible for investment?', ['Alcohol production', 'Technology/Software', 'Gambling operations', 'Conventional banking'], 1, 'Technology, healthcare, manufacturing, and many other sectors are permissible. Alcohol, gambling, tobacco, and interest-based finance are not.'),
      mc('What is "purification" (Tazkiyah) in investing?', ['Selling all shares annually', 'Donating the haram portion of income to charity', 'Paying extra Zakat', 'Praying before trading'], 1, 'Purification: calculate the proportion of dividends from non-compliant revenue, then donate exactly that fraction to charity.'),
      tf('A Muslim can invest in any company as long as they personally do not consume haram products.', false, 'Investment itself must be Shariah-compliant. Profiting from haram business activities is not permissible regardless of personal consumption.'),
      mc('The maximum non-compliant revenue threshold used by most Shariah boards is:', ['1%', '5%', '10%', '25%'], 1, 'Most Shariah boards (including AAOIFI) set a 5% threshold for non-compliant revenue. Above this, the stock fails screening.'),
    ],
  },
  {
    id: 'foundations_bonus',
    title: 'Foundations Review',
    icon: 'trophy-outline',
    topics: ['Test your knowledge', 'All chapter topics', 'Earn bonus XP'],
    xpReward: 60,
    isBonus: true,
    questions: [
      mc('Islamic finance is built on the principle of:', ['Risk transfer to the borrower', 'Risk and reward sharing', 'Guaranteed fixed returns', 'Government backing'], 1, 'The core ethos is sharing risk and reward. Neither party should bear all risk or receive guaranteed returns without effort.'),
      tf('Murabaha and conventional loans produce the same outcome because both involve paying more than the original price.', false, 'While the total cost may be similar, the structure differs fundamentally: Murabaha involves a real asset sale with disclosed markup, not a money loan with interest.'),
      mc('Which is NOT one of the five Maqasid al-Shariah?', ['Preservation of wealth', 'Preservation of profit', 'Preservation of life', 'Preservation of intellect'], 1, 'The five Maqasid are: faith, life, intellect, lineage, and wealth. "Profit" is not among them.'),
      mc('A Muslim working at a conventional bank earns a salary that is:', ['Automatically halal because it is earned income', 'Subject to scholarly debate', 'Always haram', 'Only haram if they handle loans'], 1, 'This is debated among scholars. Many distinguish between roles directly facilitating riba vs. support roles, though many scholars advise caution.'),
      tf('Takaful is the Islamic alternative to conventional insurance.', true, 'Takaful operates on mutual cooperation and shared risk, unlike conventional insurance which involves gambling elements (gharar) and interest.'),
    ],
  },
];

// ─── CHAPTER 2: Zakat Mastery ─────────────────────────────────────────────────

const ch2_lessons: Lesson[] = [
  {
    id: 'zakat_basics',
    title: 'Zakat Basics',
    icon: 'heart-outline',
    topics: ['Third pillar of Islam', 'Who must pay', 'Spiritual significance'],
    xpReward: 40,
    questions: [
      mc('Zakat is the ___ pillar of Islam.', ['First', 'Second', 'Third', 'Fourth'], 2, 'Zakat is the third pillar of Islam, after Shahada (testimony of faith) and Salah (prayer).'),
      mc('What percentage of zakatable wealth is owed?', ['5%', '2.5%', '10%', '1%'], 1, 'The Prophet set the rate at 2.5%, which is one part in forty of qualifying wealth held for a full lunar year.'),
      tf('Zakat is optional for wealthy Muslims who already give Sadaqah.', false, 'Zakat is obligatory (fard) for every Muslim whose wealth exceeds Nisab for a full Hawl. Sadaqah is voluntary and does not replace Zakat.'),
      mc('The word "Zakat" comes from an Arabic root meaning:', ['Payment', 'Tax', 'Purification and growth', 'Obligation'], 2, 'Zakat derives from "tazkiyah" meaning purification and growth. It purifies the giver\'s wealth and soul while helping those in need.'),
    ],
  },
  {
    id: 'zakat_nisab_hawl',
    title: 'Nisab & Hawl',
    icon: 'timer-outline',
    topics: ['Gold and silver thresholds', 'Lunar year requirement', 'AAOIFI standards'],
    xpReward: 40,
    questions: [
      mc('What is Nisab?', ['A type of prayer', 'The amount of Zakat owed', 'The minimum wealth threshold for Zakat', 'A lunar month'], 2, 'Nisab is the minimum threshold. Only those whose wealth exceeds Nisab for a full Hawl owe Zakat.'),
      mc('The AAOIFI gold Nisab is:', ['100g', '87.48g', '50g', '85g'], 1, 'AAOIFI sets the gold Nisab at 87.48 grams (approximately 7.5 tola). The silver Nisab is 612.36 grams.'),
      mc('One Hawl equals:', ['Six lunar months', 'One solar year (365 days)', 'One lunar year (~354 days)', '40 days'], 2, 'Hawl is one full lunar year, approximately 354.37 days. Wealth must be above Nisab throughout this period.'),
      tf('If your wealth drops below Nisab during the year and then rises above it, the Hawl resets.', true, 'The Hawl resets if wealth falls below Nisab at any point. A new 354-day count begins from when it next exceeds Nisab.'),
    ],
  },
  {
    id: 'zakat_assets',
    title: 'Zakatable Assets',
    icon: 'wallet-outline',
    topics: ['Cash, gold, silver', 'Stocks and investments', 'Business inventory'],
    xpReward: 40,
    questions: [
      mc('Which of these is zakatable?', ['Your primary home', 'Your personal car', 'Cash in savings accounts', 'Clothes you wear'], 2, 'Cash, gold, silver, investments, business inventory, and receivables are zakatable. Personal-use items (home, car, clothes) are not.'),
      tf('You must pay Zakat on the full market value of your shares.', false, 'You owe Zakat on the zakatable portion per share: cash, receivables, and inventory held by the company, not the full market price.'),
      mc('Business inventory is zakatable at:', ['Cost price', 'Current market value', 'Historical average', 'It is not zakatable'], 1, 'Business inventory held for sale is zakatable at its current market value on the Zakat due date.'),
      mc('Debts you owe can be:', ['Added to your zakatable wealth', 'Deducted from your zakatable wealth', 'Ignored completely', 'Only deducted if over Nisab'], 1, 'Debts you owe to others can be deducted from your total zakatable wealth before calculating the 2.5%.'),
    ],
  },
  {
    id: 'zakat_recipients',
    title: 'The Eight Recipients',
    icon: 'people-outline',
    topics: ['Surah At-Tawbah 9:60', 'Eight categories', 'Distribution rules'],
    xpReward: 40,
    questions: [
      mc('How many Zakat recipient categories does the Quran name?', ['5', '10', '4', '8'], 3, 'Surah At-Tawbah (9:60) names eight categories: the poor, the needy, collectors, new Muslims, freeing captives, debtors, in the cause of Allah, and stranded travellers.'),
      mc('"Al-Fuqara" (the poor) refers to those who:', ['Have no income at all', 'Have wealth but below Nisab', 'Cannot meet their basic needs', 'Choose not to work'], 2, 'Al-Fuqara are those who cannot meet their basic needs. They are the primary recipients of Zakat.'),
      tf('Zakat can be given to non-Muslims in need.', true, 'The category "Mu\'allafat al-Qulub" (those whose hearts are to be reconciled) can include non-Muslims. Some scholars also extend other categories.'),
      mc('"Fi Sabilillah" (in the cause of Allah) traditionally covers:', ['Only military expenditure', 'Any good cause', 'Scholars debate: defence, da\'wah, and community projects', 'Building luxury mosques'], 2, 'This is one of the most debated categories. Many scholars include defence, education, da\'wah, and essential community infrastructure.'),
    ],
  },
  {
    id: 'zakat_bonus',
    title: 'Zakat Deep Dive',
    icon: 'trophy-outline',
    topics: ['Challenge questions', 'Edge cases', 'Earn bonus XP'],
    xpReward: 60,
    isBonus: true,
    questions: [
      mc('If gold Nisab = 87.48g at GBP 50/g and silver Nisab = 612.36g at GBP 0.60/g, which Nisab should you use?', ['Gold (GBP 4,374)', 'Silver (GBP 367)', 'Whichever is higher', 'Average of both'], 1, 'Many scholars advise using the lower Nisab (silver) as more people qualify and more Zakat reaches the poor. However, some use gold as it is more stable.'),
      tf('Zakat is due on rental income from investment property.', true, 'Rental income that accumulates as cash/savings is zakatable once it exceeds Nisab for a Hawl. The property itself is not zakatable if held for rental.'),
      mc('A Muslim receives their salary on the 1st of each month. When does the Hawl begin?', ['1st January each year', 'The date their total wealth first exceeded Nisab', 'Their birthday', 'Ramadan 1st'], 1, 'The Hawl begins from the date your total wealth first exceeded Nisab and remained above it. It is a personal date, not a fixed calendar date.'),
      mc('Zakat al-Fitr differs from Zakat al-Maal because:', ['It is a larger amount', 'It is paid per person before Eid al-Fitr', 'It only applies to the wealthy', 'It is paid monthly'], 1, 'Zakat al-Fitr is a per-person obligation due before Eid al-Fitr prayer, typically the value of one meal. Zakat al-Maal is the annual wealth-based obligation.'),
      tf('You can pay Zakat in advance before your Hawl completes.', true, 'Most scholars allow paying Zakat early (ta\'jil). This is particularly common in Ramadan when many prefer to give.'),
    ],
  },
];

// ─── CHAPTER 3: Shariah Screening ─────────────────────────────────────────────

const ch3_lessons: Lesson[] = [
  {
    id: 'screening_basics',
    title: 'How Screening Works',
    icon: 'shield-checkmark-outline',
    topics: ['Two-stage process', 'Business activity screen', 'Financial screen'],
    xpReward: 40,
    questions: [
      mc('Shariah stock screening has how many main stages?', ['One', 'Two', 'Three', 'Five'], 1, 'Two stages: (1) Business Activity Screen checks what the company does, and (2) Financial Ratio Screen checks its balance sheet.'),
      mc('The business activity screen checks whether:', ['The stock price is rising', 'The company operates in a permissible sector', 'The CEO is Muslim', 'The company is profitable'], 1, 'The business activity screen ensures core operations are in a permissible sector, not alcohol, gambling, weapons, or adult entertainment.'),
      tf('A company can pass the business activity screen but still fail the financial screen.', true, 'A halal sector company (e.g., tech) can still fail if it carries too much interest-bearing debt or earns too much from interest income.'),
      mc('Which body sets widely used Shariah screening standards?', ['The World Bank', 'AAOIFI', 'The IMF', 'The Federal Reserve'], 1, 'AAOIFI (Accounting and Auditing Organization for Islamic Financial Institutions) sets widely adopted screening standards.'),
    ],
  },
  {
    id: 'screening_ratios',
    title: 'Financial Ratio Screens',
    icon: 'stats-chart-outline',
    topics: ['Debt-to-assets ratio', 'Interest income threshold', 'Receivables ratio'],
    xpReward: 40,
    questions: [
      mc('AAOIFI requires interest-bearing debt to be below what % of total assets?', ['50%', '10%', '30%', '33%'], 2, 'AAOIFI requires total interest-bearing debt to be below 30% of total assets. Exceeding this makes a company financially non-compliant.'),
      mc('The interest income threshold is typically:', ['Below 5% of total revenue', 'Below 30% of total revenue', 'Below 50% of total revenue', 'No threshold exists'], 0, 'Interest income must be below 5% of total revenue. Companies earning significant interest fail the financial screen.'),
      mc('A compliance score of 80 out of 100 indicates:', ['Marginal pass', 'Needs review', 'Fail', 'Strong pass'], 3, 'Scores of 75+ are a strong pass. 60-74 needs further review. Below 60 is considered non-compliant.'),
      tf('The cash and receivables to total assets ratio must be below 70%.', true, 'This screen ensures the company has real tangible assets backing its value, not just cash and paper receivables.'),
    ],
  },
  {
    id: 'screening_purification',
    title: 'Income Purification',
    icon: 'sparkles-outline',
    topics: ['Why purify', 'How to calculate', 'Where to donate'],
    xpReward: 40,
    questions: [
      mc('Income purification applies when:', ['A stock completely fails screening', 'A compliant stock has a small % of non-compliant income', 'You sell at a loss', 'You buy a new stock'], 1, 'Purification applies to compliant stocks that still have a small portion (under 5%) of non-compliant revenue. You donate that fraction.'),
      mc('To calculate the purification amount, you:', ['Donate 2.5% of dividends', 'Multiply dividends by the company\'s non-compliant revenue percentage', 'Donate all dividends', 'Pay it as Zakat'], 1, 'Find the company\'s non-compliant revenue percentage (e.g., 3%), then donate that percentage of your dividends to charity.'),
      tf('Capital gains (profit from selling shares) also need purification.', true, 'Both dividends and capital gains should be purified according to the non-compliant income ratio. Some scholars differ on capital gains.'),
      mc('Purification donations should be given to:', ['Any cause you choose', 'Only Zakat recipients', 'Charity (not counted as Zakat)', 'The company itself'], 2, 'Purification is given as general charity (Sadaqah). It is not counted as Zakat because it is removing impermissible income, not fulfilling an obligation.'),
    ],
  },
  {
    id: 'screening_practice',
    title: 'Screening in Practice',
    icon: 'search-outline',
    topics: ['Real-world examples', 'Halal ETFs', 'Sector analysis'],
    xpReward: 40,
    questions: [
      mc('Which type of company is MOST likely to pass Shariah screening?', ['A major bank', 'A brewery', 'A software company with no debt', 'A casino operator'], 2, 'Tech/software companies with low or no debt, no haram revenue streams, and tangible operations typically pass both screens easily.'),
      mc('A Halal ETF (Exchange-Traded Fund) is:', ['Any ETF available in Islamic countries', 'An ETF that only holds Shariah-compliant stocks', 'An ETF with zero fees', 'Any ESG-focused ETF'], 1, 'Halal ETFs are pre-screened funds that only include stocks passing Shariah compliance. They simplify halal investing.'),
      tf('The S&P 500 index fund is Shariah-compliant because it includes many tech companies.', false, 'The S&P 500 includes banks, alcohol, gambling, and other non-compliant companies. You need a filtered version like the S&P 500 Shariah Index.'),
      mc('How often should stocks in a portfolio be re-screened?', ['Only when purchased', 'Once a year', 'Quarterly is recommended', 'Never, the initial screen is enough'], 2, 'Companies change over time. Quarterly re-screening catches changes in debt levels, revenue sources, or business activities.'),
    ],
  },
  {
    id: 'screening_bonus',
    title: 'Screening Challenge',
    icon: 'trophy-outline',
    topics: ['Advanced scenarios', 'Edge cases', 'Earn bonus XP'],
    xpReward: 60,
    isBonus: true,
    questions: [
      mc('Company X: tech sector, 25% debt-to-assets, 4% interest income, 65% cash/receivables. Status?', ['Pass', 'Fail: debt too high', 'Fail: interest income too high', 'Fail: cash/receivables too high'], 0, 'Tech (halal sector), debt 25% < 30%, interest 4% < 5%, cash/receivables 65% < 70%. All thresholds met. Pass.'),
      mc('Company Y: food sector, 35% debt-to-assets, 2% interest income. Status?', ['Pass', 'Fail: sector', 'Fail: debt ratio exceeds 30%', 'Fail: interest income'], 2, 'Food sector is halal and interest income is fine, but 35% debt-to-assets exceeds the 30% threshold. Fail.'),
      tf('A company that manufactures medical equipment but has a 6% revenue from financing charges would fail screening.', true, 'While medical equipment is a permissible sector, 6% non-compliant revenue exceeds the 5% threshold, causing the stock to fail.'),
      mc('If you hold a stock that becomes non-compliant after re-screening, you should:', ['Hold and hope it improves', 'Sell immediately at any price', 'Sell within a reasonable timeframe', 'Ignore the change'], 2, 'Scholars advise selling within a reasonable timeframe. You are not required to sell at a loss immediately, but you should plan to exit.'),
      tf('MSCI and AAOIFI use identical screening thresholds.', false, 'Different providers use different thresholds. MSCI uses market cap as denominator while AAOIFI uses total assets. Always check which methodology a fund follows.'),
    ],
  },
];

// ─── CHAPTER 4: Islamic Banking ───────────────────────────────────────────────

const ch4_lessons: Lesson[] = [
  {
    id: 'banking_murabaha',
    title: 'Murabaha & Tawarruq',
    icon: 'home-outline',
    topics: ['Cost-plus financing', 'Home purchase', 'Commodity Murabaha'],
    xpReward: 40,
    questions: [
      mc('In a home Murabaha, the sequence is:', ['Customer borrows money, buys house, repays with interest', 'Bank buys house, sells to customer at agreed markup', 'Customer and bank jointly own the house', 'Bank guarantees a mortgage from another lender'], 1, 'The bank purchases the property first, takes ownership, then sells it to the customer at an agreed-upon markup payable in instalments.'),
      mc('Tawarruq (Commodity Murabaha) is used for:', ['Buying a house', 'Generating cash without interest-based loans', 'Insurance', 'Currency exchange'], 1, 'Tawarruq involves buying a commodity on credit and selling it immediately for cash, generating liquidity without a conventional loan.'),
      tf('The markup in Murabaha is the same as interest because the customer pays more than the original price.', false, 'The key difference is structural: Murabaha involves a genuine sale of an asset with disclosed profit. Interest is a charge on money itself with no underlying asset.'),
      mc('A key requirement of a valid Murabaha contract is:', ['The bank never owns the asset', 'The markup must be below 5%', 'The cost price and markup must be disclosed to the buyer', 'The asset can be fictitious'], 2, 'Full transparency is required. The bank must disclose its purchase price and the markup being charged. Hidden costs invalidate the contract.'),
    ],
  },
  {
    id: 'banking_sukuk',
    title: 'Sukuk (Islamic Bonds)',
    icon: 'document-outline',
    topics: ['Asset-backed certificates', 'Types of Sukuk', 'How they differ from bonds'],
    xpReward: 40,
    questions: [
      mc('Sukuk holders own:', ['A debt obligation from the issuer', 'A proportional share of a tangible underlying asset', 'Shares in the issuing company', 'Nothing, they only earn interest'], 1, 'Sukuk holders own a share of a real asset. Returns come from asset income or appreciation, not from interest payments.'),
      mc('Sukuk al-Ijarah generate returns through:', ['Interest payments', 'Rental income from the underlying asset', 'Stock dividends', 'Currency gains'], 1, 'Sukuk al-Ijarah are backed by a leased asset. Sukuk holders receive a share of the rental income generated.'),
      tf('Sukuk can be structured as Musharakah, Ijarah, or Murabaha.', true, 'Sukuk are versatile. They can be structured around various compliant contracts. Ijarah and Musharakah Sukuk are the most common forms.'),
      mc('The key difference between Sukuk and conventional bonds:', ['Sukuk have higher returns', 'Bonds are backed by assets, Sukuk are not', 'Sukuk must be backed by real assets, bonds are pure debt', 'There is no difference'], 2, 'Conventional bonds are debt instruments paying interest. Sukuk must be linked to tangible assets and returns must come from the asset, not from lending money.'),
    ],
  },
  {
    id: 'banking_partnerships',
    title: 'Musharakah & Mudarabah',
    icon: 'people-outline',
    topics: ['Joint ventures', 'Profit-loss sharing', 'Diminishing Musharakah'],
    xpReward: 40,
    questions: [
      mc('In Mudarabah, who provides the capital?', ['The entrepreneur', 'Both equally', 'A third party', 'The investor/bank (Rabb-ul-Maal)'], 3, 'The Rabb-ul-Maal provides 100% of the capital. The Mudarib (entrepreneur) contributes expertise and management. Profits are shared; losses fall on the investor.'),
      mc('Diminishing Musharakah is commonly used for:', ['Credit cards', 'Home financing (the customer gradually buys out the bank\'s share)', 'Insurance', 'Currency trading'], 1, 'In Diminishing Musharakah, bank and customer co-own the property. The customer pays rent on the bank\'s share and gradually purchases it, gaining full ownership over time.'),
      tf('In Musharakah, profits must be shared in the exact ratio of capital contribution.', false, 'Profit ratios can be agreed upon freely (one partner may get more for active management). However, loss must be shared in proportion to capital contribution.'),
      mc('A key risk for the bank in Mudarabah is:', ['Guaranteed loss', 'The entrepreneur may mismanage the capital', 'Currency fluctuation', 'Regulatory changes'], 1, 'Since the Mudarib has no capital at risk, moral hazard exists. This is why banks require detailed business plans and oversight.'),
    ],
  },
  {
    id: 'banking_gharar',
    title: 'Gharar & Maysir',
    icon: 'alert-circle-outline',
    topics: ['Excessive uncertainty', 'Gambling prohibition', 'Contract validity'],
    xpReward: 40,
    questions: [
      mc('"Gharar" refers to:', ['Interest', 'Excessive uncertainty or ambiguity in a contract', 'Charitable giving', 'Partnership'], 1, 'Gharar means excessive uncertainty: selling fish not yet caught, or a product with undisclosed terms. It can void a contract.'),
      mc('Which of these involves gharar?', ['Buying groceries from a shop', 'Selling "whatever is in this box" for a fixed price', 'Renting an apartment with clear terms', 'Buying shares at market price'], 1, 'Selling unknown contents for a price involves excessive uncertainty. The buyer cannot make an informed decision.'),
      tf('All forms of uncertainty (gharar) are prohibited in Islamic finance.', false, 'Minor, unavoidable uncertainty (gharar yasir) is tolerated. Only excessive uncertainty (gharar fahish) that could lead to disputes or exploitation is prohibited.'),
      mc('Maysir (gambling) is prohibited because:', ['It always leads to losses', 'It creates zero-sum outcomes based purely on chance', 'It is only for non-Muslims', 'It involves too much math'], 1, 'Maysir creates wealth transfer based on chance rather than productive activity. One party gains entirely at the other\'s expense.'),
    ],
  },
  {
    id: 'banking_bonus',
    title: 'Banking Challenge',
    icon: 'trophy-outline',
    topics: ['Complex scenarios', 'Product comparison', 'Earn bonus XP'],
    xpReward: 60,
    isBonus: true,
    questions: [
      mc('Which Islamic product is the closest alternative to a conventional mortgage?', ['Mudarabah', 'Diminishing Musharakah', 'Takaful', 'Salam'], 1, 'Diminishing Musharakah mimics a mortgage: co-ownership where the customer gradually buys out the bank\'s share while paying rent on it.'),
      tf('Conventional insurance is non-compliant due to gharar and maysir elements.', true, 'Conventional insurance involves uncertainty (gharar) about what you receive and gambling elements (maysir). Takaful, based on mutual cooperation, is the alternative.'),
      mc('A "Wa\'d" in Islamic finance is:', ['A binding promise (unilateral undertaking)', 'A type of interest', 'A charitable donation', 'A penalty clause'], 0, 'Wa\'d is a unilateral promise, often used in Islamic finance to structure transactions that would otherwise be difficult to make compliant.'),
      mc('Which statement about Islamic credit cards is TRUE?', ['They charge interest like conventional cards', 'They use a Tawarruq or Ujrah (fee) structure', 'They are identical to conventional cards', 'They do not exist'], 1, 'Islamic credit cards avoid interest by using fee-based (Ujrah) or commodity-based (Tawarruq) structures instead.'),
      tf('An Islamic bank can guarantee depositors a fixed return on their savings.', false, 'Guaranteeing a fixed return would be riba. Islamic savings accounts operate on Mudarabah (profit-sharing) or Wadiah (safekeeping) with discretionary gifts.'),
    ],
  },
];

// ─── CHAPTER 5: Applied Islamic Finance ───────────────────────────────────────

const ch5_lessons: Lesson[] = [
  {
    id: 'applied_crypto',
    title: 'Crypto & Digital Assets',
    icon: 'logo-bitcoin',
    topics: ['Scholarly debate', 'Key concerns', 'DeFi and tokens'],
    xpReward: 40,
    questions: [
      mc('The scholarly position on cryptocurrency is:', ['Universally halal', 'Universally haram', 'Only Bitcoin is halal', 'Ongoing debate requiring individual assessment'], 3, 'Scholars disagree due to debates over whether crypto constitutes genuine wealth (maal), excessive speculation (gharar), and its use cases.'),
      mc('A key Shariah concern with many cryptocurrencies is:', ['They use electricity', 'Excessive speculation and price volatility (gharar)', 'They are digital, not physical', 'They are too new'], 1, 'The extreme volatility and speculative nature of many tokens raises gharar concerns. Utility tokens with real use cases may be viewed differently.'),
      tf('Staking crypto that generates fixed percentage returns could be considered riba.', true, 'If staking guarantees a fixed return on a "deposit" of crypto assets, this mirrors an interest-bearing deposit and raises riba concerns.'),
      mc('DeFi lending protocols are problematic because:', ['They use blockchain', 'They involve lending at fixed interest rates', 'They are decentralised', 'They are too complex'], 1, 'Most DeFi lending involves interest-based lending/borrowing, which is riba regardless of whether a bank or smart contract facilitates it.'),
    ],
  },
  {
    id: 'applied_isa',
    title: 'Halal ISAs & Pensions',
    icon: 'briefcase-outline',
    topics: ['Stocks & Shares ISA', 'Cash ISA concerns', 'Workplace pensions'],
    xpReward: 40,
    questions: [
      mc('Is a Stocks & Shares ISA halal?', ['Always halal', 'Always haram', 'Depends on what is held inside it', 'Only if from an Islamic bank'], 2, 'The ISA is a tax wrapper, neutral in itself. Whether it is halal depends entirely on which funds or shares you invest in through it.'),
      mc('A Cash ISA from an Islamic perspective is:', ['Permissible because it is government-backed', 'Generally not permissible because it pays interest', 'Permissible below Nisab', 'Permissible with purification'], 1, 'A Cash ISA pays interest on savings. Receiving riba in any form, even from a government-backed institution, is not permissible.'),
      tf('You can hold Shariah-compliant funds inside a workplace pension.', true, 'Many workplace pension providers now offer Islamic/Shariah-compliant fund options. Ask your HR or pension provider about switching.'),
      mc('The HSBC Amanah fund or similar Islamic pension funds invest in:', ['Conventional bonds', 'Shariah-screened global equities', 'Cash deposits earning interest', 'Cryptocurrency'], 1, 'Islamic pension funds invest in Shariah-screened equities and Sukuk, avoiding conventional bonds and interest-bearing instruments.'),
    ],
  },
  {
    id: 'applied_ethical',
    title: 'Ethical vs Islamic Investing',
    icon: 'leaf-outline',
    topics: ['ESG overlap', 'Key differences', 'Shared values'],
    xpReward: 40,
    questions: [
      mc('ESG investing and Islamic investing:', ['Are identical', 'Have significant overlap but key differences', 'Are completely unrelated', 'Only differ in name'], 1, 'Both avoid harmful industries and promote social good. But Islamic investing adds financial ratio screens and prohibits interest, which ESG does not.'),
      mc('Which investment would pass ESG but fail Islamic screening?', ['A renewable energy company with 40% debt-to-assets', 'A tobacco company', 'A weapons manufacturer', 'A gambling company'], 0, 'ESG focuses on environmental and social impact but does not screen for interest-bearing debt ratios. This company would fail AAOIFI\'s 30% threshold.'),
      tf('An Islamic fund that invests in compliant stocks is automatically ESG-compliant.', false, 'While there is overlap (both avoid gambling, tobacco), Islamic funds may hold oil companies or lack the specific environmental criteria that ESG requires.'),
      mc('The concept of "Falah" (success/wellbeing) in Islamic economics includes:', ['Only financial profit', 'Material and spiritual wellbeing in this life and the hereafter', 'Only the afterlife', 'Maximising shareholder value'], 1, 'Falah is holistic success: material comfort, spiritual growth, social justice, and wellbeing in both worlds.'),
    ],
  },
  {
    id: 'applied_zakat_investments',
    title: 'Zakat on Investments',
    icon: 'calculator-outline',
    topics: ['Shares', 'Property', 'Crypto'],
    xpReward: 40,
    questions: [
      mc('Zakat on shares is calculated on:', ['Full market value', 'Purchase price only', 'The zakatable portion per share (cash, receivables, inventory)', 'Dividend income only'], 2, 'You owe Zakat on the zakatable portion of what the company holds per share, not the full market price or original purchase price.'),
      mc('Is Zakat due on a rental property?', ['Yes, on the full property value', 'No, property is exempt', 'Only on the accumulated rental income', 'Only if the property is abroad'], 2, 'The property itself is not zakatable if held for rental (not resale). But accumulated rental income held as cash/savings is zakatable.'),
      tf('If you hold cryptocurrency above Nisab for a Hawl, Zakat is due on it.', true, 'Most scholars who consider crypto as wealth (maal) say Zakat is due at 2.5% of its market value if held above Nisab for a full Hawl.'),
      mc('Investment property held for resale is zakatable at:', ['Purchase price', 'Current market value', 'Rental income value', 'It is not zakatable'], 1, 'Property held as trading stock (for resale) is zakatable at current market value, like any other business inventory.'),
    ],
  },
  {
    id: 'applied_bonus',
    title: 'Final Challenge',
    icon: 'trophy-outline',
    topics: ['Everything you have learned', 'Complex scenarios', 'Maximum XP'],
    xpReward: 75,
    isBonus: true,
    questions: [
      mc('Samir has GBP 5,000 cash, GBP 3,000 in a Shariah ETF, and owes GBP 1,500 in debt. Gold Nisab is GBP 4,374. Is Zakat due?', ['No, total is below Nisab', 'Yes, net wealth (GBP 6,500) exceeds Nisab', 'Only on the cash portion', 'Cannot determine without Hawl info'], 1, 'Net zakatable wealth: 5,000 + 3,000 - 1,500 = GBP 6,500. This exceeds the gold Nisab of GBP 4,374, so Zakat is due (assuming Hawl is met).'),
      mc('Amina wants halal home financing in the UK. Her best option is likely:', ['A conventional mortgage with purification', 'Diminishing Musharakah from an Islamic bank', 'Paying cash only', 'A personal loan from family'], 1, 'Diminishing Musharakah from providers like Gatehouse Bank or Al Rayan Bank is the most established halal home financing option in the UK.'),
      tf('A Muslim who accidentally earns interest in a conventional savings account should donate it to charity without expecting reward.', true, 'Accidentally earned interest should be given away to charity. You should not benefit from it, but you also do not earn reward (thawab) for donating haram income.'),
      mc('Which combination represents a fully compliant investment portfolio?', ['Shariah ETF + Cash ISA + Gold', 'Shariah ETF + Islamic pension + Gold', 'S&P 500 + Corporate bonds + Gold', 'Shariah ETF + Conventional bonds + Cash'], 1, 'Shariah ETF (screened stocks), Islamic pension (compliant funds), and gold (halal asset) form a fully compliant portfolio.'),
      tf('Islamic finance is only relevant to Muslims and has no appeal to non-Muslim investors.', false, 'Islamic finance principles of ethical investing, real asset backing, and risk sharing appeal to many non-Muslim investors seeking socially responsible alternatives.'),
    ],
  },
];

// ─── Assemble Chapters ────────────────────────────────────────────────────────

export const CHAPTERS: Chapter[] = [
  {
    id: 'foundations',
    unitNumber: 1,
    title: 'Foundations',
    subtitle: 'Principles of Islamic Finance',
    color: '#1B4D3E',
    icon: 'book-outline',
    verse: 'Allah has permitted trade and forbidden interest.',
    verseRef: 'Surah Al-Baqarah 2:275',
    lessons: ch1_lessons,
  },
  {
    id: 'zakat',
    unitNumber: 2,
    title: 'Zakat Mastery',
    subtitle: 'The Third Pillar',
    color: '#B8860B',
    icon: 'heart-outline',
    verse: 'Take from their wealth a charity to purify and bless them.',
    verseRef: 'Surah At-Tawbah 9:103',
    lessons: ch2_lessons,
  },
  {
    id: 'screening',
    unitNumber: 3,
    title: 'Shariah Screening',
    subtitle: 'Halal Stock Analysis',
    color: '#2E86AB',
    icon: 'shield-checkmark-outline',
    verse: 'Do not consume one another\'s wealth unjustly.',
    verseRef: 'Surah An-Nisa 4:29',
    lessons: ch3_lessons,
  },
  {
    id: 'banking',
    unitNumber: 4,
    title: 'Islamic Banking',
    subtitle: 'Contracts & Products',
    color: '#6B4C9A',
    icon: 'business-outline',
    verse: 'Give up all outstanding interest if you are true believers.',
    verseRef: 'Surah Al-Baqarah 2:278',
    lessons: ch4_lessons,
  },
  {
    id: 'applied',
    unitNumber: 5,
    title: 'Applied Finance',
    subtitle: 'Modern Challenges',
    color: '#D4632A',
    icon: 'rocket-outline',
    verse: 'Whoever fears Allah, He will make a way out for them.',
    verseRef: 'Surah At-Talaq 65:2',
    lessons: ch5_lessons,
  },
];

// ─── Flat helpers for backward compat ─────────────────────────────────────────

export const ALL_LESSONS = CHAPTERS.flatMap((ch) =>
  ch.lessons.map((l) => ({ ...l, chapterId: ch.id, chapterColor: ch.color }))
);

export function getTotalLessons() {
  return ALL_LESSONS.length;
}

export function getTotalQuestions() {
  return ALL_LESSONS.reduce((sum, l) => sum + l.questions.length, 0);
}

// ─── Unlock logic ─────────────────────────────────────────────────────────────

export function isLessonUnlocked(
  chapterIndex: number,
  lessonIndex: number,
  stars: Record<string, number>
): boolean {
  // First lesson of first chapter is always unlocked
  if (chapterIndex === 0 && lessonIndex === 0) return true;

  if (lessonIndex > 0) {
    // Previous lesson in same chapter must be completed (stars > 0)
    const chapter = CHAPTERS[chapterIndex];
    const prevLesson = chapter.lessons[lessonIndex - 1];
    return (stars[`${chapter.id}_${prevLesson.id}`] ?? 0) > 0;
  }

  // First lesson of chapter N: all lessons in chapter N-1 must be completed
  const prevChapter = CHAPTERS[chapterIndex - 1];
  return prevChapter.lessons.every(
    (l) => (stars[`${prevChapter.id}_${l.id}`] ?? 0) > 0
  );
}

export function isChapterComplete(
  chapterIndex: number,
  stars: Record<string, number>
): boolean {
  const chapter = CHAPTERS[chapterIndex];
  return chapter.lessons.every(
    (l) => (stars[`${chapter.id}_${l.id}`] ?? 0) > 0
  );
}

export function getStarsForLesson(
  heartsRemaining: number,
  totalHearts: number
): number {
  if (heartsRemaining === totalHearts) return 3; // Perfect
  if (heartsRemaining >= totalHearts - 1) return 2; // One mistake
  return 1; // Two+ mistakes but still passed
}
