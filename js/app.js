/**
 * Logika Utama Aplikasi Revival PlayStation
 * - Desain & Navigasi: Login -> Portal Pilihan 2 Opsi -> Modul Penyewaan / Modul Cashflow
 * - Auto-logout berbasis sessionStorage (sesi berakhir otomatis saat browser/tab ditutup)
 * - Konten Penyewaan: Nama pelanggan, WhatsApp, Jenis & Nomor identitas, Foto identitas (kompresi),
 *   Unit (PS3/PS4/PS5/+TV), Paket sewa, Waktu mulai, Rencana kembali, Harga, Pembayaran, Status sewa, Catatan.
 */

let supabaseClient = null;
let isCloudMode = false;
let rentalsData = [];
let cashflowData = [];

/* =========================================================
   INISIALISASI SUPABASE & HELPER
   ========================================================= */
function initDatabaseConnection() {
    const { URL, ANON_KEY } = APP_CONFIG.SUPABASE;
    const configured =
        URL &&
        ANON_KEY &&
        !URL.includes("YOUR_SUPABASE") &&
        !ANON_KEY.includes("YOUR_SUPABASE") &&
        typeof window.supabase !== "undefined";

    const badgeText = document.getElementById("dbModeText");
    if (configured) {
        try {
            supabaseClient = window.supabase.createClient(URL, ANON_KEY);
            isCloudMode = true;
            if (badgeText) badgeText.textContent = "Supabase Cloud";
        } catch (err) {
            console.warn("Supabase gagal terhubung, menggunakan Mode Lokal:", err);
            isCloudMode = false;
            if (badgeText) badgeText.textContent = "Mode Lokal";
        }
    } else {
        isCloudMode = false;
        if (badgeText) badgeText.textContent = "Mode Lokal";
    }
}

function formatRupiah(num) {
    const n = Number(num) || 0;
    return "Rp " + n.toLocaleString("id-ID");
}

function formatDateTimeID(isoStr) {
    if (!isoStr) return "-";
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return isoStr;
    return d.toLocaleString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function toLocalDateTimeInput(isoStr) {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "";
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function compressImage(file, maxWidth = 800, quality = 0.72) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width);
                const canvas = document.createElement("canvas");
                canvas.width = Math.round(img.width * scale);
                canvas.height = Math.round(img.height * scale);
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* =========================================================
   AUTENTIKASI LOGIN & AUTO-LOGOUT (sessionStorage)
   ========================================================= */
function checkSession() {
    // Hapus sisa sesi localStorage jika ada agar auto-logout bekerja ketat saat tab/browser ditutup
    localStorage.removeItem(APP_CONFIG.AUTH.SESSION_KEY);
    const isLoggedIn = sessionStorage.getItem(APP_CONFIG.AUTH.SESSION_KEY) === "true";

    const loginView = document.getElementById("loginView");
    const appNavbar = document.getElementById("appNavbar");
    const portalView = document.getElementById("portalView");
    const rentalView = document.getElementById("rentalView");
    const cashflowView = document.getElementById("cashflowView");

    if (isLoggedIn) {
        loginView.classList.add("hidden");
        appNavbar.classList.remove("hidden");
        document.getElementById("navUserName").textContent = APP_CONFIG.AUTH.DISPLAY_NAME;
        showPortalView();
        loadAllData();
    } else {
        loginView.classList.remove("hidden");
        appNavbar.classList.add("hidden");
        portalView.classList.add("hidden");
        rentalView.classList.add("hidden");
        cashflowView.classList.add("hidden");
    }
}

function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById("loginUsername").value.trim();
    const pass = document.getElementById("loginPassword").value;
    const errorBox = document.getElementById("loginError");

    if (user === APP_CONFIG.AUTH.USERNAME && pass === APP_CONFIG.AUTH.PASSWORD) {
        sessionStorage.setItem(APP_CONFIG.AUTH.SESSION_KEY, "true");
        errorBox.classList.add("hidden");
        document.getElementById("loginForm").reset();
        checkSession();
    } else {
        errorBox.textContent = "Username atau password salah. Silakan periksa kembali.";
        errorBox.classList.remove("hidden");
    }
}

function handleLogout() {
    sessionStorage.removeItem(APP_CONFIG.AUTH.SESSION_KEY);
    checkSession();
}

/* =========================================================
   NAVIGASI ANTAR HALAMAN (PORTAL -> PENYEWAAN / CASHFLOW)
   ========================================================= */
function showPortalView() {
    document.getElementById("portalView").classList.remove("hidden");
    document.getElementById("rentalView").classList.add("hidden");
    document.getElementById("cashflowView").classList.add("hidden");
}

function openRentalModule() {
    document.getElementById("portalView").classList.add("hidden");
    document.getElementById("rentalView").classList.remove("hidden");
    document.getElementById("cashflowView").classList.add("hidden");
    setDefaultRentalDateTime();
    renderRentalTable();
}

function openCashflowModule() {
    document.getElementById("portalView").classList.add("hidden");
    document.getElementById("rentalView").classList.add("hidden");
    document.getElementById("cashflowView").classList.remove("hidden");
    setDefaultCashflowDate();
    renderCashflowTable();
}

/* =========================================================
   LOAD DATA (SUPABASE / LOCALSTORAGE)
   ========================================================= */
async function loadAllData() {
    await fetchRentals();
    await fetchCashflow();
}

async function fetchRentals() {
    if (isCloudMode) {
        const { data, error } = await supabaseClient
            .from("penyewaan")
            .select("*")
            .order("created_at", { ascending: false });
        if (!error && data) {
            rentalsData = data;
            renderRentalTable();
            return;
        }
    }
    const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.RENTALS);
    rentalsData = raw ? JSON.parse(raw) : [];
    renderRentalTable();
}

async function fetchCashflow() {
    if (isCloudMode) {
        const { data, error } = await supabaseClient
            .from("cashflow")
            .select("*")
            .order("tanggal", { ascending: false })
            .order("created_at", { ascending: false });
        if (!error && data) {
            cashflowData = data;
            renderCashflowTable();
            return;
        }
    }
    const raw = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.CASHFLOW);
    cashflowData = raw ? JSON.parse(raw) : [];
    renderCashflowTable();
}

/* =========================================================
   MODUL 1: DATA PENYEWAAN & PENGEMBALIAN (KONTEN BARU)
   ========================================================= */
function setDefaultRentalDateTime() {
    const el = document.getElementById("rentalWaktuMulai");
    if (el && !el.value) {
        el.value = toLocalDateTimeInput(new Date().toISOString());
    }
}

function resetRentalForm() {
    document.getElementById("rentalForm").reset();
    document.getElementById("rentalEditId").value = "";
    document.getElementById("rentalFormTitle").textContent = "Tambah Data Penyewaan";
    document.getElementById("btnSaveRental").textContent = "Simpan Data";
    document.getElementById("btnCancelRental").textContent = "Kosongkan Form";
    document.getElementById("rentalEditBadge").classList.add("hidden");
    document.getElementById("rentalSyncCashflow").checked = true;
    setDefaultRentalDateTime();
}

async function saveRental(event) {
    event.preventDefault();
    const editId = document.getElementById("rentalEditId").value;
    const existing = rentalsData.find((r) => String(r.id) === String(editId));

    const fileInput = document.getElementById("rentalFotoId");
    const hapusFoto = document.getElementById("rentalHapusFoto").checked;
    let fotoBase64 = existing ? existing.foto_identitas : null;

    if (hapusFoto) {
        fotoBase64 = null;
    } else if (fileInput.files && fileInput.files[0]) {
        fotoBase64 = await compressImage(fileInput.files[0]);
    }

    const record = {
        nama_pelanggan: document.getElementById("rentalNama").value.trim(),
        nomor_whatsapp: document.getElementById("rentalWhatsapp").value.trim(),
        jenis_identitas: document.getElementById("rentalJenisId").value,
        nomor_identitas: document.getElementById("rentalNomorId").value.trim(),
        foto_identitas: fotoBase64,
        izin_foto: document.getElementById("rentalIzinPelanggan").checked,
        unit: document.getElementById("rentalUnit").value,
        paket_sewa: document.getElementById("rentalPaket").value,
        waktu_mulai: document.getElementById("rentalWaktuMulai").value,
        rencana_kembali: document.getElementById("rentalRencanaKembali").value || null,
        harga: Number(document.getElementById("rentalHarga").value) || 0,
        pembayaran: document.getElementById("rentalPembayaran").value,
        status_sewa: document.getElementById("rentalStatusSewa").value,
        catatan: document.getElementById("rentalCatatan").value.trim(),
        updated_at: new Date().toISOString()
    };

    if (isCloudMode) {
        if (editId) {
            const { error } = await supabaseClient.from("penyewaan").update(record).eq("id", editId);
            if (error) {
                alert("Gagal memperbarui data ke Supabase: " + error.message);
                return;
            }
        } else {
            const { error } = await supabaseClient.from("penyewaan").insert([record]);
            if (error) {
                alert("Gagal menyimpan data ke Supabase: " + error.message);
                return;
            }
        }
    } else {
        if (editId) {
            const idx = rentalsData.findIndex((r) => String(r.id) === String(editId));
            if (idx !== -1) {
                rentalsData[idx] = { ...rentalsData[idx], ...record };
            }
        } else {
            rentalsData.unshift({
                id: "rent_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
                ...record,
                created_at: new Date().toISOString()
            });
        }
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.RENTALS, JSON.stringify(rentalsData));
    }

    // Sinkronisasi otomatis ke Cashflow Harian jika input baru & pembayaran DP / Lunas
    const syncCf = document.getElementById("rentalSyncCashflow").checked;
    if (!editId && syncCf && (record.pembayaran === "Lunas" || record.pembayaran === "DP") && record.harga > 0) {
        const cfEntry = {
            tanggal: (record.waktu_mulai || new Date().toISOString()).slice(0, 10),
            shift: "Full Day",
            jenis: "Pemasukan",
            kategori: "Sewa Konsol",
            uraian: `Sewa ${record.unit} (${record.paket_sewa}) - ${record.nama_pelanggan} [${record.pembayaran}]`,
            nominal: record.harga,
            metode: "Tunai (Cash)",
            catatan: record.catatan || "Otomatis dari Data Penyewaan"
        };
        await insertCashflowRecord(cfEntry);
    }

    resetRentalForm();
    await fetchRentals();
}

function editRental(id) {
    const item = rentalsData.find((r) => String(r.id) === String(id));
    if (!item) return;

    document.getElementById("rentalEditId").value = item.id;
    document.getElementById("rentalNama").value = item.nama_pelanggan || "";
    document.getElementById("rentalWhatsapp").value = item.nomor_whatsapp || "";
    document.getElementById("rentalJenisId").value = item.jenis_identitas || "KTP";
    document.getElementById("rentalNomorId").value = item.nomor_identitas || "";
    document.getElementById("rentalHapusFoto").checked = false;
    document.getElementById("rentalUnit").value = item.unit || "PS3";
    document.getElementById("rentalPaket").value = item.paket_sewa || "Per jam";
    document.getElementById("rentalWaktuMulai").value = toLocalDateTimeInput(item.waktu_mulai);
    document.getElementById("rentalRencanaKembali").value = toLocalDateTimeInput(item.rencana_kembali);
    document.getElementById("rentalHarga").value = item.harga || 0;
    document.getElementById("rentalPembayaran").value = item.pembayaran || "Belum dibayar";
    document.getElementById("rentalStatusSewa").value = item.status_sewa || "Disewa";
    document.getElementById("rentalCatatan").value = item.catatan || "";
    document.getElementById("rentalIzinPelanggan").checked = Boolean(item.izin_foto);

    document.getElementById("rentalFormTitle").textContent = "Edit Data Penyewaan";
    document.getElementById("btnSaveRental").textContent = "Perbarui Data";
    document.getElementById("btnCancelRental").textContent = "Batal Edit";
    document.getElementById("rentalEditBadge").classList.remove("hidden");

    document.getElementById("rentalFormCard").scrollIntoView({ behavior: "smooth" });
}

async function finishRental(id) {
    const item = rentalsData.find((r) => String(r.id) === String(id));
    if (!item) return;

    if (isCloudMode) {
        await supabaseClient
            .from("penyewaan")
            .update({ status_sewa: "Selesai", pembayaran: "Lunas", updated_at: new Date().toISOString() })
            .eq("id", id);
    } else {
        item.status_sewa = "Selesai";
        item.pembayaran = "Lunas";
        item.updated_at = new Date().toISOString();
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.RENTALS, JSON.stringify(rentalsData));
    }
    await fetchRentals();
}

async function deleteRental(id) {
    const item = rentalsData.find((r) => String(r.id) === String(id));
    if (!item) return;
    if (!confirm(`Hapus data penyewaan atas nama "${item.nama_pelanggan}"?`)) return;

    if (isCloudMode) {
        await supabaseClient.from("penyewaan").delete().eq("id", id);
    } else {
        rentalsData = rentalsData.filter((r) => String(r.id) !== String(id));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.RENTALS, JSON.stringify(rentalsData));
    }
    await fetchRentals();
}

function openPhotoModal(id) {
    const item = rentalsData.find((r) => String(r.id) === String(id));
    if (!item || !item.foto_identitas) return;
    document.getElementById("photoModalTitle").textContent = `Identitas: ${item.nama_pelanggan} (${item.jenis_identitas || "KTP"})`;
    document.getElementById("photoModalImg").src = item.foto_identitas;
    document.getElementById("photoModal").classList.remove("hidden");
}

function closePhotoModal() {
    document.getElementById("photoModal").classList.add("hidden");
}

function renderRentalTable() {
    const search = (document.getElementById("filterRentalSearch").value || "").trim().toLowerCase();
    const statusSewaFilter = document.getElementById("filterRentalStatusSewa").value;
    const pembayaranFilter = document.getElementById("filterRentalPembayaran").value;

    // Statistik keseluruhan
    const totalCount = rentalsData.length;
    const activeCount = rentalsData.filter((r) => r.status_sewa === "Disewa").length;
    const totalHarga = rentalsData
        .filter((r) => r.status_sewa !== "Batal")
        .reduce((sum, r) => sum + (Number(r.harga) || 0), 0);
    const pendingNominal = rentalsData
        .filter((r) => r.status_sewa !== "Batal" && r.pembayaran !== "Lunas")
        .reduce((sum, r) => sum + (Number(r.harga) || 0), 0);

    document.getElementById("statRentalCount").textContent = totalCount;
    document.getElementById("statRentalActive").textContent = activeCount;
    document.getElementById("statRentalTotal").textContent = formatRupiah(totalHarga);
    document.getElementById("statRentalPending").textContent = formatRupiah(pendingNominal);

    const filtered = rentalsData.filter((r) => {
        const matchSewa = !statusSewaFilter || r.status_sewa === statusSewaFilter;
        const matchBayar = !pembayaranFilter || r.pembayaran === pembayaranFilter;
        const matchQuery =
            !search ||
            (r.nama_pelanggan && r.nama_pelanggan.toLowerCase().includes(search)) ||
            (r.nomor_whatsapp && r.nomor_whatsapp.toLowerCase().includes(search)) ||
            (r.unit && r.unit.toLowerCase().includes(search));
        return matchSewa && matchBayar && matchQuery;
    });

    const tbody = document.getElementById("rentalTableBody");
    const filteredTotal = filtered
        .filter((r) => r.status_sewa !== "Batal")
        .reduce((sum, r) => sum + (Number(r.harga) || 0), 0);
    document.getElementById("footerRentalTotal").textContent = formatRupiah(filteredTotal);

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding:28px;">Belum ada data penyewaan.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered
        .map((r, index) => {
            const cleanWa = (r.nomor_whatsapp || "").replace(/[^0-9]/g, "");
            const waIntl = cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa;

            const payBadge =
                r.pembayaran === "Lunas"
                    ? "badge-lunas"
                    : r.pembayaran === "DP"
                    ? "badge-dp"
                    : "badge-belum";

            const statusBadge =
                r.status_sewa === "Disewa"
                    ? "badge-user"
                    : r.status_sewa === "Selesai"
                    ? "badge-lunas"
                    : "badge-neutral";

            const fotoCell = r.foto_identitas
                ? `<img src="${r.foto_identitas}" alt="Foto ID" class="thumb-photo" onclick="openPhotoModal('${r.id}')" title="Klik untuk memperbesar">`
                : `<span class="text-muted">-</span>`;

            return `
                <tr>
                    <td class="text-center">${index + 1}</td>
                    <td>
                        <div class="fw-bold">${r.nama_pelanggan}</div>
                        <a class="wa-link" href="https://wa.me/${waIntl}" target="_blank" rel="noopener">${r.nomor_whatsapp}</a>
                    </td>
                    <td>
                        <div>${r.jenis_identitas || "KTP"}</div>
                        <small class="text-muted">${r.nomor_identitas || "-"}</small>
                    </td>
                    <td>
                        <div class="fw-bold">${r.unit}</div>
                        <small class="text-muted">${r.paket_sewa}</small>
                    </td>
                    <td>
                        <div style="font-size:0.82rem;"><strong>Mulai:</strong> ${formatDateTimeID(r.waktu_mulai)}</div>
                        <div style="font-size:0.82rem;"><strong>Kembali:</strong> ${formatDateTimeID(r.rencana_kembali)}</div>
                    </td>
                    <td class="text-right fw-bold">${formatRupiah(r.harga)}</td>
                    <td class="text-center"><span class="badge ${payBadge}">${r.pembayaran}</span></td>
                    <td class="text-center"><span class="badge ${statusBadge}">${r.status_sewa}</span></td>
                    <td class="text-center no-export">${fotoCell}</td>
                    <td><small>${r.catatan || "-"}</small></td>
                    <td class="no-export text-center">
                        <div class="action-btns">
                            <button type="button" class="btn btn-outline btn-sm" onclick="editRental('${r.id}')">Edit</button>
                            ${
                                r.status_sewa === "Disewa"
                                    ? `<button type="button" class="btn btn-success btn-sm" onclick="finishRental('${r.id}')">Selesai</button>`
                                    : ""
                            }
                            <button type="button" class="btn btn-danger btn-sm" onclick="deleteRental('${r.id}')">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");
}

function triggerExportRentalCSV() {
    const headers = [
        "No",
        "Nama Pelanggan",
        "WhatsApp",
        "Jenis Identitas",
        "Nomor Identitas",
        "Unit",
        "Paket Sewa",
        "Waktu Mulai",
        "Rencana Kembali",
        "Harga (Rp)",
        "Pembayaran",
        "Status Sewa",
        "Catatan"
    ];
    const rows = rentalsData.map((r, i) => [
        i + 1,
        r.nama_pelanggan,
        r.nomor_whatsapp,
        r.jenis_identitas || "KTP",
        r.nomor_identitas || "-",
        r.unit,
        r.paket_sewa,
        formatDateTimeID(r.waktu_mulai),
        formatDateTimeID(r.rencana_kembali),
        r.harga,
        r.pembayaran,
        r.status_sewa,
        r.catatan || "-"
    ]);
    const escapeCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "\uFEFF" + [headers.map(escapeCell).join(","), ...rows.map((r) => r.map(escapeCell).join(","))].join("\n");
    downloadBlobFile(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "Data_Penyewaan_RevivalPS.csv");
}

function backupAllDataJSON() {
    const payload = {
        app: "Revival PlayStation",
        exported_at: new Date().toISOString(),
        penyewaan: rentalsData,
        cashflow: cashflowData
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlobFile(blob, `Cadangan_RevivalPS_${new Date().toISOString().slice(0, 10)}.json`);
}

async function restoreAllDataJSON(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.penyewaan)) {
            alert("Format file cadangan JSON tidak valid.");
            return;
        }
        if (isCloudMode) {
            if (parsed.penyewaan.length > 0) {
                const cleanR = parsed.penyewaan.map(({ id, ...rest }) => rest);
                await supabaseClient.from("penyewaan").insert(cleanR);
            }
            if (Array.isArray(parsed.cashflow) && parsed.cashflow.length > 0) {
                const cleanC = parsed.cashflow.map(({ id, ...rest }) => rest);
                await supabaseClient.from("cashflow").insert(cleanC);
            }
        } else {
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.RENTALS, JSON.stringify(parsed.penyewaan));
            if (Array.isArray(parsed.cashflow)) {
                localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CASHFLOW, JSON.stringify(parsed.cashflow));
            }
        }
        await loadAllData();
        alert("Data cadangan berhasil dipulihkan.");
    } catch (err) {
        console.error(err);
        alert("Gagal memulihkan file cadangan.");
    }
    event.target.value = "";
}

/* =========================================================
   MODUL 2: REKAP PERHARI / CASHFLOW HARIAN
   ========================================================= */
function setDefaultCashflowDate() {
    const el = document.getElementById("cfTanggal");
    if (el && !el.value) {
        el.value = new Date().toISOString().slice(0, 10);
    }
}

function resetCashflowForm() {
    document.getElementById("cashflowForm").reset();
    document.getElementById("cfEditId").value = "";
    document.getElementById("cfFormTitle").textContent = "Input Cashflow / Arus Kas Harian";
    document.getElementById("btnSaveCf").textContent = "Simpan Transaksi Kas";
    document.getElementById("btnCancelCf").classList.add("hidden");
    setDefaultCashflowDate();
}

async function insertCashflowRecord(entry) {
    if (isCloudMode) {
        await supabaseClient.from("cashflow").insert([entry]);
    } else {
        cashflowData.unshift({
            id: "cf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
            ...entry,
            created_at: new Date().toISOString()
        });
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CASHFLOW, JSON.stringify(cashflowData));
    }
    await fetchCashflow();
}

async function saveCashflow(event) {
    event.preventDefault();
    const editId = document.getElementById("cfEditId").value;

    const entry = {
        tanggal: document.getElementById("cfTanggal").value,
        shift: document.getElementById("cfShift").value,
        jenis: document.getElementById("cfJenis").value,
        kategori: document.getElementById("cfKategori").value,
        uraian: document.getElementById("cfUraian").value.trim(),
        nominal: Number(document.getElementById("cfNominal").value) || 0,
        metode: document.getElementById("cfMetode").value,
        catatan: document.getElementById("cfCatatan").value.trim()
    };

    if (editId) {
        if (isCloudMode) {
            await supabaseClient.from("cashflow").update(entry).eq("id", editId);
        } else {
            const idx = cashflowData.findIndex((c) => String(c.id) === String(editId));
            if (idx !== -1) cashflowData[idx] = { ...cashflowData[idx], ...entry };
            localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CASHFLOW, JSON.stringify(cashflowData));
        }
        resetCashflowForm();
        await fetchCashflow();
    } else {
        await insertCashflowRecord(entry);
        resetCashflowForm();
    }
}

function editCashflow(id) {
    const item = cashflowData.find((c) => String(c.id) === String(id));
    if (!item) return;

    document.getElementById("cfEditId").value = item.id;
    document.getElementById("cfTanggal").value = item.tanggal || "";
    document.getElementById("cfShift").value = item.shift || "Pagi/Siang";
    document.getElementById("cfJenis").value = item.jenis || "Pemasukan";
    document.getElementById("cfKategori").value = item.kategori || "Billing PS";
    document.getElementById("cfUraian").value = item.uraian || "";
    document.getElementById("cfNominal").value = item.nominal || 0;
    document.getElementById("cfMetode").value = item.metode || "Tunai (Cash)";
    document.getElementById("cfCatatan").value = item.catatan || "";

    document.getElementById("cfFormTitle").textContent = "Edit Transaksi Cashflow";
    document.getElementById("btnSaveCf").textContent = "Perbarui Transaksi Kas";
    document.getElementById("btnCancelCf").classList.remove("hidden");
    document.getElementById("cashflowForm").scrollIntoView({ behavior: "smooth" });
}

async function deleteCashflow(id) {
    if (!confirm("Hapus transaksi cashflow ini?")) return;
    if (isCloudMode) {
        await supabaseClient.from("cashflow").delete().eq("id", id);
    } else {
        cashflowData = cashflowData.filter((c) => String(c.id) !== String(id));
        localStorage.setItem(APP_CONFIG.STORAGE_KEYS.CASHFLOW, JSON.stringify(cashflowData));
    }
    await fetchCashflow();
}

function renderCashflowTable() {
    const fDate = document.getElementById("filterCfDate").value;
    const fJenis = document.getElementById("filterCfJenis").value;
    const fSearch = (document.getElementById("filterCfSearch").value || "").trim().toLowerCase();

    const filtered = cashflowData.filter((c) => {
        const matchDate = !fDate || c.tanggal === fDate;
        const matchJenis = !fJenis || c.jenis === fJenis;
        const matchSearch =
            !fSearch ||
            (c.uraian && c.uraian.toLowerCase().includes(fSearch)) ||
            (c.kategori && c.kategori.toLowerCase().includes(fSearch));
        return matchDate && matchJenis && matchSearch;
    });

    const totalMasuk = filtered
        .filter((c) => c.jenis === "Pemasukan")
        .reduce((s, c) => s + (Number(c.nominal) || 0), 0);
    const totalKeluar = filtered
        .filter((c) => c.jenis === "Pengeluaran")
        .reduce((s, c) => s + (Number(c.nominal) || 0), 0);
    const saldo = totalMasuk - totalKeluar;

    document.getElementById("statCfMasuk").textContent = formatRupiah(totalMasuk);
    document.getElementById("statCfKeluar").textContent = formatRupiah(totalKeluar);
    document.getElementById("statCfSaldo").textContent = formatRupiah(saldo);
    document.getElementById("statCfCount").textContent = `${filtered.length} Entri Kas`;

    document.getElementById("footerCfMasuk").textContent = formatRupiah(totalMasuk);
    document.getElementById("footerCfKeluar").textContent = formatRupiah(totalKeluar);
    document.getElementById("footerCfSaldo").textContent = formatRupiah(saldo);

    const tbody = document.getElementById("cashflowTableBody");
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center text-muted" style="padding:28px;">Belum ada transaksi cashflow.</td></tr>`;
        return;
    }

    // Hitung saldo berjalan dari entri terlama ke terbaru
    const chronological = [...filtered].reverse();
    let runningBalance = 0;
    const balanceMap = new Map();
    chronological.forEach((item) => {
        const nom = Number(item.nominal) || 0;
        runningBalance += item.jenis === "Pemasukan" ? nom : -nom;
        balanceMap.set(item.id, runningBalance);
    });

    tbody.innerHTML = filtered
        .map((c, idx) => {
            const isMasuk = c.jenis === "Pemasukan";
            const saldoRow = balanceMap.get(c.id) || 0;
            return `
                <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td>${c.tanggal}</td>
                    <td>${c.shift || "Full Day"}</td>
                    <td>
                        <div class="fw-bold">${c.uraian}</div>
                        ${c.catatan ? `<small class="text-muted">${c.catatan}</small>` : ""}
                    </td>
                    <td>${c.kategori}</td>
                    <td>${c.metode || "Tunai (Cash)"}</td>
                    <td class="text-right text-success">${isMasuk ? formatRupiah(c.nominal) : "-"}</td>
                    <td class="text-right text-danger">${!isMasuk ? formatRupiah(c.nominal) : "-"}</td>
                    <td class="text-right fw-bold">${formatRupiah(saldoRow)}</td>
                    <td><span class="badge badge-user">${APP_CONFIG.AUTH.DISPLAY_NAME}</span></td>
                    <td class="no-export text-center">
                        <div class="action-btns">
                            <button type="button" class="btn btn-outline btn-sm" onclick="editCashflow('${c.id}')">Edit</button>
                            <button type="button" class="btn btn-danger btn-sm" onclick="deleteCashflow('${c.id}')">Hapus</button>
                        </div>
                    </td>
                </tr>
            `;
        })
        .join("");
}

document.addEventListener("DOMContentLoaded", () => {
    initDatabaseConnection();
    checkSession();
});
