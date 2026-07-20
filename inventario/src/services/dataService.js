import { isOnline } from '../utils/network';
import * as local from '../db/database';
import * as api from './api';
import { sincronizarConSupabase } from './sync';
import { supabase } from './supabase';
import * as ticketDomain from '../services/domain/ticketService';
import * as productoDomain from '../services/domain/productoService';
import * as cajaDomain from '../services/domain/cajaService';
import * as contactoDomain from '../services/domain/contactoService';
import * as facturaDomain from '../services/domain/facturaService';
import * as pagoDomain from '../services/domain/pagoService';
import * as movimientoDomain from '../services/domain/movimientoService';
import * as categoriaDomain from '../services/domain/categoriaService';
import * as unidadDomain from '../services/domain/unidadService';
import * as empresaDomain from '../services/domain/empresaService';
import * as localProductoRepo from '../repositories/local/productoRepo';
import { toLocal as productoToLocal } from '../mappers/productoMapper';
import { toLocal as contactoToLocal } from '../mappers/contactoMapper';
import * as remoteRepo from '../repositories/remote/supabase/productoRepo';
import * as contactoRemoteRepo from '../repositories/remote/supabase/contactoRepo';
 
const _onlineCache = { value: true, ts: 0 };
const CACHE_TTL = 5000;

async function getOnline() {
    const now = Date.now();
    if (now - _onlineCache.ts < CACHE_TTL) return _onlineCache.value;
    _onlineCache.value = await isOnline();
    _onlineCache.ts = now;
    return _onlineCache.value;
}

// Limpia campos locales que no existen en Supabase antes de enviar.
export function limpiarPayload(tabla, datos) {
    if (!datos || typeof datos !== 'object') return datos;
    const limpio = { ...datos };

    // Quitar siempre campos locales de sync timestamps si la tabla remota no los tiene
    const sinSync = ['empresa', 'mi_empresa', 'productos', 'unidades', 'categorias', 'contactos', 'movimientos', 'tickets', 'facturas', 'factura_items', 'facturas_proveedores', 'factura_items_proveedores', 'pagos', 'caja', 'caja_movimientos'];
    if (sinSync.includes(tabla)) {
        delete limpio.sync_status;
        delete limpio.actualizado_en;
        delete limpio.creado_en;
    }

    if (tabla === 'facturas_proveedores') {
        // El esquema local (y el pull de restauración) usan `proveedor_id`.
        // Se mantiene esa columna para no romper contra la tabla de la nube.
        if ('precios_con_iva' in limpio) {
            limpio.precios_con_iva = limpio.precios_con_iva ? 1 : 0;
        }
    }

    if (tabla === 'productos') {
        delete limpio.campos_extra;
        delete limpio.proveedor_id;
        if ('tiene_impuesto' in limpio && typeof limpio.tiene_impuesto === 'boolean') {
            limpio.tiene_impuesto = limpio.tiene_impuesto ? 1 : 0;
        }
        if ('activo' in limpio && typeof limpio.activo === 'boolean') {
            limpio.activo = limpio.activo ? 1 : 0;
        }
    }

    if (tabla === 'mi_empresa') {
        const columnasPermitidas = new Set([
            'id', 'nombre', 'ruc', 'direccion', 'telefono', 'email',
            'logo_url', 'moneda', 'tasa_impuesto',
            'serie_factura', 'serie_ticket',
            'rubro', 'sync_status',
        ])
        Object.keys(limpio).forEach(k => {
            if (!columnasPermitidas.has(k)) delete limpio[k]
        })
    }

    if (tabla === 'tickets') {
        delete limpio.empresa_id;
        delete limpio.factura_id;
    }

    if (tabla === 'facturas') {
        // Mantener empresa_id y usuario_id para Supabase
    }

    if (tabla === 'movimientos') {
        // referencia es solo local (el remoto no la tiene)
        delete limpio.referencia;
    }

    if (tabla === 'caja') {
        if (limpio.monto_apertura !== undefined) {
          limpio.apertura_efectivo = limpio.monto_apertura;
          delete limpio.monto_apertura;
        }
        if (limpio.monto_cierre !== undefined) {
          limpio.cierre_real = limpio.monto_cierre;
          delete limpio.monto_cierre;
        }
        if (limpio.saldo_esperado !== undefined) {
          limpio.cierre_esperado = limpio.saldo_esperado;
          delete limpio.saldo_esperado;
        }
        if (limpio.responsable !== undefined) {
          limpio.usuario_id = limpio.responsable;
          delete limpio.responsable;
        }
    }

    return limpio;
}

// ── NORMALIZACIÓN ─────────────────────────────────────────────────

export function normalizarSupabaseProducto(p) {
    return {
        id: String(p.id),
        codigo: p.codigo || '',
        nombre: p.nombre || '',
        descripcion: p.descripcion || '',
        categoria_id: p.categoria_id ? String(p.categoria_id) : null,
        categoria_nombre: p.categoria?.nombre || null,
        unidad_id: p.unidad_id ? String(p.unidad_id) : null,
        unidad_nombre: p.unidad?.nombre || null,
        unidad_simbolo: p.unidad?.simbolo || null,
        contacto_id: p.contacto_id ? String(p.contacto_id) : null,
        contacto_nombre: p.contacto?.nombre || null,
        proveedor_id: p.proveedor_id ? String(p.proveedor_id) : null,
        proveedor_nombre: p.empresa?.nombre || null,
        empresa_id: p.empresa_id ? String(p.empresa_id) : null,
        imagen_url: p.imagen_url || '',
        precio_venta: p.precio_venta || 0,
        precio_costo: p.precio_costo || 0,
        stock_actual: p.stock_actual || 0,
        stock_minimo: p.stock_minimo || 0,
        tiempo_entrega_dias: p.tiempo_entrega_dias || 0,
        tiene_impuesto: p.tiene_impuesto ? 1 : 0,
        tasa_impuesto_producto: p.tasa_impuesto_producto || 0,
        campos_extra: p.campos_extra || {},
        // Respeta el estado de la nube. Un producto con activo = 0 (oculto /
        // "eliminado" lógicamente) se queda oculto localmente. Solo default a 1
        // si la nube no envía el campo.
        activo: remoteProducto.activo ?? 1,
        sync_status: 'synced',
    }
}

export function normalizarProducto(p) {
    return {
        id: String(p.id),
        codigo: p.codigo || '',
        nombre: p.nombre || '',
        descripcion: p.descripcion || '',
        categoria_id: p.categoria_id || null,
        categoria_nombre: p.categoria_nombre || null,
        unidad_id: p.unidad_id || null,
        unidad_nombre: p.unidad_nombre || null,
        unidad_simbolo: p.unidad_simbolo || null,
        contacto_id: p.contacto_id || null,
        contacto_nombre: p.contacto_nombre || null,
        proveedor_id: p.proveedor_id || null,
        proveedor_nombre: p.proveedor_nombre || null,
        empresa_id: p.empresa_id || null,
        imagen_url: p.imagen_url || '',
        precio_venta: p.precio_venta || 0,
        precio_costo: p.precio_costo || 0,
        stock_actual: p.stock_actual || 0,
        stock_minimo: p.stock_minimo || 0,
        tiempo_entrega_dias: p.tiempo_entrega_dias || 0,
        tiene_impuesto: p.tiene_impuesto ? 1 : 0,
        tasa_impuesto_producto: p.tasa_impuesto_producto || 0,
        campos_extra: p.campos_extra || {},
        activo: p.activo ?? 1,
        creado_en: p.creado_en,
        actualizado_en: p.actualizado_en,
        sync_status: p.sync_status || 'synced',
    };
}

// ============================================================
// LECTURA: SIEMPRE DESDE SQLITE (Offline-First verdadero)
// ============================================================

export async function getProductos() {
    return await productoDomain.getProductos()
}

export async function getProductoByCodigo(codigo) {
    return await productoDomain.getProductoByCodigo(codigo)
}

export async function getProductosByProveedor(proveedorId) {
    const productos = await productoDomain.getProductos()
    return { data: productos.filter(p => p.proveedor_id === proveedorId || p.contacto_id === proveedorId) };
}

export async function getCategorias() {
    return await categoriaDomain.getCategorias()
}

export async function getUnidades() {
    return await unidadDomain.getUnidades()
}

export async function getContactos() {
    return await contactoDomain.getContactos()
}

export async function getProveedores() {
    const contactos = await getContactos()
    const proveedores = (contactos || []).filter(c => c.tipo === 'proveedor')
    return { data: proveedores, error: null }
}

export async function getEmpresas() {
    return await empresaDomain.getEmpresas()
}

export async function getEmpresa() {
    const empresas = await empresaDomain.getEmpresas()
    return empresas[0] || { nombre: 'Mi Negocio', moneda: 'USD', tasa_impuesto: 18 }
}

export async function getMovimientos() {
    return await movimientoDomain.getMovimientos()
}

// Ajuste manual de stock en bodega (dañado, perdido, conteo físico, etc.)
export async function ajustarStockProducto(productoId, cantidad, tipo, motivo, usuarioId) {
    return await local.ajustarStockProducto(productoId, cantidad, tipo, motivo, usuarioId);
}

export async function getUltimoCostoMovimiento(productoId) {
    return await local.getUltimoCostoMovimiento(productoId).catch(() => null);
}

export async function getPagos(tipo) {
    return await pagoDomain.getPagos(tipo)
}

export async function getIngresos() {
    return await pagoDomain.getPagos('ingreso')
}

export async function getGastos() {
    return await pagoDomain.getPagos('egreso')
}

export async function getUsuarios() {
    return [];
}

export async function getTickets() {
    return await ticketDomain.getTickets()
}

export async function getTicketById(id) {
    return await ticketDomain.getTicketById(id)
}

export async function getDashboard() {
    try {
        const productos = await local.getProductos();
        const ventas = await getTickets();
        const pendientes = await local.getPendientesSync();

        const bajos = productos.filter(p => p.stock_actual <= (p.stock_minimo || 0)).length;
        const ingresos = ventas.reduce((sum, v) => sum + (v.total || 0), 0);

        return {
            total_ventas: ventas.length,
            ingresos: ingresos,
            productos_bajo_stock: bajos,
            movimientos_pendientes: pendientes.length,
            ventas_por_dia: calcularVentasPorDia(ventas),
            productos_mas_vendidos: calcularProductosMasVendidos(ventas, productos)
        };
    } catch {
        return {
            total_ventas: 0,
            ingresos: 0,
            productos_bajo_stock: 0,
            movimientos_pendientes: 0,
            ventas_por_dia: [],
            productos_mas_vendidos: []
        };
    }
}

function calcularVentasPorDia(ventas) {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const resultado = dias.map(dia => ({ name: dia, ventas: 0 }));

    ventas.forEach(venta => {
        if (venta.fecha_venta) {
            const fecha = new Date(venta.fecha_venta);
            const diaIndex = fecha.getDay();
            if (diaIndex >= 1 && diaIndex <= 7) {
                resultado[diaIndex - 1].ventas += venta.total || 0;
            }
        }
    });

    return resultado;
}

function calcularProductosMasVendidos(ventas, productos) {
    const conteo = new Map();

    ventas.forEach(venta => {
        if (venta.productos) {
            try {
                const items = typeof venta.productos === 'string' ? JSON.parse(venta.productos) : venta.productos;
                items.forEach(item => {
                    const id = item.productoId || item.id;
                    conteo.set(id, (conteo.get(id) || 0) + (item.cantidad || 1));
                });
            } catch (e) { }
        }
    });

    const masVendidos = Array.from(conteo.entries())
        .map(([id, cantidad]) => {
            const producto = productos.find(p => p.id === id);
            return { ...producto, cantidadVendida: cantidad };
        })
        .sort((a, b) => b.cantidadVendida - a.cantidadVendida)
        .slice(0, 5);

    return masVendidos;
}

// ============================================================
// ESCRITURA: GUARDAR EN LOCAL + SINCronizar A NUBE
// ============================================================

// ----- PRODUCTOS -----
export async function createProducto(data) {
    const nuevoProducto = {
      ...data,
      id: crypto.randomUUID()
    };
    return await productoDomain.createProducto(nuevoProducto);
}

export async function updateProducto(id, data) {
    return await productoDomain.updateProducto(id, data);
}

export async function deleteProducto(id) {
    return await productoDomain.deleteProducto(id);
}

// ----- CATEGORÍAS -----
export async function createCategoria(data) {
    const nuevaCategoria = {
        ...data,
        id: crypto.randomUUID()
    };
    return await categoriaDomain.createCategoria(nuevaCategoria);
}

export async function updateCategoria(id, data) {
    return await categoriaDomain.updateCategoria(id, data);
}

export async function deleteCategoria(id) {
    return await categoriaDomain.deleteCategoria(id);
}

// ----- UNIDADES -----
export async function createUnidad(data) {
    const nuevaUnidad = {
        ...data,
        id: crypto.randomUUID()
    };
    return await unidadDomain.createUnidad(nuevaUnidad);
}

export async function deleteUnidad(id) {
    return await unidadDomain.deleteUnidad(id);
}

// ----- CONTACTOS -----
export async function createContacto(data) {
    const nuevoContacto = {
      ...data,
      tipo: data.tipo || 'cliente',
      id: crypto.randomUUID()
    };
    return await contactoDomain.createContacto(nuevoContacto);
}

export async function updateContacto(id, data) {
    return await contactoDomain.updateContacto(id, data);
}

export async function deleteContacto(id) {
    return await contactoDomain.deleteContacto(id);
}

// ----- PROVEEDORES (EMPRESA) -----
export async function createProveedor(data) {
    const nuevoProveedor = {
        ...data,
        id: crypto.randomUUID()
    };
    await local.addEmpresa(nuevoProveedor);
    const online = await getOnline();
    if (online) {
        try {
            await api.createProveedor(nuevoProveedor);
        } catch (e) {
            console.error('Error sync:', e);
        }
    }
    return { id: nuevoProveedor.id, error: null };
}

export async function updateProveedor(id, data) {
    await local.updateEmpresa(id, data);
    const online = await getOnline();
    if (online) {
        try {
            await api.updateProveedor(id, data);
        } catch (e) {
            console.error('Error sync:', e);
        }
    }
    return { error: null };
}

export async function deleteProveedor(id) {
    await local.deleteEmpresaLocal(id);
    const online = await getOnline();
    if (online) {
        try {
            await api.deleteProveedor(id);
        } catch (e) {
            console.error('Error sync:', e);
        }
    }
    return { error: null };
}

export async function createEmpresa(data) {
    return await empresaDomain.createEmpresa(data);
}

export async function updateEmpresa(id, data) {
    return await empresaDomain.updateEmpresa(id, data);
}

export async function deleteEmpresa(id) {
    return await empresaDomain.deleteEmpresa(id);
}

// ----- TICKETS (POS) -----
export async function createTicket(data) {
    return await ticketDomain.createTicket(data)
}

// Lee tasa de impuesto y moneda desde la config local.
export async function getTasaImpuesto() {
    return await local.getTasaImpuesto().catch(() => ({ tasa: 0, moneda: 'USD' }));
}

// ----- MOVIMIENTOS -----
export async function createMovimiento(data) {
    return await movimientoDomain.createMovimiento(data)
}

// ----- PAGOS (INGRESOS/GASTOS) -----
export async function createIngreso(data) {
    return await pagoDomain.createPago({ ...data, tipo: 'ingreso' })
}

export async function createGasto(data) {
    const id = crypto.randomUUID();
    const gasto = { id, ...data, tipo: 'egreso' };
    return await pagoDomain.createPago(gasto)
}

export async function deletePago(id) {
    return await pagoDomain.deletePago(id)
}

// ----- FACTURAS -----
export async function createFactura(data) {
    return await facturaDomain.createFactura(data)
}

export async function createFacturaItem(data) {
    return await facturaDomain.createFacturaItem(data)
}

export async function createTicketFactura(data) {
    const ticket = { ...data }
    return await facturaDomain.createFactura(ticket)
}

export async function getFacturasProveedores() {
    return await local.getFacturasProveedores().catch(() => []);
}

export async function createFacturaProveedor(data) {
    const id = crypto.randomUUID();
    const factura = { id, ...data, sync_status: 'pending' };
    try {
        await local.addFacturaProveedor(factura);
    } catch (e) {
        console.warn('Error guardando localmente:', e);
    }
    const online = await getOnline();
    if (online) {
        try {
            const { data: result, error } = await api.createFacturaProveedor(factura);
            if (!error && result) {
                await local.updateFacturaProveedorSync?.(id, result.id);
                return { data: result, error: null };
            }
            return { data: null, error: error || new Error('Error desconocido al crear factura proveedor') };
        } catch (e) {
            console.error('Error sync factura proveedor:', e);
            return { data: null, error: e };
        }
    }
    return { data: factura, error: null };
}

export async function deleteFacturaProveedor(id) {
    const online = await getOnline();
    if (online) {
        try {
            await api.deleteFacturaProveedor(id);
        } catch (e) {
            console.error('Error sync:', e);
        }
    }
}

export async function createFacturaItemProveedor(data) {
    const id = crypto.randomUUID();
    const item = { id, ...data, sync_status: 'pending' };
    try {
        await local.addFacturaItemProveedor(item);
    } catch (e) {
        console.warn('Error local:', e);
    }
    const online = await getOnline();
    if (online) {
        try {
            await api.createFacturaItemProveedor(item);
        } catch (e) {
            console.error('Error sync:', e);
        }
    }
    return item;
}

// ============================================================
// SINCRONIZACIÓN DE SUPABASE A LOCAL (respaldo manual)
// ============================================================

export async function sincronizarSupabaseALocal() {
    const online = await getOnline();
    if (!online) return;
    try {
        const [catData, uniData, conData] = await Promise.all([
            api.getCategorias().then(r => r.data || []).catch(() => []),
            api.getUnidades().then(r => r.data || []).catch(() => []),
            api.getContactos().then(r => r.data || []).catch(() => []),
        ]);

        for (const c of catData) {
            await local.addCategoriaSinSync({ id: String(c.id), nombre: c.nombre, descripcion: c.descripcion || '' });
        }
        for (const u of uniData) {
            await local.addUnidadSinSync({ id: String(u.id), nombre: u.nombre, simbolo: u.simbolo || '' });
        }
        for (const c of conData) {
            await local.addContactoSinSync({
                id: String(c.id),
                nombre: c.nombre,
                tipo: c.tipo || 'cliente',
                telefono: c.telefono || '',
                email: c.email || '',
            });
        }

        const contactosData = await contactoRemoteRepo.findAll();
        if (contactosData.length > 0) {
            for (const c of contactosData) {
                const localContacto = contactoToLocal(c);
                if (localContacto && localContacto.nombre) {
                    await local.addContactoSinSync(localContacto);
                }
            }
        }

        const prodData = await remoteRepo.findAll();
        if (prodData.length > 0) {
            for (const p of prodData) {
                try {
                    const localProducto = productoToLocal(p);
                    if (localProducto && localProducto.nombre) {
                        const existente = await localProductoRepo.findById(localProducto.id).catch(() => null);
                        if (existente) {
                            delete localProducto.stock_actual;
                            delete localProducto.stock_minimo;
                        }
                        await local.upsertProductoSinSync(localProducto);
                    }
                } catch (errProd) {
                    console.warn('No se pudo restaurar producto:', p?.nombre, errProd?.message || errProd);
                }
            }
        }
        console.log('✅ Datos sincronizados de Supabase a local');
    } catch (e) {
        console.error('Error sincronizando a local:', e);
    }
}

// ¿Hay datos de negocio en Supabase? (para ofrecer restaurar)
export async function haySupabaseConDatos() {
    const online = await getOnline();
    if (!online) return false;
    try {
        const checks = await Promise.all([
            api.getProductos().then(d => (d || []).length).catch(() => 0),
            api.getTickets().then(d => (d || []).length).catch(() => 0),
            api.getPagos().then(d => (d || []).length).catch(() => 0),
            api.getMovimientos().then(d => (d || []).length).catch(() => 0),
            api.getFacturas().then(d => (d || []).length).catch(() => 0),
        ]);
        return checks.some(n => n > 0);
    } catch {
        return false;
    }
}

export async function localTieneDatos() {
    return await local.localTieneDatos().catch(() => false);
}

// Restauración COMPLETA desde Supabase hacia la base local.
// Trae todo lo que tenga la nube: catálogo, inventario, ventas, pagos, caja, etc.
export async function restaurarDesdeSupabase() {
    const online = await getOnline();
    if (!online) throw new Error('Sin conexión a internet');

    // 1. Catálogo base (categorías, unidades, contactos, productos, proveedores/empresa)
    await sincronizarSupabaseALocal();

    // Proveedores / empresa
    try {
        const emp = await api.getProveedores().then(r => r.data || []);
        for (const e of emp) {
            await local.addEmpresaSinSync({ ...e, id: String(e.id) });
        }
    } catch (e) { console.warn('Restaurar empresa:', e?.message); }

    // 2. Movimientos de inventario
    try {
        const movs = await api.getMovimientos();
        for (const m of movs) await local.addMovimientoSinSync({ ...m, id: String(m.id) });
    } catch (e) { console.warn('Restaurar movimientos:', e?.message); }

    // 3. Pagos (ingresos y gastos)
    try {
        const pagos = await api.getPagos();
        for (const p of pagos) await local.addPagoSinSync({ ...p, id: String(p.id) });
    } catch (e) { console.warn('Restaurar pagos:', e?.message); }

    // 4. Tickets (ventas)
    try {
        const tickets = await api.getTickets();
        for (const t of tickets) await local.addTicketSinSync({ ...t, id: String(t.id) });
    } catch (e) { console.warn('Restaurar tickets:', e?.message); }

    // 5. Facturas + items
    try {
        const facturas = await api.getFacturas();
        for (const f of facturas) {
            await local.addFacturaSinSync({ ...f, id: String(f.id) });
            try {
                const items = await api.getFacturaItems(f.id);
                for (const it of items) await local.addFacturaItemSinSync({ ...it, id: String(it.id) });
            } catch (_) {}
        }
    } catch (e) { console.warn('Restaurar facturas:', e?.message); }

    // 6. Facturas de proveedores + items
    try {
        const facProv = await api.getFacturasProveedores();
        for (const f of facProv) {
            await local.addFacturaProveedorSinSync({
                id: String(f.id),
                numero_factura: f.numero_factura,
                proveedor_id: f.empresa_id || f.proveedor_id,
                fecha: f.fecha,
                total: f.total,
                estado: f.estado,
                precios_con_iva: f.precios_con_iva,
            });
            try {
                const items = await api.getFacturaItemsProveedor(f.id);
                for (const it of items) await local.addFacturaItemProveedorSinSync({ ...it, id: String(it.id) });
            } catch (_) {}
        }
    } catch (e) { console.warn('Restaurar facturas proveedores:', e?.message); }

    // 7. Caja (turnos)
    try {
        const cajas = await api.getCaja();
        for (const c of cajas) await local.addCajaSinSync({ ...c, id: String(c.id) });
    } catch (e) { console.warn('Restaurar caja:', e?.message); }

    console.log('✅ Restauración completa desde Supabase');
    return { ok: true };
}

// Respaldo COMPLETO: sube toda la base local a Supabase.
// Re-encola cada fila local en sync_queue y corre la sincronización normal,
// reutilizando toda la lógica de mapeo y upsert ya probada en sync.js.
// Útil cuando se borró la nube y se quiere reconstruir desde lo local.
export async function respaldarTodoEnSupabase() {
    const online = await getOnline();
    if (!online) throw new Error('Sin conexión a internet');

    const tablas = [
        ['categorias', await local.getCategorias().catch(() => [])],
        ['unidades', await local.getUnidades().catch(() => [])],
        ['empresa', await local.getEmpresas().catch(() => [])],
        ['contactos', await local.getContactos().catch(() => [])],
        ['productos', await local.getProductos().catch(() => [])],
        ['facturas_proveedores', await local.getFacturasProveedores().catch(() => [])],
        ['factura_items_proveedores', await local.getFacturaItemsProveedores().catch(() => [])],
        ['facturas', await local.getFacturas().catch(() => [])],
        ['factura_items', await local.getFacturaItems().catch(() => [])],
        ['tickets', await local.getTickets().catch(() => [])],
        ['movimientos', await local.getMovimientos().catch(() => [])],
        ['pagos', await local.getPagos().catch(() => [])],
        ['caja', await local.getCajas().catch(() => [])],
    ];

    let total = 0;
    await local.limpiarSyncQueue().catch(() => {});
    for (const [tabla, rows] of tablas) {
        for (const row of rows || []) {
            if (!row || row.id == null) continue;
            await local.agregarSyncQueue(tabla, 'INSERT', String(row.id), row).catch(() => {});
            total++;
        }
    }

    console.log(`📦 Respaldo: ${total} registros encolados para subir`);
    await sincronizarConSupabase();
    return { ok: true, total };
}

// ----- UTILIDAD -----
export async function sincronizarAhora() {
    await sincronizarConSupabase();
}

// ===== MI EMPRESA (datos del negocio propio) =====
export async function getMiEmpresa() {
    return await local.getMiEmpresa().catch(() => ({ nombre: 'Mi Negocio', moneda: 'USD', tasa_impuesto: 18 }));
}

export async function updateMiEmpresa(data) {
    await local.updateMiEmpresa(data);
    const online = await getOnline();
    if (online) {
        try {
            await api.updateMiEmpresa(data);
        } catch(e) { console.error('Error sync:', e); }
    }
    return { id: 'empresa_unica' };
}

export async function updatePlantillas(tipo, contenido) {
    const result = await local.updatePlantillas(tipo, contenido);
    return result;
}

// ===== CAJA (turnos persistentes) =====
export async function abrirCaja(monto, responsable) {
    return await cajaDomain.abrirCaja(monto, responsable)
}

export async function getCajaAbierta() {
    return await cajaDomain.getCajaAbierta()
}

export async function getMovimientosCaja(cajaId) {
    return await cajaDomain.getMovimientosCaja(cajaId)
}

export async function addMovimientoCaja(cajaId, tipo, monto, descripcion) {
    return await cajaDomain.addMovimientoCaja(cajaId, tipo, monto, descripcion)
}

export async function cerrarCaja(cajaId, montoCierre, saldoEsperado) {
    return await cajaDomain.cerrarCaja(cajaId, montoCierre, saldoEsperado)
}

export async function getFacturas() {
    return await facturaDomain.getFacturas()
}

export async function getFacturaItems() {
    return await local.getFacturaItems()
}

export async function getFacturaItemsProveedores() {
    return await local.getFacturaItemsProveedores()
}

export async function getCajas() {
    return await local.getCajas()
}


