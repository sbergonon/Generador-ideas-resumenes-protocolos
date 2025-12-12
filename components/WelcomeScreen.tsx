import React from 'react';
import { FileText, ArrowRight, AlertCircle, Book } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onStart: () => void;
  onOpenManual: () => void;
}

export const WelcomeScreen: React.FC<Props> = ({ onStart, onOpenManual }) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-50 to-white flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white shadow-2xl rounded-2xl overflow-hidden">
        <div className="bg-medical-900 p-8 text-center text-white">
          <div className="mx-auto bg-white/10 w-16 h-16 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
            <FileText className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-2">
            {t.welcome.title}
          </h1>
          <p className="text-medical-100 text-lg">
            {t.welcome.subtitle}
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="prose prose-blue text-gray-600">
            <p className="text-lg">
              {t.welcome.intro}
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-4">
              <li>{t.welcome.point1}</li>
              <li>{t.welcome.point2}</li>
              <li>{t.welcome.point3}</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  {t.welcome.disclaimer}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col items-center space-y-4">
            <button
              onClick={onStart}
              className="w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-medical-600 hover:bg-medical-700 md:text-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {t.welcome.startBtn}
              <ArrowRight className="ml-2 w-6 h-6" />
            </button>
            
            <button
              onClick={onOpenManual}
              className="text-sm text-medical-600 hover:text-medical-800 flex items-center justify-center font-medium transition-colors py-2"
            >
               <Book className="w-4 h-4 mr-2" />
               {t.welcome.manualBtn}
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 px-8 py-4 border-t border-gray-100 text-center text-xs text-gray-400">
          {t.welcome.version}
        </div>
      </div>
    </div>
  );
};