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
    LogEntry,
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
    changeLog: 'changeLogData',
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
    [DATA_KEYS.changeLog]: [],
};

// --- Real-Time Synchronization via MQTT ---
const MQTT_BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const MQTT_TOPIC = 'bomberos-ciudad-sync/data-v2-a4b1';
const clientId = `bomberos-client-${Math.random().toString(16).substr(2, 8)}`;
let mqttClient: mqtt.MqttClient | null = null;

const dispatchMqttStatus = (status: string) => {
    window.dispatchEvent(new CustomEvent('mqttstatus', { detail: { status } }));
};

const connectMqtt = () => {
    try {
        console.log(`Connecting to MQTT broker at ${MQTT_BROKER_URL} with client ID: ${clientId}`);
        dispatchMqttStatus('Conectando...');
        mqttClient = mqtt.connect(MQTT_BROKER_URL, {
            clientId,
            reconnectPeriod: 2000,
            connectTimeout: 5000,
        });

        mqttClient.on('connect', () => {
            console.log('Successfully connected to MQTT Broker for real-time sync.');
            dispatchMqttStatus('Conectado');
            mqttClient?.subscribe(MQTT_TOPIC, { qos: 1 }, (err) => {
                if (err) {
                    console.error('MQTT subscription failed:', err);
                } else {
                    console.log(`Successfully subscribed to topic: ${MQTT_TOPIC}`);
                }
            });
        });

        mqttClient.on('message', (topic, message) => {
            if (topic === MQTT_TOPIC) {
                try {
                    const { key, data, senderId } = JSON.parse(message.toString());
                    if (senderId === clientId) return;

                    console.log(`Received remote update for key: "${key}" from sender: ${senderId}`);
                    localStorage.setItem(key, JSON.stringify(data));
                    window.dispatchEvent(new CustomEvent('datachanged', { detail: { key, data } }));
                } catch (e) {
                    console.error('Error parsing MQTT message:', e);
                }
            }
        });

        mqttClient.on('error', (err) => console.error('MQTT Client Error:', err));
        mqttClient.on('reconnect', () => {
            console.log('MQTT client is attempting to reconnect...');
            dispatchMqttStatus('Reconectando...');
        });
        mqttClient.on('close', () => {
            console.log('MQTT connection closed.');
            dispatchMqttStatus('Desconectado');
        });
        mqttClient.on('offline', () => {
            console.log('MQTT client went offline.');
            dispatchMqttStatus('Sin conexión');
        });

    } catch (e) {
        console.error('Failed to initialize MQTT client connection:', e);
    }
};

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
    localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('datachanged', { detail: { key, data } }));
    
    if (mqttClient && mqttClient.connected) {
        const payload = JSON.stringify({ key, data, senderId: clientId });
        mqttClient.publish(MQTT_TOPIC, payload, { qos: 1 }, (err) => {
            if (err) {
                console.error(`MQTT publish error for key "${key}":`, err);
            } else {
                console.log(`Successfully published update for key: "${key}"`);
            }
        });
    } else {
        console.warn(`MQTT client not connected. Update for "${key}" was not sent in real-time.`);
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
    saveChangeLog: (data: LogEntry[]) => saveData(DATA_KEYS.changeLog, data),

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