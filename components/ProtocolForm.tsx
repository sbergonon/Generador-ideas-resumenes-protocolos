import React, { useState } from 'react';
import { ProtocolData, SectionTab } from '../types';
import { Plus, Trash2, Wand2, Loader2, ChevronRight, ChevronLeft, Sparkles, AlertCircle, Bot, Calculator, BarChart3, Microscope, Search, Filter, Calendar, Ruler, Paperclip } from 'lucide-react';
import { refineText, generateList, generateText, generateContextWithSearchAndRefs, generateTextWithRefs, GeneratedContentWithRefs } from '../services/geminiService';
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
    // Special logic for Statistics Calculation
    if (field === 'totalSubjects' || field === 'numPhysicians') {
        const total = field === 'totalSubjects' ? parseInt(value) : parseInt(data.totalSubjects);
        const phys = field === 'numPhysicians' ? parseInt(value) : parseInt(data.numPhysicians);
        
        let newSubjectsPerPhys = data.subjectsPerPhysician;
        if (!isNaN(total) && !isNaN(phys) && phys > 0) {
            newSubjectsPerPhys = Math.ceil(total / phys).toString();
        }

        onChange({ 
            ...data, 
            [field]: value,
            subjectsPerPhysician: newSubjectsPerPhys
        });
        return;
    }

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

  // --- SMART BIBLIOGRAPHY MANAGER ---
  // This function takes AI output (Text + Refs) and intelligently merges it into the existing document
  const processAndMergeContent = (result: GeneratedContentWithRefs, targetField: keyof ProtocolData) => {
      if (!result.text) return;

      let finalText = result.text;
      const currentBiblio = data.bibliography || '';
      
      // Calculate the current highest reference number
      // We look for patterns like [1], [10], etc. in the EXISTING bibliography to find the offset
      const existingRefLines = currentBiblio.split('\n').filter(l => l.trim().length > 0);
      const currentCount = existingRefLines.length;

      // If there are new references returned by AI
      if (result.references && result.references.length > 10) {
          // 1. Shift citation numbers in the TEXT
          // AI usually returns [1], [2]. We need to map them to [currentCount + 1], [currentCount + 2]
          finalText = finalText.replace(/\[(\d+)\]/g, (match, num) => {
              const newNum = parseInt(num) + currentCount;
              return `[${newNum}]`;
          });

          // 2. Format the new references list
          // Split AI refs (assuming they might be numbered 1., 2. or [1], [2])
          const newRefLines = result.references.split('\n').filter(l => l.trim().length > 0);
          
          // Re-number the new reference lines strictly
          const formattedNewRefs = newRefLines.map((line, idx) => {
              // Remove existing numbering (like "1." or "[1]")
              const cleanLine = line.replace(/^(\[\d+\]|\d+\.)\s*/, '');
              const globalIndex = currentCount + idx + 1;
              return `${globalIndex}. ${cleanLine}`;
          }).join('\n');

          // 3. Append to main Bibliography
          const separator = currentBiblio.length > 0 ? '\n' : '';
          handleChange('bibliography', currentBiblio + separator + formattedNewRefs);
      }

      // 4. Update the target text field
      handleChange(targetField, finalText);
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

  const handleAIGenerateTextWithRefs = async (field: keyof ProtocolData, context: string, instruction: string) => {
    setLoadingField(field);
    const result = await generateTextWithRefs(context, instruction, language);
    processAndMergeContent(result, field);
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
  
  const handleSuggestEvaluations = async (field: keyof ProtocolData) => {
    setLoadingField(field);
    // CRITICAL: We pass the STRICT design params to override any old text in 'studyDesign'
    const context = `
        Title: ${data.title}
        Primary Objective: ${data.primaryObjective}
        Secondary Objectives: ${data.secondaryObjectives.join(', ')}
        Scales: ${data.measurementScales.join(', ')}
        Study Type (STRICT): ${data.studyType}
        Design Model (STRICT): ${data.designModel}
        Follow-up: ${data.followUpDuration}
    `;
    const instruction = field === 'evaluationsGeneral'
        ? `Suggest a general schedule of assessments and evaluations suitable for this ${data.studyType} study. Mention Screening, Baseline, and Follow-up visits.`
        : "Suggest specific methods, timings, and procedures to evaluate the PRIMARY variable/endpoint.";

    // We use generateText because suggestions usually don't need citations yet, but can be edited
    const result = await generateText(context, instruction, language);
    if (result) {
        handleChange(field, result);
    }
    setLoadingField(null);
  };

  const handleContextSearch = async () => {
    setLoadingField('contextSummary');
    const result = await generateContextWithSearchAndRefs(data.title, data.primaryObjective, language);
    processAndMergeContent(result, 'contextSummary');
    setLoadingField(null);
  };

  const handleAIGenerateList = async (field: 'inclusionCriteria' | 'exclusionCriteria' | 'statisticalAnalysis' | 'secondaryObjectives' | 'variableDefinitions' | 'measurementScales') => {
    setLoadingField(field);
    
    let typeLabel = '';
    let context = '';

    if (field === 'statisticalAnalysis') {
        typeLabel = 'technical statistical analysis steps (Descriptive, Inferential, and Modeling)';
        // Strict Design Context
        context = `Study Type: ${data.studyType}. Design Model: ${data.designModel}. Hypothesis: ${data.analysisHypothesis}.`;
    } else if (field === 'measurementScales') {
        typeLabel = 'standard clinical scales or validated metrics specifically relevant to this pathology/condition';
        context = `Study Title: ${data.title}. Primary Objective: ${data.primaryObjective}.`;
    } else if (field === 'secondaryObjectives') {
       // ... existing logic
       typeLabel = 'secondary objectives (SMART criteria)';
       context = `Title: ${data.title}. Primary Objective: ${data.primaryObjective}`;
    } else if (field === 'variableDefinitions') {
        typeLabel = 'variable measurement definitions';
        context = `Primary Objective: ${data.primaryObjective}. Scales: ${data.measurementScales.join(', ')}`;
    } else if (field === 'inclusionCriteria' || field === 'exclusionCriteria') {
       // ... existing logic
       typeLabel = field === 'inclusionCriteria' ? 'inclusion criteria' : 'exclusion criteria';
       context = `Title: ${data.title}. Type: ${data.studyType}`;
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
    const instruction = "Classify the study methodology into exactly one of these categories: 'Ensayo Clínico Aleatorizado', 'Estudio de Cohortes', 'Estudio de Casos y Controles', 'Estudio Transversal', 'Estudio Descriptivo', 'Cuasi-experimental', 'Observacional'. Return only the category name.";
    
    const result = await generateText(context, instruction, language);
    
    if (result) {
        let bestMatch = result;
        const lower = result.toLowerCase();
        
        if (lower.includes('ensayo') || lower.includes('rct') || lower.includes('randomized')) bestMatch = 'Ensayo Clínico Aleatorizado';
        else if (lower.includes('cohort')) bestMatch = 'Estudio de Cohortes';
        else if (lower.includes('casos') || lower.includes('case')) bestMatch = 'Estudio de Casos y Controles';
        else if (lower.includes('transversal') || lower.includes('cross')) bestMatch = 'Estudio Transversal';
        else if (lower.includes('descriptivo') || lower.includes('descriptive')) bestMatch = 'Estudio Descriptivo';
        else if (lower.includes('cuasi') || lower.includes('quasi')) bestMatch = 'Cuasi-experimental';
        else if (lower.includes('observacional') || lower.includes('observational')) bestMatch = 'Observacional';
        
        handleChange('studyType', bestMatch);
    }
    setLoadingField(null);
  };

  // Z-Score lookup for Two-Sided Alpha
  const getZScoreAlpha = (alpha: number) => {
    if (alpha <= 0.001) return 3.291;
    if (alpha <= 0.01) return 2.576;
    if (alpha <= 0.05) return 1.960;
    if (alpha <= 0.10) return 1.645;
    return 1.960; // default 0.05
  };

  // Z-Score lookup for Power (1 - Beta)
  const getZScoreBeta = (power: number) => {
    if (power >= 0.99) return 2.326;
    if (power >= 0.95) return 1.645;
    if (power >= 0.90) return 1.282;
    if (power >= 0.85) return 1.036;
    if (power >= 0.80) return 0.842;
    return 0.842; // default 0.80
  };

  // Function to calculate sample size and return value (silent mode)
  const calculateSampleTotal = (params: any): string | null => {
    let alpha = parseFloat(params.alpha);
    if (isNaN(alpha)) alpha = 0.05;

    let power = parseFloat(params.power);
    if (isNaN(power)) power = 0.80;
    
    // Parse standardized effect size (Cohen's d)
    const esText = params.deltaOrEffectSize || '';
    const esMatch = esText.match(/[0-9]*\.?[0-9]+/); // Extracts first number
    const effectSize = esMatch ? parseFloat(esMatch[0]) : 0;

    // Parse dropout
    const dropText = params.dropoutRate || '';
    const dropMatch = dropText.match(/[0-9]*\.?[0-9]+/);
    let dropout = dropMatch ? parseFloat(dropMatch[0]) : 0;
    
    // Handle % inputs for dropout
    if (dropout > 1) {
       dropout = dropout / 100;
    }

    if (!effectSize || effectSize <= 0) {
        return null;
    }

    // Calculation (Lehr's Formula / Two-sample t-test approx)
    const zAlpha = getZScoreAlpha(alpha);
    const zBeta = getZScoreBeta(power);

    // Formula: N_per_group = 2 * ((Z_alpha + Z_beta) / effectSize)^2
    const nPerGroup = 2 * Math.pow((zAlpha + zBeta) / effectSize, 2);
    let total = Math.ceil(nPerGroup * 2);

    // Adjust for Dropout
    if (dropout > 0 && dropout < 1) {
        total = Math.ceil(total / (1 - dropout));
    }

    return total.toString();
  };

  // Enhanced handler for Stats Parameters
  const handleStatsParamChange = (param: string, value: string) => {
      // 1. Update the local params
      const newStatsParams = { ...data.statsParams, [param]: value };
      let newData = { ...data, statsParams: newStatsParams };
      
      // 2. Try automatic calculation if method is 'power'
      if (data.sampleSizeMethod === 'power') {
          const total = calculateSampleTotal(newStatsParams);
          if (total) {
              // Update total
              newData = { ...newData, totalSubjects: total };
              
              // Recalculate Subjects per Physician immediately
              const phys = parseInt(data.numPhysicians);
              if (!isNaN(phys) && phys > 0) {
                  const perPhys = Math.ceil(parseInt(total) / phys).toString();
                  newData = { ...newData, subjectsPerPhysician: perPhys };
              }
          }
      }
      onChange(newData);
  };

  // Button handler for manual calculation (shows alerts)
  const handleCalculateSampleSize = () => {
    const total = calculateSampleTotal(data.statsParams);
    if (total) {
        handleChange('totalSubjects', total);
    } else {
         alert(language === 'es' 
            ? "Por favor ingrese un Tamaño del Efecto válido (ej. 0.5)." 
            : "Please enter a valid Effect Size (e.g. 0.5).");
    }
  };

  const samplingStrategies = [
    { value: "Muestreo Consecutivo (Consecutive Sampling)", label: "Consecutive / Consecutivo" },
    { value: "Muestreo Aleatorio Simple (Simple Random Sampling)", label: "Simple Random / Aleatorio Simple" },
    { value: "Muestreo por Conveniencia (Convenience Sampling)", label: "Convenience / Conveniencia" },
    { value: "Muestreo Estratificado (Stratified Sampling)", label: "Stratified / Estratificado" },
    { value: "Muestreo Sistemático (Systematic Sampling)", label: "Systematic / Sistemático" },
    { value: "Muestreo por Conglomerados (Cluster Sampling)", label: "Cluster / Conglomerados" }
  ];

  const handleSamplingStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (!val) return;
      
      const current = data.selectionMethod;
      const newValue = current && current.trim() !== '' ? `${current}\n${val}` : val;
      handleChange('selectionMethod', newValue);
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2 pb-8"
                placeholder={language === 'es' ? "Explique la justificación científica del objetivo principal..." : "Explain the scientific rationale for the primary objective..."}
              />
              <button
                onClick={() => {
                  const context = `Study Title: ${data.title}. Background Context: ${data.contextSummary}. Primary Objective: ${data.primaryObjective}.`;
                  const instruction = "Write a formal scientific rationale justifying the primary objective. Use paragraphs. Connect the rationale explicitly to the study's objectives. Use references if needed, formatted as [1], [2].";
                  
                  if (data.rationalePrimary && data.rationalePrimary.length > 10) {
                    handleAIRefine('rationalePrimary', data.rationalePrimary, `${instruction} Context: ${context}`);
                  } else {
                    handleAIGenerateTextWithRefs('rationalePrimary', context, instruction);
                  }
                }}
                disabled={loadingField === 'rationalePrimary'}
                className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-medical-200"
              >
                {loadingField === 'rationalePrimary' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {data.rationalePrimary ? t.form.aiRefine : t.form.aiGenerate}
              </button>
            </div>

            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.ratSecondary}</label>
              <textarea
                rows={4}
                value={data.rationaleSecondary}
                onChange={(e) => handleChange('rationaleSecondary', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2 pb-8"
                placeholder={language === 'es' ? "Explique la justificación de los objetivos secundarios..." : "Explain the rationale for secondary objectives..."}
              />
               <button
                onClick={() => {
                  const context = `Study Title: ${data.title}. Background Context: ${data.contextSummary}. Primary Objective: ${data.primaryObjective}. Secondary Objectives: ${data.secondaryObjectives.filter(o => o).join(', ')}.`;
                  const instruction = "Write a scientific rationale for the secondary objectives. Explain why these endpoints are relevant.";
                  
                  if (data.rationaleSecondary && data.rationaleSecondary.length > 10) {
                    handleAIRefine('rationaleSecondary', data.rationaleSecondary, `${instruction} Context: ${context}`);
                  } else {
                    handleAIGenerateTextWithRefs('rationaleSecondary', context, instruction);
                  }
                }}
                disabled={loadingField === 'rationaleSecondary'}
                className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-medical-200"
              >
                {loadingField === 'rationaleSecondary' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                {data.rationaleSecondary ? t.form.aiRefine : t.form.aiGenerate}
              </button>
            </div>
          </div>
        );

      case SectionTab.OBJECTIVES:
        return (
          <div className="space-y-6 animate-fadeIn">
             <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Objectives}</h3>
             
             {/* New Field: Measurement Scales (Array) */}
             <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-semibold text-yellow-800 flex items-center">
                        <Ruler className="w-4 h-4 mr-2" />
                        {t.form.labels.scales}
                    </label>
                    <button
                        onClick={() => handleAIGenerateList('measurementScales')}
                        disabled={loadingField === 'measurementScales'}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 rounded-md transition-colors"
                    >
                        {loadingField === 'measurementScales' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                        {t.form.aiSuggest}
                    </button>
                </div>
                
                {data.measurementScales.map((scale, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 relative">
                        <span className="pt-2 text-yellow-600 font-mono text-xs select-none">●</span>
                        <input
                            type="text"
                            value={scale}
                            onChange={(e) => handleArrayChange('measurementScales', idx, e.target.value)}
                            className="block w-full rounded-md border-yellow-300 bg-white shadow-sm focus:border-yellow-500 focus:ring-yellow-500 sm:text-sm border p-2 pr-8"
                            placeholder={t.form.placeholders.scales}
                        />
                        <button onClick={() => removeArrayItem('measurementScales', idx)} className="text-yellow-600 hover:text-red-500 mt-1">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button onClick={() => addArrayItem('measurementScales')} className="flex items-center text-sm text-yellow-700 hover:text-yellow-900 font-medium mt-2">
                    <Plus className="w-4 h-4 mr-1" /> Add Scale
                </button>
             </div>

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
                
                <button
                  onClick={() => {
                     const context = `Title: ${data.title}. Study Design: ${data.studyDesign}. Population: ${data.populationDescription}. Scales/Metrics: ${data.measurementScales.join(', ')}. Follow-up Duration: ${data.followUpDuration}`;
                     const instruction = "Rewrite the Primary Objective to be SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Clearly state the population, intervention/exposure, comparator (if applicable), outcome, and specific measures/scales if provided.";
                     handleAIRefine('primaryObjective', data.primaryObjective, `${instruction} Context: ${context}`);
                  }}
                  disabled={!data.primaryObjective || loadingField === 'primaryObjective'}
                  className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-medical-200"
                >
                   {loadingField === 'primaryObjective' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                   {t.form.aiRefine} (SMART)
                </button>
             </div>

             <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">{t.form.labels.objSecondary}</label>
                     <button
                          onClick={() => handleAIGenerateList('secondaryObjectives')}
                          disabled={loadingField === 'secondaryObjectives'}
                          className="flex items-center px-3 py-1.5 text-xs font-medium text-medical-700 bg-medical-50 hover:bg-medical-100 border border-medical-200 rounded-full transition-colors"
                        >
                          {loadingField === 'secondaryObjectives' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                          {t.form.aiSuggest}
                        </button>
                </div>

                {data.secondaryObjectives.map((obj, idx) => (
                    <div key={idx} className="flex gap-2 mb-2 relative">
                        <span className="pt-2 text-gray-500 font-mono">{idx + 1}.</span>
                        <div className="relative flex-1">
                            <input
                                type="text"
                                value={obj}
                                onChange={(e) => handleArrayChange('secondaryObjectives', idx, e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2 pr-8"
                            />
                             <button
                                onClick={() => {
                                  const context = `Primary Objective: ${data.primaryObjective}. Study Title: ${data.title}. Scales: ${data.measurementScales.join(', ')}`;
                                  const instruction = "Rewrite this Secondary Objective to be SMART (Specific, Measurable, Achievable, Relevant, Time-bound).";
                                  handleAIRefine(`secondaryObjectives[${idx}]`, obj, `${instruction} Context: ${context}`);
                                }}
                                disabled={loadingField === `secondaryObjectives[${idx}]` || !obj}
                                className="absolute right-1 top-1 p-1.5 text-medical-600 hover:bg-medical-50 rounded-md transition-colors disabled:opacity-50"
                                title={t.form.aiRefine}
                              >
                                {loadingField === `secondaryObjectives[${idx}]` ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                              </button>
                        </div>
                        <button onClick={() => removeArrayItem('secondaryObjectives', idx)} className="text-red-500 hover:text-red-700 mt-1">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <button onClick={() => addArrayItem('secondaryObjectives')} className="flex items-center text-sm text-medical-600 hover:text-medical-800 font-medium mt-2">
                    <Plus className="w-4 h-4 mr-1" />
                </button>
             </div>
          </div>
        );

      case SectionTab.POPULATION:
        return (
            <div className="space-y-8 animate-fadeIn">
                {/* ... (Previous Population code remains mostly same) ... */}
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

                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 shadow-sm">
                    <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center">
                         <Filter className="w-4 h-4 mr-2 text-medical-600" />
                        {t.form.labels.selMethod}
                    </label>
                    
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                         <div className="col-span-1">
                             <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase">Sampling Strategy</label>
                             <select
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm p-2"
                                onChange={handleSamplingStrategyChange}
                                defaultValue=""
                             >
                                <option value="" disabled>-- Select Standard Strategy --</option>
                                {samplingStrategies.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                             </select>
                         </div>
                     </div>

                    <div className="relative">
                        <textarea
                            rows={4}
                            value={data.selectionMethod}
                            onChange={(e) => handleChange('selectionMethod', e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                            placeholder={t.form.placeholders.method}
                        />
                        {renderAIButton('selectionMethod', data.selectionMethod, 'Subject selection method')}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                            <label className="block text-sm font-bold text-green-700">{t.form.labels.incCrit}</label>
                            <button
                            onClick={() => handleAIGenerateList('inclusionCriteria')}
                            disabled={loadingField === 'inclusionCriteria'}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-full transition-colors"
                            >
                            {loadingField === 'inclusionCriteria' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                            Suggest
                            </button>
                        </div>
                        <div className="space-y-3">
                        {data.inclusionCriteria.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <span className="pt-2 text-gray-300 font-mono text-xs select-none">{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => handleArrayChange('inclusionCriteria', idx, e.target.value)}
                                    className="flex-1 rounded-md border-gray-200 bg-gray-50 focus:bg-white shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-2"
                                />
                                <button onClick={() => removeArrayItem('inclusionCriteria', idx)} className="text-gray-400 hover:text-red-500 mt-2 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button onClick={() => addArrayItem('inclusionCriteria')} className="w-full py-2 flex justify-center items-center text-sm text-green-600 hover:bg-green-50 rounded-md font-medium border border-dashed border-green-300 mt-2 transition-colors">
                            <Plus className="w-4 h-4 mr-1" /> Add Inclusion Criterion
                        </button>
                        </div>
                    </div>

                    <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                            <label className="block text-sm font-bold text-red-700">{t.form.labels.excCrit}</label>
                            <button
                            onClick={() => handleAIGenerateList('exclusionCriteria')}
                            disabled={loadingField === 'exclusionCriteria'}
                            className="flex items-center px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-full transition-colors"
                            >
                            {loadingField === 'exclusionCriteria' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Bot className="w-3 h-3 mr-1" />}
                            Suggest
                            </button>
                        </div>
                        <div className="space-y-3">
                        {data.exclusionCriteria.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                                <span className="pt-2 text-gray-300 font-mono text-xs select-none">{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={item}
                                    onChange={(e) => handleArrayChange('exclusionCriteria', idx, e.target.value)}
                                    className="flex-1 rounded-md border-gray-200 bg-gray-50 focus:bg-white shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm border p-2"
                                />
                                <button onClick={() => removeArrayItem('exclusionCriteria', idx)} className="text-gray-400 hover:text-red-500 mt-2 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button onClick={() => addArrayItem('exclusionCriteria')} className="w-full py-2 flex justify-center items-center text-sm text-red-600 hover:bg-red-50 rounded-md font-medium border border-dashed border-red-300 mt-2 transition-colors">
                            <Plus className="w-4 h-4 mr-1" /> Add Exclusion Criterion
                        </button>
                        </div>
                    </div>
                </div>
            </div>
        );

      case SectionTab.DESIGN:
        return (
            <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Design}</h3>
                
                {/* ... (Study type dropdowns) ... */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
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
                                <option value="Casos y Controles Anidado">Nested Case-Control / Anidado</option>
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

                    <div className="flex flex-col gap-2">
                         {/* Design Subtypes */}
                         <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.studySubtype}</label>
                                    <select
                                        value={data.designModel || ''}
                                        onChange={(e) => handleChange('designModel', e.target.value)}
                                        className="block w-full rounded-md border-gray-300 text-xs p-1.5"
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="parallel">{t.form.designModels.parallel}</option>
                                        <option value="crossover">{t.form.designModels.crossover}</option>
                                        <option value="factorial">{t.form.designModels.factorial}</option>
                                        <option value="pre_post">{t.form.designModels.pre_post}</option>
                                        <option value="single_group">{t.form.designModels.single_group}</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.controlType}</label>
                                    <select
                                        value={data.controlType || ''}
                                        onChange={(e) => handleChange('controlType', e.target.value)}
                                        className="block w-full rounded-md border-gray-300 text-xs p-1.5"
                                    >
                                        <option value="">-- Select --</option>
                                        <option value="placebo">{t.form.controlTypes.placebo}</option>
                                        <option value="active">{t.form.controlTypes.active}</option>
                                        <option value="none">{t.form.controlTypes.none}</option>
                                    </select>
                                </div>
                            </div>
                         
                         <div className="flex gap-4 pt-2 items-center">
                              {(data.studyType || '').toLowerCase().includes('casos') && (
                                 <div className="flex items-center">
                                    <input
                                        id="nested-check"
                                        type="checkbox"
                                        checked={data.isNested || false}
                                        onChange={(e) => handleChange('isNested', e.target.checked)}
                                        className="h-4 w-4 text-medical-600 focus:ring-medical-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="nested-check" className="ml-2 block text-xs text-gray-900">
                                        {t.form.labels.isNested}
                                    </label>
                                 </div>
                              )}
                              
                             {/* Follow-up Duration */}
                             <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.followUp}</label>
                                <input
                                    type="text"
                                    value={data.followUpDuration}
                                    onChange={(e) => handleChange('followUpDuration', e.target.value)}
                                    className="block w-full rounded-md border-gray-300 text-xs p-1.5"
                                    placeholder={t.form.placeholders.followUp}
                                />
                             </div>
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
                          // STRICT INSTRUCTION to use CURRENT dropdown values
                          const instruction = `Act as an expert medical writer. Write a formal, precise, and academic methodological description. Structure: 1. Design Classification. 2. Methodological Description. 3. Data Interpretation Implications. SYSTEM INSTRUCTION: Write ONLY based on these parameters: Type=${studyType}, Model=${data.designModel}, Control=${data.controlType}, Follow-up=${data.followUpDuration}. IGNORE any conflicting information from previous text inputs. Use references [1] if needed.`;
                          const context = `Title: ${data.title}\nObj: ${data.primaryObjective}`;
                          
                          handleAIGenerateTextWithRefs('studyDesign', context, instruction);
                        }}
                        disabled={loadingField === 'studyDesign'}
                        className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-medical-200"
                     >
                       {loadingField === 'studyDesign' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                       {/* Changed label to clearly indicate Auto-Generation */}
                       {language === 'es' ? "Auto-Redactar (Usando Selección)" : "Auto-Write (Using Dropdowns)"}
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
                    <button
                        onClick={() => handleSuggestEvaluations('evaluationsGeneral')}
                        disabled={loadingField === 'evaluationsGeneral'}
                        className="absolute right-2 bottom-2 bg-gray-50 text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-gray-200"
                    >
                         {loadingField === 'evaluationsGeneral' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                        {t.form.aiSuggest}
                    </button>
                </div>

                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.evalPrimary}</label>
                    <textarea
                        rows={3}
                        value={data.evaluationsPrimary}
                        onChange={(e) => handleChange('evaluationsPrimary', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                    />
                     <button
                        onClick={() => handleSuggestEvaluations('evaluationsPrimary')}
                        disabled={loadingField === 'evaluationsPrimary'}
                        className="absolute right-2 bottom-2 bg-gray-50 text-gray-700 hover:bg-gray-100 px-3 py-1 rounded-md text-xs font-medium flex items-center transition-colors shadow-sm border border-gray-200"
                    >
                         {loadingField === 'evaluationsPrimary' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                        {t.form.aiSuggest}
                    </button>
                </div>
                
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700">{t.form.labels.varDefs}</label>
                        <button
                            onClick={() => handleAIGenerateList('variableDefinitions')}
                            disabled={loadingField === 'variableDefinitions'}
                            className="text-xs text-medical-600 hover:text-medical-800 flex items-center"
                        >
                             {loadingField === 'variableDefinitions' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Bot className="w-3 h-3 mr-1" />}
                            {t.form.aiSuggest}
                        </button>
                    </div>
                     {data.variableDefinitions.map((item, idx) => (
                        <div key={idx} className="flex gap-2 mb-2">
                             <span className="pt-2 text-gray-500 font-mono text-xs">●</span>
                            <input
                                type="text"
                                value={item}
                                onChange={(e) => handleArrayChange('variableDefinitions', idx, e.target.value)}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2"
                                placeholder="How is it measured? (e.g. units/day)"
                            />
                             <button onClick={() => removeArrayItem('variableDefinitions', idx)} className="text-red-500 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    <button onClick={() => addArrayItem('variableDefinitions')} className="flex items-center text-sm text-medical-600 hover:text-medical-800 font-medium">
                        <Plus className="w-4 h-4 mr-1" />
                    </button>
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
                {/* ... (Stats code remains largely same, just checking context) ... */}
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
                                      onChange={(e) => handleStatsParamChange('alpha', e.target.value)} 
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
                                      onChange={(e) => handleStatsParamChange('power', e.target.value)} 
                                      className="w-full rounded border-gray-300 text-sm p-1.5" 
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs text-gray-600 mb-1">{t.form.labels.effectSize}</label>
                                    <input type="text" placeholder="e.g. Cohen's d = 0.5" value={data.statsParams?.deltaOrEffectSize || ''} onChange={(e) => handleStatsParamChange('deltaOrEffectSize', e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" />
                                </div>
                                <div className="col-span-2 mt-2">
                                    <button
                                        onClick={handleCalculateSampleSize}
                                        className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                        <Calculator className="w-4 h-4 mr-2" />
                                        {t.form.labels.calculateBtn}
                                    </button>
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                        {t.form.labels.calculateNote}
                                    </p>
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
                            <input type="text" value={data.statsParams?.dropoutRate || ''} onChange={(e) => handleStatsParamChange('dropoutRate', e.target.value)} className="w-full rounded border-gray-300 text-sm p-1.5" />
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
                        <label className="block text-sm font-medium text-gray-700">{t.form.labels.nTotal}</label>
                        <input
                            type="number"
                            value={data.totalSubjects}
                            onChange={(e) => handleChange('totalSubjects', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">{t.form.labels.nSubj}</label>
                        <input
                            type="number"
                            value={data.subjectsPerPhysician}
                            onChange={(e) => handleChange('subjectsPerPhysician', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm border p-2 bg-gray-50"
                            readOnly
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
                                const context = `Objective: ${data.primaryObjective}. Study Type: ${data.studyType}. Hypothesis Type: ${data.analysisHypothesis}. Effect Size: ${data.statsParams.deltaOrEffectSize}. Scales: ${data.measurementScales.join(', ')}`;
                                const instruction = "Write a formal hypothesis statement text (e.g., 'Treatment X is superior to Y...'). If observational, state the association. If non-inferiority, mention the margin. Include the specific scale metrics if applicable.";
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

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                     <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                         <Calendar className="w-4 h-4 mr-2" />
                         {t.form.labels.schedule}
                     </h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.ethSub}</label>
                            <input
                                type="date"
                                value={data.schedule?.ethicsSubmission || ''}
                                onChange={(e) => handleDeepChange('schedule', 'ethicsSubmission', e.target.value)}
                                className="block w-full rounded-md border-gray-300 text-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.siteInit}</label>
                            <input
                                type="date"
                                min={data.schedule?.ethicsSubmission}
                                value={data.schedule?.siteInitiation || ''}
                                onChange={(e) => handleDeepChange('schedule', 'siteInitiation', e.target.value)}
                                className="block w-full rounded-md border-gray-300 text-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.fpi}</label>
                            <input
                                type="date"
                                min={data.schedule?.siteInitiation}
                                value={data.schedule?.firstPatientIn || ''}
                                onChange={(e) => handleDeepChange('schedule', 'firstPatientIn', e.target.value)}
                                className="block w-full rounded-md border-gray-300 text-sm p-2"
                            />
                        </div>
                         <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.interim}</label>
                            <input
                                type="date"
                                min={data.schedule?.firstPatientIn}
                                value={data.schedule?.interimAnalysis || ''}
                                onChange={(e) => handleDeepChange('schedule', 'interimAnalysis', e.target.value)}
                                className="block w-full rounded-md border-gray-300 text-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.lpo}</label>
                            <input
                                type="date"
                                min={data.schedule?.firstPatientIn}
                                value={data.schedule?.lastPatientOut || ''}
                                onChange={(e) => handleDeepChange('schedule', 'lastPatientOut', e.target.value)}
                                className="block w-full rounded-md border-gray-300 text-sm p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.dbLock}</label>
                            <input
                                type="date"
                                min={data.schedule?.lastPatientOut}
                                value={data.schedule?.dbLock || ''}
                                onChange={(e) => handleDeepChange('schedule', 'dbLock', e.target.value)}
                                className="block w-full rounded-md border-gray-300 text-sm p-2"
                            />
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-600 mb-1">{t.form.labels.finalRep}</label>
                            <input
                                type="date"
                                min={data.schedule?.dbLock}
                                value={data.schedule?.finalReport || ''}
                                onChange={(e) => handleDeepChange('schedule', 'finalReport', e.target.value)}
                                className="block w-full rounded-md border-gray-300 text-sm p-2"
                            />
                        </div>
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
                   onClick={() => handleAIRefine('bibliography', data.bibliography, 'Reformat to Vancouver. Numbered list.')}
                   disabled={!data.bibliography || loadingField === 'bibliography'}
                   className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-300 rounded-md transition-colors"
                 >
                    {loadingField === 'bibliography' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
                    Format (Vancouver)
                 </button>
              </div>
            </div>
          </div>
        );

      case SectionTab.APPENDICES:
        return (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                <Paperclip className="w-5 h-5 mr-2" />
                {t.form.tabs.Appendices}
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4 text-sm text-yellow-800">
                <p>Use this section to include the content of the measurement scales (e.g. depression scales), questionnaires, or informed consent templates.</p>
            </div>
            
            <div className="relative">
              <textarea
                rows={15}
                value={data.appendices}
                onChange={(e) => handleChange('appendices', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-medical-500 focus:ring-medical-500 sm:text-sm border p-2 font-mono text-sm"
                placeholder={t.form.placeholders.appendices}
              />
              <div className="absolute right-2 bottom-2 flex space-x-2">
                 <button
                    onClick={() => {
                       const context = `Scales: ${data.measurementScales.join(', ') || 'No scales defined'}. Title: ${data.title}.`;
                       const instruction = "Find and transcribe the actual items/questions for the mentioned measurement scales. If standard (e.g. Hamilton, PHQ-9), write the full questionnaire items.";
                       handleAIGenerateText('appendices', context, instruction);
                    }}
                    disabled={loadingField === 'appendices'}
                    className="flex items-center px-3 py-1.5 text-xs font-medium text-medical-700 bg-medical-50 hover:bg-medical-100 border border-medical-200 rounded-md transition-colors"
                 >
                   {loadingField === 'appendices' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Search className="w-3 h-3 mr-1" />}
                   Find Scales Content
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