import { AuthProvider, useAuth } from './lib/auth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BugsPage from './pages/BugsPage';
import BugCreatePage from './pages/BugCreatePage';
import BugDetailPage from './pages/BugDetailPage';
import ProjectsPage from './pages/ProjectsPage';
import Layout from './components/Layout';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedBugId, setSelectedBugId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const handleNavigate = (page: string, id?: string) => {
    if (page === 'bug-detail' && id) {
      setSelectedBugId(id);
      setCurrentPage('bug-detail');
    } else {
      setSelectedBugId(null);
      setCurrentPage(page);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'bugs':
        return <BugsPage onNavigate={handleNavigate} />;
      case 'bug-create':
        return <BugCreatePage onNavigate={handleNavigate} />;
      case 'bug-detail':
        return <BugDetailPage bugId={selectedBugId || ''} onNavigate={handleNavigate}/>;
      case 'projects':
        return <ProjectsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

