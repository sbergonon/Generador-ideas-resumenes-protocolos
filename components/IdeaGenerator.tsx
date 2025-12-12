import React, { useState } from 'react';
import { ProtocolData } from '../types';
import { INITIAL_PROTOCOL_DATA } from '../constants';
import { ArrowRight, Check, Activity, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onComplete: (data: ProtocolData) => void;
}

// Internal types for the wizard state
type StudyAim = 'descriptive' | 'analytical' | null;
type InterventionStatus = 'yes' | 'no' | null;
type TimeDirection = 'retrospective' | 'prospective' | 'cross-sectional' | null;
type ControlGroup = 'yes' | 'no' | null;

export const IdeaGenerator: React.FC<Props> = ({ onComplete }) => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState(1);
  const [pico, setPico] = useState({
    population: '',
    intervention: '',
    comparison: '',
    outcome: ''
  });
  
  const [hasIntervention, setHasIntervention] = useState<InterventionStatus>(null);
  const [hasControl, setHasControl] = useState<ControlGroup>(null);
  const [timeDirection, setTimeDirection] = useState<TimeDirection>(null);
  const [randomized, setRandomized] = useState<boolean>(false);

  const generateProtocol = () => {
    let generatedData = { ...INITIAL_PROTOCOL_DATA };
    
    // Localization helpers
    const isEs = language === 'es';
    
    // 1. Build Title
    const exposureLabel = hasIntervention === 'yes' 
        ? (isEs ? 'Efecto de' : 'Effect of') 
        : (isEs ? 'Asociación entre' : 'Association between');
    const exposureVar = pico.intervention || (isEs ? 'la exposición' : 'exposure');
    const prepOn = isEs ? 'sobre' : 'on';
    const prepIn = isEs ? 'en' : 'in';
    
    generatedData.title = `${exposureLabel} ${exposureVar} ${prepOn} ${pico.outcome} ${prepIn} ${pico.population}`;

    // 2. Population
    generatedData.populationDescription = isEs 
        ? `La población de estudio consistirá en ${pico.population}.` 
        : `The study population will consist of ${pico.population}.`;
    
    generatedData.inclusionCriteria = isEs
        ? [`Pacientes que cumplan con la definición de ${pico.population}`, "Firmar consentimiento informado"]
        : [`Patients meeting the definition of ${pico.population}`, "Signed informed consent"];

    // 3. Design Algorithm
    let designText = "";
    let statsText = [""];
    let studyType = "Observacional";
    
    if (hasIntervention === 'yes') {
        // Experimental
        if (randomized) {
            designText = isEs 
                ? "Ensayo Clínico Aleatorizado (ECA), controlado, prospectivo."
                : "Randomized Clinical Trial (RCT), controlled, prospective.";
            studyType = isEs ? "Ensayo Clínico" : "Clinical Trial";
            statsText = isEs 
                ? ["Análisis por intención de tratar.", "Comparación de proporciones o medias."] 
                : ["Intention-to-treat analysis.", "Comparison of proportions or means."];
            
            const groupInt = isEs ? "Grupo Intervención" : "Intervention Group";
            const groupCtrl = isEs ? "Grupo Control" : "Control Group";
            const placebo = isEs ? "Placebo o tratamiento estándar" : "Placebo or standard care";
            generatedData.interventions = `${groupInt}: ${pico.intervention}.\n${groupCtrl}: ${pico.comparison || placebo}.`;
        } else {
            designText = isEs 
                ? "Estudio Cuasi-experimental (Ensayo no aleatorizado)."
                : "Quasi-experimental Study (Non-randomized trial).";
            studyType = "Cuasi-experimental";
            statsText = isEs 
                ? ["Comparación pre-post o entre grupos no equivalentes."]
                : ["Pre-post comparison or non-equivalent groups."];
            generatedData.interventions = `${isEs ? 'Intervención' : 'Intervention'}: ${pico.intervention}.`;
        }
    } else {
        // Observational
        if (hasControl === 'no') {
            designText = isEs
                ? "Estudio Observacional Descriptivo."
                : "Descriptive Observational Study.";
            studyType = isEs ? "Observacional" : "Observational";
            statsText = isEs
                ? ["Estadística descriptiva."]
                : ["Descriptive statistics."];
        } else {
            // Analytical
            if (timeDirection === 'cross-sectional') {
                designText = isEs
                    ? "Estudio Observacional Transversal (Cross-sectional)."
                    : "Cross-sectional Observational Study.";
                studyType = isEs ? "Observacional Transversal" : "Cross-sectional";
                statsText = isEs 
                    ? ["Cálculo de Prevalencia (Odds Ratio)."]
                    : ["Prevalence calculation (Odds Ratio)."];
            } else if (timeDirection === 'retrospective') {
                designText = isEs
                    ? "Estudio Observacional Analítico: Casos y Controles."
                    : "Analytic Observational Study: Case-Control.";
                studyType = isEs ? "Casos y Controles" : "Case-Control";
                statsText = ["Odds Ratio (OR)."];
                const cases = isEs ? "Casos" : "Cases";
                const ctrls = isEs ? "Controles" : "Controls";
                const wOut = isEs ? "con" : "with";
                const woOut = isEs ? "sin" : "without";
                generatedData.selectionMethod = `${cases}: ${pico.population} ${wOut} ${pico.outcome}.\n${ctrls}: ${pico.population} ${woOut} ${pico.outcome}.`;
            } else {
                designText = isEs
                    ? "Estudio Observacional Analítico: Cohortes (Prospectivo)."
                    : "Analytic Observational Study: Cohort (Prospective).";
                studyType = isEs ? "Cohortes" : "Cohort";
                statsText = isEs 
                    ? ["Riesgo Relativo (RR).", "Análisis de supervivencia."]
                    : ["Relative Risk (RR).", "Survival analysis."];
                 const cExp = isEs ? "Cohorte Expuesta" : "Exposed Cohort";
                 const cNon = isEs ? "Cohorte No Expuesta" : "Unexposed Cohort";
                 generatedData.selectionMethod = `${cExp}: ${pico.intervention}.\n${cNon}: ${isEs ? 'Sin' : 'No'} ${pico.intervention}.`;
            }
        }
    }

    generatedData.studyDesign = designText;
    generatedData.studyType = studyType;
    generatedData.statisticalAnalysis = statsText;

    // 4. Objectives
    const improve = isEs ? 'mejora' : 'improves';
    const assoc = isEs ? 'se asocia con' : 'is associated with';
    const verb = hasIntervention === 'yes' ? improve : assoc;
    const determine = isEs ? 'Determinar si' : 'Determine if';
    
    generatedData.primaryObjective = `${determine} ${pico.intervention} ${verb} ${pico.outcome} ${prepIn} ${pico.population}.`;
    
    // 5. Rationale
    const uncert = isEs ? 'Existe incertidumbre sobre el impacto de' : 'There is uncertainty regarding the impact of';
    generatedData.rationalePrimary = `${uncert} ${pico.intervention} ${prepOn} ${pico.outcome}.`;

    onComplete(generatedData);
  };

  const renderStep1_PICO = () => (
    <div className="space-y-6 animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-800 flex items-center">
        <Users className="mr-2 text-medical-600" />
        {t.wizard.step1Title}
      </h2>
      <p className="text-gray-600 text-sm">{t.wizard.step1Desc}</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.wizard.popLabel}</label>
          <input
            type="text"
            className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-medical-500 focus:border-medical-500"
            placeholder={t.wizard.popPlace}
            value={pico.population}
            onChange={(e) => setPico({...pico, population: e.target.value})}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.wizard.intLabel}</label>
          <input
            type="text"
            className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-medical-500 focus:border-medical-500"
            placeholder={t.wizard.intPlace}
            value={pico.intervention}
            onChange={(e) => setPico({...pico, intervention: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.wizard.compLabel}</label>
          <input
            type="text"
            className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-medical-500 focus:border-medical-500"
            placeholder={t.wizard.compPlace}
            value={pico.comparison}
            onChange={(e) => setPico({...pico, comparison: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t.wizard.outLabel}</label>
          <input
            type="text"
            className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-medical-500 focus:border-medical-500"
            placeholder={t.wizard.outPlace}
            value={pico.outcome}
            onChange={(e) => setPico({...pico, outcome: e.target.value})}
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={() => setStep(2)}
          disabled={!pico.population || !pico.intervention || !pico.outcome}
          className="bg-medical-600 text-white px-6 py-2 rounded-lg hover:bg-medical-700 disabled:opacity-50 flex items-center"
        >
          {t.wizard.next} <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>
    </div>
  );

  const renderStep2_Methodology = () => (
    <div className="space-y-8 animate-fadeIn">
      <h2 className="text-xl font-bold text-gray-800 flex items-center">
        <Activity className="mr-2 text-medical-600" />
        {t.wizard.step2Title}
      </h2>
      <p className="text-gray-600 text-sm">{t.wizard.step2Desc}</p>

      {/* Q1 */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <p className="font-medium text-gray-900 mb-3">{t.wizard.q1}</p>
        <div className="flex gap-4">
          <button
            onClick={() => setHasIntervention('yes')}
            className={`flex-1 py-3 px-4 rounded-md border ${hasIntervention === 'yes' ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
          >
            {t.wizard.yesExp}
          </button>
          <button
            onClick={() => {
                setHasIntervention('no');
                setRandomized(false);
            }}
            className={`flex-1 py-3 px-4 rounded-md border ${hasIntervention === 'no' ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
          >
            {t.wizard.noObs}
          </button>
        </div>
      </div>

      {/* Q2 Randomized */}
      {hasIntervention === 'yes' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-fadeIn">
          <p className="font-medium text-gray-900 mb-3">{t.wizard.q2Rand}</p>
          <div className="flex gap-4">
            <button
              onClick={() => setRandomized(true)}
              className={`flex-1 py-3 px-4 rounded-md border ${randomized ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              {t.wizard.yesRCT}
            </button>
            <button
              onClick={() => setRandomized(false)}
              className={`flex-1 py-3 px-4 rounded-md border ${randomized === false ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              {t.wizard.noQuasi}
            </button>
          </div>
        </div>
      )}

      {/* Q2 Comparison */}
      {hasIntervention === 'no' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-fadeIn">
          <p className="font-medium text-gray-900 mb-3">{t.wizard.q2Comp}</p>
          <div className="flex gap-4">
            <button
              onClick={() => setHasControl('yes')}
              className={`flex-1 py-3 px-4 rounded-md border ${hasControl === 'yes' ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              {t.wizard.yesAnalytic}
            </button>
            <button
              onClick={() => {
                  setHasControl('no');
                  setTimeDirection('cross-sectional');
              }}
              className={`flex-1 py-3 px-4 rounded-md border ${hasControl === 'no' ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              {t.wizard.noDesc}
            </button>
          </div>
        </div>
      )}

      {/* Q3 Time */}
      {hasIntervention === 'no' && hasControl === 'yes' && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-fadeIn">
          <p className="font-medium text-gray-900 mb-3">{t.wizard.q3Time}</p>
          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => setTimeDirection('prospective')}
              className={`py-3 px-4 text-left rounded-md border ${timeDirection === 'prospective' ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              {t.wizard.prosp}
            </button>
            <button
              onClick={() => setTimeDirection('retrospective')}
              className={`py-3 px-4 text-left rounded-md border ${timeDirection === 'retrospective' ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              {t.wizard.retro}
            </button>
            <button
              onClick={() => setTimeDirection('cross-sectional')}
              className={`py-3 px-4 text-left rounded-md border ${timeDirection === 'cross-sectional' ? 'bg-medical-50 border-medical-500 text-medical-700' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
            >
              {t.wizard.cross}
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
           onClick={() => setStep(1)}
           className="text-gray-600 hover:text-gray-900"
        >
            {t.wizard.back}
        </button>
        <button
          onClick={generateProtocol}
          disabled={hasIntervention === null || (hasIntervention === 'no' && hasControl === null)}
          className="bg-medical-600 text-white px-6 py-2 rounded-lg hover:bg-medical-700 disabled:opacity-50 flex items-center shadow-lg"
        >
          {t.wizard.generate} <Check className="ml-2 w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg border border-gray-100 mt-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${step >= 1 ? 'text-medical-600' : 'text-gray-400'}`}>1. PICO</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${step >= 2 ? 'text-medical-600' : 'text-gray-400'}`}>2. {t.form.tabs.Design}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
                className="h-full bg-medical-500 transition-all duration-500 ease-out"
                style={{ width: step === 1 ? '50%' : '100%' }}
            ></div>
        </div>
      </div>

      {step === 1 ? renderStep1_PICO() : renderStep2_Methodology()}
    </div>
  );
};