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
    if (field === 'totalSubjects' || field === 'numPhysicians') {
        const total = field === 'totalSubjects' ? parseInt(value) : parseInt(data.totalSubjects);
        const phys = field === 'numPhysicians' ? parseInt(value) : parseInt(data.numPhysicians);
        let newSubjectsPerPhys = data.subjectsPerPhysician;
        if (!isNaN(total) && !isNaN(phys) && phys > 0) {
            newSubjectsPerPhys = Math.ceil(total / phys).toString();
        }
        onChange({ ...data, [field]: value, subjectsPerPhysician: newSubjectsPerPhys });
        return;
    }
    onChange({ ...data, [field]: value });
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const hasError = (field: keyof ProtocolData) => {
    const isEssential = ['title', 'sponsor', 'primaryObjective', 'studyDesign'].includes(field);
    if (isEssential) {
        const val = data[field];
        return touched[field] && (!val || (typeof val === 'string' && !val.trim()));
    }
    return false;
  };

  const getInputClass = (field: keyof ProtocolData) => {
    const baseClass = "mt-1 block w-full rounded-md shadow-sm sm:text-sm border p-2 transition-colors";
    if (hasError(field)) return `${baseClass} border-red-300 focus:border-red-500 focus:ring-red-500 bg-red-50`;
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
    const parentObj = (data[parent] as any) || {};
    const newParent = { ...parentObj, [child]: value };
    onChange({ ...data, [parent]: newParent });
  };

  const handleArrayChange = (field: keyof ProtocolData, index: number, value: string) => {
    const newArray = [...(data[field] as string[])];
    newArray[index] = value;
    onChange({ ...data, [field]: newArray });
  };

  const addArrayItem = (field: keyof ProtocolData) => {
    const newArray = [...(data[field] as string[]), ''];
    onChange({ ...data, [field]: newArray });
  };

  const removeArrayItem = (field: keyof ProtocolData, index: number) => {
    const newArray = (data[field] as string[]).filter((_, i) => i !== index);
    onChange({ ...data, [field]: newArray });
  };

  const processAndMergeContent = (result: GeneratedContentWithRefs, targetField: keyof ProtocolData) => {
      if (!result.text) return;
      let finalText = result.text;
      const currentBiblio = data.bibliography || '';
      const existingRefLines = currentBiblio.split('\n').filter(l => l.trim().length > 0);
      const currentCount = existingRefLines.length;

      if (result.references && result.references.length > 5) {
          finalText = finalText.replace(/\[(\d+)\]/g, (match, num) => {
              const newNum = parseInt(num) + currentCount;
              return `[${newNum}]`;
          });
          const newRefLines = result.references.split('\n').filter(l => l.trim().length > 0);
          const formattedNewRefs = newRefLines.map((line, idx) => {
              const cleanLine = line.replace(/^(\[\d+\]|\d+\.)\s*/, '');
              const globalIndex = currentCount + idx + 1;
              return `${globalIndex}. ${cleanLine}`;
          }).join('\n');
          const separator = currentBiblio.length > 0 ? '\n' : '';
          handleChange('bibliography', currentBiblio + separator + formattedNewRefs);
      }
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
    if (result) handleChange(field, result);
    setLoadingField(null);
  };
  
  const handleSuggestEvaluations = async (field: keyof ProtocolData) => {
    setLoadingField(field);
    const context = `Title: ${data.title}. Obj: ${data.primaryObjective}. Type: ${data.studyType}. Model: ${data.designModel}. Follow-up: ${data.followUpDuration}.`;
    const instruction = field === 'evaluationsGeneral'
        ? `Suggest a general schedule of assessments (Screening, Baseline, Follow-up) for this ${data.studyType} design.`
        : "Suggest specific procedures to evaluate the PRIMARY variable/endpoint.";
    const result = await generateText(context, instruction, language);
    if (result) handleChange(field, result);
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
    let typeLabel = field;
    let context = `Study: ${data.title}. Objective: ${data.primaryObjective}. Type: ${data.studyType}.`;
    const suggestions = await generateList(typeLabel, context, language);
    if (suggestions && suggestions.length > 0) {
        const currentList = (data[field] as string[]).filter(s => s.trim() !== '');
        handleChange(field, [...currentList, ...suggestions]);
    }
    setLoadingField(null);
  };

  const handleAISuggestStudyType = async () => {
    setLoadingField('studyType');
    const context = `Title: ${data.title}. Design: ${data.studyDesign}. Objective: ${data.primaryObjective}`;
    const instruction = "Return only the category name from: 'Ensayo Clínico Aleatorizado', 'Estudio de Cohortes', 'Estudio de Casos y Controles', 'Estudio Transversal', 'Estudio Descriptivo', 'Cuasi-experimental', 'Observacional'.";
    const result = await generateText(context, instruction, language);
    if (result) handleChange('studyType', result);
    setLoadingField(null);
  };

  const getZScoreAlpha = (alpha: number) => alpha <= 0.01 ? 2.576 : 1.960;
  const getZScoreBeta = (power: number) => power >= 0.90 ? 1.282 : 0.842;

  const calculateSampleTotal = (params: any): string | null => {
    const alpha = parseFloat(params.alpha) || 0.05;
    const power = parseFloat(params.power) || 0.80;
    const effectSize = parseFloat(params.deltaOrEffectSize.match(/[0-9]*\.?[0-9]+/)?.[0] || "0");
    let dropout = parseFloat(params.dropoutRate.match(/[0-9]*\.?[0-9]+/)?.[0] || "0");
    if (dropout > 1) dropout /= 100;
    if (!effectSize || effectSize <= 0) return null;
    const nPerGroup = 2 * Math.pow((getZScoreAlpha(alpha) + getZScoreBeta(power)) / effectSize, 2);
    let total = Math.ceil(nPerGroup * 2);
    if (dropout > 0 && dropout < 1) total = Math.ceil(total / (1 - dropout));
    return total.toString();
  };

  const handleStatsParamChange = (param: string, value: string) => {
      const newStatsParams = { ...data.statsParams, [param]: value };
      let newData = { ...data, statsParams: newStatsParams };
      if (data.sampleSizeMethod === 'power') {
          const total = calculateSampleTotal(newStatsParams);
          if (total) {
              newData.totalSubjects = total;
              const phys = parseInt(data.numPhysicians);
              if (!isNaN(phys) && phys > 0) newData.subjectsPerPhysician = Math.ceil(parseInt(total) / phys).toString();
          }
      }
      onChange(newData);
  };

  const tabs = Object.values(SectionTab);

  const renderSection = () => {
    switch (activeTab) {
      case SectionTab.GENERAL:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.General}</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.form.labels.title} *</label>
                <input type="text" value={data.title} onChange={(e) => handleChange('title', e.target.value)} onBlur={() => handleBlur('title')} className={getInputClass('title')} />
                <ErrorMessage field="title" />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t.form.labels.context}</label>
                <textarea rows={6} value={data.contextSummary} onChange={(e) => handleChange('contextSummary', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2" />
                <button onClick={handleContextSearch} disabled={loadingField === 'contextSummary'} className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium flex items-center border border-medical-200">
                   {loadingField === 'contextSummary' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Search className="w-3 h-3 mr-1" />} {t.form.aiContext}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">{t.form.labels.sponsor} *</label>
                <input type="text" value={data.sponsor} onChange={(e) => handleChange('sponsor', e.target.value)} onBlur={() => handleBlur('sponsor')} className={getInputClass('sponsor')} />
                <ErrorMessage field="sponsor" />
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
              <textarea rows={5} value={data.rationalePrimary} onChange={(e) => handleChange('rationalePrimary', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2" />
              <button onClick={() => handleAIGenerateTextWithRefs('rationalePrimary', `Title: ${data.title}. Context: ${data.contextSummary}. Obj: ${data.primaryObjective}`, "Write scientific rationale for primary objective.")} disabled={loadingField === 'rationalePrimary'} className="absolute right-2 bottom-2 bg-medical-50 text-medical-700 hover:bg-medical-100 px-3 py-1 rounded-md text-xs font-medium border border-medical-200 flex items-center">
                {loadingField === 'rationalePrimary' ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />} {t.form.aiGenerate}
              </button>
            </div>
          </div>
        );
      case SectionTab.OBJECTIVES:
        return (
            <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Objectives}</h3>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-yellow-800 flex items-center"><Ruler className="w-4 h-4 mr-2" /> {t.form.labels.scales}</label>
                        <button onClick={() => handleAIGenerateList('measurementScales')} className="text-xs text-yellow-800 border border-yellow-300 px-2 py-1 rounded bg-white">Suggest</button>
                    </div>
                    {data.measurementScales.map((s, i) => (
                        <div key={i} className="flex gap-2 mb-1"><input type="text" value={s} onChange={(e) => handleArrayChange('measurementScales', i, e.target.value)} className="flex-1 text-sm border p-1 rounded" /></div>
                    ))}
                    <button onClick={() => addArrayItem('measurementScales')} className="text-xs text-yellow-700 font-bold">+ Add Scale</button>
                </div>
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700">{t.form.labels.objPrimary} *</label>
                    <textarea rows={3} value={data.primaryObjective} onChange={(e) => handleChange('primaryObjective', e.target.value)} className={getInputClass('primaryObjective')} />
                    <ErrorMessage field="primaryObjective" />
                </div>
            </div>
        );
      case SectionTab.DESIGN:
        return (
            <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Design}</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs">{t.form.labels.studyType}</label>
                        <select value={data.studyType} onChange={(e) => handleChange('studyType', e.target.value)} className="w-full text-sm border p-2 rounded">
                            <option value="Observacional">Observational</option>
                            <option value="Ensayo Clínico Aleatorizado">RCT</option>
                            <option value="Estudio de Cohortes">Cohort</option>
                            <option value="Estudio de Casos y Controles">Case-Control</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs">{t.form.labels.studySubtype}</label>
                        <select value={data.designModel} onChange={(e) => handleChange('designModel', e.target.value)} className="w-full text-sm border p-2 rounded">
                            <option value="parallel">Parallel</option>
                            <option value="crossover">Crossover</option>
                        </select>
                    </div>
                </div>
                <div className="relative">
                    <label className="text-sm font-bold">{t.form.labels.design} *</label>
                    <textarea rows={4} value={data.studyDesign} onChange={(e) => handleChange('studyDesign', e.target.value)} className={getInputClass('studyDesign')} placeholder="Auto-generate using selections..." />
                    <button onClick={() => {
                        const instr = `SYSTEM INSTRUCTION: STRICTLY WRITE TEXT FOR ${data.studyType} DESIGN, Model: ${data.designModel}. Ignore previous manual text. Include scientific reasoning.`;
                        handleAIGenerateTextWithRefs('studyDesign', `Title: ${data.title}. Obj: ${data.primaryObjective}`, instr);
                    }} disabled={loadingField === 'studyDesign'} className="absolute right-2 bottom-2 bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center">
                        <Sparkles className="w-3 h-3 mr-1" /> {language === 'es' ? "Auto-Redactar (Desde Desplegables)" : "Auto-Write (From Selects)"}
                    </button>
                </div>
                <div className="relative">
                    <label className="text-sm">{t.form.labels.evalGeneral}</label>
                    <textarea rows={3} value={data.evaluationsGeneral} onChange={(e) => handleChange('evaluationsGeneral', e.target.value)} className="w-full border p-2 text-sm rounded" />
                    <button onClick={() => handleSuggestEvaluations('evaluationsGeneral')} className="absolute right-2 bottom-2 text-xs text-medical-600 bg-medical-50 p-1 rounded">Suggest</button>
                </div>
            </div>
        );
      case SectionTab.STATS:
        return (
             <div className="space-y-6 animate-fadeIn">
                <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Statistics}</h3>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="text-xs font-bold text-blue-800">{t.form.labels.calcMethod}</label>
                    <select value={data.sampleSizeMethod} onChange={(e) => handleChange('sampleSizeMethod', e.target.value)} className="w-full text-sm border p-2 mb-4">
                        <option value="power">Power-based</option>
                        <option value="precision">Precision-based</option>
                        <option value="convenience">Feasibility</option>
                    </select>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[10px]">Alpha</label><input type="text" value={data.statsParams.alpha} onChange={(e) => handleStatsParamChange('alpha', e.target.value)} className="w-full text-xs p-1" /></div>
                        <div><label className="text-[10px]">Power</label><input type="text" value={data.statsParams.power} onChange={(e) => handleStatsParamChange('power', e.target.value)} className="w-full text-xs p-1" /></div>
                        <div><label className="text-[10px]">Effect Size (Delta)</label><input type="text" value={data.statsParams.deltaOrEffectSize} onChange={(e) => handleStatsParamChange('deltaOrEffectSize', e.target.value)} className="w-full text-xs p-1" /></div>
                        <div><label className="text-[10px]">Dropout %</label><input type="text" value={data.statsParams.dropoutRate} onChange={(e) => handleStatsParamChange('dropoutRate', e.target.value)} className="w-full text-xs p-1" /></div>
                    </div>
                    <div className="relative mt-4">
                        <label className="text-sm font-semibold">{t.form.labels.sampleJust}</label>
                        <textarea rows={4} value={data.sampleSizeJustification} onChange={(e) => handleChange('sampleSizeJustification', e.target.value)} className="w-full text-sm border p-2 rounded" />
                        <button onClick={() => {
                            const ctx = `Method: ${data.sampleSizeMethod}. Alpha: ${data.statsParams.alpha}. Power: ${data.statsParams.power}. ES: ${data.statsParams.deltaOrEffectSize}. Dropout: ${data.statsParams.dropoutRate}. Study Type: ${data.studyType}.`;
                            const inst = "Write a formal Sample Size Justification. Mention Alpha, Power, and standardized effect size. Connect it to the study design.";
                            handleAIGenerateText('sampleSizeJustification', ctx, inst);
                        }} disabled={loadingField === 'sampleSizeJustification'} className="absolute right-2 bottom-2 bg-white text-blue-700 border border-blue-200 px-2 py-1 rounded text-[10px] flex items-center">
                            <Sparkles className="w-3 h-3 mr-1" /> Generate Text
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div><label className="text-xs">Sites</label><input type="number" value={data.numPhysicians} onChange={(e) => handleChange('numPhysicians', e.target.value)} className="w-full border p-1" /></div>
                    <div><label className="text-xs">Total Subjects</label><input type="number" value={data.totalSubjects} onChange={(e) => handleChange('totalSubjects', e.target.value)} className="w-full border p-1" /></div>
                    <div><label className="text-xs">Subj/Site</label><input type="number" value={data.subjectsPerPhysician} readOnly className="w-full bg-gray-100 p-1" /></div>
                </div>
             </div>
        );
      case SectionTab.BIBLIOGRAPHY:
        return (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-lg font-semibold text-gray-800">{t.form.tabs.Bibliography}</h3>
            <textarea rows={12} value={data.bibliography} onChange={(e) => handleChange('bibliography', e.target.value)} className="block w-full border p-2 font-mono text-xs" placeholder="AI automatically appends references here..." />
            <button onClick={() => handleAIRefine('bibliography', data.bibliography, "Sort and format strictly in Vancouver style. Numbered 1. 2. 3.")} className="text-xs bg-gray-100 p-2 rounded border">Format Vancouver</button>
          </div>
        );
      default:
        return <div className="p-4">Section implementation ongoing...</div>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white shadow-xl rounded-lg overflow-hidden border border-gray-200">
      <div className="flex overflow-x-auto bg-gray-50 border-b border-gray-200">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as SectionTab)} className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${activeTab === tab ? 'bg-white text-medical-600 border-b-2 border-medical-600' : 'text-gray-500'}`}>
            {t.form.tabs[tab] || tab}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-6">{renderSection()}</div>
      <div className="bg-gray-50 p-4 border-t flex justify-between">
        <button onClick={() => { const idx = tabs.indexOf(activeTab); if (idx > 0) setActiveTab(tabs[idx - 1] as SectionTab); }} className="px-4 py-2 border rounded text-sm"><ChevronLeft className="inline w-4 h-4" /> {t.wizard.back}</button>
        <button onClick={() => { const idx = tabs.indexOf(activeTab); if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1] as SectionTab); }} className="px-4 py-2 bg-medical-600 text-white rounded text-sm">{t.wizard.next} <ChevronRight className="inline w-4 h-4" /></button>
      </div>
    </div>
  );
};