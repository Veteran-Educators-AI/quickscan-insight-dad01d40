// English Literature Topics - Comprehensive NYC/NYS High School Library
// Aligned with NYS Common Core ELA Standards (Grades 9-12)

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
  focus?: string;
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

// ============================================
// COMPREHENSIVE LITERARY TEXTS LIBRARY
// Organized by typical NYC/NYS curriculum order
// ============================================

export const LITERARY_TEXTS: LiteraryText[] = [
  // === GRADE 9 CORE TEXTS ===
  {
    id: 'the-outsiders',
    title: 'The Outsiders',
    author: 'S.E. Hinton',
    genre: 'Young Adult Fiction',
    gradeLevel: '9',
    themes: ['Class conflict', 'Identity', 'Loyalty', 'Violence', 'Coming of age', 'Family', 'Stereotypes'],
    literaryDevices: ['First-person narration', 'Symbolism', 'Foreshadowing', 'Imagery', 'Allusion', 'Metaphor'],
    coverColor: 'amber',
  },
  {
    id: 'romeo-and-juliet',
    title: 'Romeo and Juliet',
    author: 'William Shakespeare',
    genre: 'Tragedy',
    gradeLevel: '9',
    themes: ['Love vs. hate', 'Fate', 'Youth vs. age', 'Individual vs. society', 'Death', 'Conflict'],
    literaryDevices: ['Dramatic irony', 'Soliloquy', 'Sonnet form', 'Oxymoron', 'Foreshadowing', 'Puns', 'Imagery'],
    coverColor: 'rose',
  },
  {
    id: 'to-kill-a-mockingbird',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    genre: 'Southern Gothic / Coming-of-Age',
    gradeLevel: '9-10',
    themes: ['Racial injustice', 'Moral growth', 'Innocence', 'Courage', 'Empathy', 'Social class', 'Justice'],
    literaryDevices: ['First-person narration', 'Symbolism', 'Flashback', 'Irony', 'Foreshadowing', 'Allusion'],
    coverColor: 'amber',
  },
  {
    id: 'lord-of-the-flies',
    title: 'Lord of the Flies',
    author: 'William Golding',
    genre: 'Allegorical Novel',
    gradeLevel: '9-10',
    themes: ['Civilization vs. savagery', 'Loss of innocence', 'Power', 'Fear', 'Human nature', 'Order vs. chaos'],
    literaryDevices: ['Allegory', 'Symbolism', 'Foreshadowing', 'Imagery', 'Irony', 'Personification'],
    coverColor: 'teal',
  },
  {
    id: 'house-on-mango-street',
    title: 'The House on Mango Street',
    author: 'Sandra Cisneros',
    genre: 'Novella / Vignettes',
    gradeLevel: '9',
    themes: ['Identity', 'Belonging', 'Gender roles', 'Dreams', 'Poverty', 'Community', 'Coming of age', 'Cultural heritage'],
    literaryDevices: ['Vignette structure', 'Imagery', 'Symbolism', 'First-person narration', 'Metaphor', 'Repetition'],
    coverColor: 'purple',
  },
  {
    id: 'odyssey',
    title: 'The Odyssey',
    author: 'Homer',
    genre: 'Epic Poetry',
    gradeLevel: '9',
    themes: ['Heroism', 'Loyalty', 'Hospitality', 'Temptation', 'Home', 'Fate vs. free will', 'Identity'],
    literaryDevices: ['Epic simile', 'Epithets', 'In medias res', 'Flashback', 'Foreshadowing', 'Invocation'],
    coverColor: 'teal',
  },
  {
    id: 'night',
    title: 'Night',
    author: 'Elie Wiesel',
    genre: 'Memoir',
    gradeLevel: '9-10',
    themes: ['Holocaust', 'Faith', 'Father-son relationship', 'Survival', 'Humanity', 'Memory', 'Silence'],
    literaryDevices: ['Imagery', 'Symbolism', 'Irony', 'Repetition', 'Understatement', 'First-person narration'],
    coverColor: 'slate',
  },
  {
    id: 'animal-farm',
    title: 'Animal Farm',
    author: 'George Orwell',
    genre: 'Allegorical Novella / Political Satire',
    gradeLevel: '9-10',
    themes: ['Totalitarianism', 'Corruption of power', 'Class struggle', 'Propaganda', 'Revolution', 'Equality'],
    literaryDevices: ['Allegory', 'Satire', 'Irony', 'Fable elements', 'Symbolism', 'Repetition'],
    coverColor: 'rose',
  },

  // === GRADE 10 CORE TEXTS ===
  {
    id: 'julius-caesar',
    title: 'Julius Caesar',
    author: 'William Shakespeare',
    genre: 'Tragedy / Historical Drama',
    gradeLevel: '10',
    themes: ['Ambition', 'Betrayal', 'Honor', 'Power', 'Fate', 'Rhetoric', 'Friendship', 'Public vs. private self'],
    literaryDevices: ['Soliloquy', 'Dramatic irony', 'Rhetoric', 'Foreshadowing', 'Motif', 'Anachronism'],
    coverColor: 'purple',
  },
  {
    id: 'of-mice-and-men',
    title: 'Of Mice and Men',
    author: 'John Steinbeck',
    genre: 'Novella / Tragedy',
    gradeLevel: '10',
    themes: ['American Dream', 'Loneliness', 'Friendship', 'Powerlessness', 'Fate', 'Social injustice', 'Euthanasia'],
    literaryDevices: ['Foreshadowing', 'Symbolism', 'Naturalism', 'Dialogue', 'Circular structure', 'Imagery'],
    coverColor: 'amber',
  },
  {
    id: 'a-raisin-in-the-sun',
    title: 'A Raisin in the Sun',
    author: 'Lorraine Hansberry',
    genre: 'Drama',
    gradeLevel: '10',
    themes: ['American Dream', 'Racial discrimination', 'Family', 'Identity', 'Generational conflict', 'Pride', 'Dreams deferred'],
    literaryDevices: ['Symbolism', 'Allusion', 'Irony', 'Dialogue', 'Conflict', 'Setting as symbol'],
    coverColor: 'teal',
  },
  {
    id: 'fahrenheit-451',
    title: 'Fahrenheit 451',
    author: 'Ray Bradbury',
    genre: 'Dystopian Fiction',
    gradeLevel: '10',
    themes: ['Censorship', 'Technology vs. humanity', 'Knowledge', 'Conformity', 'Individual vs. society', 'Rebirth'],
    literaryDevices: ['Symbolism', 'Allusion', 'Imagery', 'Metaphor', 'Irony', 'Motif'],
    coverColor: 'rose',
  },
  {
    id: 'things-fall-apart',
    title: 'Things Fall Apart',
    author: 'Chinua Achebe',
    genre: 'Postcolonial Novel',
    gradeLevel: '10-11',
    themes: ['Colonialism', 'Tradition vs. change', 'Masculinity', 'Culture clash', 'Identity', 'Fate', 'Religion'],
    literaryDevices: ['Proverbs', 'Foreshadowing', 'Irony', 'Symbolism', 'Oral tradition elements', 'Third-person limited'],
    coverColor: 'amber',
  },
  {
    id: 'persepolis',
    title: 'Persepolis',
    author: 'Marjane Satrapi',
    genre: 'Graphic Novel / Memoir',
    gradeLevel: '10',
    themes: ['Identity', 'Revolution', 'Family', 'Religion', 'Gender', 'Coming of age', 'Exile', 'Resilience'],
    literaryDevices: ['Visual metaphor', 'Juxtaposition', 'Irony', 'Symbolism', 'First-person narration'],
    coverColor: 'slate',
  },

  // === GRADE 11 CORE TEXTS (American Literature Focus) ===
  {
    id: 'the-great-gatsby',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    genre: 'Modernist Novel',
    gradeLevel: '11',
    themes: ['American Dream', 'Wealth', 'Class', 'Love', 'Memory', 'Moral decay', 'Illusion vs. reality'],
    literaryDevices: ['Symbolism', 'First-person narration', 'Imagery', 'Motif', 'Irony', 'Foreshadowing'],
    coverColor: 'amber',
  },
  {
    id: 'the-crucible',
    title: 'The Crucible',
    author: 'Arthur Miller',
    genre: 'Drama / Allegory',
    gradeLevel: '11',
    themes: ['Mass hysteria', 'Reputation', 'Integrity', 'Authority', 'Justice', 'Fear', 'McCarthyism'],
    literaryDevices: ['Allegory', 'Dramatic irony', 'Foreshadowing', 'Symbolism', 'Dialogue', 'Conflict'],
    coverColor: 'slate',
  },
  {
    id: 'scarlet-letter',
    title: 'The Scarlet Letter',
    author: 'Nathaniel Hawthorne',
    genre: 'Romantic / Gothic Fiction',
    gradeLevel: '11',
    themes: ['Sin and guilt', 'Hypocrisy', 'Identity', 'Redemption', 'Nature vs. civilization', 'Puritan society'],
    literaryDevices: ['Symbolism', 'Irony', 'Ambiguity', 'Allegory', 'Imagery', 'Third-person omniscient'],
    coverColor: 'rose',
  },
  {
    id: 'adventures-of-huckleberry-finn',
    title: 'Adventures of Huckleberry Finn',
    author: 'Mark Twain',
    genre: 'Picaresque / Satire',
    gradeLevel: '11',
    themes: ['Racism', 'Freedom', 'Morality', 'Society vs. individual', 'Friendship', 'Coming of age', 'Hypocrisy'],
    literaryDevices: ['Dialect', 'Satire', 'Irony', 'First-person narration', 'Symbolism', 'Picaresque structure'],
    coverColor: 'teal',
  },
  {
    id: 'their-eyes-were-watching-god',
    title: 'Their Eyes Were Watching God',
    author: 'Zora Neale Hurston',
    genre: 'Harlem Renaissance Novel',
    gradeLevel: '11',
    themes: ['Self-discovery', 'Love', 'Voice', 'Gender', 'Race', 'Independence', 'Community'],
    literaryDevices: ['Frame narrative', 'Dialect', 'Symbolism', 'Imagery', 'Free indirect discourse', 'Metaphor'],
    coverColor: 'purple',
  },
  {
    id: 'death-of-a-salesman',
    title: 'Death of a Salesman',
    author: 'Arthur Miller',
    genre: 'Tragedy / Drama',
    gradeLevel: '11',
    themes: ['American Dream', 'Failure', 'Family', 'Identity', 'Betrayal', 'Memory vs. reality', 'Capitalism'],
    literaryDevices: ['Flashback', 'Symbolism', 'Motif', 'Expressionism', 'Irony', 'Tragic hero elements'],
    coverColor: 'slate',
  },
  {
    id: 'catcher-in-the-rye',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    genre: 'Coming-of-Age / Realistic Fiction',
    gradeLevel: '11',
    themes: ['Alienation', 'Innocence', 'Identity', 'Phoniness', 'Growing up', 'Mental health', 'Loss'],
    literaryDevices: ['First-person narration', 'Stream of consciousness', 'Symbolism', 'Irony', 'Colloquial language'],
    coverColor: 'rose',
  },
  {
    id: 'beloved',
    title: 'Beloved',
    author: 'Toni Morrison',
    genre: 'Gothic / Historical Fiction',
    gradeLevel: '11-12',
    themes: ['Slavery', 'Memory', 'Identity', 'Motherhood', 'Trauma', 'Community', 'Freedom', 'Love'],
    literaryDevices: ['Non-linear narrative', 'Magical realism', 'Symbolism', 'Stream of consciousness', 'Imagery'],
    coverColor: 'purple',
  },

  // === GRADE 12 CORE TEXTS (British/World Literature & Advanced) ===
  {
    id: 'hamlet',
    title: 'Hamlet',
    author: 'William Shakespeare',
    genre: 'Tragedy',
    gradeLevel: '12',
    themes: ['Revenge', 'Mortality', 'Corruption', 'Madness', 'Action vs. inaction', 'Appearance vs. reality', 'Family'],
    literaryDevices: ['Soliloquy', 'Dramatic irony', 'Symbolism', 'Motif', 'Metaphor', 'Aside', 'Foil'],
    coverColor: 'purple',
  },
  {
    id: 'macbeth',
    title: 'Macbeth',
    author: 'William Shakespeare',
    genre: 'Tragedy',
    gradeLevel: '12',
    themes: ['Ambition', 'Guilt', 'Fate vs. free will', 'Masculinity', 'Supernatural', 'Tyranny', 'Moral corruption'],
    literaryDevices: ['Soliloquy', 'Dramatic irony', 'Imagery', 'Symbolism', 'Motif', 'Foreshadowing', 'Pathetic fallacy'],
    coverColor: 'slate',
  },
  {
    id: 'othello',
    title: 'Othello',
    author: 'William Shakespeare',
    genre: 'Tragedy',
    gradeLevel: '12',
    themes: ['Jealousy', 'Race', 'Manipulation', 'Love', 'Reputation', 'Otherness', 'Appearance vs. reality'],
    literaryDevices: ['Dramatic irony', 'Soliloquy', 'Imagery', 'Symbolism', 'Foil', 'Tragic flaw'],
    coverColor: 'teal',
  },
  {
    id: '1984',
    title: '1984',
    author: 'George Orwell',
    genre: 'Dystopian Fiction',
    gradeLevel: '12',
    themes: ['Totalitarianism', 'Surveillance', 'Truth', 'Language and power', 'Individuality', 'Memory', 'Resistance'],
    literaryDevices: ['Symbolism', 'Irony', 'Foreshadowing', 'Motif', 'Imagery', 'Neologism', 'Satire'],
    coverColor: 'slate',
  },
  {
    id: 'brave-new-world',
    title: 'Brave New World',
    author: 'Aldous Huxley',
    genre: 'Dystopian Fiction',
    gradeLevel: '12',
    themes: ['Consumerism', 'Technology', 'Freedom vs. happiness', 'Individuality', 'Conformity', 'Science', 'Art'],
    literaryDevices: ['Satire', 'Irony', 'Allusion', 'Symbolism', 'Juxtaposition', 'Third-person omniscient'],
    coverColor: 'teal',
  },
  {
    id: 'frankenstein',
    title: 'Frankenstein',
    author: 'Mary Shelley',
    genre: 'Gothic Fiction / Science Fiction',
    gradeLevel: '12',
    themes: ['Creation', 'Responsibility', 'Isolation', 'Nature vs. nurture', 'Ambition', 'Monstrosity', 'Knowledge'],
    literaryDevices: ['Frame narrative', 'Symbolism', 'Imagery', 'Allusion', 'Gothic elements', 'Epistolary elements'],
    coverColor: 'purple',
  },
  {
    id: 'crime-and-punishment',
    title: 'Crime and Punishment',
    author: 'Fyodor Dostoevsky',
    genre: 'Psychological Fiction',
    gradeLevel: '12',
    themes: ['Guilt', 'Redemption', 'Morality', 'Poverty', 'Alienation', 'Psychology', 'Suffering', 'Faith'],
    literaryDevices: ['Stream of consciousness', 'Symbolism', 'Irony', 'Third-person limited', 'Doubles/doppelganger'],
    coverColor: 'slate',
  },
  {
    id: 'invisible-man',
    title: 'Invisible Man',
    author: 'Ralph Ellison',
    genre: 'Modernist / African-American Literature',
    gradeLevel: '12',
    themes: ['Identity', 'Race', 'Invisibility', 'Power', 'Individual vs. society', 'Self-discovery', 'Disillusionment'],
    literaryDevices: ['Symbolism', 'Allegory', 'First-person narration', 'Surrealism', 'Irony', 'Motif'],
    coverColor: 'amber',
  },
  {
    id: 'jane-eyre',
    title: 'Jane Eyre',
    author: 'Charlotte Brontë',
    genre: 'Gothic Romance / Bildungsroman',
    gradeLevel: '12',
    themes: ['Independence', 'Love', 'Social class', 'Gender', 'Morality', 'Religion', 'Identity', 'Passion vs. reason'],
    literaryDevices: ['First-person narration', 'Gothic elements', 'Symbolism', 'Imagery', 'Pathetic fallacy', 'Foreshadowing'],
    coverColor: 'rose',
  },
  {
    id: 'pride-and-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    genre: 'Novel of Manners / Romance',
    gradeLevel: '12',
    themes: ['Class', 'Marriage', 'Reputation', 'First impressions', 'Love', 'Individuality', 'Family', 'Gender'],
    literaryDevices: ['Irony', 'Free indirect discourse', 'Wit', 'Satire', 'Third-person limited', 'Dialogue'],
    coverColor: 'teal',
  },
  {
    id: 'heart-of-darkness',
    title: 'Heart of Darkness',
    author: 'Joseph Conrad',
    genre: 'Novella / Modernist',
    gradeLevel: '12',
    themes: ['Colonialism', 'Imperialism', 'Darkness', 'Civilization vs. savagery', 'Moral ambiguity', 'Madness'],
    literaryDevices: ['Frame narrative', 'Symbolism', 'Imagery', 'Irony', 'Ambiguity', 'Stream of consciousness'],
    coverColor: 'slate',
  },

  // === POETRY COLLECTIONS ===
  {
    id: 'poetry-american',
    title: 'American Poetry Collection',
    author: 'Various (Whitman, Dickinson, Hughes, Frost, etc.)',
    genre: 'Poetry',
    gradeLevel: '9-12',
    themes: ['Identity', 'Nature', 'Death', 'Freedom', 'American experience', 'Social justice', 'Dreams'],
    literaryDevices: ['Metaphor', 'Simile', 'Imagery', 'Meter', 'Rhyme', 'Free verse', 'Symbolism', 'Alliteration'],
    coverColor: 'purple',
  },
  {
    id: 'poetry-harlem-renaissance',
    title: 'Harlem Renaissance Poetry',
    author: 'Langston Hughes, Claude McKay, Countee Cullen',
    genre: 'Poetry',
    gradeLevel: '10-12',
    themes: ['Black identity', 'Pride', 'Resilience', 'Dreams', 'Social injustice', 'Music', 'Hope'],
    literaryDevices: ['Jazz rhythms', 'Imagery', 'Symbolism', 'Repetition', 'Dialect', 'Allusion'],
    coverColor: 'amber',
  },
];

// ============================================
// TEXT-SPECIFIC QUESTION BANKS
// Multi-Level: Comprehension, Analysis, Higher-Order
// ============================================

export const TEXT_QUESTIONS: Record<string, TextQuestion[]> = {
  'the-outsiders': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who are the main characters in the Greasers gang?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'remember', question: 'What event happens at the beginning of the novel that sets the story in motion?', standard: 'RL.9-10.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the differences between the Greasers and the Socs.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is the significance of the poem "Nothing Gold Can Stay"?', standard: 'RL.9-10.4', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Hinton use the sunset as a symbol to connect Ponyboy and Cherry?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze how Ponyboy\'s view of the Socs changes throughout the novel.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'What role does socioeconomic class play in the conflicts of the novel?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Was Johnny\'s decision to save the children heroic or reckless? Defend your position.', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Does Hinton present the Greasers and Socs fairly, or is the narrative biased?', standard: 'RL.9-10.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write an alternate ending where Johnny survives. How might the theme change?', standard: 'W.9-10.3', focus: 'theme' },
  ],
  'romeo-and-juliet': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is the setting of Romeo and Juliet?', standard: 'RL.9-10.1', focus: 'setting' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Summarize the events that lead to Romeo and Juliet\'s secret marriage.', standard: 'RL.9-10.2', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is a soliloquy? Identify one from Juliet and explain its purpose.', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the use of oxymorons in Romeo\'s speeches. What do they reveal about love?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Shakespeare use dramatic irony in the final act?', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'What role does fate vs. free will play in the tragedy?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Who is most responsible for the deaths of Romeo and Juliet?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Romeo and Juliet\'s love genuine or merely infatuation?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Rewrite the balcony scene in modern English preserving literary devices.', standard: 'W.9-10.3', focus: 'literary device' },
  ],
  'to-kill-a-mockingbird': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who is the narrator of To Kill a Mockingbird?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe Atticus Finch\'s role in the Tom Robinson trial.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain why Boo Radley is significant to Scout and Jem.', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Harper Lee use the mockingbird as a symbol?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze Scout\'s moral development throughout the novel.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'What does the novel reveal about racial injustice in 1930s Alabama?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Atticus Finch a hero or a flawed character? Defend your position.', standard: 'RL.9-10.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'How relevant is the novel\'s message about prejudice today?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a scene from Tom Robinson\'s perspective before the trial.', standard: 'W.9-10.3', focus: 'character' },
  ],
  'lord-of-the-flies': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Why are the boys stranded on the island?', standard: 'RL.9-10.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe the conflict between Ralph and Jack.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What happens to Piggy\'s glasses and why is this significant?', standard: 'RL.9-10.1', focus: 'plot' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'What does the conch shell symbolize and how does its meaning change?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Golding use the island setting to explore human nature?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze Simon as a Christ-like figure in the novel.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Golding\'s view of human nature too pessimistic? Defend your answer.', standard: 'RL.9-10.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Could the boys have maintained civilization? What would it have required?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a sequel exploring what happens when the boys return to society.', standard: 'W.9-10.3', focus: 'theme' },
  ],
  'house-on-mango-street': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who is the narrator of The House on Mango Street?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What does Esperanza reveal about her identity in "My Name"?', standard: 'RL.9-10.2', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is a vignette and how does Cisneros use this structure?', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Cisneros use the house as a symbol throughout the novel?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the role of gender in limiting the women of Mango Street.', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Cisneros use imagery to create a sense of place?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Esperanza\'s desire to leave Mango Street selfish or necessary?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'What is Cisneros saying about the American Dream?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write your own vignette about your neighborhood in Cisneros\' style.', standard: 'W.9-10.3', focus: 'literary device' },
  ],
  'the-great-gatsby': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who is the narrator of The Great Gatsby?', standard: 'RL.11-12.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe Gatsby\'s parties and their purpose.', standard: 'RL.11-12.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is the relationship between Gatsby and Daisy?', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'What does the green light symbolize and how does its meaning evolve?', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Fitzgerald critique the American Dream through Gatsby?', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the significance of the Valley of Ashes and the eyes of Dr. T.J. Eckleburg.', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Nick Carraway a reliable narrator? Why or why not?', standard: 'RL.11-12.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Gatsby a tragic hero or a fool? Defend your interpretation.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write Gatsby\'s internal monologue the night before the confrontation at the Plaza.', standard: 'W.11-12.3', focus: 'character' },
  ],
  'the-crucible': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What historical event is The Crucible based on?', standard: 'RL.11-12.1', focus: 'background' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the conflict between John Proctor and Abigail Williams.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Why does Proctor refuse to sign his confession?', standard: 'RL.11-12.1', focus: 'plot' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How is The Crucible an allegory for McCarthyism?', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the role of fear and hysteria in the Salem witch trials.', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Miller use Proctor to explore themes of integrity and reputation?', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Proctor a hero or a flawed man who redeems himself? Defend your view.', standard: 'RL.11-12.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Could the events of The Crucible happen in modern society?', standard: 'RL.11-12.9', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a modern scene that parallels the witch trial hysteria.', standard: 'W.11-12.3', focus: 'theme' },
  ],
  'hamlet': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What does the ghost reveal to Hamlet?', standard: 'RL.11-12.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain Hamlet\'s "To be or not to be" soliloquy.', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is the purpose of the play-within-a-play?', standard: 'RL.11-12.5', focus: 'plot' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Is Hamlet\'s madness real or feigned? Provide textual evidence.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the theme of action vs. inaction throughout the play.', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Shakespeare use foil characters to develop Hamlet?', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Hamlet a hero, a villain, or neither? Defend your interpretation.', standard: 'RL.11-12.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'What does the play suggest about the nature of mortality and existence?', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Rewrite the ending with Hamlet surviving. How would this change the tragedy\'s meaning?', standard: 'W.11-12.3', focus: 'theme' },
  ],
  'macbeth': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What prophecy do the witches make about Macbeth?', standard: 'RL.11-12.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe Lady Macbeth\'s role in Duncan\'s murder.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is the significance of Macbeth\'s "dagger" soliloquy?', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the motif of blood throughout the play.', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Shakespeare explore the corrupting nature of ambition?', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Compare Lady Macbeth\'s character arc to Macbeth\'s.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Macbeth a victim of fate or his own choices?', standard: 'RL.11-12.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Who is the true villain of the play: Macbeth, Lady Macbeth, or the witches?', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a scene showing Lady Macbeth\'s thoughts the night before Duncan\'s murder.', standard: 'W.11-12.3', focus: 'character' },
  ],
  '1984': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is the setting of 1984?', standard: 'RL.11-12.1', focus: 'setting' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the concept of "doublethink."', standard: 'RL.11-12.4', focus: 'theme' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What is the purpose of the Thought Police?', standard: 'RL.11-12.1', focus: 'plot' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Orwell use Newspeak to explore the relationship between language and thought?', standard: 'RL.11-12.4', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the symbolism of Room 101.', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Winston\'s relationship with Julia challenge the Party?', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Orwell\'s vision of totalitarianism relevant today? Explain with examples.', standard: 'RL.11-12.9', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Does the novel suggest that resistance is futile? Defend your interpretation.', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a diary entry from Julia\'s perspective after her capture.', standard: 'W.11-12.3', focus: 'character' },
  ],
  'beloved': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who is the main character in Beloved and what is her history?', standard: 'RL.11-12.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the significance of the number 124.', standard: 'RL.11-12.1', focus: 'setting' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Who is Beloved and what is her connection to Sethe?', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Morrison use non-linear narrative to explore trauma and memory?', standard: 'RL.11-12.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the role of community in Sethe\'s story.', standard: 'RL.11-12.3', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'What does the character of Beloved symbolize?', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Was Sethe\'s act of infanticide justified? Defend your position.', standard: 'RL.11-12.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'How does Morrison redefine the meaning of freedom for formerly enslaved people?', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a letter from Denver to a future generation explaining her mother\'s story.', standard: 'W.11-12.3', focus: 'character' },
  ],
  'of-mice-and-men': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is the dream that George and Lennie share?', standard: 'RL.9-10.1', focus: 'theme' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe the relationship between George and Lennie.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Steinbeck use Candy\'s dog to foreshadow later events?', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the theme of loneliness through different characters.', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Was George\'s final decision merciful or murderous?', standard: 'RL.9-10.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write an alternate ending where Lennie escapes.', standard: 'W.9-10.3', focus: 'plot' },
  ],
  'a-raisin-in-the-sun': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What does the Younger family do with the insurance money?', standard: 'RL.9-10.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the significance of the play\'s title.', standard: 'RL.9-10.4', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Hansberry use the plant as a symbol?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the generational conflict between Mama and Walter.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Does the ending represent hope or naivety? Defend your view.', standard: 'RL.9-10.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a scene showing the family one year after moving to Clybourne Park.', standard: 'W.9-10.3', focus: 'character' },
  ],
  'fahrenheit-451': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is Montag\'s job and how does he feel about it initially?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the significance of the mechanical hound.', standard: 'RL.9-10.1', focus: 'symbol' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Bradbury critique technology and mass media?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze Clarisse\'s role in Montag\'s transformation.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Bradbury\'s dystopia more relevant today than when written? Explain.', standard: 'RL.9-10.9', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a scene where Montag explains books to a curious child in the future.', standard: 'W.9-10.3', focus: 'theme' },
  ],
  'night': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Where does Elie Wiesel begin his story?', standard: 'RL.9-10.1', focus: 'setting' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe Elie\'s relationship with his father.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Wiesel use imagery of night and darkness symbolically?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze Elie\'s crisis of faith throughout the memoir.', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Why is it important to read Holocaust testimonies like Night today?', standard: 'RL.9-10.9', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a reflection piece connecting Night to a modern human rights issue.', standard: 'W.9-10.3', focus: 'theme' },
  ],
  'odyssey': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is Odysseus trying to accomplish throughout the epic?', standard: 'RL.9-10.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the concept of xenia (hospitality) in the poem.', standard: 'RL.9-10.4', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How do Odysseus\'s encounters with monsters reveal Greek values?', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze Penelope as a foil to Odysseus.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Odysseus a hero by modern standards? Why or why not?', standard: 'RL.9-10.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Rewrite a scene from Penelope\'s perspective.', standard: 'W.9-10.3', focus: 'character' },
  ],
  'things-fall-apart': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who is the protagonist and what is his greatest fear?', standard: 'RL.9-10.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe Igbo culture before the missionaries arrive.', standard: 'RL.9-10.1', focus: 'setting' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Achebe use proverbs to enrich the narrative?', standard: 'RL.9-10.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze how colonialism destroys Okonkwo\'s world.', standard: 'RL.9-10.2', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Okonkwo a tragic hero? Defend your interpretation.', standard: 'RL.9-10.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write the story the District Commissioner might have told vs. Achebe\'s version.', standard: 'W.9-10.3', focus: 'theme' },
  ],
  'julius-caesar': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Why do the conspirators decide to assassinate Caesar?', standard: 'RL.9-10.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Compare Brutus\'s and Antony\'s funeral speeches.', standard: 'RL.9-10.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Shakespeare explore the power of rhetoric?', standard: 'RL.9-10.4', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze Brutus\'s internal conflict between love and duty.', standard: 'RL.9-10.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Was the assassination justified? Build an argument.', standard: 'RL.9-10.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write Portia\'s reaction upon learning of Brutus\'s role.', standard: 'W.9-10.3', focus: 'character' },
  ],
  'frankenstein': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Who tells the story and how is it structured?', standard: 'RL.11-12.5', focus: 'literary device' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'What does the Creature want from Victor?', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Shelley explore the dangers of unchecked scientific ambition?', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Who is the true monster in the novel? Defend your answer.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Victor responsible for the Creature\'s crimes?', standard: 'RL.11-12.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a modern retelling of Frankenstein set in a tech company.', standard: 'W.11-12.3', focus: 'theme' },
  ],
  'brave-new-world': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is soma and what is its purpose?', standard: 'RL.11-12.1', focus: 'symbol' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe the caste system in the World State.', standard: 'RL.11-12.1', focus: 'setting' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Huxley critique consumerism and technology?', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Compare John the Savage\'s values to the World State\'s.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Which dystopia is more relevant today: 1984 or Brave New World?', standard: 'RL.11-12.9', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a scene where John survives and leads a resistance.', standard: 'W.11-12.3', focus: 'character' },
  ],
  'their-eyes-were-watching-god': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'How many times does Janie marry and to whom?', standard: 'RL.11-12.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the significance of Janie\'s hair.', standard: 'RL.11-12.4', focus: 'symbol' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Hurston use dialect to capture voice and culture?', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze Janie\'s journey toward self-discovery.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Tea Cake good for Janie? Defend your interpretation.', standard: 'RL.11-12.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write Janie\'s advice to a young woman seeking independence.', standard: 'W.11-12.3', focus: 'theme' },
  ],
  'invisible-man': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Why does the narrator consider himself "invisible"?', standard: 'RL.11-12.1', focus: 'theme' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe the Battle Royal scene and its significance.', standard: 'RL.11-12.2', focus: 'plot' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Ellison use surrealism to critique American society?', standard: 'RL.11-12.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the narrator\'s journey from naivety to awareness.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is the narrator\'s retreat underground a defeat or a victory?', standard: 'RL.11-12.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write the narrator\'s first letter to the world after emerging.', standard: 'W.11-12.3', focus: 'character' },
  ],
  'catcher-in-the-rye': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'Why does Holden leave Pencey Prep?', standard: 'RL.11-12.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain what Holden means by "phonies."', standard: 'RL.11-12.4', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does the red hunting hat function as a symbol?', standard: 'RL.11-12.4', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze Holden\'s relationship with his sister Phoebe.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Holden mentally ill, or a perceptive critic of society?', standard: 'RL.11-12.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a scene where Holden meets a therapist for the first time.', standard: 'W.11-12.3', focus: 'character' },
  ],
  'death-of-a-salesman': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is Willy Loman\'s profession?', standard: 'RL.11-12.1', focus: 'character' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Explain the significance of Willy\'s flashbacks.', standard: 'RL.11-12.5', focus: 'literary device' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does Miller critique the American Dream through Willy?', standard: 'RL.11-12.2', focus: 'theme' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Analyze the relationship between Willy and Biff.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Is Willy a tragic hero? Apply the definition to defend your answer.', standard: 'RL.11-12.6', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write Linda\'s eulogy for Willy at the funeral.', standard: 'W.11-12.3', focus: 'character' },
  ],
  'scarlet-letter': [
    { level: 'comprehension', bloomLevel: 'remember', question: 'What is Hester Prynne\'s sin and punishment?', standard: 'RL.11-12.1', focus: 'plot' },
    { level: 'comprehension', bloomLevel: 'understand', question: 'Describe the character of Pearl and her symbolic role.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'How does the scarlet letter\'s meaning change over time?', standard: 'RL.11-12.4', focus: 'symbol' },
    { level: 'analysis', bloomLevel: 'analyze', question: 'Compare Hester\'s public vs. private suffering to Dimmesdale\'s.', standard: 'RL.11-12.3', focus: 'character' },
    { level: 'higher-order', bloomLevel: 'evaluate', question: 'Who suffers most in the novel and why?', standard: 'RL.11-12.6', focus: 'theme' },
    { level: 'higher-order', bloomLevel: 'create', question: 'Write a letter from Hester to Pearl explaining her choices.', standard: 'W.11-12.3', focus: 'character' },
  ],
};

// ============================================
// PRE-BUILT LESSON SUGGESTIONS
// Organized by text with multiple lesson options
// ============================================

export const LESSON_SUGGESTIONS: LessonSuggestion[] = [
  // THE OUTSIDERS
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

  // TO KILL A MOCKINGBIRD
  {
    id: 'tkam-racial-justice',
    title: 'Racial Injustice and the Justice System',
    description: 'Examine how Harper Lee portrays systemic racism through the Tom Robinson trial.',
    textId: 'to-kill-a-mockingbird',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.6', 'SL.9-10.1'],
    objectives: [
      'Analyze how the trial exposes racial prejudice in Maycomb',
      'Evaluate Atticus\'s role as a moral compass',
      'Connect the novel\'s themes to contemporary discussions of justice',
    ],
    activities: [
      'Mock trial preparation and role-play',
      'Close reading of Atticus\'s closing argument',
      'Socratic seminar on justice in 1930s vs. today',
    ],
    assessmentIdeas: [
      'Argumentative essay on justice and equality',
      'Character analysis of Tom Robinson',
    ],
  },
  {
    id: 'tkam-coming-of-age',
    title: 'Scout\'s Moral Development',
    description: 'Trace Scout\'s journey from innocence to understanding of the adult world.',
    textId: 'to-kill-a-mockingbird',
    duration: '45 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.5', 'W.9-10.3'],
    objectives: [
      'Identify key moments that shape Scout\'s worldview',
      'Analyze how point of view affects the narrative',
      'Reflect on personal coming-of-age experiences',
    ],
    activities: [
      'Timeline of Scout\'s moral lessons',
      'Journal entries from Scout\'s perspective',
      'Discussion: What does "walking in someone\'s shoes" mean?',
    ],
    assessmentIdeas: [
      'Personal narrative: A moment that changed your perspective',
      'Character growth analysis essay',
    ],
  },

  // THE GREAT GATSBY
  {
    id: 'gatsby-american-dream',
    title: 'Deconstructing the American Dream',
    description: 'Analyze how Fitzgerald uses Gatsby to critique the American Dream.',
    textId: 'the-great-gatsby',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'SL.11-12.1'],
    objectives: [
      'Define and contextualize the American Dream in the 1920s',
      'Analyze how Gatsby embodies and fails the Dream',
      'Evaluate the Dream\'s relevance today',
    ],
    activities: [
      'Gallery walk: Images of 1920s excess and poverty',
      'Close reading of key passages about Gatsby\'s parties',
      'Debate: Is the American Dream achievable today?',
    ],
    assessmentIdeas: [
      'Argumentative essay on the American Dream',
      'Visual project comparing 1920s to modern wealth culture',
    ],
  },
  {
    id: 'gatsby-symbolism',
    title: 'The Green Light and Beyond: Symbolism in Gatsby',
    description: 'Explore Fitzgerald\'s use of color, setting, and objects as symbols.',
    textId: 'the-great-gatsby',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Identify major symbols: green light, Valley of Ashes, eyes of Dr. T.J. Eckleburg',
      'Analyze how symbols develop themes',
      'Write symbolism-focused literary analysis',
    ],
    activities: [
      'Symbol scavenger hunt with textual evidence',
      'Color-coding exercise for Fitzgerald\'s palette',
      'Create symbol map connecting images to themes',
    ],
    assessmentIdeas: [
      'Symbol analysis essay with textual evidence',
      'Creative: Design a movie poster with symbolic elements',
    ],
  },

  // HAMLET
  {
    id: 'hamlet-revenge',
    title: 'The Complexity of Revenge',
    description: 'Analyze how Shakespeare explores the moral implications of revenge.',
    textId: 'hamlet',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Trace the revenge plot and its consequences',
      'Compare Hamlet\'s approach to Laertes\' and Fortinbras\'',
      'Evaluate Shakespeare\'s message about revenge',
    ],
    activities: [
      'Character comparison chart: Three avengers',
      'Fishbowl discussion on revenge ethics',
      'Performance of key confrontation scenes',
    ],
    assessmentIdeas: [
      'Comparative essay on the three revenge plots',
      'Modern parallel: When is revenge justified?',
    ],
  },
  {
    id: 'hamlet-soliloquies',
    title: 'Inside Hamlet\'s Mind: The Soliloquies',
    description: 'Deep dive into Hamlet\'s famous soliloquies and what they reveal.',
    textId: 'hamlet',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'SL.11-12.4'],
    objectives: [
      'Understand the function of soliloquies in drama',
      'Analyze language, imagery, and rhetorical devices',
      'Perform and interpret soliloquies',
    ],
    activities: [
      'Close reading of "To be or not to be"',
      'Student performances with director\'s notes',
      'Modernize a soliloquy in contemporary language',
    ],
    assessmentIdeas: [
      'Soliloquy analysis essay',
      'Creative: Write your own soliloquy in Hamlet\'s voice',
    ],
  },

  // MACBETH
  {
    id: 'macbeth-ambition',
    title: 'The Corruption of Ambition',
    description: 'Explore how unchecked ambition leads to moral decay and destruction.',
    textId: 'macbeth',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Trace Macbeth\'s moral decline through the play',
      'Analyze Lady Macbeth\'s influence and parallel arc',
      'Discuss modern examples of corrupting ambition',
    ],
    activities: [
      'Character arc timeline with key decisions',
      'Debate: Who is more responsible—Macbeth or Lady Macbeth?',
      'Journal: When does ambition become dangerous?',
    ],
    assessmentIdeas: [
      'Character analysis essay on moral corruption',
      'Creative: News report on Macbeth\'s reign of terror',
    ],
  },
  {
    id: 'macbeth-supernatural',
    title: 'The Supernatural in Macbeth',
    description: 'Analyze Shakespeare\'s use of witches, ghosts, and prophecy.',
    textId: 'macbeth',
    duration: '45 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Identify supernatural elements and their function',
      'Analyze how the supernatural creates atmosphere',
      'Debate fate vs. free will in the play',
    ],
    activities: [
      'Witch scene performance and analysis',
      'Imagery hunt: darkness, blood, sleep',
      'Discussion: Do the witches cause events or predict them?',
    ],
    assessmentIdeas: [
      'Essay on the role of the supernatural',
      'Creative: Modern witch prophecy scene',
    ],
  },

  // 1984
  {
    id: '1984-surveillance',
    title: 'Big Brother Is Watching: Surveillance and Privacy',
    description: 'Examine Orwell\'s warnings about government surveillance.',
    textId: '1984',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Analyze how the Party uses surveillance for control',
      'Connect Orwell\'s dystopia to modern technology',
      'Evaluate the trade-offs between security and privacy',
    ],
    activities: [
      'Mapping surveillance in Oceania',
      'Research: Modern surveillance technologies',
      'Socratic seminar on privacy rights',
    ],
    assessmentIdeas: [
      'Argumentative essay on surveillance in society',
      'Research project on digital privacy',
    ],
  },
  {
    id: '1984-language-power',
    title: 'Newspeak: Language as a Tool of Control',
    description: 'Explore how the Party uses language manipulation to limit thought.',
    textId: '1984',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'L.11-12.1'],
    objectives: [
      'Understand Newspeak principles and purpose',
      'Analyze how language shapes thought',
      'Create Newspeak translations and discuss implications',
    ],
    activities: [
      'Newspeak dictionary creation',
      'Rewrite famous quotes in Newspeak',
      'Discussion: Can language limit freedom?',
    ],
    assessmentIdeas: [
      'Essay on the relationship between language and freedom',
      'Creative: Design a modern Newspeak',
    ],
  },

  // THE CRUCIBLE
  {
    id: 'crucible-mass-hysteria',
    title: 'Mass Hysteria: Salem and Beyond',
    description: 'Analyze how fear leads to persecution in Salem and modern parallels.',
    textId: 'the-crucible',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.9', 'SL.11-12.1'],
    objectives: [
      'Understand the historical context of Salem witch trials',
      'Analyze how Miller depicts mass hysteria',
      'Connect to McCarthyism and modern examples',
    ],
    activities: [
      'Historical context presentation',
      'Scene analysis: The court scenes',
      'Research project on McCarthyism',
    ],
    assessmentIdeas: [
      'Comparative essay: Salem and McCarthy era',
      'Research: Modern witch hunts',
    ],
  },

  // BELOVED
  {
    id: 'beloved-memory-trauma',
    title: 'Rememory: Trauma and Memory in Beloved',
    description: 'Explore how Morrison uses non-linear narrative to depict trauma.',
    textId: 'beloved',
    duration: '55 minutes',
    standards: ['RL.11-12.5', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Understand Morrison\'s concept of "rememory"',
      'Analyze the non-linear structure and its purpose',
      'Discuss how literature can represent trauma',
    ],
    activities: [
      'Timeline reconstruction exercise',
      'Close reading of memory passages',
      'Discussion: How do we process collective trauma?',
    ],
    assessmentIdeas: [
      'Essay on narrative structure and meaning',
      'Creative: Write a "rememory" of a historical event',
    ],
  },

  // FRANKENSTEIN
  {
    id: 'frankenstein-creation',
    title: 'Playing God: Science and Responsibility',
    description: 'Examine the ethical implications of Victor\'s experiment.',
    textId: 'frankenstein',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Analyze Victor\'s motivations and moral blindness',
      'Evaluate the Creature\'s humanity',
      'Connect to modern debates about scientific ethics',
    ],
    activities: [
      'Trial: Victor vs. The Creature',
      'Research: Modern "Frankenstein" technologies',
      'Debate: Should science have limits?',
    ],
    assessmentIdeas: [
      'Argumentative essay on scientific responsibility',
      'Research project on AI or genetic engineering ethics',
    ],
  },

  // ROMEO AND JULIET
  {
    id: 'rj-dramatic-irony',
    title: 'The Power of Dramatic Irony',
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
      'Fishbowl discussion: Who should we blame?',
      'Scene performance highlighting ironic moments',
    ],
    assessmentIdeas: [
      'Essay: How does dramatic irony make the ending more tragic?',
      'Scene annotation with irony analysis',
    ],
  },
  {
    id: 'rj-love-vs-hate',
    title: 'Love vs. Hate: The Central Conflict',
    description: 'Analyze how Shakespeare juxtaposes love and hate throughout the play.',
    textId: 'romeo-and-juliet',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.4', 'W.9-10.9'],
    objectives: [
      'Identify scenes that contrast love and hate',
      'Analyze oxymorons and their thematic significance',
      'Discuss which force is more powerful in the play',
    ],
    activities: [
      'Oxymoron collection and analysis',
      'Scene comparison: love vs. fight scenes',
      'Debate: Does love or hate win in the end?',
    ],
    assessmentIdeas: [
      'Thematic essay on love and hate',
      'Creative: Rewrite the ending with love triumphant',
    ],
  },

  // HOUSE ON MANGO STREET
  {
    id: 'homs-identity',
    title: 'Finding Voice: Esperanza\'s Identity Journey',
    description: 'Trace Esperanza\'s development of voice and identity.',
    textId: 'house-on-mango-street',
    duration: '45 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.5', 'W.9-10.3'],
    objectives: [
      'Analyze how Esperanza\'s voice develops through vignettes',
      'Identify moments of self-discovery',
      'Write personal vignettes inspired by Cisneros',
    ],
    activities: [
      'Track Esperanza\'s changing language',
      'Personal name etymology exploration',
      'Vignette writing workshop',
    ],
    assessmentIdeas: [
      'Thematic essay on identity and belonging',
      'Personal vignette collection',
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

  // LORD OF THE FLIES
  {
    id: 'lotf-civilization',
    title: 'Civilization vs. Savagery',
    description: 'Explore Golding\'s allegory about human nature and society.',
    textId: 'lord-of-the-flies',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.4', 'SL.9-10.1'],
    objectives: [
      'Identify the allegorical elements of the novel',
      'Analyze how the boys\' society degenerates',
      'Debate Golding\'s view of human nature',
    ],
    activities: [
      'Symbol mapping: conch, fire, glasses, beast',
      'Character allegory identification',
      'Philosophical discussion on human nature',
    ],
    assessmentIdeas: [
      'Essay on allegory and meaning',
      'Creative: What would you have done on the island?',
    ],
  },

  // THINGS FALL APART
  {
    id: 'tfa-colonialism',
    title: 'Things Fall Apart: The Impact of Colonialism',
    description: 'Analyze how Achebe portrays the destruction of Igbo culture.',
    textId: 'things-fall-apart',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.6', 'SL.9-10.1'],
    objectives: [
      'Understand pre-colonial Igbo society as Achebe depicts it',
      'Analyze the stages of colonial intrusion',
      'Evaluate Achebe\'s critique of colonialism',
    ],
    activities: [
      'Before/After chart of Umuofia',
      'Close reading of the Commissioner\'s final thoughts',
      'Discussion: Whose story gets told in history?',
    ],
    assessmentIdeas: [
      'Essay on cultural destruction',
      'Research: Post-colonial perspectives on African history',
    ],
  },

  // FAHRENHEIT 451
  {
    id: 'f451-censorship',
    title: 'Burning Books, Burning Ideas',
    description: 'Explore Bradbury\'s warning about censorship and intellectual freedom.',
    textId: 'fahrenheit-451',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.9', 'SL.9-10.1'],
    objectives: [
      'Analyze the society\'s reasons for banning books',
      'Connect to real-world book banning and censorship',
      'Evaluate the importance of intellectual freedom',
    ],
    activities: [
      'Research: Banned books in America',
      'Debate: When, if ever, is censorship justified?',
      'Book defense presentation',
    ],
    assessmentIdeas: [
      'Argumentative essay on intellectual freedom',
      'Research on a banned book and its controversy',
    ],
  },

  // NIGHT
  {
    id: 'night-witness',
    title: 'Bearing Witness: The Power of Testimony',
    description: 'Explore Wiesel\'s role as a witness to the Holocaust.',
    textId: 'night',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.6', 'SL.9-10.1'],
    objectives: [
      'Understand memoir as a form of testimony',
      'Analyze Wiesel\'s purpose in writing Night',
      'Discuss the importance of remembering atrocities',
    ],
    activities: [
      'Close reading of the final passages',
      'Research: Other Holocaust testimonies',
      'Reflection: Why must we remember?',
    ],
    assessmentIdeas: [
      'Reflective essay on memory and justice',
      'Research on genocide prevention',
    ],
  },

  // A RAISIN IN THE SUN
  {
    id: 'raisin-dreams',
    title: 'Dreams Deferred: The Younger Family\'s Aspirations',
    description: 'Analyze how each character\'s dreams reflect broader American themes.',
    textId: 'a-raisin-in-the-sun',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify each character\'s dream and obstacles',
      'Connect to Langston Hughes\' poem "Harlem"',
      'Discuss the American Dream for Black Americans in the 1950s',
    ],
    activities: [
      'Character dream chart',
      'Hughes poem analysis and connection',
      'Role-play: Family meeting about the check',
    ],
    assessmentIdeas: [
      'Essay on dreams and obstacles',
      'Creative: Update the play to the present day',
    ],
  },

  // OF MICE AND MEN
  {
    id: 'omam-loneliness',
    title: 'The Loneliest Characters in Literature',
    description: 'Explore Steinbeck\'s portrayal of isolation and connection.',
    textId: 'of-mice-and-men',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify lonely characters and their coping mechanisms',
      'Analyze George and Lennie\'s friendship as antidote',
      'Connect to themes of belonging and community',
    ],
    activities: [
      'Character loneliness scale',
      'Close reading of Crooks\' room scene',
      'Discussion: What makes us feel connected?',
    ],
    assessmentIdeas: [
      'Character analysis essay on isolation',
      'Creative: Letter from one lonely character to another',
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

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

export function getTextsByGrade(gradeLevel: string): LiteraryText[] {
  return LITERARY_TEXTS.filter(t => t.gradeLevel.includes(gradeLevel));
}

export function getTextsByGenre(genre: string): LiteraryText[] {
  return LITERARY_TEXTS.filter(t => t.genre.toLowerCase().includes(genre.toLowerCase()));
}

export function searchTexts(query: string): LiteraryText[] {
  const lowerQuery = query.toLowerCase();
  return LITERARY_TEXTS.filter(t => 
    t.title.toLowerCase().includes(lowerQuery) ||
    t.author.toLowerCase().includes(lowerQuery) ||
    t.themes.some(theme => theme.toLowerCase().includes(lowerQuery)) ||
    t.genre.toLowerCase().includes(lowerQuery)
  );
}
