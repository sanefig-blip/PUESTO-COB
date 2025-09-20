import mqtt from 'mqtt';
import {
    Schedule,
    UnitReportData,
    EraData,
    GeneratorData,
    MaterialsData,
    HidroAlertData,
    RegimenData,
    InterventionGroup,
    Personnel,
    Roster,
    ServiceTemplate,
    User,
} from '../types';

import { scheduleData as preloadedScheduleData } from '../data/scheduleData';
import { unitReportData as preloadedUnitReportData } from '../data/unitReportData';
import { eraData as preloadedEraData } from '../data/eraData';
import { generatorData as preloadedGeneratorData } from '../data/generatorData';
import { materialsData as preloadedMaterialsData } from '../data/materialsData';
import { hidroAlertData as preloadedHidroAlertData } from '../data/hidroAlertData';
import { regimenData as preloadedRegimenData } from '../data/regimenData';
import { rosterData as preloadedRosterData } from '../data/rosterData';
import { commandPersonnelData as defaultCommandPersonnel } from '../data/commandPersonnelData';
import { servicePersonnelData as defaultServicePersonnel } from '../data/servicePersonnelData';
import { defaultUnits } from '../data/unitData';
import { defaultUnitTypes } from '../data/unitTypeData';
import { defaultServiceTemplates } from '../data/serviceTemplates';
import { users as defaultUsers } from '../data/userData';

const DATA_KEYS = {
    schedule: 'scheduleData',
    unitReport: 'unitReportData',
    eraReport: 'eraReportData',
    generatorReport: 'generatorReportData',
    materials: 'materialsData',
    hidroAlert: 'hidroAlertData',
    regimen: 'regimenData',
    interventionGroups: 'interventionGroups',
    commandPersonnel: 'commandPersonnel',
    servicePersonnel: 'servicePersonnel',
    unitList: 'unitList',
    unitTypes: 'unitTypes',
    roster: 'rosterData',
    templates: 'serviceTemplates',
    users: 'usersData',
};

const DEFAULTS = {
    [DATA_KEYS.schedule]: preloadedScheduleData,
    [DATA_KEYS.unitReport]: preloadedUnitReportData,
    [DATA_KEYS.eraReport]: preloadedEraData,
    [DATA_KEYS.generatorReport]: preloadedGeneratorData,
    [DATA_KEYS.materials]: preloadedMaterialsData,
    [DATA_KEYS.hidroAlert]: preloadedHidroAlertData,
    [DATA_KEYS.regimen]: preloadedRegimenData,
    [DATA_KEYS.interventionGroups]: [],
    [DATA_KEYS.commandPersonnel]: defaultCommandPersonnel,
    [DATA_KEYS.servicePersonnel]: defaultServicePersonnel,
    [DATA_KEYS.unitList]: defaultUnits,
    [DATA_KEYS.unitTypes]: defaultUnitTypes,
    [DATA_KEYS.roster]: preloadedRosterData,
    [DATA_KEYS.templates]: defaultServiceTemplates,
    [DATA_KEYS.users]: defaultUsers,
};

// --- Real-Time Synchronization via MQTT ---
const MQTT_BROKER_URL = 'wss://broker.hivemq.com:8884/mqtt';
// NOTE: This is a public, unauthenticated channel for demonstration purposes.
// For a production environment, use a private broker with authentication.
const MQTT_TOPIC = 'bomberos-ciudad-sync/data-3a9f';
const clientId = `bomberos-client-${Math.random().toString(16).substr(2, 8)}`;
let mqttClient: mqtt.MqttClient | null = null;

const connectMqtt = () => {
    try {
        console.log(`Connecting to MQTT broker at ${MQTT_BROKER_URL}`);
        mqttClient = mqtt.connect(MQTT_BROKER_URL);

        mqttClient.on('connect', () => {
            console.log('Connected to MQTT Broker for real-time sync.');
            mqttClient?.subscribe(MQTT_TOPIC, (err) => {
                if (err) {
                    console.error('MQTT subscription error:', err);
                } else {
                    console.log(`Subscribed to topic: ${MQTT_TOPIC}`);
                }
            });
        });

        mqttClient.on('message', (topic, message) => {
            if (topic === MQTT_TOPIC) {
                try {
                    const { key, data, senderId } = JSON.parse(message.toString());
                    
                    if (senderId === clientId) {
                        return; // Ignore messages from self
                    }

                    console.log(`Received remote update for ${key} from ${senderId}`);
                    
                    // Save remote data to local storage
                    localStorage.setItem(key, JSON.stringify(data));
                    
                    // Notify local components of the remote update
                    window.dispatchEvent(new CustomEvent('datachanged', { detail: { key, data } }));

                } catch (e) {
                    console.error('Error parsing MQTT message:', e);
                }
            }
        });

        mqttClient.on('error', (err) => {
            console.error('MQTT Connection Error:', err);
        });
        
        mqttClient.on('close', () => {
            console.log('MQTT connection closed.');
        });
    } catch (e) {
        console.error('Failed to initialize MQTT client:', e);
    }
};

// Initiate connection on module load
connectMqtt();
// --- End of Real-Time Sync Logic ---

const loadData = <T,>(key: string, defaultValue: T): T => {
    try {
        const savedData = localStorage.getItem(key);
        return savedData ? JSON.parse(savedData) : defaultValue;
    } catch (e) {
        console.error(`Failed to load data for key "${key}"`, e);
        return defaultValue;
    }
};

const saveData = (key: string, data: any) => {
    // 1. Save to local storage
    localStorage.setItem(key, JSON.stringify(data));
    
    // 2. Notify local components (other tabs)
    window.dispatchEvent(new CustomEvent('datachanged', { detail: { key, data } }));
    
    // 3. Broadcast to remote clients
    if (mqttClient && mqttClient.connected) {
        const payload = JSON.stringify({ key, data, senderId: clientId });
        mqttClient.publish(MQTT_TOPIC, payload, { qos: 1 }, (err) => {
            if (err) {
                console.error('MQTT publish error:', err);
            }
        });
    }
};

export const dataService = {
    loadAllData: () => {
        const allData: { [key: string]: any } = {};
        for (const [name, key] of Object.entries(DATA_KEYS)) {
            allData[name] = loadData(key, (DEFAULTS as any)[key]);
        }
        return allData;
    },

    saveSchedule: (data: Schedule) => saveData(DATA_KEYS.schedule, data),
    saveUnitReport: (data: UnitReportData) => saveData(DATA_KEYS.unitReport, data),
    saveEraReport: (data: EraData) => saveData(DATA_KEYS.eraReport, data),
    saveGeneratorReport: (data: GeneratorData) => saveData(DATA_KEYS.generatorReport, data),
    saveMaterials: (data: MaterialsData) => saveData(DATA_KEYS.materials, data),
    saveHidroAlert: (data: HidroAlertData) => saveData(DATA_KEYS.hidroAlert, data),
    saveRegimen: (data: RegimenData) => saveData(DATA_KEYS.regimen, data),
    saveInterventionGroups: (data: InterventionGroup[]) => saveData(DATA_KEYS.interventionGroups, data),
    saveCommandPersonnel: (data: Personnel[]) => saveData(DATA_KEYS.commandPersonnel, data),
    saveServicePersonnel: (data: Personnel[]) => saveData(DATA_KEYS.servicePersonnel, data),
    saveUnitList: (data: string[]) => saveData(DATA_KEYS.unitList, data),
    saveUnitTypes: (data: string[]) => saveData(DATA_KEYS.unitTypes, data),
    saveRoster: (data: Roster) => saveData(DATA_KEYS.roster, data),
    saveTemplates: (data: ServiceTemplate[]) => saveData(DATA_KEYS.templates, data),
    saveUsers: (data: User[]) => saveData(DATA_KEYS.users, data),

    subscribe: (callback: (event: CustomEvent) => void) => {
        window.addEventListener('datachanged', callback as EventListener);
    },
    unsubscribe: (callback: (event: CustomEvent) => void) => {
        window.removeEventListener('datachanged', callback as EventListener);
    },
    
    resetAllData: () => {
        if(window.confirm("¿Está seguro de que desea borrar todos los datos locales y restaurar los valores predeterminados? Esta acción no se puede deshacer.")) {
            localStorage.clear();
            location.reload();
        }
    }
};