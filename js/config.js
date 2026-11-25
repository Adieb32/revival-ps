/**
 * Konfigurasi Aplikasi Revival PlayStation
 *
 * - Secara default aplikasi berjalan dalam Mode Lokal Browser (localStorage)
 *   dalam kondisi kosong siap pakai tanpa error.
 * - Jika ingin menggunakan database cloud Supabase, isi URL dan ANON_KEY di bawah ini
 *   lalu jalankan file database/supabase_schema.sql di SQL Editor Supabase.
 */
const APP_CONFIG = {
    AUTH: {
        USERNAME: "revivalps",
        PASSWORD: "revival123",
        DISPLAY_NAME: "Revival PlayStation",
        SESSION_KEY: "revival_ps_session_v1"
    },
    SUPABASE: {
        URL: "YOUR_SUPABASE_PROJECT_URL",
        ANON_KEY: "YOUR_SUPABASE_ANON_KEY"
    },
    STORAGE_KEYS: {
        RENTALS: "revival_ps_rentals_v1",
        CASHFLOW: "revival_ps_cashflow_v1"
    }
};
