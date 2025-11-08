import React, { useState, useEffect } from "react";
import { FileText, Download, Trash2 } from "lucide-react"; // Import Trash2 icon
import api from '@/lib/axios'; // Import axios for API calls

// New type for documents
type Document = {
  id: number;
  filename: string;
  file_path: string;
  document_type: 'exam' | 'tp';
  upload_date: string;
  id_enseignant: number | null;
};

interface ModeExamProps {
  isProfessor: boolean; // Prop to indicate if the current user is a professor
}

const ModeExam: React.FC<ModeExamProps> = ({ isProfessor }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<'all' | 'exam' | 'tp'>('all');
  const [loading, setLoading] = useState(false);

  // Fetch documents from backend when document type filter changes
  useEffect(() => {
    const fetchDocuments = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedDocumentType !== 'all') {
          params.append('document_type', selectedDocumentType);
        }
        const response = await api.get(`/documents?${params.toString()}`);
        setDocuments(response.data);
      } catch (error) {
        console.error("Failed to fetch documents:", error);
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDocuments();
  }, [selectedDocumentType]);

  const handleDeleteDocument = async (documentId: number, filename: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le document "${filename}" ?`)) {
      try {
        await api.delete(`/documents/${documentId}`);
        setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
        // Optionally, show a success toast
      } catch (error) {
        console.error("Failed to delete document:", error);
        // Optionally, show an error toast
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Section for Documents */}
      <div className="bg-white rounded-lg shadow-xl p-8 mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Documents de Référence</h2>
        
        <div className="mb-6 flex flex-col sm:flex-row justify-center items-center gap-4">
          <span className="text-lg font-medium text-gray-700">Filtrer par type:</span>
          <div className="flex space-x-3">
            <button 
              onClick={() => setSelectedDocumentType('all')}
              className={`px-6 py-2 rounded-full text-lg font-semibold transition-all duration-300 
                ${selectedDocumentType === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              Tous
            </button>
            <button 
              onClick={() => setSelectedDocumentType('exam')}
              className={`px-6 py-2 rounded-full text-lg font-semibold transition-all duration-300 
                ${selectedDocumentType === 'exam' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              Examens
            </button>
            <button 
              onClick={() => setSelectedDocumentType('tp')}
              className={`px-6 py-2 rounded-full text-lg font-semibold transition-all duration-300 
                ${selectedDocumentType === 'tp' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
            >
              TPs
            </button>
          </div>
        </div>
          
        {loading ? (
          <div className="text-center py-8 flex flex-col items-center">
            <FileText className="w-12 h-12 text-blue-400 animate-pulse mb-4" />
            <p className="text-lg text-gray-600">Chargement des documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <p className="text-lg text-gray-600">Aucun document disponible pour cette catégorie.</p>
            <p className="text-md text-gray-500 mt-2">Téléchargez de nouveaux documents ou changez de filtre.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc) => (
              <div key={doc.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                <div className="flex items-center mb-2 sm:mb-0">
                  <FileText className="w-6 h-6 text-blue-500 mr-3" />
                  <span className="text-lg font-medium text-gray-800 break-words pr-4">{doc.filename}</span>
                  <span className="text-sm text-gray-500 ml-2">({doc.document_type.toUpperCase()})</span>
                </div>
                <div className="flex items-center gap-3">
                   <a 
                     href={doc.file_path} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="inline-flex items-center px-4 py-2 bg-blue-500 text-white font-semibold rounded-full shadow-md hover:bg-blue-600 transition-colors duration-200"
                   >
                     <Download className="w-5 h-5 mr-2" />
                     Télécharger
                   </a>
                   {isProfessor && (
                     <button 
                       onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                       className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors duration-200 shadow-md"
                       title="Supprimer le document"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                   )}
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModeExam;