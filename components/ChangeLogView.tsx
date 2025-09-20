import React from 'react';
import { LogEntry } from '../types';
import { TrashIcon, ArchiveBoxIcon } from './icons';

interface ChangeLogViewProps {
    logEntries: LogEntry[];
    onClearLog: () => void;
}

const ChangeLogView: React.FC<ChangeLogViewProps> = ({ logEntries, onClearLog }) => {

    const formatTimestamp = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="animate-fade-in bg-zinc-800/60 p-6 rounded-xl space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <ArchiveBoxIcon className="w-8 h-8 text-blue-300" />
                    Registro de Cambios del Sistema
                </h2>
                <button
                    onClick={onClearLog}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md text-white font-semibold transition-colors"
                >
                    <TrashIcon className="w-5 h-5" />
                    Limpiar Registro
                </button>
            </div>
            <div className="overflow-x-auto max-h-[70vh] rounded-lg">
                <table className="w-full min-w-[800px] text-left">
                    <thead className="sticky top-0 bg-zinc-900 z-10">
                        <tr className="text-sm font-semibold text-zinc-300">
                            <th className="p-3">Fecha y Hora</th>
                            <th className="p-3">Usuario</th>
                            <th className="p-3">Acción</th>
                            <th className="p-3">Detalles</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logEntries.length > 0 ? logEntries.map(entry => (
                            <tr key={entry.id} className="border-t border-zinc-700 hover:bg-zinc-700/50">
                                <td className="p-3 text-zinc-400 font-mono whitespace-nowrap">{formatTimestamp(entry.timestamp)}</td>
                                <td className="p-3 text-yellow-300 font-semibold">{entry.user}</td>
                                <td className="p-3 text-zinc-200">{entry.action}</td>
                                <td className="p-3 text-zinc-300 text-sm">{entry.details}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-12 text-zinc-500">
                                    No hay entradas en el registro.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ChangeLogView;
