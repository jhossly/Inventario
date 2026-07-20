import * as XLSX from 'xlsx';

// Convierte un array de objetos planos en filas para exportar.
function normalizar(data) {
    return (data || []).map(row => {
        const o = {};
        for (const [k, v] of Object.entries(row)) {
            o[k] = (v === null || v === undefined) ? '' : v;
        }
        return o;
    });
}

export function exportReport(data, fileName) {
    exportExcel(data, fileName);
}

export function exportExcel(data, fileName) {
    const rows = normalizar(data);
    if (!rows.length) { console.warn('No hay datos para exportar'); return; }
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

export function exportCSV(data, fileName) {
    const rows = normalizar(data);
    if (!rows.length) { console.warn('No hay datos para exportar'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [
        headers.join(','),
        ...rows.map(r => headers.map(h => {
            const val = String(r[h] ?? '').replace(/"/g, '""');
            return /[",\n]/.test(val) ? `"${val}"` : val;
        }).join(','))
    ].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

export async function exportPDF(rowsData, columns, fileName, title) {
    try {
        const { jsPDF } = await import('jspdf');
        const data = normalizar(rowsData);
        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        doc.setFontSize(16);
        doc.text(title || 'Reporte', 40, 40);
        doc.setFontSize(10);

        const startY = 70;
        const colW = (doc.internal.pageSize.getWidth() - 80) / columns.length;
        let y = startY;

        // Encabezados
        doc.setFont(undefined, 'bold');
        columns.forEach((c, i) => doc.text(String(c.header), 40 + i * colW, y));
        doc.setFont(undefined, 'normal');
        y += 18;

        if (!data.length) {
            doc.text('Sin datos en el período seleccionado', 40, y);
        }

        data.forEach((row, idx) => {
            if (y > doc.internal.pageSize.getHeight() - 40) {
                doc.addPage();
                y = startY;
            }
            if (idx % 2 === 0) {
                doc.setFillColor(240, 253, 250);
                doc.rect(36, y - 12, doc.internal.pageSize.getWidth() - 72, 16, 'F');
            }
            columns.forEach((c, i) => {
                const val = String(row[c.key] ?? '');
                doc.text(val.length > 28 ? val.slice(0, 25) + '…' : val, 40 + i * colW, y);
            });
            y += 16;
        });

        doc.save(`${fileName}.pdf`);
    } catch (e) {
        console.error('Error exportando PDF:', e);
        alert('No se pudo exportar el PDF');
    }
}
