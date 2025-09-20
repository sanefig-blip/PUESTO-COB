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
] as const;

export type Rank = typeof RANKS[number];

export interface User {
    id: string;
    username: string;
    password: string;
    role: 'admin' | 'station';
    station?: string;
}

export interface Personnel {
    id: string;
    name: string;
    rank: Rank;
    station?: string;
    detachment?: string;
    poc?: string;
    part?: string;
}

export interface Officer {
    id: string;
    role: string;
    rank: Rank;
    name: string;
}

export interface Assignment {
    id: string;
    location: string;
    time: string;
    implementationTime?: string;
    personnel: string;
    details?: string[];
    unit?: string;
    inService?: boolean;
    serviceEnded?: boolean;
    // For grouped view
    serviceTitle?: string;
    novelty?: string;
}

export interface Service {
    id: string;
    title: string;
    description?: string;
    novelty?: string;
    isHidden: boolean;
    assignments: Assignment[];
}

export interface Schedule {
    date: string;
    commandStaff: Officer[];
    services: Service[];
    sportsEvents: Service[];
}

export interface Roster {
    [dateKey: string]: {
        jefeInspecciones?: string;
        jefeServicio?: string;
        jefeGuardia?: string;
        jefeReserva?: string;
    };
}

export type ServiceTemplate = Service & {
    templateId: string;
};

export const rankOrder: { [key in Rank | string]: number } = {
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

// New types for the Unit Report
export interface FireUnit {
  id: string;
  type: string;
  status: string;
  outOfServiceReason?: string;
  officerInCharge?: string;
  poc?: string;
  personnelCount?: number | null;
  internalId?: string;
}

export interface UnitGroup {
  name: string;
  units: FireUnit[];
  crewOfficers?: string[];
  standbyOfficers?: string[];
  servicesOfficers?: string[];
  totalPersonnel?: number;
}

export interface Zone {
  name: string;
  groups: UnitGroup[];
}

export interface UnitReportData {
  reportDate: string;
  zones: Zone[];
}

// New types for ERA Report
export interface EraEquipment {
  id: string;
  brand: string;
  voltage: string;
  condition: string;
  dependency: string;
}

export interface EraReportStation {
  name: string;
  hasEquipment: boolean;
  equipment: EraEquipment[];
}

export interface EraData {
  reportDate: string;
  stations: EraReportStation[];
}

// New types for Generator Report
export interface GeneratorEquipment {
  id: string;
  brand: string;
  kva: string;
  condition: string;
  dependency: string;
}

export interface GeneratorReportStation {
  name: string;
  hasEquipment: boolean;
  equipment: GeneratorEquipment[];
}

export interface GeneratorData {
  reportDate: string;
  stations: GeneratorReportStation[];
}


// SCI Forms Types
export interface SCI201Action {
    id: number;
    time: string;
    summary: string;
}

export interface SCI201Data {
    incidentName: string;
    prepDateTime: string;
    incidentLocation: string;
    evalNature: string;
    evalThreats: string;
    evalAffectedArea: string;
    evalIsolation: string;
    initialObjectives: string;
    strategies: string;
    tactics: string;
    pcLocation: string;
    eLocation: string;
    ingressRoute: string;
    egressRoute: string;
    safetyMessage: string;
    incidentCommander: string;
    mapOrSketch: string;
    orgChart: string;
    actions: SCI201Action[];
}

export interface SCI211Resource {
    id: number;
    requestedBy: string;
    requestDateTime: string;
    classType: string; // 'class' is a reserved keyword
    resourceType: string;
    arrivalDateTime: string;
    institution: string;
    matricula: string;
    personnelCount: string;
    status: 'Disponible' | 'No Disponible';
    assignedTo: string;
    demobilizedBy: string;
    demobilizedDateTime: string;
    observations: string;
}

export type TriageCategory = 'Rojo' | 'Amarillo' | 'Verde' | 'Negro' | '';

export interface SCI207Victim {
    id: number;
    patientName: string;
    sex: string;
    age: string;
    triage: TriageCategory;
    transportLocation: string;
    transportedBy: string;
    transportDateTime: string;
}

// New types for Materials Report
export interface Material {
  id: string;
  name: string;
  quantity: number;
  condition: 'Para Servicio' | 'Fuera de Servicio';
  location?: string;
}

export interface MaterialLocation {
  name: string;
  materials: Material[];
}

export interface MaterialsData {
  reportDate: string;
  locations: MaterialLocation[];
}

// New types for Hidro Alert
export interface AlertPoint {
  id: string;
  panorama: number;
  type: 'Punto Fijo' | 'Recorrido' | 'Unidad Adicional';
  location: string;
  organism: string;
  coords?: [number, number] | null;
  assignedUnit: string;
  status: 'Pendiente' | 'Desplazado' | 'En QTH' | 'Normalizado';
  notes: string;
}

export interface Underpass {
  id: number;
  name: string;
  commune: string;
  location: string;
  coords: [number, number] | null;
}

export interface HidroAlertData {
  alertPoints: AlertPoint[];
  underpasses: Underpass[];
}

// New types for Regimen de Intervencion
export interface RegimenTableRow {
  id: string;
  [key: string]: any;
}

export interface RegimenTable {
  type: 'table';
  headers: string[];
  rows: RegimenTableRow[];
  notes?: string[];
}

export interface RegimenText {
  type: 'text';
  content: string;
  style?: 'normal' | 'bold' | 'italic';
}

export interface RegimenList {
    type: 'list';
    items: string[];
}

export interface RegimenSubtitle {
    type: 'subtitle';
    content: string;
}

export interface RegimenMap {
    id: string;
    type: 'map';
    title: string;
    imageUrl: string;
}

export type RegimenContent = RegimenText | RegimenTable | RegimenList | RegimenSubtitle | RegimenMap;


export interface RegimenSection {
  id: string;
  title: string;
  content: RegimenContent[];
}

export interface RegimenData {
  title: string;
  lastUpdated: string;
  sections: RegimenSection[];
}

// --- Command Post Types ---
export interface CommandPostTrackedUnit {
  id: string;
  unit: string;
  aCargo: string;
  dotacion: string;
  hSalida: string;
  hLugar: string;
  hRegreso: string;
  novedades: string;
  despachado: boolean;
}

export interface TrackedUnit extends FireUnit {
    groupName: string;
    task: string;
    locationInScene: string;
    workTime: string;
    departureTime: string;
    onSceneTime: string;
    returnTime: string;
    lat?: number;
    lng?: number;
    mapLabel?: string;
    mapColor?: string;
}

export interface TrackedPersonnel extends Personnel {
    groupName: string;
}

export interface InterventionGroup {
    id: string;
    type: 'Frente' | 'Unidad Operativa';
    name: string;
    officerInCharge: string;
    units: TrackedUnit[];
    personnel: TrackedPersonnel[];
    lat?: number;
    lng?: number;
}

// New type for Change Log
export interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}
