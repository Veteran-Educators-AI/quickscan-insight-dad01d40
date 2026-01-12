import { StudentQRCode } from './StudentQRCode';
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

interface PrintableWorksheetProps {
  student: Student;
  questions: Question[];
  assessmentName?: string;
  showAnswerBox?: boolean;
  showQRCodes?: boolean;
}

export function PrintableWorksheet({ 
  student, 
  questions, 
  assessmentName = 'Assessment',
  showAnswerBox = true,
  showQRCodes = true 
}: PrintableWorksheetProps) {
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
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ margin: 0 }}>{assessmentName}</h1>
          <div className="mt-2 text-lg">
            <p style={{ margin: '0.25rem 0' }}><strong>Name:</strong> {student.first_name} {student.last_name}</p>
            {student.student_id && (
              <p style={{ margin: '0.25rem 0' }}><strong>Student ID:</strong> {student.student_id}</p>
            )}
          </div>
        </div>
        <div className="text-right text-sm" style={{ color: '#666' }}>
          <p style={{ margin: 0 }}>Date: _______________</p>
          <p style={{ margin: '0.25rem 0 0 0' }}>Period: ____________</p>
        </div>
      </div>

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
        <span>{student.last_name}, {student.first_name}</span>
        <span>{assessmentName}</span>
      </div>
    </div>
  );
}
