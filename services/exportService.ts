import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, UnderlineType, AlignmentType, ShadingType, PageBreak } from 'docx';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Schedule, Assignment, Service, Personnel, UnitReportData, RANKS, EraData, GeneratorData, UnitGroup, FireUnit, SCI201Data, SCI211Resource, SCI207Victim, MaterialsData, InterventionGroup, TrackedUnit, TrackedPersonnel, TriageCategory } from '../types';

// Helper to save files
const saveFile = (data: BlobPart, fileName: string, fileType: string) => {
    const blob = new Blob([data], { type: fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Helper to sanitize strings for XML
const sanitizeXmlString = (str: string | null | undefined): string => {
    if (!str) return '';
    return str.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/g, '');
};


// --- STYLES ---
const LABEL_STYLE = { bold: true, font: "Arial", size: 22 }; // 11pt
const CONTENT_STYLE = { font: "Arial", size: 22 }; // 11pt
const ITALIC_CONTENT_STYLE = { ...CONTENT_STYLE, italics: true };
const ITALIC_PLACEHOLDER_STYLE = { ...ITALIC_CONTENT_STYLE, color: "555555" };
const HEADING_2_RUN_STYLE = { size: 28, bold: true, font: "Arial", color: "000000", underline: { type: UnderlineType.SINGLE }};


// Helper function to create assignment paragraphs, avoiding code duplication.
const createAssignmentParagraphs = (assignment: Assignment, includeServiceTitle: boolean): Paragraph[] => {
    const eventSubtitle = (assignment.details || []).find(detail =>
        /^\d+-\s*O\.S\./.test(detail.trim())
    );
    const otherDetails = (assignment.details || []).filter(detail => detail !== eventSubtitle);

    const detailParagraphs: Paragraph[] = otherDetails.map(detail =>
        new Paragraph({
            children: [new TextRun({ text: sanitizeXmlString(detail.trim()), ...ITALIC_CONTENT_STYLE })],
            indent: { left: 400 },
            spacing: { after: 0 }
        })
    );

    const paragraphs: Paragraph[] = [];

    if (includeServiceTitle && assignment.serviceTitle) {
        paragraphs.push(new Paragraph({
            children: [
                new TextRun({ text: "Servicio: ", ...LABEL_STYLE }),
                new TextRun({ text: sanitizeXmlString(assignment.serviceTitle), ...ITALIC_CONTENT_STYLE })
            ],
             spacing: { before: 200 }
        }));
    }
    
    if (assignment.novelty) {
        paragraphs.push(
            new Paragraph({
                children: [
                    new TextRun({ text: "Novedad: ", ...LABEL_STYLE, color: "000000" }),
                    new TextRun({ text: sanitizeXmlString(assignment.novelty), ...ITALIC_CONTENT_STYLE, color: "000000" })
                ],
                shading: { type: ShadingType.CLEAR, fill: "FFFF00" },
                spacing: { after: 100 }
            })
        );
    }

    if (eventSubtitle) {
        const cleanSubtitle = eventSubtitle.replace(/^\d+-\s*O\.S\.\d+\s*/, '').trim();
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: sanitizeXmlString(cleanSubtitle), bold: true, ...ITALIC_CONTENT_STYLE })],
            spacing: { before: 100, after: 100 }
        }));
    }

    paragraphs.push(
        new Paragraph({
            children: [new TextRun({ text: sanitizeXmlString(assignment.location), bold: true, size: 24, font: "Arial", underline: { type: UnderlineType.SINGLE, color: "000000"} })],
            spacing: { before: includeServiceTitle || eventSubtitle ? 100 : 200 }
        })
    );

    if (assignment.implementationTime) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: sanitizeXmlString(assignment.implementationTime), bold: true, ...CONTENT_STYLE })] }));
    }

    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Horario: ", ...LABEL_STYLE }), new TextRun({text: sanitizeXmlString(assignment.time), ...CONTENT_STYLE })] }));
    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Personal: ", ...LABEL_STYLE }), new TextRun({text: sanitizeXmlString(assignment.personnel), ...CONTENT_STYLE })] }));

    if (assignment.unit) {
        paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Unidad: ", ...LABEL_STYLE }), new TextRun({text: sanitizeXmlString(assignment.unit), ...CONTENT_STYLE })] }));
    }

    paragraphs.push(...detailParagraphs);
    return paragraphs;
};


export const exportScheduleToWord = (schedule: Schedule) => {
    const createServiceSection = (services: Service[], title?: string): Paragraph[] => {
        if (!services || services.length === 0) return [];

        const serviceContent = services.filter(s => !s.isHidden).flatMap(service => {
            const assignmentsContent = service.assignments.flatMap(assignment => createAssignmentParagraphs(assignment, false));

            const serviceParagraphs = [
                new Paragraph({
                    style: "Heading2",
                    children: [
                        new TextRun({ text: "SERVICE_TITLE_MARKER::", size: 2, color: "FFFFFF" }),
                        new TextRun(sanitizeXmlString(service.title))
                    ],
                }),
                ...(service.description ? [new Paragraph({
                    children: [new TextRun({ text: sanitizeXmlString(service.description), ...ITALIC_CONTENT_STYLE })],
                    spacing: { after: 100 }
                })] : []),
            ];

            if (service.novelty) {
                serviceParagraphs.push(
                     new Paragraph({
                        children: [
                            new TextRun({ text: "Novedad: ", ...LABEL_STYLE, color: "000000" }),
                            new TextRun({ text: sanitizeXmlString(service.novelty), ...ITALIC_CONTENT_STYLE, color: "000000" })
                        ],
                        shading: { type: ShadingType.CLEAR, fill: "FFFF00" },
                        spacing: { after: 100 }
                    })
                );
            }

            return [...serviceParagraphs, ...assignmentsContent];
        });
        
        if (title && serviceContent.length > 0) {
            return [new Paragraph({ text: sanitizeXmlString(title), style: "Heading1", alignment: AlignmentType.LEFT }), ...serviceContent];
        }
        return serviceContent;
    };
    
    const commandStaffRows = schedule.commandStaff.map(officer => {
        return new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sanitizeXmlString(officer.role), ...CONTENT_STYLE })]})], width: { size: 30, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sanitizeXmlString(officer.rank || 'OTRO'), ...CONTENT_STYLE })]})], width: { size: 30, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: sanitizeXmlString(officer.name), ...CONTENT_STYLE })]})], width: { size: 40, type: WidthType.PERCENTAGE } }),
            ],
        });
    });

    const commandStaffTable = new Table({
        rows: [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Rol", ...LABEL_STYLE })]})] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Jerarquía", ...LABEL_STYLE })]})] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nombre", ...LABEL_STYLE })]})] }),
                ],
                tableHeader: true,
            }),
            ...commandStaffRows
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });
    
    const regularServicesContent = createServiceSection(schedule.services);
    const sportsEventsContent = createServiceSection(schedule.sportsEvents, "EVENTOS DEPORTIVOS");

    const doc = new Document({
        creator: "Servicios del Cuerpo de Bomberos de la Ciudad",
        title: `Orden de Servicio - ${schedule.date}`,
        styles: {
            paragraphStyles: [
                { id: "Heading1", name: "Heading 1", run: { size: 32, bold: true, font: "Arial" }, paragraph: { spacing: { after: 240 }, alignment: AlignmentType.CENTER } },
                { id: "Heading2", name: "Heading 2", run: HEADING_2_RUN_STYLE, paragraph: { spacing: { before: 240, after: 120 } } },
            ],
        },
        sections: [{ children: [
            new Paragraph({ text: `ORDEN DE SERVICIO DIARIA`, style: "Heading1" }),
            new Paragraph({ text: `GUARDIA DEL DIA ${sanitizeXmlString(schedule.date)}`, alignment: AlignmentType.CENTER, spacing: { after: 400 }}),
            new Paragraph({ text: "LÍNEA DE GUARDIA", style: "Heading2" }),
            commandStaffTable,
            new Paragraph({ text: "", spacing: { after: 200 }}),
            ...regularServicesContent,
            ...(sportsEventsContent.length > 0 ? [new Paragraph({ children: [new PageBreak()] })] : []),
            ...sportsEventsContent,
        ]}]
    });

    Packer.toBlob(doc).then(blob => saveFile(blob, `Orden_de_Servicio_${sanitizeXmlString(schedule.date).replace(/\s/g, '_')}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
};

export const exportScheduleByTimeToWord = ({ date, assignmentsByTime }: { date: string, assignmentsByTime: { [time: string]: Assignment[] } }) => {
    const sortedTimeKeys = Object.keys(assignmentsByTime).sort((a, b) => parseInt(a.split(':')[0], 10) - parseInt(b.split(':')[0], 10));
    const content = sortedTimeKeys.flatMap(time => [
        new Paragraph({ text: `Horario: ${sanitizeXmlString(time)}`, style: "Heading2" }),
        ...assignmentsByTime[time].flatMap(assignment => createAssignmentParagraphs(assignment, true))
    ]);

    const doc = new Document({
        creator: "Servicios del Cuerpo de Bomberos de la Ciudad",
        title: `Orden de Servicio por Hora - ${date}`,
        styles: {
            paragraphStyles: [
                 { id: "Heading1", name: "Heading 1", run: { size: 32, bold: true, font: "Arial" }, paragraph: { spacing: { after: 240 }, alignment: AlignmentType.CENTER } },
                 { id: "Heading2", name: "Heading 2", run: HEADING_2_RUN_STYLE, paragraph: { spacing: { before: 240, after: 120 } } },
            ],
        },
        sections: [{ children: [
            new Paragraph({ text: `ORDEN DE SERVICIO DIARIA POR HORA`, style: "Heading1" }),
            new Paragraph({ text: `GUARDIA DEL DIA ${sanitizeXmlString(date)}`, alignment: AlignmentType.CENTER, spacing: { after: 400 }}),
            ...content,
        ]}]
    });
    Packer.toBlob(doc).then(blob => saveFile(blob, `Orden_de_Servicio_por_Hora_${sanitizeXmlString(date).replace(/\s/g, '_')}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
};


export const exportExcelTemplate = () => {
    const headers = ["Título del Servicio", "Descripción del Servicio", "Novedad del Servicio", "Ubicación de Asignación", "Horario de Asignación", "Horario de Implantación", "Personal de Asignación", "Unidad de Asignación", "Detalles de Asignación"];
    const exampleRow = ["EVENTOS DEPORTIVOS", "O.S. 1234/25", "Presentarse con uniforme de gala.", "Estadio Monumental", "18:00 Hs. a terminar.-", "16:00 Hs.", "Personal a designar", "FZ-1234", "Encuentro Futbolístico 'EQUIPO A VS. EQUIPO B'"];
    const worksheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Plantilla de Servicios');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveFile(excelBuffer, 'plantilla_servicios.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};


export const exportScheduleAsExcelTemplate = (schedule: Schedule) => {
    const createSheetData = (services: Service[]) => {
      if (!services || services.length === 0) return [];
      const data: any[] = [];
      services.forEach(service => {
        if (service.assignments.length === 0) {
            data.push({
                "Título del Servicio": service.title,
                "Descripción del Servicio": service.description || '',
                "Novedad del Servicio": service.novelty || ''
            });
        } else {
            service.assignments.forEach(assignment => {
                const allDetails = assignment.details ? [...assignment.details] : [];
                data.push({
                    "Título del Servicio": service.title,
                    "Descripción del Servicio": service.description || '',
                    "Novedad del Servicio": service.novelty || '',
                    "Ubicación de Asignación": assignment.location,
                    "Horario de Asignación": assignment.time,
                    "Horario de Implantación": assignment.implementationTime || '',
                    "Personal de Asignación": assignment.personnel,
                    "Unidad de Asignación": assignment.unit || '',
                    "Detalles de Asignación": allDetails.join('; ')
                });
            });
        }
      });
      return data;
    };
    
    const commonServicesData = createSheetData(schedule.services);
    const sportsEventsData = createSheetData(schedule.sportsEvents);
    
    const workbook = XLSX.utils.book_new();
    if (commonServicesData.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(commonServicesData), 'Servicios Comunes');
    }
    if (sportsEventsData.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sportsEventsData), 'Eventos Deportivos');
    }
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveFile(excelBuffer, `plantilla_desde_horario_${schedule.date.replace(/\s/g, '_')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

export const exportScheduleAsWordTemplate = (schedule: Schedule) => {
    const createTemplateSection = (services: Service[], title: string): Paragraph[] => {
        if (!services || services.length === 0) return [];
        
        const sectionContent = services.flatMap(service => {
            const processAssignment = (assignment?: Assignment): Paragraph[] => {
                const paragraphs = [
                    new Paragraph({ children: [new TextRun({ text: "Título del Servicio: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(service.title), ...CONTENT_STYLE })] }),
                    new Paragraph({ children: [new TextRun({ text: "Descripción del Servicio: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(service.description), ...CONTENT_STYLE })] }),
                    new Paragraph({ children: [new TextRun({ text: "Novedad del Servicio: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(service.novelty), ...CONTENT_STYLE })] }),
                ];

                if (assignment) {
                    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Ubicación de Asignación: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(assignment.location), ...CONTENT_STYLE })] }));
                    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Horario de Asignación: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(assignment.time), ...CONTENT_STYLE })] }));
                    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Horario de Implantación: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(assignment.implementationTime), ...CONTENT_STYLE })] }));
                    paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Personal de Asignación: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(assignment.personnel), ...CONTENT_STYLE })] }));
                    if (assignment.unit) paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Unidad de Asignación: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(assignment.unit), ...CONTENT_STYLE })] }));
                    
                    const allDetails = assignment.details || [];
                    if (allDetails.length > 0) paragraphs.push(new Paragraph({ children: [new TextRun({ text: "Detalles de Asignación: ", ...LABEL_STYLE }), new TextRun({ text: sanitizeXmlString(allDetails.join('; ')), ...CONTENT_STYLE })] }));
                }
                
                paragraphs.push(new Paragraph({ text: "---", alignment: AlignmentType.CENTER, spacing: { before: 100, after: 100 } }));
                return paragraphs;
            };

            return service.assignments.length === 0 ? processAssignment() : service.assignments.flatMap(processAssignment);
        });

        if (sectionContent.length > 0) {
            sectionContent[sectionContent.length - 1] = new Paragraph({ text: "" }); // Remove last separator
        }
        
        return [new Paragraph({ text: sanitizeXmlString(title), style: "Heading1" }), ...sectionContent];
    };

    const commonServicesSection = createTemplateSection(schedule.services, "PLANTILLA DE SERVICIOS COMUNES");
    const sportsEventsSection = createTemplateSection(schedule.sportsEvents, "PLANTILLA DE EVENTOS DEPORTIVOS");

    const doc = new Document({
        creator: "Servicios del Cuerpo de Bomberos de la Ciudad",
        title: `Plantilla desde Horario - ${schedule.date}`,
        styles: {
            paragraphStyles: [
                { id: "Heading1", name: "Heading 1", run: { size: 32, bold: true, font: "Arial" }, paragraph: { spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER } }
            ]
        },
        sections: [{ children: [
            ...commonServicesSection,
            ...(sportsEventsSection.length > 0 && commonServicesSection.length > 0 ? [new Paragraph({ children: [new PageBreak()] })] : []),
            ...sportsEventsSection,
        ]}]
    });

    Packer.toBlob(doc).then(blob => saveFile(blob, `plantilla_desde_horario_${sanitizeXmlString(schedule.date).replace(/\s/g, '_')}.docx`, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
};

export const exportWordTemplate = ({ unitList, commandPersonnel, servicePersonnel }: { unitList: string[], commandPersonnel: Personnel[], servicePersonnel: Personnel[]}) => {
    const instructions = new Paragraph({
        children: [
            new TextRun({
                text: 'Instrucciones: Rellene la siguiente tabla para cada servicio. Puede copiar y pegar la tabla completa para añadir servicios adicionales. Los campos con (*) son obligatorios.',
                ...ITALIC_CONTENT_STYLE,
                size: 20,
            }),
        ],
        spacing: { after: 200 },
    });

    const createRow = (label: string, placeholder: string) => new TableRow({
        children: [
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: label, ...LABEL_STYLE })] })],
                width: { size: 30, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.CLEAR, fill: "EAEAEA" },
            }),
            new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: placeholder, ...ITALIC_PLACEHOLDER_STYLE })] })],
                width: { size: 70, type: WidthType.PERCENTAGE },
            }),
        ],
    });

    const serviceTable = new Table({
        rows: [
            createRow('Título del Servicio (*)', '[Ej: COBERTURA DE EVENTO]'),
            createRow('Descripción del Servicio', '[Ej: O.S. 1234/25]'),
            createRow('Novedad del Servicio', '[Ej: Concurrir con uniforme de gala]'),
            createRow('Ubicación de Asignación (*)', '[Ej: Estadio Monumental]'),
            createRow('Horario de Asignación (*)', '[Ej: 18:00 Hs. a terminar.-]'),
            createRow('Horario de Implantación', '[Ej: 16:00 Hs.]'),
            createRow('Personal de Asignación (*)', '[Ej: Personal a designar]'),
            createRow('Unidad de Asignación', '[Ej: FZ-1234]'),
            createRow('Detalles de Asignación', '[Ej: Encuentro Futbolístico "EQUIPO A VS. EQUIPO B"]'),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
    });

    const allPersonnel = [...commandPersonnel, ...servicePersonnel]
        .filter((p, index, self) => index === self.findIndex((t) => t.id === p.id)) // unique
        .sort((a,b) => a.name.localeCompare(b.name));

    const unitParagraphs = [
        new Paragraph({ text: "Unidades Disponibles", style: "Heading2" }),
        ...unitList.map(unit => new Paragraph({ text: sanitizeXmlString(unit), bullet: { level: 0 } }))
    ];

    const personnelParagraphs = [
        new Paragraph({ text: "Personal Disponible", style: "Heading2" }),
        ...allPersonnel.map(p => new Paragraph({ text: sanitizeXmlString(`${p.rank} - ${p.name} (L.P. ${p.id})`), bullet: { level: 0 } }))
    ];

    const doc = new Document({
        creator: "Servicios del Cuerpo de Bomberos de la Ciudad",
        title: "Plantilla para Importación de Servicios",
        styles: {
            paragraphStyles: [
                {
                    id: "Heading1",
                    name: "Heading 1",
                    run: { size: 32, bold: true, font: "Arial" },
                    paragraph: { spacing: { before: 240, after: 240 }, alignment: AlignmentType.CENTER }
                },
                { 
                    id: "Heading2", 
                    name: "Heading 2", 
                    run: HEADING_2_RUN_STYLE, 
                    paragraph: { spacing: { before: 240, after: 120 } } 
                },
            ]
        },
        sections: [{
            children: [
                new Paragraph({ text: "Plantilla de Importación de Servicios", style: "Heading1" }),
                instructions,
                serviceTable,
                new Paragraph({ children: [new PageBreak()] }),
                ...unitParagraphs,
                new Paragraph({ text: "" }),
                ...personnelParagraphs,
            ]
        }]
    });

    Packer.toBlob(doc).then(blob => saveFile(blob, 'plantilla_servicios_tabla.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
};


export const exportRosterTemplate = () => {
    const template = {
        "2025-08-01": {
            "jefeInspecciones": "APELLIDO, Nombre",
            "jefeServicio": "APELLIDO, Nombre",
            "jefeGuardia": "APELLIDO, Nombre",
            "jefeReserva": "APELLIDO, Nombre"
        },
        "2025-08-02": {
            "jefeServicio": "OTRO APELLIDO, Nombre"
        }
    };
    saveFile(JSON.stringify(template, null, 2), 'plantilla_rol_de_guardia.json', 'application/json');
};

export const exportRosterWordTemplate = () => {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    children: [new TextRun({ text: "Plantilla para Rol de Guardia", bold: true, size: 28 })],
                }),
                new Paragraph({
                    children: [new TextRun({ text: "Instrucciones: Mantenga el formato de fecha (DD/MM/AAAA) y de rol (ROL: Nombre).", italics: true, size: 22 })],
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "01/08/2025" }),
                new Paragraph({ text: sanitizeXmlString("JEFE DE INSPECCIONES: APELLIDO, Nombre") }),
                new Paragraph({ text: sanitizeXmlString("JEFE DE SERVICIO: APELLIDO, Nombre") }),
                new Paragraph({ text: sanitizeXmlString("JEFE DE GUARDIA: APELLIDO, Nombre") }),
                new Paragraph({ text: sanitizeXmlString("JEFE DE RESERVA: APELLIDO, Nombre") }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "02/08/2025" }),
                new Paragraph({ text: sanitizeXmlString("JEFE DE SERVICIO: OTRO APELLIDO, Nombre") }),
            ]
        }]
    });

    Packer.toBlob(doc).then(blob => {
        saveFile(blob, 'plantilla_rol_de_guardia.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
};


export const exportUnitReportToPdf = (reportData: UnitReportData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    try {
        const jsonData = JSON.stringify(reportData);
        doc.setProperties({
            subject: `unit-report-data:${jsonData}`
        });
    } catch (e) {
        console.error("Failed to embed JSON data in PDF:", e);
    }

    const drawPageHeader = () => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#c93131'); 
        doc.text("Reporte de Unidades de Bomberos", margin, 15);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        const reportDateTime = reportData.reportDate || new Date().toLocaleString('es-AR');
        doc.text(reportDateTime, pageWidth - margin, 15, { align: 'right' });
    };

    const allRows: any[] = [];
    
    reportData.zones.forEach(zone => {
        allRows.push([{
            content: zone.name,
            colSpan: 6,
            styles: {
                halign: 'center',
                fontStyle: 'bold',
                fillColor: '#b91c1c', 
                textColor: '#ffffff',
                fontSize: 12
            }
        }]);
        
        zone.groups.forEach((group: UnitGroup) => {
            allRows.push([{
                content: group.name,
                colSpan: 6,
                styles: {
                    fontStyle: 'bold',
                    fillColor: '#3f3f46', 
                    textColor: '#ffffff',
                    fontSize: 10
                }
            }]);

            group.units.forEach((unit: FireUnit) => {
                allRows.push([
                    unit.id,
                    unit.type,
                    `${unit.status}${unit.outOfServiceReason ? ` (${unit.outOfServiceReason})` : ''}`,
                    unit.officerInCharge || '-',
                    unit.poc || '-',
                    unit.personnelCount ?? '-'
                ]);
            });
        });
    });

    autoTable(doc, {
        head: [['Unidad', 'Tipo', 'Estado', 'Oficial a Cargo', 'POC', 'Personal']],
        body: allRows,
        startY: 25,
        theme: 'grid',
        headStyles: { 
            fillColor: '#52525b', 
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 2,
            font: 'helvetica'
        },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 30 },
            2: { cellWidth: 35 },
            3: { cellWidth: 'auto' },
            4: { cellWidth: 30 },
            5: { cellWidth: 15, halign: 'center' },
        },
        didDrawPage: (data: any) => {
            drawPageHeader();
        }
    });

    doc.save(`Reporte_Unidades_${reportData.reportDate.split(',')[0].replace(/\//g, '-')}.pdf`);
};

export const exportEraReportToPdf = (reportData: EraData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    const drawPageHeader = () => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#c93131');
        doc.text("Reporte de Trasvazadores de E.R.A.", margin, 15);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        const reportDateTime = reportData.reportDate || new Date().toLocaleString('es-AR');
        doc.text(reportDateTime, pageWidth - margin, 15, { align: 'right' });
    };

    const allRows: any[] = [];
    
    reportData.stations.forEach(station => {
        if (station.hasEquipment && station.equipment.length > 0) {
            station.equipment.forEach((equip, index) => {
                allRows.push([
                    index === 0 ? station.name : '',
                    equip.brand,
                    equip.voltage,
                    equip.condition,
                    equip.dependency
                ]);
            });
        } else {
            allRows.push([station.name, 'NO POSEE', '', '', '']);
        }
    });

    autoTable(doc, {
        head: [['ESTACIÓN', 'MARCA', 'VOLTAJE', 'COND.', 'DEPENDENCIA']],
        body: allRows,
        startY: 25,
        theme: 'grid',
        headStyles: { 
            fillColor: '#52525b',
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 2,
            font: 'helvetica'
        },
        didDrawPage: (data: any) => {
            drawPageHeader();
        }
    });

    doc.save(`Reporte_ERA_${reportData.reportDate.split(',')[0].replace(/\//g, '-')}.pdf`);
};

export const exportGeneratorReportToPdf = (reportData: GeneratorData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    const drawPageHeader = () => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#c93131');
        doc.text("Reporte de Grupos Electrógenos", margin, 15);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        const reportDateTime = reportData.reportDate || new Date().toLocaleString('es-AR');
        doc.text(reportDateTime, pageWidth - margin, 15, { align: 'right' });
    };

    const allRows: any[] = [];
    
    reportData.stations.forEach(station => {
        if (station.hasEquipment && station.equipment.length > 0) {
            station.equipment.forEach((equip, index) => {
                allRows.push([
                    index === 0 ? station.name : '',
                    equip.brand,
                    equip.kva,
                    equip.condition,
                    equip.dependency
                ]);
            });
        } else {
            allRows.push([station.name, 'NO POSEE', '', '', '']);
        }
    });

    autoTable(doc, {
        head: [['ESTACIÓN', 'MARCA', 'KVA', 'COND.', 'DEPENDENCIA']],
        body: allRows,
        startY: 25,
        theme: 'grid',
        headStyles: { 
            fillColor: '#52525b',
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 2,
            font: 'helvetica'
        },
        didDrawPage: (data: any) => {
            drawPageHeader();
        }
    });

    doc.save(`Reporte_Generadores_${reportData.reportDate.split(',')[0].replace(/\//g, '-')}.pdf`);
};

export const exportMaterialsReportToPdf = (reportData: MaterialsData) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;

    const drawPageHeader = () => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#c93131');
        doc.text("Reporte de Materiales", margin, 15);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(150);
        const reportDateTime = reportData.reportDate || new Date().toLocaleString('es-AR');
        doc.text(reportDateTime, pageWidth - margin, 15, { align: 'right' });
    };

    const allRows: any[] = [];
    
    reportData.locations.forEach(location => {
        if (location.materials.length > 0) {
            location.materials.forEach((material, index) => {
                allRows.push([
                    index === 0 ? location.name : '',
                    material.name,
                    material.quantity,
                    material.condition,
                    material.location || '-'
                ]);
            });
        } else {
            allRows.push([location.name, 'Sin materiales registrados', '', '', '']);
        }
    });

    autoTable(doc, {
        head: [['UBICACIÓN', 'MATERIAL', 'CANT.', 'CONDICIÓN', 'UBICACIÓN INTERNA']],
        body: allRows,
        startY: 25,
        theme: 'grid',
        headStyles: { 
            fillColor: '#52525b',
            textColor: '#ffffff',
            fontStyle: 'bold'
        },
        styles: { 
            fontSize: 8, 
            cellPadding: 2,
            font: 'helvetica'
        },
        columnStyles: {
            2: { halign: 'center' }
        },
        didDrawPage: (data: any) => {
            drawPageHeader();
        }
    });

    doc.save(`Reporte_Materiales_${reportData.reportDate.split(',')[0].replace(/\//g, '-')}.pdf`);
};

export const exportSci201ToPdf = (data: SCI201Data) => {
    const doc = new jsPDF();
    let y = 20;

    const addTitle = (title: string) => {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, y);
        y += 8;
    };

    const addSection = (title: string) => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(title, 14, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
    };

    const addField = (label: string, value: string | undefined) => {
        if (!value) return;
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text(label + ":", 16, y);
        doc.setFont('helvetica', 'normal');
        const splitText = doc.splitTextToSize(value, 150);
        doc.text(splitText, 55, y, { align: 'left' });
        y += (splitText.length * 5) + 4;
    };

    addTitle("SCI-201: Briefing de Incidente");
    addField("Nombre del Incidente", data.incidentName);
    addField("Fecha/Hora de Preparación", new Date(data.prepDateTime).toLocaleString());

    addSection("Información General");
    addField("Ubicación", data.incidentLocation);
    
    addSection("Evaluación de la Situación Actual");
    addField("Naturaleza y Magnitud", data.evalNature);
    addField("Amenazas Significativas", data.evalThreats);
    addField("Área Afectada", data.evalAffectedArea);
    addField("Aislamiento y Cierres", data.evalIsolation);

    addSection("Plan de Acción");
    addField("Objetivos Iniciales", data.initialObjectives);
    addField("Estrategias", data.strategies);
    addField("Tácticas", data.tactics);

    addSection("Organización y Logística");
    addField("Puesto Comando (PC)", data.pcLocation);
    addField("Ubicación de Espera (E)", data.eLocation);
    addField("Ruta de Ingreso", data.ingressRoute);
    addField("Ruta de Egreso", data.egressRoute);
    addField("Mensaje de Seguridad", data.safetyMessage);
    addField("Comandante del Incidente", data.incidentCommander);

    if (data.actions && data.actions.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        addSection("Acciones Realizadas");
        autoTable(doc, {
            startY: y,
            head: [['Hora', 'Resumen de la Acción']],
            body: data.actions.map(a => [a.time, a.summary]),
            theme: 'grid',
            headStyles: { fillColor: '#3f3f46' },
        });
    }

    doc.save(`SCI-201_${(data.incidentName || 'Briefing').replace(/\s/g, '_')}.pdf`);
};

export const exportSci211ToPdf = (resources: SCI211Resource[]) => {
    const doc = new jsPDF('l', 'mm', 'a4'); 
    doc.setFontSize(16);
    doc.text("SCI-211: Registro de Recursos", 14, 20);

    const head = [['Recurso', 'Institución', 'Fecha/Hora Arribo', 'Cant. Pers.', 'Estado', 'Asignado a', 'Observaciones']];
    const body = resources.map(res => [
        res.resourceType,
        res.institution,
        new Date(res.arrivalDateTime).toLocaleString(),
        res.personnelCount,
        res.status,
        res.assignedTo,
        res.observations
    ]);

    autoTable(doc, {
        head,
        body,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: '#3f3f46' },
        styles: { fontSize: 8 }
    });
    
    doc.save('SCI-211_Registro_Recursos.pdf');
};

export const exportSci207ToPdf = (victims: SCI207Victim[]) => {
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text("SCI-207: Registro de Víctimas", 14, 20);

    const head = [['Nombre/Ident.', 'Sexo', 'Edad', 'Triage', 'Destino', 'Transportado Por', 'Fecha/Hora Transp.']];
    const body = victims.map(vic => [
        vic.patientName,
        vic.sex,
        vic.age,
        vic.triage,
        vic.transportLocation,
        vic.transportedBy,
        new Date(vic.transportDateTime).toLocaleString()
    ]);
    
    const triageColors: {[key in TriageCategory]: number[]} = {
        'Rojo': [220, 38, 38],
        'Amarillo': [234, 179, 8],
        'Verde': [34, 197, 94],
        'Negro': [17, 24, 39],
        '': [113, 113, 122]
    };

    autoTable(doc, {
        head,
        body,
        startY: 28,
        theme: 'grid',
        headStyles: { fillColor: '#3f3f46' },
        styles: { fontSize: 8 },
        didParseCell: (data: any) => {
            if (data.column.index === 3 && data.cell.section === 'body') {
                const triage = data.cell.raw as TriageCategory;
                if (triage in triageColors) {
                    data.cell.styles.fillColor = triageColors[triage];
                    data.cell.styles.textColor = (triage === 'Amarillo' || triage === '') ? [0,0,0] : [255,255,255];
                }
            }
        }
    });
    
    doc.save('SCI-207_Registro_Victimas.pdf');
};

const createPdfTable = (doc: jsPDF, title: string, head: any[], body: any[], startY: number) => {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, startY);
    autoTable(doc, {
        head: head,
        body: body,
        startY: startY + 6,
        theme: 'grid',
        headStyles: { fillColor: '#3f3f46' }, 
        styles: { fontSize: 8 }
    });
    return (doc as any).lastAutoTable.finalY;
};

export const exportPersonnelToExcel = (personnel: Personnel[], title: string) => {
    const data = personnel.map(p => ({
        'L.P.': p.id,
        'Jerarquía': p.rank,
        'Apellido y Nombre': p.name,
        'Estación': p.station || '',
        'Destacamento': p.detachment || '',
        'POC': p.poc || '',
        'PART': p.part || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, title);
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveFile(excelBuffer, `${title.replace(/\s/g, '_')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

export const exportUnitsToExcel = (units: string[]) => {
    const data = units.map(u => ({ 'ID de Unidad': u }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Unidades');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveFile(excelBuffer, 'Nomenclador_Unidades.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
};

export const exportFullCommandPostReportToPdf = ({
    availableUnits,
    availablePersonnel,
    interventionGroups,
    croquisImage,
    sciData
}: {
    availableUnits: FireUnit[],
    availablePersonnel: Personnel[],
    interventionGroups: InterventionGroup[],
    croquisImage: string | null,
    sciData: { sci201: any, sci211: any[], sci207: any[] }
}) => {
    const doc = new jsPDF();
    let y = 15;

    // Page 1: Summary
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text("Resumen de Puesto de Comando", 14, y);
    y += 10;
    doc.setFontSize(10);
    doc.text(`Fecha de Reporte: ${new Date().toLocaleString('es-AR')}`, 14, y);
    y += 10;
    
    const interventionUnits = interventionGroups.flatMap(g => g.units);
    const interventionPersonnel = interventionGroups.flatMap(g => g.personnel);

    y = createPdfTable(doc, `Recursos en Intervención (${interventionUnits.length} U / ${interventionPersonnel.length} P)`, 
        [['Unidad/Personal', 'Tipo/Jerarquía', 'Grupo']],
        [
            ...interventionUnits.map(u => [u.id, u.type, u.groupName]),
            ...interventionPersonnel.map(p => [p.name, p.rank, p.groupName])
        ], 
    y) + 10;

    if (y > 200) { doc.addPage(); y = 15; }

    y = createPdfTable(doc, `Recursos Disponibles (${availableUnits.length} U / ${availablePersonnel.length} P)`, 
        [['Unidad/Personal', 'Tipo/Jerarquía']],
        [
            ...availableUnits.map(u => [u.id, u.type]),
            ...availablePersonnel.map(p => [p.name, p.rank])
        ], 
    y) + 10;


    // Page 2: Tactical Command
    doc.addPage();
    y = 15;
    doc.setFontSize(18);
    doc.text("Comando Táctico", 14, y);
    y += 15;
    
    interventionGroups.forEach(group => {
        if (y > 250) { doc.addPage(); y = 15; }
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(`${group.type}: ${group.name}`, 14, y);
        y += 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`A Cargo: ${group.officerInCharge || 'N/A'}`, 14, y);
        y+= 8;

        if (group.units.length > 0) {
            y = createPdfTable(doc, 'Unidades', 
                [['ID', 'Tarea', 'Ubicación', 'H. Salida', 'H. Lugar']], 
                group.units.map(u => [u.id, u.task, u.locationInScene, u.departureTime, u.onSceneTime]), 
                y
            ) + 6;
        }

        if (group.personnel.length > 0) {
             y = createPdfTable(doc, 'Personal', 
                [['Nombre', 'Jerarquía']],
                group.personnel.map(p => [p.name, p.rank]),
                y
            ) + 10;
        }
    });

    // Page 3: Croquis
    if (croquisImage) {
        doc.addPage();
        doc.setFontSize(18);
        doc.text("Croquis de Situación", 14, 15);
        const imgProps = doc.getImageProperties(croquisImage);
        const pdfWidth = doc.internal.pageSize.getWidth() - 28;
        const pdfHeight = doc.internal.pageSize.getHeight() - 30;
        const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
        const imgWidth = imgProps.width * ratio;
        const imgHeight = imgProps.height * ratio;
        doc.addImage(croquisImage, 'PNG', 14, 25, imgWidth, imgHeight);
    }
    
    // Page 4+: SCI Forms
    if (sciData.sci201 && sciData.sci201.incidentName) {
        doc.addPage();
        y = 15;
        doc.setFontSize(18);
        doc.text("SCI-201: Briefing de Incidente", 14, y);
        y += 10;
        const sci201body = [
            ['Nombre Incidente', sciData.sci201.incidentName],
            ['Ubicación', sciData.sci201.incidentLocation],
            ['Comandante', sciData.sci201.incidentCommander],
            ['Objetivos', sciData.sci201.initialObjectives],
        ];
        autoTable(doc, { body: sci201body, startY: y, theme: 'plain' });
        y = (doc as any).lastAutoTable.finalY + 5;
    }

    if (sciData.sci211.length > 0) {
        if (y > 220) { doc.addPage(); y = 15; }
        y = createPdfTable(doc, "SCI-211: Registro de Recursos", 
            [['Recurso', 'Institución', 'Estado']],
            sciData.sci211.map((r: SCI211Resource) => [r.resourceType, r.institution, r.status]),
            y
        ) + 10;
    }

    if (sciData.sci207.length > 0) {
        if (y > 220) { doc.addPage(); y = 15; }
        y = createPdfTable(doc, "SCI-207: Registro de Víctimas", 
            [['Nombre/ID', 'Triage', 'Destino']],
            sciData.sci207.map((v: SCI207Victim) => [v.patientName, v.triage, v.transportLocation]),
            y
        ) + 10;
    }


    doc.save(`Reporte_Puesto_Comando_${new Date().toISOString().split('T')[0]}.pdf`);
};
