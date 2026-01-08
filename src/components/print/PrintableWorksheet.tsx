import { StudentQRCode } from './StudentQRCode';

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
    <div className="print-worksheet bg-white text-black p-8 min-h-screen" style={{ pageBreakAfter: 'always' }}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{assessmentName}</h1>
          <div className="mt-2 text-lg">
            <p><strong>Name:</strong> {student.first_name} {student.last_name}</p>
            {student.student_id && (
              <p><strong>Student ID:</strong> {student.student_id}</p>
            )}
          </div>
        </div>
        <div className="text-right text-sm text-gray-600">
          <p>Date: _______________</p>
          <p className="mt-1">Period: ____________</p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-8">
        {questions.map((question, index) => (
          <div key={question.id} className="question-block" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex gap-4">
              {/* QR Code */}
              {showQRCodes && (
                <div className="flex-shrink-0">
                  <StudentQRCode 
                    studentId={student.id} 
                    questionId={question.id} 
                    size={56}
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">Q{index + 1}</p>
                </div>
              )}

              {/* Question Content */}
              <div className="flex-1">
                <div className="flex items-start gap-2 mb-2">
                  <span className="font-bold text-lg">{index + 1}.</span>
                  {question.jmap_id && (
                    <span className="text-sm text-gray-500">({question.jmap_id})</span>
                  )}
                </div>

                {question.prompt_text && (
                  <p className="mb-3">{question.prompt_text}</p>
                )}

                {question.prompt_image_url && (
                  <img 
                    src={question.prompt_image_url} 
                    alt={`Question ${index + 1}`}
                    className="max-w-md mb-3"
                  />
                )}

                {/* Answer Box */}
                {showAnswerBox && (
                  <div className="border-2 border-gray-300 rounded p-4 mt-3 min-h-[120px]">
                    <p className="text-sm text-gray-400 mb-2">Show your work:</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with student identifier */}
      <div className="mt-8 pt-4 border-t border-gray-300 flex items-center justify-between text-xs text-gray-400">
        <span>{student.last_name}, {student.first_name}</span>
        <span>{assessmentName}</span>
      </div>
    </div>
  );
}
