export const BRAND = {
  navy: '#0F2554',
  white: '#FFFFFF',
  teal: '#0AAFAA',
  canvas: '#F8F9FC',
  surface: '#FFFFFF',
  text: '#374151',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  shadow: '0 24px 70px rgba(15, 37, 84, 0.08)',
};

export type SituationType =
  | 'job_hunting'
  | 'earn_more'
  | 'career_change'
  | 'work_for_myself'
  | 'business_growth'
  | 'starting_out'
  | 'return_to_work'
  | 'future_proof';

export const SITUATION_LABELS: Record<SituationType, string> = {
  job_hunting: "I'm job hunting and need an edge",
  earn_more: 'I want to earn more or get promoted',
  career_change: 'I want to change careers completely',
  work_for_myself: 'I want to work for myself',
  business_growth: 'I run my own business and want to grow it',
  starting_out: "I'm just starting out and don't know where to begin",
  return_to_work: "I've been out of work and I'm ready to return",
  future_proof: "I'm settled but want to future-proof my career",
};

export const SITUATION_OPTIONS = Object.entries(SITUATION_LABELS).map(([value, label]) => ({
  value: value as SituationType,
  label,
}));

export const PATH_QUESTION_SETS: Record<
  SituationType,
  {
    question: string;
    options: { label: string; value: string; affirmation: string }[];
  }[]
> = {
  job_hunting: [
    {
      question: 'What would make your next job search feel truly different?',
      options: [
        { label: 'More interview invitations', value: 'more_interviews', affirmation: 'Momentum starts with opportunity.' },
        { label: 'A clearer resume story', value: 'clear_resume', affirmation: 'Clarity makes your experience easier to believe.' },
        { label: 'A stronger network response', value: 'strong_network', affirmation: 'A well-timed reach-out can unlock doors.' },
      ],
    },
    {
      question: 'Which outcome matters most in the next 90 days?',
      options: [
        { label: 'A confident offer in hand', value: 'offer_confidence', affirmation: 'Success is a collection of small, clear wins.' },
        { label: 'A fresher personal brand', value: 'fresh_brand', affirmation: 'Your story is an asset worth sharpening.' },
        { label: 'A stronger interview performance', value: 'better_interviews', affirmation: 'Preparation makes every conversation feel easier.' },
      ],
    },
    {
      question: 'What feels like the biggest barrier right now?',
      options: [
        { label: 'Competing in a crowded market', value: 'crowded_market', affirmation: 'Differentiation is the fastest way past noise.' },
        { label: 'Not knowing which companies fit', value: 'company_fit', affirmation: 'The right target makes the work feel rewarding.' },
        { label: 'Turning applications into interviews', value: 'applications_to_interviews', affirmation: 'Small changes to outreach can change the whole flow.' },
      ],
    },
  ],
  earn_more: [
    {
      question: 'What motivates you most about earning more?',
      options: [
        { label: 'More freedom with money', value: 'financial_freedom', affirmation: 'More freedom gives you more choices.' },
        { label: 'A stronger professional title', value: 'stronger_title', affirmation: 'Title and confidence travel together.' },
        { label: 'New responsibilities that excite me', value: 'new_responsibilities', affirmation: 'Growth is most sustainable when it feels energizing.' },
      ],
    },
    {
      question: 'What would feel like a meaningful promotion move?',
      options: [
        { label: 'A role with more influence', value: 'more_influence', affirmation: 'Influence is impact plus trust.' },
        { label: 'A title that matches my ambition', value: 'ambitious_title', affirmation: 'Ambition is just the first step toward a better role.' },
        { label: 'Stronger compensation for my skills', value: 'better_compensation', affirmation: 'Being paid what you deserve is also a recognition moment.' },
      ],
    },
    {
      question: 'What is holding your progress back today?',
      options: [
        { label: 'Not being visible to decision makers', value: 'visibility', affirmation: 'Visibility is the bridge between talent and opportunity.' },
        { label: 'Unclear promotion plan', value: 'unclear_plan', affirmation: 'A better plan makes every step more certain.' },
        { label: 'Not having strong proof of impact', value: 'proof_of_impact', affirmation: 'Clear impact is what gets the raise approved.' },
      ],
    },
  ],
  career_change: [
    {
      question: 'What feels most exciting about changing careers?',
      options: [
        { label: 'A completely new mission', value: 'new_mission', affirmation: 'Fresh purpose can make your work feel alive again.' },
        { label: 'A new set of skills to master', value: 'new_skills', affirmation: 'Learning something new is one of the clearest growth signals.' },
        { label: 'More creative or flexible work', value: 'creative_flex', affirmation: 'Freedom to choose your work style is a powerful advantage.' },
      ],
    },
    {
      question: 'What do you want to keep from your current experience?',
      options: [
        { label: 'Leadership or teamwork skills', value: 'leadership_skills', affirmation: 'Transferable skills are more valuable than you think.' },
        { label: 'Industry knowledge, just in a new way', value: 'industry_knowledge', affirmation: 'Your experience can be an unexpected strength.' },
        { label: 'A higher level of stability', value: 'stability', affirmation: 'A smart pivot keeps you grounded while you change direction.' },
      ],
    },
    {
      question: 'What worries you most about the switch?',
      options: [
        { label: 'Starting at the bottom again', value: 'starting_over', affirmation: 'New beginnings often start from a strong foundation.' },
        { label: 'Losing the progress I already made', value: 'losing_progress', affirmation: 'A good plan protects your momentum.' },
        { label: 'Not knowing the right next step', value: 'unknown_next_step', affirmation: 'The right next step is simpler once the direction is clear.' },
      ],
    },
  ],
  work_for_myself: [
    {
      question: 'What would make working for yourself feel successful?',
      options: [
        { label: 'A reliable income stream', value: 'reliable_income', affirmation: 'Stability is a huge win in independent work.' },
        { label: 'Clients who respect my expertise', value: 'respected_clients', affirmation: 'The right clients amplify everything you build.' },
        { label: 'More control over my schedule', value: 'schedule_control', affirmation: 'Flexibility is one of the biggest benefits of ownership.' },
      ],
    },
    {
      question: 'What kind of work do you want to do for yourself?',
      options: [
        { label: 'Project-based work for clients', value: 'project_work', affirmation: 'Project work is a great way to build momentum and proof.' },
        { label: 'A product or service I own', value: 'own_product', affirmation: 'Owning a product gives you long-term leverage.' },
        { label: 'Consulting or coaching work', value: 'consulting_coaching', affirmation: 'Helping others is one of the fastest ways to grow your reputation.' },
      ],
    },
    {
      question: 'What is the biggest block in your business mindset?',
      options: [
        { label: 'Feeling like I need all the answers first', value: 'answers_first', affirmation: 'Progress often follows action, not perfect answers.' },
        { label: 'Not having consistent client demand', value: 'client_demand', affirmation: 'Consistent demand is the compounding advantage.' },
        { label: 'Not knowing how to charge what I deserve', value: 'pricing_confidence', affirmation: 'Pricing with confidence helps you attract the right work.' },
      ],
    },
  ],
  business_growth: [
    {
      question: 'What growth outcome would feel most meaningful?',
      options: [
        { label: 'More customers in a predictable way', value: 'predictable_customers', affirmation: 'Predictability makes growth less stressful.' },
        { label: 'Better margins on what you already sell', value: 'better_margins', affirmation: 'Stronger margins make your business healthier fast.' },
        { label: 'A clearer brand that attracts your ideal buyers', value: 'clear_brand', affirmation: 'A strong brand simplifies every decision.' },
      ],
    },
    {
      question: 'Where do you want the business to feel stronger?',
      options: [
        { label: 'Sales and closing more reliably', value: 'sales_closing', affirmation: 'Reliable sales are the most dependable growth lever.' },
        { label: 'Operations that don’t require you in every detail', value: 'operational_leverage', affirmation: 'Leverage is the secret to scaling without burning out.' },
        { label: 'Marketing that feels authentic to your values', value: 'authentic_marketing', affirmation: 'Authenticity connects with the right audience faster.' },
      ],
    },
    {
      question: 'What keeps you from growing faster today?',
      options: [
        { label: 'Not enough time to focus on strategy', value: 'time_strategy', affirmation: 'A clearer plan gives you more time to focus on growth.' },
        { label: 'Uncertain where to invest next', value: 'investment_uncertainty', affirmation: 'The right investment is the one that improves your momentum.' },
        { label: 'Feeling like growth is too risky', value: 'growth_risk', affirmation: 'Calculated growth can feel safe when the steps are clear.' },
      ],
    },
  ],
  starting_out: [
    {
      question: 'What would help you feel most confident starting out?',
      options: [
        { label: 'A clear first career direction', value: 'career_direction', affirmation: 'A clear direction is the first real advantage.' },
        { label: 'A simple plan for what to learn first', value: 'learn_first', affirmation: 'A learning plan turns overwhelm into action.' },
        { label: 'Knowing what employers value most', value: 'employer_value', affirmation: 'Knowing value helps you make better moves faster.' },
      ],
    },
    {
      question: 'What worries you the most right now?',
      options: [
        { label: 'Not having enough experience yet', value: 'experience_worry', affirmation: 'Experience grows faster once you start with purpose.' },
        { label: 'Choosing the wrong path too soon', value: 'wrong_path', affirmation: 'A flexible start is better than a stuck decision.' },
        { label: 'Not getting noticed by employers', value: 'not_noticed', affirmation: 'Visibility can change everything in a short time.' },
      ],
    },
    {
      question: 'What would feel like a strong first milestone?',
      options: [
        { label: 'A role with growth potential', value: 'role_growth', affirmation: 'Growth potential is the strongest early advantage.' },
        { label: 'A learning path that feels practical', value: 'practical_learning', affirmation: 'Practical learning makes progress tangible.' },
        { label: 'A network of people who can support me', value: 'support_network', affirmation: 'A network is the difference between trying and moving forward.' },
      ],
    },
  ],
  return_to_work: [
    {
      question: 'What matters most as you prepare to return?',
      options: [
        { label: 'Confidence in my skills again', value: 'skill_confidence', affirmation: 'Confidence is the foundation of every strong return.' },
        { label: 'A smooth way back into a role', value: 'smooth_return', affirmation: 'A thoughtful return makes the transition feel easier.' },
        { label: 'Finding work that respects my gap', value: 'respect_gap', affirmation: 'The right role sees your break as part of your story.' },
      ],
    },
    {
      question: 'What feels like the biggest obstacle today?',
      options: [
        { label: 'Not being sure where to apply', value: 'where_to_apply', affirmation: 'The right targets make your return much stronger.' },
        { label: 'Gaps in my recent experience', value: 'experience_gaps', affirmation: 'Strategic storytelling can make gaps feel normal.' },
        { label: 'Getting noticed by hiring teams', value: 'noticed_by_hiring', affirmation: 'The right approach gets your profile into the right hands.' },
      ],
    },
    {
      question: 'What will make this return feel successful?',
      options: [
        { label: 'A role I feel proud of', value: 'proud_role', affirmation: 'Pride in your next role is a powerful signal of progress.' },
        { label: 'A job that uses my best strengths', value: 'best_strengths', affirmation: 'Strength-based roles set you up to win faster.' },
        { label: 'A path that feels sustainable', value: 'sustainable_path', affirmation: 'A sustainable return is a return you can keep building on.' },
      ],
    },
  ],
  future_proof: [
    {
      question: 'What does future-proofing mean to you?',
      options: [
        { label: 'Keeping my skills in demand', value: 'demand_skills', affirmation: 'Demand-proof skills are the clearest form of career security.' },
        { label: 'Being ready for change', value: 'ready_for_change', affirmation: 'Readiness makes change feel like opportunity.' },
        { label: 'Maintaining leverage in my work', value: 'work_leverage', affirmation: 'Leverage helps you stay ahead of uncertainty.' },
      ],
    },
    {
      question: 'What would help you feel more resilient?',
      options: [
        { label: 'A stronger personal brand', value: 'personal_brand', affirmation: 'Your reputation is one of the most resilient assets you have.' },
        { label: 'A broader set of options', value: 'broader_options', affirmation: 'More options make every decision feel safer.' },
        { label: 'A path that adapts easily', value: 'adaptable_path', affirmation: 'Adaptability is the best shield against uncertainty.' },
      ],
    },
    {
      question: 'What is the best way to protect your career?',
      options: [
        { label: 'Building skills that last', value: 'lasting_skills', affirmation: 'Lasting skills are the foundation of long-term confidence.' },
        { label: 'Creating visible progress each month', value: 'visible_progress', affirmation: 'Visible progress keeps your career moving forward.' },
        { label: 'Investing in relationships and networks', value: 'relationships', affirmation: 'Relationships are the most valuable long-term career asset.' },
      ],
    },
  ],
};

export const FINAL_QUICK_OPTIONS = [
  'A clearer path for the next 6 months',
  'A stronger story that opens doors',
  'A plan that makes progress feel real',
  'A confidence boost that helps me act now',
];
