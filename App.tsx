import React, { useState } from 'react';
import { ProtocolForm } from './components/ProtocolForm';
import { ProtocolPreview } from './components/ProtocolPreview';
import { WelcomeScreen } from './components/WelcomeScreen';
import { IdeaGenerator } from './components/IdeaGenerator';
import { ProtocolData, AppView } from './types';
import { INITIAL_PROTOCOL_DATA } from './constants';
import { FileText, PenTool, LayoutTemplate, Save, FolderOpen, RotateCcw, Book, Globe, Home, BookOpen } from 'lucide-react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { UserManualModal } from './components/UserManualModal';
import { GlossaryModal } from './components/GlossaryModal';

const MainApp: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [view, setView] = useState<AppView>('welcome');
  const [protocolData, setProtocolData] = useState<ProtocolData>(INITIAL_PROTOCOL_DATA);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  const handleIdeaGenerated = (data: ProtocolData) => {
    setProtocolData(data);
    setView('editor');
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem('protocol_draft', JSON.stringify(protocolData));
      alert(t.app.saveSuccess);
    } catch (e) {
      alert('Error saving draft.');
    }
  };

  const handleLoadDraft = () => {
    try {
      const saved = localStorage.getItem('protocol_draft');
      if (saved) {
        if (window.confirm(t.app.confirmLoad)) {
            const parsed = JSON.parse(saved);
            setProtocolData(parsed);
            if (view === 'welcome') setView('editor');
            alert(t.app.loadSuccess);
        }
      } else {
        alert(t.app.noDraft);
      }
    } catch (e) {
      alert('Error loading draft.');
    }
  };

  const handleResetData = () => {
    if (window.confirm(t.app.confirmReset)) {
      setProtocolData(INITIAL_PROTOCOL_DATA);
    }
  };
  
  const handleGoHome = () => {
     if (window.confirm(t.app.confirmHome)) {
         setView('welcome');
     }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  if (view === 'welcome') {
    return (
      <div className="relative">
        <UserManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
        <GlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />
        <WelcomeScreen 
            onStart={() => setView('wizard')} 
            onOpenManual={() => setIsManualOpen(true)}
            onOpenGlossary={() => setIsGlossaryOpen(true)}
        />
        <div className="absolute top-4 right-4 flex space-x-2">
            <button
                onClick={toggleLanguage}
                className="flex items-center px-4 py-2 text-sm font-medium text-medical-700 bg-white/80 backdrop-blur-sm border border-medical-200 rounded-lg hover:bg-white transition-all shadow-sm"
              >
                <Globe className="w-4 h-4 mr-2" />
                {language === 'es' ? 'EN' : 'ES'}
            </button>
             <button
                onClick={handleLoadDraft}
                className="flex items-center px-4 py-2 text-sm font-medium text-medical-700 bg-white/80 backdrop-blur-sm border border-medical-200 rounded-lg hover:bg-white transition-all shadow-sm"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                {t.app.loadDraft}
              </button>
        </div>
      </div>
    );
  }

  if (view === 'wizard') {
    return (
      <>
        <UserManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
        <GlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />
        <div className="absolute top-4 left-4 z-50">
             <button
                onClick={handleGoHome}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
              >
                <Home className="w-4 h-4 mr-2" />
                {t.wizard.home}
            </button>
        </div>
        <div className="absolute top-4 right-4 z-50">
           <button
                onClick={toggleLanguage}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm"
              >
                <Globe className="w-4 h-4 mr-2" />
                {language === 'es' ? 'EN' : 'ES'}
            </button>
        </div>
        <IdeaGenerator onComplete={handleIdeaGenerated} />
      </>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <UserManualModal isOpen={isManualOpen} onClose={() => setIsManualOpen(false)} />
      <GlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />
      
      {/* App Header */}
      <header className="bg-medical-900 text-white p-4 shadow-md z-10 flex justify-between items-center">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleGoHome} title={t.app.home}>
          <div className="bg-white p-2 rounded-lg text-medical-900 group-hover:bg-medical-50 transition-colors">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t.app.title}</h1>
            <p className="text-xs text-medical-100 opacity-80">{t.app.subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
            <button 
                onClick={toggleLanguage}
                className="flex items-center text-xs bg-medical-800 hover:bg-medical-700 px-3 py-2 rounded-md border border-medical-700 font-bold"
                title="Switch Language"
            >
                {language === 'es' ? 'EN' : 'ES'}
            </button>
             <button 
                onClick={() => setIsGlossaryOpen(true)}
                className="flex items-center text-sm bg-medical-800 hover:bg-medical-700 px-3 py-2 rounded-md transition-colors border border-medical-700"
                title={t.app.glossary}
            >
                <BookOpen className="w-4 h-4 mr-2" />
                {t.app.glossary}
            </button>
            <button 
                onClick={() => setIsManualOpen(true)}
                className="flex items-center text-sm bg-medical-800 hover:bg-medical-700 px-3 py-2 rounded-md transition-colors border border-medical-700"
                title={t.app.manual}
            >
                <Book className="w-4 h-4 mr-2" />
                {t.app.manual}
            </button>

            <div className="h-6 w-px bg-medical-700 mx-1"></div>

           <button 
                onClick={handleLoadDraft}
                className="flex items-center text-sm bg-medical-800 hover:bg-medical-700 px-3 py-2 rounded-md transition-colors border border-medical-700"
                title={t.app.loadDraft}
            >
                <FolderOpen className="w-4 h-4 mr-2" />
                {t.app.loadDraft}
            </button>
            <button 
                onClick={handleSaveDraft}
                className="flex items-center text-sm bg-medical-800 hover:bg-medical-700 px-3 py-2 rounded-md transition-colors border border-medical-700"
                title={t.app.saveDraft}
            >
                <Save className="w-4 h-4 mr-2" />
                {t.app.saveDraft}
            </button>
            <button 
                onClick={handleResetData}
                className="flex items-center text-sm bg-medical-800 hover:bg-medical-700 px-3 py-2 rounded-md transition-colors border border-medical-700"
                title={t.app.reset}
            >
                <RotateCcw className="w-4 h-4 mr-2" />
                {t.app.reset}
            </button>
            <div className="h-6 w-px bg-medical-700 mx-2"></div>
            <button 
                onClick={() => setView('wizard')}
                className="flex items-center text-sm bg-white text-medical-900 hover:bg-medical-50 px-3 py-2 rounded-md transition-colors font-medium"
            >
                <LayoutTemplate className="w-4 h-4 mr-2" />
                {t.app.newDesign}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        <section className="w-1/2 min-w-[500px] border-r border-gray-200 bg-gray-50 flex flex-col p-4">
          <div className="flex items-center space-x-2 mb-4 text-medical-900">
            <PenTool className="w-5 h-5" />
            <h2 className="font-semibold">Editor</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ProtocolForm data={protocolData} onChange={setProtocolData} />
          </div>
        </section>

        <section className="w-1/2 flex flex-col bg-gray-200">
          <div className="bg-gray-700 text-white text-xs py-1 px-4 text-center font-mono flex justify-between items-center">
             <span>{t.preview.docType}</span>
             <span>A4 • PDF Style</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ProtocolPreview data={protocolData} />
          </div>
        </section>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <MainApp />
    </LanguageProvider>
  );
};

export default App;