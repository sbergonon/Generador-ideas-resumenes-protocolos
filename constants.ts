import { ProtocolData } from './types';

export const INITIAL_PROTOCOL_DATA: ProtocolData = {
  title: '',
  sponsor: '',
  contextSummary: '',
  tradeName: '',
  activeIngredient: '',
  phase: '',
  rationalePrimary: '',
  rationaleSecondary: '',
  primaryObjective: '',
  secondaryObjectives: [''],
  selectionMethod: '',
  populationDescription: '',
  inclusionCriteria: [''],
  exclusionCriteria: [''],
  studyType: '',
  studyDesign: '',
  interventions: '',
  evaluationsGeneral: '',
  evaluationsPrimary: '',
  evaluationsSecondary: [''],
  otherVariables: [''],
  
  // Stats
  sampleSizeJustification: '',
  sampleSizeMethod: '',
  statsParams: {
    alpha: '0.05',
    power: '0.80',
    precision: '95%',
    dropoutRate: '15%',
    deltaOrEffectSize: ''
  },
  numPhysicians: '',
  subjectsPerPhysician: '',
  totalSubjects: '',
  
  statisticalAnalysis: [''],
  analysisHypothesis: '',
  detailedHypothesis: '',
  primaryVariableType: '',
  confounders: '',

  recruitmentProcess: '',
  dataProcessing: '',
  investigatorsLocation: '',
  dates: {
    presentation: '',
    protocol: '',
    ethicsCommittee: '',
    startDate: '',
    inclusionPeriod: ''
  },
  proposedBy: '',
  proposalDate: new Date().toLocaleDateString(),
  bibliography: ''
};