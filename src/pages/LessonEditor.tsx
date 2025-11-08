import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Eye, EyeOff, Calendar, Clock, FileText, Video, Image, File, Brain, Settings, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import DesmosGraph from "@/components/DesmosGraph";
import TextareaAutosize from 'react-textarea-autosize';
import { ContentBlock } from '../types/ContentBlock';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import parse from 'html-react-parser';

// Types pour les blocs de contenu
interface VideoBlock {
  type: 'upload' | 'youtube' | 'vimeo';
  url: string;
  title: string;
  description: string;
  subtitles?: string;
  chapters?: string;
  file?: File;
  preview?: string;
}

interface ManimVideo {
  name: string;
  url: string;
}

interface ManimCategory {
  category: string;
  videos: ManimVideo[];
}

interface TextBlock {
  content: string;
  latexEnabled: boolean; // Keeping this for now, but its functionality will be ignored for text content
}

interface ImageBlock {
  url: string;
  alt: string;
  caption: string;
}

interface FileBlock {
  url: string;
  title: string;
  type: 'pdf' | 'doc' | 'other';
}

interface QuizBlock {
  questions: Array<{
    id: string;
    question: string;
    type: 'qcm' | 'text' | 'numerical';
    options?: string[];
    correctAnswer?: string | number;
    points: number;
  }>;
}

interface ExerciceBlock {
  id?: number;
  question: string;
  solution: string;
  feedback?: string;
  points?: number;
  id_module?: number | null;
  id_lecon?: number | null;
  id_enseignant: number;
  tp?: string;
  type?: string;
  solutionVisible?: boolean;
}

interface ManimVideoOption {
  label: string;
  url: string;
  title: string;
  description: string;
  type: 'video_manim';
}

const LessonEditor = () => {
  const { lessonId, moduleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [lesson, setLesson] = useState({
    titre: '',
    description: '',
    duree: '',
    niveau: 'intermediaire',
    visibilite: 'brouillon',
    prerequis: '',
    progression: true
  });

  const [contentBlocks, setContentBlocks] = useState<ContentBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ContentBlock | null>(null);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockType, setBlockType] = useState<ContentBlock['type']>('text');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showManimDialog, setShowManimDialog] = useState(false);
  const [manimVideos, setManimVideos] = useState<ManimCategory[]>([]);

  useEffect(() => {
    const fetchManimVideos = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/manim-videos');
        if (!response.ok) {
          throw new Error('Failed to fetch Manim videos');
        }
        const data = await response.json();
        setManimVideos(data);
      } catch (error) {
        console.error('Error fetching Manim videos:', error);
      }
    };
    fetchManimVideos();
  }, []);

  const [videoBlock, setVideoBlock] = useState<VideoBlock>({
    type: 'upload',
    url: '',
    title: '',
    description: '',
    subtitles: '',
    chapters: ''
  });

  const [textBlock, setTextBlock] = useState<TextBlock>({
    content: '',
    latexEnabled: false
  });

  const [imageBlock, setImageBlock] = useState<ImageBlock>({
    url: '',
    alt: '',
    caption: ''
  });

  const [fileBlock, setFileBlock] = useState<FileBlock>({
    url: '',
    title: '',
    type: 'pdf'
  });

  const [quizBlock, setQuizBlock] = useState<QuizBlock>({
    questions: []
  });

  const [exerciceBlock, setExerciceBlock] = useState<ExerciceBlock>({
    question: '',
    solution: '',
    feedback: '',
    points: 1,
    id_module: moduleId ? parseInt(moduleId) : null,
    id_lecon: lessonId && lessonId !== 'new' ? parseInt(lessonId) : null,
    id_enseignant: user?.id || 0,
    tp: ''
  });

  const [showTypeDialog, setShowTypeDialog] = useState(false);
  const [desmosBlock, setDesmosBlock] = useState({ expression: '' });
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // Removed isMathFormula function
  // function isMathFormula(text: string): boolean {
  //   const mathPattern = /([=+\-*/^]|\\frac|\\sqrt|\\int|\\sum|\\det|\\lim|\\sin|\\cos|\\tan|\d+\s*[a-zA-Z])/;
  //   return mathPattern.test(text.trim()) && text.trim().length < 100;
  // }

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
        return <div key={index} dangerouslySetInnerHTML={{ __html: part }} />;
      }
    });
  };

  // Removed renderInlineMath as it's no longer needed with simplified renderWithLatex
  // const renderInlineMath = (text: string) => {
  //   const parts = text.split(/(\$[^$]+\$)/);
  //   return parts.map((part, index) => {
  //     if (part.startsWith('$') && part.endsWith('$')) {
  //       const math = part.slice(1, -1);
  //       return <InlineMath key={index} math={math} />;
  //     }
  //     return part;
  //   });
  // };

  // Add block
  const addBlock = () => {
    setShowTypeDialog(true);
  };

  const handleTypeSelect = (type: ContentBlock['type']) => {
    setBlockType(type);
    setShowTypeDialog(false);
    if (type === 'video_manim') {
      setShowManimDialog(true);
      setShowTypeDialog(false);
      return;
    }
    const newBlock: ContentBlock = {
      id: `block-${Date.now()}`,
      type: type,
      content: getDefaultContent(type),
      order: contentBlocks.length
    };
    setContentBlocks([...contentBlocks, newBlock]);
    if (type === 'text') {
      setEditingBlockId(newBlock.id);
    } else {
      setSelectedBlock(newBlock);
      setShowBlockDialog(true);
    }
  };

  const editBlock = (block: ContentBlock) => {
    setEditingBlockId(block.id);
    switch (block.type) {
      case 'video':
        setVideoBlock(block.content);
        break;
      case 'text':
        setTextBlock(block.content);
        break;
      case 'image':
        setImageBlock(block.content);
        break;
      case 'file':
        setFileBlock(block.content);
        break;
      case 'quiz':
        setQuizBlock(block.content);
        break;
      case 'exercice':
        setExerciceBlock(block.content);
        break;
      case 'desmos':
        setDesmosBlock(block.content);
        break;
    }
  };

  const getDefaultContent = (type: string) => {
    switch (type) {
      case 'video':
        return { type: 'upload', url: '', title: '', description: '' };
      case 'video_manim':
        return { type: 'gauss_elimination', title: '', description: '', parameters: {}, duration: '' };
      case 'text':
        return { content: '', latexEnabled: false };
      case 'image':
        return { url: '', alt: '', caption: '' };
      case 'file':
        return { url: '', title: '', type: 'pdf' };
      case 'quiz':
        return { questions: [] };
      case 'exercice':
        return { question: '', solution: '', feedback: '', type: 'Application', points: 1, solutionVisible: false };
      case 'desmos':
        return { expression: '' };
      default:
        return {};
    }
  };

  const saveBlock = async () => {
    if (!selectedBlock) return;
    if (selectedBlock.type === 'exercice' && !selectedBlock.content?.exerciseId) {
      let content;
      try {
        if (!exerciceBlock.question || !exerciceBlock.solution || !user?.id) {
          alert("La question, la solution et l'enseignant sont obligatoires !");
          return;
        }
        const exerciseData = {
          question: exerciceBlock.question.trim(),
          solution: exerciceBlock.solution.trim(),
          feedback: exerciceBlock.feedback?.trim() || null,
          type: exerciceBlock.type || 'qcm',
          points: Number(exerciceBlock.points) || 1,
          id_module: Number(moduleId) || null,
          id_lecon: lessonId && lessonId !== 'new' ? Number(lessonId) : null,
          id_enseignant: user.id,
          id_chapitre: null
        };
        const response = await fetch('http://localhost:8000/exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(exerciseData)
        });
        if (!response.ok) {
          throw new Error('Erreur lors de la création de l\'exercice');
        }
        const createdExercise = await response.json();
        content = {
          question: exerciceBlock.question,
          solution: exerciceBlock.solution,
          feedback: exerciceBlock.feedback,
          type: exerciceBlock.type,
          points: exerciceBlock.points,
          solutionVisible: exerciceBlock.solutionVisible,
          exerciseId: createdExercise.id
        };
      } catch (error) {
        console.error('Erreur lors de la création de l\'exercice:', error);
        alert('Erreur lors de la création de l\'exercice');
        return;
      }
      const newBlocks = [];
      newBlocks.push({
        id: `block-${Date.now()}-ex`,
        type: 'exercice',
        content,
        order: contentBlocks.length + newBlocks.length,
      });
      if (imageBlock.url) {
        newBlocks.push({
          id: `block-${Date.now()}-img`,
          type: 'image',
          content: imageBlock,
          order: contentBlocks.length + newBlocks.length,
        });
      }
      if (fileBlock.url) {
        newBlocks.push({
          id: `block-${Date.now()}-file`,
          type: 'file',
          content: fileBlock,
          order: contentBlocks.length + newBlocks.length,
        });
      }
      if (videoBlock.url || videoBlock.file) {
        newBlocks.push({
          id: `block-${Date.now()}-vid`,
          type: 'video',
          content: videoBlock,
          order: contentBlocks.length + newBlocks.length,
        });
      }
      if (textBlock.content && textBlock.content.trim() !== '') {
        newBlocks.push({
          id: `block-${Date.now()}-txt`,
          type: 'text',
          content: textBlock,
          order: contentBlocks.length + newBlocks.length,
        });
      }
      setContentBlocks([...contentBlocks, ...newBlocks]);
      setShowBlockDialog(false);
      setSelectedBlock(null);
      setVideoBlock({ type: 'upload', url: '', title: '', description: '', subtitles: '', chapters: '' });
      setTextBlock({ content: '', latexEnabled: false });
      setImageBlock({ url: '', alt: '', caption: '' });
      setFileBlock({ url: '', title: '', type: 'pdf' });
      setQuizBlock({ questions: [] });
      setExerciceBlock({ 
        question: '', 
        solution: '', 
        feedback: '', 
        points: 1, 
        id_module: moduleId ? parseInt(moduleId) : null,
        id_lecon: lessonId && lessonId !== 'new' ? parseInt(lessonId) : null,
        id_enseignant: user?.id || 0,
        tp: ''
      });
      setDesmosBlock({ expression: '' });
      return;
    }
    let content;
    switch (selectedBlock.type) {
      case 'video':
        content = videoBlock;
        break;
      case 'text':
        content = textBlock;
        break;
      case 'image':
        content = imageBlock;
        break;
      case 'file':
        content = fileBlock;
        break;
      case 'quiz':
        content = quizBlock;
        break;
      case 'exercice':
        content = exerciceBlock;
        break;
      case 'desmos':
        content = desmosBlock;
        break;
    }
    setContentBlocks(blocks => 
      blocks.map(block => 
        block.id === selectedBlock.id 
          ? { ...block, content }
          : block
      )
    );
    setShowBlockDialog(false);
    setSelectedBlock(null);
    setVideoBlock({ type: 'upload', url: '', title: '', description: '', subtitles: '', chapters: '' });
    setTextBlock({ content: '', latexEnabled: false });
    setImageBlock({ url: '', alt: '', caption: '' });
    setFileBlock({ url: '', title: '', type: 'pdf' });
    setQuizBlock({ questions: [] });
    setExerciceBlock({ 
      question: '', 
      solution: '', 
      feedback: '', 
      points: 1, 
      id_module: moduleId ? parseInt(moduleId) : null,
      id_lecon: lessonId && lessonId !== 'new' ? parseInt(lessonId) : null,
      id_enseignant: user?.id || 0,
      tp: ''
    });
    setDesmosBlock({ expression: '' });
  };

  const deleteBlock = (blockId: string) => {
    setContentBlocks(blocks => blocks.filter(block => block.id !== blockId));
  };

  const saveLesson = async () => {
    setSaving(true);
    try {
      if (!moduleId) {
        alert('Erreur: moduleId manquant');
        setSaving(false);
        return;
      }
      if (!lesson.titre) {
        alert('Veuillez remplir le titre de la leçon.');
        setSaving(false);
        return;
      }
      if (!lessonId || (lessonId !== 'new' && isNaN(Number(lessonId)))) {
        alert('Erreur: lessonId invalide');
        setSaving(false);
        return;
      }
      const lessonData = {
        ...lesson,
        id_module: Number(moduleId),
        id_enseignant: user.id,
        contenu: JSON.stringify(contentBlocks),
        ordre: 1
      };
      const url = lessonId === 'new' 
        ? 'http://localhost:8000/lessons'
        : `http://localhost:8000/lessons/${lessonId}`;
      const method = lessonId === 'new' ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lessonData)
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error('Erreur lors de la sauvegarde: ' + errorText);
      }
      const savedLesson = await res.json();
      if (lessonId === 'new') {
        const exerciseBlocks = contentBlocks.filter(block => block.type === 'exercice' && block.content.exerciseId);
        for (const block of exerciseBlocks) {
          try {
            await fetch(`http://localhost:8000/exercises/${block.content.exerciseId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...block.content,
                id_lecon: savedLesson.id
              })
            });
          } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'exercice:', error);
          }
        }
      }
      navigate(`/lesson-view/${savedLesson.id}/${moduleId}`);
    } catch (err) {
      alert('Erreur lors de la sauvegarde de la leçon: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setSaving(false);
    }
  };

  const renderBlock = (block: ContentBlock) => {
    const content = block.content || {};
    if (editingBlockId === block.id) {
      switch (block.type) {
        case 'text':
          return (
            <div className="flex flex-col gap-2 p-3 bg-green-50 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
              <TextareaAutosize
                value={textBlock.content}
                onChange={e => setTextBlock({ ...textBlock, content: e.target.value })}
                placeholder="Contenu de la leçon... Tapez du texte" // Updated placeholder
                className="min-h-[100px] resize-none"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingBlockId(null)}>Annuler</Button>
                <Button variant="default" onClick={() => {
                  setContentBlocks(blocks => blocks.map(b => b.id === block.id ? { ...b, content: textBlock } : b));
                  setEditingBlockId(null);
                }}>Enregistrer</Button>
                <Button variant="outline" onClick={() => deleteBlock(block.id)}>Supprimer</Button>
              </div>
            </div>
          );
        // ...other cases unchanged...
        case 'video':
          return (
            <div className="flex flex-col gap-2 p-3 bg-blue-50 rounded-lg">
              <Video className="w-5 h-5 text-blue-600" />
              <Input
                value={videoBlock.title}
                onChange={e => setVideoBlock({ ...videoBlock, title: e.target.value })}
                placeholder="Titre de la vidéo"
              />
              <Input
                value={videoBlock.url}
                onChange={e => setVideoBlock({ ...videoBlock, url: e.target.value })}
                placeholder="URL de la vidéo"
              />
              <Textarea
                value={videoBlock.description}
                onChange={e => setVideoBlock({ ...videoBlock, description: e.target.value })}
                placeholder="Description de la vidéo"
                rows={2}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingBlockId(null)}>Annuler</Button>
                <Button variant="default" onClick={() => {
                  setContentBlocks(blocks => blocks.map(b => b.id === block.id ? { ...b, content: videoBlock } : b));
                  setEditingBlockId(null);
                }}>Enregistrer</Button>
                <Button variant="outline" onClick={() => deleteBlock(block.id)}>Supprimer</Button>
              </div>
            </div>
          );
        case 'image':
          return (
            <div className="flex flex-col gap-2 p-3 bg-purple-50 rounded-lg">
              <Image className="w-5 h-5 text-purple-600" />
              <Input
                value={imageBlock.caption}
                onChange={e => setImageBlock({ ...imageBlock, caption: e.target.value })}
                placeholder="Légende de l'image"
              />
              <Input
                value={imageBlock.url}
                onChange={e => setImageBlock({ ...imageBlock, url: e.target.value })}
                placeholder="URL de l'image"
              />
              <Input
                value={imageBlock.alt}
                onChange={e => setImageBlock({ ...imageBlock, alt: e.target.value })}
                placeholder="Texte alternatif"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingBlockId(null)}>Annuler</Button>
                <Button variant="default" onClick={() => {
                  setContentBlocks(blocks => blocks.map(b => b.id === block.id ? { ...b, content: imageBlock } : b));
                  setEditingBlockId(null);
                }}>Enregistrer</Button>
                <Button variant="outline" onClick={() => deleteBlock(block.id)}>Supprimer</Button>
              </div>
            </div>
          );
        case 'file':
          return (
            <div className="flex flex-col gap-2 p-3 bg-orange-50 rounded-lg">
              <File className="w-5 h-5 text-orange-600" />
              <Input
                value={fileBlock.title}
                onChange={e => setFileBlock({ ...fileBlock, title: e.target.value })}
                placeholder="Titre du fichier"
              />
              <Input
                value={fileBlock.url}
                onChange={e => setFileBlock({ ...fileBlock, url: e.target.value })}
                placeholder="URL du fichier"
              />
              <Select value={fileBlock.type} onValueChange={value => setFileBlock({ ...fileBlock, type: value as 'pdf' | 'doc' | 'other' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="doc">Document</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingBlockId(null)}>Annuler</Button>
                <Button variant="default" onClick={() => {
                  setContentBlocks(blocks => blocks.map(b => b.id === block.id ? { ...b, content: fileBlock } : b));
                  setEditingBlockId(null);
                }}>Enregistrer</Button>
                <Button variant="outline" onClick={() => deleteBlock(block.id)}>Supprimer</Button>
              </div>
            </div>
          );
        case 'quiz':
          return (
            <div className="flex flex-col gap-2 p-3 bg-red-50 rounded-lg">
              <Brain className="w-5 h-5 text-red-600" />
              <div>Questions: {quizBlock.questions.length}</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingBlockId(null)}>Annuler</Button>
                <Button variant="default" onClick={() => {
                  setContentBlocks(blocks => blocks.map(b => b.id === block.id ? { ...b, content: quizBlock } : b));
                  setEditingBlockId(null);
                }}>Enregistrer</Button>
                <Button variant="outline" onClick={() => deleteBlock(block.id)}>Supprimer</Button>
              </div>
            </div>
          );
        case 'exercice':
          return (
            <div className="flex flex-col gap-2 p-3 bg-yellow-50 rounded-lg">
              <FileText className="w-5 h-5 text-yellow-600" />
              <Textarea
                value={exerciceBlock.question}
                onChange={e => setExerciceBlock({ ...exerciceBlock, question: e.target.value })}
                placeholder="Énoncé de la question"
                rows={2}
              />
              <Textarea
                value={exerciceBlock.solution}
                onChange={e => setExerciceBlock({ ...exerciceBlock, solution: e.target.value })}
                placeholder="Solution"
                rows={2}
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingBlockId(null)}>Annuler</Button>
                <Button variant="default" onClick={() => {
                  setContentBlocks(blocks => blocks.map(b => b.id === block.id ? { ...b, content: exerciceBlock } : b));
                  setEditingBlockId(null);
                }}>Enregistrer</Button>
                <Button variant="outline" onClick={() => deleteBlock(block.id)}>Supprimer</Button>
              </div>
            </div>
          );
        case 'desmos':
          return (
            <div className="flex flex-col gap-2 p-3 bg-cyan-50 rounded-lg">
              <Brain className="w-5 h-5 text-cyan-600" />
              <Input
                value={desmosBlock.expression}
                onChange={e => setDesmosBlock({ ...desmosBlock, expression: e.target.value })}
                placeholder="Expression Desmos"
              />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditingBlockId(null)}>Annuler</Button>
                <Button variant="default" onClick={() => {
                  setContentBlocks(blocks => blocks.map(b => b.id === block.id ? { ...b, content: desmosBlock } : b));
                  setEditingBlockId(null);
                }}>Enregistrer</Button>
                <Button variant="outline" onClick={() => deleteBlock(block.id)}>Supprimer</Button>
              </div>
            </div>
          );
        default:
          return <div>Type de bloc inconnu</div>;
      }
    }
    switch (block.type) {
      case 'video':
        return (
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
            <Video className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <div className="font-medium">{content.title || 'Vidéo'}</div>
              <div className="text-sm text-gray-600">{content.url || 'Aucune URL'}</div>
            </div>
          </div>
        );
      case 'video_manim':
        return (
          <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
            <Video className="w-5 h-5 text-indigo-600" />
            <div className="flex-1">
              <div className="font-medium">{content.title || 'Vidéo Manim'}</div>
              <div className="text-sm text-gray-600">{content.type || 'Type non spécifié'}</div>
            </div>
          </div>
        );
      case 'text':
        return (
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <FileText className="w-5 h-5 text-green-600 mt-1" />
            <div className="flex-1">
              <div className="font-medium">Texte</div>
              <div className="text-sm text-gray-600 line-clamp-2 prose prose-sm">
                {renderWithLatex(content.content || '')}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => editBlock(block)}><Edit size={14} /></Button>
              <Button variant="ghost" size="sm" onClick={() => deleteBlock(block.id)}><Trash2 size={14} /></Button>
            </div>
          </div>
        );
      case 'image':
        return (
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
            <Image className="w-5 h-5 text-purple-600" />
            <div className="flex-1">
              <div className="font-medium">{content.caption || 'Image'}</div>
              <div className="text-sm text-gray-600">{content.url || 'Aucune URL'}</div>
            </div>
          </div>
        );
      case 'file':
        return (
          <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
            <File className="w-5 h-5 text-orange-600" />
            <div className="flex-1">
              <div className="font-medium">{content.title || 'Fichier'}</div>
              <div className="text-sm text-gray-600">{content.type?.toUpperCase() || 'FICHIER'}</div>
            </div>
          </div>
        );
      case 'quiz':
        return (
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <Brain className="w-5 h-5 text-red-600" />
            <div className="flex-1">
              <div className="font-medium">Quiz</div>
              <div className="text-sm text-gray-600">
                {content.questions?.length || 0} questions
              </div>
            </div>
          </div>
        );
      case 'exercice':
        return (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
            <FileText className="w-5 h-5 text-yellow-600" />
            <div className="flex-1">
              <div className="font-medium">{content.question || 'Exercice'}</div>
              <div className="text-sm text-gray-600">{content.type || 'Type non spécifié'}</div>
            </div>
          </div>
        );
      case 'desmos':
        return (
          <div className="flex items-center gap-3 p-3 bg-cyan-50 rounded-lg">
            <span className="font-medium">Grapheur Desmos</span>
            <div className="flex-1">
              <DesmosGraph expression={content.expression} />
            </div>
          </div>
        );
      default:
        return <div>Type de bloc inconnu</div>;
    }
  };

  useEffect(() => {
    if (contentBlocks.length === 0) {
      const newBlock: ContentBlock = {
        id: Date.now().toString(),
        type: 'text',
        content: { content: '', latexEnabled: false },
        order: 0
      };
      setContentBlocks([newBlock]);
      setEditingBlockId(newBlock.id);
    }
    // Only run on mount
    // eslint-disable-next-line
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/module/${moduleId}`)}>
            <ArrowLeft className="mr-2" size={16} />
            Retour
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {lessonId === 'new' ? 'Créer une leçon' : 'Créer leçon'}
            </h1>
            <p className="text-gray-600">Concevez votre leçon avec des blocs modulaires</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setLesson({...lesson, visibilite: 'brouillon'})}>
            <EyeOff className="mr-2" size={16} />
            Brouillon
          </Button>
          <Button onClick={saveLesson} disabled={saving}>
            <Save className="mr-2" size={16} />
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Informations générales */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="titre">Titre de la leçon</Label>
                <Input
                  id="titre"
                  value={lesson.titre}
                  onChange={(e) => setLesson({...lesson, titre: e.target.value})}
                  placeholder="Ex: Élimination de Gauss-Jordan"
                />
              </div>
              <div>
                <Label htmlFor="visibilite">Visibilité</Label>
                <Select value={lesson.visibilite} onValueChange={(value) => setLesson({...lesson, visibilite: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="publie">Publié</SelectItem>
                    <SelectItem value="planifie">Planifié</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contenu principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Contenu de la leçon
                </div>
                <div className="flex gap-2">
                  <Button onClick={addBlock} size="sm">
                    <Plus className="mr-2" size={16} />
                    Ajouter un bloc
                  </Button>
                  <Button onClick={() => setShowManimDialog(true)} size="sm" variant="secondary">
                    <Video className="mr-2" size={16} />
                    Ajouter vidéo Manim
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Organisez votre contenu avec des blocs modulaires
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contentBlocks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun contenu ajouté</p>
                  <p className="text-sm">Cliquez sur "Ajouter un bloc" pour commencer</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contentBlocks.map((block, index) => (
                    <div key={block.id} className="border rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline">Bloc {index + 1}</Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editBlock(block)}
                          >
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteBlock(block.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {renderBlock(block)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog pour la sélection du type de bloc */}
      <Dialog open={showTypeDialog} onOpenChange={setShowTypeDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Choisir le type de bloc</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 mb-2">
            {[
              { type: 'video', icon: Video, label: 'Vidéo', desc: 'MP4, YouTube, Vimeo' },
              { type: 'video_manim', icon: Video, label: 'Vidéo Manim', desc: 'Animations mathématiques' },
              { type: 'text', icon: FileText, label: 'Texte', desc: 'Texte simple' }, // Updated description
              { type: 'image', icon: Image, label: 'Image', desc: 'Schémas, diagrammes' },
              { type: 'file', icon: File, label: 'Fichier', desc: 'PDF, documents' },
              { type: 'quiz', icon: Brain, label: 'Quiz', desc: 'Questions interactives' },
              { type: 'exercice', icon: FileText, label: 'Exercice', desc: 'Problèmes pratiques' },
              { type: 'desmos', icon: Brain, label: 'Desmos', desc: 'Grapheur interactif' }
            ].map(({ type, icon: Icon, label, desc }) => (
              <div
                key={type}
                className={`p-4 border rounded-lg cursor-pointer transition hover:border-blue-500 hover:bg-blue-50`}
                onClick={() => handleTypeSelect(type as ContentBlock['type'])}
              >
                <Icon className="w-6 h-6 mb-2 text-gray-600" />
                <div className="font-medium">{label}</div>
                <div className="text-sm text-gray-500">{desc}</div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypeDialog(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog pour la sélection de vidéo Manim */}
      <Dialog open={showManimDialog} onOpenChange={setShowManimDialog}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Choisir une animation Manim</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-4">
            {manimVideos.length > 0 ? (
              <div className="space-y-4">
                {manimVideos.map((category) => (
                  <div key={category.category}>
                    <h3 className="font-semibold text-lg mb-2 capitalize">{category.category.replace('manim_', '')}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.videos.map((video) => (
                        <Button
                          key={video.url}
                          variant="outline"
                          className="w-full h-auto text-left flex flex-col items-start p-2"
                          onClick={() => {
                            const newBlock: ContentBlock = {
                              id: `block-${Date.now()}`,
                              type: 'video',
                              content: {
                                type: 'upload',
                                url: `http://localhost:8000${video.url}`,
                                title: video.name,
                                description: `Animation: ${category.category}`,
                              },
                              order: contentBlocks.length,
                            };
                            setContentBlocks([...contentBlocks, newBlock]);
                            setShowManimDialog(false);
                          }}
                        >
                          <span className="font-medium text-sm break-all">{video.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500">Aucune vidéo Manim trouvée.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManimDialog(false)}>Annuler</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LessonEditor;