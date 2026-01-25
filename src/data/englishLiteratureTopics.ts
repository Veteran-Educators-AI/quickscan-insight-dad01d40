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
// 5-10 lessons per text covering themes, devices, characters, and skills
// ============================================

export const LESSON_SUGGESTIONS: LessonSuggestion[] = [
  // ============================================
  // THE OUTSIDERS (7 lessons)
  // ============================================
  {
    id: 'outsiders-class-conflict',
    title: 'Understanding Class Conflict in The Outsiders',
    description: 'Explore how socioeconomic divisions drive the plot and shape character identities.',
    textId: 'the-outsiders',
    duration: '45 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify examples of class conflict between Greasers and Socs',
      'Analyze how economic status affects character behavior',
      'Discuss stereotypes and their harmful effects',
    ],
    activities: [
      'Create a Venn diagram comparing Greasers and Socs',
      'Socratic seminar on class and identity',
      'Journal: When have you felt judged by your background?',
    ],
    assessmentIdeas: [
      'Essay on how class shapes identity in the novel',
      'Character analysis comparing Johnny and Bob',
    ],
  },
  {
    id: 'outsiders-symbolism',
    title: 'Symbolism in The Outsiders: Gold, Sunsets, and More',
    description: 'Analyze key symbols and their deeper meanings throughout the novel.',
    textId: 'the-outsiders',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Identify major symbols: sunsets, gold, the church, hair',
      'Analyze how symbols connect to themes of innocence and change',
      'Connect Robert Frost\'s poem to the novel\'s message',
    ],
    activities: [
      'Symbol hunt with textual evidence chart',
      'Close reading of "Nothing Gold Can Stay"',
      'Create symbolic artwork representing a theme',
    ],
    assessmentIdeas: [
      'Symbol analysis essay with textual evidence',
      'Creative: Design a book cover with symbolic elements',
    ],
  },
  {
    id: 'outsiders-ponyboy-growth',
    title: 'Ponyboy\'s Coming-of-Age Journey',
    description: 'Trace Ponyboy\'s character development from beginning to end.',
    textId: 'the-outsiders',
    duration: '45 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.5', 'W.9-10.3'],
    objectives: [
      'Identify key moments of growth for Ponyboy',
      'Analyze how events change his perspective',
      'Compare his views at the beginning vs. end',
    ],
    activities: [
      'Character arc timeline with quotes',
      'Before/after perspective comparison',
      'Journal: Write as Ponyboy reflecting on his journey',
    ],
    assessmentIdeas: [
      'Character development essay',
      'Creative: Letter from older Ponyboy to his younger self',
    ],
  },
  {
    id: 'outsiders-heroism',
    title: 'Defining Heroism: Johnny and Dally',
    description: 'Examine different types of heroism through character analysis.',
    textId: 'the-outsiders',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.1', 'SL.9-10.4'],
    objectives: [
      'Define heroism and identify heroic acts in the novel',
      'Compare Johnny\'s heroism to Dally\'s',
      'Discuss whether heroism requires sacrifice',
    ],
    activities: [
      'Heroism definition brainstorm',
      'Character comparison chart',
      'Debate: Who is the true hero?',
    ],
    assessmentIdeas: [
      'Comparative essay on heroism',
      'Presentation on real-world heroes',
    ],
  },
  {
    id: 'outsiders-loyalty-family',
    title: 'Loyalty and Chosen Family in The Outsiders',
    description: 'Explore themes of brotherhood, loyalty, and found family.',
    textId: 'the-outsiders',
    duration: '45 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify examples of loyalty among the Greasers',
      'Analyze the concept of chosen vs. biological family',
      'Discuss how loyalty affects character decisions',
    ],
    activities: [
      'Loyalty web mapping relationships',
      'Scene analysis: moments of sacrifice',
      'Discussion: What makes a family?',
    ],
    assessmentIdeas: [
      'Thematic essay on loyalty',
      'Creative: Write a scene showing the gang five years later',
    ],
  },
  {
    id: 'outsiders-first-person',
    title: 'The Power of First-Person Narration',
    description: 'Analyze how Ponyboy\'s perspective shapes our understanding.',
    textId: 'the-outsiders',
    duration: '45 minutes',
    standards: ['RL.9-10.6', 'RL.9-10.5', 'W.9-10.3'],
    objectives: [
      'Identify characteristics of first-person narration',
      'Analyze how Ponyboy\'s bias affects the story',
      'Consider events from other characters\' perspectives',
    ],
    activities: [
      'Rewrite a scene from Cherry\'s perspective',
      'Identify moments of narrator bias',
      'Compare first-person to third-person passages',
    ],
    assessmentIdeas: [
      'Point of view analysis essay',
      'Creative: Retell a key scene from another character\'s POV',
    ],
  },
  {
    id: 'outsiders-violence',
    title: 'Violence and Its Consequences',
    description: 'Examine how violence affects characters and perpetuates cycles.',
    textId: 'the-outsiders',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify acts of violence and their consequences',
      'Analyze how violence creates cycles of retaliation',
      'Discuss alternatives to violence in conflicts',
    ],
    activities: [
      'Violence consequence chain mapping',
      'Character analysis: Who is most affected by violence?',
      'Discussion: How can cycles of violence be broken?',
    ],
    assessmentIdeas: [
      'Essay on violence and consequences',
      'Research: Youth violence prevention programs',
    ],
  },

  // ============================================
  // ROMEO AND JULIET (8 lessons)
  // ============================================
  {
    id: 'rj-prologue',
    title: 'Decoding the Prologue: Fate and Foreshadowing',
    description: 'Analyze the prologue\'s structure, language, and thematic hints.',
    textId: 'romeo-and-juliet',
    duration: '45 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.5', 'SL.9-10.1'],
    objectives: [
      'Understand the sonnet structure of the prologue',
      'Identify key terms and foreshadowing elements',
      'Discuss how knowing the ending affects reading',
    ],
    activities: [
      'Line-by-line annotation of the prologue',
      'Sonnet structure analysis',
      'Discussion: Why spoil the ending?',
    ],
    assessmentIdeas: [
      'Prologue analysis essay',
      'Creative: Write a prologue for a modern love story',
    ],
  },
  {
    id: 'rj-language-love',
    title: 'The Language of Love: Poetry and Passion',
    description: 'Explore how Shakespeare uses poetry to express love.',
    textId: 'romeo-and-juliet',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.5', 'W.9-10.3'],
    objectives: [
      'Analyze the balcony scene for poetic devices',
      'Identify metaphors, similes, and imagery in love scenes',
      'Compare Shakespeare\'s love language to modern expressions',
    ],
    activities: [
      'Balcony scene close reading',
      'Poetic device scavenger hunt',
      'Modern translation activity',
    ],
    assessmentIdeas: [
      'Essay on Shakespeare\'s love language',
      'Creative: Write a love poem using Shakespearean techniques',
    ],
  },
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
  {
    id: 'rj-youth-vs-age',
    title: 'Youth vs. Age: Generational Conflict',
    description: 'Explore how adults and youth clash throughout the play.',
    textId: 'romeo-and-juliet',
    duration: '45 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Identify conflicts between generations',
      'Analyze how adults fail the young lovers',
      'Discuss whether the tragedy could have been prevented',
    ],
    activities: [
      'Character chart: adults vs. youth',
      'Role-play: Parent council meeting',
      'Discussion: Who is most to blame?',
    ],
    assessmentIdeas: [
      'Essay on generational conflict',
      'Mock trial assigning blame',
    ],
  },
  {
    id: 'rj-fate-choice',
    title: 'Fate vs. Free Will: Are the Lovers Doomed?',
    description: 'Debate whether fate or choices determine the tragedy.',
    textId: 'romeo-and-juliet',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.6', 'SL.9-10.3'],
    objectives: [
      'Identify references to fate and stars',
      'Analyze moments where characters make choices',
      'Formulate an argument about fate vs. free will',
    ],
    activities: [
      'Fate vs. choice evidence chart',
      'Philosophical chairs debate',
      'Close reading of "star-crossed" passages',
    ],
    assessmentIdeas: [
      'Argumentative essay on fate',
      'Creative: Rewrite a scene changing one choice',
    ],
  },
  {
    id: 'rj-mercutio-tybalt',
    title: 'Foils and Fighters: Mercutio and Tybalt',
    description: 'Analyze how supporting characters illuminate themes.',
    textId: 'romeo-and-juliet',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.4', 'W.9-10.9'],
    objectives: [
      'Define foil and identify examples',
      'Compare Mercutio and Tybalt as characters',
      'Analyze how their deaths affect the plot',
    ],
    activities: [
      'Character comparison chart',
      'Queen Mab speech analysis',
      'Scene performance: the duel',
    ],
    assessmentIdeas: [
      'Foil analysis essay',
      'Character study presentation',
    ],
  },
  {
    id: 'rj-performing-shakespeare',
    title: 'From Page to Stage: Performing Shakespeare',
    description: 'Explore how performance choices affect interpretation.',
    textId: 'romeo-and-juliet',
    duration: '60 minutes',
    standards: ['RL.9-10.7', 'SL.9-10.6', 'RL.9-10.4'],
    objectives: [
      'Compare different film/stage interpretations',
      'Analyze how performance choices convey meaning',
      'Perform scenes with deliberate interpretive choices',
    ],
    activities: [
      'Film comparison (Zeffirelli vs. Luhrmann)',
      'Scene blocking workshop',
      'Performance with director\'s notes',
    ],
    assessmentIdeas: [
      'Comparative analysis of interpretations',
      'Group performance with written rationale',
    ],
  },

  // ============================================
  // TO KILL A MOCKINGBIRD (8 lessons)
  // ============================================
  {
    id: 'tkam-racial-injustice',
    title: 'Confronting Racial Injustice in Maycomb',
    description: 'Analyze the trial and its representation of systemic racism.',
    textId: 'to-kill-a-mockingbird',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.6', 'SL.9-10.1'],
    objectives: [
      'Understand the historical context of Jim Crow South',
      'Analyze the trial as a representation of injustice',
      'Discuss connections to contemporary issues',
    ],
    activities: [
      'Historical context research',
      'Mock trial analysis',
      'Discussion: Has justice improved?',
    ],
    assessmentIdeas: [
      'Essay connecting to modern civil rights issues',
      'Research on historical trials',
    ],
  },
  {
    id: 'tkam-atticus-heroism',
    title: 'Atticus Finch: Hero or Flawed Figure?',
    description: 'Critically analyze Atticus as a moral compass.',
    textId: 'to-kill-a-mockingbird',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.6', 'SL.9-10.1'],
    objectives: [
      'Identify Atticus\'s heroic qualities',
      'Analyze criticisms of Atticus\'s approach',
      'Debate whether he is a true hero or complicit',
    ],
    activities: [
      'Character evidence chart',
      'Reading contemporary critiques',
      'Debate: Is Atticus the hero we need?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Response to Go Set a Watchman revelations',
    ],
  },
  {
    id: 'tkam-scout-innocence',
    title: 'Scout\'s Loss of Innocence',
    description: 'Trace Scout\'s moral development throughout the novel.',
    textId: 'to-kill-a-mockingbird',
    duration: '45 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.5', 'W.9-10.3'],
    objectives: [
      'Identify key moments of Scout\'s growth',
      'Analyze how she learns empathy',
      'Connect her journey to the mockingbird symbol',
    ],
    activities: [
      'Character arc timeline',
      'Quote analysis: Scout\'s changing perspective',
      'Journal: A time you learned a hard truth',
    ],
    assessmentIdeas: [
      'Coming-of-age essay',
      'Creative: Scout as an adult reflecting on childhood',
    ],
  },
  {
    id: 'tkam-mockingbird-symbol',
    title: 'The Mockingbird Symbol: Innocence Destroyed',
    description: 'Analyze the mockingbird as a central symbol.',
    textId: 'to-kill-a-mockingbird',
    duration: '45 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Identify characters represented by the mockingbird',
      'Analyze how innocence is destroyed in the novel',
      'Connect the symbol to the novel\'s message',
    ],
    activities: [
      'Symbol mapping activity',
      'Close reading of mockingbird passages',
      'Discussion: Who are today\'s mockingbirds?',
    ],
    assessmentIdeas: [
      'Symbol analysis essay',
      'Creative: Modern mockingbird poem',
    ],
  },
  {
    id: 'tkam-boo-radley',
    title: 'Boo Radley: From Monster to Mockingbird',
    description: 'Trace how perception of Boo changes throughout the novel.',
    textId: 'to-kill-a-mockingbird',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Track Boo Radley references throughout the novel',
      'Analyze how Scout\'s perception changes',
      'Discuss themes of prejudice and understanding',
    ],
    activities: [
      'Boo Radley perception timeline',
      'Symbolic gifts analysis',
      'Discussion: Judging the unknown',
    ],
    assessmentIdeas: [
      'Character transformation essay',
      'Creative: Boo\'s perspective on the children',
    ],
  },
  {
    id: 'tkam-setting-character',
    title: 'Maycomb as Character: Setting and Society',
    description: 'Analyze how setting shapes characters and plot.',
    textId: 'to-kill-a-mockingbird',
    duration: '45 minutes',
    standards: ['RL.9-10.1', 'RL.9-10.5', 'W.9-10.9'],
    objectives: [
      'Identify elements of the Maycomb setting',
      'Analyze how setting reflects social hierarchy',
      'Discuss how place shapes identity',
    ],
    activities: [
      'Maycomb map creation',
      'Setting description analysis',
      'Comparison: Maycomb vs. your community',
    ],
    assessmentIdeas: [
      'Setting analysis essay',
      'Creative: Description of Maycomb in a different era',
    ],
  },
  {
    id: 'tkam-courage',
    title: 'Types of Courage in Maycomb',
    description: 'Explore different definitions and examples of courage.',
    textId: 'to-kill-a-mockingbird',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Define different types of courage',
      'Identify courageous acts by various characters',
      'Discuss Atticus\'s definition of real courage',
    ],
    activities: [
      'Courage definition brainstorm',
      'Mrs. Dubose analysis',
      'Discussion: When is it hardest to be brave?',
    ],
    assessmentIdeas: [
      'Thematic essay on courage',
      'Personal narrative: A time you showed courage',
    ],
  },
  {
    id: 'tkam-narrator-perspective',
    title: 'The Adult Scout Looking Back',
    description: 'Analyze the dual perspective of child and adult narrator.',
    textId: 'to-kill-a-mockingbird',
    duration: '45 minutes',
    standards: ['RL.9-10.6', 'RL.9-10.5', 'W.9-10.3'],
    objectives: [
      'Identify moments of adult vs. child perspective',
      'Analyze how dual perspective creates meaning',
      'Discuss the effect of retrospective narration',
    ],
    activities: [
      'Perspective identification exercise',
      'Quote sorting: child vs. adult Scout',
      'Writing: Describe a childhood memory as an adult',
    ],
    assessmentIdeas: [
      'Point of view analysis essay',
      'Creative: Scene from adult Scout\'s present',
    ],
  },

  // ============================================
  // THE GREAT GATSBY (10 lessons)
  // ============================================
  {
    id: 'gatsby-american-dream',
    title: 'The American Dream: Promise and Corruption',
    description: 'Analyze how Fitzgerald critiques the American Dream.',
    textId: 'the-great-gatsby',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Define the American Dream and its historical context',
      'Analyze how Gatsby embodies and fails the Dream',
      'Discuss whether the Dream is achievable or illusory',
    ],
    activities: [
      'American Dream definition brainstorm',
      'Gatsby\'s journey mapping',
      'Debate: Is the Dream alive today?',
    ],
    assessmentIdeas: [
      'Thematic essay on the American Dream',
      'Research on modern wealth inequality',
    ],
  },
  {
    id: 'gatsby-symbolism',
    title: 'Symbols of Desire: Green Light, Eyes, Valley of Ashes',
    description: 'Analyze the major symbols and their meanings.',
    textId: 'the-great-gatsby',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.2', 'W.11-12.9'],
    objectives: [
      'Identify and interpret major symbols',
      'Analyze how symbols reinforce themes',
      'Connect symbols to character motivations',
    ],
    activities: [
      'Symbol mapping with textual evidence',
      'Visual representation of symbols',
      'Close reading of symbolic passages',
    ],
    assessmentIdeas: [
      'Symbol analysis essay',
      'Creative: Design Gatsby\'s mansion with symbolic elements',
    ],
  },
  {
    id: 'gatsby-nick-narrator',
    title: 'Nick Carraway: Reliable or Unreliable?',
    description: 'Critically analyze Nick\'s role and reliability as narrator.',
    textId: 'the-great-gatsby',
    duration: '50 minutes',
    standards: ['RL.11-12.6', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Identify characteristics of Nick\'s narration',
      'Analyze moments of bias or contradiction',
      'Discuss the effect of an unreliable narrator',
    ],
    activities: [
      'Nick\'s contradictions scavenger hunt',
      'Rewrite scenes from another perspective',
      'Debate: Can we trust Nick?',
    ],
    assessmentIdeas: [
      'Narrator analysis essay',
      'Creative: The story from Jordan\'s perspective',
    ],
  },
  {
    id: 'gatsby-class-wealth',
    title: 'Old Money vs. New Money: Class in the 1920s',
    description: 'Analyze class divisions and their effects on characters.',
    textId: 'the-great-gatsby',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Distinguish between old money and new money',
      'Analyze how class affects character relationships',
      'Discuss Tom and Gatsby as class representatives',
    ],
    activities: [
      'East Egg vs. West Egg comparison',
      'Character positioning on class spectrum',
      'Discussion: Does wealth equal worth?',
    ],
    assessmentIdeas: [
      'Essay on class and character',
      'Research on Gilded Age wealth',
    ],
  },
  {
    id: 'gatsby-daisy-women',
    title: 'Women in Gatsby: Daisy, Jordan, and Myrtle',
    description: 'Analyze the portrayal and roles of women in the novel.',
    textId: 'the-great-gatsby',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Analyze each woman\'s characterization',
      'Discuss 1920s gender expectations',
      'Evaluate Fitzgerald\'s portrayal of women',
    ],
    activities: [
      'Character comparison chart',
      'Historical context on flappers and women\'s roles',
      'Discussion: How are women judged in the novel?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: One woman\'s diary entries',
    ],
  },
  {
    id: 'gatsby-past-present',
    title: 'The Past as Obsession: Time in Gatsby',
    description: 'Analyze Gatsby\'s relationship with the past.',
    textId: 'the-great-gatsby',
    duration: '45 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'W.11-12.9'],
    objectives: [
      'Identify Gatsby\'s attempts to recreate the past',
      'Analyze the famous "boats against the current" ending',
      'Discuss whether we can escape our past',
    ],
    activities: [
      'Timeline of Gatsby\'s past vs. present',
      'Close reading of final paragraphs',
      'Philosophical discussion on memory and time',
    ],
    assessmentIdeas: [
      'Thematic essay on time and memory',
      'Creative: Letter from Gatsby to young Jimmy Gatz',
    ],
  },
  {
    id: 'gatsby-roaring-twenties',
    title: 'The Jazz Age: Historical Context',
    description: 'Connect the novel to its historical and cultural moment.',
    textId: 'the-great-gatsby',
    duration: '55 minutes',
    standards: ['RL.11-12.9', 'RL.11-12.6', 'W.11-12.7'],
    objectives: [
      'Research key elements of the 1920s',
      'Connect historical events to novel themes',
      'Analyze how Fitzgerald captures the era',
    ],
    activities: [
      'Jazz Age research stations',
      'Party scene analysis',
      'Comparison: 1920s vs. today',
    ],
    assessmentIdeas: [
      'Research project on the 1920s',
      'Creative: Invitation to one of Gatsby\'s parties',
    ],
  },
  {
    id: 'gatsby-moral-decay',
    title: 'Moral Decay and Carelessness',
    description: 'Analyze the moral failures of the novel\'s wealthy characters.',
    textId: 'the-great-gatsby',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Identify examples of moral carelessness',
      'Analyze the hit-and-run as moral symbol',
      'Discuss Tom and Daisy\'s "carelessness"',
    ],
    activities: [
      'Moral failures evidence chart',
      'Close reading of "careless people" passage',
      'Discussion: What is moral responsibility?',
    ],
    assessmentIdeas: [
      'Essay on moral decay',
      'Mock trial: Who is responsible for Gatsby\'s death?',
    ],
  },
  {
    id: 'gatsby-color-imagery',
    title: 'The Color Palette of Gatsby',
    description: 'Analyze Fitzgerald\'s use of color symbolism.',
    textId: 'the-great-gatsby',
    duration: '45 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Identify recurring colors and their associations',
      'Analyze how color reinforces characterization',
      'Create a color-coded character/theme map',
    ],
    activities: [
      'Color tracking through the novel',
      'Color symbolism chart',
      'Visual art project: Gatsby\'s color world',
    ],
    assessmentIdeas: [
      'Imagery analysis essay',
      'Creative: Paint or describe a scene emphasizing color',
    ],
  },
  {
    id: 'gatsby-tragic-hero',
    title: 'Gatsby as Tragic Hero',
    description: 'Apply classical tragic hero elements to Gatsby.',
    textId: 'the-great-gatsby',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.9', 'SL.11-12.1'],
    objectives: [
      'Define tragic hero characteristics',
      'Identify Gatsby\'s tragic flaw',
      'Debate whether Gatsby is truly heroic',
    ],
    activities: [
      'Tragic hero checklist application',
      'Comparison to classical tragic heroes',
      'Discussion: Is Gatsby admirable or foolish?',
    ],
    assessmentIdeas: [
      'Tragic hero analysis essay',
      'Comparative essay: Gatsby vs. another tragic hero',
    ],
  },

  // ============================================
  // HAMLET (9 lessons)
  // ============================================
  {
    id: 'hamlet-revenge',
    title: 'Revenge Tragedy: Justice or Destruction?',
    description: 'Explore the revenge tragedy genre and its implications.',
    textId: 'hamlet',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.9', 'SL.11-12.1'],
    objectives: [
      'Define the revenge tragedy genre',
      'Trace the cycle of revenge in the play',
      'Discuss whether revenge achieves justice',
    ],
    activities: [
      'Revenge cycle mapping',
      'Comparison to other revenge tragedies',
      'Debate: Is revenge ever justified?',
    ],
    assessmentIdeas: [
      'Essay on revenge and consequences',
      'Research on revenge in different cultures',
    ],
  },
  {
    id: 'hamlet-soliloquies',
    title: 'Inside Hamlet\'s Mind: The Soliloquies',
    description: 'Analyze Hamlet\'s major soliloquies for insight into his character.',
    textId: 'hamlet',
    duration: '60 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'SL.11-12.6'],
    objectives: [
      'Identify and interpret major soliloquies',
      'Trace Hamlet\'s psychological development',
      'Perform soliloquies with interpretive choices',
    ],
    activities: [
      'Soliloquy annotation stations',
      'Performance workshop',
      'Psychological analysis of Hamlet',
    ],
    assessmentIdeas: [
      'Close reading essay on a soliloquy',
      'Memorization and performance',
    ],
  },
  {
    id: 'hamlet-action-inaction',
    title: 'To Act or Not to Act: Hamlet\'s Delay',
    description: 'Analyze why Hamlet delays his revenge.',
    textId: 'hamlet',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Identify moments where Hamlet could act',
      'Analyze psychological and philosophical reasons for delay',
      'Discuss different theories about Hamlet\'s inaction',
    ],
    activities: [
      'Timeline of opportunities and delays',
      'Scholarly theory jigsaw',
      'Philosophical discussion on action vs. contemplation',
    ],
    assessmentIdeas: [
      'Essay defending a theory of Hamlet\'s delay',
      'Creative: Hamlet\'s therapy session',
    ],
  },
  {
    id: 'hamlet-appearance-reality',
    title: 'Appearance vs. Reality: Masks and Deception',
    description: 'Explore the theme of seeming vs. being.',
    textId: 'hamlet',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'W.11-12.9'],
    objectives: [
      'Identify characters who hide their true nature',
      'Analyze imagery of masks, acting, and deception',
      'Discuss the play-within-a-play as thematic mirror',
    ],
    activities: [
      'Character deception chart',
      'Mousetrap scene analysis',
      'Discussion: When is deception acceptable?',
    ],
    assessmentIdeas: [
      'Thematic essay on deception',
      'Creative: Claudius\'s private diary',
    ],
  },
  {
    id: 'hamlet-women',
    title: 'Gertrude and Ophelia: Women in Elsinore',
    description: 'Analyze the roles and treatment of women in the play.',
    textId: 'hamlet',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Analyze Gertrude and Ophelia as characters',
      'Discuss how men control and judge them',
      'Evaluate Shakespeare\'s portrayal of women',
    ],
    activities: [
      'Character analysis comparison',
      'Closet scene and nunnery scene analysis',
      'Discussion: Agency and victimhood',
    ],
    assessmentIdeas: [
      'Character study essay',
      'Creative: Ophelia\'s unsent letters',
    ],
  },
  {
    id: 'hamlet-mortality',
    title: 'Confronting Mortality: Death in Hamlet',
    description: 'Explore how death pervades the play\'s imagery and action.',
    textId: 'hamlet',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'W.11-12.9'],
    objectives: [
      'Identify death imagery throughout the play',
      'Analyze the graveyard scene\'s significance',
      'Discuss Hamlet\'s changing views on death',
    ],
    activities: [
      'Death imagery tracking',
      'Yorick scene close reading',
      '"To be or not to be" philosophical discussion',
    ],
    assessmentIdeas: [
      'Thematic essay on mortality',
      'Creative: Modern meditation on death inspired by Hamlet',
    ],
  },
  {
    id: 'hamlet-corruption',
    title: 'Something Rotten: Corruption in Denmark',
    description: 'Analyze political and moral corruption throughout the play.',
    textId: 'hamlet',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'SL.11-12.1'],
    objectives: [
      'Identify examples of corruption and decay',
      'Analyze disease and rot imagery',
      'Connect to themes of political corruption',
    ],
    activities: [
      'Corruption evidence chart',
      'Imagery analysis of disease and rot',
      'Modern parallels discussion',
    ],
    assessmentIdeas: [
      'Essay on corruption imagery',
      'Research on political corruption',
    ],
  },
  {
    id: 'hamlet-foils',
    title: 'Foils for Hamlet: Laertes, Fortinbras, Horatio',
    description: 'Analyze how other characters illuminate Hamlet\'s character.',
    textId: 'hamlet',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Define and identify foil characters',
      'Compare Hamlet to Laertes, Fortinbras, and Horatio',
      'Analyze what each foil reveals about Hamlet',
    ],
    activities: [
      'Foil comparison chart',
      'Scene analysis: revenge approaches',
      'Discussion: Who makes the best choices?',
    ],
    assessmentIdeas: [
      'Foil analysis essay',
      'Creative: Scene between foils without Hamlet',
    ],
  },
  {
    id: 'hamlet-madness',
    title: 'Madness Real and Performed',
    description: 'Analyze the theme of madness and its theatrical elements.',
    textId: 'hamlet',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.4', 'SL.11-12.6'],
    objectives: [
      'Distinguish between Hamlet\'s and Ophelia\'s madness',
      'Analyze the purpose of performed madness',
      'Discuss how madness relates to truth-telling',
    ],
    activities: [
      'Madness comparison chart',
      'Performance of "mad" scenes',
      'Discussion: Method in madness',
    ],
    assessmentIdeas: [
      'Essay on madness as theme',
      'Performance with director\'s notes',
    ],
  },

  // ============================================
  // 1984 (8 lessons)
  // ============================================
  {
    id: '1984-totalitarianism',
    title: 'Anatomy of Totalitarianism',
    description: 'Analyze the mechanisms of Party control.',
    textId: '1984',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.5', 'SL.11-12.1'],
    objectives: [
      'Identify methods of totalitarian control',
      'Analyze how the Party maintains power',
      'Connect to historical totalitarian regimes',
    ],
    activities: [
      'Control mechanisms chart',
      'Historical connections research',
      'Discussion: Could it happen here?',
    ],
    assessmentIdeas: [
      'Essay on methods of control',
      'Research on historical dictatorships',
    ],
  },
  {
    id: '1984-language-power',
    title: 'Newspeak: Language as Control',
    description: 'Analyze how language shapes and limits thought.',
    textId: '1984',
    duration: '55 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.2', 'W.11-12.9'],
    objectives: [
      'Understand the principles of Newspeak',
      'Analyze the connection between language and thought',
      'Discuss modern examples of language manipulation',
    ],
    activities: [
      'Newspeak dictionary analysis',
      'Translation exercises',
      'Discussion: Euphemisms in modern politics',
    ],
    assessmentIdeas: [
      'Essay on language and power',
      'Creative: Newspeak version of a text',
    ],
  },
  {
    id: '1984-doublethink',
    title: 'Doublethink and Reality Control',
    description: 'Explore the concept of holding contradictory beliefs.',
    textId: '1984',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Define and analyze doublethink',
      'Identify examples in the novel',
      'Discuss real-world parallels',
    ],
    activities: [
      'Doublethink examples chart',
      'Philosophical discussion on truth',
      'Modern media analysis',
    ],
    assessmentIdeas: [
      'Essay on reality and truth',
      'Media analysis project',
    ],
  },
  {
    id: '1984-surveillance',
    title: 'Big Brother Is Watching: Surveillance and Privacy',
    description: 'Analyze surveillance as a tool of control.',
    textId: '1984',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.9', 'SL.11-12.1'],
    objectives: [
      'Identify surveillance methods in the novel',
      'Analyze the psychological effects of constant observation',
      'Connect to modern surveillance technology',
    ],
    activities: [
      'Surveillance methods chart',
      'Research on modern surveillance',
      'Debate: Security vs. privacy',
    ],
    assessmentIdeas: [
      'Argumentative essay on surveillance',
      'Research on privacy rights',
    ],
  },
  {
    id: '1984-winston-julia',
    title: 'Rebellion and Love: Winston and Julia',
    description: 'Analyze the relationship as political resistance.',
    textId: '1984',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'W.11-12.9'],
    objectives: [
      'Analyze the relationship\'s development',
      'Discuss love as a form of rebellion',
      'Evaluate the relationship\'s ultimate failure',
    ],
    activities: [
      'Relationship timeline',
      'Close reading of key scenes',
      'Discussion: Why does the Party fear love?',
    ],
    assessmentIdeas: [
      'Essay on love and rebellion',
      'Creative: Their story after the end',
    ],
  },
  {
    id: '1984-obrien-party',
    title: 'O\'Brien and the Nature of Power',
    description: 'Analyze O\'Brien\'s role and the Party\'s philosophy.',
    textId: '1984',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Analyze O\'Brien as antagonist and symbol',
      'Understand the Party\'s philosophy of power',
      'Discuss the Room 101 scenes',
    ],
    activities: [
      'O\'Brien character analysis',
      'Close reading of torture scenes',
      'Discussion: Power for power\'s sake',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Philosophical response to O\'Brien\'s arguments',
    ],
  },
  {
    id: '1984-memory-history',
    title: 'Controlling the Past: Memory and History',
    description: 'Analyze the Party\'s manipulation of historical truth.',
    textId: '1984',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'W.11-12.9'],
    objectives: [
      'Understand Winston\'s job at the Ministry of Truth',
      'Analyze why controlling history matters',
      'Discuss the importance of accurate history',
    ],
    activities: [
      'Memory hole examples',
      'Historical manipulation research',
      'Discussion: Who writes history?',
    ],
    assessmentIdeas: [
      'Essay on history and power',
      'Research on historical revisionism',
    ],
  },
  {
    id: '1984-ending',
    title: 'The Crushing Conclusion: Analyzing the Ending',
    description: 'Interpret the novel\'s devastating final pages.',
    textId: '1984',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.5', 'SL.11-12.1'],
    objectives: [
      'Analyze the final chapter closely',
      'Discuss what Winston\'s transformation means',
      'Evaluate Orwell\'s message about resistance',
    ],
    activities: [
      'Final chapter close reading',
      '"He loved Big Brother" analysis',
      'Discussion: Is the ending hopeful at all?',
    ],
    assessmentIdeas: [
      'Essay on the ending\'s meaning',
      'Creative: Alternative ending',
    ],
  },

  // ============================================
  // BELOVED (7 lessons)
  // ============================================
  {
    id: 'beloved-trauma-memory',
    title: 'Rememory: Trauma and the Past',
    description: 'Explore Morrison\'s concept of rememory and collective trauma.',
    textId: 'beloved',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.5', 'SL.11-12.1'],
    objectives: [
      'Define and analyze "rememory" as a concept',
      'Trace how the past intrudes on the present',
      'Discuss intergenerational trauma',
    ],
    activities: [
      'Rememory passages analysis',
      'Non-linear timeline construction',
      'Discussion: How does trauma persist?',
    ],
    assessmentIdeas: [
      'Essay on memory and narrative',
      'Research on intergenerational trauma',
    ],
  },
  {
    id: 'beloved-motherhood',
    title: 'Thick Love: Motherhood Under Slavery',
    description: 'Analyze the impossible choices of enslaved mothers.',
    textId: 'beloved',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Analyze Sethe\'s relationship with her children',
      'Understand Margaret Garner\'s historical story',
      'Discuss the ethics of Sethe\'s choice',
    ],
    activities: [
      'Historical context research',
      'Close reading of the infanticide scene',
      'Ethical discussion: Was Sethe right?',
    ],
    assessmentIdeas: [
      'Essay on motherhood and slavery',
      'Research on enslaved mothers\' experiences',
    ],
  },
  {
    id: 'beloved-identity',
    title: 'Who Is Beloved? Identity and Interpretation',
    description: 'Explore the multiple meanings of Beloved\'s character.',
    textId: 'beloved',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.4', 'W.11-12.9'],
    objectives: [
      'Analyze different interpretations of Beloved',
      'Discuss supernatural vs. psychological readings',
      'Connect Beloved to the Middle Passage',
    ],
    activities: [
      'Evidence chart for interpretations',
      'Middle Passage monologue analysis',
      'Discussion: What is Beloved?',
    ],
    assessmentIdeas: [
      'Interpretation argument essay',
      'Creative: Beloved\'s full story',
    ],
  },
  {
    id: 'beloved-community',
    title: 'Community and Isolation',
    description: 'Analyze the role of community in healing.',
    textId: 'beloved',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Trace Sethe\'s isolation from the community',
      'Analyze the women\'s exorcism scene',
      'Discuss community as healing force',
    ],
    activities: [
      'Community relationship map',
      'Exorcism scene analysis',
      'Discussion: When should communities intervene?',
    ],
    assessmentIdeas: [
      'Essay on community and healing',
      'Creative: Community member\'s perspective',
    ],
  },
  {
    id: 'beloved-narrative-structure',
    title: 'Fragmented Narrative: Morrison\'s Technique',
    description: 'Analyze how the non-linear structure mirrors trauma.',
    textId: 'beloved',
    duration: '55 minutes',
    standards: ['RL.11-12.5', 'RL.11-12.4', 'W.11-12.9'],
    objectives: [
      'Map the novel\'s narrative structure',
      'Analyze why Morrison chose fragmentation',
      'Connect structure to traumatic memory',
    ],
    activities: [
      'Timeline reconstruction',
      'Structure analysis',
      'Writing exercise: Fragmented memory',
    ],
    assessmentIdeas: [
      'Essay on form and meaning',
      'Creative: Write in Morrison\'s style',
    ],
  },
  {
    id: 'beloved-slavery-legacy',
    title: 'The Legacy of Slavery',
    description: 'Connect the novel to ongoing discussions of slavery\'s aftermath.',
    textId: 'beloved',
    duration: '55 minutes',
    standards: ['RL.11-12.9', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Understand the novel\'s historical context',
      'Analyze how slavery\'s effects persist',
      'Discuss reparations and memorialization',
    ],
    activities: [
      'Historical research stations',
      'Discussion: How should we remember slavery?',
      'Connection to contemporary issues',
    ],
    assessmentIdeas: [
      'Research essay on slavery\'s legacy',
      'Op-ed on memorializing the past',
    ],
  },
  {
    id: 'beloved-denver',
    title: 'Denver\'s Coming of Age',
    description: 'Trace Denver\'s development and emergence.',
    textId: 'beloved',
    duration: '45 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.5', 'W.11-12.3'],
    objectives: [
      'Analyze Denver\'s isolation and growth',
      'Identify her turning point',
      'Discuss hope and the future',
    ],
    activities: [
      'Denver character arc timeline',
      'Close reading of her emergence',
      'Discussion: What does Denver represent?',
    ],
    assessmentIdeas: [
      'Character development essay',
      'Creative: Denver\'s future',
    ],
  },

  // ============================================
  // LORD OF THE FLIES (6 lessons)
  // ============================================
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
  {
    id: 'lotf-symbols',
    title: 'Symbols of Power and Destruction',
    description: 'Analyze the major symbols and their meanings.',
    textId: 'lord-of-the-flies',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Identify and interpret the conch, fire, glasses, and Lord of the Flies',
      'Trace how symbols change meaning',
      'Connect symbols to the allegory',
    ],
    activities: [
      'Symbol tracking chart',
      'Scene analysis for symbolic moments',
      'Visual representation project',
    ],
    assessmentIdeas: [
      'Symbol analysis essay',
      'Creative: Design symbolic artifacts',
    ],
  },
  {
    id: 'lotf-leadership',
    title: 'Ralph vs. Jack: Leadership Styles',
    description: 'Compare and contrast different approaches to leadership.',
    textId: 'lord-of-the-flies',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Analyze Ralph\'s and Jack\'s leadership qualities',
      'Discuss why Jack\'s approach succeeds',
      'Connect to real-world leadership dynamics',
    ],
    activities: [
      'Leadership comparison chart',
      'Key scene analysis',
      'Debate: Which leader would you follow?',
    ],
    assessmentIdeas: [
      'Comparative essay on leadership',
      'Research on leadership psychology',
    ],
  },
  {
    id: 'lotf-beast',
    title: 'The Beast Within: Fear and the Unknown',
    description: 'Analyze the beast as both external and internal threat.',
    textId: 'lord-of-the-flies',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.4', 'SL.9-10.1'],
    objectives: [
      'Trace the evolving concept of the beast',
      'Analyze Simon\'s understanding of the beast',
      'Discuss how fear creates monsters',
    ],
    activities: [
      'Beast evolution timeline',
      'Simon\'s encounter close reading',
      'Discussion: What are we really afraid of?',
    ],
    assessmentIdeas: [
      'Thematic essay on fear',
      'Creative: The beast\'s perspective',
    ],
  },
  {
    id: 'lotf-simon-piggy',
    title: 'The Fate of Reason and Spirituality',
    description: 'Analyze Simon and Piggy as symbolic characters.',
    textId: 'lord-of-the-flies',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.4', 'W.9-10.9'],
    objectives: [
      'Analyze what Simon and Piggy represent',
      'Discuss why they must die in the allegory',
      'Connect their deaths to Golding\'s message',
    ],
    activities: [
      'Character symbolism analysis',
      'Death scene close readings',
      'Discussion: What dies with them?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Eulogies for Simon and Piggy',
    ],
  },
  {
    id: 'lotf-ending',
    title: 'The Naval Officer: Rescue or Irony?',
    description: 'Analyze the ending\'s complexity and irony.',
    textId: 'lord-of-the-flies',
    duration: '45 minutes',
    standards: ['RL.9-10.5', 'RL.9-10.6', 'SL.9-10.1'],
    objectives: [
      'Analyze the rescue scene closely',
      'Identify irony in the officer\'s arrival',
      'Discuss what the boys return to',
    ],
    activities: [
      'Final chapter close reading',
      'Irony identification',
      'Discussion: Is this really a rescue?',
    ],
    assessmentIdeas: [
      'Essay on the ending\'s irony',
      'Creative: Ralph\'s first day back home',
    ],
  },

  // ============================================
  // THE HOUSE ON MANGO STREET (6 lessons)
  // ============================================
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
  {
    id: 'homs-women',
    title: 'Women at the Window: Gender and Confinement',
    description: 'Analyze the portrayal of women\'s limited roles.',
    textId: 'house-on-mango-street',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Identify women characters and their situations',
      'Analyze the window as recurring image',
      'Discuss Esperanza\'s determination to be different',
    ],
    activities: [
      'Women characters chart',
      'Window imagery analysis',
      'Discussion: How does Esperanza resist?',
    ],
    assessmentIdeas: [
      'Essay on gender roles',
      'Creative: A trapped woman\'s inner monologue',
    ],
  },
  {
    id: 'homs-vignette-form',
    title: 'The Art of the Vignette',
    description: 'Analyze Cisneros\'s unique narrative structure.',
    textId: 'house-on-mango-street',
    duration: '50 minutes',
    standards: ['RL.9-10.5', 'RL.9-10.4', 'W.9-10.3'],
    objectives: [
      'Define vignette as a literary form',
      'Analyze how vignettes work together',
      'Write original vignettes',
    ],
    activities: [
      'Vignette structure analysis',
      'Connection mapping between vignettes',
      'Vignette writing workshop',
    ],
    assessmentIdeas: [
      'Essay on form and meaning',
      'Personal vignette collection',
    ],
  },
  {
    id: 'homs-community',
    title: 'Mango Street: Community and Culture',
    description: 'Explore the neighborhood as character and influence.',
    textId: 'house-on-mango-street',
    duration: '45 minutes',
    standards: ['RL.9-10.1', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify community members and their roles',
      'Analyze how the neighborhood shapes Esperanza',
      'Discuss cultural identity and belonging',
    ],
    activities: [
      'Neighborhood character map',
      'Cultural elements identification',
      'Discussion: How does place shape identity?',
    ],
    assessmentIdeas: [
      'Essay on community and identity',
      'Creative: Vignette about your neighborhood',
    ],
  },
  {
    id: 'homs-leaving-returning',
    title: 'Leaving to Come Back: Esperanza\'s Promise',
    description: 'Analyze the ending and Esperanza\'s commitment.',
    textId: 'house-on-mango-street',
    duration: '45 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.5', 'SL.9-10.1'],
    objectives: [
      'Analyze the final vignettes',
      'Discuss Esperanza\'s promise to return',
      'Connect to themes of responsibility and success',
    ],
    activities: [
      'Final vignettes close reading',
      'Discussion: What does she owe Mango Street?',
      'Personal reflection: What do we owe our communities?',
    ],
    assessmentIdeas: [
      'Essay on responsibility and success',
      'Creative: Esperanza returns to Mango Street',
    ],
  },

  // ============================================
  // THINGS FALL APART (6 lessons)
  // ============================================
  {
    id: 'tfa-igbo-culture',
    title: 'Understanding Igbo Culture',
    description: 'Learn about pre-colonial Igbo society as Achebe presents it.',
    textId: 'things-fall-apart',
    duration: '55 minutes',
    standards: ['RL.9-10.1', 'RL.9-10.6', 'SL.9-10.1'],
    objectives: [
      'Identify key aspects of Igbo culture',
      'Understand proverbs as cultural expression',
      'Discuss the complexity of traditional society',
    ],
    activities: [
      'Cultural elements chart',
      'Proverb analysis and creation',
      'Discussion: Strengths and tensions in Igbo society',
    ],
    assessmentIdeas: [
      'Cultural analysis essay',
      'Creative: Modern proverbs',
    ],
  },
  {
    id: 'tfa-okonkwo',
    title: 'Okonkwo: Tragic Hero or Flawed Man?',
    description: 'Analyze Okonkwo\'s character and downfall.',
    textId: 'things-fall-apart',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Analyze Okonkwo\'s motivations and fears',
      'Apply tragic hero criteria',
      'Discuss his relationship with masculinity',
    ],
    activities: [
      'Character trait evidence chart',
      'Tragic hero checklist',
      'Discussion: Is Okonkwo sympathetic?',
    ],
    assessmentIdeas: [
      'Tragic hero essay',
      'Creative: Okonkwo\'s inner thoughts',
    ],
  },
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
  {
    id: 'tfa-missionaries',
    title: 'Religion and Resistance',
    description: 'Analyze the role of Christianity in colonial conquest.',
    textId: 'things-fall-apart',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Analyze how missionaries gain converts',
      'Discuss why some Igbo people convert',
      'Evaluate Mr. Brown vs. Reverend Smith',
    ],
    activities: [
      'Missionary strategy analysis',
      'Character comparison',
      'Discussion: Religion as tool of colonialism',
    ],
    assessmentIdeas: [
      'Essay on religion and colonialism',
      'Research on missionary history',
    ],
  },
  {
    id: 'tfa-title',
    title: 'Things Fall Apart: Understanding the Title',
    description: 'Connect Yeats\'s poem to the novel\'s themes.',
    textId: 'things-fall-apart',
    duration: '45 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Analyze Yeats\'s "The Second Coming"',
      'Connect poem to novel themes',
      'Discuss what "falls apart" on multiple levels',
    ],
    activities: [
      'Poem annotation and analysis',
      'Connection to novel events',
      'Discussion: Multiple levels of collapse',
    ],
    assessmentIdeas: [
      'Essay connecting poem and novel',
      'Creative: Modern "things fall apart" poem',
    ],
  },
  {
    id: 'tfa-ending',
    title: 'The Commissioner\'s Paragraph: Narrative Power',
    description: 'Analyze the ironic ending and its implications.',
    textId: 'things-fall-apart',
    duration: '50 minutes',
    standards: ['RL.9-10.6', 'RL.9-10.5', 'SL.9-10.1'],
    objectives: [
      'Analyze the final paragraph closely',
      'Discuss whose story gets told',
      'Connect to Achebe\'s purpose in writing',
    ],
    activities: [
      'Final page close reading',
      'Discussion: What story would the Commissioner tell?',
      'Achebe\'s critique of Heart of Darkness',
    ],
    assessmentIdeas: [
      'Essay on narrative and power',
      'Research on Achebe\'s literary criticism',
    ],
  },

  // ============================================
  // MACBETH (7 lessons)
  // ============================================
  {
    id: 'macbeth-ambition',
    title: 'Vaulting Ambition: The Seeds of Destruction',
    description: 'Analyze ambition as Macbeth\'s tragic flaw.',
    textId: 'macbeth',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Trace how ambition corrupts Macbeth',
      'Analyze key ambition soliloquies',
      'Discuss the nature of ambition',
    ],
    activities: [
      'Ambition timeline',
      'Soliloquy annotation',
      'Discussion: When does ambition become dangerous?',
    ],
    assessmentIdeas: [
      'Essay on ambition and corruption',
      'Modern parallel analysis',
    ],
  },
  {
    id: 'macbeth-lady-macbeth',
    title: 'Lady Macbeth: Partner in Crime',
    description: 'Analyze Lady Macbeth\'s role and transformation.',
    textId: 'macbeth',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.4', 'SL.11-12.6'],
    objectives: [
      'Analyze Lady Macbeth\'s characterization',
      'Trace her psychological deterioration',
      'Discuss gender and power dynamics',
    ],
    activities: [
      'Character arc mapping',
      'Sleepwalking scene analysis',
      'Performance: "Unsex me here" speech',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Performance with interpretation notes',
    ],
  },
  {
    id: 'macbeth-supernatural',
    title: 'The Weird Sisters: Fate and Free Will',
    description: 'Analyze the witches and supernatural elements.',
    textId: 'macbeth',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'SL.11-12.1'],
    objectives: [
      'Analyze the witches\' role and language',
      'Discuss fate vs. free will',
      'Connect to Jacobean beliefs',
    ],
    activities: [
      'Witch scene analysis',
      'Prophecy tracking',
      'Debate: Did the witches cause Macbeth\'s fall?',
    ],
    assessmentIdeas: [
      'Essay on supernatural and choice',
      'Research on Jacobean witchcraft',
    ],
  },
  {
    id: 'macbeth-blood-imagery',
    title: 'Out, Damned Spot: Blood Imagery',
    description: 'Analyze the recurring blood motif.',
    textId: 'macbeth',
    duration: '45 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Track blood imagery throughout the play',
      'Analyze what blood represents',
      'Connect imagery to guilt and violence',
    ],
    activities: [
      'Blood imagery collection',
      'Meaning evolution chart',
      'Visual art: Blood in Macbeth',
    ],
    assessmentIdeas: [
      'Imagery analysis essay',
      'Creative: Poem using blood imagery',
    ],
  },
  {
    id: 'macbeth-guilt',
    title: 'The Psychology of Guilt',
    description: 'Analyze how guilt manifests in the Macbeths.',
    textId: 'macbeth',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Identify manifestations of guilt',
      'Compare how Macbeth and Lady Macbeth handle guilt',
      'Discuss psychological accuracy',
    ],
    activities: [
      'Guilt manifestation chart',
      'Character comparison',
      'Discussion: Can guilt be escaped?',
    ],
    assessmentIdeas: [
      'Essay on guilt and psychology',
      'Creative: Macbeth\'s therapy session',
    ],
  },
  {
    id: 'macbeth-tyranny',
    title: 'From King to Tyrant: Political Power',
    description: 'Analyze Macbeth\'s rule and its consequences.',
    textId: 'macbeth',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Trace Macbeth\'s transformation as ruler',
      'Compare to legitimate kingship (Duncan, Malcolm)',
      'Connect to political philosophy',
    ],
    activities: [
      'Kingship comparison chart',
      'Scotland under Macbeth analysis',
      'Discussion: What makes a good leader?',
    ],
    assessmentIdeas: [
      'Essay on power and corruption',
      'Modern parallel analysis',
    ],
  },
  {
    id: 'macbeth-tomorrow',
    title: 'Tomorrow and Tomorrow: The Final Speeches',
    description: 'Analyze Macbeth\'s famous final soliloquies.',
    textId: 'macbeth',
    duration: '55 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'SL.11-12.6'],
    objectives: [
      'Close read the "Tomorrow" speech',
      'Analyze Macbeth\'s final philosophy',
      'Discuss nihilism and meaning',
    ],
    activities: [
      'Line-by-line annotation',
      'Performance workshop',
      'Philosophical discussion on meaning',
    ],
    assessmentIdeas: [
      'Close reading essay',
      'Performance with interpretation notes',
    ],
  },

  // ============================================
  // THE CRUCIBLE (6 lessons)
  // ============================================
  {
    id: 'crucible-hysteria',
    title: 'Mass Hysteria: Then and Now',
    description: 'Analyze how fear spreads in Salem.',
    textId: 'the-crucible',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.9', 'SL.11-12.1'],
    objectives: [
      'Trace the spread of hysteria in the play',
      'Analyze the psychology of mass fear',
      'Connect to modern examples',
    ],
    activities: [
      'Hysteria timeline',
      'Psychology of panic research',
      'Modern examples discussion',
    ],
    assessmentIdeas: [
      'Essay on mass hysteria',
      'Research on historical witch hunts',
    ],
  },
  {
    id: 'crucible-mccarthyism',
    title: 'The Crucible as Allegory: McCarthyism',
    description: 'Connect the play to Miller\'s historical moment.',
    textId: 'the-crucible',
    duration: '55 minutes',
    standards: ['RL.11-12.9', 'RL.11-12.6', 'W.11-12.7'],
    objectives: [
      'Understand McCarthyism historical context',
      'Identify allegorical connections',
      'Analyze why Miller chose Salem',
    ],
    activities: [
      'McCarthyism research',
      'Allegory mapping',
      'Discussion: Art as political response',
    ],
    assessmentIdeas: [
      'Essay on allegory and meaning',
      'Research on Miller\'s HUAC testimony',
    ],
  },
  {
    id: 'crucible-proctor',
    title: 'John Proctor: Flawed Hero',
    description: 'Analyze Proctor\'s moral journey.',
    textId: 'the-crucible',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Analyze Proctor\'s character development',
      'Discuss his final choice',
      'Evaluate his heroism',
    ],
    activities: [
      'Character arc mapping',
      'Final scene analysis',
      'Discussion: What would you choose?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Proctor\'s final letter',
    ],
  },
  {
    id: 'crucible-reputation',
    title: 'Name and Reputation',
    description: 'Analyze the theme of reputation and integrity.',
    textId: 'the-crucible',
    duration: '45 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'SL.11-12.1'],
    objectives: [
      'Analyze what "name" means to characters',
      'Discuss integrity vs. survival',
      'Connect to modern reputation concerns',
    ],
    activities: [
      'Character reputation chart',
      '"Because it is my name" analysis',
      'Discussion: What would you die for?',
    ],
    assessmentIdeas: [
      'Thematic essay on reputation',
      'Personal reflection on integrity',
    ],
  },
  {
    id: 'crucible-authority',
    title: 'Dangerous Authority: The Court',
    description: 'Analyze the corruption of institutional authority.',
    textId: 'the-crucible',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Analyze the court\'s procedures',
      'Discuss Danforth\'s motivations',
      'Connect to justice system concerns',
    ],
    activities: [
      'Court scene analysis',
      'Danforth character study',
      'Mock court procedure',
    ],
    assessmentIdeas: [
      'Essay on justice and authority',
      'Research on wrongful convictions',
    ],
  },
  {
    id: 'crucible-girls',
    title: 'The Power of the Accusers',
    description: 'Analyze Abigail and the girls\' motivations.',
    textId: 'the-crucible',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Analyze Abigail\'s characterization',
      'Discuss the girls\' power dynamics',
      'Evaluate whether the girls are victims or villains',
    ],
    activities: [
      'Abigail motivation analysis',
      'Group dynamics study',
      'Debate: How should we judge Abigail?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Abigail years later',
    ],
  },

  // ============================================
  // FRANKENSTEIN (7 lessons)
  // ============================================
  {
    id: 'frankenstein-creation',
    title: 'Playing God: The Ethics of Creation',
    description: 'Analyze Victor\'s responsibility as creator.',
    textId: 'frankenstein',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Analyze Victor\'s motivations and methods',
      'Discuss the ethics of creation',
      'Connect to modern bioethics debates',
    ],
    activities: [
      'Creation scene analysis',
      'Ethics debate',
      'Modern science connections',
    ],
    assessmentIdeas: [
      'Essay on creator responsibility',
      'Research on bioethics',
    ],
  },
  {
    id: 'frankenstein-monster',
    title: 'Who Is the Monster?',
    description: 'Analyze the Creature\'s character and humanity.',
    textId: 'frankenstein',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Analyze the Creature\'s development',
      'Discuss nature vs. nurture',
      'Evaluate who is truly monstrous',
    ],
    activities: [
      'Creature\'s journey timeline',
      'Evidence for both readings',
      'Debate: Who is the real monster?',
    ],
    assessmentIdeas: [
      'Argumentative essay',
      'Creative: Creature\'s autobiography',
    ],
  },
  {
    id: 'frankenstein-frame',
    title: 'Stories Within Stories: Frame Narrative',
    description: 'Analyze Shelley\'s complex narrative structure.',
    textId: 'frankenstein',
    duration: '45 minutes',
    standards: ['RL.11-12.5', 'RL.11-12.6', 'W.11-12.9'],
    objectives: [
      'Map the frame narrative structure',
      'Analyze effects of multiple narrators',
      'Discuss reliability and perspective',
    ],
    activities: [
      'Narrative structure diagram',
      'Narrator reliability analysis',
      'Writing exercise: Nested narrative',
    ],
    assessmentIdeas: [
      'Essay on narrative structure',
      'Creative: Another character\'s frame',
    ],
  },
  {
    id: 'frankenstein-knowledge',
    title: 'Dangerous Knowledge',
    description: 'Analyze the novel\'s warning about unchecked pursuit of knowledge.',
    textId: 'frankenstein',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.4', 'SL.11-12.1'],
    objectives: [
      'Identify the novel\'s critique of ambition',
      'Connect to the Prometheus myth',
      'Discuss limits of scientific inquiry',
    ],
    activities: [
      'Knowledge and consequence chart',
      'Prometheus myth comparison',
      'Discussion: Should science have limits?',
    ],
    assessmentIdeas: [
      'Thematic essay',
      'Research on scientific ethics',
    ],
  },
  {
    id: 'frankenstein-nature',
    title: 'Nature and the Sublime',
    description: 'Analyze Romantic nature imagery in the novel.',
    textId: 'frankenstein',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Identify nature descriptions',
      'Understand the Romantic sublime',
      'Analyze nature\'s role in the narrative',
    ],
    activities: [
      'Nature imagery collection',
      'Sublime concept exploration',
      'Visual art response',
    ],
    assessmentIdeas: [
      'Imagery analysis essay',
      'Creative: Nature description in Romantic style',
    ],
  },
  {
    id: 'frankenstein-gothic',
    title: 'Gothic Elements in Frankenstein',
    description: 'Analyze the novel\'s Gothic conventions.',
    textId: 'frankenstein',
    duration: '50 minutes',
    standards: ['RL.11-12.9', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Identify Gothic elements',
      'Analyze how Shelley uses Gothic conventions',
      'Connect to other Gothic works',
    ],
    activities: [
      'Gothic elements scavenger hunt',
      'Comparison to other Gothic works',
      'Gothic scene creation',
    ],
    assessmentIdeas: [
      'Essay on Gothic conventions',
      'Creative: Gothic scene in modern setting',
    ],
  },
  {
    id: 'frankenstein-isolation',
    title: 'Isolation and Connection',
    description: 'Analyze loneliness as a central theme.',
    textId: 'frankenstein',
    duration: '45 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Trace isolation in Victor and the Creature',
      'Analyze causes and effects of isolation',
      'Discuss human need for connection',
    ],
    activities: [
      'Isolation timeline for both characters',
      'Parallel moment analysis',
      'Discussion: What do we need from others?',
    ],
    assessmentIdeas: [
      'Comparative essay',
      'Creative: Creature finds a friend',
    ],
  },

  // ============================================
  // OF MICE AND MEN (6 lessons)
  // ============================================
  {
    id: 'omam-american-dream',
    title: 'The Dream That Never Comes: The American Dream',
    description: 'Analyze how the novel critiques the American Dream.',
    textId: 'of-mice-and-men',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Analyze George and Lennie\'s dream',
      'Discuss why the dream fails',
      'Connect to Depression-era context',
    ],
    activities: [
      'Dream descriptions analysis',
      'Historical context research',
      'Discussion: Is the dream ever achievable?',
    ],
    assessmentIdeas: [
      'Thematic essay',
      'Research on migrant workers',
    ],
  },
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
  {
    id: 'omam-foreshadowing',
    title: 'The Writing on the Wall: Foreshadowing',
    description: 'Analyze Steinbeck\'s use of foreshadowing.',
    textId: 'of-mice-and-men',
    duration: '45 minutes',
    standards: ['RL.9-10.5', 'RL.9-10.4', 'W.9-10.9'],
    objectives: [
      'Identify foreshadowing elements',
      'Analyze how Candy\'s dog parallels Lennie',
      'Discuss the effect of knowing the ending',
    ],
    activities: [
      'Foreshadowing evidence collection',
      'Candy\'s dog scene analysis',
      'Discussion: How does knowing affect reading?',
    ],
    assessmentIdeas: [
      'Essay on foreshadowing',
      'Creative: Alternate ending avoiding foreshadowed fate',
    ],
  },
  {
    id: 'omam-marginalized',
    title: 'The Outsiders of the Bunkhouse',
    description: 'Analyze marginalized characters: Crooks, Curley\'s wife, Candy.',
    textId: 'of-mice-and-men',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.6', 'SL.9-10.1'],
    objectives: [
      'Analyze how marginalized characters are portrayed',
      'Discuss intersections of race, gender, age, ability',
      'Evaluate Steinbeck\'s representation',
    ],
    activities: [
      'Character profile comparisons',
      'Crooks\' room scene analysis',
      'Discussion: Who has power on the ranch?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Research on 1930s discrimination',
    ],
  },
  {
    id: 'omam-george-lennie',
    title: 'The Friendship of George and Lennie',
    description: 'Analyze the central relationship.',
    textId: 'of-mice-and-men',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Analyze the nature of their friendship',
      'Discuss codependency and caregiving',
      'Evaluate George\'s final decision',
    ],
    activities: [
      'Relationship evidence chart',
      'Key moment analysis',
      'Discussion: Is George a good friend?',
    ],
    assessmentIdeas: [
      'Relationship analysis essay',
      'Creative: George\'s letter to Lennie\'s aunt',
    ],
  },
  {
    id: 'omam-ending',
    title: 'The Mercy Killing: Analyzing the Ending',
    description: 'Discuss the ethics of George\'s final act.',
    textId: 'of-mice-and-men',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.6', 'SL.9-10.3'],
    objectives: [
      'Analyze the final scene closely',
      'Discuss the ethics of George\'s decision',
      'Connect to themes of mercy and justice',
    ],
    activities: [
      'Final scene close reading',
      'Ethics debate',
      'Discussion: Was there any other way?',
    ],
    assessmentIdeas: [
      'Argumentative essay on the ending',
      'Mock trial: George\'s defense',
    ],
  },

  // ============================================
  // NIGHT (6 lessons)
  // ============================================
  {
    id: 'night-historical',
    title: 'Historical Context: The Holocaust',
    description: 'Build essential background knowledge.',
    textId: 'night',
    duration: '55 minutes',
    standards: ['RL.9-10.9', 'SL.9-10.1', 'W.9-10.7'],
    objectives: [
      'Understand key Holocaust events and terms',
      'Learn about Jewish life before the Holocaust',
      'Prepare for reading with historical context',
    ],
    activities: [
      'Timeline creation',
      'Key terms vocabulary',
      'Geographic mapping of events',
    ],
    assessmentIdeas: [
      'Timeline with annotations',
      'Research on pre-war Jewish communities',
    ],
  },
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
  {
    id: 'night-faith',
    title: 'Crisis of Faith',
    description: 'Analyze Elie\'s spiritual journey.',
    textId: 'night',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Trace Elie\'s relationship with God',
      'Analyze key moments of faith crisis',
      'Discuss theodicy and suffering',
    ],
    activities: [
      'Faith evolution timeline',
      'Key passage analysis',
      'Discussion: Where is God in suffering?',
    ],
    assessmentIdeas: [
      'Essay on faith and suffering',
      'Personal reflection on belief and adversity',
    ],
  },
  {
    id: 'night-father-son',
    title: 'Father and Son: Love Under Pressure',
    description: 'Analyze the father-son relationship.',
    textId: 'night',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'W.9-10.3'],
    objectives: [
      'Trace the evolving relationship',
      'Analyze moments of devotion and doubt',
      'Discuss family bonds under extreme stress',
    ],
    activities: [
      'Relationship evidence chart',
      'Key scene analysis',
      'Discussion: What does Elie owe his father?',
    ],
    assessmentIdeas: [
      'Relationship essay',
      'Creative: Letter from Elie to his father',
    ],
  },
  {
    id: 'night-imagery',
    title: 'Night, Fire, and Silence: Imagery and Symbol',
    description: 'Analyze Wiesel\'s powerful imagery.',
    textId: 'night',
    duration: '45 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.5', 'W.9-10.9'],
    objectives: [
      'Identify recurring images and symbols',
      'Analyze what they represent',
      'Discuss why Wiesel chose the title "Night"',
    ],
    activities: [
      'Imagery collection',
      'Symbol analysis',
      'Title significance discussion',
    ],
    assessmentIdeas: [
      'Imagery essay',
      'Creative: Poem using Night\'s imagery',
    ],
  },
  {
    id: 'night-dehumanization',
    title: 'The Process of Dehumanization',
    description: 'Analyze how the Nazis stripped humanity from victims.',
    textId: 'night',
    duration: '55 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Identify stages of dehumanization',
      'Analyze how prisoners were degraded',
      'Connect to warning signs of genocide',
    ],
    activities: [
      'Dehumanization progression chart',
      'Key scene analysis',
      'Discussion: Early warning signs',
    ],
    assessmentIdeas: [
      'Essay on dehumanization',
      'Research on genocide prevention',
    ],
  },

  // ============================================
  // A RAISIN IN THE SUN (6 lessons)
  // ============================================
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
  {
    id: 'raisin-walter',
    title: 'Walter Lee: Man of the House?',
    description: 'Analyze Walter\'s character and struggles.',
    textId: 'a-raisin-in-the-sun',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Analyze Walter\'s motivations and frustrations',
      'Discuss masculinity and economic opportunity',
      'Evaluate his character arc',
    ],
    activities: [
      'Character development timeline',
      'Key monologue analysis',
      'Discussion: Is Walter sympathetic?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Walter\'s internal monologue',
    ],
  },
  {
    id: 'raisin-mama',
    title: 'Mama and the Plant: Hope and Resilience',
    description: 'Analyze Lena Younger as the family\'s moral center.',
    textId: 'a-raisin-in-the-sun',
    duration: '45 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.4', 'W.9-10.9'],
    objectives: [
      'Analyze Mama\'s character and values',
      'Interpret the plant as symbol',
      'Discuss generational differences',
    ],
    activities: [
      'Character trait evidence chart',
      'Plant symbolism tracking',
      'Discussion: What does Mama want most?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Mama\'s letter to Big Walter',
    ],
  },
  {
    id: 'raisin-beneatha',
    title: 'Beneatha\'s Search for Identity',
    description: 'Analyze Beneatha\'s character and aspirations.',
    textId: 'a-raisin-in-the-sun',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Analyze Beneatha\'s identity exploration',
      'Compare Asagai and George as influences',
      'Discuss assimilation vs. African heritage',
    ],
    activities: [
      'Character exploration chart',
      'Suitors comparison',
      'Discussion: What does identity mean?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Research on African diaspora identity',
    ],
  },
  {
    id: 'raisin-housing',
    title: 'Clybourne Park: Housing and Discrimination',
    description: 'Analyze the housing subplot and its historical context.',
    textId: 'a-raisin-in-the-sun',
    duration: '55 minutes',
    standards: ['RL.9-10.9', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Understand housing discrimination history',
      'Analyze the Karl Lindner scene',
      'Connect to ongoing housing issues',
    ],
    activities: [
      'Historical context research',
      'Lindner scene analysis',
      'Modern housing inequality research',
    ],
    assessmentIdeas: [
      'Essay on housing and racism',
      'Research on redlining',
    ],
  },
  {
    id: 'raisin-ending',
    title: 'Hope or Naivety? The Ending',
    description: 'Analyze and debate the play\'s conclusion.',
    textId: 'a-raisin-in-the-sun',
    duration: '50 minutes',
    standards: ['RL.9-10.5', 'RL.9-10.6', 'SL.9-10.3'],
    objectives: [
      'Analyze the final scene',
      'Debate whether the ending is hopeful',
      'Predict what happens next',
    ],
    activities: [
      'Final scene close reading',
      'Debate: Hope or naivety?',
      'Creative: The Youngers one year later',
    ],
    assessmentIdeas: [
      'Essay on the ending',
      'Creative: Sequel scene',
    ],
  },

  // ============================================
  // FAHRENHEIT 451 (6 lessons)
  // ============================================
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
  {
    id: 'f451-technology',
    title: 'The Parlor Walls: Technology and Disconnection',
    description: 'Analyze how technology isolates people.',
    textId: 'fahrenheit-451',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.4', 'SL.9-10.1'],
    objectives: [
      'Analyze technology in the novel',
      'Discuss how technology creates disconnection',
      'Connect to modern technology concerns',
    ],
    activities: [
      'Technology in the novel chart',
      'Comparison to modern tech',
      'Discussion: Are we heading there?',
    ],
    assessmentIdeas: [
      'Essay on technology and isolation',
      'Creative: A day without screens',
    ],
  },
  {
    id: 'f451-montag',
    title: 'Montag\'s Awakening',
    description: 'Trace Montag\'s transformation from fireman to rebel.',
    textId: 'fahrenheit-451',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Trace Montag\'s character development',
      'Identify key turning points',
      'Analyze what triggers his change',
    ],
    activities: [
      'Character arc timeline',
      'Turning point analysis',
      'Discussion: What awakens us?',
    ],
    assessmentIdeas: [
      'Character development essay',
      'Creative: Montag\'s diary entries',
    ],
  },
  {
    id: 'f451-clarisse',
    title: 'Clarisse: The Catalyst',
    description: 'Analyze Clarisse\'s role and significance.',
    textId: 'fahrenheit-451',
    duration: '45 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.4', 'SL.9-10.1'],
    objectives: [
      'Analyze Clarisse\'s characterization',
      'Discuss her function in the plot',
      'Evaluate her significance despite brief appearance',
    ],
    activities: [
      'Clarisse quotation analysis',
      'Discussion: Why does she disappear?',
      'Character foil analysis',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Clarisse\'s full story',
    ],
  },
  {
    id: 'f451-symbolism',
    title: 'Fire, the Salamander, and the Phoenix',
    description: 'Analyze Bradbury\'s major symbols.',
    textId: 'fahrenheit-451',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.2', 'W.9-10.9'],
    objectives: [
      'Identify major symbols and their evolution',
      'Analyze how fire\'s meaning changes',
      'Connect symbols to themes',
    ],
    activities: [
      'Symbol tracking chart',
      'Fire meaning evolution',
      'Visual art project',
    ],
    assessmentIdeas: [
      'Symbol analysis essay',
      'Creative: Poem using novel\'s symbols',
    ],
  },
  {
    id: 'f451-ending',
    title: 'The Book People: Hope and Renewal',
    description: 'Analyze the ending and its message.',
    textId: 'fahrenheit-451',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.5', 'SL.9-10.1'],
    objectives: [
      'Analyze the novel\'s conclusion',
      'Discuss the significance of memorizing books',
      'Evaluate whether the ending is hopeful',
    ],
    activities: [
      'Final section close reading',
      'Discussion: Is this ending hopeful?',
      'Which book would you memorize?',
    ],
    assessmentIdeas: [
      'Essay on the ending',
      'Book selection with rationale',
    ],
  },

  // ============================================
  // ANIMAL FARM (5 lessons)
  // ============================================
  {
    id: 'animal-farm-allegory',
    title: 'Reading the Revolution: Animal Farm as Allegory',
    description: 'Understand how Orwell uses allegory to critique the Russian Revolution.',
    textId: 'animal-farm',
    duration: '55 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Define allegory and identify allegorical elements',
      'Match characters to historical figures (Napoleon/Stalin, Snowball/Trotsky)',
      'Analyze how the allegory conveys Orwell\'s message',
    ],
    activities: [
      'Character-to-historical-figure matching activity',
      'Timeline comparison: Farm events vs. Russian Revolution',
      'Discussion: Why use animals instead of people?',
    ],
    assessmentIdeas: [
      'Essay on allegory and political critique',
      'Research on the Russian Revolution parallels',
    ],
  },
  {
    id: 'animal-farm-propaganda',
    title: 'Squealer and the Art of Propaganda',
    description: 'Analyze how language is manipulated to control the animals.',
    textId: 'animal-farm',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.6', 'SL.9-10.3'],
    objectives: [
      'Identify propaganda techniques used by Squealer',
      'Analyze how the Seven Commandments are gradually altered',
      'Connect to modern propaganda and media manipulation',
    ],
    activities: [
      'Propaganda technique identification',
      'Commandment evolution tracking chart',
      'Create counter-propaganda posters',
    ],
    assessmentIdeas: [
      'Essay on language and power',
      'Modern propaganda analysis project',
    ],
  },
  {
    id: 'animal-farm-power-corruption',
    title: 'Power Corrupts: The Pigs\' Transformation',
    description: 'Trace how the pigs become indistinguishable from humans.',
    textId: 'animal-farm',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'W.9-10.9'],
    objectives: [
      'Trace the pigs\' gradual corruption',
      'Analyze key moments of betrayal',
      'Discuss the famous final scene',
    ],
    activities: [
      'Corruption timeline',
      'Close reading of the final scene',
      'Discussion: Is power always corrupting?',
    ],
    assessmentIdeas: [
      'Thematic essay on power and corruption',
      'Creative: Diary from a pig\'s perspective',
    ],
  },
  {
    id: 'animal-farm-satire',
    title: 'Orwell\'s Satire: Humor with a Message',
    description: 'Analyze how satire makes political critique accessible.',
    textId: 'animal-farm',
    duration: '45 minutes',
    standards: ['RL.9-10.6', 'RL.9-10.4', 'SL.9-10.1'],
    objectives: [
      'Define satire and identify satirical elements',
      'Analyze how humor conveys serious themes',
      'Evaluate the effectiveness of satire',
    ],
    activities: [
      'Satire identification exercise',
      'Compare to modern political satire',
      'Create satirical writing',
    ],
    assessmentIdeas: [
      'Essay on satire and social commentary',
      'Creative: Write a satirical fable',
    ],
  },
  {
    id: 'animal-farm-boxer',
    title: 'Boxer and the Betrayal of the Working Class',
    description: 'Analyze Boxer as symbol of exploited workers.',
    textId: 'animal-farm',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Analyze Boxer\'s character and what he represents',
      'Discuss why his fate is so significant',
      'Connect to exploitation of workers',
    ],
    activities: [
      'Character symbolism analysis',
      'Close reading of Boxer\'s death scene',
      'Discussion: Who are today\'s Boxers?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Research on workers\' rights movements',
    ],
  },

  // ============================================
  // JULIUS CAESAR (5 lessons)
  // ============================================
  {
    id: 'julius-caesar-rhetoric',
    title: 'The Power of Words: Rhetoric in Julius Caesar',
    description: 'Analyze the famous funeral speeches and rhetorical strategies.',
    textId: 'julius-caesar',
    duration: '55 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.6', 'SL.9-10.3'],
    objectives: [
      'Identify ethos, pathos, and logos in the speeches',
      'Compare Brutus and Antony\'s rhetorical strategies',
      'Evaluate which speech is more effective and why',
    ],
    activities: [
      'Funeral speech annotation and comparison',
      'Rhetorical device scavenger hunt',
      'Deliver speeches to the class',
    ],
    assessmentIdeas: [
      'Comparative analysis essay on rhetoric',
      'Write and deliver a persuasive speech',
    ],
  },
  {
    id: 'julius-caesar-ambition',
    title: 'Ambition: Virtue or Vice?',
    description: 'Explore how ambition drives and destroys characters.',
    textId: 'julius-caesar',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.3', 'SL.9-10.1'],
    objectives: [
      'Analyze how ambition motivates different characters',
      'Debate whether Caesar was truly ambitious',
      'Discuss ambition\'s role in the tragedy',
    ],
    activities: [
      'Character ambition chart',
      'Close reading of "ambition" references',
      'Debate: Was the assassination justified?',
    ],
    assessmentIdeas: [
      'Thematic essay on ambition',
      'Creative: Defense or prosecution of Brutus',
    ],
  },
  {
    id: 'julius-caesar-betrayal',
    title: 'Et Tu, Brute: Friendship and Betrayal',
    description: 'Examine the theme of betrayal in personal and political relationships.',
    textId: 'julius-caesar',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'W.9-10.3'],
    objectives: [
      'Analyze the friendship between Caesar and Brutus',
      'Examine Brutus\'s internal conflict',
      'Discuss loyalty vs. political ideals',
    ],
    activities: [
      'Relationship mapping',
      'Brutus soliloquy analysis',
      'Journal: When principle conflicts with loyalty',
    ],
    assessmentIdeas: [
      'Character analysis essay on Brutus',
      'Creative: Caesar\'s last thoughts',
    ],
  },
  {
    id: 'julius-caesar-fate',
    title: 'Fate and Omens: The Supernatural in Shakespeare',
    description: 'Analyze the role of omens, prophecy, and fate.',
    textId: 'julius-caesar',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.5', 'SL.9-10.1'],
    objectives: [
      'Identify omens and supernatural elements',
      'Analyze characters\' responses to warnings',
      'Discuss fate vs. free will',
    ],
    activities: [
      'Omen tracking throughout the play',
      'Soothsayer scene analysis',
      'Discussion: Do the characters have free will?',
    ],
    assessmentIdeas: [
      'Essay on fate and free will',
      'Creative: Modern omen scene',
    ],
  },
  {
    id: 'julius-caesar-tragedy',
    title: 'Tragedy and the Tragic Hero',
    description: 'Apply tragic hero elements to Brutus and Caesar.',
    textId: 'julius-caesar',
    duration: '55 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.5', 'W.9-10.9'],
    objectives: [
      'Define Shakespearean tragedy characteristics',
      'Debate who is the true tragic hero',
      'Identify hamartia and catharsis',
    ],
    activities: [
      'Tragic hero checklist for both characters',
      'Debate: Brutus or Caesar as tragic hero',
      'Final scene analysis',
    ],
    assessmentIdeas: [
      'Argumentative essay on the tragic hero',
      'Compare to other Shakespearean tragedies',
    ],
  },

  // ============================================
  // PERSEPOLIS (5 lessons)
  // ============================================
  {
    id: 'persepolis-visual-storytelling',
    title: 'Reading Images: Visual Storytelling in Persepolis',
    description: 'Analyze how Satrapi uses the graphic novel form.',
    textId: 'persepolis',
    duration: '50 minutes',
    standards: ['RL.9-10.4', 'RL.9-10.5', 'SL.9-10.5'],
    objectives: [
      'Understand graphic novel conventions (panels, gutters, visual symbols)',
      'Analyze how black-and-white art creates meaning',
      'Interpret visual metaphors unique to this medium',
    ],
    activities: [
      'Graphic novel terminology introduction',
      'Panel analysis activity',
      'Create a visual metaphor panel',
    ],
    assessmentIdeas: [
      'Visual analysis essay',
      'Create a graphic memoir page',
    ],
  },
  {
    id: 'persepolis-identity',
    title: 'Between Two Worlds: Marjane\'s Identity Struggle',
    description: 'Explore how Marjane navigates conflicting cultural identities.',
    textId: 'persepolis',
    duration: '50 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'SL.9-10.1'],
    objectives: [
      'Trace Marjane\'s identity evolution',
      'Analyze her relationship with Western and Iranian culture',
      'Discuss third culture identity',
    ],
    activities: [
      'Identity map at different life stages',
      'Culture clash scene analysis',
      'Discussion: Belonging to multiple cultures',
    ],
    assessmentIdeas: [
      'Character development essay',
      'Personal reflection on cultural identity',
    ],
  },
  {
    id: 'persepolis-revolution',
    title: 'Revolution Through a Child\'s Eyes',
    description: 'Analyze how Satrapi depicts the Islamic Revolution.',
    textId: 'persepolis',
    duration: '55 minutes',
    standards: ['RL.9-10.6', 'RL.9-10.9', 'SL.9-10.1'],
    objectives: [
      'Understand historical context of the Iranian Revolution',
      'Analyze the effect of a child narrator',
      'Discuss how revolution impacts ordinary families',
    ],
    activities: [
      'Historical context research',
      'Child perspective analysis',
      'Family stories during political upheaval',
    ],
    assessmentIdeas: [
      'Essay on perspective and history',
      'Research on the Iranian Revolution',
    ],
  },
  {
    id: 'persepolis-family',
    title: 'Family as Foundation: The Satrapi Family',
    description: 'Analyze family relationships and their influence on Marjane.',
    textId: 'persepolis',
    duration: '45 minutes',
    standards: ['RL.9-10.3', 'RL.9-10.2', 'W.9-10.3'],
    objectives: [
      'Analyze relationships with parents and grandmother',
      'Discuss family values and rebellion',
      'Examine generational perspectives on politics',
    ],
    activities: [
      'Family relationship map',
      'Grandmother wisdom analysis',
      'Discussion: Family influence on beliefs',
    ],
    assessmentIdeas: [
      'Relationship analysis essay',
      'Creative: Family memoir scene',
    ],
  },
  {
    id: 'persepolis-resilience',
    title: 'Resilience and Humor in Dark Times',
    description: 'Analyze how humor and resilience appear throughout the memoir.',
    textId: 'persepolis',
    duration: '50 minutes',
    standards: ['RL.9-10.2', 'RL.9-10.4', 'SL.9-10.1'],
    objectives: [
      'Identify moments of humor and resilience',
      'Analyze how comedy functions in serious narrative',
      'Discuss coping mechanisms during trauma',
    ],
    activities: [
      'Humor moment collection',
      'Tone analysis of difficult scenes',
      'Discussion: How does humor help us cope?',
    ],
    assessmentIdeas: [
      'Essay on humor and trauma',
      'Creative: Finding humor in difficulty',
    ],
  },

  // ============================================
  // THE SCARLET LETTER (5 lessons)
  // ============================================
  {
    id: 'scarlet-letter-symbolism',
    title: 'The Many Meanings of "A"',
    description: 'Analyze how the scarlet letter\'s meaning transforms.',
    textId: 'scarlet-letter',
    duration: '55 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.2', 'W.11-12.9'],
    objectives: [
      'Trace how the letter\'s meaning changes',
      'Analyze multiple interpretations: Adultery, Able, Angel',
      'Discuss how meaning is socially constructed',
    ],
    activities: [
      'Letter meaning timeline',
      'Community vs. individual interpretation',
      'Symbol evolution analysis',
    ],
    assessmentIdeas: [
      'Essay on symbol and meaning',
      'Creative: Design your own symbolic letter',
    ],
  },
  {
    id: 'scarlet-letter-sin-guilt',
    title: 'Public Sin, Private Guilt',
    description: 'Compare Hester\'s public punishment with Dimmesdale\'s hidden guilt.',
    textId: 'scarlet-letter',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Compare Hester and Dimmesdale\'s experiences',
      'Analyze effects of public vs. private shame',
      'Discuss which suffers more',
    ],
    activities: [
      'Character comparison chart',
      'Scaffold scene analysis',
      'Debate: Public or private guilt is worse',
    ],
    assessmentIdeas: [
      'Comparative essay',
      'Creative: Dimmesdale\'s confession letter',
    ],
  },
  {
    id: 'scarlet-letter-pearl',
    title: 'Pearl: The Living Symbol',
    description: 'Analyze Pearl as both character and symbol.',
    textId: 'scarlet-letter',
    duration: '45 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.4', 'W.11-12.9'],
    objectives: [
      'Analyze Pearl\'s dual role as character and symbol',
      'Discuss her connection to nature and wildness',
      'Evaluate her function in the narrative',
    ],
    activities: [
      'Pearl characterization evidence',
      'Symbol and character comparison',
      'Nature imagery analysis',
    ],
    assessmentIdeas: [
      'Character/symbol analysis essay',
      'Creative: Pearl\'s adult life',
    ],
  },
  {
    id: 'scarlet-letter-puritanism',
    title: 'Puritan Society and Hypocrisy',
    description: 'Examine Hawthorne\'s critique of Puritan society.',
    textId: 'scarlet-letter',
    duration: '55 minutes',
    standards: ['RL.11-12.6', 'RL.11-12.9', 'SL.11-12.1'],
    objectives: [
      'Understand Puritan values and society',
      'Identify Hawthorne\'s critique of hypocrisy',
      'Connect to American identity themes',
    ],
    activities: [
      'Puritan society research',
      'Hypocrisy evidence collection',
      'Discussion: American moral identity',
    ],
    assessmentIdeas: [
      'Essay on social critique',
      'Research on Puritan New England',
    ],
  },
  {
    id: 'scarlet-letter-nature',
    title: 'The Forest and the Town: Nature vs. Society',
    description: 'Analyze the contrast between natural and social spaces.',
    textId: 'scarlet-letter',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Analyze setting symbolism',
      'Compare forest scenes to town scenes',
      'Discuss nature as freedom from social constraint',
    ],
    activities: [
      'Setting comparison chart',
      'Forest meeting scene analysis',
      'Romantic era nature philosophy',
    ],
    assessmentIdeas: [
      'Essay on setting and meaning',
      'Creative: Modern forest/town parallel',
    ],
  },

  // ============================================
  // ADVENTURES OF HUCKLEBERRY FINN (5 lessons)
  // ============================================
  {
    id: 'huck-finn-satire',
    title: 'Twain\'s Satirical Lens: Critiquing American Society',
    description: 'Analyze how Twain uses satire to expose hypocrisy.',
    textId: 'adventures-of-huckleberry-finn',
    duration: '55 minutes',
    standards: ['RL.11-12.6', 'RL.11-12.4', 'SL.11-12.1'],
    objectives: [
      'Identify satirical targets: religion, civilization, racism',
      'Analyze how humor conveys serious critique',
      'Discuss the effectiveness of satire',
    ],
    activities: [
      'Satire identification and categorization',
      'Key scene analysis',
      'Modern parallels discussion',
    ],
    assessmentIdeas: [
      'Essay on satire and social commentary',
      'Creative: Satirical piece on modern issue',
    ],
  },
  {
    id: 'huck-finn-moral-development',
    title: 'Huck\'s Moral Journey: Following His Heart',
    description: 'Trace Huck\'s moral development throughout the novel.',
    textId: 'adventures-of-huckleberry-finn',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'W.11-12.3'],
    objectives: [
      'Trace Huck\'s evolving moral conscience',
      'Analyze the "I\'ll go to hell" moment',
      'Discuss conscience vs. society',
    ],
    activities: [
      'Moral development timeline',
      'Key decision point analysis',
      'Journal: When have you defied expectations?',
    ],
    assessmentIdeas: [
      'Character development essay',
      'Creative: Huck\'s moral manifesto',
    ],
  },
  {
    id: 'huck-finn-river',
    title: 'The River as Symbol: Freedom and Flow',
    description: 'Analyze the Mississippi River as central symbol.',
    textId: 'adventures-of-huckleberry-finn',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'SL.11-12.1'],
    objectives: [
      'Analyze river symbolism',
      'Compare river scenes to shore scenes',
      'Discuss nature as escape from civilization',
    ],
    activities: [
      'River passage analysis',
      'Shore vs. river comparison',
      'Map the journey with symbolic moments',
    ],
    assessmentIdeas: [
      'Symbol analysis essay',
      'Creative: River journal entries',
    ],
  },
  {
    id: 'huck-finn-jim',
    title: 'Jim\'s Humanity: Challenging Racial Assumptions',
    description: 'Analyze Jim\'s characterization and humanity.',
    textId: 'adventures-of-huckleberry-finn',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Analyze Jim as a fully realized character',
      'Discuss Twain\'s approach to race',
      'Examine the novel\'s controversial legacy',
    ],
    activities: [
      'Jim characterization evidence',
      'Key moment analysis',
      'Discussion: Novel\'s place in curriculum',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Research on the novel\'s reception',
    ],
  },
  {
    id: 'huck-finn-dialect',
    title: 'Voice and Dialect: Huck\'s Authentic Narration',
    description: 'Analyze Twain\'s use of dialect and first-person voice.',
    textId: 'adventures-of-huckleberry-finn',
    duration: '45 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.5', 'W.11-12.3'],
    objectives: [
      'Analyze dialect and its effects',
      'Discuss how voice creates authenticity',
      'Examine Twain\'s explanatory note on dialect',
    ],
    activities: [
      'Dialect translation exercise',
      'Voice comparison across characters',
      'Write in dialect',
    ],
    assessmentIdeas: [
      'Essay on voice and authenticity',
      'Creative: Scene in different dialect',
    ],
  },

  // ============================================
  // THEIR EYES WERE WATCHING GOD (5 lessons)
  // ============================================
  {
    id: 'teewg-voice',
    title: 'Finding Her Voice: Janie\'s Self-Discovery',
    description: 'Trace Janie\'s journey toward authentic self-expression.',
    textId: 'their-eyes-were-watching-god',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'W.11-12.3'],
    objectives: [
      'Trace Janie\'s voice development through marriages',
      'Analyze how each relationship shapes her',
      'Discuss finding authentic identity',
    ],
    activities: [
      'Voice evolution timeline',
      'Key speech moment analysis',
      'Journal: Finding your own voice',
    ],
    assessmentIdeas: [
      'Character development essay',
      'Creative: Janie\'s letter to young women',
    ],
  },
  {
    id: 'teewg-hair',
    title: 'The Symbolism of Janie\'s Hair',
    description: 'Analyze hair as symbol of freedom, identity, and sexuality.',
    textId: 'their-eyes-were-watching-god',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Analyze hair symbolism throughout the novel',
      'Discuss connections to freedom and control',
      'Explore cultural significance of hair',
    ],
    activities: [
      'Hair imagery tracking',
      'Symbol analysis by marriage',
      'Discussion: Hair and identity',
    ],
    assessmentIdeas: [
      'Symbol analysis essay',
      'Research on hair in African American culture',
    ],
  },
  {
    id: 'teewg-marriages',
    title: 'Three Marriages, Three Lessons',
    description: 'Compare Janie\'s three marriages and what each teaches her.',
    textId: 'their-eyes-were-watching-god',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.5', 'SL.11-12.1'],
    objectives: [
      'Compare and contrast the three husbands',
      'Analyze what Janie learns from each',
      'Discuss love vs. security vs. independence',
    ],
    activities: [
      'Husband comparison chart',
      'Key scene analysis for each marriage',
      'Discussion: What makes a good partnership?',
    ],
    assessmentIdeas: [
      'Comparative essay on relationships',
      'Creative: Advice column from Janie',
    ],
  },
  {
    id: 'teewg-dialect',
    title: 'Hurston\'s Dialect: Preserving Voice and Culture',
    description: 'Analyze Hurston\'s use of dialect and its significance.',
    textId: 'their-eyes-were-watching-god',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.6', 'W.11-12.9'],
    objectives: [
      'Analyze dialect and its effects',
      'Discuss Hurston\'s role in Harlem Renaissance',
      'Examine debates about dialect in literature',
    ],
    activities: [
      'Dialect analysis exercise',
      'Historical context research',
      'Compare narration vs. dialogue voice',
    ],
    assessmentIdeas: [
      'Essay on voice and representation',
      'Research on Harlem Renaissance literature',
    ],
  },
  {
    id: 'teewg-nature',
    title: 'The Pear Tree and the Hurricane: Nature Imagery',
    description: 'Analyze Hurston\'s use of nature symbolism.',
    textId: 'their-eyes-were-watching-god',
    duration: '50 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Analyze the pear tree as symbol of ideal love',
      'Interpret the hurricane scene',
      'Discuss nature\'s role in the narrative',
    ],
    activities: [
      'Nature imagery collection',
      'Pear tree passage analysis',
      'Hurricane scene interpretation',
    ],
    assessmentIdeas: [
      'Imagery analysis essay',
      'Creative: Nature metaphor writing',
    ],
  },

  // ============================================
  // DEATH OF A SALESMAN (5 lessons)
  // ============================================
  {
    id: 'salesman-american-dream',
    title: 'The American Dream on Trial',
    description: 'Analyze Miller\'s critique of the American Dream.',
    textId: 'death-of-a-salesman',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Define Willy\'s version of the American Dream',
      'Analyze how the Dream fails the Lomans',
      'Discuss the Dream\'s relevance today',
    ],
    activities: [
      'American Dream definition brainstorm',
      'Willy\'s beliefs analysis',
      'Debate: Is the Dream achievable?',
    ],
    assessmentIdeas: [
      'Thematic essay on the American Dream',
      'Research on economic mobility',
    ],
  },
  {
    id: 'salesman-memory-time',
    title: 'Memory and Reality: Miller\'s Time Structure',
    description: 'Analyze how the play moves between past and present.',
    textId: 'death-of-a-salesman',
    duration: '50 minutes',
    standards: ['RL.11-12.5', 'RL.11-12.3', 'W.11-12.9'],
    objectives: [
      'Analyze the play\'s non-linear structure',
      'Distinguish memory from reality',
      'Discuss how form reflects Willy\'s mental state',
    ],
    activities: [
      'Timeline reconstruction',
      'Memory sequence analysis',
      'Discussion: Why this structure?',
    ],
    assessmentIdeas: [
      'Essay on form and meaning',
      'Creative: Memory scene from your life',
    ],
  },
  {
    id: 'salesman-father-son',
    title: 'Fathers and Sons: The Loman Legacy',
    description: 'Analyze the destructive father-son relationships.',
    textId: 'death-of-a-salesman',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Analyze Willy\'s relationships with Biff and Happy',
      'Examine Willy\'s relationship with his father',
      'Discuss generational patterns',
    ],
    activities: [
      'Relationship mapping',
      'Requiem scene analysis',
      'Discussion: Breaking family patterns',
    ],
    assessmentIdeas: [
      'Relationship analysis essay',
      'Creative: Biff ten years later',
    ],
  },
  {
    id: 'salesman-tragedy',
    title: 'Modern Tragedy: The Common Man as Hero',
    description: 'Examine Miller\'s definition of modern tragedy.',
    textId: 'death-of-a-salesman',
    duration: '55 minutes',
    standards: ['RL.11-12.5', 'RL.11-12.9', 'SL.11-12.1'],
    objectives: [
      'Understand Miller\'s "Tragedy and the Common Man"',
      'Analyze Willy as a tragic hero',
      'Compare to classical tragedy',
    ],
    activities: [
      'Miller\'s essay analysis',
      'Tragic hero criteria application',
      'Discussion: Can anyone be tragic?',
    ],
    assessmentIdeas: [
      'Essay on modern tragedy',
      'Compare Willy to classical tragic heroes',
    ],
  },
  {
    id: 'salesman-women',
    title: 'Linda and The Woman: Women in Willy\'s World',
    description: 'Analyze the portrayal and roles of women in the play.',
    textId: 'death-of-a-salesman',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Analyze Linda\'s characterization and role',
      'Discuss The Woman\'s function',
      'Evaluate Miller\'s portrayal of women',
    ],
    activities: [
      'Linda character analysis',
      'Women\'s roles in 1940s context',
      'Discussion: How are women portrayed?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Linda\'s perspective',
    ],
  },

  // ============================================
  // THE CATCHER IN THE RYE (5 lessons)
  // ============================================
  {
    id: 'catcher-alienation',
    title: 'Holden\'s Alienation: Outsider Looking In',
    description: 'Analyze Holden\'s sense of isolation and disconnection.',
    textId: 'catcher-in-the-rye',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Identify sources of Holden\'s alienation',
      'Analyze how he pushes people away',
      'Discuss alienation as protection',
    ],
    activities: [
      'Alienation evidence collection',
      'Failed connection analysis',
      'Discussion: Why do we isolate ourselves?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Letter from Holden to a friend',
    ],
  },
  {
    id: 'catcher-phoniness',
    title: 'The Phony World: Holden\'s Critique',
    description: 'Analyze Holden\'s concept of phoniness and its implications.',
    textId: 'catcher-in-the-rye',
    duration: '50 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.6', 'SL.11-12.1'],
    objectives: [
      'Define what Holden means by "phony"',
      'Analyze who and what he calls phony',
      'Discuss whether Holden is also phony',
    ],
    activities: [
      'Phony instances chart',
      'Self-awareness analysis',
      'Debate: Is Holden a hypocrite?',
    ],
    assessmentIdeas: [
      'Thematic essay on authenticity',
      'Creative: Define phoniness today',
    ],
  },
  {
    id: 'catcher-innocence',
    title: 'Catcher in the Rye: Protecting Innocence',
    description: 'Analyze the title\'s meaning and theme of innocence.',
    textId: 'catcher-in-the-rye',
    duration: '55 minutes',
    standards: ['RL.11-12.4', 'RL.11-12.2', 'W.11-12.9'],
    objectives: [
      'Analyze the catcher fantasy',
      'Discuss Holden\'s desire to protect innocence',
      'Connect to his grief over Allie',
    ],
    activities: [
      'Title scene close reading',
      'Innocence loss evidence',
      'Discussion: Can innocence be preserved?',
    ],
    assessmentIdeas: [
      'Thematic essay on innocence',
      'Creative: Holden\'s letter to Allie',
    ],
  },
  {
    id: 'catcher-narrator',
    title: 'Holden as Unreliable Narrator',
    description: 'Analyze how Holden\'s perspective shapes the story.',
    textId: 'catcher-in-the-rye',
    duration: '50 minutes',
    standards: ['RL.11-12.6', 'RL.11-12.5', 'SL.11-12.1'],
    objectives: [
      'Identify characteristics of unreliable narration',
      'Analyze contradictions and exaggerations',
      'Discuss reading between the lines',
    ],
    activities: [
      'Contradiction identification',
      'What Holden doesn\'t tell us',
      'Alternative interpretation exercise',
    ],
    assessmentIdeas: [
      'Narrator analysis essay',
      'Creative: Scene from another perspective',
    ],
  },
  {
    id: 'catcher-mental-health',
    title: 'Reading Holden\'s Breakdown',
    description: 'Analyze Holden\'s mental health with sensitivity and insight.',
    textId: 'catcher-in-the-rye',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.2', 'SL.11-12.1'],
    objectives: [
      'Identify signs of Holden\'s mental distress',
      'Analyze trauma and grief in the narrative',
      'Discuss mental health awareness',
    ],
    activities: [
      'Mental health symptom identification',
      'Grief and loss analysis',
      'Discussion: How can we support others?',
    ],
    assessmentIdeas: [
      'Essay on mental health in literature',
      'Research on teen mental health resources',
    ],
  },

  // ============================================
  // OTHELLO (5 lessons)
  // ============================================
  {
    id: 'othello-jealousy',
    title: 'The Green-Eyed Monster: Jealousy\'s Destruction',
    description: 'Analyze how jealousy corrupts and destroys.',
    textId: 'othello',
    duration: '55 minutes',
    standards: ['RL.11-12.2', 'RL.11-12.3', 'SL.11-12.1'],
    objectives: [
      'Trace how Iago plants and nurtures jealousy',
      'Analyze Othello\'s transformation',
      'Discuss jealousy as universal theme',
    ],
    activities: [
      'Jealousy development timeline',
      'Key scene analysis',
      'Discussion: What makes us jealous?',
    ],
    assessmentIdeas: [
      'Thematic essay on jealousy',
      'Creative: Modern jealousy scenario',
    ],
  },
  {
    id: 'othello-iago',
    title: 'Iago: Shakespeare\'s Greatest Villain',
    description: 'Analyze Iago\'s character and motivations.',
    textId: 'othello',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.6', 'W.11-12.9'],
    objectives: [
      'Analyze Iago\'s stated and possible motivations',
      'Examine his manipulation techniques',
      'Discuss the nature of evil',
    ],
    activities: [
      'Motivation evidence collection',
      'Soliloquy analysis',
      'Discussion: Why does evil exist?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Iago\'s psychology',
    ],
  },
  {
    id: 'othello-race',
    title: 'Race and Otherness in Othello',
    description: 'Examine the play\'s treatment of race and prejudice.',
    textId: 'othello',
    duration: '55 minutes',
    standards: ['RL.11-12.6', 'RL.11-12.9', 'SL.11-12.1'],
    objectives: [
      'Analyze racial language and imagery',
      'Discuss Othello\'s outsider status',
      'Examine how race affects interpretation',
    ],
    activities: [
      'Racial language analysis',
      'Historical context research',
      'Discussion: How does race shape the tragedy?',
    ],
    assessmentIdeas: [
      'Essay on race in the play',
      'Research on performance history',
    ],
  },
  {
    id: 'othello-desdemona',
    title: 'Desdemona: Victim or Agent?',
    description: 'Analyze Desdemona\'s character and tragic fate.',
    textId: 'othello',
    duration: '50 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.5', 'SL.11-12.1'],
    objectives: [
      'Analyze Desdemona\'s characterization',
      'Discuss her agency and choices',
      'Evaluate her tragic role',
    ],
    activities: [
      'Character evidence collection',
      'Key scene analysis',
      'Debate: How should we read Desdemona?',
    ],
    assessmentIdeas: [
      'Character analysis essay',
      'Creative: Desdemona\'s perspective',
    ],
  },
  {
    id: 'othello-tragedy',
    title: 'Tragedy of a Noble Mind: Othello as Tragic Hero',
    description: 'Apply tragic hero elements to Othello.',
    textId: 'othello',
    duration: '55 minutes',
    standards: ['RL.11-12.3', 'RL.11-12.5', 'W.11-12.9'],
    objectives: [
      'Identify tragic hero characteristics in Othello',
      'Analyze his hamartia and recognition',
      'Compare to other Shakespearean tragic heroes',
    ],
    activities: [
      'Tragic hero checklist',
      'Final scene analysis',
      'Comparison to Hamlet, Macbeth, Lear',
    ],
    assessmentIdeas: [
      'Tragic hero essay',
      'Comparative analysis with other tragedies',
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
