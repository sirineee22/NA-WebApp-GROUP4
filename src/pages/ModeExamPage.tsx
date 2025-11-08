import ModeExam from "./ModeExam";
import ProfessorDocumentUpload from "../components/ProfessorDocumentUpload";
import { useAuth } from "@/contexts/AuthContext";

export default function ModeExamPage() {
  const { user } = useAuth();
  const isProfessor = user?.role === 'enseignant';

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen py-8 px-4 flex flex-col items-center">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">Mode Examen</h1>
        <p className="text-gray-600 mb-6 text-center">
          Consultez et gérez les documents d'examen et de TP.
        </p>

        {isProfessor && (
          <ProfessorDocumentUpload />
        )}

        <ModeExam isProfessor={isProfessor} />
      </div>
    </div>
  );
}
