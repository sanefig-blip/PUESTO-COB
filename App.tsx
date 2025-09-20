import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { rankOrder, Schedule, Personnel, Rank, Roster, Service, Officer, ServiceTemplate, Assignment, UnitReportData, EraData, GeneratorData, MaterialsData, Zone, UnitGroup, MaterialLocation, User, HidroAlertData, RegimenData, InterventionGroup, LogEntry, FireUnit } from './types';
import { dataService } from './services/dataService';
import { exportScheduleToWord, exportScheduleByTimeToWord, exportScheduleAsExcelTemplate, exportScheduleAsWordTemplate, exportRosterWordTemplate } from './services/exportService';
import { parseScheduleFromFile, parseFullUnitReportFromExcel, parseRosterFromWord, parseUnitReportFromPdf } from './services/wordImportService';
import ScheduleDisplay from './components/ScheduleDisplay';
import TimeGroupedScheduleDisplay from './components/TimeGroupedScheduleDisplay';
import Nomenclador from './components/Nomenclador';
import UnitReportDisplay from './components/UnitReportDisplay';
import UnitStatusView from './components/UnitStatusView';
import CommandPostParentView from './components/CommandPostParentView';
import EraReportDisplay from './components/EraReportDisplay';
import GeneratorReportDisplay from './components/GeneratorReportDisplay';
import MaterialsDisplay from './components/MaterialsDisplay';
import MaterialStatusView from './components/MaterialStatusView';
import HidroAlertView from './components/HidroAlertView';
import RegimenDeIntervencion from './components/RegimenDeIntervencion';
import ForestalView from './components/ForestalView';
import ChangeLogView from './components/ChangeLogView';
import Login from './components/Login';
import { BookOpenIcon, DownloadIcon, ClockIcon, ClipboardListIcon, RefreshIcon, EyeIcon, EyeOffIcon, UploadIcon, QuestionMarkCircleIcon, BookmarkIcon, ChevronDownIcon, FireIcon, FilterIcon, AnnotationIcon, LightningBoltIcon, MapIcon, CubeIcon, ClipboardCheckIcon, LogoutIcon, ShieldExclamationIcon, SunIcon, MaximizeIcon, MinimizeIcon, DocumentTextIcon, ArchiveBoxIcon, CloudArrowDownIcon } from './components/icons';
import HelpModal from './components/HelpModal';
import ServiceTemplateModal from './components/ServiceTemplateModal';
import ExportTemplateModal from './components/ExportTemplateModal';

const parseDateFromString = (dateString: string): Date => {
    const cleanedDateString = dateString.replace(/GUARDIA DEL DIA/i, '').replace('.-', '').trim();
    const monthNames: { [key: string]: number } = { "ENERO": 0, "FEBRERO": 1, "MARZO": 2, "ABRIL": 3, "MAYO": 4, "JUNIO": 5, "JULIO": 6, "AGOSTO": 7, "SEPTIEMBRE": 8, "OCTUBRE": 9, "NOVIEMBRE": 10, "DICIEMBRE": 11 };
    const parts = cleanedDateString.split(/DE\s/i);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = monthNames[parts[1].toUpperCase().trim()];
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && month !== undefined && !isNaN(year)) return new Date(year, month, day);
    }
    console.warn("Could not parse date from string:", dateString);
    return new Date();
};


const App: React.FC = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [schedule, setSchedule] = useState<Schedule | null>(null);
    const [unitReport, setUnitReport] = useState<UnitReportData | null>(null);
    const [eraReport, setEraReport] = useState<EraData | null>(null);
    const [generatorReport, setGeneratorReport] = useState<GeneratorData | null>(null);
    const [materialsReport, setMaterialsReport] = useState<MaterialsData | null>(null);
    const [hidroAlertData, setHidroAlertData] = useState<HidroAlertData | null>(null);
    const [regimen, setRegimen] = useState<RegimenData | null>(null);
    const [interventionGroups, setInterventionGroups] = useState<InterventionGroup[]>([]);
    const [changeLog, setChangeLog] = useState<LogEntry[]>([]);
    const [view, setView] = useState('unit-report');
    const [displayDate, setDisplayDate] = useState<Date | null>(null);
    const [commandPersonnel, setCommandPersonnel] = useState<Personnel[]>([]);
    const [servicePersonnel, setServicePersonnel] = useState<Personnel[]>([]);
    const [unitList, setUnitList] = useState<string[]>([]);
    const [unitTypes, setUnitTypes] = useState<string[]>([]);
    const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
    const [serviceTemplates, setServiceTemplates] = useState<ServiceTemplate[]>([]);
    const [roster, setRoster] = useState<Roster>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [usersData, setUsersData] = useState<User[]>([]);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [mqttStatus, setMqttStatus] = useState('Conectando...');

    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [templateModalProps, setTemplateModalProps] = useState<any>({});
    const [isExportTemplateModalOpen, setIsExportTemplateModalOpen] = useState(false);
    const [isImportMenuOpen, setImportMenuOpen] = useState(false);
    const [isExportMenuOpen, setExportMenuOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const unitReportFileInputRef = useRef<HTMLInputElement>(null);
    const unitReportPdfFileInputRef = useRef<HTMLInputElement>(null);
    const rosterInputRef = useRef<HTMLInputElement>(null);
    const importMenuRef = useRef<HTMLDivElement>(null);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    const navScrollRef = useRef<HTMLDivElement>(null);
    const [showScrollIndicators, setShowScrollIndicators] = useState({ left: false, right: false });

    const isDown = useRef(false);
    const startX = useRef(0);
    const scrollLeft = useRef(0);

    const [showUpdateNotification, setShowUpdateNotification] = useState(false);
    const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

    const onUpdate = () => {
        waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
        setShowUpdateNotification(false);
        window.location.reload();
    };

    useEffect(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').then(registration => {
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                setWaitingWorker(newWorker);
                                setShowUpdateNotification(true);
                            }
                        });
                    }
                });
            }).catch(error => {
                console.error('Service Worker registration failed:', error);
            });
        }
    }, []);

    const handleLogin = (user: User) => {
        setCurrentUser(user);
    };

    const handleLogout = () => {
        setCurrentUser(null);
    };

    const addLogEntry = (action: string, details: string) => {
        const newEntry: LogEntry = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: currentUser?.username || 'Sistema',
            action,
            details,
        };
        const updatedLog = [newEntry, ...changeLog];
        dataService.saveChangeLog(updatedLog);
    };

    const handleClearLog = () => {
        if (window.confirm("¿Está seguro de que desea borrar todo el registro de cambios? Esta acción no se puede deshacer.")) {
            addLogEntry('Limpieza de Registro', `El usuario ${currentUser?.username} ha limpiado el registro de cambios.`);
            dataService.saveChangeLog([]);
        }
    };


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isImportMenuOpen && importMenuRef.current && !importMenuRef.current.contains(event.target as Node)) {
                setImportMenuOpen(false);
            }
            if (isExportMenuOpen && exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setExportMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isImportMenuOpen, isExportMenuOpen]);

    const showToast = (message: string) => {
        const toast = document.createElement('div');
        toast.className = 'fixed top-24 right-8 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 3000);
    };

    const loadGuardLineFromRoster = useCallback((dateToLoad: Date, currentStaff: Officer[], currentCommandPersonnel: Personnel[], currentRoster: Roster) => {
        if (!dateToLoad || !currentRoster) return currentStaff;
        const dateKey = `${dateToLoad.getFullYear()}-${String(dateToLoad.getMonth() + 1).padStart(2, '0')}-${String(dateToLoad.getDate()).padStart(2, '0')}`;
        const dayRoster = currentRoster[dateKey];
        const rolesMap = [
            { key: 'jefeInspecciones', label: 'JEFE DE INSPECCIONES' },
            { key: 'jefeServicio', label: 'JEFE DE SERVICIO' },
            { key: 'jefeGuardia', label: 'JEFE DE GUARDIA' },
            { key: 'jefeReserva', label: 'JEFE DE RESERVA' }
        ];
// FIX: Explicitly type the return value of the map callback to 'Officer' to ensure type compatibility.
        const finalStaff = rolesMap.map((roleInfo): Officer => {
           const personName = dayRoster?.[roleInfo.key as keyof typeof dayRoster];
           if (personName) {
               const foundPersonnel = currentCommandPersonnel.find(p => p.name === personName);
               if (foundPersonnel) return { role: roleInfo.label, name: foundPersonnel.name, id: foundPersonnel.id, rank: foundPersonnel.rank };
               return { role: roleInfo.label, name: personName, rank: 'OTRO', id: `roster-${dateKey}-${roleInfo.key}` };
           }
           return { role: roleInfo.label, name: "A designar", rank: 'OTRO', id: `empty-${roleInfo.key}` };
        });
        return finalStaff;
    }, []);


    useEffect(() => {
        const loadedData = dataService.loadAllData();
        
        // Process schedule
        const scheduleToLoad = loadedData.schedule as Schedule;
        const dataCopy = JSON.parse(JSON.stringify(scheduleToLoad));
        if (dataCopy.services && !('sportsEvents' in dataCopy)) {
            dataCopy.sportsEvents = dataCopy.services.filter((s: Service) => s.title.toUpperCase().includes('EVENTO DEPORTIVO'));
            dataCopy.services = dataCopy.services.filter((s: Service) => !s.title.toUpperCase().includes('EVENTO DEPORTIVO'));
        }
        setSchedule(dataCopy);
        setDisplayDate(parseDateFromString(dataCopy.date));

        // Process units and materials sync
        const unitReportToLoad = loadedData.unitReport as UnitReportData;
        const materialsReportToLoad = loadedData.materials as MaterialsData;
        if (unitReportToLoad && materialsReportToLoad) {
            const unitReportOrder = unitReportToLoad.zones.flatMap((zone: Zone) => zone.groups.map((group: UnitGroup) => group.name.trim()));
            const materialsMap = new Map(materialsReportToLoad.locations.map((loc: MaterialLocation) => [loc.name.trim(), loc]));
            const sortedAndSyncedLocations = unitReportOrder.map(name => {
                return materialsMap.get(name) || { name: name, materials: [] };
            });

            const originalOrder = materialsReportToLoad.locations.map((l) => l.name.trim()).join(',');
            const newOrder = sortedAndSyncedLocations.map(l => l.name.trim()).join(',');

            if (originalOrder !== newOrder || materialsReportToLoad.locations.length !== sortedAndSyncedLocations.length) {
                materialsReportToLoad.locations = sortedAndSyncedLocations;
                dataService.saveMaterials(materialsReportToLoad); // Will trigger update via listener
            } else {
                 setMaterialsReport(materialsReportToLoad);
            }
        } else {
             setMaterialsReport(materialsReportToLoad);
        }

        // Set all other states
        setUnitReport(unitReportToLoad);
        setEraReport(loadedData.eraReport);
        setGeneratorReport(loadedData.generatorReport);
        setHidroAlertData(loadedData.hidroAlert);
        setRegimen(loadedData.regimen);
        setInterventionGroups(loadedData.interventionGroups);
        setChangeLog(loadedData.changeLog.sort((a: LogEntry, b: LogEntry) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        setCommandPersonnel(loadedData.commandPersonnel);
        setServicePersonnel(loadedData.servicePersonnel);
        setUsersData(loadedData.users);
        setUnitTypes(loadedData.unitTypes);
        setServiceTemplates(loadedData.templates);
        setRoster(loadedData.roster);

        const nomencladorUnits = loadedData.unitList as string[];
        const reportUnits = unitReportToLoad.zones.flatMap((zone: Zone) => zone.groups.flatMap((group: UnitGroup) => group.units.map((unit: FireUnit) => unit.id)));
        const combinedUnits = [...new Set([...nomencladorUnits, ...reportUnits])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setUnitList(combinedUnits);
    }, []);

    useEffect(() => {
        const handleDataChange = (event: CustomEvent) => {
            const { key, data } = event.detail;
            const keyMap: { [key: string]: React.Dispatch<React.SetStateAction<any>> } = {
                'scheduleData': setSchedule,
                'unitReportData': setUnitReport,
                'eraReportData': setEraReport,
                'generatorReportData': setGeneratorReport,
                'materialsData': setMaterialsReport,
                'hidroAlertData': setHidroAlertData,
                'regimenData': setRegimen,
                'interventionGroups': setInterventionGroups,
                'commandPersonnel': setCommandPersonnel,
                'servicePersonnel': setServicePersonnel,
                'unitList': setUnitList,
                'unitTypes': setUnitTypes,
                'rosterData': setRoster,
                'serviceTemplates': setServiceTemplates,
                'usersData': setUsersData,
                'changeLogData': (logData: LogEntry[]) => setChangeLog(logData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())),
            };
            
            if (keyMap[key]) {
                keyMap[key](data);
            }
        };

        dataService.subscribe(handleDataChange);
        return () => dataService.unsubscribe(handleDataChange);
    }, []);

    useEffect(() => {
        const handleMqttStatus = (event: CustomEvent) => {
            setMqttStatus(event.detail.status);
        };
        window.addEventListener('mqttstatus', handleMqttStatus as EventListener);
        return () => {
            window.removeEventListener('mqttstatus', handleMqttStatus as EventListener);
        };
    }, []);

    const getMqttStatusColor = () => {
        switch (mqttStatus) {
            case 'Conectado':
                return 'bg-green-600/80';
            case 'Desconectado':
            case 'Sin conexión':
                return 'bg-red-600/80';
            case 'Conectando...':
            case 'Reconectando...':
            default:
                return 'bg-yellow-500/80 text-black';
        }
    };

    const sortPersonnel = (a: Personnel, b: Personnel) => {
        const rankComparison = (rankOrder[a.rank] || 99) - (rankOrder[b.rank] || 99);
        return rankComparison !== 0 ? rankComparison : a.name.localeCompare(b.name);
    };

    const updateAndSaveCommandPersonnel = (newList: Personnel[]) => dataService.saveCommandPersonnel(newList.sort(sortPersonnel));
    const updateAndSaveServicePersonnel = (newList: Personnel[]) => dataService.saveServicePersonnel(newList.sort(sortPersonnel));
    const updateAndSaveUnits = (newList: string[]) => dataService.saveUnitList(newList);
    const updateAndSaveUnitTypes = (newTypes: string[]) => dataService.saveUnitTypes(newTypes);
    const updateAndSaveRoster = (newRoster: Roster) => dataService.saveRoster(newRoster);
    const updateAndSaveTemplates = (templates: ServiceTemplate[]) => dataService.saveTemplates(templates);
    const updateAndSaveUsers = (newUsers: User[]) => dataService.saveUsers(newUsers);
    
    const handleUpdateUnitReport = (updatedData: UnitReportData) => dataService.saveUnitReport(updatedData);
    const handleUpdateEraReport = (updatedData: EraData) => dataService.saveEraReport(updatedData);
    const handleUpdateGeneratorReport = (updatedData: GeneratorData) => dataService.saveGeneratorReport(updatedData);
    const handleUpdateMaterialsReport = (updatedData: MaterialsData) => dataService.saveMaterials(updatedData);
    const handleUpdateHidroAlertData = (updatedData: HidroAlertData) => dataService.saveHidroAlert(updatedData);
    const handleUpdateRegimenData = (updatedData: RegimenData) => dataService.saveRegimen(updatedData);
    const handleUpdateInterventionGroups = (groups: InterventionGroup[]) => dataService.saveInterventionGroups(groups);

    const handleUpdateService = (updatedService: Service, type: 'common' | 'sports') => {
        if (!schedule) return;
        const key = type === 'common' ? 'services' : 'sportsEvents';
        const newSchedule = { ...schedule, [key]: schedule[key].map(s => s.id === updatedService.id ? updatedService : s) };
        dataService.saveSchedule(newSchedule);
    };

    const handleAddNewService = (type: 'common' | 'sports') => {
        if (!schedule) return;
        const key = type === 'common' ? 'services' : 'sportsEvents';
        const newService: Service = {
            id: `new-service-${Date.now()}`,
            title: type === 'common' ? "Nuevo Servicio (Editar)" : "Nuevo Evento Deportivo (Editar)",
            assignments: [], isHidden: false
        };
        const list = [...schedule[key]];
        const firstHiddenIndex = list.findIndex(s => s.isHidden);
        const insertIndex = firstHiddenIndex === -1 ? list.length : firstHiddenIndex;
        list.splice(insertIndex, 0, newService);
        const newSchedule = { ...schedule, [key]: list };
        dataService.saveSchedule(newSchedule);
    };

    const handleMoveService = (serviceId: string, direction: 'up' | 'down', type: 'common' | 'sports') => {
        if (!schedule) return;
        const key = type === 'common' ? 'services' : 'sportsEvents';
        const services = [...schedule[key]];
        const currentIndex = services.findIndex(s => s.id === serviceId);
        if (currentIndex === -1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= services.length || services[targetIndex].isHidden) return;
        [services[currentIndex], services[targetIndex]] = [services[targetIndex], services[currentIndex]];
        const newSchedule = { ...schedule, [key]: services };
        dataService.saveSchedule(newSchedule);
    };

    const handleDeleteService = (serviceId: string, type: 'common' | 'sports') => {
        if (!schedule) return;
        const listKey = type === 'common' ? 'services' : 'sportsEvents';
        const serviceToDelete = schedule[listKey].find(s => s.id === serviceId);

        if (!serviceToDelete) return;

        if (window.confirm(`¿Estás seguro de que quieres eliminar el servicio "${serviceToDelete.title}"? Esta acción no se puede deshacer.`)) {
            const newSchedule = { ...schedule, [listKey]: schedule[listKey].filter(s => s.id !== serviceId) };
            dataService.saveSchedule(newSchedule);
            setSelectedServiceIds(currentIds => {
                const newIds = new Set(currentIds);
                newIds.delete(serviceId);
                return newIds;
            });
            showToast(`Servicio "${serviceToDelete.title}" eliminado.`);
        }
    };

    const handleToggleServiceSelection = (serviceId: string) => {
        const newSelection = new Set(selectedServiceIds);
        if (newSelection.has(serviceId)) newSelection.delete(serviceId);
        else newSelection.add(serviceId);
        setSelectedServiceIds(newSelection);
    };
    
    const serviceMatches = (service: Service, term: string): boolean => {
        if (!term) return true;
        if (service.title?.toLowerCase().includes(term)) return true;
        if (service.description?.toLowerCase().includes(term)) return true;
        if (service.novelty?.toLowerCase().includes(term)) return true;
    
        for (const assignment of service.assignments) {
            if (assignment.location?.toLowerCase().includes(term)) return true;
            if (assignment.personnel?.toLowerCase().includes(term)) return true;
            if (assignment.unit?.toLowerCase().includes(term)) return true;
            if (assignment.details?.join(' ').toLowerCase().includes(term)) return true;
        }
        return false;
    };

    const filteredSchedule = useMemo(() => {
        if (!schedule) return null;
        if (!searchTerm) return schedule;
    
        const lowercasedFilter = searchTerm.toLowerCase();
    
        const filteredServices = schedule.services.filter(s => serviceMatches(s, lowercasedFilter));
        const filteredSportsEvents = schedule.sportsEvents.filter(s => serviceMatches(s, lowercasedFilter));
        
        return { ...schedule, services: filteredServices, sportsEvents: filteredSportsEvents };
    }, [schedule, searchTerm]);


    const handleSelectAllServices = (selectAll: boolean) => {
        if (!filteredSchedule) return;
        const visibleFilteredIds = [...filteredSchedule.services, ...filteredSchedule.sportsEvents].filter(s => !s.isHidden).map(s => s.id);
        const newSelection = new Set(selectedServiceIds);
        if (selectAll) visibleFilteredIds.forEach(id => newSelection.add(id));
        else visibleFilteredIds.forEach(id => newSelection.delete(id));
        setSelectedServiceIds(newSelection);
    };

    const handleToggleVisibilityForSelected = () => {
        if (selectedServiceIds.size === 0 || !schedule) return;
        const allServices = [...schedule.services, ...schedule.sportsEvents];
        const firstSelected = allServices.find(s => selectedServiceIds.has(s.id));
        if (!firstSelected) return;
        
        const newVisibility = !firstSelected.isHidden;
        const updateVisibility = (services: Service[]) => services.map(s => selectedServiceIds.has(s.id) ? { ...s, isHidden: newVisibility } : s).sort((a, b) => (a.isHidden ? 1 : 0) - (b.isHidden ? 1 : 0));
        
        const newSchedule = { ...schedule, services: updateVisibility(schedule.services), sportsEvents: updateVisibility(schedule.sportsEvents) };
        dataService.saveSchedule(newSchedule);
        setSelectedServiceIds(new Set());
    };

    const handleAssignmentStatusChange = (assignmentId: string, statusUpdate: { inService?: boolean; serviceEnded?: boolean }) => {
        if (!schedule) return;
        const newSchedule = JSON.parse(JSON.stringify(schedule));
        const allServices = [...newSchedule.services, ...newSchedule.sportsEvents];
        for (const service of allServices) {
            const assignment = service.assignments.find((a: Assignment) => a.id === assignmentId);
            if (assignment) {
                if ('inService' in statusUpdate) assignment.inService = statusUpdate.inService;
                if ('serviceEnded' in statusUpdate) assignment.serviceEnded = statusUpdate.serviceEnded;
                if (assignment.serviceEnded) assignment.inService = true;
                if (assignment.inService === false) assignment.serviceEnded = false;
                dataService.saveSchedule(newSchedule);
                return;
            }
        }
    };
    
    const handleDateChange = (part: 'day' | 'month' | 'year', value: number) => {
        const currentDate = displayDate || new Date();
        let year = currentDate.getFullYear(), month = currentDate.getMonth(), day = currentDate.getDate();
        if (part === 'year') year = value; else if (part === 'month') month = value; else if (part === 'day') day = value;
        const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
        if (day > daysInTargetMonth) day = daysInTargetMonth;
        const newDate = new Date(year, month, day);

        if (schedule) {
            const monthNames = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
            const newDateString = `${newDate.getDate()} DE ${monthNames[newDate.getMonth()]} DE ${newDate.getFullYear()}`;
            const newCommandStaff = loadGuardLineFromRoster(newDate, schedule.commandStaff, commandPersonnel, roster);
            dataService.saveSchedule({ ...schedule, date: newDateString, commandStaff: newCommandStaff });
        }
        setDisplayDate(newDate);
    };

    const handleUpdateCommandStaff = useCallback((updatedStaff: Officer[]) => {
        let personnelListWasUpdated = false;
        const newPersonnelList = [...commandPersonnel];
        updatedStaff.forEach(officer => {
            if (officer.id && officer.name && officer.rank) {
                const personnelIndex = newPersonnelList.findIndex(p => p.id === officer.id);
                if (personnelIndex !== -1) {
                    if (newPersonnelList[personnelIndex].rank !== officer.rank || newPersonnelList[personnelIndex].name !== officer.name) {
                        newPersonnelList[personnelIndex] = { ...newPersonnelList[personnelIndex], rank: officer.rank, name: officer.name };
                        personnelListWasUpdated = true;
                    }
                } else if (officer.name !== 'A designar' && officer.name !== 'No Asignado') {
                  newPersonnelList.push({ id: officer.id, name: officer.name, rank: officer.rank, poc: '' });
                  personnelListWasUpdated = true;
                }
            }
        });
        if (personnelListWasUpdated) updateAndSaveCommandPersonnel(newPersonnelList);
        
        if (schedule) dataService.saveSchedule({ ...schedule, commandStaff: updatedStaff });
    }, [commandPersonnel, schedule]);
    
    const handleImportGuardLine = useCallback(() => {
        if (schedule && displayDate) {
            const newCommandStaff = loadGuardLineFromRoster(displayDate, schedule.commandStaff, commandPersonnel, roster);
            dataService.saveSchedule({ ...schedule, commandStaff: newCommandStaff });
        }
    }, [schedule, displayDate, commandPersonnel, roster, loadGuardLineFromRoster]);

    const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !schedule) return;
        const importMode = prompt("Elige el modo de importación:\n\n1. Añadir\n2. Reemplazar\n\nEscribe '1' o '2'.");
        if (importMode !== '1' && importMode !== '2') {
            alert("Importación cancelada.");
            if(fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        try {
            const fileBuffer = await file.arrayBuffer();
            const importedData = await parseScheduleFromFile(fileBuffer, file.name);

            if (!importedData || (!importedData.services?.length && !importedData.sportsEvents?.length)) {
                alert("No se encontraron servicios válidos en el archivo o el formato no es reconocido.");
                return;
            }
            
            const { services: newServices = [], sportsEvents: newSportsEvents = [] } = importedData;
            let newSchedule = JSON.parse(JSON.stringify(schedule));

            if (importMode === '1') {
                const now = Date.now(); let counter = 0;
                const reIdService = (service: Service) => ({ ...service, id: `imported-add-${now}-${counter++}`, assignments: service.assignments.map(a => ({...a, id: `imported-add-assign-${now}-${counter++}`}))});
                newSchedule.services = [...schedule.services, ...newServices.map(reIdService)];
                newSchedule.sportsEvents = [...schedule.sportsEvents, ...newSportsEvents.map(reIdService)];
                alert(`${newServices.length + newSportsEvents.length} servicio(s) importado(s) y añadidos con éxito.`);
            } else {
                if (importedData.date) newSchedule.date = importedData.date;
                if (importedData.commandStaff) newSchedule.commandStaff = importedData.commandStaff;
                newSchedule.services = newServices;
                newSchedule.sportsEvents = newSportsEvents;
                if(importedData.date) setDisplayDate(parseDateFromString(importedData.date));
                alert(`El horario ha sido reemplazado. ${newServices.length + newSportsEvents.length} servicio(s) importado(s) con éxito.`);
            }
            dataService.saveSchedule(newSchedule);
        } catch (error: any) {
            console.error("Error al importar el archivo:", error); alert(`Hubo un error al procesar el archivo: ${error.message}`);
        } finally {
            if(fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleUnitReportImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (window.confirm("¿Está seguro de que desea reemplazar todo el reporte de unidades con los datos de este archivo? Esta acción no se puede deshacer.")) {
            try {
                const fileBuffer = await file.arrayBuffer();
                const newUnitReportData = await parseFullUnitReportFromExcel(fileBuffer); 
                if (newUnitReportData) {
                    dataService.saveUnitReport(newUnitReportData);
                    showToast("Reporte de unidades importado y reemplazado con éxito.");
                } else alert("No se pudo procesar el archivo Excel. Verifique el formato del reporte completo.");
            } catch (error: any) {
                console.error("Error al importar el reporte de unidades:", error); alert(`Hubo un error al procesar el archivo Excel: ${error.message}`);
            } finally {
                if (unitReportFileInputRef.current) unitReportFileInputRef.current.value = '';
            }
        } else if (unitReportFileInputRef.current) unitReportFileInputRef.current.value = '';
    };
    
    const handleUnitReportPdfImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (window.confirm("¿Está seguro de que desea reemplazar todo el reporte de unidades con los datos de este PDF? Esta acción no se puede deshacer.")) {
            try {
                const fileBuffer = await file.arrayBuffer();
                const newUnitReportData = await parseUnitReportFromPdf(fileBuffer); 
                if (newUnitReportData) {
                    dataService.saveUnitReport(newUnitReportData);
                    showToast("Reporte de unidades importado desde PDF con éxito.");
                } else alert("No se pudo encontrar datos de reporte en el archivo PDF. Asegúrese de que el archivo fue generado por esta aplicación.");
            } catch (error: any) {
                console.error("Error al importar el reporte de unidades desde PDF:", error); alert(`Hubo un error al procesar el archivo PDF: ${error.message}`);
            } finally {
                if (unitReportPdfFileInputRef.current) unitReportPdfFileInputRef.current.value = '';
            }
        } else if (unitReportPdfFileInputRef.current) unitReportPdfFileInputRef.current.value = '';
    };

    const handleRosterImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (window.confirm("¿Deseas fusionar los datos de este archivo con el rol de guardia actual?")) {
            try {
                let newRosterData: Roster;
                if (file.name.endsWith('.json')) {
                    newRosterData = JSON.parse(await file.text());
                    if (typeof newRosterData !== 'object' || newRosterData === null || Array.isArray(newRosterData)) throw new Error("Invalid JSON format.");
                } else if (file.name.endsWith('.docx')) {
                    newRosterData = await parseRosterFromWord(await file.arrayBuffer());
                } else {
                    alert("Formato de archivo no soportado. Por favor, sube un archivo .json o .docx.");
                    if(rosterInputRef.current) rosterInputRef.current.value = '';
                    return;
                }
                updateAndSaveRoster({ ...roster, ...newRosterData });
                showToast("Rol de guardia actualizado con éxito.");
            } catch (error: any) { 
                console.error("Error al importar el rol de guardia:", error); alert(`Hubo un error al procesar el archivo: ${error.message}`); 
            } finally {
                if(rosterInputRef.current) rosterInputRef.current.value = '';
            }
        } else if(rosterInputRef.current) rosterInputRef.current.value = '';
    };
    
    const handleSaveAsTemplate = (service: Service) => {
        const newTemplate: ServiceTemplate = { ...JSON.parse(JSON.stringify(service)), templateId: `template-${Date.now()}` };
        updateAndSaveTemplates([...serviceTemplates, newTemplate]);
        showToast(`Servicio "${service.title}" guardado como plantilla.`);
    };

    const handleSelectTemplate = (template: ServiceTemplate, { mode, serviceType, serviceToReplaceId }: { mode: 'add' | 'replace', serviceType: 'common' | 'sports', serviceToReplaceId?: string }) => {
        if (!schedule) return;
        const listKey = serviceType === 'common' ? 'services' : 'sportsEvents';
        let newSchedule = { ...schedule };
        if (mode === 'add') {
            const newService = { ...JSON.parse(JSON.stringify(template)), id: `service-from-template-${Date.now()}` };
            delete newService.templateId;
            const list = [...newSchedule[listKey]];
            const firstHiddenIndex = list.findIndex(s => s.isHidden);
            const insertIndex = firstHiddenIndex === -1 ? list.length : firstHiddenIndex;
            list.splice(insertIndex, 0, newService);
            newSchedule[listKey] = list;
            showToast(`Servicio "${template.title}" añadido desde plantilla.`);
        } else if (mode === 'replace' && serviceToReplaceId) {
            newSchedule[listKey] = newSchedule[listKey].map((s: Service) => {
                if (s.id === serviceToReplaceId) {
                    const updatedService = { ...JSON.parse(JSON.stringify(template)), id: s.id };
                    delete updatedService.templateId;
                    return updatedService;
                }
                return s;
            });
            showToast(`Servicio reemplazado con plantilla "${template.title}".`);
        }
        dataService.saveSchedule(newSchedule);
        setIsTemplateModalOpen(false);
    };

    const handleDeleteTemplate = (templateId: string) => updateAndSaveTemplates(serviceTemplates.filter(t => t.templateId !== templateId));

    const handleExportAsTemplate = (format: 'excel' | 'word') => {
        if (!schedule) return;
        if (format === 'excel') exportScheduleAsExcelTemplate(schedule);
        else exportScheduleAsWordTemplate(schedule);
        setIsExportTemplateModalOpen(false);
    };

    const getAssignmentsByTime = useMemo(() => {
        if (!filteredSchedule) return {};
        const grouped: { [time: string]: Assignment[] } = {};
        [...filteredSchedule.services, ...filteredSchedule.sportsEvents].filter(s => !s.isHidden).forEach(service => {
          service.assignments.forEach(assignment => {
            const timeKey = assignment.time;
            if (!grouped[timeKey]) grouped[timeKey] = [];
            grouped[timeKey].push({ ...assignment, serviceTitle: service.title, novelty: service.novelty });
          });
        });
        return grouped;
    }, [filteredSchedule]);
    
    const openTemplateModal = (props: any) => {
        setTemplateModalProps(props);
        setIsTemplateModalOpen(true);
    };

    const visibilityAction = useMemo(() => {
        if (selectedServiceIds.size === 0 || !schedule) return { action: 'none', label: '' };
        const firstSelected = [...schedule.services, ...schedule.sportsEvents].find(s => selectedServiceIds.has(s.id));
        if (firstSelected?.isHidden) return { action: 'show', label: 'Mostrar Seleccionados' };
        return { action: 'hide', label: 'Ocultar Seleccionados' };
    }, [selectedServiceIds, schedule]);

    const checkScrollability = useCallback(() => {
        const el = navScrollRef.current;
        if (el) {
            const hasOverflow = el.scrollWidth > el.clientWidth;
            const buffer = 2;
            setShowScrollIndicators({ left: hasOverflow && el.scrollLeft > buffer, right: hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - buffer });
        }
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        const slider = navScrollRef.current; if (!slider) return;
        isDown.current = true; slider.classList.add('cursor-grabbing');
        startX.current = e.pageX - slider.offsetLeft; scrollLeft.current = slider.scrollLeft;
    };
    const handleMouseLeave = () => { const slider = navScrollRef.current; if (!slider) return; isDown.current = false; slider.classList.remove('cursor-grabbing'); };
    const handleMouseUp = () => { const slider = navScrollRef.current; if (!slider) return; isDown.current = false; slider.classList.remove('cursor-grabbing'); };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDown.current) return; e.preventDefault();
        const slider = navScrollRef.current; if (!slider) return;
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX.current) * 2;
        slider.scrollLeft = scrollLeft.current - walk; checkScrollability();
    };

    useEffect(() => {
        const navEl = navScrollRef.current;
        if (navEl) {
            checkScrollability();
            navEl.addEventListener('scroll', checkScrollability, { passive: true });
            window.addEventListener('resize', checkScrollability);
            return () => { navEl.removeEventListener('scroll', checkScrollability); window.removeEventListener('resize', checkScrollability); };
        }
    }, [checkScrollability, view, currentUser]);

    const renderContent = () => {
        if (!displayDate || !currentUser) return null;
        switch (view) {
            case 'hidro-alert': return <HidroAlertView hidroAlertData={hidroAlertData!} onUpdateReport={handleUpdateHidroAlertData} unitList={unitList} />;
            case 'unit-report': return <UnitReportDisplay reportData={unitReport!} searchTerm={searchTerm} onSearchChange={setSearchTerm} onUpdateReport={handleUpdateUnitReport} commandPersonnel={commandPersonnel} servicePersonnel={servicePersonnel} unitList={unitList} unitTypes={unitTypes} currentUser={currentUser} />;
            case 'unit-status': return <UnitStatusView unitReportData={unitReport!} />;
            case 'material-status': return <MaterialStatusView materialsData={materialsReport!} />;
            case 'command-post': return <CommandPostParentView unitReportData={unitReport!} commandPersonnel={commandPersonnel} servicePersonnel={servicePersonnel} currentUser={currentUser} interventionGroups={interventionGroups} onUpdateInterventionGroups={handleUpdateInterventionGroups} unitList={unitList} />;
            case 'forestal': if (currentUser.role !== 'admin' && currentUser.username !== 'Puesto Comando') return <div className="text-center text-red-400 text-lg">Acceso denegado.</div>; return <ForestalView interventionGroups={interventionGroups} onUpdateInterventionGroups={handleUpdateInterventionGroups} />;
            case 'era-report': return <EraReportDisplay reportData={eraReport!} onUpdateReport={handleUpdateEraReport} currentUser={currentUser} />;
            case 'generator-report': return <GeneratorReportDisplay reportData={generatorReport!} onUpdateReport={handleUpdateGeneratorReport} currentUser={currentUser} />;
            case 'materials': return <MaterialsDisplay reportData={materialsReport!} onUpdateReport={handleUpdateMaterialsReport} currentUser={currentUser} />;
            case 'schedule': return <ScheduleDisplay schedule={filteredSchedule!} displayDate={displayDate} selectedServiceIds={selectedServiceIds} commandPersonnel={commandPersonnel} servicePersonnel={servicePersonnel} unitList={unitList} onDateChange={handleDateChange} onUpdateService={handleUpdateService} onUpdateCommandStaff={handleUpdateCommandStaff} onAddNewService={handleAddNewService} onMoveService={handleMoveService} onToggleServiceSelection={handleToggleServiceSelection} onSelectAllServices={handleSelectAllServices} onSaveAsTemplate={handleSaveAsTemplate} onReplaceFromTemplate={(serviceId, type) => openTemplateModal({ mode: 'replace', serviceType: type, serviceToReplaceId: serviceId })} onImportGuardLine={handleImportGuardLine} onDeleteService={handleDeleteService} searchTerm={searchTerm} onSearchChange={setSearchTerm} currentUser={currentUser} />;
            case 'time-grouped': return <TimeGroupedScheduleDisplay assignmentsByTime={getAssignmentsByTime} onAssignmentStatusChange={handleAssignmentStatusChange} />;
            case 'nomenclador': if (currentUser.role !== 'admin') return <div className="text-center text-red-400 text-lg">Acceso denegado. Se requieren permisos de administrador.</div>; return <Nomenclador commandPersonnel={commandPersonnel} servicePersonnel={servicePersonnel} units={unitList} unitTypes={unitTypes} roster={roster} users={usersData} onAddCommandPersonnel={(item) => updateAndSaveCommandPersonnel([...commandPersonnel, item])} onUpdateCommandPersonnel={(item) => updateAndSaveCommandPersonnel(commandPersonnel.map(p => p.id === item.id ? item : p))} onRemoveCommandPersonnel={(item) => updateAndSaveCommandPersonnel(commandPersonnel.filter(p => p.id !== item.id))} onAddServicePersonnel={(item) => updateAndSaveServicePersonnel([...servicePersonnel, item])} onUpdateServicePersonnel={(item) => updateAndSaveServicePersonnel(servicePersonnel.map(p => p.id === item.id ? item : p))} onRemoveServicePersonnel={(item) => updateAndSaveServicePersonnel(servicePersonnel.filter(p => p.id !== item.id))} onUpdateUnits={updateAndSaveUnits} onUpdateUnitTypes={updateAndSaveUnitTypes} onUpdateRoster={updateAndSaveRoster} onUpdateUsers={updateAndSaveUsers} />;
            case 'regimen': return <RegimenDeIntervencion regimenData={regimen!} onUpdateRegimenData={handleUpdateRegimenData} currentUser={currentUser} />;
            case 'changelog': if (currentUser.role !== 'admin') return <div className="text-center text-red-400 text-lg">Acceso denegado.</div>; return <ChangeLogView logEntries={changeLog} onClearLog={handleClearLog} />;
            default: return null;
        }
    };
    
    const getButtonClass = (buttonView: string) => `flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 outline-none transition-colors whitespace-nowrap focus-visible:bg-zinc-700/50 ${view === buttonView ? 'border-blue-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:border-zinc-500'}`;
    
    if (!currentUser) return <Login onLogin={handleLogin} users={usersData} />;
    if (!schedule || !displayDate || !unitReport || !eraReport || !generatorReport || !materialsReport || !hidroAlertData || !regimen) return <div className="bg-zinc-900 text-white min-h-screen flex justify-center items-center"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;

    return (
        <div className="bg-zinc-900 text-white min-h-screen font-sans">
            <input type="file" ref={fileInputRef} onChange={handleFileImport} style={{ display: 'none' }} accept=".xlsx,.xls,.docx,.ods" />
            <input type="file" ref={unitReportFileInputRef} onChange={handleUnitReportImport} style={{ display: 'none' }} accept=".xlsx,.xls" />
            <input type="file" ref={unitReportPdfFileInputRef} onChange={handleUnitReportPdfImport} style={{ display: 'none' }} accept=".pdf" />
            <input type="file" ref={rosterInputRef} onChange={handleRosterImport} style={{ display: 'none' }} accept=".json,.docx" />
            
            <header className="bg-zinc-800/80 backdrop-blur-sm sticky top-0 z-40 shadow-lg">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-white tracking-wider mr-4">BOMBEROS DE LA CIUDAD</h1>
                             <button onClick={dataService.resetAllData} className="mr-2 text-zinc-400 hover:text-white transition-colors" aria-label="Reiniciar Datos"><RefreshIcon className="w-6 h-6" /></button>
                             <button onClick={() => setIsHelpModalOpen(true)} className="mr-4 text-zinc-400 hover:text-white transition-colors" aria-label="Ayuda"><QuestionMarkCircleIcon className="w-6 h-6" /></button>
                        </div>
                         <div className="flex items-center justify-end gap-2 md:gap-4">
                             <div className="flex items-center text-sm text-zinc-300 flex-shrink-0">
                                <span>Conectado: <strong className="text-white">{currentUser.username}</strong></span>
                                <button onClick={handleLogout} className="ml-2 p-1.5 rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors" title="Cerrar sesión"><LogoutIcon className="w-5 h-5" /></button>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="relative" ref={importMenuRef}>
                                    <button onClick={() => setImportMenuOpen(prev => !prev)} className={'flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600 hover:bg-sky-500 text-white font-medium transition-colors'}>
                                        <UploadIcon className={'w-5 h-5'} />Importar<ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isImportMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isImportMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-md shadow-lg bg-zinc-700 ring-1 ring-black ring-opacity-5 z-50 animate-scale-in">
                                            <div className="py-1">
                                                <button onClick={() => { fileInputRef.current?.click(); setImportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><UploadIcon className={'w-4 h-4'} /> Importar Horario (Word/Excel)</button>
                                                <button onClick={() => { unitReportFileInputRef.current?.click(); setImportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><UploadIcon className={'w-4 h-4'} /> Importar Reporte Unidades (Excel)</button>
                                                <button onClick={() => { unitReportPdfFileInputRef.current?.click(); setImportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><UploadIcon className={'w-4 h-4'} /> Importar Reporte Unidades (PDF)</button>
                                                <button onClick={() => { rosterInputRef.current?.click(); setImportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><UploadIcon className={'w-4 h-4'} /> Importar Rol de Guardia (JSON/Word)</button>
                                                <button onClick={() => { exportRosterWordTemplate(); setImportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><DownloadIcon className={'w-4 h-4'} /> Plantilla Rol de Guardia (Word)</button>
                                                <button onClick={() => { openTemplateModal({ mode: 'add', serviceType: 'common' }); setImportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><BookmarkIcon className={'w-4 h-4'} /> Añadir desde Plantilla</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative" ref={exportMenuRef}>
                                     <button onClick={() => setExportMenuOpen(prev => !prev)} className={'flex items-center gap-2 px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 text-white font-medium transition-colors'}>
                                        <DownloadIcon className={'w-5 h-5'} />Exportar<ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isExportMenuOpen && (
                                        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-md shadow-lg bg-zinc-700 ring-1 ring-black ring-opacity-5 z-50 animate-scale-in">
                                            <div className="py-1">
                                                <button onClick={() => { exportScheduleToWord({ ...schedule!, date: displayDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase() }); setExportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><DownloadIcon className={'w-4 h-4'} /> Exportar General</button>
                                                <button onClick={() => { exportScheduleByTimeToWord({ date: displayDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), assignmentsByTime: getAssignmentsByTime }); setExportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><DownloadIcon className={'w-4 h-4'} /> Exportar por Hora</button>
                                                <button onClick={() => { setIsExportTemplateModalOpen(true); setExportMenuOpen(false); }} className="flex items-center gap-3 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-600 w-full text-left"><DownloadIcon className={'w-4 h-4'} /> Exportar Plantilla</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {selectedServiceIds.size > 0 && view === 'schedule' && (
                                    <button onClick={handleToggleVisibilityForSelected} className={`flex items-center gap-2 px-4 py-2 rounded-md text-white font-medium transition-colors animate-fade-in ${visibilityAction.action === 'hide' ? 'bg-red-600 hover:bg-red-500' : 'bg-purple-600 hover:bg-purple-500'}`}>
                                        {visibilityAction.action === 'hide' ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                        {`${visibilityAction.label} (${selectedServiceIds.size})`}
                                    </button>
                                )}
                            </div>
                         </div>
                    </div>
                </div>
            </header>
            
            <div className="sticky top-16 z-30 bg-zinc-800/80 backdrop-blur-sm border-b border-zinc-700">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="relative overflow-hidden">
                        <div ref={navScrollRef} className="flex items-center gap-1 overflow-x-auto whitespace-nowrap scrollbar-hide cursor-grab" onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
                            <button className={getButtonClass('unit-report')} onClick={() => setView('unit-report')}><FireIcon className="w-5 h-5" /> Reporte de Unidades</button>
                            <button className={getButtonClass('hidro-alert')} onClick={() => setView('hidro-alert')}><ShieldExclamationIcon className="w-5 h-5" /> Alerta Hidro</button>
                            <button className={getButtonClass('unit-status')} onClick={() => setView('unit-status')}><FilterIcon className="w-5 h-5" /> Estado de Unidades</button>
                            <button className={getButtonClass('material-status')} onClick={() => setView('material-status')}><ClipboardCheckIcon className="w-5 h-5" /> Estado de Materiales</button>
                            {(currentUser.role === 'admin' || currentUser.username === 'Puesto Comando') && <button className={getButtonClass('command-post')} onClick={() => setView('command-post')}><AnnotationIcon className="w-5 h-5" /> Puesto Comando</button>}
                            {(currentUser.role === 'admin' || currentUser.username === 'Puesto Comando') && <button className={getButtonClass('forestal')} onClick={() => setView('forestal')}><FireIcon className="w-5 h-5 text-orange-400" /> Incendio Forestal</button>}
                            <button className={getButtonClass('era-report')} onClick={() => setView('era-report')}><LightningBoltIcon className="w-5 h-5" /> Trasvazadores E.R.A.</button>
                            <button className={getButtonClass('generator-report')} onClick={() => setView('generator-report')}><LightningBoltIcon className="w-5 h-5" /> Grupos Electrógenos</button>
                            <button className={getButtonClass('materials')} onClick={() => setView('materials')}><CubeIcon className="w-5 h-5" /> Materiales</button>
                            <button className={getButtonClass('schedule')} onClick={() => setView('schedule')}><ClipboardListIcon className="w-5 h-5" /> Planificador</button>
                            {currentUser.role === 'admin' && <button className={getButtonClass('time-grouped')} onClick={() => setView('time-grouped')}><ClockIcon className="w-5 h-5" /> Vista por Hora</button>}
                            {(currentUser.role === 'admin' || currentUser.username === 'Puesto Comando') && <button className={getButtonClass('regimen')} onClick={() => setView('regimen')}><DocumentTextIcon className="w-5 h-5" /> Régimen de Intervención</button>}
                            {currentUser.role === 'admin' && <button className={getButtonClass('nomenclador')} onClick={() => setView('nomenclador')}><BookOpenIcon className="w-5 h-5" /> Nomencladores</button>}
                            {currentUser.role === 'admin' && <button className={getButtonClass('changelog')} onClick={() => setView('changelog')}><ArchiveBoxIcon className="w-5 h-5" /> Registro de Cambios</button>}
                        </div>
                        <div className={`absolute top-0 left-0 bottom-0 w-8 bg-gradient-to-r from-zinc-800 to-transparent pointer-events-none transition-opacity duration-300 ${showScrollIndicators.left ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true"></div>
                        <div className={`absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-zinc-800 to-transparent pointer-events-none transition-opacity duration-300 ${showScrollIndicators.right ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true"></div>
                    </nav>
                </div>
            </div>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {renderContent()}
            </main>

            <div className={`fixed bottom-4 right-4 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full shadow-lg z-50 ${getMqttStatusColor()}`}>
                <span className="font-bold">Sincronización:</span>{` ${mqttStatus}`}
            </div>
            
            {showUpdateNotification && (
                <div className="fixed top-20 right-4 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in flex items-center gap-4">
                    <span>Hay una nueva versión disponible.</span>
                    <button onClick={onUpdate} className="flex items-center gap-2 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md font-semibold">
                        <CloudArrowDownIcon className="w-5 h-5" />
                        Actualizar
                    </button>
                </div>
            )}

            {isHelpModalOpen && <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} unitList={unitList} commandPersonnel={commandPersonnel} servicePersonnel={servicePersonnel} />}
            {isTemplateModalOpen && <ServiceTemplateModal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} templates={serviceTemplates} onSelectTemplate={(template) => handleSelectTemplate(template, templateModalProps)} onDeleteTemplate={handleDeleteTemplate} />}
            {isExportTemplateModalOpen && <ExportTemplateModal isOpen={isExportTemplateModalOpen} onClose={() => setIsExportTemplateModalOpen(false)} onExport={handleExportAsTemplate} />}
        </div>
    );
};
export default App;