import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar.tsx";
import { AppSidebar } from "@/components/AppSidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Modules from "./pages/Modules";
import Module from "./pages/Module";
import MathTools from "./pages/MathTools";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import ModuleWizard from "./pages/ModuleWizard";
import LessonEditor from "./pages/LessonEditor";
import LessonView from "./pages/LessonView";
import AuthPage from "./components/AuthPage";
import ModeExamPage from "./pages/ModeExamPage";
import LinearSystemSolver from "./pages/modules/LinearSystemSolver";
import ProfessorDashboard from "./pages/ProfessorDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SidebarProvider>
            <div className="min-h-screen flex w-full">
              <Routes>
                <Route path="/" element={
                  <div className="w-full">
                    <Index />
                  </div>
                } />
                <Route path="/about" element={
                  <>
                    <AppSidebar />
                    <SidebarInset>
                      <div className="p-4">
                        <SidebarTrigger />
                      </div>
                      <About />
                    </SidebarInset>
                  </>
                } />
                <Route path="/modules" element={
                  <ProtectedRoute>
                    <>
                      <AppSidebar />
                      <SidebarInset>
                        <div className="p-4">
                          <SidebarTrigger />
                        </div>
                        <Modules />
                      </SidebarInset>
                    </>
                  </ProtectedRoute>
                } />
                <Route path="/module/:moduleId" element={
                  <ProtectedRoute>
                    <>
                      <AppSidebar />
                      <SidebarInset>
                        <div className="p-4">
                          <SidebarTrigger />
                        </div>
                        <Module />
                      </SidebarInset>
                    </>
                  </ProtectedRoute>
                } />
                <Route path="/tools/linear-system-solver" element={ 
                  <>
                    <AppSidebar />
                    <SidebarInset>
                      <div className="p-4">
                        <SidebarTrigger />
                      </div>
                      <LinearSystemSolver />
                    </SidebarInset>
                  </>
                } />
                <Route path="/tools" element={
                  <>
                    <AppSidebar />
                    <SidebarInset>
                      <div className="p-4">
                        <SidebarTrigger />
                      </div>
                      <MathTools />
                    </SidebarInset>
                  </>
                } />
                <Route path="/mathtools" element={
                  <>
                    <AppSidebar />
                    <SidebarInset>
                      <div className="p-4">
                        <SidebarTrigger />
                      </div>
                      <MathTools />
                    </SidebarInset>
                  </>
                } />
                <Route path="/mode-exam" element={
                  <ProtectedRoute>
                    <AppSidebar />
                    <SidebarInset>
                      <ModeExamPage />
                    </SidebarInset>
                  </ProtectedRoute>
                } />
                <Route path="/professor-dashboard" element={
                  <ProtectedRoute requiredRole="professeur">
                    <AppSidebar />
                    <SidebarInset>
                      <ProfessorDashboard />
                    </SidebarInset>
                  </ProtectedRoute>
                } />
                <Route path="/module-wizard" element={
                  <ProtectedRoute requiredRole="professeur">
                    <>
                      <AppSidebar />
                      <SidebarInset>
                        <div className="p-4">
                          <SidebarTrigger />
                        </div>
                        <ModuleWizard />
                      </SidebarInset>
                    </>
                  </ProtectedRoute>
                } />
                {/* Only one route for lesson add/edit, using lessonId = 'new' for add */}
                <Route path="/lesson/:lessonId/:moduleId" element={
                  <ProtectedRoute requiredRole="professeur">
                    <>
                      <AppSidebar />
                      <SidebarInset>
                        <div className="p-4">
                          <SidebarTrigger />
                        </div>
                        <LessonEditor />
                      </SidebarInset>
                    </>
                  </ProtectedRoute>
                } />
                <Route path="/lesson-view/:lessonId/:moduleId" element={
                  <ProtectedRoute>
                    <>
                      <AppSidebar />
                      <SidebarInset>
                        <div className="p-4">
                          <SidebarTrigger />
                        </div>
                        <LessonView />
                      </SidebarInset>
                    </>
                  </ProtectedRoute>
                } />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </SidebarProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
