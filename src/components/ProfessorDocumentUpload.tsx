import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import api from '@/lib/axios';

const ProfessorDocumentUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'exam' | 'tp'>('exam');
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier à télécharger.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('document_type', documentType); // Changed from 'type' to 'document_type'

    try {
      const response = await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      toast({
        title: "Succès",
        description: typeof response.data.message === 'object' 
          ? JSON.stringify(response.data.message) 
          : response.data.message || "Document téléchargé avec succès.",
      });
      setSelectedFile(null);
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: typeof error.response?.data?.detail === 'object' 
          ? JSON.stringify(error.response.data.detail) 
          : error.response?.data?.detail || "Échec du téléchargement du document. Vérifiez le serveur.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-8 p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Télécharger un nouveau document</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="document" className="text-gray-700">Sélectionner un document</Label>
          <Input 
            id="document" 
            type="file" 
            onChange={handleFileChange} 
            className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
        <div>
          <Label className="text-gray-700">Type de document</Label>
          <RadioGroup 
            value={documentType} 
            onValueChange={(value: 'exam' | 'tp') => setDocumentType(value)} 
            className="flex space-x-4 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="exam" id="exam" />
              <Label htmlFor="exam">Examen</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="tp" id="tp" />
              <Label htmlFor="tp">TP</Label>
            </div>
          </RadioGroup>
        </div>
        <Button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
          {uploading ? 'Téléchargement...' : 'Télécharger le document'}
        </Button>
      </form>
    </div>
  );
};

export default ProfessorDocumentUpload;
