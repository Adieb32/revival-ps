/**
 * Utilitas Ekspor Laporan Revival PlayStation (PNG, Excel, Word, CSV)
 */
function downloadBlobFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportToPNG(elementId, filename) {
    const target = document.getElementById(elementId);
    if (!target) return;

    const noExportEls = target.querySelectorAll(".no-export");
    noExportEls.forEach((el) => (el.style.display = "none"));

    if (typeof html2canvas !== "undefined") {
        html2canvas(target, { scale: 2, backgroundColor: "#ffffff", useCORS: true })
            .then((canvas) => {
                noExportEls.forEach((el) => (el.style.display = ""));
                canvas.toBlob((blob) => {
                    if (blob) downloadBlobFile(blob, `${filename}.png`);
                }, "image/png");
            })
            .catch((err) => {
                noExportEls.forEach((el) => (el.style.display = ""));
                console.error("Gagal ekspor PNG:", err);
                alert("Gagal mengunduh gambar PNG.");
            });
    } else {
        noExportEls.forEach((el) => (el.style.display = ""));
        alert("Library html2canvas belum termuat. Pastikan koneksi internet aktif.");
    }
}

function exportToExcel(tableId, sheetName, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const clone = table.cloneNode(true);
    clone.querySelectorAll(".no-export").forEach((el) => el.remove());

    if (typeof XLSX !== "undefined") {
        const wb = XLSX.utils.table_to_book(clone, { sheet: sheetName });
        XLSX.writeFile(wb, `${filename}.xlsx`);
    } else {
        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:x="urn:schemas-microsoft-com:office:excel"
                  xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="UTF-8"></head>
            <body>${clone.outerHTML}</body>
            </html>`;
        const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        downloadBlobFile(blob, `${filename}.xls`);
    }
}

function exportTableToWord(tableId, title, subtitle, filename) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const clone = table.cloneNode(true);
    clone.querySelectorAll(".no-export").forEach((el) => el.remove());

    const html = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: Arial, sans-serif; color: #0f172a; }
                h2 { color: #0b132b; margin-bottom: 4px; }
                p { color: #475569; font-size: 11pt; margin-top: 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10pt; }
                th { background: #0b132b; color: #ffffff; padding: 8px; border: 1px solid #334155; text-align: left; }
                td { padding: 7px 8px; border: 1px solid #cbd5e1; }
                tfoot td { background: #f1f5f9; font-weight: bold; }
            </style>
        </head>
        <body>
            <h2>REVIVAL PLAYSTATION — ${title}</h2>
            <p>${subtitle} &bull; Dicetak: ${new Date().toLocaleString("id-ID")}</p>
            ${clone.outerHTML}
        </body>
        </html>`;

    const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8;" });
    downloadBlobFile(blob, `${filename}.doc`);
}

function triggerExportRentalWord() {
    exportTableToWord(
        "rentalTable",
        "DATA PENYEWAAN & PENGEMBALIAN",
        "Laporan Transaksi Penyewaan Unit Konsol",
        "Rekap_Penyewaan_RevivalPS"
    );
}

function triggerExportCashflowWord() {
    exportTableToWord(
        "cashflowTable",
        "LAPORAN CASHFLOW HARIAN",
        "Rekapitulasi Pemasukan, Pengeluaran & Saldo Berjalan",
        "Rekap_Cashflow_RevivalPS"
    );
}
