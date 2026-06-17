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

/**
 * The eight starting situations a new user can pick from. Plain-English values
 * so the saved data reads clearly in the data store.
 */
export type SituationType =
  | 'job-hunting'
  | 'promotion'
  | 'career-change'
  | 'self-employed-aspiring'
  | 'self-employed-growing'
  | 'just-starting'
  | 'returning'
  | 'future-proofing';

export type SituationOption = {
  value: SituationType;
  label: string;
  emoji: string;
  accent: string;
};

/** Cards on the situation screen, in display order. */
export const SITUATION_OPTIONS: SituationOption[] = [
  { value: 'job-hunting', emoji: '🔍', label: "I'm looking for a job and need help standing out", accent: '#3B82F6' },
  { value: 'promotion', emoji: '📈', label: 'I want a pay rise or a step up', accent: '#8B5CF6' },
  { value: 'career-change', emoji: '🔄', label: 'I want to do something completely different', accent: '#F59E0B' },
  { value: 'self-employed-aspiring', emoji: '🚀', label: 'I want to go self-employed or start something', accent: '#10B981' },
  { value: 'self-employed-growing', emoji: '💻', label: 'I work for myself and want to earn more or grow', accent: '#06B6D4' },
  { value: 'just-starting', emoji: '🌱', label: "I'm new to all this and need help getting started", accent: '#EC4899' },
  { value: 'returning', emoji: '↩️', label: "I've had time out of work and I'm ready to go back", accent: '#F97316' },
  { value: 'future-proofing', emoji: '🛡️', label: "I'm settled but want to make sure I'm not left behind", accent: '#6366F1' },
];

export const SITUATION_LABELS: Record<SituationType, string> = SITUATION_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.label;
    return acc;
  },
  {} as Record<SituationType, string>,
);

export const SITUATION_ACCENTS: Record<SituationType, string> = SITUATION_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.accent;
    return acc;
  },
  {} as Record<SituationType, string>,
);

export const SITUATION_EMOJIS: Record<SituationType, string> = SITUATION_OPTIONS.reduce(
  (acc, option) => {
    acc[option.value] = option.emoji;
    return acc;
  },
  {} as Record<SituationType, string>,
);

/**
 * The warm one-liner shown under the name input once the user has typed their
 * first name. `[name]` is filled in at render time.
 */
export const SITUATION_NAME_RESPONSES: Record<SituationType, string> = {
  'job-hunting': "Nice to meet you [name]. Let's get you that job.",
  promotion: "Nice to meet you [name]. Let's build your case for more.",
  'career-change': "Nice to meet you [name]. Let's work out the best way to get there.",
  'self-employed-aspiring': "Nice to meet you [name]. Let's help you make the move.",
  'self-employed-growing': "Nice to meet you [name]. Let's help you grow it.",
  'just-starting': "Nice to meet you [name]. Let's figure out where to begin.",
  returning: "Nice to meet you [name]. Let's get you back out there.",
  'future-proofing': "Nice to meet you [name]. Let's make sure you stay ahead.",
};

/**
 * A single path question — either a set of choice cards (each with its own
 * micro-affirmation) or a free-text box. `columns` lets a choice question
 * override the default layout (used where a 6-option set must stay in a single
 * column rather than a grid).
 */
export type PathChoiceOption = { label: string; value: string; affirmation: string };

export type PathQuestion =
  | { kind: 'choice'; question: string; options: PathChoiceOption[]; columns?: 1 | 2 }
  | { kind: 'text'; question: string; placeholder: string; affirmation: string };

export const PATH_QUESTION_SETS: Record<SituationType, PathQuestion[]> = {
  'job-hunting': [
    {
      kind: 'choice',
      question: 'How long have you been looking?',
      options: [
        { label: 'Just getting started — feeling optimistic', value: 'just_started', affirmation: "Perfect timing — let's make sure you start strong." },
        { label: 'A few weeks in — making progress', value: 'few_weeks', affirmation: "Good momentum. Let's sharpen everything up." },
        { label: "1 to 3 months — starting to wonder what's not working", value: '1_3_months', affirmation: "That instinct is right — something isn't landing. Let's find it." },
        { label: '3 to 6 months — getting frustrated if honest', value: '3_6_months', affirmation: "Frustration is valid. Let's work out exactly what's not working." },
        { label: 'More than 6 months — really need this to change', value: 'over_6_months', affirmation: "Six months takes real persistence. Let's make the next application count." },
      ],
    },
    {
      kind: 'choice',
      question: "What's happening when you apply?",
      options: [
        { label: 'Not getting any responses', value: 'no_responses', affirmation: 'This usually means the CV or the targeting needs work — very fixable.' },
        { label: 'Getting responses but no interviews', value: 'no_interviews', affirmation: 'Good sign. Interview prep will make the difference.' },
        { label: 'Getting interviews but not getting the job', value: 'no_offers', affirmation: "You're close. This is about fine-tuning not starting over." },
        { label: "Haven't started applying yet", value: 'not_started', affirmation: 'Smart to get prepared before you begin.' },
        { label: 'It varies — no clear pattern', value: 'varies', affirmation: "Let's look at everything and find the pattern." },
      ],
    },
    {
      kind: 'text',
      question: 'What kind of role are you going for?',
      placeholder: 'e.g. HGV driver in the North West, warehouse team leader, marketing manager',
      affirmation: 'Got it — that gives us a clear target to aim at.',
    },
  ],
  promotion: [
    {
      kind: 'choice',
      question: 'Are you looking to move up where you are or somewhere new?',
      options: [
        { label: 'Stay and get promoted where I am', value: 'internal', affirmation: 'Internal promotion is very achievable with the right approach.' },
        { label: 'Move to a new employer at a higher level', value: 'new_employer', affirmation: "A new company can mean a significant step up. Let's position you right." },
        { label: 'Either — I just want to move up', value: 'either', affirmation: "Keeping options open is smart. Let's build the strongest possible case." },
      ],
    },
    {
      kind: 'text',
      question: "What's your current job and how long have you been doing it?",
      placeholder: 'e.g. Warehouse supervisor — 3 years / Delivery driver — 5 years / Marketing manager — 2 years',
      affirmation: "Thanks — that's the background we need.",
    },
    {
      kind: 'choice',
      question: 'What do you think is holding you back?',
      options: [
        { label: 'I need to show more of what I can do', value: 'show_more', affirmation: "Your results need to be visible. Let's make that happen." },
        { label: 'I need to get better at certain things', value: 'skills', affirmation: "Specific skill gaps are fixable. Let's find the right ones." },
        { label: "I don't push myself forward enough", value: 'self_promotion', affirmation: 'Knowing how to ask is half the battle. We can help with that.' },
        { label: "The right people don't know what I'm capable of", value: 'visibility', affirmation: "Visibility is underrated. Let's work on that." },
        { label: "Honestly I'm not sure — I need a fresh perspective", value: 'not_sure', affirmation: 'Sometimes an outside view is exactly what’s needed.' },
      ],
    },
  ],
  'career-change': [
    {
      kind: 'text',
      question: 'What are you moving away from — and what are you thinking of moving towards?',
      placeholder: 'e.g. Been a nurse for 10 years, thinking about moving into training or management',
      affirmation: "Thanks for sharing that — it's a good place to start.",
    },
    {
      kind: 'choice',
      question: 'How clear is your direction right now?',
      options: [
        { label: 'I know exactly what I want to do next', value: 'clear', affirmation: "Having a clear target makes everything easier. Let's go." },
        { label: "I have a couple of ideas I'm weighing up", value: 'few_ideas', affirmation: "Let's help you work out which one fits best." },
        { label: 'I know I want something different but not sure what yet', value: 'unsure', affirmation: "That's completely normal. We'll help you figure it out." },
      ],
    },
    {
      kind: 'choice',
      question: 'What worries you most about making this change?',
      options: [
        { label: 'Having to start again on a lower wage', value: 'lower_wage', affirmation: "A temporary dip is often worth it. Let's look at the real numbers." },
        { label: 'Not having the right qualifications or experience', value: 'qualifications', affirmation: "You might need less than you think. Let's check." },
        { label: 'Whether employers will give a career changer a chance', value: 'a_chance', affirmation: 'Career changers get hired every day. Framing is everything.' },
        { label: 'Making the wrong decision and regretting it', value: 'wrong_decision', affirmation: "Let's make sure it's the right call before you make any moves." },
        { label: "Whether it's even possible at this point in my life", value: 'possible', affirmation: 'It is possible. The route just needs to be right for you.' },
      ],
    },
  ],
  'self-employed-aspiring': [
    {
      kind: 'choice',
      question: "Do you know what you'd offer?",
      options: [
        { label: 'Yes — I know exactly what I want to do', value: 'clear', affirmation: 'Having clarity on your offer is the best possible start.' },
        { label: "I have a couple of ideas I'm thinking about", value: 'few_ideas', affirmation: "Let's help you work out which one to go with." },
        { label: "I want to work for myself but haven't figured out what yet", value: 'unsure', affirmation: "That's where most people start. Let's work it out together." },
      ],
    },
    {
      kind: 'choice',
      question: "What's your situation right now?",
      options: [
        { label: "I'm employed and thinking about leaving at some point", value: 'employed_leaving', affirmation: 'Having income while you plan is a big advantage.' },
        { label: "I'm employed and want to do both for a while", value: 'employed_both', affirmation: 'Running both is very common and very doable.' },
        { label: "I'm not working at the moment", value: 'not_working', affirmation: 'Being self-employed could be the right next move.' },
        { label: 'I was made redundant recently', value: 'redundant', affirmation: "Many people go self-employed after redundancy. Let's explore it." },
      ],
    },
    {
      kind: 'choice',
      question: 'What feels like the biggest thing stopping you?',
      options: [
        { label: 'Getting enough work and clients', value: 'clients', affirmation: "Client work is a skill — and it's learnable." },
        { label: 'The risk of not having a regular income', value: 'income_risk', affirmation: 'There are ways to manage this better than most people think.' },
        { label: 'Not knowing where to actually start', value: 'where_to_start', affirmation: "There is a clear starting point. Let's find yours." },
        { label: "Not being sure I'm good enough to charge for what I do", value: 'good_enough', affirmation: "If people have paid for it before you're good enough." },
        { label: 'The security of having a regular wage', value: 'security', affirmation: "The trade-off is real. Let's look at it honestly." },
      ],
    },
  ],
  'self-employed-growing': [
    {
      kind: 'text',
      question: 'Tell me what you do and who your best clients are',
      placeholder: 'e.g. Plumber working mainly for landlords and letting agents in Manchester',
      affirmation: "Great — now we know who you're best placed to help.",
    },
    {
      kind: 'choice',
      question: 'How long have you been doing this?',
      options: [
        { label: 'Less than a year — still getting going', value: 'under_1_year', affirmation: 'Early days are the best time to get the foundations right.' },
        { label: '1 to 2 years — starting to get somewhere', value: '1_2_years', affirmation: "You've proven it works. Now let's scale it." },
        { label: '2 to 5 years — established and want to grow', value: '2_5_years', affirmation: 'Established is a great place to grow from.' },
        { label: 'More than 5 years — ready for the next level', value: 'over_5_years', affirmation: "Experience like yours is a real asset. Let's use it." },
      ],
    },
    {
      kind: 'choice',
      question: "What's the single biggest thing holding you back?",
      options: [
        { label: 'Not enough work coming in', value: 'not_enough_work', affirmation: "Lead generation is fixable. Let's look at where your best clients come from." },
        { label: "The work I get doesn't pay well enough", value: 'low_pay', affirmation: 'Pricing is one of the biggest changes you can make.' },
        { label: "I'm flat out but still not making enough", value: 'busy_not_enough', affirmation: 'This is a pricing and efficiency problem. Very solvable.' },
        { label: "I want to grow but don't know how", value: 'how_to_grow', affirmation: "Growth needs a plan. Let's build one." },
        { label: "People don't understand what makes me different", value: 'differentiation', affirmation: "Clarity on your offer changes everything. Let's sharpen it." },
      ],
    },
  ],
  'just-starting': [
    {
      kind: 'choice',
      question: "What's your situation at the moment?",
      options: [
        { label: 'Just finished school, college or university', value: 'just_finished', affirmation: "Perfect timing — let's get you started the right way." },
        { label: 'Still studying but thinking ahead', value: 'studying', affirmation: 'Planning ahead puts you ahead of most people your age.' },
        { label: 'Been doing other things and want to start a proper career', value: 'other_things', affirmation: "It's never too late to get on the right track." },
        { label: "Had a job or two but need help figuring out where I'm going", value: 'figuring_out', affirmation: "You've got more to work with than you think." },
      ],
    },
    {
      kind: 'choice',
      question: 'Do you have any idea what kind of work you want to do?',
      options: [
        { label: 'Yes — I have a clear idea', value: 'clear', affirmation: 'Having direction this early is a real advantage.' },
        { label: "I have a few things I'm interested in", value: 'few_things', affirmation: "Let's help you narrow it down." },
        { label: 'No idea yet — I need help working it out', value: 'no_idea', affirmation: "Most people feel exactly like this at the start. We'll figure it out." },
      ],
    },
    {
      kind: 'choice',
      question: 'What worries you most about getting started?',
      options: [
        { label: "I don't have any experience", value: 'no_experience', affirmation: 'Everyone starts without experience. There are ways around it.' },
        { label: "I don't know how to write a CV or sell myself", value: 'cv', affirmation: "Writing a great CV is a skill — and we'll teach you." },
        { label: "I don't really know how job hunting works", value: 'job_hunting_works', affirmation: "Most people don't. Let's walk you through it." },
        { label: "I'm not sure I'm going in the right direction", value: 'right_direction', affirmation: "Better to question it now than later. Let's find out." },
        { label: "I don't know what I'm actually good at", value: 'strengths', affirmation: 'Figuring that out is one of the most valuable things you can do.' },
      ],
    },
  ],
  returning: [
    {
      kind: 'choice',
      columns: 1,
      question: 'How long have you been out of work — and what was the reason?',
      options: [
        { label: 'Maternity or paternity leave', value: 'parental', affirmation: "Returning after parental leave is very common. You've got this." },
        { label: 'Looking after a family member or someone I care about', value: 'caring', affirmation: "Caring for someone takes real strength. Let's get you back on track." },
        { label: 'Health reasons', value: 'health', affirmation: "Taking time for your health is the right call. Let's focus on what comes next." },
        { label: 'I was made redundant and took some time before looking again', value: 'redundancy', affirmation: "Redundancy happens to good people. Let's get you back stronger." },
        { label: 'I chose to take a break', value: 'break', affirmation: 'A deliberate break is nothing to apologise for.' },
        { label: 'Other reasons', value: 'other', affirmation: 'Whatever the reason — what matters is what comes next.' },
      ],
    },
    {
      kind: 'choice',
      question: 'Are you going back to the same kind of work or is this a chance to do something different?',
      options: [
        { label: 'Going back to what I did before', value: 'same', affirmation: "Returning to familiar work has real advantages. Let's position you well." },
        { label: 'Similar work but in a different direction', value: 'similar', affirmation: 'A change within your field is very achievable.' },
        { label: 'This feels like a chance to do something completely different', value: 'different', affirmation: "Ambitious. Let's plan it properly." },
      ],
    },
    {
      kind: 'choice',
      question: 'What feels most daunting about going back?',
      options: [
        { label: 'My confidence has taken a knock', value: 'confidence', affirmation: 'Confidence comes back faster than you think once you get going.' },
        { label: 'My skills or knowledge might be out of date', value: 'skills', affirmation: "Most skills are more current than people fear. Let's check." },
        { label: "Having to explain why I've been out of work", value: 'explaining', affirmation: 'There is a way to talk about this that works in your favour.' },
        { label: 'Getting back into a routine', value: 'routine', affirmation: "Structure helps. Let's build that in from the start." },
        { label: 'Whether employers will take me seriously', value: 'taken_seriously', affirmation: 'Employers hire returners all the time. Framing is everything.' },
      ],
    },
  ],
  'future-proofing': [
    {
      kind: 'text',
      question: "What's made you start thinking about this?",
      placeholder: "e.g. My company is talking about cutting jobs / I've been in the same role for years and feel stuck / I want to make sure I'm earning what I should be",
      affirmation: 'Thanks — that helps us focus.',
    },
    {
      kind: 'text',
      question: 'What do you do and how long have you been doing it?',
      placeholder: 'e.g. HGV driver — 15 years / Factory supervisor — 8 years / Office manager — 10 years',
      affirmation: 'Got it — that experience counts for a lot.',
    },
    {
      kind: 'choice',
      question: 'What feels most important to focus on?',
      options: [
        { label: "Making sure my skills don't become out of date", value: 'skills', affirmation: 'Staying relevant is the smartest long-term move.' },
        { label: 'Getting better known in my field', value: 'known', affirmation: 'Visibility matters more than most people realise.' },
        { label: 'Finding out what I should actually be earning', value: 'earning', affirmation: "Many people are underpaid and don't know it. Let's find out." },
        { label: 'Getting better at managing or leading people', value: 'leading', affirmation: 'Leadership skills open doors at every level.' },
        { label: 'Having a proper plan for where I’m heading', value: 'plan', affirmation: 'Having a plan changes everything.' },
        { label: 'I’d like Elevate to help me work out what to focus on', value: 'help_me', affirmation: "That's exactly what we're here for." },
      ],
    },
  ],
};

/** Quick-pick chips on the final open question. */
export const FINAL_QUICK_OPTIONS = [
  'Getting more interviews',
  'Working out what I want to do',
  'Earning more money',
  'Feeling more confident',
];

/**
 * The shape the AI summary prompt is built from — readable, ready to drop into
 * the coaching prompt. Assembled in App.tsx from the synced onboarding answers
 * so nothing depends on stale persisted state at invoke time.
 */
export type OnboardingProfile = {
  name: string;
  /** Human-readable situation label (not the raw value). */
  situationType: string;
  /** Question text → the answer the user gave. */
  pathAnswers: Record<string, string>;
  /** What the user said they most want help with (final open question). */
  openGoal: string;
  /** The answer to whichever path question asked about their main hurdle. */
  biggestChallenge: string;
};

// Phrases that mark a "what's holding you back / worrying you" path question.
const CHALLENGE_MARKERS = [
  'holding you back',
  'holding your',
  'biggest thing',
  'single biggest',
  'biggest',
  'worries you most',
  'worry',
  'daunting',
  'stopping you',
  'standing between',
  'concern',
];

/** Turn a raw choice/text value for a question into its readable answer. */
function readableAnswer(question: PathQuestion, value: string): string {
  if (question.kind === 'choice') {
    return question.options.find((option) => option.value === value)?.label ?? value;
  }
  return value;
}

/**
 * Build the readable profile the AI prompt consumes from the raw onboarding
 * answers. `rawPathAnswers` is keyed by question index (as PathQuestions stores
 * it).
 */
export function buildOnboardingProfile(args: {
  name: string;
  situation: SituationType | null;
  rawPathAnswers: Record<number, string>;
  openGoal: string;
}): OnboardingProfile {
  const { name, situation, rawPathAnswers, openGoal } = args;
  const questions = situation ? PATH_QUESTION_SETS[situation] ?? [] : [];

  const pathAnswers: Record<string, string> = {};
  let biggestChallenge = '';

  questions.forEach((question, index) => {
    const value = rawPathAnswers[index];
    if (!value || !value.trim()) return;
    const answer = readableAnswer(question, value);
    pathAnswers[question.question] = answer;

    const isChallenge = CHALLENGE_MARKERS.some((marker) =>
      question.question.toLowerCase().includes(marker),
    );
    if (isChallenge && !biggestChallenge) biggestChallenge = answer;
  });

  return {
    name: name.trim(),
    situationType: situation ? SITUATION_LABELS[situation] : '',
    pathAnswers,
    openGoal: openGoal.trim(),
    biggestChallenge,
  };
}
