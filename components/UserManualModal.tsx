import React from 'react';
import { X, Book, Wand2, Save, Globe } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManualModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-medical-900 text-white p-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center space-x-2">
            <Book className="w-5 h-5" />
            <h2 className="text-xl font-bold">{t.manual.title}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-gray-800">
          <p className="text-lg text-gray-600">{t.manual.intro}</p>

          <section className="space-y-2">
            <h3 className="font-bold text-medical-700 text-lg border-b border-medical-100 pb-1">{t.manual.section1}</h3>
            <p className="text-sm leading-relaxed">{t.manual.text1}</p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-medical-700 text-lg border-b border-medical-100 pb-1">{t.manual.section2}</h3>
            <p className="text-sm leading-relaxed">{t.manual.text2}</p>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-medical-700 text-lg border-b border-medical-100 pb-1 flex items-center">
              {t.manual.section3} <Wand2 className="w-4 h-4 ml-2 text-purple-500" />
            </h3>
            <p className="text-sm leading-relaxed">{t.manual.text3}</p>
          </section>

           <section className="space-y-2">
            <h3 className="font-bold text-medical-700 text-lg border-b border-medical-100 pb-1 flex items-center">
              {t.manual.section4} <Save className="w-4 h-4 ml-2 text-blue-500" />
            </h3>
            <p className="text-sm leading-relaxed">{t.manual.text4}</p>
          </section>

           <section className="space-y-2">
            <h3 className="font-bold text-medical-700 text-lg border-b border-medical-100 pb-1 flex items-center">
              {t.manual.section5} <Globe className="w-4 h-4 ml-2 text-green-500" />
            </h3>
            <p className="text-sm leading-relaxed">{t.manual.text5}</p>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-medical-600 text-white rounded-md hover:bg-medical-700 transition-colors text-sm font-medium"
          >
            {t.wizard.back}
          </button>
        </div>
      </div>
    </div>
  );
};