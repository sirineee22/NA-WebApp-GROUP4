import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Play, BarChart3, Brain, Plus, Edit, Save, X, CheckCircle, Clock, FileText, Users, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Save as SaveIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import { useSidebar } from "@/components/ui/sidebar";
import QuizSection from "./QuizSection";

// --- Types ---
interface Lesson {
  id: string;
  title: string;
  content: string;
  duration: string;
  objectives: string[];
  videoUrl?: string;
  completed: boolean;
  description: string;
  niveau?: string;
  ordre?: number; // Add this line
}

interface Exercise {
  id: string;
  title: string;
  difficulty: string;
  estimatedTime: string;
  completed: boolean;
}

interface Resource {
  id: string;
  title: string;
  type: 'PDF' | 'Notes' | 'Lien';
  url: string;
  size?: string;
}

interface Module {
  id?: string;
  titre: string;
  description: string;
  type?: string;
  contenu?: string;
  id_enseignant?: string | null;
  categorie?: string | null;
  niveau?: string | null;
  duree?: string | null;
  objectifs?: string[];
}


const ProgressBar = ({ value }: { value: number }) => (
  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
    <div className="h-full bg-blue-600" style={{ width: `${value}%` }} />
  </div>
);

const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${color}`}>{children}</span>
);

const Module = () => {
  const { moduleId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Get location object
  const [moduleData, setModuleData] = useState<Module | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [moduleProgress, setModuleProgress] = useState<{ overall_progress: number; video_progress: number; quiz_score: number } | null>(null);

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
      const [activeTab, setActiveTab] = useState<'lecons' | 'quiz'>('lecons');
  const [showCreateLesson, setShowCreateLesson] = useState(false);
  const [showEditModule, setShowEditModule] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: '', content: '', duration: '', objectives: [''] });
  const [editModuleData, setEditModuleData] = useState({ title: '', description: '' });
 

  // Nouveaux états pour les données dynamiques
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [allResources, setAllResources] = useState<Resource[]>([]); // À adapter si tu as un endpoint pour les ressources
  const [editingDetail, setEditingDetail] = useState(false);
  const [editDetailData, setEditDetailData] = useState<{ titre: string; description: string }>({ titre: '', description: '' });
  const [selectedLessonEdit, setSelectedLessonEdit] = useState<Lesson | null>(null);
  const [editLessonData, setEditLessonData] = useState<{ title: string; content: string; videoUrl: string }>({ title: "", content: "", videoUrl: "" });
  const [videoOptions, setVideoOptions] = useState([
    { value: "video1.mp4", label: "Vidéo Manim 1" },
    { value: "video2.mp4", label: "Vidéo Manim 2" },
    { value: "video3.mp4", label: "Vidéo Manim 3" },
  ]);

  // Handler for creating a lesson
  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLesson.title || !newLesson.content || !newLesson.duration || !moduleId) return;
    try {
      const res = await fetch('http://localhost:8000/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: newLesson.title,
          contenu: newLesson.content,
          duree: newLesson.duration,
          id_module: Number(moduleId),
          id_enseignant: user?.id,
        })
      });
      if (!res.ok) throw new Error('Erreur lors de la création de la leçon');
      const lessonCree = await res.json();
      // Mettre à jour la liste des leçons
      setAllLessons(prev => [...prev, mapLesson(lessonCree)]);
      setNewLesson({ title: '', content: '', duration: '', objectives: [''] });
      setShowCreateLesson(false);
    } catch (err) {
      alert('Erreur lors de la création de la leçon');
    }
  };

  const handleEditModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModuleData.title || !editModuleData.description || !moduleId) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    try {
      const res = await fetch(`http://localhost:8000/modules/${moduleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: editModuleData.title,
          description: editModuleData.description,
          type: moduleData?.type || '',
          contenu: moduleData?.contenu || '',
          id_enseignant: user?.id || null,
          categorie: moduleData?.categorie || null,
          niveau: moduleData?.niveau || null,
          duree: moduleData?.duree || null,
          objectifs: moduleData?.objectifs || []
        }),
        credentials: 'include'  // Important pour les sessions/cookies
      });
      if (!res.ok) throw new Error('Erreur lors de la modification du module');
      const updated = await res.json();
      setModuleData(prev => ({
        ...prev,
        titre: updated.titre || prev?.titre || '',
        description: updated.description || prev?.description || ''
      }));
      setShowEditModule(false);
    } catch (err) {
      alert('Erreur lors de la modification du module');
    }
  };

  // Chargement dynamique des données
  useEffect(() => {
    console.log("Current user in Module.tsx useEffect:", user);
    if (!moduleId) return;
    setLoading(true);
    setFetchError(null);
    // 1. Charger le module
    fetch(`http://localhost:8000/modules/${moduleId}`, {
      credentials: 'include'  // Important pour les sessions/cookies
    })
      .then(res => {
        if (!res.ok) throw new Error("Module introuvable");
        return res.json();
      })
      .then(data => {
        console.log("Module data:", data);
        setModuleData({
          id: data.id_module || data.id,
          titre: data.titre || "Titre inconnu",
          description: data.description || "Aucune description disponible",
          type: data.type || '',
          contenu: data.contenu || '',
          id_enseignant: data.id_enseignant,
          categorie: data.categorie,
          niveau: data.niveau,
          duree: data.duree,
          objectifs: data.objectifs || []
        });
        // Mettre à jour les données d'édition
        setEditModuleData({
          title: data.titre || "",
          description: data.description || ""
        });
      })
      .catch((err) => {
        console.error("Error fetching module:", err);
        setModuleData({ titre: "Module introuvable", description: "Ce module n'existe pas ou une erreur est survenue." });
        setFetchError(err.message);
      });
    // 2. Charger les leçons du module
    console.log("Fetching lessons with user ID:", user?.id);
    fetch(`http://localhost:8000/lessons/module/${moduleId}${user ? `?user_id=${user.id}` : ''}`)
      .then(res => {
        if (!res.ok) {
          console.error(`HTTP error! status: ${res.status}`);
          throw new Error('Erreur lors du chargement des leçons');
        }
        return res.json();
      })
      .then(lessons => {
        console.log("RAW Lessons received from backend:", lessons); // Added this log
        console.log("Mapped lessons (allLessons state):", lessons.map(mapLesson));
        // 3. Charger les exercices en parallèle
        Promise.all([
          fetch('http://localhost:8000/exercises').then(res => res.json()),
        ]).then(([exercises]) => {
          setAllLessons(lessons.map(mapLesson));
          console.log("Mapped lessons (allLessons state):", lessons.map(mapLesson)); // Log mapped lessons
          setAllExercises(exercises);
        setLoading(false);
        });
      });
  }, [moduleId, user?.id, location.state]); // Add location.state as a dependency

  // Fetch module progress when user and module are available
  useEffect(() => {
    if (user && moduleId) {
      fetch(`http://localhost:8000/progress/module/${user.id}/${moduleId}`)
        .then(res => {
          console.log("Progress API response status:", res.status);
          return res.json();
        })
        .then(data => {
          console.log("Module progress data:", data);
          setModuleProgress(data);
        })
        .catch(err => console.error('Error fetching module progress:', err));
    }
  }, [user, moduleId]);

  // Synchronise editModuleData quand moduleData change
  useEffect(() => {
    if (moduleData) {
      setEditModuleData({
        title: moduleData.titre || '',
        description: moduleData.description || ''
      });
    }
  }, [moduleData]);

  // Synchronise editDetailData quand selectedLesson change
  useEffect(() => {
    if (selectedLesson) {
      setEditDetailData({ titre: selectedLesson.title, description: selectedLesson.description });
      setEditingDetail(false);
    }
  }, [selectedLesson]);

  const { open } = useSidebar();

  // --- All Dossiers View ---
  if (!moduleData && !fetchError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
      </div>
    );
  }
  
  if (fetchError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{fetchError}</p>
          <Button onClick={() => navigate('/modules')}>
            <ArrowLeft className="mr-2" size={16} />
            Retour aux modules
          </Button>
        </div>
      </div>
    );
  }

  // --- Dossier Detail View ---
  if (moduleData && !selectedLesson) {
    // Fallback global
    if (!moduleData || typeof moduleData !== 'object') {
      return <div className="text-red-500">Erreur critique : moduleData absent ou corrompu.</div>;
    }
    // Debug logs
    console.log('moduleData', moduleData);

    const lessons = allLessons.sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
    const completedLessonIds = new Set(lessons.filter(l => l.completed).map(l => l.id));
    console.log("Sorted lessons:", lessons); // Log sorted lessons
    console.log("Completed Lesson IDs:", Array.from(completedLessonIds)); // Log completed IDs

    let nextLessonToUnlockIndex = 0;
    for (let i = 0; i < lessons.length; i++) {
      if (!completedLessonIds.has(lessons[i].id)) {
        nextLessonToUnlockIndex = i;
        break;
      }
      nextLessonToUnlockIndex = i + 1; // If all before are complete, next one is unlockable
    }
    console.log("Next lesson to unlock index:", nextLessonToUnlockIndex); // Log next unlock index

    const isProf = user?.role === 'professeur';

    // Fallbacks pour les propriétés potentiellement absentes
    // const lessons = allLessons; // This line is now redundant after sorting and re-declaring `lessons` above.

    const handleSaveDetail = async () => {
      try {
        const res = await fetch(`http://localhost:8000/modules/${moduleId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titre: editDetailData.titre,
            description: editDetailData.description,
            id_module: Number(moduleId)
          })
        });
        if (!res.ok) throw new Error('Erreur lors de la modification du module');
        setModuleData({ titre: editDetailData.titre, description: editDetailData.description });
        setEditingDetail(false);
      } catch (err) {
        alert('Erreur lors de la modification du module');
      }
    };

    // Handler pour ouvrir l'édition d'une leçon
    const handleEditLesson = (lesson: Lesson) => {
      setSelectedLessonEdit(lesson);
      setEditLessonData({
        title: lesson.title,
        content: lesson.content,
        videoUrl: lesson.videoUrl || "",
      });
    };

    // Handler pour sauvegarder l'édition d'une leçon
    const handleSaveLessonEdit = async () => {
      if (!selectedLessonEdit) return;
      try {
        const res = await fetch(`http://localhost:8000/lessons/${selectedLessonEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titre: editLessonData.title,
            contenu: editLessonData.content,
            videoUrl: editLessonData.videoUrl,
            id_module: moduleId,
            id_enseignant: user?.id,
          }),
        });
        if (!res.ok) throw new Error("Erreur lors de la modification de la leçon");
        // Met à jour la leçon dans la liste
        setAllLessons(prev => prev.map(l => l.id === selectedLessonEdit.id ? {
            ...l,
            title: editLessonData.title,
            content: editLessonData.content,
            videoUrl: editLessonData.videoUrl,
          } : l));
        setSelectedLessonEdit(null);
      } catch (err) {
        alert("Erreur lors de la modification de la leçon");
      }
    };

    // Fonction utilitaire pour extraire la description d'une leçon
    function getLessonDescription(lesson: Lesson) {
      if (lesson.description && lesson.description.trim() !== '') return lesson.description;
      if (lesson.content && typeof lesson.content === 'string') {
        try {
          const blocks = JSON.parse(lesson.content);
          const firstTextBlock = Array.isArray(blocks) && blocks.find(b => b.type === 'text');
          if (firstTextBlock && firstTextBlock.content && firstTextBlock.content.content) {
            return firstTextBlock.content.content.slice(0, 120) + (firstTextBlock.content.content.length > 120 ? '...' : '');
          }
        } catch {}
      }
      if (lesson.content && typeof lesson.content === 'string') {
        try {
          const blocks = JSON.parse(lesson.content);
          const firstTextBlock = Array.isArray(blocks) && blocks.find(b => b.type === 'text');
          if (firstTextBlock && firstTextBlock.content && firstTextBlock.content.content) {
            return firstTextBlock.content.content.slice(0, 120) + (firstTextBlock.content.content.length > 120 ? '...' : '');
          }
        } catch {}
      }
      return '';
    }

    // Fonction pour supprimer une leçon
    const handleDeleteLesson = async (lessonId: string) => {
      if (!window.confirm("Supprimer cette leçon ?")) return;
      try {
        await fetch(`http://localhost:8000/lessons/${lessonId}`, { method: "DELETE" });
        // Met à jour la liste locale
        setAllLessons(prev => prev.filter(l => l.id !== lessonId));
      } catch (err) {
        alert("Erreur lors de la suppression");
      }
    };

    // Add this handler in the component
    // const handleToggleLessonCompleted = (lessonId: string) => {
    //   setAllLessons(prev => prev.map(l =>
    //       l.id === lessonId ? { ...l, completed: !l.completed } : l
    //     ));
    // };

    // Edit Module Dialog
    const editModuleDialog = (
      <Dialog open={showEditModule} onOpenChange={setShowEditModule}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le module</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditModule}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Titre du module</Label>
                <Input
                  id="title"
                  value={editModuleData.title}
                  onChange={(e) => setEditModuleData({...editModuleData, title: e.target.value})}
                  placeholder="Titre du module"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editModuleData.description}
                  onChange={(e) => setEditModuleData({...editModuleData, description: e.target.value})}
                  placeholder="Description du module"
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModule(false)}>
                Annuler
              </Button>
              <Button type="submit">Enregistrer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );

    return (
      <div className={`${open ? 'px-4' : 'px-12'} pt-2 pb-8 w-full`}>
        {editModuleDialog}
        <Button variant="ghost" onClick={() => {
          setSelectedLesson(null);
          navigate('/modules');
        }} className="mb-4 -mt-2">
          <ArrowLeft className="mr-2" size={16} />
          Retour aux modules
        </Button>
        
        {/* Progression du module section (moved to top) */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Progression du module</span>
            <span className="text-sm font-medium text-gray-700">
              {moduleProgress ? Math.round(moduleProgress.overall_progress) : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${moduleProgress ? moduleProgress.overall_progress : 0}%` }}
            ></div>
          </div>
          {moduleProgress && (
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>Vidéos: {moduleProgress.watched_videos}/{moduleProgress.total_videos}</span>
              <span>Quiz: {Math.round(moduleProgress.quiz_score)}%</span>
            </div>
          )}
        </div>

        {/* Header + Stats Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-4 mb-2">
                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                  <BookOpen />
                  {moduleData?.titre}
                </h1>
                {user?.role === 'professeur' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditModuleData({
                        title: moduleData?.titre || '',
                        description: moduleData?.description || ''
                      });
                      setShowEditModule(true);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Modifier
                  </Button>
                )}
              </div>
              <p className="text-gray-600 mb-4 text-lg">
                {moduleData?.description}
              </p>
            </div>
            <span className="bg-orange-100 text-orange-800 text-xs px-3 py-1 rounded-full self-start md:self-center">
              {/* {selectedDossier.difficulty} */}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <div>
              <div className="text-2xl font-bold text-blue-600">{moduleProgress ? Math.round(moduleProgress.overall_progress) : 0}%</div>
              <div className="text-xs text-gray-500">Progression</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{allLessons.filter(l => l.completed).length}/{allLessons.length}</div>
              <div className="text-xs text-gray-500">Leçons terminées</div>
            </div>
            <div>
              <div className="text-2xl font-bold">—</div>
              <div className="text-xs text-gray-500">Temps estimé</div>
            </div>
            {user?.role === 'professeur' && (
                  <Button
                    className="ml-auto"
                    onClick={() => {
                      if (!moduleId) {
                        alert('Erreur: moduleId manquant');
                        return;
                      }
                      navigate(`/lesson/new/${moduleId}`);
                    }}
                  >
            <Plus size={16} /> Ajouter une leçon
          </Button>
        )}
          </div>
        </div>

        {/* Modern Carded Tabs */}
        <div className="flex bg-gray-50 rounded-lg p-1 mb-8 w-full max-w-md mx-auto shadow-sm">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition
              ${activeTab === 'lecons' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('lecons')}
          >
            <Play className="w-4 h-4" />
            Leçons ({lessons.length})
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium transition
              ${activeTab === 'quiz' ? 'bg-white shadow text-pink-600' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('quiz')}
          >
            <Brain className="w-4 h-4" />
            Quiz (0)
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6 px-2 md:px-0">
          {activeTab === 'lecons' && (
            lessons.length === 0 ? (
              <div className="text-center text-gray-500 py-12 bg-white rounded-lg shadow">Aucune leçon pour le moment.</div>
            ) : (
              lessons.map((lesson, index) => {
                const isLocked = index > nextLessonToUnlockIndex;
                const cardClasses = `hover:shadow-md transition cursor-pointer p-0 group ${isLocked ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'bg-white'}`;
                
                console.log(`Lesson: ${lesson.title}, ID: ${lesson.id}, Order: ${lesson.ordre}, Completed: ${lesson.completed}, isLocked: ${isLocked}`); // Log each lesson's status

                return (
                  <Card
                    key={lesson.id}
                    className={cardClasses}
                    onClick={() => !isLocked && navigate(`/lesson-view/${lesson.id}/${moduleId}`)}
                  >
                    <div className="flex items-center gap-4 p-4">
                      <div onClick={e => e.stopPropagation()} className="flex-shrink-0 flex items-center justify-center relative">
                        <input
                          type="checkbox"
                          checked={lesson.completed}
                          // onChange={e => { e.stopPropagation(); handleToggleLessonCompleted(lesson.id); }} // Removed onChange
                          className="w-6 h-6 appearance-none rounded-full border-2 border-gray-300 checked:bg-blue-600 checked:border-blue-600 focus:ring-2 focus:ring-blue-400 cursor-pointer flex items-center justify-center"
                          aria-label="Marquer la leçon comme terminée"
                          disabled={isLocked} // Still disable if locked by sequence
                          readOnly // Make it read-only
                        />
                        {lesson.completed && (
                          <span className="absolute text-white left-1 top-0.5 text-lg pointer-events-none">✓</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base text-gray-900">
                          {lesson.title}
                        </div>
                        <div className="text-gray-600 text-sm mt-1 line-clamp-1">
                          {lesson.description}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-4 h-4" /> {lesson.duration}
                          </span>
                          {lesson.videoUrl
                            ? <span className="text-xs text-gray-500 flex items-center gap-1"><Play className="w-4 h-4" /> Vidéo Manim</span>
                            : <span className="text-xs text-gray-400 italic">Aucune vidéo</span>
                          }
                        </div>
                      </div>
                      {/* Icône suppression, visible au survol */}
                      <button
                        className="ml-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition"
                        title="Supprimer la leçon"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteLesson(lesson.id);
                        }}
                        disabled={isLocked}
                      >
                        <Trash2 size={20} />
                        </button>
                    {user?.role === 'professeur' && (
                      <button
                        className="ml-2 text-gray-400 hover:text-blue-600"
                        title="Éditer la leçon"
                        onClick={e => {
                          e.stopPropagation();
                          navigate(`/lesson/${lesson.id}/${moduleId}`);
                        }}
                      >
                        <Edit size={20} />
                      </button>
                      )}
                      <div>
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </div>
                  </Card>
                );
              })
            )
          )}
          {activeTab === 'quiz' && (
            <QuizSection userId={user?.id} />
          )}
            </div>

        {/* Dans la vue détail du chapitre, après la liste des leçons : */}

        {/* Affichage lecture seule d'une leçon */}
        {selectedLesson && (
          <div className="mt-8 max-w-3xl mx-auto">
            <Button variant="ghost" onClick={() => setSelectedLesson(null)} className="mb-4 -mt-2">
              <ArrowLeft className="mr-2" size={16} /> Retour aux leçons
            </Button>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play /> {selectedLesson.title}
                </CardTitle>
                <CardDescription>
                  {selectedLesson.duration && (
                    <span className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" /> {selectedLesson.duration}
                    </span>
                  )}
                  {selectedLesson.completed && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Terminée</span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Vidéo Manim */}
                <div className="w-full h-64 bg-black rounded flex items-center justify-center mb-6">
                  {selectedLesson.videoUrl ? (
                    <video controls className="w-full h-full rounded">
                      <source src={selectedLesson.videoUrl} type="video/mp4" />
                      Votre navigateur ne supporte pas la vidéo.
                    </video>
                  ) : (
                    <span className="text-gray-500">Vidéo Manim (à venir)</span>
                  )}
                </div>
                <div className="mb-4 text-gray-800 whitespace-pre-line">
                  {selectedLesson.content}
                </div>
                {selectedLesson.objectives && selectedLesson.objectives.length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-blue-700 mb-2">Objectifs d'apprentissage :</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedLesson.objectives.map((obj, i) => (
                        <li key={i} className="text-sm text-blue-800">{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // --- Lesson Detail View ---
  if (selectedLesson) {
    return (
      <div className={`${open ? 'px-4' : 'px-12'} py-8 w-full`}>
        <Button variant="ghost" onClick={() => setSelectedLesson(null)} className="mb-4 -mt-2">
          <ArrowLeft className="mr-2" size={16} />
          Retour au module
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play /> {selectedLesson.title}
            </CardTitle>
            <CardDescription>{selectedLesson.duration} | {selectedLesson.completed ? 'Terminée' : 'À voir'}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Video placeholder */}
            <div className="w-full h-64 bg-gray-200 rounded flex items-center justify-center mb-6">
              <span className="text-gray-500">Vidéo Manim (à venir)</span>
            </div>
            <div className="mb-4 text-gray-800 whitespace-pre-line">{selectedLesson.content}</div>
            <div className="mt-4">
              <h3 className="font-semibold text-blue-700 mb-2">Objectifs d'apprentissage :</h3>
              <ul className="list-disc list-inside space-y-1">
                {selectedLesson.objectives.map((obj, i) => (
                  <li key={i} className="text-sm text-blue-800">{obj}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
};

// Helper to map backend lesson fields to frontend fields
const mapLesson = (lesson: any): Lesson => ({
  id: lesson.id,
  title: lesson.titre ?? lesson.title ?? '',
  content: lesson.contenu ?? lesson.content ?? '',
  duration: lesson.duree ?? lesson.duration ?? '',
  objectives: lesson.objectifs ?? [],
  videoUrl: lesson.videoUrl ?? '',
  completed: lesson.completed ?? false, // Ensure this is correctly mapped
  description: lesson.description ?? '',
  niveau: lesson.niveau ?? '',
  ordre: lesson.ordre ?? 0,
});

export default Module;