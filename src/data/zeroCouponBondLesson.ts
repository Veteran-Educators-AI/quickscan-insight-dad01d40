// Comprehensive Zero-Coupon Bond Lesson Plan with Examples

export interface LessonExample {
  title: string;
  scenario: string;
  given: string[];
  solution: string[];
  answer: string;
  teachingTip?: string;
}

export interface LessonSection {
  title: string;
  content: string;
  keyPoints?: string[];
  formula?: string;
  examples?: LessonExample[];
}

export interface DetailedLessonPlan {
  topic: string;
  standard: string;
  duration: string;
  objective: string;
  prerequisiteSkills: string[];
  vocabulary: { term: string; definition: string }[];
  sections: LessonSection[];
  practiceProblems: LessonExample[];
  extensionActivities: string[];
  assessmentQuestions: string[];
}

export const ZERO_COUPON_BOND_LESSON: DetailedLessonPlan = {
  topic: 'Zero-Coupon Bonds',
  standard: 'FIN.14.14',
  duration: '90 minutes (2 class periods)',
  objective: 'Students will understand how zero-coupon bonds work, calculate purchase prices, determine yield to maturity, and evaluate the total return on investment.',
  
  prerequisiteSkills: [
    'Understanding of basic bond terminology (face value, maturity)',
    'Exponent and root operations',
    'Percentage calculations',
    'Present value concepts',
  ],
  
  vocabulary: [
    { term: 'Zero-Coupon Bond', definition: 'A bond that pays no periodic interest but is sold at a deep discount and pays face value at maturity.' },
    { term: 'Face Value (Par Value)', definition: 'The amount the bondholder receives when the bond matures, typically $1,000.' },
    { term: 'Discount', definition: 'The difference between face value and purchase price; this IS the investor\'s return.' },
    { term: 'Yield to Maturity (YTM)', definition: 'The annualized rate of return if the bond is held until maturity.' },
    { term: 'Imputed Interest', definition: 'The "phantom" interest that must be reported for taxes each year, even though no cash is received.' },
    { term: 'Accreted Value', definition: 'The bond\'s value as it gradually increases toward face value over time.' },
  ],
  
  sections: [
    {
      title: 'Introduction: What Makes Zero-Coupon Bonds Different?',
      content: 'Unlike traditional bonds that pay interest (coupons) every 6 months or year, zero-coupon bonds pay NO periodic interest. Instead, investors buy the bond at a significant discount and receive the full face value when it matures. The difference between purchase price and face value IS the investor\'s total return.',
      keyPoints: [
        'No periodic interest payments',
        'Sold at a deep discount to face value',
        'Single payment at maturity (face value)',
        'All return comes from price appreciation',
        'Common examples: U.S. Treasury STRIPS, savings bonds',
      ],
    },
    {
      title: 'Calculating the Purchase Price',
      content: 'To find what an investor should pay for a zero-coupon bond today, we use the present value formula. The purchase price depends on the face value, the required yield (interest rate), and the time until maturity.',
      formula: 'Purchase Price = Face Value ÷ (1 + r)ⁿ\n\nWhere:\n• Face Value = Amount received at maturity\n• r = Yield to maturity (as decimal)\n• n = Years until maturity',
      examples: [
        {
          title: 'Example 1: Basic Price Calculation',
          scenario: 'An investor wants to buy a zero-coupon bond with a face value of $1,000 that matures in 10 years. The current yield is 5%.',
          given: [
            'Face Value = $1,000',
            'Yield (r) = 5% = 0.05',
            'Years to Maturity (n) = 10',
          ],
          solution: [
            'Purchase Price = $1,000 ÷ (1 + 0.05)¹⁰',
            'Purchase Price = $1,000 ÷ (1.05)¹⁰',
            'Purchase Price = $1,000 ÷ 1.6289',
            'Purchase Price = $613.91',
          ],
          answer: 'The investor should pay $613.91 for this bond.',
          teachingTip: 'Point out that the investor pays about 61% of face value and earns the remaining 39% as profit over 10 years.',
        },
        {
          title: 'Example 2: Short-Term Bond',
          scenario: 'A company issues a 3-year zero-coupon bond with $5,000 face value. If the market yield is 4%, what is the purchase price?',
          given: [
            'Face Value = $5,000',
            'Yield (r) = 4% = 0.04',
            'Years to Maturity (n) = 3',
          ],
          solution: [
            'Purchase Price = $5,000 ÷ (1 + 0.04)³',
            'Purchase Price = $5,000 ÷ (1.04)³',
            'Purchase Price = $5,000 ÷ 1.1249',
            'Purchase Price = $4,444.98',
          ],
          answer: 'The purchase price is $4,444.98.',
          teachingTip: 'Shorter maturity = smaller discount. Compare to the 10-year example to show how time affects price.',
        },
      ],
    },
    {
      title: 'Calculating Yield to Maturity (YTM)',
      content: 'If you know the purchase price and face value, you can calculate what yield (return) the bond offers. This tells investors whether the bond is a good deal compared to other investments.',
      formula: 'YTM = (Face Value ÷ Purchase Price)^(1/n) - 1\n\nWhere:\n• Face Value = Amount received at maturity\n• Purchase Price = What you paid\n• n = Years until maturity',
      examples: [
        {
          title: 'Example 3: Finding the Yield',
          scenario: 'An investor buys a zero-coupon bond for $750 that will pay $1,000 in 5 years. What is the yield to maturity?',
          given: [
            'Face Value = $1,000',
            'Purchase Price = $750',
            'Years to Maturity (n) = 5',
          ],
          solution: [
            'YTM = ($1,000 ÷ $750)^(1/5) - 1',
            'YTM = (1.3333)^(0.2) - 1',
            'YTM = 1.0592 - 1',
            'YTM = 0.0592 = 5.92%',
          ],
          answer: 'The yield to maturity is 5.92%.',
          teachingTip: 'Ask students: Is 5.92% a good return? Compare to current savings account rates or other investments.',
        },
      ],
    },
    {
      title: 'Calculating Total Return on Investment',
      content: 'For zero-coupon bonds, the total return is simply the difference between what you receive at maturity and what you paid. We can express this as a dollar amount or as a percentage.',
      formula: 'Total Gain = Face Value - Purchase Price\n\nROI Percentage = (Total Gain ÷ Purchase Price) × 100%',
      examples: [
        {
          title: 'Example 4: Total Return Analysis',
          scenario: 'An investor purchases a 20-year zero-coupon Treasury bond with a $10,000 face value for $3,769. Calculate the total return.',
          given: [
            'Face Value = $10,000',
            'Purchase Price = $3,769',
            'Time = 20 years',
          ],
          solution: [
            'Total Gain = $10,000 - $3,769 = $6,231',
            'ROI Percentage = ($6,231 ÷ $3,769) × 100%',
            'ROI Percentage = 165.3%',
            'Annualized Yield = ($10,000 ÷ $3,769)^(1/20) - 1 = 5.0%',
          ],
          answer: 'Total gain is $6,231 (165.3% return over 20 years), which equals a 5.0% annual yield.',
          teachingTip: 'Emphasize: The 165% total return sounds huge, but spread over 20 years it\'s "only" 5% per year. This teaches the difference between total return and annualized return.',
        },
      ],
    },
    {
      title: 'Tax Implications: Phantom Income',
      content: 'Even though zero-coupon bonds don\'t pay interest until maturity, the IRS requires investors to pay taxes on "imputed" or "phantom" interest each year. This is the amount the bond increases in value annually.',
      formula: 'Annual Accreted Value = Previous Value × (1 + YTM)\n\nPhantom Interest = Current Year Value - Previous Year Value',
      keyPoints: [
        'You pay taxes on interest you haven\'t actually received yet',
        'This is called "original issue discount" (OID) taxation',
        'Many investors hold zero-coupon bonds in tax-advantaged accounts (IRA, 401k) to avoid this issue',
        'Municipal zero-coupon bonds may be tax-exempt',
      ],
      examples: [
        {
          title: 'Example 5: Calculating Phantom Income',
          scenario: 'An investor buys a 5-year zero-coupon bond for $783.53 with a face value of $1,000 (YTM = 5%). Calculate the phantom income for Year 1 and Year 2.',
          given: [
            'Purchase Price = $783.53',
            'YTM = 5%',
            'Face Value = $1,000',
          ],
          solution: [
            'Year 0 (Purchase): Value = $783.53',
            'Year 1 Value = $783.53 × 1.05 = $822.71',
            'Year 1 Phantom Income = $822.71 - $783.53 = $39.18',
            'Year 2 Value = $822.71 × 1.05 = $863.84',
            'Year 2 Phantom Income = $863.84 - $822.71 = $41.13',
          ],
          answer: 'Year 1 phantom income: $39.18. Year 2 phantom income: $41.13. The investor owes taxes on these amounts even though no cash was received.',
          teachingTip: 'Create a full 5-year table on the board. Notice how phantom income increases each year (compounding effect).',
        },
      ],
    },
    {
      title: 'Comparing Zero-Coupon Bonds to Regular Bonds',
      content: 'Zero-coupon bonds offer unique advantages and disadvantages compared to traditional coupon-paying bonds.',
      keyPoints: [
        'Advantage: No reinvestment risk (no coupons to reinvest)',
        'Advantage: Known exact return if held to maturity',
        'Advantage: Lower initial investment required',
        'Disadvantage: No periodic income stream',
        'Disadvantage: More price volatility (higher duration)',
        'Disadvantage: Phantom income tax liability',
        'Best for: Education savings, retirement accounts, matching future liabilities',
      ],
    },
  ],
  
  practiceProblems: [
    {
      title: 'Practice 1: College Savings',
      scenario: 'Parents want to have $25,000 for their child\'s college in 15 years. If zero-coupon bonds yield 4.5%, how much should they invest today?',
      given: ['Face Value = $25,000', 'YTM = 4.5%', 'n = 15 years'],
      solution: [
        'Price = $25,000 ÷ (1.045)¹⁵',
        'Price = $25,000 ÷ 1.9353',
        'Price = $12,918.71',
      ],
      answer: 'They need to invest $12,918.71 today.',
    },
    {
      title: 'Practice 2: Comparing Yields',
      scenario: 'Bond A costs $800 and matures at $1,000 in 4 years. Bond B costs $600 and matures at $1,000 in 8 years. Which has the higher yield?',
      given: ['Bond A: Price=$800, FV=$1,000, n=4', 'Bond B: Price=$600, FV=$1,000, n=8'],
      solution: [
        'Bond A YTM = (1000/800)^(1/4) - 1 = 5.74%',
        'Bond B YTM = (1000/600)^(1/8) - 1 = 6.59%',
      ],
      answer: 'Bond B has a higher yield (6.59% vs 5.74%), but requires waiting 8 years instead of 4.',
    },
    {
      title: 'Practice 3: Investment Decision',
      scenario: 'You have $5,000 to invest. Zero-coupon bonds are available at 6% yield with 10-year maturity. How much will your investment grow to?',
      given: ['Initial Investment = $5,000', 'YTM = 6%', 'n = 10 years'],
      solution: [
        'Future Value = $5,000 × (1.06)¹⁰',
        'Future Value = $5,000 × 1.7908',
        'Future Value = $8,954.24',
        'Total Gain = $8,954.24 - $5,000 = $3,954.24',
      ],
      answer: 'Your $5,000 will grow to $8,954.24 (a gain of $3,954.24).',
    },
    {
      title: 'Practice 4: Municipal Bond Analysis',
      scenario: 'A municipal zero-coupon bond with $10,000 face value is priced at $7,500 with 6 years to maturity. Calculate the tax-free yield.',
      given: ['Face Value = $10,000', 'Price = $7,500', 'n = 6 years'],
      solution: [
        'YTM = (10000/7500)^(1/6) - 1',
        'YTM = (1.3333)^(0.1667) - 1',
        'YTM = 1.0491 - 1 = 4.91%',
      ],
      answer: 'The tax-free yield is 4.91%. For someone in the 24% tax bracket, this equals a taxable yield of 6.46%.',
    },
    {
      title: 'Practice 5: Building a Bond Ladder',
      scenario: 'An investor wants to create income for retirement. They buy three zero-coupon bonds: $10,000 face maturing in 5 years at 4%, $10,000 face maturing in 10 years at 4.5%, and $10,000 face maturing in 15 years at 5%. What is the total investment needed today?',
      given: [
        'Bond 1: FV=$10,000, r=4%, n=5',
        'Bond 2: FV=$10,000, r=4.5%, n=10',
        'Bond 3: FV=$10,000, r=5%, n=15',
      ],
      solution: [
        'Bond 1 Price = $10,000 ÷ (1.04)⁵ = $8,219.27',
        'Bond 2 Price = $10,000 ÷ (1.045)¹⁰ = $6,439.28',
        'Bond 3 Price = $10,000 ÷ (1.05)¹⁵ = $4,810.17',
        'Total Investment = $8,219.27 + $6,439.28 + $4,810.17 = $19,468.72',
      ],
      answer: 'Total investment needed: $19,468.72 to receive $30,000 over 15 years.',
    },
  ],
  
  extensionActivities: [
    'Research current Treasury STRIP prices and calculate their yields',
    'Create a spreadsheet showing phantom income for a 10-year zero-coupon bond',
    'Compare zero-coupon bonds to Series EE Savings Bonds',
    'Calculate the "break-even" tax rate where a municipal zero-coupon bond beats a taxable bond',
    'Design a college savings plan using zero-coupon bonds maturing in different years',
  ],
  
  assessmentQuestions: [
    'Why do zero-coupon bonds sell at a discount to face value?',
    'How does the time to maturity affect the purchase price of a zero-coupon bond?',
    'What is phantom income and why does it create a tax issue for investors?',
    'Calculate the purchase price of a $5,000 face value zero-coupon bond maturing in 8 years with a 6% yield.',
    'An investor paid $4,000 for a zero-coupon bond that will pay $5,500 in 7 years. What is the yield to maturity?',
    'Why might an investor choose to hold zero-coupon bonds in an IRA instead of a regular brokerage account?',
  ],
};

// Helper function to get lesson content for AI generation
export function getZeroCouponBondLessonContent(): string {
  const lesson = ZERO_COUPON_BOND_LESSON;
  
  let content = `# ${lesson.topic}\n\n`;
  content += `**Standard:** ${lesson.standard}\n`;
  content += `**Duration:** ${lesson.duration}\n`;
  content += `**Objective:** ${lesson.objective}\n\n`;
  
  content += `## Key Vocabulary\n`;
  lesson.vocabulary.forEach(v => {
    content += `- **${v.term}**: ${v.definition}\n`;
  });
  content += '\n';
  
  lesson.sections.forEach(section => {
    content += `## ${section.title}\n`;
    content += `${section.content}\n\n`;
    
    if (section.formula) {
      content += `**Formula:**\n\`\`\`\n${section.formula}\n\`\`\`\n\n`;
    }
    
    if (section.keyPoints) {
      content += `**Key Points:**\n`;
      section.keyPoints.forEach(kp => {
        content += `• ${kp}\n`;
      });
      content += '\n';
    }
    
    if (section.examples) {
      section.examples.forEach(ex => {
        content += `### ${ex.title}\n`;
        content += `${ex.scenario}\n\n`;
        content += `**Given:** ${ex.given.join(', ')}\n\n`;
        content += `**Solution:**\n`;
        ex.solution.forEach(step => {
          content += `${step}\n`;
        });
        content += `\n**Answer:** ${ex.answer}\n\n`;
      });
    }
  });
  
  content += `## Practice Problems\n`;
  lesson.practiceProblems.forEach((prob, i) => {
    content += `### Problem ${i + 1}: ${prob.title.replace('Practice ' + (i+1) + ': ', '')}\n`;
    content += `${prob.scenario}\n`;
    content += `**Answer:** ${prob.answer}\n\n`;
  });
  
  return content;
}
