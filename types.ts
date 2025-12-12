export interface ProtocolData {
  // General Info
  title: string;
  sponsor: string;
  contextSummary: string;
  tradeName: string;
  activeIngredient: string;
  phase: string;
  
  // Rationale
  rationalePrimary: string;
  rationaleSecondary: string;
  
  // Objectives
  measurementScales: string[]; // Changed to Array
  primaryObjective: string;
  secondaryObjectives: string[];
  
  // Population
  selectionMethod: string;
  populationDescription: string;
  inclusionCriteria: string[];
  exclusionCriteria: string[];
  
  // Design & Interventions
  studyType: string;
  studyDesign: string;
  designModel: 'parallel' | 'crossover' | 'single_group' | 'factorial' | 'pre_post' | ''; 
  controlType: 'placebo' | 'active' | 'historical' | 'none' | '';
  isNested: boolean;
  followUpDuration: string; 
  interventions: string;
  
  // Evaluations
  evaluationsGeneral: string;
  evaluationsPrimary: string;
  evaluationsSecondary: string[];
  variableDefinitions: string[]; 
  otherVariables: string[];
  
  // Statistics
  sampleSizeJustification: string;
  sampleSizeMethod: 'power' | 'precision' | 'convenience' | '';
  statsParams: {
    alpha: string;
    power: string;
    precision: string;
    dropoutRate: string;
    deltaOrEffectSize: string;
  };
  
  numPhysicians: string;
  subjectsPerPhysician: string;
  totalSubjects: string;
  
  statisticalAnalysis: string[];
  analysisHypothesis: 'superiority' | 'non_inferiority' | 'equivalence' | 'exploratory' | '';
  detailedHypothesis: string;
  primaryVariableType: 'continuous' | 'binary' | 'time_to_event' | '';
  confounders: string;
  
  // Operations
  recruitmentProcess: string;
  dataProcessing: string;
  
  // Admin & Schedule (Refined)
  investigatorsLocation: string;
  schedule: {
    ethicsSubmission: string;
    siteInitiation: string;
    firstPatientIn: string; // FPI
    interimAnalysis: string; // Optional
    lastPatientOut: string; // LPO
    dbLock: string;
    finalReport: string;
  };
  proposedBy: string;
  proposalDate: string;
  bibliography: string;
  appendices: string; 
}

export enum SectionTab {
  GENERAL = 'General',
  RATIONALE = 'Rationale',
  OBJECTIVES = 'Objectives',
  POPULATION = 'Population',
  DESIGN = 'Design',
  STATS = 'Statistics',
  ADMIN = 'Admin',
  BIBLIOGRAPHY = 'Bibliography',
  APPENDICES = 'Appendices'
}

export type AppView = 'welcome' | 'wizard' | 'editor';

export type Language = 'es' | 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Record<string, any>;
}