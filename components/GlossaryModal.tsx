import React, { useState } from 'react';
import { X, BookOpen, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlossaryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const terms = t.glossary.terms;
  const filteredTerms = Object.entries(terms).filter(([term, def]) => 
    term.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (def as string).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-medical-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-xl font-bold">{t.glossary.title}</h2>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input 
                    type="text" 
                    placeholder={t.glossary.searchPlaceholder}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none text-sm"
                />
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredTerms.length > 0 ? (
                filteredTerms.map(([term, definition], index) => (
                    <div key={index} className="bg-white border border-gray-100 rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <h3 className="text-medical-700 font-bold text-sm mb-1">{term}</h3>
                        <p className="text-gray-600 text-sm leading-relaxed text-justify">
                            {definition as string}
                        </p>
                    </div>
                ))
            ) : (
                <div className="text-center text-gray-400 py-8">
                    No terms found.
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 border-t border-gray-200 text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            {t.wizard.back}
          </button>
        </div>
      </div>
    </div>
  );
};