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
  interventions: string;
  
  // Evaluations
  evaluationsGeneral: string;
  evaluationsPrimary: string;
  evaluationsSecondary: string[];
  otherVariables: string[];
  
  // Statistics & Methodology (New Structure)
  sampleSizeJustification: string; // Final Text
  sampleSizeMethod: 'power' | 'precision' | 'convenience' | ''; // Logic
  statsParams: {
    alpha: string;
    power: string; // 1-beta
    precision: string; // Confidence Interval width
    dropoutRate: string;
    deltaOrEffectSize: string;
  };
  
  numPhysicians: string;
  subjectsPerPhysician: string;
  totalSubjects: string;
  
  statisticalAnalysis: string[]; // Final Text List
  analysisHypothesis: 'superiority' | 'non_inferiority' | 'equivalence' | 'exploratory' | '';
  detailedHypothesis: string; // New textual hypothesis
  primaryVariableType: 'continuous' | 'binary' | 'time_to_event' | '';
  confounders: string; // Adjustment variables
  
  // Operations
  recruitmentProcess: string;
  dataProcessing: string;
  
  // Admin
  investigatorsLocation: string;
  dates: {
    presentation: string;
    protocol: string;
    ethicsCommittee: string;
    startDate: string;
    inclusionPeriod: string;
  };
  proposedBy: string;
  proposalDate: string;
  bibliography: string;
}

export enum SectionTab {
  GENERAL = 'General',
  RATIONALE = 'Rationale',
  OBJECTIVES = 'Objectives',
  POPULATION = 'Population',
  DESIGN = 'Design',
  STATS = 'Statistics',
  ADMIN = 'Admin',
  BIBLIOGRAPHY = 'Bibliography'
}

export type AppView = 'welcome' | 'wizard' | 'editor';

export type Language = 'es' | 'en';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Record<string, any>; // Dictionary
}