import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type {
  TDocumentDefinitions,
  Content,
  ContentText,
} from "pdfmake/interfaces";
import { renderMathText, fixEncodingCorruption } from "./mathRenderer";

// Initialize pdfmake with fonts
pdfMake.vfs = pdfFonts.vfs;

// Bloom's Taxonomy Cognitive Levels
export type BloomLevel =
  | "remember"
  | "understand"
  | "apply"
  | "analyze"
  | "evaluate"
  | "create";

// Advancement levels A-F for diagnostic worksheets
export type AdvancementLevel = "A" | "B" | "C" | "D" | "E" | "F";

// Question interface matching WorksheetBuilder
export interface GeneratedQuestion {
  questionNumber: number;
  topic: string;
  standard: string;
  question: string;
  answer?: string;
  difficulty: "medium" | "hard" | "challenging";
  bloomLevel?: BloomLevel;
  bloomVerb?: string;
  advancementLevel?: AdvancementLevel;
  svg?: string;
  imageUrl?: string;
  clipartUrl?: string;
}

// Formula interface
export interface Formula {
  name: string;
  formula: string;
  description?: string;
}

export interface FormulaCategory {
  category: string;
  formulas: Formula[];
}

export interface WorksheetPDFOptions {
  title: string;
  teacherName?: string;
  questions: GeneratedQuestion[];
  showAnswerLines: boolean;
  worksheetMode: string;
  includeAnswerKey?: boolean;
  includeFormulaSheet?: boolean;
  formulas?: FormulaCategory[];
  includeScrapPaper?: boolean;
  scrapPaperLayout?: "single" | "split-2" | "split-4";
  marginSize?: "small" | "medium" | "large";
}

/**
 * Processes text with math symbols for PDF rendering
 * pdfmake uses Roboto by default which has good Unicode support
 * Some Unicode characters don't render well in Roboto, so we fix them
 */
function processMathText(text: string): string {
  if (!text) return "";

  // First fix any encoding corruption, then render math symbols
  let result = fixEncodingCorruption(text);
  result = renderMathText(result);

  // Fix problematic Unicode characters that don't render well in pdfmake's Roboto font
  // Replace Unicode superscript letters with caret notation
  result = result.replace(/ˣ/g, "^x");
  result = result.replace(/ʸ/g, "^y");
  result = result.replace(/ⁿ/g, "^n");

  // Mathematical Italic Letters (U+1D400 - U+1D7FF range)
  // These are fancy italic/bold versions of letters that often don't render
  const mathItalicReplacements: [RegExp, string][] = [
    // Mathematical italic small letters (U+1D44E onwards)
    [/\u{1D44E}/gu, "a"],
    [/\u{1D44F}/gu, "b"],
    [/\u{1D450}/gu, "c"],
    [/\u{1D451}/gu, "d"],
    [/\u{1D452}/gu, "e"],
    [/\u{1D453}/gu, "f"],
    [/\u{1D454}/gu, "g"],
    [/\u{1D456}/gu, "i"],
    [/\u{1D457}/gu, "j"],
    [/\u{1D458}/gu, "k"],
    [/\u{1D459}/gu, "l"],
    [/\u{1D45A}/gu, "m"],
    [/\u{1D45B}/gu, "n"],
    [/\u{1D45C}/gu, "o"],
    [/\u{1D45D}/gu, "p"],
    [/\u{1D45E}/gu, "q"],
    [/\u{1D45F}/gu, "r"],
    [/\u{1D460}/gu, "s"],
    [/\u{1D461}/gu, "t"],
    [/\u{1D462}/gu, "u"],
    [/\u{1D463}/gu, "v"],
    [/\u{1D464}/gu, "w"],
    [/\u{1D465}/gu, "x"],
    [/\u{1D466}/gu, "y"],
    [/\u{1D467}/gu, "z"],
    // Mathematical italic capital letters (U+1D434 onwards)
    [/\u{1D434}/gu, "A"],
    [/\u{1D435}/gu, "B"],
    [/\u{1D436}/gu, "C"],
    [/\u{1D437}/gu, "D"],
    [/\u{1D438}/gu, "E"],
    [/\u{1D439}/gu, "F"],
    [/\u{1D43A}/gu, "G"],
    [/\u{1D43B}/gu, "H"],
    [/\u{1D43C}/gu, "I"],
    [/\u{1D43D}/gu, "J"],
    [/\u{1D43E}/gu, "K"],
    [/\u{1D43F}/gu, "L"],
    [/\u{1D440}/gu, "M"],
    [/\u{1D441}/gu, "N"],
    [/\u{1D442}/gu, "O"],
    [/\u{1D443}/gu, "P"],
    [/\u{1D444}/gu, "Q"],
    [/\u{1D445}/gu, "R"],
    [/\u{1D446}/gu, "S"],
    [/\u{1D447}/gu, "T"],
    [/\u{1D448}/gu, "U"],
    [/\u{1D449}/gu, "V"],
    [/\u{1D44A}/gu, "W"],
    [/\u{1D44B}/gu, "X"],
    [/\u{1D44C}/gu, "Y"],
    [/\u{1D44D}/gu, "Z"],
  ];

  for (const [pattern, replacement] of mathItalicReplacements) {
    result = result.replace(pattern, replacement);
  }

  // Replace any remaining characters outside Basic Multilingual Plane with ASCII equivalents
  // These are characters in the range U+10000 to U+10FFFF that Roboto may not support
  result = result.replace(/[\u{10000}-\u{10FFFF}]/gu, (char) => {
    const code = char.codePointAt(0);
    if (code === undefined) return char;

    // Mathematical alphanumeric symbols range (U+1D400 - U+1D7FF)
    if (code >= 0x1d400 && code <= 0x1d7ff) {
      // Mathematical bold, italic, script, fraktur, double-struck, sans-serif, monospace letters
      // Try to map to basic ASCII letter
      const ranges = [
        { start: 0x1d400, base: 65 }, // Mathematical Bold Capital
        { start: 0x1d41a, base: 97 }, // Mathematical Bold Small
        { start: 0x1d434, base: 65 }, // Mathematical Italic Capital
        { start: 0x1d44e, base: 97 }, // Mathematical Italic Small (a-z except h)
        { start: 0x1d468, base: 65 }, // Mathematical Bold Italic Capital
        { start: 0x1d482, base: 97 }, // Mathematical Bold Italic Small
        { start: 0x1d49c, base: 65 }, // Mathematical Script Capital
        { start: 0x1d4b6, base: 97 }, // Mathematical Script Small
        { start: 0x1d4d0, base: 65 }, // Mathematical Bold Script Capital
        { start: 0x1d4ea, base: 97 }, // Mathematical Bold Script Small
        { start: 0x1d504, base: 65 }, // Mathematical Fraktur Capital
        { start: 0x1d51e, base: 97 }, // Mathematical Fraktur Small
        { start: 0x1d538, base: 65 }, // Mathematical Double-Struck Capital
        { start: 0x1d552, base: 97 }, // Mathematical Double-Struck Small
        { start: 0x1d56c, base: 65 }, // Mathematical Bold Fraktur Capital
        { start: 0x1d586, base: 97 }, // Mathematical Bold Fraktur Small
        { start: 0x1d5a0, base: 65 }, // Mathematical Sans-Serif Capital
        { start: 0x1d5ba, base: 97 }, // Mathematical Sans-Serif Small
        { start: 0x1d5d4, base: 65 }, // Mathematical Sans-Serif Bold Capital
        { start: 0x1d5ee, base: 97 }, // Mathematical Sans-Serif Bold Small
        { start: 0x1d608, base: 65 }, // Mathematical Sans-Serif Italic Capital
        { start: 0x1d622, base: 97 }, // Mathematical Sans-Serif Italic Small
        { start: 0x1d63c, base: 65 }, // Mathematical Sans-Serif Bold Italic Capital
        { start: 0x1d656, base: 97 }, // Mathematical Sans-Serif Bold Italic Small
        { start: 0x1d670, base: 65 }, // Mathematical Monospace Capital
        { start: 0x1d68a, base: 97 }, // Mathematical Monospace Small
        { start: 0x1d7ce, base: 48 }, // Mathematical Bold Digits
        { start: 0x1d7d8, base: 48 }, // Mathematical Double-Struck Digits
        { start: 0x1d7e2, base: 48 }, // Mathematical Sans-Serif Digits
        { start: 0x1d7ec, base: 48 }, // Mathematical Sans-Serif Bold Digits
        { start: 0x1d7f6, base: 48 }, // Mathematical Monospace Digits
      ];

      for (const range of ranges) {
        const offset = code - range.start;
        if (offset >= 0 && offset < 26) {
          return String.fromCharCode(range.base + offset);
        }
        // For digits
        if (range.base === 48 && offset >= 0 && offset < 10) {
          return String.fromCharCode(range.base + offset);
        }
      }
    }

    // If we can't identify it, return empty string to avoid box characters
    return "";
  });

  return result;
}

/**
 * Gets the color for advancement level
 */
function getAdvancementLevelColor(level: string): string {
  switch (level) {
    case "A":
      return "#166534";
    case "B":
      return "#047857";
    case "C":
      return "#a16207";
    case "D":
      return "#c2410c";
    case "E":
      return "#b91c1c";
    case "F":
      return "#b91c1c";
    default:
      return "#374151";
  }
}

/**
 * Creates the question content for the PDF
 * Returns an unbreakable stack to prevent page breaks within a question
 */
function createQuestionContent(
  question: GeneratedQuestion,
  showAnswerLines: boolean,
  worksheetMode: string,
): Content {
  const questionStack: Content[] = [];

  // Question header line with number, bloom level, and difficulty
  const headerText: ContentText[] = [
    {
      text: `${question.questionNumber}. `,
      bold: true,
      fontSize: 11,
    },
    {
      text: `[${(question.bloomLevel || "remember").charAt(0).toUpperCase() + (question.bloomLevel || "remember").slice(1)}: ${question.bloomVerb || "state"}] `,
      fontSize: 10,
      color: "#374151",
    },
  ];

  // Add advancement level for diagnostic mode
  if (worksheetMode === "diagnostic" && question.advancementLevel) {
    headerText.push({
      text: `[Level ${question.advancementLevel}] `,
      fontSize: 9,
      bold: true,
      color: getAdvancementLevelColor(question.advancementLevel),
    });
  }

  // Add difficulty
  const difficultyText =
    question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1);
  headerText.push({
    text: `[${difficultyText}]`,
    fontSize: 9,
    color: "#374151",
  });

  questionStack.push({
    text: headerText,
    margin: [0, 0, 0, 2],
  });

  // Topic and standard
  questionStack.push({
    text: `${question.topic} (${question.standard})`,
    fontSize: 9,
    italics: true,
    color: "#6b7280",
    margin: [16, 0, 0, 4],
  });

  // Question text with math symbols processed
  const processedQuestion = processMathText(question.question);
  questionStack.push({
    text: processedQuestion,
    fontSize: 11,
    margin: [16, 0, 8, 4],
    lineHeight: 1.4,
    preserveLeadingSpaces: true,
  });

  // Work area box if showAnswerLines is true
  if (showAnswerLines) {
    // Work area section
    questionStack.push({
      margin: [16, 8, 8, 0],
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                {
                  columns: [
                    {
                      text: `WORK AREA Q${question.questionNumber}`,
                      fontSize: 8,
                      bold: true,
                      color: "#1e3a5f",
                    },
                    {
                      text: "Show all calculations & reasoning here",
                      fontSize: 7,
                      italics: true,
                      color: "#64748b",
                      alignment: "right",
                    },
                  ],
                  margin: [0, 0, 0, 4],
                },
                // Work area lines
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 20,
                      x2: 470,
                      y2: 20,
                      lineWidth: 0.5,
                      lineColor: "#cbd5e1",
                    },
                    {
                      type: "line",
                      x1: 0,
                      y1: 40,
                      x2: 470,
                      y2: 40,
                      lineWidth: 0.5,
                      lineColor: "#cbd5e1",
                    },
                    {
                      type: "line",
                      x1: 0,
                      y1: 60,
                      x2: 470,
                      y2: 60,
                      lineWidth: 0.5,
                      lineColor: "#cbd5e1",
                    },
                    {
                      type: "line",
                      x1: 0,
                      y1: 80,
                      x2: 470,
                      y2: 80,
                      lineWidth: 0.5,
                      lineColor: "#cbd5e1",
                    },
                  ],
                },
              ],
              fillColor: "#f8fafc",
              margin: [8, 6, 8, 6],
            },
          ],
          [
            {
              stack: [
                {
                  columns: [
                    {
                      text: "FINAL ANSWER",
                      fontSize: 8,
                      bold: true,
                      color: "#92400e",
                    },
                  ],
                  margin: [0, 0, 0, 4],
                },
                // Answer line
                {
                  canvas: [
                    {
                      type: "line",
                      x1: 0,
                      y1: 15,
                      x2: 470,
                      y2: 15,
                      lineWidth: 1,
                      lineColor: "#d97706",
                    },
                  ],
                },
              ],
              fillColor: "#fef3c7",
              margin: [8, 6, 8, 12],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
          i === 0 || i === node.table.body.length ? 2 : 1,
        vLineWidth: () => 2,
        hLineColor: (i: number, node: { table: { body: unknown[] } }) =>
          i === 0 || i === node.table.body.length ? "#1e3a5f" : "#94a3b8",
        vLineColor: () => "#1e3a5f",
        hLineStyle: (i: number, node: { table: { body: unknown[] } }) => {
          if (i === 0 || i === node.table.body.length) {
            return null;
          }
          return { dash: { length: 4, space: 4 } };
        },
      },
    } as Content);
  }

  // Add some spacing between questions
  questionStack.push({
    text: "",
    margin: [0, 0, 0, 12],
  });

  // Return as an unbreakable stack to prevent page breaks within a question
  return {
    unbreakable: true,
    stack: questionStack,
  };
}

/**
 * Creates the answer key content for the PDF
 */
function createAnswerKeyContent(
  questions: GeneratedQuestion[],
  worksheetTitle: string,
): Content[] {
  const content: Content[] = [];

  // Answer key header
  content.push({
    text: "ANSWER KEY",
    fontSize: 18,
    bold: true,
    alignment: "center",
    margin: [0, 0, 0, 8],
    pageBreak: "before",
  });

  content.push({
    text: worksheetTitle,
    fontSize: 12,
    alignment: "center",
    margin: [0, 0, 0, 8],
  });

  content.push({
    text: "FOR TEACHER USE ONLY",
    fontSize: 10,
    italics: true,
    color: "#6b7280",
    alignment: "center",
    margin: [0, 0, 0, 16],
  });

  // Create answer table
  const tableBody: Content[][] = [
    [
      { text: "#", bold: true, fontSize: 10, fillColor: "#f3f4f6" },
      {
        text: "Topic (Standard)",
        bold: true,
        fontSize: 10,
        fillColor: "#f3f4f6",
      },
      { text: "Answer", bold: true, fontSize: 10, fillColor: "#f3f4f6" },
    ],
  ];

  questions.forEach((q) => {
    if (q.answer) {
      tableBody.push([
        { text: q.questionNumber.toString(), fontSize: 10 },
        { text: `${q.topic} (${q.standard})`, fontSize: 9 },
        { text: processMathText(q.answer), fontSize: 10 },
      ]);
    }
  });

  content.push({
    table: {
      headerRows: 1,
      widths: [30, "*", "*"],
      body: tableBody,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => "#d1d5db",
      vLineColor: () => "#d1d5db",
      paddingLeft: () => 6,
      paddingRight: () => 6,
      paddingTop: () => 4,
      paddingBottom: () => 4,
    },
  } as Content);

  return content;
}

/**
 * Creates the formula reference sheet content
 */
function createFormulaSheetContent(formulas: FormulaCategory[]): Content[] {
  const content: Content[] = [];

  // Formula sheet header
  content.push({
    text: "Formula Reference Sheet",
    fontSize: 16,
    bold: true,
    alignment: "center",
    margin: [0, 0, 0, 8],
    pageBreak: "before",
  });

  content.push({
    text: "Based on selected topics",
    fontSize: 10,
    italics: true,
    color: "#6b7280",
    alignment: "center",
    margin: [0, 0, 0, 12],
  });

  // Horizontal line
  content.push({
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 0.5,
        lineColor: "#d1d5db",
      },
    ],
    margin: [0, 0, 0, 12],
  });

  // Render each category
  formulas.forEach((category) => {
    content.push({
      text: category.category,
      fontSize: 11,
      bold: true,
      margin: [0, 8, 0, 4],
    });

    category.formulas.forEach((formula) => {
      const formulaStack: Content[] = [
        {
          text: [
            { text: "• ", bold: true },
            { text: `${formula.name}: `, bold: true },
            { text: processMathText(formula.formula) },
          ],
          fontSize: 10,
          margin: [8, 0, 0, 2],
        },
      ];

      if (formula.description) {
        formulaStack.push({
          text: `(${formula.description})`,
          fontSize: 9,
          color: "#6b7280",
          margin: [16, 0, 0, 4],
        });
      }

      content.push({
        stack: formulaStack,
      });
    });
  });

  return content;
}

/**
 * Creates scrap paper pages content
 */
function createScrapPaperContent(
  questions: GeneratedQuestion[],
  worksheetTitle: string,
  layout: "single" | "split-2" | "split-4" = "split-2",
): Content[] {
  const content: Content[] = [];
  const problemNumbers = questions.map((q) => q.questionNumber);
  const zonesPerPage = layout === "single" ? 1 : layout === "split-2" ? 2 : 4;
  const pagesNeeded = Math.ceil(problemNumbers.length / zonesPerPage);

  let problemIndex = 0;

  for (let page = 0; page < pagesNeeded; page++) {
    // Page header
    content.push({
      text: `${worksheetTitle} - Scrap Paper`,
      fontSize: 14,
      bold: true,
      color: "#1e3a5f",
      alignment: "center",
      margin: [0, 0, 0, 4],
      pageBreak: page === 0 ? "before" : "after",
    });

    content.push({
      text: `Page ${page + 1} of ${pagesNeeded} | AI-Optimized Work Zones`,
      fontSize: 9,
      color: "#64748b",
      alignment: "center",
      margin: [0, 0, 0, 8],
    });

    // Name/Date line
    content.push({
      columns: [
        { text: "Name: _______________________", fontSize: 10 },
        { text: "Date: ___________", fontSize: 10, alignment: "right" },
      ],
      margin: [0, 0, 0, 8],
    });

    // Instructions
    content.push({
      table: {
        widths: ["*"],
        body: [
          [
            {
              text: [
                { text: "[!] INSTRUCTIONS: ", bold: true },
                {
                  text: "Keep all work within the designated zones for AI scanning. Write clearly and stay inside the boxes.",
                },
              ],
              fontSize: 7,
              color: "#047857",
              margin: [4, 4, 4, 4],
            },
          ],
        ],
      },
      layout: {
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        hLineColor: () => "#6ee7b4",
        vLineColor: () => "#6ee7b4",
        fillColor: () => "#ecfdf5",
      },
      margin: [0, 0, 0, 12],
    } as Content);

    // Work zones based on layout
    const zones: Content[] = [];
    const zonesThisPage = Math.min(
      zonesPerPage,
      problemNumbers.length - problemIndex,
    );

    for (let z = 0; z < zonesThisPage; z++) {
      const problemNum = problemNumbers[problemIndex] || problemIndex + 1;

      zones.push({
        table: {
          widths: ["*"],
          body: [
            [
              {
                stack: [
                  {
                    columns: [
                      {
                        table: {
                          body: [
                            [
                              {
                                text: `PROBLEM #${problemNum}`,
                                fontSize: 7,
                                bold: true,
                                color: "#ffffff",
                              },
                            ],
                          ],
                        },
                        layout: {
                          hLineWidth: () => 0,
                          vLineWidth: () => 0,
                          fillColor: () => "#1e3a5f",
                          paddingLeft: () => 4,
                          paddingRight: () => 4,
                          paddingTop: () => 2,
                          paddingBottom: () => 2,
                        },
                      } as Content,
                      {
                        text: "Show all work within this zone",
                        fontSize: 6,
                        italics: true,
                        color: "#64748b",
                        alignment: "right",
                      },
                    ],
                    margin: [0, 0, 0, 4],
                  },
                  // Work lines
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 20,
                        x2: layout === "split-4" ? 220 : 470,
                        y2: 20,
                        lineWidth: 0.3,
                        lineColor: "#cbd5e1",
                      },
                      {
                        type: "line",
                        x1: 0,
                        y1: 40,
                        x2: layout === "split-4" ? 220 : 470,
                        y2: 40,
                        lineWidth: 0.3,
                        lineColor: "#cbd5e1",
                      },
                      {
                        type: "line",
                        x1: 0,
                        y1: 60,
                        x2: layout === "split-4" ? 220 : 470,
                        y2: 60,
                        lineWidth: 0.3,
                        lineColor: "#cbd5e1",
                      },
                      {
                        type: "line",
                        x1: 0,
                        y1: 80,
                        x2: layout === "split-4" ? 220 : 470,
                        y2: 80,
                        lineWidth: 0.3,
                        lineColor: "#cbd5e1",
                      },
                      {
                        type: "line",
                        x1: 0,
                        y1: 100,
                        x2: layout === "split-4" ? 220 : 470,
                        y2: 100,
                        lineWidth: 0.3,
                        lineColor: "#cbd5e1",
                      },
                    ],
                  },
                ],
                fillColor: "#f8fafc",
                margin: [8, 6, 8, 6],
              },
            ],
            [
              {
                stack: [
                  {
                    text: `ANSWER #${problemNum}`,
                    fontSize: 6,
                    bold: true,
                    color: "#92400e",
                  },
                  {
                    canvas: [
                      {
                        type: "line",
                        x1: 0,
                        y1: 12,
                        x2: layout === "split-4" ? 200 : 450,
                        y2: 12,
                        lineWidth: 0.5,
                        lineColor: "#d97706",
                      },
                    ],
                  },
                ],
                fillColor: "#fef3c7",
                margin: [8, 4, 8, 8],
              },
            ],
          ],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === node.table.body.length ? 1.5 : 0.5,
          vLineWidth: () => 1.5,
          hLineColor: (i: number, node: { table: { body: unknown[] } }) =>
            i === 0 || i === node.table.body.length ? "#1e3a5f" : "#f59e0b",
          vLineColor: () => "#1e3a5f",
        },
        margin: layout === "split-4" ? [0, 0, 0, 8] : [0, 0, 0, 12],
      } as Content);

      problemIndex++;
    }

    if (layout === "split-4" && zones.length === 4) {
      // 2x2 grid
      content.push({
        columns: [
          { width: "*", stack: [zones[0], zones[2]] },
          { width: 10, text: "" },
          { width: "*", stack: [zones[1], zones[3]] },
        ],
      });
    } else if (layout === "split-4" && zones.length > 0) {
      // Handle remaining zones
      const col1: Content[] = [];
      const col2: Content[] = [];
      zones.forEach((z, i) => {
        if (i % 2 === 0) col1.push(z);
        else col2.push(z);
      });
      content.push({
        columns: [
          { width: "*", stack: col1 },
          { width: 10, text: "" },
          { width: "*", stack: col2.length > 0 ? col2 : [{ text: "" }] },
        ],
      });
    } else {
      // Single or split-2 layout
      zones.forEach((z) => content.push(z));
    }
  }

  return content;
}

/**
 * Builds the complete PDF document definition
 */
function buildDocumentDefinition(
  options: WorksheetPDFOptions,
): TDocumentDefinitions {
  const {
    title,
    teacherName,
    questions,
    showAnswerLines,
    worksheetMode,
    includeAnswerKey,
    includeFormulaSheet,
    formulas,
    includeScrapPaper,
    scrapPaperLayout,
    marginSize = "medium",
  } = options;

  // Calculate margins based on size preference
  const margin = marginSize === "small" ? 30 : marginSize === "large" ? 60 : 40;

  // Build document content
  const content: Content[] = [];

  // Title section
  content.push({
    text: title,
    fontSize: 18,
    bold: true,
    alignment: "center",
    margin: [0, 0, 0, 4],
  });

  // Teacher name if provided
  if (teacherName) {
    content.push({
      text: `Teacher: ${teacherName}`,
      fontSize: 11,
      color: "#4b5563",
      alignment: "center",
      margin: [0, 0, 0, 12],
    });
  }

  // Student info line
  content.push({
    columns: [
      { text: "Name: _______________________", fontSize: 10 },
      { text: "Date: ___________", fontSize: 10, alignment: "center" },
      { text: "Period: _____", fontSize: 10, alignment: "right" },
    ],
    margin: [0, 0, 0, 4],
  });

  // Horizontal line
  content.push({
    canvas: [
      {
        type: "line",
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 0.5,
        lineColor: "#d1d5db",
      },
    ],
    margin: [0, 0, 0, 16],
  });

  // Add questions
  questions.forEach((question) => {
    const questionContent = createQuestionContent(
      question,
      showAnswerLines,
      worksheetMode,
    );
    // createQuestionContent now returns a single unbreakable Content object
    content.push(questionContent);
  });

  // Add formula sheet if requested
  if (includeFormulaSheet && formulas && formulas.length > 0) {
    const formulaContent = createFormulaSheetContent(formulas);
    content.push(...formulaContent);
  }

  // Add answer key if requested
  if (includeAnswerKey && questions.some((q) => q.answer)) {
    const answerKeyContent = createAnswerKeyContent(questions, title);
    content.push(...answerKeyContent);
  }

  // Add scrap paper if requested
  if (includeScrapPaper) {
    const scrapPaperContent = createScrapPaperContent(
      questions,
      title,
      scrapPaperLayout || "split-2",
    );
    content.push(...scrapPaperContent);
  }

  // Footer
  content.push({
    text: "Generated with NYCLogic Ai - NYS Regents Aligned",
    fontSize: 8,
    color: "#9ca3af",
    alignment: "center",
    margin: [0, 20, 0, 0],
  });

  // Document definition
  const docDefinition: TDocumentDefinitions = {
    pageSize: "LETTER",
    pageMargins: [margin, margin, margin, margin],
    content,
    defaultStyle: {
      font: "Roboto",
      fontSize: 11,
    },
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10],
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
    },
    info: {
      title: title,
      author: teacherName || "QuickScan",
      subject: "Worksheet",
    },
  };

  return docDefinition;
}

/**
 * Generates a PDF document for a worksheet and downloads it
 */
export function generateWorksheetPDF(options: WorksheetPDFOptions): void {
  const docDefinition = buildDocumentDefinition(options);

  // Generate and download the PDF
  const filename = `${options.title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  pdfMake.createPdf(docDefinition).download(filename);
}

/**
 * Opens the PDF in a new tab for preview
 */
export function previewWorksheetPDF(options: WorksheetPDFOptions): void {
  const docDefinition = buildDocumentDefinition(options);

  // Open in new tab
  pdfMake.createPdf(docDefinition).open();
}

/**
 * Prints the worksheet directly
 */
export function printWorksheetPDF(options: WorksheetPDFOptions): void {
  const docDefinition = buildDocumentDefinition(options);

  // Print directly
  pdfMake.createPdf(docDefinition).print();
}
