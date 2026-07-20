// Servicio de onboarding: primer arranque de la app.
// Guarda en la BD local (mi_empresa) el rubro, módulos activos,
// rol del usuario y (opcional) credenciales de Supabase del dueño.
import { getDB } from '../db/database'
import { getRubro, camposExtraDefecto } from '../db/schemaRubros'
import { supabase } from '../services/supabase'

// ¿Ya se completó el asistente de configuración?
export async function isOnboarded() {
    try {
        const db = await getDB()
        const rows = await db.select('SELECT onboarded FROM mi_empresa LIMIT 1')
        return !!(rows[0] && rows[0].onboarded)
    } catch {
        return false
    }
}

// Guarda la configuración inicial del negocio.
export async function completarOnboarding(config) {
    const db = await getDB()
    const ahora = Date.now()
    const rubro = getRubro(config.rubro)
    const defExtra = camposExtraDefecto(config.rubro)

    // Asegurar columnas nuevas (por si es una BD antigua).
    await ensureOnboardingColumns(db)

    await db.execute(
        `UPDATE mi_empresa SET
            nombre = $1, ruc = $2, telefono = $3, email = $4,
            moneda = $5, tasa_impuesto = $6,
            rubro = $7, modulos_activos = $8, rol = $9,
            onboarded = 1, campos_extra_defecto = $10,
            logo_url = $11, admin_nombre = $12, updated_at = $13
         WHERE id = 'empresa_unica'`,
        [
            config.nombre || 'Mi Negocio',
            config.ruc || '',
            config.telefono || '',
            config.email || '',
            config.moneda || 'USD',
            config.tasa_impuesto || 18,
            config.rubro || 'retail',
            JSON.stringify(rubro.modulos),
            config.rol || 'dueño',
            JSON.stringify(defExtra),
            config.logo_url || '',
            config.admin_nombre || '',
            ahora,
        ]
    )

    // Guardar credenciales de Supabase en local (si las dio).
    if (config.supabaseUrl && config.supabaseKey) {
        await guardarCredencialesSupabase(db, config.supabaseUrl, config.supabaseKey)
        // Reiniciar cliente supabase con las nuevas credenciales.
        await reinitSupabase(config.supabaseUrl, config.supabaseKey)
    }

    return { ok: true }
}

async function ensureOnboardingColumns(db) {
    const cols = await db.select('PRAGMA table_info(mi_empresa)')
    const names = (cols || []).map(c => c.name)
    const nuevas = [
        'rubro TEXT',
        'modulos_activos TEXT',
        'rol TEXT',
        'onboarded INTEGER DEFAULT 0',
        'campos_extra_defecto TEXT',
        'supabase_url TEXT',
        'supabase_key TEXT',
        'admin_nombre TEXT',
    ]
    for (const col of nuevas) {
        const nombreCol = col.split(' ')[0]
        if (!names.includes(nombreCol)) {
            try { await db.execute(`ALTER TABLE mi_empresa ADD COLUMN ${col}`) } catch {}
        }
    }
}

export async function guardarCredencialesSupabase(db, url, key) {
    const d = db || await getDB()
    await d.execute(
        `UPDATE mi_empresa SET supabase_url = $1, supabase_key = $2 WHERE id = 'empresa_unica'`,
        [url, key]
    )
}

export async function getCredencialesSupabase() {
    try {
        const db = await getDB()
        const rows = await db.select('SELECT supabase_url, supabase_key FROM mi_empresa LIMIT 1')
        const r = rows[0]
        if (r && r.supabase_url && r.supabase_key) {
            return { url: r.supabase_url, key: r.supabase_key }
        }
    } catch {}
    // Fallback al .env por defecto.
    if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
        return { url: import.meta.env.VITE_SUPABASE_URL, key: import.meta.env.VITE_SUPABASE_ANON_KEY }
    }
    return null
}

// Recrea el cliente de Supabase con credenciales propias del usuario.
async function reinitSupabase(url, key) {
    try {
        const { createClient } = await import('@supabase/supabase-js')
        const nuevo = createClient(url, key)
        Object.assign(supabase, nuevo)
        // Copiar métodos del nuevo cliente sobre el importado (singleton).
        for (const k of Object.keys(nuevo)) {
            if (typeof nuevo[k] === 'function' || typeof nuevo[k] === 'object') {
                supabase[k] = nuevo[k]
            }
        }
    } catch (e) {
        console.warn('No se pudo reiniciar Supabase:', e?.message)
    }
}

export async function getMiEmpresaCompleta() {
    try {
        const db = await getDB()
        const rows = await db.select('SELECT * FROM mi_empresa LIMIT 1')
        if (rows.length > 0) return rows[0]
    } catch {}
    return null
}
