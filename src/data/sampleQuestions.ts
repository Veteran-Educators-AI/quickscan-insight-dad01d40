export type SampleQuestionDifficulty = 'easy' | 'medium' | 'hard' | 'challenging';

export interface SampleQuestion {
  questionNumber: number;
  question: string;
  difficulty: SampleQuestionDifficulty;
  topic: string;
  standard: string;
  svg?: string;
}

export const SAMPLE_QUESTIONS: SampleQuestion[] = [
  {
    questionNumber: 1,
    question: 'A surveyor is mapping out a new park. She establishes three distinct points, A, B, and C. If the points are not collinear, what geometric figure is determined, and how should the plane be named?',
    difficulty: 'medium',
    topic: 'Points, Lines, and Planes',
    standard: 'G.CO.A.1',
    svg: `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="20" width="180" height="120" fill="none" stroke="#000000" stroke-width="2" />
  <circle cx="40" cy="50" r="4" fill="#000000" />
  <circle cx="160" cy="50" r="4" fill="#000000" />
  <circle cx="90" cy="110" r="4" fill="#000000" />
  <line x1="40" y1="50" x2="160" y2="50" stroke="#000000" stroke-width="1" />
  <text x="30" y="40" font-size="12">A</text>
  <text x="165" y="40" font-size="12">B</text>
  <text x="95" y="125" font-size="12">C</text>
  <text x="70" y="95" font-size="10">Plane ABC</text>
</svg>`,
  },
];
