import { StudentQRCode } from './StudentQRCode';
import { StudentOnlyQRCode } from './StudentOnlyQRCode';
import { cleanTextForPrint } from '@/lib/mathRenderer';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  student_id: string | null;
}

interface Question {
  id: string;
  jmap_id: string | null;
  prompt_text: string | null;
  prompt_image_url: string | null;
}

// Advancement levels A-F (A is best, F is lowest)
type AdvancementLevel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

const LEVEL_COLORS: Record<AdvancementLevel, { bg: string; text: string; border: string }> = {
  A: { bg: '#dcfce7', text: '#166534', border: '#16a34a' },
  B: { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  C: { bg: '#fef9c3', text: '#854d0e', border: '#eab308' },
  D: { bg: '#fed7aa', text: '#9a3412', border: '#f97316' },
  E: { bg: '#fecaca', text: '#991b1b', border: '#ef4444' },
  F: { bg: '#fecdd3', text: '#9f1239', border: '#e11d48' },
};

const LEVEL_DESCRIPTIONS: Record<AdvancementLevel, string> = {
  A: 'Advanced - Exceptional mastery, ready for enrichment',
  B: 'Proficient - Strong understanding, minor gaps',
  C: 'Developing - Solid foundation, needs practice',
  D: 'Approaching - Basic understanding, requires support',
  E: 'Beginning - Foundational skills emerging',
  F: 'Needs Intervention - Requires intensive support',
};

interface PrintableWorksheetProps {
  student: Student;
  questions: Question[];
  assessmentName?: string;
  showAnswerBox?: boolean;
  showQRCodes?: boolean;
  studentLevel?: AdvancementLevel | null;
  topicName?: string;
}

export function PrintableWorksheet({ 
  student, 
  questions, 
  assessmentName = 'Assessment',
  showAnswerBox = true,
  showQRCodes = true,
  studentLevel,
  topicName,
}: PrintableWorksheetProps) {
  const levelInfo = studentLevel ? LEVEL_COLORS[studentLevel] : null;
  const levelDescription = studentLevel ? LEVEL_DESCRIPTIONS[studentLevel] : null;

  return (
    <div 
      className="print-worksheet bg-white text-black min-h-screen" 
      style={{ 
        pageBreakAfter: 'always',
        padding: '0.5in 0.75in',
        maxWidth: '8.5in',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Header with Student QR Code */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          {/* Student Identification QR Code */}
          {showQRCodes && (
            <div style={{ flexShrink: 0, textAlign: 'center' }}>
              <StudentOnlyQRCode studentId={student.id} size={64} />
              <p style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.25rem' }}>Student ID</p>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold" style={{ margin: 0 }}>{assessmentName}</h1>
            <div className="mt-2 text-lg">
              <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {student.first_name} {student.last_name}</p>
              {student.student_id && (
                <p style={{ margin: '0.25rem 0' }}><strong>Student ID:</strong> {student.student_id}</p>
              )}
            </div>
          </div>
        </div>
        <div className="text-right text-sm" style={{ color: '#666' }}>
          <p style={{ margin: 0 }}>Date: _______________</p>
          <p style={{ margin: '0.25rem 0 0 0' }}>Period: ____________</p>
        </div>
      </div>

      {/* Student Level Indicator */}
      {studentLevel && levelInfo && (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            borderRadius: '0.5rem',
            backgroundColor: levelInfo.bg,
            border: `2px solid ${levelInfo.border}`,
          }}
        >
          <div 
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: levelInfo.border,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          >
            {studentLevel}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ 
              margin: 0, 
              fontWeight: 'bold', 
              fontSize: '1rem',
              color: levelInfo.text,
            }}>
              Your Current Level: {studentLevel}
              {topicName && <span style={{ fontWeight: 'normal' }}> in {topicName}</span>}
            </p>
            <p style={{ 
              margin: '0.25rem 0 0 0', 
              fontSize: '0.875rem',
              color: levelInfo.text,
              opacity: 0.9,
            }}>
              {levelDescription}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ 
              margin: 0, 
              fontSize: '0.75rem', 
              color: levelInfo.text,
              fontWeight: 500,
            }}>
              Scale: A (Best) → F
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '2px', 
              marginTop: '0.25rem',
              justifyContent: 'flex-end',
            }}>
              {(['A', 'B', 'C', 'D', 'E', 'F'] as AdvancementLevel[]).map(level => (
                <div
                  key={level}
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '3px',
                    backgroundColor: level === studentLevel ? LEVEL_COLORS[level].border : LEVEL_COLORS[level].bg,
                    border: `1px solid ${LEVEL_COLORS[level].border}`,
                    fontSize: '0.6rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: level === studentLevel ? 'bold' : 'normal',
                    color: level === studentLevel ? 'white' : LEVEL_COLORS[level].text,
                  }}
                >
                  {level}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {questions.map((question, index) => (
          <div 
            key={question.id} 
            className="question-block" 
            style={{ 
              pageBreakInside: 'avoid',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', width: '100%' }}>
              {/* QR Code */}
              {showQRCodes && (
                <div style={{ flexShrink: 0 }}>
                  <StudentQRCode 
                    studentId={student.id} 
                    questionId={question.id} 
                    size={56}
                  />
                  <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem', textAlign: 'center' }}>Q{index + 1}</p>
                </div>
              )}

              {/* Question Content */}
              <div style={{ 
                flex: 1, 
                minWidth: 0,
                maxWidth: showQRCodes ? 'calc(100% - 70px)' : '100%',
                overflow: 'hidden',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.125rem' }}>{index + 1}.</span>
                  {question.jmap_id && (
                    <span style={{ fontSize: '0.875rem', color: '#666' }}>({question.jmap_id})</span>
                  )}
                </div>

                {question.prompt_text && (
                  <p style={{ 
                    marginBottom: '0.75rem', 
                    fontFamily: 'Georgia, serif',
                    lineHeight: 1.6,
                    fontSize: '1rem',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    maxWidth: '100%',
                  }}>
                    {cleanTextForPrint(question.prompt_text)}
                  </p>
                )}

                {question.prompt_image_url && (
                  <img 
                    src={question.prompt_image_url} 
                    alt={`Question ${index + 1}`}
                    style={{ 
                      maxWidth: '100%',
                      maxHeight: '200px',
                      marginBottom: '0.75rem',
                      objectFit: 'contain',
                    }}
                  />
                )}

                {/* Answer Box */}
                {showAnswerBox && (
                  <div style={{ 
                    border: '2px solid #d1d5db',
                    borderRadius: '0.25rem',
                    padding: '1rem',
                    marginTop: '0.75rem',
                    minHeight: '100px',
                  }}>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '0.5rem' }}>Show your work:</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with student identifier */}
      <div style={{ 
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: '1px solid #d1d5db',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '0.75rem',
        color: '#9ca3af',
      }}>
        <span>{student.last_name}, {student.first_name}{studentLevel ? ` • Level ${studentLevel}` : ''}</span>
        <span>{assessmentName}</span>
      </div>
    </div>
  );
}
