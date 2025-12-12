import React, { useState } from 'react';
import { ProtocolData, SectionTab } from '../types';
import { Plus, Trash2, Wand2, Loader2, ChevronRight, ChevronLeft, Sparkles, AlertCircle, Bot, Calculator, BarChart3, Microscope, Search } from 'lucide-react';
import { refineText, generateList, generateText, generateContextWithSearch } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  data: ProtocolData;
  onChange: (data: ProtocolData) => void;
}

export const ProtocolForm: React.FC<Props> = ({ data, onChange }) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<SectionTab>(SectionTab.GENERAL);
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: keyof ProtocolData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const hasError = (field: keyof ProtocolData) => {
    const value = data[field];
    const isEssential = ['title', 'sponsor', 'primaryObjective', 'studyDesign'].includes(field);
    if (isEssential) {
        return touched[field] && (!value || (typeof value === 'string' && !value.trim()));
    }
    return false;
  };

  const getInputClass = (field: keyof ProtocolData) => {
    const baseClass = "mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 transition-colors";
    if (hasError(field)) {
        return `${baseClass} border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50`;
    }
    return `${baseClass} border-gray-300 focus:border-medical-500 focus:ring-medical-500`;
  };

  const ErrorMessage = ({ field }: { field: keyof ProtocolData }) => {
      if (!hasError(field)) return null;
      return (
          <div className="flex items-center mt-1 text-red-600 text-xs animate-fadeIn">
              <AlertCircle className="w-3 h-3 mr-1" />
              <span>{t.form.required}</span>
          </div>
      );
  };

  const handleDeepChange = (parent: keyof ProtocolData, child: string, value: string) => {
    // @ts-ignore
    const parentObj = data[parent] || {};
    const newParent = { ...parentObj, [child]: value };
    onChange({ ...data, [parent]: newParent });
  };

  const handleArrayChange = (field: keyof ProtocolData, index: number, value: string) => {
    // @ts-ignore
    const newArray = [...data[field]];
    newArray[index] = value;
    onChange({ ...data, [field]: newArray });
  };

  const addArrayItem = (field: keyof ProtocolData) => {
    // @ts-ignore
    const newArray = [...data[field], ''];
    onChange({ ...data, [field]: newArray });
  };

  const removeArrayItem = (field: keyof ProtocolData, index: number) => {
    // @ts-ignore
    const newArray = data[field].filter((_, i) => i !== index);
    onChange({ ...data, [field]: newArray });
  };

  const handleAIRefine = async (fieldPath: string, text: string, context: string) => {
    setLoadingField(fieldPath);
    const refined = await refineText(text, context, language);
    
    if (fieldPath.includes('.')) {
        const [parent, child] = fieldPath.split('.');
        handleDeepChange(parent as keyof ProtocolData, child, refined);
    } else if (fieldPath.includes('[')) {
        const match = fieldPath.match(/(\w+)\[(\d+)\]/);
        if (match) {
            const field = match[1] as keyof ProtocolData;
            const index = parseInt(match[2]);
            handleArrayChange(field, index, refined);
        }
    } else {
        handleChange(fieldPath as keyof ProtocolData, refined);
    }
    setLoadingField(null);
  };

  const handleAIGenerateText = async (field: keyof ProtocolData, context: string, instruction: string) => {
    setLoadingField(field);
    const result = await generateText(context, instruction, language);
    if (result) {
        handleChange(field, result);
    }
    setLoadingField(null);
  };
  
  const handleContextSearch = async () => {
    setLoadingField('contextSummary');
    const result = await generateContextWithSearch(data.title, data.primaryObjective, language);
    if (result) {
        handleChange('contextSummary', result);
    }
    setLoadingField(null);
  };

  const handleAIGenerateList = async (field: 'inclusionCriteria' | 'exclusionCriteria' | 'statisticalAnalysis') => {
    setLoadingField(field);
    
    let typeLabel = '';
    let context = '';

    if (field === 'statisticalAnalysis') {
        typeLabel = 'technical statistical analysis steps';
        context = `
          Title: ${data.title}
          Design: ${data.studyType}
          Primary Objective: ${data.primaryObjective}
          Hypothesis: ${data.analysisHypothesis}
          Primary Variable: ${data.primaryVariableType}
          Confounders: ${data.confounders}
        `;
    } else {
        typeLabel = field === 'inclusionCriteria' ? 'technical inclusion criteria' : 'technical exclusion criteria';
        context = `
          Title: ${data.title}
          Study Type: ${data.studyType}
          Population: ${data.populationDescription || data.selectionMethod}
          Primary Objective: ${data.primaryObjective}
        `;
    }

    const suggestions = await generateList(typeLabel, context, language);
    
    if (suggestions && suggestions.length > 0) {
        const currentList = (data[field] as string[]).filter(s => s.trim() !== '');
        const newList = [...currentList, ...suggestions];
        handleChange(field, newList.length > 0 ? newList : ['']);
    }
    setLoadingField(null);
  };

  const handleAISuggestStudyType = async () => {
    setLoadingField('studyType');
    const context = `
      Title: ${data.title}
      Design Description: ${data.studyDesign}
      Primary Objective: ${data.primaryObjective}
    `;
    const instruction = "Classify the study methodology into exactly one of these categories: 'Ensayo Clínico Aleatorizado', 'Estudio de Cohortes', 'Estudio de Casos y Controles', 'Estudio Transversal', 'Estudio Descriptivo'. Return only the category name.";
    
    const result = await generateText(context, instruction, language);
    // Sanitize result to match options approximately
    if (result) {
        let bestMatch = result;
        if (result.toLowerCase().includes('ensayo') || result.toLowerCase().includes('rct')) bestMatch = 'Ensayo Clínico Aleatorizado';
        else if (result.toLowerCase().includes('cohort')) bestMatch = 'Estudio de Cohortes';
        else if (result.toLowerCase().includes('casos')) bestMatch = 'Estudio de Casos y Controles';
        else if (result.toLowerCase().includes('transversal')) bestMatch = 'Estudio Transversal';
        else if (result.toLowerCase().includes('descriptivo')) bestMatch = 'Estudio Descriptivo';
        
        handleChange('studyType', bestMatch);
    }
    setLoadingField(null);
  };

  const tabs = Object.values(SectionTab);

  const renderAIButton = (fieldKey: string, currentValue: string, context: string) => (
    <button
      onClick={() => handleAIRefine(fieldKey, currentValue, context)}
      disabled={!currentValue || loadingField === fieldKey}
      className="absolute right-2 top-2 p-1.5 text-medical-600 hover:bg-medical-50 rounded-md transition-colors disabled:opacity-50"
      title={t.form.aiRefine}
    >
      {loadingField === fieldKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
    </button>
  );

  const renderSection = () => {
    switch (activeTab) {
      case SectionTab.GENERAL:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.General}</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.form.labels.title} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={data.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  onBlur={() => handleBlur('title')}
                  className={getInputClass('title')}
                  placeholder={t.form.placeholders.title}
                />
                <ErrorMessage field="title" />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.context}</label>
                <textarea
                  rows={6}
                  value={data.contextSummary}
                  onChange={(e) => handleChange('contextSummary', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                  placeholder={t.form.placeholders.context}
                />
                <button
                    onClick={handleContextSearch}
                    disabled={loadingField === 'contextSummary'}
                    className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-medical-200"
                 >
                   {loadingField === 'contextSummary' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />}
                   {t.form.aiContext}
                 </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">{t.form.labels.sponsor} <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={data.sponsor}
                  onChange={(e) => handleChange('sponsor', e.target.value)}
                  onBlur={() => handleBlur('sponsor')}
                  className={getInputClass('sponsor')}
                />
                <ErrorMessage field="sponsor" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t.form.labels.tradeName}</label>
                    <input
                    type="text"
                    value={data.tradeName}
                    onChange={(e) => handleChange('tradeName', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">{t.form.labels.activeIngredient}</label>
                    <input
                    type="text"
                    value={data.activeIngredient}
                    onChange={(e) => handleChange('activeIngredient', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                    />
                </div>
              </div>
               <div>
                  <label className="block text-sm font-medium text-gray-700">{t.form.labels.phase}</label>
                  <select
                    value={data.phase}
                    onChange={(e) => handleChange('phase', e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                  >
                      <option>N/A</option>
                      <option>Phase I</option>
                      <option>Phase II</option>
                      <option>Phase III</option>
                      <option>Phase IV</option>
                  </select>
                </div>
            </div>
          </div>
        );

      case SectionTab.RATIONALE:
        return (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Rationale}</h3>
            
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.ratPrimary}</label>
              <textarea
                rows={5}
                value={data.rationalePrimary}
                onChange={(e) => handleChange('rationalePrimary', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
              />
              {renderAIButton('rationalePrimary', data.rationalePrimary, 'Scientific rationale for primary objective')}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.ratSecondary}</label>
              <textarea
                rows={4}
                value={data.rationaleSecondary}
                onChange={(e) => handleChange('rationaleSecondary', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
              />
               {renderAIButton('rationaleSecondary', data.rationaleSecondary, 'Scientific rationale for secondary objectives')}
            </div>
          </div>
        );

      case SectionTab.OBJECTIVES:
        return (
          <div className="space-y-6 animate-fadeIn">
             <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Objectives}</h3>
             
             <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.objPrimary} <span className="text-red-500">*</span></label>
                <textarea
                    rows={3}
                    value={data.primaryObjective}
                    onChange={(e) => handleChange('primaryObjective', e.target.value)}
                    onBlur={() => handleBlur('primaryObjective')}
                    className={getInputClass('primaryObjective')}
                    placeholder={t.form.placeholders.obj}
                />
                <ErrorMessage field="primaryObjective" />
                {renderAIButton('primaryObjective', data.primaryObjective, 'Formal primary objective definition')}
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{t.form.labels.objSecondary}</label>
                {data.secondaryObjectives.map((obj, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                        <span className="pt-2 text-gray-500 font-mono">{idx + 1}.</span>
                        <input
                            type="text"
                            value={obj}
                            onChange={(e) => handleArrayChange('secondaryObjectives', idx, e.target.value)}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                        />
                        <button onClick={() => removeArrayItem('secondaryObjectives', idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button onClick={() => addArrayItem('secondaryObjectives')} className="flex items-center text-sm text-medical-600 hover:text-medical-800 font-medium">
                    <Plus className="w-4 h-4 mr-1" />
                </button>
             </div>
          </div>
        );

      case SectionTab.POPULATION:
        return (
            <div className="space-y-8 animate-fadeIn">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{t.form.tabs.Population}</h3>
                </div>
                
                <div className="relative">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t.form.labels.popDesc}</label>
                    <textarea
                        rows={3}
                        value={data.populationDescription}
                        onChange={(e) => handleChange('populationDescription', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                        placeholder={t.form.placeholders.pop}
                    />
                    {renderAIButton('populationDescription', data.populationDescription, 'Population description')}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">{t.form.labels.selMethod}</label>
                    <div className="relative">
                        <textarea
                            rows={3}
                            value={data.selectionMethod}
                            onChange={(e) => handleChange('selectionMethod', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                            placeholder={t.form.placeholders.method}
                        />
                        {renderAIButton('selectionMethod', data.selectionMethod, 'Subject selection method')}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-gray-700">{t.form.labels.incCrit}</label>
                        <button
                          onClick={() => handleAIGenerateList('inclusionCriteria')}
                          disabled={loadingField === 'inclusionCriteria'}
                          className="flex items-center px-3 py-1.5 text-xs font-medium text-medical-700 bg-medical-50 hover:bg-medical-100 border border-medical-200 rounded-full transition-colors"
                        >
                          {loadingField === 'inclusionCriteria' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                          {t.form.aiSuggest}
                        </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                      {data.inclusionCriteria.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                              <span className="pt-2 text-gray-400 font-mono text-xs select-none">{idx + 1}.</span>
                              <input
                                  type="text"
                                  value={item}
                                  onChange={(e) => handleArrayChange('inclusionCriteria', idx, e.target.value)}
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                              />
                              <button onClick={() => removeArrayItem('inclusionCriteria', idx)} className="text-red-400 hover:text-red-600 mt-2">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      ))}
                      <button onClick={() => addArrayItem('inclusionCriteria')} className="flex items-center text-sm text-medical-600 hover:text-medical-800 font-medium mt-2">
                          <Plus className="w-4 h-4 mr-1" />
                      </button>
                    </div>
                </div>

                <div>
                     <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-semibold text-gray-700">{t.form.labels.excCrit}</label>
                        <button
                          onClick={() => handleAIGenerateList('exclusionCriteria')}
                          disabled={loadingField === 'exclusionCriteria'}
                          className="flex items-center px-3 py-1.5 text-xs font-medium text-medical-700 bg-medical-50 hover:bg-medical-100 border border-medical-200 rounded-full transition-colors"
                        >
                          {loadingField === 'exclusionCriteria' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                          {t.form.aiSuggest}
                        </button>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                      {data.exclusionCriteria.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                              <span className="pt-2 text-gray-400 font-mono text-xs select-none">{idx + 1}.</span>
                              <input
                                  type="text"
                                  value={item}
                                  onChange={(e) => handleArrayChange('exclusionCriteria', idx, e.target.value)}
                                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                              />
                              <button onClick={() => removeArrayItem('exclusionCriteria', idx)} className="text-red-400 hover:text-red-600 mt-2">
                                  <Trash2 className="w-4 h-4" />
                              </button>
                          </div>
                      ))}
                      <button onClick={() => addArrayItem('exclusionCriteria')} className="flex items-center text-sm text-medical-600 hover:text-medical-800 font-medium mt-2">
                          <Plus className="w-4 h-4 mr-1" />
                      </button>
                    </div>
                </div>
            </div>
        );

      case SectionTab.DESIGN:
        return (
            <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Design}</h3>
                
                <div className="grid grid-cols-2 gap-4 mb-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.studyType}</label>
                        <div className="flex gap-2">
                            <select
                                value={data.studyType || 'Observacional'}
                                onChange={(e) => handleChange('studyType', e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                            >
                                <option value="Observacional">Observational / Observacional</option>
                                <option value="Estudio Descriptivo">Descriptive / Descriptivo</option>
                                <option value="Estudio Transversal">Cross-sectional / Transversal</option>
                                <option value="Estudio de Casos y Controles">Case-Control / Casos y Controles</option>
                                <option value="Estudio de Cohortes">Cohort / Cohortes</option>
                                <option value="Ensayo Clínico Aleatorizado">RCT / Ensayo Clínico Aleatorizado</option>
                                <option value="Cuasi-experimental">Quasi-experimental / Cuasi-experimental</option>
                            </select>
                            <button
                                onClick={handleAISuggestStudyType}
                                disabled={loadingField === 'studyType'}
                                className="p-2 text-medical-600 bg-medical-50 hover:bg-medical-100 rounded-md border border-medical-200 transition-colors"
                                title={t.form.aiClassify}
                            >
                                {loadingField === 'studyType' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Microscope className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.design} <span className="text-red-500">*</span></label>
                    <textarea
                        rows={3}
                        value={data.studyDesign}
                        onChange={(e) => handleChange('studyDesign', e.target.value)}
                        onBlur={() => handleBlur('studyDesign')}
                        className={getInputClass('studyDesign')}
                        placeholder={t.form.placeholders.design}
                    />
                    <ErrorMessage field="studyDesign" />
                    
                     <button
                        onClick={() => {
                          const studyType = data.studyType || 'Observacional';
                          const instruction = `Act as an expert medical writer. Write a formal, precise, and academic methodological description for the Study Design section. Incorporate the specific study type (${studyType}) and ensure alignment with the primary objective. Use standard research terminology (e.g., multicenter, prospective, randomized, etc., as appropriate).`;
                          const context = `Title: ${data.title}\nPrimary Objective: ${data.primaryObjective}\nStudy Type: ${studyType}`;
                          
                          if (!data.studyDesign) {
                              handleAIGenerateText('studyDesign', context, instruction);
                          } else {
                              handleAIRefine('studyDesign', data.studyDesign, `${instruction} Context: ${context}`);
                          }
                        }}
                        disabled={loadingField === 'studyDesign'}
                        className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-medical-200"
                     >
                       {loadingField === 'studyDesign' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                       {data.studyDesign ? t.form.aiRefine : t.form.aiGenerate}
                     </button>
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.interventions}</label>
                    <textarea
                        rows={3}
                        value={data.interventions}
                        onChange={(e) => handleChange('interventions', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                    />
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.evalGeneral}</label>
                    <textarea
                        rows={3}
                        value={data.evaluationsGeneral}
                        onChange={(e) => handleChange('evaluationsGeneral', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                    />
                    {renderAIButton('evaluationsGeneral', data.evaluationsGeneral, 'General study evaluations')}
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.evalPrimary}</label>
                    <textarea
                        rows={3}
                        value={data.evaluationsPrimary}
                        onChange={(e) => handleChange('evaluationsPrimary', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                    />
                </div>
                
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.otherVars}</label>
                      {data.otherVariables.map((item, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                             <span className="pt-2 text-gray-500 font-mono text-xs">●</span>
                            <input
                                type="text"
                                value={item}
                                onChange={(e) => handleArrayChange('otherVariables', idx, e.target.value)}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                            />
                             <button onClick={() => removeArrayItem('otherVariables', idx)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button onClick={() => addArrayItem('otherVariables')} className="flex items-center text-sm text-medical-600 hover:text-medical-800 font-medium">
                        <Plus className="w-4 h-4 mr-1" />
                    </button>
                </div>
            </div>
        );

      case SectionTab.STATS:
        return (
             <div className="space-y-8 animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Statistics}</h3>
                
                {/* --- Sample Size Strategy Section --- */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
                    <h4 className="font-semibold text-blue-900 flex items-center">
                        <Calculator className="w-4 h-4 mr-2" />
                        {t.form.labels.sampleJust}
                    </h4>
                    
                    <div>
                        <label className="block text-xs font-semibold text-blue-800 mb-1 uppercase tracking-wide">{t.form.labels.calcMethod}</label>
                        <select 
                            value={data.sampleSizeMethod}
                            onChange={(e) => handleChange('sampleSizeMethod', e.target.value)}
                            className="block w-full rounded-md border-blue-200 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"
                        >
                            <option value="">-- Select --</option>
                            <option value="power">{t.form.statsOptions.power}</option>
                            <option value="precision">{t.form.statsOptions.precision}</option>
                            <option value="convenience">{t.form.statsOptions.convenience}</option>
                        </select>
                    </div>

                    {/* Conditional Inputs based on Method */}
                    <div className="grid grid-cols-2 gap-4">
                        {data.sampleSizeMethod === 'power' && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t.form.labels.alpha}</label>
                                    <input 
                                      type="number"
                                      step="0.01" 
                                      min="0"
                                      max="1"
                                      value={data.statsParams?.alpha || ''} 
                                      onChange={(e) => handleDeepChange('statsParams', 'alpha', e.target.value)} 
                                      className="w-full rounded border-gray-300 text-sm p-1.5" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t.form.labels.power}</label>
                                    <input 
                                      type="number"
                                      step="0.05"
                                      min="0"
                                      max="1"
                                      value={data.statsParams?.power || ''} 
                                      onChange={(e) => handleDeepChange('statsParams', 'power', e.target.value)} 
                                      className="w-full rounded border-gray-300 text-sm p-1.5" 
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs text-gray-600 mb-1">{t.form.labels.effectSize}</label>
                                    <input type="text" placeholder="e.g. Cohen's d = 0.5" value={data.statsParams?.deltaOrEffectSize || ''} onChange={(e) => handleDeepChange('statsParams', 'deltaOrEffectSize', e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" />
                                </div>
                            </>
                        )}
                        {data.sampleSizeMethod === 'precision' && (
                            <>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t.form.labels.precision}</label>
                                    <input type="text" placeholder="e.g. 95%" value={data.statsParams?.precision || ''} onChange={(e) => handleDeepChange('statsParams', 'precision', e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">{t.form.labels.effectSize}</label>
                                    <input type="text" placeholder="e.g. Width 5 points" value={data.statsParams?.deltaOrEffectSize || ''} onChange={(e) => handleDeepChange('statsParams', 'deltaOrEffectSize', e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" />
                                </div>
                            </>
                        )}
                         <div className="col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">{t.form.labels.dropout}</label>
                            <input type="text" value={data.statsParams?.dropoutRate || ''} onChange={(e) => handleDeepChange('statsParams', 'dropoutRate', e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" />
                        </div>
                    </div>

                    <div className="relative">
                        <textarea
                            rows={4}
                            value={data.sampleSizeJustification}
                            onChange={(e) => handleChange('sampleSizeJustification', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                            placeholder="Final justification text..."
                        />
                        <button
                            onClick={() => {
                                const methodMap = {power: "Power-based calculation (Superiority)", precision: "Precision-based calculation (Estimation/CI)", convenience: "Feasibility/Convenience"};
                                const context = `Method: ${methodMap[data.sampleSizeMethod as keyof typeof methodMap] || 'N/A'}. Alpha: ${data.statsParams?.alpha}. Power/Precision: ${data.statsParams?.power || data.statsParams?.precision}. Effect/Margin: ${data.statsParams?.deltaOrEffectSize}. Dropout: ${data.statsParams?.dropoutRate}. Study Type: ${data.studyType}.`;
                                const instruction = "Write a formal Sample Size Justification paragraph. Mention the parameters used. If precision-based, emphasize Confidence Interval width. If power-based, mention Type I/II errors. If convenience, justify based on feasibility/pilot nature.";
                                handleAIGenerateText('sampleSizeJustification', context, instruction);
                            }}
                            disabled={loadingField === 'sampleSizeJustification'}
                            className="absolute right-2 bottom-2 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm"
                        >
                            {loadingField === 'sampleSizeJustification' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            Generate Justification
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{t.form.labels.nPhys}</label>
                        <input
                            type="number"
                            value={data.numPhysicians}
                            onChange={(e) => handleChange('numPhysicians', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">{t.form.labels.nSubj}</label>
                        <input
                            type="number"
                            value={data.subjectsPerPhysician}
                            onChange={(e) => handleChange('subjectsPerPhysician', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">{t.form.labels.nTotal}</label>
                        <input
                            type="number"
                            value={data.totalSubjects}
                            onChange={(e) => handleChange('totalSubjects', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                        />
                    </div>
                </div>

                {/* --- Statistical Analysis Strategy Section --- */}
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 space-y-4">
                    <h4 className="font-semibold text-purple-900 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        {t.form.labels.statsPlan}
                    </h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-purple-800 mb-1 uppercase tracking-wide">{t.form.labels.hypType}</label>
                            <select 
                                value={data.analysisHypothesis}
                                onChange={(e) => handleChange('analysisHypothesis', e.target.value)}
                                className="block w-full rounded-md border-purple-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2"
                            >
                                <option value="">-- Select --</option>
                                <option value="superiority">{t.form.statsOptions.sup}</option>
                                <option value="non_inferiority">{t.form.statsOptions.nonInf}</option>
                                <option value="equivalence">{t.form.statsOptions.equiv}</option>
                                <option value="exploratory">{t.form.statsOptions.expl}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-purple-800 mb-1 uppercase tracking-wide">{t.form.labels.varType}</label>
                            <select 
                                value={data.primaryVariableType}
                                onChange={(e) => handleChange('primaryVariableType', e.target.value)}
                                className="block w-full rounded-md border-purple-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2"
                            >
                                <option value="">-- Select --</option>
                                <option value="continuous">{t.form.statsOptions.cont}</option>
                                <option value="binary">{t.form.statsOptions.bin}</option>
                                <option value="time_to_event">{t.form.statsOptions.surv}</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Detailed Hypothesis Text Area */}
                    <div className="relative">
                        <label className="block text-xs font-semibold text-purple-800 mb-1 uppercase tracking-wide">{t.form.labels.detailedHyp}</label>
                        <textarea
                            rows={3}
                            value={data.detailedHypothesis}
                            onChange={(e) => handleChange('detailedHypothesis', e.target.value)}
                            className="block w-full rounded-md border-purple-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2"
                            placeholder={t.form.placeholders.detailedHyp}
                        />
                         <button
                            onClick={() => {
                                const context = `Objective: ${data.primaryObjective}. Study Type: ${data.studyType}. Hypothesis Type: ${data.analysisHypothesis}. Effect Size: ${data.statsParams.deltaOrEffectSize}.`;
                                const instruction = "Write a formal hypothesis statement text (e.g., 'Treatment X is superior to Y...'). If observational, state the association. If non-inferiority, mention the margin.";
                                handleAIGenerateText('detailedHypothesis', context, instruction);
                            }}
                            disabled={loadingField === 'detailedHypothesis'}
                            className="absolute right-2 bottom-2 bg-white text-purple-600 border border-purple-200 hover:bg-purple-50 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm"
                        >
                            {loadingField === 'detailedHypothesis' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            Generate Hypothesis
                        </button>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-semibold text-purple-800 mb-1 uppercase tracking-wide">{t.form.labels.confounders}</label>
                        <input 
                            type="text"
                            placeholder={t.form.placeholders.confounders}
                            value={data.confounders}
                            onChange={(e) => handleChange('confounders', e.target.value)}
                            className="block w-full rounded-md border-purple-200 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm p-2"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">{t.form.labels.statsPlan}</label>
                            <button
                                onClick={() => handleAIGenerateList('statisticalAnalysis')}
                                disabled={loadingField === 'statisticalAnalysis'}
                                className="text-purple-600 hover:text-purple-800 text-xs font-medium flex items-center"
                            >
                                {loadingField === 'statisticalAnalysis' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                                Generate Plan
                            </button>
                        </div>
                        {data.statisticalAnalysis.map((item, idx) => (
                            <div key={idx} className="flex gap-2 mb-2 relative">
                                <span className="pt-2 text-gray-500 font-mono text-xs">{idx + 1}.</span>
                                <div className="relative flex-1">
                                    <textarea
                                        rows={2}
                                        value={item}
                                        onChange={(e) => handleArrayChange('statisticalAnalysis', idx, e.target.value)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2 pr-10"
                                    />
                                    <button
                                    onClick={() => handleAIRefine(`statisticalAnalysis[${idx}]`, item, `Statistical analysis step description. Context: Study Type: ${data.studyType}. Primary Objective: ${data.primaryObjective}. Hypothesis: ${data.analysisHypothesis}. Variable: ${data.primaryVariableType}.`)}
                                    disabled={loadingField === `statisticalAnalysis[${idx}]`}
                                    className="absolute right-2 top-2 p-1 text-medical-600 hover:bg-medical-50 rounded-md transition-colors disabled:opacity-50"
                                    >
                                    {loadingField === `statisticalAnalysis[${idx}]` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                                    </button>
                                </div>
                                <button onClick={() => removeArrayItem('statisticalAnalysis', idx)} className="text-red-500 hover:text-red-700 self-start mt-2">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button onClick={() => addArrayItem('statisticalAnalysis')} className="flex items-center text-sm text-medical-600 hover:text-medical-800 font-medium mt-2">
                            <Plus className="w-4 h-4 mr-1" />
                        </button>
                    </div>
                </div>
             </div>
        );

      case SectionTab.ADMIN:
        return (
            <div className="space-y-6 animate-fadeIn">
                 <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Admin}</h3>
                 
                 <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.logistics}</label>
                    <textarea
                        rows={6}
                        value={data.recruitmentProcess}
                        onChange={(e) => handleChange('recruitmentProcess', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                        placeholder={t.form.placeholders.process}
                    />
                    {renderAIButton('recruitmentProcess', data.recruitmentProcess, 'Study logistics and operations')}
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.dataProc}</label>
                    <textarea
                        rows={5}
                        value={data.dataProcessing}
                        onChange={(e) => handleChange('dataProcessing', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                        placeholder={t.form.placeholders.data}
                    />
                    
                     <button
                        onClick={() => {
                          const context = `Study Type: ${data.studyType}. Title: ${data.title}.`;
                          const instruction = "Write a detailed 'Data Collection and Processing' section. Include: 1) Collection method (eCRF). 2) Monitoring (SDV). 3) Data Cleaning. 4) Confidentiality (GDPR).";
                          
                          if (!data.dataProcessing) {
                              handleAIGenerateText('dataProcessing', context, instruction);
                          } else {
                              handleAIRefine('dataProcessing', data.dataProcessing, `${instruction}. Context: ${context}`);
                          }
                        }}
                        disabled={loadingField === 'dataProcessing'}
                        className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-medical-200"
                     >
                       {loadingField === 'dataProcessing' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                       {data.dataProcessing ? t.form.aiRefine : t.form.aiGenerate}
                     </button>
                </div>
                
                <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.location}</label>
                     <input
                        type="text"
                        value={data.investigatorsLocation}
                        onChange={(e) => handleChange('investigatorsLocation', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Date 1</label>
                        <input
                            type="text"
                            value={data.dates.presentation}
                            onChange={(e) => handleDeepChange('dates', 'presentation', e.target.value)}
                            className="mt-1 block w-full border p-2 rounded-md"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date 2</label>
                        <input
                            type="text"
                            value={data.dates.startDate}
                            onChange={(e) => handleDeepChange('dates', 'startDate', e.target.value)}
                            className="mt-1 block w-full border p-2 rounded-md"
                        />
                    </div>
                </div>
            </div>
        );

      case SectionTab.BIBLIOGRAPHY:
        return (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Bibliography}</h3>
            <div className="relative">
              <textarea
                rows={12}
                value={data.bibliography}
                onChange={(e) => handleChange('bibliography', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2 font-mono text-sm"
                placeholder={t.form.placeholders.biblio}
              />
              <div className="absolute right-2 bottom-2 flex space-x-2">
                 <button
                    onClick={() => {
                       const context = `Title: ${data.title}\nObj: ${data.primaryObjective}`;
                       const instruction = "Generate a list of 3 simulated but realistic bibliography references in Vancouver style.";
                       handleAIGenerateText('bibliography', context, instruction);
                    }}
                    disabled={loadingField === 'bibliography'}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-medical-700 bg-medical-50 hover:bg-medical-100 border border-medical-200 rounded-md transition-colors"
                 >
                   {loadingField === 'bibliography' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                   {t.form.aiSuggest}
                 </button>
                 <button
                   onClick={() => handleAIRefine('bibliography', data.bibliography, 'Format these references strictly in Vancouver style.')}
                   disabled={!data.bibliography || loadingField === 'bibliography'}
                   className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
                 >
                    {loadingField === 'bibliography' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                    Format
                 </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
      <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as SectionTab)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab
                ? 'bg-white text-medical-600 border-b-2 border-medical-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {t.form.tabs[tab] || tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        {renderSection()}
      </div>
      <div className="bg-gray-50 p-4 border-t border-gray-200 flex justify-between">
        <button
            onClick={() => {
                const idx = tabs.indexOf(activeTab);
                if (idx > 0) setActiveTab(tabs[idx - 1] as SectionTab);
            }}
            disabled={tabs.indexOf(activeTab) === 0}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
            <ChevronLeft className="w-4 h-4 mr-1" /> {t.wizard.back}
        </button>
         <button
            onClick={() => {
                const idx = tabs.indexOf(activeTab);
                if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1] as SectionTab);
            }}
            disabled={tabs.indexOf(activeTab) === tabs.length - 1}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-medical-600 rounded-md hover:bg-medical-700 disabled:opacity-50"
        >
            {t.wizard.next} <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
    </div>
  );
};