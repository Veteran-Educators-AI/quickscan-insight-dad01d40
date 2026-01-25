# Nyclogic Scholar App Webhook Schema

This document describes the payload format sent from **Nyclogic Ai** to the **Nyclogic Scholar** app via the `push-to-sister-app` edge function.

---

## Endpoint Configuration

The Scholar app must expose an endpoint that accepts POST requests. Configure this endpoint URL in the `NYCOLOGIC_API_URL` secret.

### Authentication
All requests include an `x-api-key` header containing the shared secret (`SISTER_APP_API_KEY`).

```
Headers:
  Content-Type: application/json
  x-api-key: <SISTER_APP_API_KEY>
```

---

## Payload Types

### 1. Grade Completed (with Questions)

Sent when a teacher pushes remediation or mastery challenges to students.

```json
{
  "action": "grade_completed",
  "student_id": "uuid-of-student",
  "data": {
    "activity_type": "scan_analysis",
    "activity_name": "Challenge Extensions: Solving Quadratic Equations",
    "score": 85,
    "xp_earned": 50,
    "coins_earned": 30,
    "topic_name": "Challenge Extensions - Solving Quadratic Equations",
    "description": "Challenge problems to extend understanding. Ready for advanced applications.",
    "standard_code": "A.REI.4",
    "class_id": "uuid-of-class",
    "student_name": "John Smith",
    "printable_url": "https://example.com/worksheet.pdf",
    "due_at": "2025-01-30T23:59:59Z",
    "questions": [
      {
        "questionNumber": 1,
        "question": "A ball is thrown upward with initial velocity 20 m/s. Its height h(t) = -5t² + 20t + 1.5. Find the maximum height reached.",
        "topic": "Quadratic Applications",
        "standard": "A.REI.4",
        "difficulty": "challenge",
        "hint": "The maximum occurs at the vertex. Use t = -b/(2a) to find the time.",
        "targetMisconception": null
      },
      {
        "questionNumber": 2,
        "question": "Solve: 2x² - 7x + 3 = 0 using the quadratic formula. Express in simplest radical form.",
        "topic": "Quadratic Formula",
        "standard": "A.REI.4",
        "difficulty": "challenge",
        "hint": "Identify a=2, b=-7, c=3 and substitute carefully.",
        "targetMisconception": null
      }
    ],
    "timestamp": "2025-01-25T14:30:00.000Z"
  }
}
```

### 2. Remediation Questions (for Struggling/Developing Students)

```json
{
  "action": "grade_completed",
  "student_id": "uuid-of-student",
  "data": {
    "activity_type": "scan_analysis",
    "activity_name": "Basic Skills - Scaffolded Practice: Linear Equations",
    "score": 52,
    "xp_earned": 25,
    "coins_earned": 15,
    "topic_name": "Basic Skills - Scaffolded Practice - Linear Equations",
    "description": "Basic Skills - Scaffolded Practice. Focus areas: Sign errors when moving terms, Incorrect distribution",
    "standard_code": "A.REI.3",
    "class_id": "uuid-of-class",
    "student_name": "Jane Doe",
    "questions": [
      {
        "questionNumber": 1,
        "question": "Solve for x: 3x + 5 = 14. Show each step.",
        "targetMisconception": "Sign errors when moving terms",
        "difficulty": "scaffolded",
        "hint": "First subtract 5 from both sides. Remember: what you do to one side, you must do to the other."
      },
      {
        "questionNumber": 2,
        "question": "Solve: 2(x - 4) = 10",
        "targetMisconception": "Incorrect distribution",
        "difficulty": "practice",
        "hint": "Distribute the 2 first: 2 × x and 2 × (-4)"
      },
      {
        "questionNumber": 3,
        "question": "The perimeter of a rectangle is 3x + 12. If the width is x, write and solve an equation for the length.",
        "targetMisconception": "Sign errors when moving terms",
        "difficulty": "challenge",
        "hint": "Perimeter = 2(length + width). Set up the equation and isolate length."
      }
    ],
    "timestamp": "2025-01-25T14:35:00.000Z"
  }
}
```

### 3. Behavior Deduction

```json
{
  "action": "behavior_deduction",
  "student_id": "uuid-of-student",
  "data": {
    "activity_type": "behavior_consequence",
    "activity_name": "Behavior: Disrupting class",
    "xp_deducted": 25,
    "coins_deducted": 15,
    "xp_earned": -25,
    "coins_earned": -15,
    "reason": "Disrupting class",
    "notes": "Repeatedly talking during instruction",
    "class_id": "uuid-of-class",
    "student_name": "Alex Johnson",
    "timestamp": "2025-01-25T10:15:00.000Z"
  }
}
```

---

## Question Object Schema

| Field | Type | Description |
|-------|------|-------------|
| `questionNumber` | number | Sequential question number (1, 2, 3...) |
| `question` | string | The question text (may include Unicode math symbols: π, √, ², ≤, etc.) |
| `topic` | string | Topic name the question covers |
| `standard` | string | NYS standard code (e.g., "A.REI.4", "G.CO.9") |
| `difficulty` | string | One of: `"scaffolded"`, `"practice"`, `"challenge"` |
| `hint` | string | Helpful hint that guides without giving away the answer |
| `targetMisconception` | string \| null | The specific misconception this question addresses (for remediation) |

### Difficulty Levels

| Level | Description | Student Group |
|-------|-------------|---------------|
| `scaffolded` | Step-by-step guided questions with heavy scaffolding | Struggling (< 60%) |
| `practice` | Standard reinforcement problems | Developing (60-79%) |
| `challenge` | Advanced extension problems requiring deep understanding | Proficient (80%+) |

---

## Recommended Scholar App Implementation

### 1. Webhook Receiver

```typescript
// Example Express.js handler
app.post('/api/receive-from-scangenius', async (req, res) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.EXPECTED_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action, student_id, data } = req.body;

  switch (action) {
    case 'grade_completed':
      await handleGradeCompleted(student_id, data);
      break;
    case 'behavior_deduction':
      await handleBehaviorDeduction(student_id, data);
      break;
  }

  res.json({ success: true });
});
```

### 2. Processing Questions

```typescript
async function handleGradeCompleted(studentId: string, data: GradeData) {
  // 1. Award XP and coins
  await updateStudentCurrency(studentId, data.xp_earned, data.coins_earned);
  
  // 2. Create assignment from questions (if present)
  if (data.questions && data.questions.length > 0) {
    await createStudentAssignment({
      student_id: studentId,
      title: data.activity_name,
      topic: data.topic_name,
      standard: data.standard_code,
      questions: data.questions,
      xp_reward: data.xp_earned,
      coin_reward: data.coins_earned,
      due_at: data.due_at,
      source: 'nyclogic_ai_push',
    });
    
    // 3. Notify student
    await sendPushNotification(studentId, {
      title: 'New Practice Assignment',
      body: `Your teacher sent you ${data.questions.length} questions on ${data.topic_name}`,
    });
  }
}
```

### 3. Displaying Questions to Students

```tsx
// React component example
function PracticeQuestion({ question, onAnswer }) {
  return (
    <div className="question-card">
      <Badge>{question.difficulty}</Badge>
      <p className="question-text">{question.question}</p>
      
      {/* Show hint on request */}
      <Collapsible>
        <CollapsibleTrigger>Need a hint?</CollapsibleTrigger>
        <CollapsibleContent>
          <p className="hint">{question.hint}</p>
        </CollapsibleContent>
      </Collapsible>
      
      <textarea 
        placeholder="Enter your answer..."
        onChange={(e) => onAnswer(e.target.value)}
      />
    </div>
  );
}
```

---

## Response Format

The Scholar app should respond with:

### Success
```json
{
  "success": true,
  "message": "Data processed successfully",
  "assignment_id": "uuid-of-created-assignment"
}
```

### Error
```json
{
  "success": false,
  "error": "Student not found",
  "code": "STUDENT_NOT_FOUND"
}
```

---

## Testing

You can test the webhook using curl:

```bash
curl -X POST https://your-scholar-app.com/api/receive-from-scangenius \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -d '{
    "action": "grade_completed",
    "student_id": "test-student-id",
    "data": {
      "activity_type": "scan_analysis",
      "activity_name": "Test Assignment",
      "score": 85,
      "xp_earned": 50,
      "coins_earned": 30,
      "questions": [
        {
          "questionNumber": 1,
          "question": "What is 2 + 2?",
          "difficulty": "scaffolded",
          "hint": "Count on your fingers"
        }
      ],
      "timestamp": "2025-01-25T12:00:00.000Z"
    }
  }'
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-01-25 | Added `questions` array to grade_completed payload |
| 2025-01-25 | Added difficulty levels: scaffolded, practice, challenge |
| 2025-01-25 | Added targetMisconception field for remediation tracking |
