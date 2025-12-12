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
  measurementScales: '',
  primaryObjective: '',
  secondaryObjectives: [''],
  selectionMethod: '',
  populationDescription: '',
  inclusionCriteria: [''],
  exclusionCriteria: [''],
  studyType: '',
  studyDesign: '',
  designModel: '',
  controlType: '',
  isNested: false,
  followUpDuration: '',
  interventions: '',
  evaluationsGeneral: '',
  evaluationsPrimary: '',
  evaluationsSecondary: [''],
  variableDefinitions: [''],
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
  schedule: {
    ethicsSubmission: '',
    siteInitiation: '',
    firstPatientIn: '',
    interimAnalysis: '',
    lastPatientOut: '',
    dbLock: '',
    finalReport: ''
  },
  proposedBy: '',
  proposalDate: new Date().toLocaleDateString(),
  bibliography: ''
};