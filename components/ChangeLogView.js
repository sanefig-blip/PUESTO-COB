import React from 'react';
import { TrashIcon, ArchiveBoxIcon } from './icons.js';

const ChangeLogView = ({ logEntries, onClearLog }) => {

    const formatTimestamp = (isoString) => {
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
        React.createElement("div", { className: "animate-fade-in bg-zinc-800/60 p-6 rounded-xl space-y-6" },
            React.createElement("div", { className: "flex justify-between items-center" },
                React.createElement("h2", { className: "text-3xl font-bold text-white flex items-center gap-3" },
                    React.createElement(ArchiveBoxIcon, { className: "w-8 h-8 text-blue-300" }),
                    "Registro de Cambios del Sistema"
                ),
                React.createElement("button", {
                    onClick: onClearLog,
                    className: "flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md text-white font-semibold transition-colors"
                },
                    React.createElement(TrashIcon, { className: "w-5 h-5" }),
                    "Limpiar Registro"
                )
            ),
            React.createElement("div", { className: "overflow-x-auto max-h-[70vh] rounded-lg" },
                React.createElement("table", { className: "w-full min-w-[800px] text-left" },
                    React.createElement("thead", { className: "sticky top-0 bg-zinc-900 z-10" },
                        React.createElement("tr", { className: "text-sm font-semibold text-zinc-300" },
                            React.createElement("th", { className: "p-3" }, "Fecha y Hora"),
                            React.createElement("th", { className: "p-3" }, "Usuario"),
                            React.createElement("th", { className: "p-3" }, "Acción"),
                            React.createElement("th", { className: "p-3" }, "Detalles")
                        )
                    ),
                    React.createElement("tbody", null,
                        logEntries.length > 0 ? logEntries.map(entry => (
                            React.createElement("tr", { key: entry.id, className: "border-t border-zinc-700 hover:bg-zinc-700/50" },
                                React.createElement("td", { className: "p-3 text-zinc-400 font-mono whitespace-nowrap" }, formatTimestamp(entry.timestamp)),
                                React.createElement("td", { className: "p-3 text-yellow-300 font-semibold" }, entry.user),
                                React.createElement("td", { className: "p-3 text-zinc-200" }, entry.action),
                                React.createElement("td", { className: "p-3 text-zinc-300 text-sm" }, entry.details)
                            )
                        )) : (
                            React.createElement("tr", null,
                                React.createElement("td", { colSpan: 4, className: "text-center py-12 text-zinc-500" },
                                    "No hay entradas en el registro."
                                )
                            )
                        )
                    )
                )
            )
        )
    );
};

export default ChangeLogView;
