import React, { useState, useEffect, ReactNode, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, FileText, Video, Image, File, Brain, Download, ExternalLink, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import StudentExerciseAnswer from "./StudentExerciseAnswer";
import DesmosGraph from "@/components/DesmosGraph";
import { ContentBlock } from '../types/ContentBlock';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import parse from 'html-react-parser';

interface Lesson {
  id: number;
  titre: string;
  description: string;
  duree: string;
  niveau: string;
  visibilite: string;
  prerequis: string;
  progression: boolean;
  contenu: string;
}

const LessonView = () => {
  const { lessonId, moduleId } = useParams<{ lessonId: string; moduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  
  // Fonction pour sauvegarder la progression de la leçon
  const saveLessonProgress = async (lessonId: string) => {
    if (!user) return false;
    
    try {
      console.log('Sauvegarde de la progression pour la leçon:', lessonId);
      const response = await fetch(`http://localhost:8000/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: user.id, // Changed from userId to user_id
          module_id: moduleId // Changed from moduleId to module_id
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur lors de la sauvegarde de la progression:', errorData);
        return false;
      }
      
      const result = await response.json();
      console.log('Progression sauvegardée avec succès:', result);
      
      // Mettre à jour le state local immédiatement
      setIsVideoWatched(true);
      setVideoProgress(100);
      
      return true;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la progression:', error);
      return false;
    }
  };
  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState<{ [blockId: string]: boolean }>({});
  const [lessons, setLessons] = useState<{id: string, titre: string}[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(-1);
  const [videoProgress, setVideoProgress] = useState(0);
  const [isVideoWatched, setIsVideoWatched] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);

  useEffect(() => {
    if (lesson) {
      const blocks = JSON.parse(lesson.contenu);
      const videoExists = Array.isArray(blocks) && blocks.some(block => 
        block.type === 'video' || block.type === 'video_manim'
      );
      setHasVideo(videoExists);
    }
  }, [lesson]);

  // Récupérer la liste des leçons du module
  useEffect(() => {
    const fetchLessons = async () => {
      console.log('Début du chargement des leçons pour le module:', moduleId);
      if (!moduleId) {
        console.log('Aucun moduleId fourni');
        return;
      }
      
      try {
        // Récupérer les leçons du module depuis l'API
        const response = await fetch(`http://localhost:8000/lessons/module/${moduleId}`);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Leçons reçues:', data);
        
        // Trier les leçons par leur ordre
        const sortedLessons = data.sort((a: any, b: any) => a.ordre - b.ordre);
        setLessons(sortedLessons);
        
        // Trouver l'index de la leçon actuelle
        const currentIndex = sortedLessons.findIndex((l: any) => l.id.toString() === lessonId);
        console.log('Index de la leçon actuelle:', currentIndex);
        
        if (currentIndex === -1) {
          console.warn('Leçon actuelle non trouvée dans la liste des leçons');
          return;
        }
        
        setCurrentLessonIndex(currentIndex);
      } catch (err) {
        console.error('Erreur lors du chargement des leçons:', err);
        // En cas d'erreur, on utilise des données factices pour le débogage
        console.log('Utilisation de données factices pour le débogage');
        const mockLessons = [
          { id: '29', titre: 'Leçon actuelle', ordre: 1 },
          { id: '30', titre: 'Prochaine leçon', ordre: 2 },
          { id: '31', titre: 'Dernière leçon', ordre: 3 }
        ];
        setLessons(mockLessons);
        const currentIndex = mockLessons.findIndex(l => l.id === lessonId);
        setCurrentLessonIndex(currentIndex >= 0 ? currentIndex : 0);
      }
    };
    
    fetchLessons();
  }, [moduleId, lessonId]);

  // Navigation vers la leçon suivante
  const navigateToNextLesson = async () => {
    // Condition to save progress: if there's a video and it's not watched, OR if there's no video.
    if ((hasVideo && !isVideoWatched) || (!hasVideo && lessonId)) {
      const success = await saveLessonProgress(lessonId);
      if (!success) {
        console.error('Impossible de sauvegarder la progression avant de continuer');
        return;
      }
    }

    if (!lessons.length || currentLessonIndex === -1) {
      console.log('Aucune leçon disponible ou index invalide');
      return;
    }
    
    const nextIndex = currentLessonIndex + 1;
    if (nextIndex >= lessons.length) {
      console.log('Dernière leçon atteinte');
      // Save progress for the very last lesson before navigating back to module view
      if (lessonId) {
        await saveLessonProgress(lessonId);
      }
      // Utiliser navigate pour revenir à la liste des modules
      navigate(`/modules/${moduleId}`, { state: { openLessonId: lessonId, lessonCompleted: true } }); // Add lessonCompleted: true
      return;
    }
    
    const nextLesson = lessons[nextIndex];
    console.log('Navigation vers la leçon suivante:', nextLesson);
    
    // Sauvegarder la progression avant de naviguer
    if (lessonId) {
      await saveLessonProgress(lessonId);
    }
    
    // Utiliser navigate pour la navigation SPA sans rechargement complet
    navigate(`/lesson-view/${nextLesson.id}/${moduleId}`, { 
      replace: true,
      state: { fromNavigation: true }
    });
    
    // Forcer un léger délai pour s'assurer que la navigation est terminée
    setTimeout(() => {
      window.scrollTo(0, 0);
    }, 100);
  };

  // Composant vidéo avec suivi temporel
  const VideoPlayer = ({ src }: { src: string }) => {
    // Gestion des erreurs CORS
    const handleCorsError = (e: any) => {
      console.error('Erreur CORS:', e);
      console.log('Assurez-vous que le serveur backend autorise les requêtes CORS depuis ce domaine');
      console.log('URL de la vidéo:', src);
    };
    console.log('Chargement de la vidéo avec src:', src);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [hasError, setHasError] = useState(false);
    const [isVideoStarted, setIsVideoStarted] = useState(false);
    const watchTimerRef = useRef<NodeJS.Timeout>();
    
    // Vérifier si l'URL est valide
    const isValidUrl = (url: string) => {
      try {
        new URL(url);
        return true;
      } catch (e) {
        return false;
      }
    };
    
    if (!isValidUrl(src) && !src.startsWith('/')) {
      console.error('URL de la vidéo invalide:', src);
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          URL de la vidéo invalide. Veuillez vérifier le chemin de la vidéo.
        </div>
      );
    }

    // Marquer la vidéo comme vue après 30 secondes de lecture
    const startWatchTimer = () => {
      // Annuler le timer existant
      if (watchTimerRef.current) {
        clearTimeout(watchTimerRef.current);
      }
      
      // Démarrer un nouveau timer
      watchTimerRef.current = setTimeout(() => {
        console.log('Vidéo marquée comme vue (30 secondes de lecture)');
        setIsVideoWatched(true);
        setVideoProgress(100);
      }, 30000); // 30 secondes
    };

    // Nettoyer le timer lors du démontage
    useEffect(() => {
      return () => {
        if (watchTimerRef.current) {
          clearTimeout(watchTimerRef.current);
        }
      };
    }, []);

    const handlePlay = () => {
      console.log('Lecture démarrée');
      setIsVideoStarted(true);
      startWatchTimer();
    };

    const handlePause = () => {
      console.log('Lecture en pause');
      if (watchTimerRef.current) {
        clearTimeout(watchTimerRef.current);
      }
    };

    const handleEnded = async () => {
      console.log('Vidéo terminée');
      setVideoProgress(100);
      setIsVideoWatched(true);
      
      // Sauvegarder la progression quand la vidéo est terminée
      if (lessonId) {
        await saveLessonProgress(lessonId);
      }
      
      if (watchTimerRef.current) {
        clearTimeout(watchTimerRef.current);
      }
    };

    const handleError = (e: any) => {
      console.error('Erreur de lecture vidéo:', e);
      console.error('Détails de l\'erreur:', {
        error: e,
        videoSrc: src,
        videoElement: videoRef.current,
        networkState: videoRef.current?.networkState,
        readyState: videoRef.current?.readyState,
        errorState: videoRef.current?.error
      });
      setHasError(true);
      if (watchTimerRef.current) {
        clearTimeout(watchTimerRef.current);
      }
    };

    return (
      <div className="w-full space-y-2">
        {hasError ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            Impossible de charger la vidéo. Veuillez réessayer plus tard.
          </div>
        ) : (
          <div className="relative">
            <video
              key={`video-${src}`}  // Ajout d'une clé unique pour forcer le rechargement
              ref={videoRef}
              src={src}
              controls
              className="w-full h-auto max-h-[70vh] bg-black"
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onError={(e) => {
                handleError(e);
                handleCorsError(e);
              }}
              onLoadedMetadata={() => console.log('Métadonnées de la vidéo chargées')}
              onCanPlay={() => console.log('La vidéo peut être lue')}
              onCanPlayThrough={() => console.log('La vidéo peut être lue sans interruption')}
              onStalled={() => console.log('La lecture est bloquée')}
              onWaiting={() => console.log('En attente de données...')}
              playsInline
              preload="auto"
              muted
              autoPlay={false}
              controlsList="nodownload"
              crossOrigin="anonymous"
              onLoadStart={() => console.log('Début du chargement de la vidéo')}
              onProgress={() => console.log('Chargement en cours...')}
            >
              Votre navigateur ne prend pas en charge la lecture de vidéos.
            </video>
            
            {!isVideoStarted && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <button
                  onClick={() => {
                    const video = videoRef.current;
                    if (video) {
                      video.play().catch(e => {
                        console.error('Erreur de lecture:', e);
                        setHasError(true);
                      });
                    }
                  }}
                  className="p-4 bg-black/70 rounded-full text-white hover:bg-black/90 transition-colors"
                >
                  ▶️ Lire la vidéo
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    if (!lessonId || lessonId === 'new') {
      setError('Leçon introuvable');
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`http://localhost:8000/lessons/${lessonId}`)
      .then(res => {
        if (!res.ok) throw new Error('Leçon introuvable');
        return res.json();
      })
      .then(data => {
        setLesson(data);
        try {
          if (data.contenu) {
            console.log('Raw lesson content (data.contenu):', data.contenu); // Keep for debugging if needed
            const blocks = JSON.parse(data.contenu);
            console.log('Parsed content blocks:', blocks); // Keep for debugging if needed
            if (Array.isArray(blocks)) {
              setContentBlocks(blocks);
            } else {
              console.warn('Content is not an array:', blocks);
              setContentBlocks([]);
            }
          } else {
            console.log('No content in lesson data.');
            setContentBlocks([]);
          }
        } catch (err) {
          console.error('Erreur lors du parsing des blocs de contenu:', err);
          setContentBlocks([]);
        }
      })
      .catch(err => {
        console.error('Erreur lors du chargement de la leçon:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  const renderWithLatex = (content: string) => {
    if (!content) return null;

    // Regex to find all math expressions (inline and block)
    const regex = /(\$\$[^\$]+\$\$|\$[^\$]+\$)/g;
    const parts = content.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Block Math
        const math = part.slice(2, -2);
        return <BlockMath key={index} math={math} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline Math
        const math = part.slice(1, -1);
        return <InlineMath key={index} math={math} />;
      } else {
        // HTML content
        return <React.Fragment key={index}>{parse(part)}</React.Fragment>;
      }
    });
  };

  // Removed isMathFormula function
  // function isMathFormula(text: string): boolean {
  //   const mathPattern = /([=+\-*/^]|\\frac|\\sqrt|\\int|\\sum|\\det|\\lim|\\sin|\\cos|\\tan|\d+\s*[a-zA-Z])/;
  //   return mathPattern.test(text.trim()) && text.trim().length < 100; 
  // }

  // Gère la navigation vers la page suivante
  const handleNextLesson = useCallback(() => {
    // Logique pour passer à la leçon suivante
    // À implémenter : récupérer l'ID de la prochaine leçon
    // navigate(`/lesson/${nextLessonId}/${moduleId}`);
  }, []);

  // Fonction utilitaire pour formater les URLs des médias
  const formatMediaUrl = (url: string): string => {
    if (!url) return '';
    // Si l'URL est déjà relative, on la retourne telle quelle
    if (url.startsWith('/')) return url;
    // If it's a full URL to localhost:8000, convert it to a relative path
    const localhostMatch = url.match(/^https?:\/\/localhost:8000(\/.*)$/);
    if (localhostMatch) {
      return localhostMatch[1];
    }
    return url;
  };

  const renderContentBlock = (block: ContentBlock) => {
    const content = { ...(block.content || {}) };
    
    // Formater les URLs des médias
    if (content.url) {
      content.url = formatMediaUrl(content.url);
    }

    const BlockWrapper = ({ children, icon, title }: { children: ReactNode, icon: ReactNode, title: string }) => (
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gray-100 p-2 rounded-lg">{icon}</div>
          <h3 className="text-xl font-semibold text-gray-700">{title}</h3>
        </div>
        <div className="ml-12 pl-4 border-l-2 border-gray-200">{children}</div>
      </div>
    );

    switch (block.type) {
      case 'video':
      case 'video_manim':
        return (
          <div key={block.id} className="mb-16">
            <div className="aspect-video w-full bg-black rounded-xl overflow-hidden shadow-2xl mb-4">
              <VideoPlayer src={content.url} />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">{content.title || 'Vidéo'}</h2>
            {content.description && <p className="text-lg text-gray-600 mt-2 max-w-4xl">{content.description}</p>}
          </div>
        );

      case 'text':
        return (
          <div key={block.id} className="prose prose-lg max-w-none mb-12 text-gray-800 leading-relaxed">
            {content.content ? (
              typeof content.content === 'string' ? (
                <div className="whitespace-pre-wrap">
                  {renderWithLatex(content.content)}
                </div>
              ) : (
                <div>Contenu de type non pris en charge</div>
              )
            ) : (
              <div className="text-gray-400 italic">Aucun contenu</div>
            )}
          </div>
        );

      case 'image':
        return (
          <div key={block.id} className="mb-12 text-center">
            <img src={content.url} alt={content.alt || 'Image de la leçon'} className="max-w-full h-auto rounded-lg shadow-lg mx-auto" />
            {content.caption && <p className="text-base text-gray-500 mt-3 italic">{content.caption}</p>}
          </div>
        );

      case 'file':
        return (
          <BlockWrapper icon={<Download size={20} className="text-gray-600" />} title="Fichier à télécharger">
            <a href={content.url} download target="_blank" rel="noopener noreferrer">
              <Button>
                <Download className="mr-2" size={16} />
                {content.title || 'Télécharger'}
              </Button>
            </a>
          </BlockWrapper>
        );

      case 'quiz':
        return (
            <BlockWrapper icon={<Brain size={20} className="text-gray-600" />} title="Quiz Interactif">
                <div className="space-y-4">
                    {content.questions?.map((question: any, qIndex: number) => (
                        <div key={question.id || qIndex} className="border rounded-lg p-4">
                            <div className="font-medium mb-3">
                                Question {qIndex + 1}: {question.question}
                            </div>
                        </div>
                    ))}
                </div>
            </BlockWrapper>
        );

      case 'exercice':
        return (
          <BlockWrapper icon={<Brain size={20} className="text-gray-600" />} title="Exercice d'application">
            <StudentExerciseAnswer
              question={content.question}
              solution={user?.role === 'professeur' && showSolution[block.id] ? content.solution : undefined}
            />
            {user?.role === 'professeur' && (
              <div className="text-right mt-2">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSolution(prev => ({ ...prev, [block.id]: !prev[block.id] }));
                    }}
                  >
                    {showSolution[block.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span className="ml-2">{showSolution[block.id] ? 'Cacher' : 'Voir'} la solution</span>
                  </Button>
              </div>
            )}
          </BlockWrapper>
        );

      case 'desmos':
        return (
          <BlockWrapper icon={<ExternalLink size={20} className="text-gray-600" />} title="Grapheur Desmos">
            <div className="h-[500px] border rounded-lg overflow-hidden">
              <DesmosGraph expression={content.expression} />
            </div>
          </BlockWrapper>
        );

      default:
        return (
          <div key={block.id} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-gray-500 italic">Type de bloc non reconnu: {block.type}</div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
          <p className="text-gray-600 mb-6">{error || 'Leçon introuvable'}</p>
          <Button onClick={() => navigate(`/module/${moduleId}`)}>
            <ArrowLeft className="mr-2" size={16} />
            Retour au module
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <div className="mb-10">
          <Button
            variant="ghost"
            onClick={() => navigate(`/module/${moduleId}`)}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="mr-2" size={16} />
            Retour au module
          </Button>
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">{lesson.titre}</h1>
          <p className="mt-4 text-xl text-gray-500">{lesson.description}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">

          {contentBlocks.length === 0 ? (
            <div key="empty-lesson" className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto mb-6 text-gray-300" />
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Cette leçon est vide</h3>
              <p className="text-lg text-gray-600">Il n'y a pas encore de contenu à afficher.</p>
              {user?.role === 'professeur' && (
                <Button 
                  className="mt-6" 
                  size="lg"
                  onClick={() => navigate(`/lesson/${lesson.id}/${moduleId}`)}
                >
                  <Edit className="mr-2" size={18} />
                  Commencer à éditer
                </Button>
              )}
            </div>
          ) : (
            contentBlocks.map((block, index) => (
              <React.Fragment key={`block-${block.id || index}`}>
                {renderContentBlock(block)}
              </React.Fragment>
            ))
          )}
        </div>

      </div>
           {/* Bouton Leçon suivante avec progression améliorée */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col">
            {videoProgress > 0 && videoProgress < 90 && (
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${videoProgress}%` }}
                />
              </div>
            )}
            <div className="flex justify-end items-center">
              {currentLessonIndex < lessons.length - 1 ? (
                <button
                  onClick={navigateToNextLesson}
                  disabled={hasVideo && !isVideoWatched}
                  className={`flex items-center font-medium transition-colors ${
                    (hasVideo && isVideoWatched) || !hasVideo
                      ? 'text-blue-600 hover:text-blue-800' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {((hasVideo && isVideoWatched) || !hasVideo) ? (
                    <>
                      <span className="mr-2">Leçon suivante</span>
                      <span className="font-bold">→</span>
                      <span className="ml-2">{lessons[currentLessonIndex + 1]?.titre}</span>
                    </>
                  ) : hasVideo && videoProgress > 0 ? (
                    <span className="text-sm">Continuez à regarder pour débloquer la suite...</span>
                  ) : (
                    <span className="text-sm">Regardez la vidéo pour continuer</span>
                  )}
                </button>
              ) : (
                <div className="text-gray-500 font-medium">
                  Félicitations ! Vous avez terminé ce module.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonView;