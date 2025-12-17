import React, { useState, useRef } from 'react';
import { ProtocolForm } from './components/ProtocolForm';
import { ProtocolPreview } from './components/ProtocolPreview';
import { WelcomeScreen } from './components/WelcomeScreen';
import { IdeaGenerator } from './components/IdeaGenerator';
import { ProtocolData, AppView } from './types';
import { INITIAL_PROTOCOL_DATA } from './constants';
import { FileText, PenTool, LayoutTemplate, Save, FolderOpen, RotateCcw, Book, Globe, Home, BookOpen, Download, Upload } from 'lucide-react';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { UserManualModal } from './components/UserManualModal';
import { GlossaryModal } from './components/GlossaryModal';

const MainApp: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const [view, setView] = useState<AppView>('welcome');
  const [protocolData, setProtocolData] = useState<ProtocolData>(INITIAL_PROTOCOL_DATA);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIdeaGenerated = (data: ProtocolData) => {
    setProtocolData(data);
    setView('editor');
  };

  // --- Browser Storage (Quick Draft) ---
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
            mergeAndSetData(parsed);
            alert(t.app.loadSuccess);
        }
      } else {
        alert(t.app.noDraft);
      }
    } catch (e) {
      console.error(e);
      alert('Error loading draft.');
    }
  };

  // --- File System Storage (JSON Export/Import) ---
  const handleExportJSON = () => {
      const fileName = `Study_${protocolData.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30) || 'Untitled'}_${new Date().toISOString().split('T')[0]}.json`;
      const jsonStr = JSON.stringify(protocolData, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const content = e.target?.result as string;
              const parsed = JSON.parse(content);
              if (window.confirm(language === 'es' ? `¿Cargar archivo "${file.name}"? Perderás los cambios no guardados.` : `Load file "${file.name}"? Unsaved changes will be lost.`)) {
                  mergeAndSetData(parsed);
              }
          } catch (err) {
              alert("Error parsing JSON file.");
          }
      };
      reader.readAsText(file);
      // Reset input so same file can be selected again
      event.target.value = ''; 
  };

  // Helper to safely merge data
  const mergeAndSetData = (parsed: any) => {
        const mergedData: ProtocolData = {
            ...INITIAL_PROTOCOL_DATA, // Start with full new structure
            ...parsed, // Override with saved data
            // Deep merge nested objects
            statsParams: { 
                ...INITIAL_PROTOCOL_DATA.statsParams, 
                ...(parsed.statsParams || {}) 
            },
            schedule: { 
                ...INITIAL_PROTOCOL_DATA.schedule, 
                ...(parsed.schedule || {}) 
            },
            // Ensure arrays are arrays
            secondaryObjectives: parsed.secondaryObjectives || INITIAL_PROTOCOL_DATA.secondaryObjectives,
            inclusionCriteria: parsed.inclusionCriteria || INITIAL_PROTOCOL_DATA.inclusionCriteria,
            exclusionCriteria: parsed.exclusionCriteria || INITIAL_PROTOCOL_DATA.exclusionCriteria,
            evaluationsSecondary: parsed.evaluationsSecondary || INITIAL_PROTOCOL_DATA.evaluationsSecondary,
            variableDefinitions: parsed.variableDefinitions || INITIAL_PROTOCOL_DATA.variableDefinitions,
            otherVariables: parsed.otherVariables || INITIAL_PROTOCOL_DATA.otherVariables,
            statisticalAnalysis: parsed.statisticalAnalysis || INITIAL_PROTOCOL_DATA.statisticalAnalysis,
        };
        setProtocolData(mergedData);
        if (view === 'welcome') setView('editor');
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
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        
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
                onClick={handleImportClick}
                className="flex items-center px-4 py-2 text-sm font-medium text-medical-700 bg-white/80 backdrop-blur-sm border border-medical-200 rounded-lg hover:bg-white transition-all shadow-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Abrir Estudio' : 'Open Study'}
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
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
      
      {/* App Header */}
      <header className="bg-medical-900 text-white p-4 shadow-md z-10 flex justify-between items-center">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={handleGoHome} title={t.app.home}>
          <div className="bg-white p-2 rounded-lg text-medical-900 group-hover:bg-medical-50 transition-colors">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight hidden md:block">{t.app.title}</h1>
            <p className="text-xs text-medical-100 opacity-80 hidden md:block">{t.app.subtitle}</p>
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
            <div className="h-6 w-px bg-medical-700 mx-1 hidden md:block"></div>

            {/* Browser Storage */}
            <button 
                onClick={handleSaveDraft}
                className="flex items-center text-sm bg-medical-800 hover:bg-medical-700 px-3 py-2 rounded-md transition-colors border border-medical-700"
                title={t.app.saveDraft}
            >
                <Save className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">{t.app.saveDraft}</span>
            </button>

            {/* File System Storage */}
            <button 
                onClick={handleExportJSON}
                className="flex items-center text-sm bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded-md transition-colors border border-blue-600 shadow-sm"
                title={language === 'es' ? "Guardar Archivo Local" : "Save Local File"}
            >
                <Download className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">{language === 'es' ? "Exportar" : "Export"}</span>
            </button>
             <button 
                onClick={handleImportClick}
                className="flex items-center text-sm bg-blue-700 hover:bg-blue-600 px-3 py-2 rounded-md transition-colors border border-blue-600 shadow-sm"
                title={language === 'es' ? "Cargar Archivo Local" : "Load Local File"}
            >
                <Upload className="w-4 h-4 mr-2" />
                <span className="hidden lg:inline">{language === 'es' ? "Importar" : "Import"}</span>
            </button>

            <div className="h-6 w-px bg-medical-700 mx-2 hidden md:block"></div>
            <button 
                onClick={() => setView('wizard')}
                className="flex items-center text-sm bg-white text-medical-900 hover:bg-medical-50 px-3 py-2 rounded-md transition-colors font-medium"
            >
                <LayoutTemplate className="w-4 h-4 mr-2" />
                <span className="hidden md:inline">{t.app.newDesign}</span>
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