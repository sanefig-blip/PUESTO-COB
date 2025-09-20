import React, { useState, useEffect } from 'react';
import { RegimenData, RegimenSection, User } from '../types';
import { PencilIcon, XCircleIcon } from './icons';

interface RegimenDeIntervencionProps {
    regimenData: RegimenData;
    onUpdateRegimenData: (updatedData: RegimenData) => void;
    currentUser: User;
}

const RegimenDeIntervencion: React.FC<RegimenDeIntervencionProps> = ({ regimenData, onUpdateRegimenData, currentUser }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editableData, setEditableData] = useState<RegimenData>(() => JSON.parse(JSON.stringify(regimenData)));

    useEffect(() => {
        setEditableData(JSON.parse(JSON.stringify(regimenData)));
    }, [regimenData]);

    const handleContentChange = (sectionIndex: number, contentIndex: number, value: string) => {
        setEditableData(prev => {
            const newSections = [...prev.sections];
            const newContent = [...newSections[sectionIndex].content];
            (newContent[contentIndex] as any).content = value;
            newSections[sectionIndex] = { ...newSections[sectionIndex], content: newContent };
            return { ...prev, sections: newSections };
        });
    };

    const handleTableCellChange = (sectionIndex: number, contentIndex: number, rowIndex: number, header: string, value: string) => {
         setEditableData(prev => {
            const newSections = [...prev.sections];
            const content = newSections[sectionIndex].content[contentIndex];
            if (content.type === 'table') {
                const newRows = [...content.rows];
                newRows[rowIndex] = { ...newRows[rowIndex], [header]: value };
                const newContent = { ...content, rows: newRows };
                const allContent = [...newSections[sectionIndex].content];
                allContent[contentIndex] = newContent;
                newSections[sectionIndex] = { ...newSections[sectionIndex], content: allContent };
                return { ...prev, sections: newSections };
            }
            return prev;
        });
    };

    const handleSave = () => {
        onUpdateRegimenData({ ...editableData, lastUpdated: new Date().toISOString() });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditableData(JSON.parse(JSON.stringify(regimenData)));
        setIsEditing(false);
    };

    const EditableField: React.FC<{ value: string, onChange: (value: string) => void, isEditing: boolean, tag?: 'p' | 'h3' | 'span', className?: string }> = 
    ({ value, onChange, isEditing, tag = 'p', className = '' }) => {
        const Tag = tag;
        return isEditing ? (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full bg-zinc-700/80 border border-zinc-600 rounded-md p-2 text-white resize-y ${className}`}
            />
        ) : (
            <Tag className={className}>{value}</Tag>
        );
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="bg-zinc-800/60 p-6 rounded-xl flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">{regimenData.title}</h2>
                    <p className="text-lg font-semibold text-zinc-300 mt-1">ORDEN DEL CUERPO Nº 092</p>
                    <p className="text-zinc-400 text-sm">Ciudad Autónoma de Buenos Aires, miércoles 18 de septiembre de 2024.</p>
                </div>
                {currentUser.role === 'admin' && (
                    isEditing ? (
                        <div className="flex items-center gap-2">
                            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md text-white font-semibold transition-colors flex items-center gap-2"><PencilIcon className="w-5 h-5" /> Guardar</button>
                            <button onClick={handleCancel} className="p-2 rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"><XCircleIcon className="w-6 h-6" /></button>
                        </div>
                    ) : (
                        <button onClick={() => setIsEditing(true)} className="px-4 py-2 bg-zinc-600 hover:bg-zinc-500 rounded-md text-white font-semibold transition-colors flex items-center gap-2"><PencilIcon className="w-5 h-5" /> Editar</button>
                    )
                )}
            </div>

            {editableData.sections.map((section, sectionIdx) => (
                <section key={section.id} className="bg-zinc-800/60 p-6 rounded-xl">
                    <h3 className="text-2xl font-bold text-yellow-300 mb-4 border-b border-zinc-700 pb-2">{section.title}</h3>
                    <div className="space-y-4">
                        {section.content.map((item, contentIdx) => {
                            switch (item.type) {
                                case 'text':
                                    return <EditableField key={contentIdx} value={item.content} onChange={(val) => handleContentChange(sectionIdx, contentIdx, val)} isEditing={isEditing} className="text-zinc-300 leading-relaxed" />;
                                case 'subtitle':
                                     return <h4 key={contentIdx} className="text-xl font-bold text-blue-300 mt-6 mb-2">{item.content}</h4>;
                                case 'map':
                                    return (
                                        <div key={item.id} className="mt-6 space-y-3">
                                            <h4 className="text-lg font-semibold text-zinc-100">{item.title}</h4>
                                            <img src={item.imageUrl} alt={item.title} className="rounded-lg border-2 border-zinc-700 w-full" />
                                        </div>
                                    );
                                case 'table':
                                    return (
                                        <div key={contentIdx} className="overflow-x-auto">
                                            <table className="w-full min-w-[600px] text-left">
                                                <thead>
                                                    <tr className="border-b-2 border-zinc-600">
                                                        {item.headers.map(header => <th key={header} className="p-2 text-sm font-semibold text-zinc-300">{header}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {item.rows.map((row, rowIdx) => (
                                                        <tr key={row.id} className="border-t border-zinc-700">
                                                            {item.headers.map(header => (
                                                                <td key={`${row.id}-${header}`} className="p-2 text-zinc-300">
                                                                    <EditableField value={row[header] || ''} onChange={(val) => handleTableCellChange(sectionIdx, contentIdx, rowIdx, header, val)} isEditing={isEditing} tag="span" />
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {item.notes && (
                                                <div className="mt-4 space-y-2 text-sm text-zinc-400 italic">
                                                    {item.notes.map((note, noteIdx) => <p key={noteIdx}>* {note}</p>)}
                                                </div>
                                            )}
                                        </div>
                                    );
                                case 'list':
                                    return (
                                        <ul key={contentIdx} className="list-disc list-inside space-y-2 pl-4">
                                            {item.items.map((listItem, listIdx) => {
                                                 const parts = listItem.split('....');
                                                 return (
                                                     <li key={listIdx} className="text-zinc-300">
                                                         <span className="font-semibold text-zinc-100">{parts[0]}</span>
                                                         {parts[1] && <span className="text-zinc-400">....{parts[1]}</span>}
                                                     </li>
                                                 );
                                            })}
                                        </ul>
                                    );
                                default:
                                    return null;
                            }
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default RegimenDeIntervencion;