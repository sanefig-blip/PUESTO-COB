export const RANKS = [
  'JEFE DE CUERPO DE BOMBEROS',
  'SUBJEFE DE CUERPO DE BOMBEROS',
  'COMANDANTE GENERAL',
  'COMANDANTE DIRECTOR',
  'COMANDANTE',
  'SUBCOMANDANTE',
  'CAPITAN',
  'TENIENTE',
  'SUBTENIENTE',
  'BOMBERO SUPERIOR',
  'BOMBERO CALIFICADO',
  'PRINCIPAL',
  'AUXILIAR NIVEL E',
  'AUXILIAR NIVEL F',
  'AUXILIAR NIVEL G',
  'AUXILIAR NIVEL H',
  'OTRO'
];

export const rankOrder = {
  'JEFE DE CUERPO DE BOMBEROS': 1,
  'SUBJEFE DE CUERPO DE BOMBEROS': 2,
  'COMANDANTE GENERAL': 3,
  'COMANDANTE DIRECTOR': 4,
  'COMANDANTE': 5,
  'SUBCOMANDANTE': 6,
  'CAPITAN': 7,
  'TENIENTE': 8,
  'SUBTENIENTE': 9,
  'BOMBERO SUPERIOR': 10,
  'BOMBERO CALIFICADO': 11,
  'PRINCIPAL': 12,
  'AUXILIAR NIVEL E': 13,
  'AUXILIAR NIVEL F': 14,
  'AUXILIAR NIVEL G': 15,
  'AUXILIAR NIVEL H': 16,
  'OTRO': 17
};
// --- Command Post Types ---
// Estas son interfaces en TS, pero las exportamos como placeholders en JS
// La forma real es definida por el uso en los componentes.
export const CommandPostTrackedUnit = {};
export const TrackedUnit = {};
export const TrackedPersonnel = {};
export const InterventionGroup = {};

// User interface: { id, username, password, role, station }
// SCI Forms Types - these are interfaces in TS, but we export them as placeholders
// The actual shape is defined by usage in the components.
export const SCI201Action = {};
export const SCI201Data = {};
export const SCI211Resource = {};
export const TriageCategory = '';
export const SCI207Victim = {};

// ERA Report Types
export const EraEquipment = {};
export const EraReportStation = {};
export const EraData = {};

// Generator Report Types
export const GeneratorEquipment = {};
export const GeneratorReportStation = {};
export const GeneratorData = {};

// Materials Report Types
export const Material = {};
export const MaterialLocation = {};
export const MaterialsData = {};

// Hidro Alert Types
export const AlertPoint = {};
export const Underpass = {};
export const HidroAlertData = {};

// New types for Regimen de Intervencion
export const RegimenMap = {};
