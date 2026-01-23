// English Literature Topics - Text-Specific Learning Modules
// Aligned with NYS Common Core ELA Standards

export interface LiteraryText {
  id: string;
  title: string;
  author: string;
  genre: string;
  gradeLevel: string;
  themes: string[];
  literaryDevices: string[];
  coverColor: string;
}

export interface TextQuestion {
  level: 'comprehension' | 'analysis' | 'higher-order';
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  question: string;
  standard: string;
  focus?: string; // e.g., 'character', 'theme', 'literary device'
}

export interface LessonSuggestion {
  id: string;
  title: string;
  description: string;
  textId: string;
  duration: string;
  standards: string[];
  objectives: string[];
  activities: string[];
  assessmentIdeas: string[];
}

// Core Literary Texts
export const LITERARY_TEXTS: LiteraryText[] = [
  {
    id: 'the-outsiders',
    title: 'The Outsiders',
    author: 'S.E. Hinton',
    genre: 'Young Adult Fiction',
    gradeLevel: '7-9',
    themes: ['Class conflict', 'Identity', 'Loyalty', 'Violence', 'Coming of age', 'Family', 'Stereotypes'],
    literaryDevices: ['First-person narration', 'Symbolism', 'Foreshadowing', 'Imagery', 'Allusion', 'Metaphor'],
    coverColor: 'amber',
  },
  {
    id: 'romeo-and-juliet',
    title: 'Romeo and Juliet',
    author: 'William Shakespeare',
    genre: 'Tragedy',
    gradeLevel: '9-12',
    themes: ['Love vs. hate', 'Fate', 'Youth vs. age', 'Individual vs. society', 'Death', 'Conflict'],
    literaryDevices: ['Dramatic irony', 'Soliloquy', 'Sonnet form', 'Oxymoron', 'Foreshadowing', 'Puns', 'Imagery', 'Personification'],
    coverColor: 'rose',
  },
  {
    id: 'shakespeare-stories',
    title: 'Stories by Shakespeare',
    author: 'William Shakespeare',
    genre: 'Drama Collection',
    gradeLevel: '9-12',
    themes: ['Ambition', 'Jealousy', 'Love', 'Power', 'Betrayal', 'Magic', 'Justice', 'Transformation'],
    literaryDevices: ['Soliloquy', 'Aside', 'Dramatic irony', 'Iambic pentameter', 'Metaphor', 'Personification', 'Alliteration'],
    coverColor: 'purple',
  },
  {
    id: 'house-on-mango-street',
    title: 'The House on Mango Street',
    author: 'Sandra Cisneros',
    genre: 'Novella / Vignettes',
    gradeLevel: '7-10',
    themes: ['Identity', 'Belonging', 'Gender roles', 'Dreams', 'Poverty', 'Community', 'Coming of age', 'Cultural heritage'],
    literaryDevices: ['Vignette structure', 'Imagery', 'Symbolism', 'First-person narration', 'Metaphor', 'Repetition', 'Personification'],
    coverColor: 'teal',
  },
];

// Text-Specific Question Banks - Multi-Level
export const TEXT_QUESTIONS: Record<string, TextQuestion[]> = {
  'the-outsiders': [
    // Reading Comprehension
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who are the main characters in the Greasers gang?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'remember', question: 'What event happens at the beginning of the novel that sets the story in motion?', standard: 'RL.9-10.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the differences between the Greasers and the Socs.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Summarize what happens when Johnny and Ponyboy hide in the abandoned church.', standard: 'RL.9-10.2', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is the significance of the poem "Nothing Gold Can Stay" that Johnny shares?', standard: 'RL.9-10.4', focus: 'theme' },
    // Analysis
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Hinton use the sunset as a symbol to connect Ponyboy and Cherry?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze how Ponyboy\'s view of the Socs changes throughout the novel.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'What role does socioeconomic class play in the conflicts of the novel?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'apply', question: 'How does the first-person narration affect how readers understand the Greasers?', standard: 'RL.9-10.6', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Identify examples of foreshadowing related to Johnny\'s fate and explain their effect.', standard: 'RL.9-10.5', focus: 'literary device' },
    // Higher-Order Thinking
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Was Johnny\'s decision to save the children heroic or reckless? Defend your position with evidence.', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Does Hinton present the Greasers and Socs fairly, or is the narrative biased? Explain.', standard: 'RL.9-10.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write an alternate ending where Johnny survives. How might the theme change?', standard: 'W.9-10.3', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Compare the novel\'s portrayal of violence to its consequences. What message does Hinton convey?', standard: 'RL.9-10.2', focus: 'theme' },
  ],
  'romeo-and-juliet': [
    // Reading Comprehension
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is the setting of Romeo and Juliet?', standard: 'RL.9-10.1', focus: 'setting' },
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who are the two feuding families in the play?', standard: 'RL.9-10.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Summarize the events that lead to Romeo and Juliet\'s secret marriage.', standard: 'RL.9-10.2', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain Friar Lawrence\'s plan to help Romeo and Juliet escape.', standard: 'RL.9-10.3', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is a soliloquy? Identify one from Juliet and explain its purpose.', standard: 'RL.9-10.4', focus: 'literary device' },
    // Analysis
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the use of oxymorons in Romeo\'s speeches. What do they reveal about love?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Shakespeare use dramatic irony in the final act? Cite specific examples.', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Compare the characters of Mercutio and Tybalt. How do they represent different aspects of the feud?', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'apply', question: 'How does the sonnet form in Act I, Scene 5 reflect the themes of love and fate?', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'What role does fate vs. free will play in the tragedy? Support with textual evidence.', standard: 'RL.9-10.2', focus: 'theme' },
    // Higher-Order Thinking
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Who is most responsible for the deaths of Romeo and Juliet? Build an argument with evidence.', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Romeo and Juliet\'s love genuine or merely infatuation? Defend your position.', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Rewrite the balcony scene in modern English while preserving Shakespeare\'s literary devices.', standard: 'W.9-10.3', focus: 'literary device' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'How does Shakespeare critique the adult world through the tragedy of the young lovers?', standard: 'RL.9-10.6', focus: 'theme' },
  ],
  'shakespeare-stories': [
    // Reading Comprehension
    { level: 'comprehension', bloomLevel: 'remember', question: 'List three plays written by William Shakespeare.', standard: 'RL.9-10.1', focus: 'background' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the difference between a Shakespearean comedy and tragedy.', standard: 'RL.9-10.5', focus: 'genre' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Summarize the main conflict in Macbeth.', standard: 'RL.9-10.2', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is iambic pentameter? Find an example from any Shakespeare play.', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who are the main characters in A Midsummer Night\'s Dream?', standard: 'RL.9-10.1', focus: 'character' },
    // Analysis
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Shakespeare use asides to create dramatic irony?', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Compare the theme of ambition in Macbeth to jealousy in Othello.', standard: 'RL.9-10.9', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'apply', question: 'How does Shakespeare use the supernatural to advance plot and theme?', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze how social class affects character relationships in a Shakespeare play of your choice.', standard: 'RL.9-10.3', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Identify three metaphors in any Shakespeare soliloquy and explain their meaning.', standard: 'RL.9-10.4', focus: 'literary device' },
    // Higher-Order Thinking
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Why do Shakespeare\'s plays remain relevant today? Support with specific examples.', standard: 'RL.9-10.9', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a modern-day scene inspired by a Shakespeare play, keeping his themes intact.', standard: 'W.9-10.3', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Compare Shakespeare\'s portrayal of women to modern representations. What has changed?', standard: 'RL.9-10.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Should Shakespeare be required reading? Build an argument using textual evidence.', standard: 'W.9-10.1', focus: 'theme' },
  ],
  'house-on-mango-street': [
    // Reading Comprehension
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who is the narrator of The House on Mango Street?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe the house on Mango Street and explain why Esperanza is disappointed.', standard: 'RL.9-10.1', focus: 'setting' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Summarize the vignette "My Name." What does Esperanza reveal about her identity?', standard: 'RL.9-10.2', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is a vignette? How does Cisneros use this structure?', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'comprehension', bloomLevel: 'remember', question: 'List three female characters in the novel and describe their situations.', standard: 'RL.9-10.3', focus: 'character' },
    // Analysis
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Cisneros use the house as a symbol throughout the novel?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the role of gender in limiting the women of Mango Street. Cite specific vignettes.', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'apply', question: 'How does Cisneros use imagery to create a sense of place and community?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Compare Esperanza\'s dreams to the reality of her environment. What conflict emerges?', standard: 'RL.9-10.3', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Identify examples of personification in the novel and explain their effect.', standard: 'RL.9-10.4', focus: 'literary device' },
    // Higher-Order Thinking
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Esperanza\'s desire to leave Mango Street selfish or necessary? Defend your answer.', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'How does Cisneros challenge traditional coming-of-age narratives through a female Latina perspective?', standard: 'RL.9-10.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write your own vignette about your neighborhood in Cisneros\' style.', standard: 'W.9-10.3', focus: 'literary device' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'What is Cisneros saying about the American Dream through Esperanza\'s story?', standard: 'RL.9-10.2', focus: 'theme' },
  ],
};

// Pre-Built Lesson Suggestions
export const LESSON_SUGGESTIONS: LessonSuggestion[] = [
  // The Outsiders
  {
    id: 'outsiders-class-conflict',
    title: 'Understanding Class Conflict in The Outsiders',
    description: 'Explore how socioeconomic divisions drive the plot and shape character identities.',
    textId: 'the-outsiders',
    duration: '45 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify examples of class conflict between Greasers and Socs',
      'Analyze how economic status shapes character perspectives',
      'Discuss real-world connections to social class divisions',
    ],
    activities: [
      'Character comparison T-chart (Ponyboy vs. Cherry)',
      'Small group discussion on privilege and perspective',
      'Written reflection on personal experiences with social groups',
    ],
    assessmentIdeas: [
      'Essay: How does class determine fate in The Outsiders?',
      'Venn diagram comparing characters across class lines',
    ],
  },
  {
    id: 'outsiders-symbolism',
    title: 'Symbolism Deep Dive: Gold, Sunsets, and Identity',
    description: 'Analyze key symbols and their connection to themes of innocence and identity.',
    textId: 'the-outsiders',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Identify and interpret major symbols in the novel',
      'Connect symbols to character development and themes',
      'Write analytically about symbolic meaning',
    ],
    activities: [
      'Symbol hunt: Find quotes containing gold, sunsets, or the poem',
      'Partner analysis of "Nothing Gold Can Stay"',
      'Create symbol map connecting images to themes',
    ],
    assessmentIdeas: [
      'Symbol analysis paragraph with textual evidence',
      'Creative project: Design a symbolic book cover',
    ],
  },
  {
    id: 'outsiders-pov',
    title: 'First-Person Narration and Reliability',
    description: 'Examine how Ponyboy\'s perspective shapes reader understanding and potential bias.',
    textId: 'the-outsiders',
    duration: '45 minutes',
    standards: ['RL.9-10.6', 'RL.9-10.3', 'SL.9-10.4'],
    objectives: [
      'Understand the effects of first-person narration',
      'Identify moments of narrative bias or unreliability',
      'Consider alternative perspectives within the story',
    ],
    activities: [
      'Rewrite a scene from Cherry\'s or Darry\'s perspective',
      'Debate: Is Ponyboy a reliable narrator?',
      'Evidence collection: Where does Ponyboy\'s bias show?',
    ],
    assessmentIdeas: [
      'Alternative perspective creative writing piece',
      'Oral presentation on narrator reliability',
    ],
  },
  // Romeo and Juliet
  {
    id: 'rj-dramatic-irony',
    title: 'The Power of Dramatic Irony in Romeo and Juliet',
    description: 'Understand how Shakespeare uses dramatic irony to heighten tragedy.',
    textId: 'romeo-and-juliet',
    duration: '55 minutes',
    standards: ['RL.9-10.5', 'RL.9-10.4', 'SL.9-10.1'],
    objectives: [
      'Define and identify dramatic irony',
      'Analyze specific examples from the play',
      'Discuss how dramatic irony creates emotional impact',
    ],
    activities: [
      'Dramatic irony scavenger hunt in Act V',
      'Fishbowl discussion: Knowing what we know, who should we blame?',
      'Scene performance highlighting ironic moments',
    ],
    assessmentIdeas: [
      'Essay: How does dramatic irony make the ending more tragic?',
      'Scene annotation with irony analysis',
    ],
  },
  {
    id: 'rj-language-love',
    title: 'The Language of Love: Sonnets, Oxymorons, and Imagery',
    description: 'Explore Shakespeare\'s literary devices for expressing love and conflict.',
    textId: 'romeo-and-juliet',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'L.9-10.5', 'W.9-10.3'],
    objectives: [
      'Identify literary devices: oxymoron, metaphor, sonnet form',
      'Analyze how devices convey theme and emotion',
      'Create original examples in Shakespearean style',
    ],
    activities: [
      'Literary device matching game with quotes',
      'Analyze the shared sonnet in Act I, Scene 5',
      'Write your own oxymoron-filled love/hate poem',
    ],
    assessmentIdeas: [
      'Literary device glossary with examples from the play',
      'Original sonnet or monologue',
    ],
  },
  {
    id: 'rj-fate-vs-choice',
    title: 'Fate vs. Free Will: Who Controls the Tragedy?',
    description: 'Debate whether the lovers are victims of fate or their own choices.',
    textId: 'romeo-and-juliet',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'SL.9-10.3', 'W.9-10.1'],
    objectives: [
      'Identify moments suggesting fate or free will',
      'Build evidence-based arguments for each side',
      'Engage in structured academic debate',
    ],
    activities: [
      'Evidence sorting: Fate vs. Choice cards',
      'Structured debate with assigned positions',
      'Exit ticket: My verdict with evidence',
    ],
    assessmentIdeas: [
      'Argumentative essay on fate vs. free will',
      'Discussion reflection on changing perspectives',
    ],
  },
  // Shakespeare Stories
  {
    id: 'shakespeare-intro',
    title: 'Introduction to Shakespeare: Context and Craft',
    description: 'Build foundational knowledge of Shakespearean drama and language.',
    textId: 'shakespeare-stories',
    duration: '45 minutes',
    standards: ['RL.9-10.9', 'RL.9-10.4', 'SL.9-10.2'],
    objectives: [
      'Understand the historical context of Elizabethan theater',
      'Identify key features of Shakespearean language',
      'Recognize common themes across his works',
    ],
    activities: [
      'Virtual tour of the Globe Theatre',
      'Shakespearean insult game to practice language',
      'Theme matching across play summaries',
    ],
    assessmentIdeas: [
      'KWL chart completion',
      'Short response: Why study Shakespeare?',
    ],
  },
  {
    id: 'shakespeare-soliloquy',
    title: 'Mastering the Soliloquy: Voice and Revelation',
    description: 'Deep dive into the soliloquy as a dramatic and literary device.',
    textId: 'shakespeare-stories',
    duration: '50 minutes',
    standards: ['RL.9-10.5', 'RL.9-10.3', 'SL.9-10.6'],
    objectives: [
      'Define soliloquy and its dramatic purpose',
      'Analyze famous soliloquies for character insight',
      'Perform a soliloquy with expression and understanding',
    ],
    activities: [
      'Compare soliloquies from Hamlet, Macbeth, and Romeo and Juliet',
      'Small group soliloquy performance preparation',
      'Peer feedback on interpretation and delivery',
    ],
    assessmentIdeas: [
      'Soliloquy performance rubric',
      'Written analysis of a soliloquy\'s revelations',
    ],
  },
  // House on Mango Street
  {
    id: 'homs-vignette-craft',
    title: 'The Art of the Vignette: Structure and Impact',
    description: 'Understand how Cisneros uses vignettes to build meaning.',
    textId: 'house-on-mango-street',
    duration: '45 minutes',
    standards: ['RL.9-10.5', 'W.9-10.3', 'L.9-10.3'],
    objectives: [
      'Define vignette and its characteristics',
      'Analyze how structure contributes to theme',
      'Write an original vignette in Cisneros\' style',
    ],
    activities: [
      'Vignette anatomy: Close read of "My Name"',
      'Style analysis: Sentence length, imagery, voice',
      'Drafting personal vignettes',
    ],
    assessmentIdeas: [
      'Original vignette with style imitation',
      'Vignette comparison across authors',
    ],
  },
  {
    id: 'homs-identity-belonging',
    title: 'Identity and Belonging: Esperanza\'s Journey',
    description: 'Explore themes of cultural identity, gender, and place through Esperanza.',
    textId: 'house-on-mango-street',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify how Esperanza\'s identity is shaped by her environment',
      'Analyze the role of gender expectations in the novel',
      'Connect themes to personal and contemporary experiences',
    ],
    activities: [
      'Identity map for Esperanza',
      'Socratic seminar on gender roles in the novel',
      'Personal essay: What shapes your identity?',
    ],
    assessmentIdeas: [
      'Thematic essay on identity and belonging',
      'Comparative analysis with another coming-of-age text',
    ],
  },
  {
    id: 'homs-symbolism-house',
    title: 'The House as Symbol: Dreams, Shame, and Hope',
    description: 'Analyze how Cisneros uses the house motif throughout the novel.',
    textId: 'house-on-mango-street',
    duration: '45 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Track the house symbol across multiple vignettes',
      'Interpret what different houses represent',
      'Connect the symbol to the American Dream theme',
    ],
    activities: [
      'House quote collection and categorization',
      'Symbolic house drawing with textual justification',
      'Class discussion: What does "home" really mean?',
    ],
    assessmentIdeas: [
      'Symbol analysis essay',
      'Visual representation with written explanation',
    ],
  },
];

// Helper functions
export function getLessonsByText(textId: string): LessonSuggestion[] {
  return LESSON_SUGGESTIONS.filter(lesson => lesson.textId === textId);
}

export function getQuestionsByLevel(textId: string, level: TextQuestion['level']): TextQuestion[] {
  return TEXT_QUESTIONS[textId]?.filter(q => q.level === level) || [];
}

export function getQuestionsByFocus(textId: string, focus: string): TextQuestion[] {
  return TEXT_QUESTIONS[textId]?.filter(q => q.focus === focus) || [];
}

export function getTextById(textId: string): LiteraryText | undefined {
  return LITERARY_TEXTS.find(t => t.id === textId);
}
