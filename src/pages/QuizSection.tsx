import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { quizDataByModule } from '../data/quizData';

// Interfaces
interface QuizAnswer {
  questionIndex: number;
  userAnswer: any;
  isCorrect: boolean;
}

interface QuizResult {
  userId: number;
  moduleTitle: string;
  lessonTitle: string;
  score: number;
  total: number;
  answers: QuizAnswer[];
  completedAt: string;
}

interface QuizSectionProps {
  userId?: number;
}

// Helper to check answers
const checkAnswer = (question, answer) => {
  if (answer === undefined || answer === null || answer === '') return false;
  if (question.type === 'mcq') return answer === question.correct;
  if (question.type === 'bool') return String(answer) === String(question.correct);
  if (question.type === 'text') {
    const correctAnswer = String(question.correct).trim().toLowerCase();
    const userAnswer = String(answer).trim().toLowerCase();
    return userAnswer === correctAnswer;
  }
  return false;
};

// Individual Quiz Component
function QuizComponent({ lesson, questions, remedialQuestions, onComplete, existingResult }) {
  const [answers, setAnswers] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(!!existingResult);
  const [showingRemedial, setShowingRemedial] = useState(false);
  const [initialResult, setInitialResult] = useState(null);

  useEffect(() => {
    if (existingResult) {
      const initialAnswers = existingResult.answers.reduce((acc, ans) => ({...acc, [ans.questionIndex]: ans.userAnswer}), {});
      setAnswers(initialAnswers);
    } else {
      setAnswers({});
      setIsSubmitted(false);
      setShowingRemedial(false);
      setInitialResult(null);
    }
  }, [existingResult]);

  const handleAnswerChange = (questionIndex, answer) => {
    if (isSubmitted && !showingRemedial) return;
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const handleSubmit = () => {
    const currentQuestions = showingRemedial ? remedialQuestions : questions;
    let score = 0;
    const detailedAnswers = currentQuestions.map((q, i) => {
      const isCorrect = checkAnswer(q, answers[i]);
      if (isCorrect) score++;
      return { questionIndex: i, userAnswer: answers[i] || null, isCorrect };
    });

    if (showingRemedial) {
      // Combine results and finalize
      const finalScore = initialResult.score + score;
      const finalTotal = initialResult.total + currentQuestions.length;
      const finalAnswers = [...initialResult.answers, ...detailedAnswers];
      onComplete(finalScore, finalTotal, finalAnswers);
      setIsSubmitted(true);
    } else {
      const total = currentQuestions.length;
      if ((score / total) < 0.5 && remedialQuestions && remedialQuestions.length > 0) {
        // Failed, but has remedial questions
        setInitialResult({ score, total, answers: detailedAnswers });
        setShowingRemedial(true);
        setAnswers({}); // Reset for remedial questions
      } else {
        // Passed or no remedial questions
        onComplete(score, total, detailedAnswers);
        setIsSubmitted(true);
      }
    }
  };

  const questionsToDisplay = showingRemedial ? remedialQuestions : questions;
  const isFullyCompleted = isSubmitted && !showingRemedial;

  return (
    <div className="p-4 border-t">
      {showingRemedial && (
        <div className="p-4 mb-4 text-center bg-yellow-100 text-yellow-800 rounded-md">
          <p className="font-bold">Vous n'avez pas atteint 50%. Voici quelques questions supplémentaires pour vous aider.</p>
        </div>
      )}
      <div className="space-y-6">
        {questionsToDisplay.map((q, i) => (
          <div key={i} className="p-4 rounded-md bg-gray-50">
            <p className="font-medium mb-2">{i + 1}. {q.question}</p>
            {q.type === 'mcq' && q.options.map((opt, j) => (
              <div key={j} className="flex items-center mb-1">
                <input 
                  type="radio" 
                  name={`q-${i}`}
                  id={`q-${i}-opt-${j}`}
                  value={j} 
                  onChange={(e) => handleAnswerChange(i, parseInt(e.target.value))}
                  checked={answers[i] === j}
                  disabled={isFullyCompleted}
                  className="mr-2"
                />
                <label htmlFor={`q-${i}-opt-${j}`}>{opt}</label>
              </div>
            ))}
            {q.type === 'bool' && (
              <div className="flex space-x-4">
                <button onClick={() => handleAnswerChange(i, true)} disabled={isFullyCompleted} className={`px-4 py-2 rounded ${answers[i] === true ? 'bg-blue-500 text-white' : 'bg-white'}`}>Vrai</button>
                <button onClick={() => handleAnswerChange(i, false)} disabled={isFullyCompleted} className={`px-4 py-2 rounded ${answers[i] === false ? 'bg-red-500 text-white' : 'bg-white'}`}>Faux</button>
              </div>
            )}
            {q.type === 'text' && (
              <input 
                type="text" 
                value={answers[i] || ''}
                onChange={(e) => handleAnswerChange(i, e.target.value)}
                disabled={isFullyCompleted}
                className="border p-2 rounded w-full"
              />
            )}
            {isFullyCompleted && (
              <div className={`mt-2 p-2 rounded text-sm ${checkAnswer(q, answers[i]) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {checkAnswer(q, answers[i]) ? 'Correct !' : `Incorrect. La bonne réponse est : ${q.correct}`}
              </div>
            )}
          </div>
        ))}
        {!isFullyCompleted && (
          <button onClick={handleSubmit} className="px-6 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            {showingRemedial ? 'Soumettre les réponses supplémentaires' : 'Soumettre le Quiz'}
          </button>
        )}
      </div>
    </div>
  );
}

// Main Component
export default function QuizSection({ userId = 1 }: QuizSectionProps) { // Default userId for demo
  const [selectedModule, setSelectedModule] = useState(Object.keys(quizDataByModule)[0]);
  const [quizResults, setQuizResults] = useState<Record<string, QuizResult>>({});
  const [expandedQuizzes, setExpandedQuizzes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (userId) {
      fetch(`http://localhost:8000/quizzes/results/${userId}`)
        .then(res => res.json())
        .then(data => {
          const newResults: Record<string, QuizResult> = {};
          data.forEach((res: any) => {
            newResults[res.lesson_title] = {
              userId: res.user_id,
              moduleTitle: res.module_title,
              lessonTitle: res.lesson_title,
              score: res.score,
              total: res.total_questions,
              answers: res.answers, 
              completedAt: res.completed_at,
            };
          });
          setQuizResults(newResults);
        })
        .catch(error => console.error('Error fetching quiz results:', error));
    }
  }, [userId]);

  const handleQuizComplete = async (lessonTitle: string, score: number, total: number, answers: QuizAnswer[]) => {
    const result: QuizResult = {
      userId,
      moduleTitle: selectedModule,
      lessonTitle,
      score,
      total,
      answers,
      completedAt: new Date().toISOString(),
    };
    setQuizResults(prev => ({ ...prev, [lessonTitle]: result }));
    
    try {
      const response = await fetch('http://localhost:8000/quizzes/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          module_title: selectedModule, 
          lesson_title: lessonTitle,    
          score: score,
          total_questions: total,
          answers: answers.map((answer) => ({
            question_index: answer.questionIndex, 
            user_answer: answer.userAnswer,
            is_correct: answer.isCorrect
          })),
          completed_at: new Date().toISOString(),
        })
      });
      
      if (!response.ok) {
        console.error('Failed to submit quiz results');
      }
    } catch (error) {
      console.error('Error submitting quiz results:', error);
    }
  };

  const quizzesForSelectedModule = quizDataByModule[selectedModule] || [];

  return (
    <div className="space-y-6">
      <div>
        <label htmlFor="module-select" className="block text-sm font-medium text-gray-700 mb-2">Sélectionnez un chapitre :</label>
        <select 
          id="module-select"
          value={selectedModule}
          onChange={e => {
            setSelectedModule(e.target.value);
            setExpandedQuizzes({}); // Reset expanded state when changing module
          }}
          className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
        >
          {Object.keys(quizDataByModule).map(moduleTitle => (
            <option key={moduleTitle} value={moduleTitle}>{moduleTitle}</option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {quizzesForSelectedModule.map((quiz, index) => {
          const result = quizResults[quiz.lesson];
          const isCompleted = !!result;
          const hasPassed = isCompleted && (result.score / result.total) >= 0.5;

          const previousResult = index > 0 ? quizResults[quizzesForSelectedModule[index - 1].lesson] : null;
          const isUnlocked = index === 0 || (previousResult && (previousResult.score / previousResult.total) >= 0.5);
          const isExpanded = !!expandedQuizzes[quiz.lesson];

          return (
            <div key={quiz.lesson} className="bg-white rounded-lg shadow overflow-hidden">
              <div 
                className={`flex justify-between items-center p-4 ${isUnlocked ? 'cursor-pointer hover:bg-gray-50' : 'bg-gray-100'}`}
                onClick={() => {
                    if (isUnlocked) {
                        setExpandedQuizzes(prev => ({...prev, [quiz.lesson]: !isExpanded}));
                    }
                }}
              >
                <h3 className={`text-lg font-semibold ${isUnlocked ? 'text-indigo-700' : 'text-gray-400'}`}>
                  {quiz.lesson}
                  {!isUnlocked && <span className="text-sm font-normal ml-2">(Verrouillé - 50% requis au quiz précédent)</span>}
                  {isCompleted && (
                    <span className={`ml-2 text-sm font-normal ${hasPassed ? 'text-green-600' : 'text-red-600'}`}>
                      (Score: {result.score}/{result.total})
                    </span>
                  )}
                </h3>
                {isUnlocked && (
                    <button className="text-indigo-600 hover:text-indigo-800">
                        {isExpanded ? 'Masquer' : (isCompleted ? 'Revoir' : 'Commencer')}
                    </button>
                )}
              </div>
              {isExpanded && isUnlocked && (
                <QuizComponent 
                  lesson={quiz.lesson}
                  questions={quiz.questions}
                  remedialQuestions={quiz.remedialQuestions}
                  onComplete={(score, total, answers) => handleQuizComplete(quiz.lesson, score, total, answers)}
                  existingResult={result}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
