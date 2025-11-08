import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Exercise = {
  id: number;
  system: {
    eq1: string;
    eq2: string;
  };
  question: string;
  hint: string;
  solution: {
    x: number;
    y: number;
  };
};

const exercises: Exercise[] = [
  {
    id: 1,
    system: {
      eq1: '2x + 3y = 12',
      eq2: '4x - y = 5',
    },
    question: 'Trouvez la solution du système d\'équations.',
    hint: 'Essayez d\'utiliser la méthode de substitution ou de combinaison.',
    solution: { x: 3, y: 2 },
  },
  {
    id: 2,
    system: {
      eq1: 'x - y = 1',
      eq2: '2x + y = 5',
    },
    question: 'Résolvez ce système en utilisant la méthode de votre choix.',
    hint: 'Additionnez les deux équations pour éliminer y.',
    solution: { x: 2, y: 1 },
  },
  // Ajoutez plus d'exercices ici
];

export function ExerciseMode({ onSelectExercise, onCheckSolution }: {
  onSelectExercise: (exercise: Exercise) => void;
  onCheckSolution: (exercise: Exercise, userSolution: { x: number; y: number }) => void;
}) {
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [userSolution, setUserSolution] = useState({ x: '', y: '' });
  const [progress, setProgress] = useState(0);

  const startExercise = (exercise: Exercise) => {
    setCurrentExercise(exercise);
    onSelectExercise(exercise);
    setShowHint(false);
    setUserSolution({ x: '', y: '' });
  };

  const checkSolution = () => {
    if (!currentExercise) return;
    
    const solution = {
      x: parseFloat(userSolution.x),
      y: parseFloat(userSolution.y)
    };
    
    onCheckSolution(currentExercise, solution);
    
    // Mise à jour de la progression
    setProgress(prev => Math.min(prev + 33, 100));
    
    // Réinitialiser pour l'exercice suivant
    setTimeout(() => {
      const nextExercise = exercises.find(ex => ex.id === (currentExercise.id % exercises.length) + 1);
      if (nextExercise) {
        startExercise(nextExercise);
      }
    }, 2000);
  };

  if (!currentExercise) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mode Exercice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Pratiquez la résolution de systèmes d'équations avec des exercices guidés.</p>
          <div className="space-y-2">
            {exercises.map((exercise) => (
              <Button
                key={exercise.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => startExercise(exercise)}
              >
                Exercice {exercise.id}: {exercise.system.eq1} et {exercise.system.eq2}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Exercice {currentExercise.id}</CardTitle>
          <Progress value={progress} className="w-1/4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="font-medium">{currentExercise.question}</p>
          <div className="bg-gray-100 p-4 rounded">
            <p>{currentExercise.system.eq1}</p>
            <p>{currentExercise.system.eq2}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Valeur de x:</label>
              <input
                type="number"
                step="any"
                className="w-full p-2 border rounded"
                value={userSolution.x}
                onChange={(e) => setUserSolution({...userSolution, x: e.target.value})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Valeur de y:</label>
              <input
                type="number"
                step="any"
                className="w-full p-2 border rounded"
                value={userSolution.y}
                onChange={(e) => setUserSolution({...userSolution, y: e.target.value})}
              />
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setShowHint(!showHint)}>
              {showHint ? 'Cacher l\'indice' : 'Afficher un indice'}
            </Button>
            <Button onClick={checkSolution}>Vérifier</Button>
          </div>
          
          {showHint && (
            <div className="bg-yellow-50 p-3 rounded text-yellow-800 text-sm">
              💡 {currentExercise.hint}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
