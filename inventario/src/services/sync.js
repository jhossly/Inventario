import { supabase } from './supabase';
import { getPendientesSync, marcarSincronizado, reconciliarProductoId } from '../db/database';
import { limpiarPayload } from '../services/dataService';
import * as productoRemoteRepo from '../repositories/remote/supabase/productoRepo';
import * as localProductoRepo from '../repositories/local/productoRepo';
import { toRemote as ticketToRemote } from '../mappers/ticketMapper';
import { toRemote as productoToRemote } from '../mappers/productoMapper';
import { toRemote as cajaToRemote } from '../mappers/cajaMapper';
import { toRemote as contactoToRemote } from '../mappers/contactoMapper';
import { toRemote as facturaToRemote } from '../mappers/facturaMapper';
import { toRemote as facturaItemToRemote } from '../mappers/facturaItemMapper';
import { toRemote as pagoToRemote } from '../mappers/pagoMapper';
import { toRemote as movimientoToRemote } from '../mappers/movimientoMapper';
import { toRemote as categoriaToRemote } from '../mappers/categoriaMapper';
import { toRemote as unidadToRemote } from '../mappers/unidadMapper';
import { toRemote as empresaToRemote } from '../mappers/empresaMapper';
import { toRemote as facturaProveedorToRemote } from '../mappers/facturaProveedorMapper';
import { toRemote as facturaItemProveedorToRemote } from '../mappers/facturaItemProveedorMapper';
import * as remoteRepo from '../repositories/remote/supabase/contactoRepo';
import * as facturaRemoteRepo from '../repositories/remote/supabase/facturaRepo';

// ── DETECCIÓN DE ERRORES ──────────────────────────────────────────

function esErrorDuplicado(error) {
    if (!error) return false;
    const msg = error.message || String(error);
    return msg.includes('duplicate key') ||
           msg.includes('already exists') ||
           msg.includes('23505') ||
           msg.includes('violates unique constraint') ||
           msg.includes('409') ||
           msg.includes('Conflict');
}

function esConflictoCodigo(error) {
    const msg = error?.message || String(error || '');
    return msg.includes('productos_codigo_key');
}

function esErrorRLS(error) {
    if (!error) return false;
    const msg = String(error.message || error);
    return msg.includes('406') || msg.includes('Not Acceptable');
}

function esErrorForeignKey(error) {
    if (!error) return false;
    const msg = error.message || String(error);
    return msg.includes('violates foreign key constraint') ||
           msg.includes('foreign_key_violation') ||
           msg.includes('23503');
}

// Obtiene los pendientes de la cola de sincronización.
async function obtenerPendientes() {
    try {
        return await getPendientesSync();
    } catch (err) {
        console.warn('No se pudo leer sync_queue:', err.message || err);
        return [];
    }
}

// ── HELPERS ─────────────────────────────────────────────────────────

// Hace un UPSERT por id. Si falla por nombre duplicado, busca en Supabase
// y hace UPDATE por id encontrado. Así resolvemos el caso:
// - existe en local con UUID A
// - existe en Supabase con UUID B
// - evitamos 409 por unique(nombre)
async function insertarOActualizar(tabla, datos, opts = {}) {
    const onConflict = opts.onConflict || 'id';
    const datoLimpio = limpiarPayload(tabla, datos);

    // 1. Intentar UPSERT por id (o por nombre si se indica)
    const { error } = await supabase.from(tabla).upsert(datoLimpio, { onConflict });
    if (!error) return { ok: true, op: 'upsert' };

    // 2. RLS: no reintentar.
    if (esErrorRLS(error)) {
        return { ok: false, rls: true, msg: error.message };
    }

    // 3. Conflicto por código duplicado: se resuelve en el caller (productos).
    if (esConflictoCodigo(error)) {
        return { ok: false, conflictCodigo: true, msg: error.message };
    }

    // 4. Otro error de duplicado o error genérico: no reintentar para no ciclar
    if (esErrorDuplicado(error)) {
        return { ok: false, msg: error.message };
    }

    return { ok: false, msg: error.message };
}

// ── SINCRONIZACIÓN ─────────────────────────────────────────────────

export async function sincronizarConSupabase() {
    console.log('🔄 Iniciando sincronización...');

    let pendientes;
    try {
        pendientes = await getPendientesSync();
    } catch (err) {
        console.warn('No se pudo leer sync_queue:', err.message || err);
        return;
    }

    if (!pendientes || pendientes.length === 0) {
        console.log('✅ No hay cambios pendientes');
        return;
    }

    console.log(`📋 Pendientes: ${pendientes.length}`, pendientes.map(p => p.tabla));

    // DEBUG: mostrar primeras filas de cada tabla
    const debugTablas = ['categorias', 'productos', 'empresa'];
    for (const t of debugTablas) {
        const items = pendientes.filter(p => p.tabla === t);
        if (items.length > 0) {
            console.log(`🔍 ${t} (${items.length} items):`, JSON.parse(items[0].datos));
        }
    }

    // Agrupar por tabla
    const porTabla = {};
    for (const item of pendientes) {
        if (!porTabla[item.tabla]) porTabla[item.tabla] = [];
        porTabla[item.tabla].push(item);
    }

    // Orden de sincronización: primero las entidades referenciadas
    const orden = ['categorias', 'unidades', 'empresa', 'contactos', 'productos', 'facturas_proveedores', 'factura_items_proveedores', 'facturas', 'factura_items', 'tickets', 'movimientos', 'pagos'];
    const resto = Object.keys(porTabla).filter(t => !orden.includes(t));

    const procesarTabla = async (tabla, procesarUno) => {
        const items = porTabla[tabla];
        if (!items) return;
        for (const item of items) {
            try {
                await procesarUno(item);
            } catch (err) {
                console.error(`Excepción en ${tabla}:`, err.message || err);
            }
        }
        delete porTabla[tabla];
    };

    // ── 1. CATEGORÍAS ────────────────────────────────────────────
    await procesarTabla('categorias', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = categoriaToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, rls, msg } = await insertarOActualizar('categorias', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Categoría: ${remote.nombre}`);
        } else if (rls) {
            console.warn(`Categoría "${remote.nombre}" omitida por RLS`);
        } else {
            console.error(`Categoría "${remote.nombre}":`, msg);
        }
    });

    // ── 2. UNIDADES ──────────────────────────────────────────────
    await procesarTabla('unidades', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = unidadToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, rls, msg } = await insertarOActualizar('unidades', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Unidad: ${remote.nombre}`);
        } else if (rls) {
            console.warn(`Unidad "${remote.nombre}" omitida por RLS`);
        } else {
            console.error(`Unidad "${remote.nombre}":`, msg);
        }
    });

    // ── 3. EMPRESA / PROVEEDORES ────────────────────────────────
    await procesarTabla('empresa', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = empresaToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, rls, msg } = await insertarOActualizar('empresa', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Empresa: ${remote.nombre}`);
        } else if (rls) {
            console.warn(`Empresa "${remote.nombre}" omitida por RLS`);
        } else {
            console.error(`Empresa "${remote.nombre}":`, msg);
        }
    });

    // ── 4. CONTACTOS ─────────────────────────────────────────────
    await procesarTabla('contactos', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = contactoToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }

        const existingByDoc = remote.documento ? await remoteRepo.findByDocumento(remote.documento) : null;
        const existingByEmail = remote.email ? await remoteRepo.findByEmail(remote.email) : null;
        const existingById = await remoteRepo.findById(remote.id);
        const existente = existingById || existingByDoc || existingByEmail;

        if (existente) {
            await marcarSincronizado(item.id);
            console.log(` Contacto ya existe: ${remote.nombre}`);
        } else {
            const { ok, rls, msg } = await insertarOActualizar('contactos', remote, { onConflict: 'id' });
            if (ok) {
                await marcarSincronizado(item.id).catch(() => {});
                console.log(` Contacto: ${remote.nombre}`);
            } else if (rls) {
                console.warn(` Contacto "${remote.nombre}" omitido por RLS`);
            } else {
                console.error(`Contacto "${remote.nombre}":`, msg);
            }
        }
    });

    // ── 5. PRODUCTOS ─────────────────────────────────────────────
    await procesarTabla('productos', async (item) => {
        const datos = JSON.parse(item.datos);
        let remote = productoToRemote(datos);

        // Los updates parciales (ej. solo stock desde una compra a proveedor)
        // encolan el producto sin `nombre`. Para no descartarlos, completamos
        // con el producto local completo, que sí tiene nombre/id/código.
        // El id del registro vive en item.registro_id (datos solo trae los
        // campos cambiados, p.ej. { stock_actual }).
        if (!remote) {
            const productoId = datos.id || item.registro_id;
            if (productoId) {
                const completo = await localProductoRepo.findById(productoId).catch(() => null);
                if (completo) remote = productoToRemote(completo);
            }
        }

        if (!remote) {
            console.warn(`Producto sin nombre omitido (id: ${datos.id || item.registro_id})`);
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }

        const res = await insertarOActualizar('productos', remote, { onConflict: 'id' });

        if (res.ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Producto: ${remote.nombre}`);
            return;
        }

        if (res.rls) {
            console.warn(` Producto "${remote.nombre}" omitido por RLS`);
            return;
        }

        // Conflicto por código duplicado (unique productos_codigo_key):
        // el id local diverge del id en la nube. Buscamos la fila real por
        // código, actualizamos esa y reconciliamos el id local para que los
        // próximos edits dejen de chocar.
        if (res.conflictCodigo && remote.codigo) {
            try {
                const existente = await productoRemoteRepo.findByCodigo(remote.codigo);
                if (existente && existente.id) {
                    // El upsert normal limpia proveedor_id (puede no existir en
                    // la nube y violar la FK). Mantenemos la coherencia aquí.
                    const payload = { ...remote };
                    delete payload.proveedor_id;
                    await productoRemoteRepo.update(existente.id, payload);
                    await reconciliarProductoId(datos.id, existente.id);
                    await marcarSincronizado(item.id).catch(() => {});
                    console.log(` Producto reconciliado por código "${remote.codigo}": ${remote.nombre}`);
                    return;
                }
            } catch (err) {
                console.error(`No se pudo reconciliar producto por código:`, err?.message || err);
            }
        }

        console.error(`Producto "${remote.nombre}":`, res.msg);
    });

    // ── 5.5. TICKETS ────────────────────────────────────────────
    await procesarTabla('tickets', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = ticketToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, msg } = await insertarOActualizar('tickets', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Ticket: ${remote.numero_ticket}`);
        } else if (esErrorDuplicado(msg)) {
            console.log(` Ticket duplicado: ${remote.numero_ticket}`);
        } else {
            console.error(`Ticket ${remote.numero_ticket}:`, msg);
        }
    });

    // ── 5.6. CAJA ──────────────────────────────────────────────
    await procesarTabla('caja', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = cajaToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, msg } = await insertarOActualizar('caja', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Caja: ${remote.estado}`);
        } else if (esErrorDuplicado(msg)) {
            console.log(` Caja duplicada: ${remote.id}`);
        } else {
            console.error(`Caja ${remote.id}:`, msg);
        }
    });

    // ── 5.8. FACTURAS ──────────────────────────────────────────
    await procesarTabla('facturas', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = facturaToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, msg } = await insertarOActualizar('facturas', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Factura: ${remote.numero_factura}`);
        } else if (esErrorDuplicado(msg)) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Factura duplicada: ${remote.numero_factura}`);
        } else if (esErrorForeignKey(msg)) {
            console.error(`Factura ${remote.numero_factura} no se pudo sincronizar por FK:`, msg);
            await marcarSincronizado(item.id).catch(() => {});
        } else {
            console.error(`Factura ${remote.numero_factura}:`, msg);
        }
    });

    // ── 5.8.1 FACTURAS PROVEEDORES ─────────────────────────────
    await procesarTabla('facturas_proveedores', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = facturaProveedorToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const payload = { ...remote };
        delete payload.precios_con_iva;
        delete payload.empresa_id;
        const { ok, msg } = await insertarOActualizar('facturas_proveedores', payload, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Factura proveedor: ${remote.numero_factura}`);
        } else if (esErrorDuplicado(msg)) {
            console.log(` Factura proveedor duplicada: ${remote.numero_factura}`);
        } else {
            console.error(`Factura proveedor ${remote.numero_factura}:`, msg);
        }
    });

    // ── 5.9. FACTURA ITEMS ─────────────────────────────────────
    await procesarTabla('factura_items', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = facturaItemToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, msg } = await insertarOActualizar('factura_items', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Factura item: ${remote.producto_id}`);
        } else if (esErrorDuplicado(msg)) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Factura item duplicado`);
        } else if (esErrorForeignKey(msg)) {
            console.error(`Factura item omitido por FK:`, msg);
            await marcarSincronizado(item.id).catch(() => {});
        } else {
            console.error(`Factura item:`, msg);
        }
    });

    // ── 5.9.1 FACTURA ITEMS PROVEEDORES ───────────────────────
    await procesarTabla('factura_items_proveedores', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = facturaItemProveedorToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, msg } = await insertarOActualizar('factura_items_proveedores', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Factura item proveedor: ${remote.producto_id}`);
        } else if (esErrorDuplicado(msg)) {
            console.log(` Factura item proveedor duplicado`);
        } else {
            console.error(`Factura item proveedor:`, msg);
        }
    });

    // ── 5.10. PAGOS ───────────────────────────────────────────
    await procesarTabla('pagos', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = pagoToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, msg } = await insertarOActualizar('pagos', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Pago: ${remote.tipo}`);
        } else if (esErrorDuplicado(msg)) {
            console.log(` Pago duplicado`);
        } else {
            console.error(`Pago:`, msg);
        }
    });

    // ── 5.11. MOVIMIENTOS ─────────────────────────────────────
    await procesarTabla('movimientos', async (item) => {
        const datos = JSON.parse(item.datos);
        const remote = movimientoToRemote(datos);
        if (!remote) {
            await marcarSincronizado(item.id).catch(() => {});
            return;
        }
        const { ok, msg } = await insertarOActualizar('movimientos', remote, { onConflict: 'id' });
        if (ok) {
            await marcarSincronizado(item.id).catch(() => {});
            console.log(` Movimiento: ${remote.tipo}`);
        } else if (esErrorDuplicado(msg)) {
            console.log(` Movimiento duplicado`);
        } else {
            console.error(`Movimiento:`, msg);
        }
    });

    // ── 6. RESTO DE TABLAS ───────────────────────────────────────
    for (const tabla of resto) {
        await procesarTabla(tabla, async (item) => {
            const datos = JSON.parse(item.datos);
            let remote = null;

            if (tabla === 'facturas_proveedores') {
                remote = facturaProveedorToRemote(datos);
            } else if (tabla === 'factura_items_proveedores') {
                remote = facturaItemProveedorToRemote(datos);
            }

            const payload = remote || { ...datos, id: datos.id || item.registro_id };
            if (tabla === 'facturas_proveedores') {
                delete payload.precios_con_iva;
                delete payload.empresa_id;
            }
            const { ok, msg } = await insertarOActualizar(tabla, payload);
            if (ok) {
                await marcarSincronizado(item.id).catch(() => {});
                console.log(`✅ Sincronizado: ${tabla}`);
            } else if (esErrorDuplicado(msg)) {
                console.log(`✅ Duplicado en ${tabla}, omitido`);
            } else {
                console.error(`❌ Error en ${tabla}:`, msg);
            }
        });
    }

    console.log('🏁 Sincronización completada');
}
