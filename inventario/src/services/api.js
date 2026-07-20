import { supabase } from './supabase'

function limpiar(tabla, data) {
  if (!data || typeof data !== 'object') return data;
  const limpio = { ...data };

  // Quitar siempre campos locales sync/timestamps
  delete limpio.sync_status;
  delete limpio.actualizado_en;
  delete limpio.creado_en;
  delete limpio.campos_extra;

  if (tabla === 'productos') {
    delete limpio.proveedor_id;
    if ('tiene_impuesto' in limpio && typeof limpio.tiene_impuesto === 'boolean') {
      limpio.tiene_impuesto = limpio.tiene_impuesto ? 1 : 0;
    }
    if ('activo' in limpio && typeof limpio.activo === 'boolean') {
      limpio.activo = limpio.activo ? 1 : 0;
    }
  }

  if (tabla === 'facturas_proveedores') {
    delete limpio.precios_con_iva;
    delete limpio.empresa_id;
  }

  if (tabla === 'tickets') {
    delete limpio.empresa_id;
    delete limpio.factura_id;
    if (limpio.cajero_id) {
      limpio.usuario_id = limpio.cajero_id;
      delete limpio.cajero_id;
    }
  }

  if (tabla === 'facturas') {
    // Mantener empresa_id y usuario_id para Supabase
  }

  if (tabla === 'movimientos') {
    // Mantener empresa_id y usuario_id para Supabase
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

  if (tabla === 'mi_empresa') {
    delete limpio.sync_status;
  }

  return limpio;
}

// ===== EMPRESA (proveedores y datos de la empresa) =====
export const getEmpresa = () => supabase.from('empresa').select('*').single()
export const getEmpresas = () => supabase.from('empresa').select('*').order('nombre')
export const addEmpresa = (data) => supabase.from('empresa').insert(limpiar('empresa', data)).select().single()
export const updateEmpresa = (id, data) => supabase.from('empresa').update(limpiar('empresa', data)).eq('id', id).select().single()
export const deleteEmpresa = (id) => supabase.from('empresa').delete().eq('id', id)

// ===== USUARIOS =====
export const getUsuarios = () => supabase.from('usuarios').select('*')
export const createUsuario = (data) => supabase.from('usuarios').insert(limpiar('usuarios', data)).select().single()
export const updateUsuario = (id, data) => supabase.from('usuarios').update(limpiar('usuarios', data)).eq('id', id).select().single()
export const deleteUsuario = (id) => supabase.from('usuarios').delete().eq('id', id)

// ===== CONTACTOS =====
export const getContactos = () => supabase.from('contactos').select('*')
export const createContacto = (data) => supabase.from('contactos').insert(limpiar('contactos', data)).select().single()
export const updateContacto = (id, data) => supabase.from('contactos').update(limpiar('contactos', data)).eq('id', id).select().single()
export const deleteContacto = (id) => supabase.from('contactos').delete().eq('id', id)

// ===== CATEGORÍAS =====
export const getCategorias = () => supabase.from('categorias').select('*')
export const createCategoria = (data) => supabase.from('categorias').insert(limpiar('categorias', data)).select().single()
export const updateCategoria = (id, data) => supabase.from('categorias').update(limpiar('categorias', data)).eq('id', id).select().single()
export const deleteCategoria = (id) => supabase.from('categorias').delete().eq('id', id)

// ===== UNIDADES =====
export const getUnidades = () => supabase.from('unidades').select('*').order('nombre')
export const createUnidad = (data) => supabase.from('unidades').insert(limpiar('unidades', data)).select().single()
export const deleteUnidad = (id) => supabase.from('unidades').delete().eq('id', id)

// ===== PRODUCTOS =====
export const getProductos = async () => {
  const { data, error } = await supabase
    .from('productos')
    .select(`
      *,
      categorias (
        nombre
      ),
      unidades (
        nombre,
        simbolo
      ),
      empresa (
        nombre
      )
    `)

  if (error) {
    console.error(error)
    return []
  }

  return (data || []).map(p => ({
    ...p,
    categoria_nombre: p.categorias?.nombre || null,
    unidad_nombre: p.unidades?.nombre || p.unidad?.nombre || null,
    unidad_simbolo: p.unidades?.simbolo || p.unidad?.simbolo || null,
    proveedor_nombre: p.empresa?.nombre || null,
  }))
}
export const createProducto = (data) => supabase.from('productos').insert(limpiar('productos', data)).select().single()
export const updateProducto = (id, data) => supabase.from('productos').update(limpiar('productos', data)).eq('id', id).select().single()
export const deleteProducto = (id) => supabase.from('productos').delete().eq('id', id)

const _contactoMapForFact = new Map();
const _usuarioMapForFact = new Map();
const _cargarMapasFact = async () => {
    const { data: contactos } = await supabase.from('contactos').select('id, nombre');
    for (const c of contactos || []) _contactoMapForFact.set(c.id, c.nombre);
    const { data: usuarios } = await supabase.from('usuarios').select('id, nombre');
    for (const u of usuarios || []) _usuarioMapForFact.set(u.id, u.nombre);
};

const _prodMap = new Map();
const _cargarMapas = async () => {
    if (_prodMap.size === 0) {
        const { data } = await supabase.from('productos').select('id, nombre, codigo');
        for (const p of data || []) _prodMap.set(p.id, p);
    }
};

export const getMovimientos = async () => {
    await _cargarMapas();
    await _cargarMapasFact();
    const { data } = await supabase.from('movimientos').select('*');
    return (data || []).map(m => ({
        ...m,
        producto_nombre: (_prodMap.get(m.producto_id) || {}).nombre || null,
        producto_codigo: (_prodMap.get(m.producto_id) || {}).codigo || null,
        usuario_nombre: _usuarioMapForFact.get(m.usuario_id) || null,
    }));
};
export const createMovimiento = (data) => supabase.from('movimientos').insert(limpiar('movimientos', data)).select().single()

// ===== FACTURAS =====
const _contactoMapFact = new Map();
const _usuarioMapFact = new Map();
const _cargarMapasFacturas = async () => {
    await _cargarMapasFact();
    await _cargarMapas(); // productos
};
export const getFacturas = async () => {
    await _cargarMapasFacturas();
    const { data } = await supabase.from('facturas').select('*');
    return (data || []).map(f => ({
        ...f,
        contacto_nombre: _contactoMapForFact.get(f.contacto_id) || null,
        usuario_nombre: _usuarioMapForFact.get(f.usuario_id) || null,
    }));
};
export const createFactura = (data) => supabase.from('facturas').insert(limpiar('facturas', data)).select().single()
export const updateFactura = (id, data) => supabase.from('facturas').update(limpiar('facturas', data)).eq('id', id).select().single()
export const deleteFactura = (id) => supabase.from('facturas').delete().eq('id', id)

// ===== ITEMS FACTURA =====
export const getFacturaItems = async (facturaId) => {
    await _cargarMapas();
    const { data } = await supabase.from('factura_items').select('*').eq('factura_id', facturaId);
    return (data || []).map(item => ({
        ...item,
        producto_nombre: (_prodMap.get(item.producto_id) || {}).nombre || null,
        producto_precio: item.precio_venta || (_prodMap.get(item.producto_id) || {}).precio_venta || 0,
    }));
};
export const createFacturaItem = (data) => supabase.from('factura_items').insert(limpiar('factura_items', data)).select().single()

// ===== TICKETS =====
export const getTickets = async () => {
    await _cargarMapasFact();
    await _cargarMapas();
    const { data } = await supabase.from('tickets').select('*');
    return (data || []).map(t => ({
        ...t,
        factura_numero: t.numero_factura || null,
        cajero_nombre: _usuarioMapForFact.get(t.usuario_id) || null,
    }));
};
export const createTicket = (data) => supabase.from('tickets').insert(limpiar('tickets', data)).select().single()
export const updateTicket = (id, data) => supabase.from('tickets').update(limpiar('tickets', data)).eq('id', id).select().single()
export const deleteTicket = (id) => supabase.from('tickets').delete().eq('id', id)

// ===== PAGOS (INGRESOS Y GASTOS) =====
export const getPagos = async () => {
    await _cargarMapasFact();
    const { data } = await supabase.from('pagos').select('*');
    return (data || []).map(p => ({
        ...p,
        usuario_nombre: _usuarioMapForFact.get(p.usuario_id) || null,
    }));
};
export const createPago = (data) => supabase.from('pagos').insert(limpiar('pagos', data)).select().single()
export const updatePago = (id, data) => supabase.from('pagos').update(limpiar('pagos', data)).eq('id', id).select().single()
export const deletePago = (id) => supabase.from('pagos').delete().eq('id', id)

// ===== INGRESOS (pagos tipo='ingreso') =====
export const getIngresos = async () => {
    await _cargarMapasFact();
    const { data } = await supabase.from('pagos').select('*').eq('tipo', 'ingreso');
    return (data || []).map(p => ({
        ...p,
        usuario_nombre: _usuarioMapForFact.get(p.usuario_id) || null,
    }));
};
export const createIngreso = (data) => supabase.from('pagos').insert(limpiar('pagos', { ...data, tipo: 'ingreso' })).select().single()
export const updateIngreso = (id, data) => supabase.from('pagos').update(limpiar('pagos', data)).eq('id', id).select().single()
export const deleteIngreso = (id) => supabase.from('pagos').delete().eq('id', id)

// ===== GASTOS (pagos tipo='egreso') =====
export const getGastos = async () => {
    await _cargarMapasFact();
    const { data } = await supabase.from('pagos').select('*').eq('tipo', 'egreso');
    return (data || []).map(p => ({
        ...p,
        usuario_nombre: _usuarioMapForFact.get(p.usuario_id) || null,
    }));
};
export const createGasto = (data) => supabase.from('pagos').insert(limpiar('pagos', { ...data, tipo: 'egreso' })).select().single()
export const updateGasto = (id, data) => supabase.from('pagos').update(limpiar('pagos', data)).eq('id', id).select().single()
export const deleteGasto = (id) => supabase.from('pagos').delete().eq('id', id)

// ===== NOTAS CRÉDITO/DÉBITO =====
export const getNotasCreditoDebito = async () => {
    await _cargarMapasFact();
    const { data } = await supabase.from('notas_credito_debito').select('*');
    return (data || []).map(n => ({
        ...n,
        contacto_nombre: _contactoMapForFact.get(n.contacto_id) || null,
        usuario_nombre: _usuarioMapForFact.get(n.usuario_id) || null,
    }));
};
export const createNotaCreditoDebito = (data) => supabase.from('notas_credito_debito').insert(limpiar('notas_credito_debito', data)).select().single()
export const deleteNotaCreditoDebito = (id) => supabase.from('notas_credito_debito').delete().eq('id', id)

// ===== CAJA =====
export const getCaja = async () => {
    await _cargarMapasFact();
    const { data } = await supabase.from('caja').select('*');
    return (data || []).map(c => ({
        ...c,
        cajero_nombre: _usuarioMapForFact.get(c.usuario_id) || null,
    }));
};
export const createCaja = (data) => supabase.from('caja').insert(limpiar('caja', data)).select().single()
export const updateCaja = (id, data) => supabase.from('caja').update(limpiar('caja', data)).eq('id', id).select().single()

// ===== FACTURAS PROVEEDORES =====
const _empresaMap = new Map();
const _cargarEmpresas = async () => {
    if (_empresaMap.size === 0) {
        const { data } = await supabase.from('empresa').select('id, nombre, ruc, telefono');
        for (const e of data || []) _empresaMap.set(e.id, e);
    }
};
export const getFacturasProveedores = async () => {
    await _cargarMapas();
    await _cargarEmpresas();
    await _cargarMapasFact();
    const { data } = await supabase.from('facturas_proveedores').select('*');
    return (data || []).map(f => ({
        ...f,
        proveedor: _empresaMap.get(f.proveedor_id) || null,
        usuario_nombre: _usuarioMapForFact.get(f.usuario_id) || null,
        items: [],
    }));
};

export const createFacturaProveedor = (data) =>
    supabase.from('facturas_proveedores').insert(limpiar('facturas_proveedores', data)).select().single()

export const updateFacturaProveedor = (id, data) =>
    supabase.from('facturas_proveedores').update(limpiar('facturas_proveedores', data)).eq('id', id).select().single()

export const deleteFacturaProveedor = (id) =>
    supabase.from('facturas_proveedores').delete().eq('id', id)

// ===== ITEMS FACTURA PROVEEDOR =====
export const getFacturaItemsProveedor = async (facturaId) => {
    await _cargarMapas();
    const { data } = await supabase.from('factura_items_proveedores').select('*').eq('factura_proveedor_id', facturaId);
    return (data || []).map(item => ({
        ...item,
        producto_nombre: (_prodMap.get(item.producto_id) || {}).nombre || null,
    }));
};

export const createFacturaItemProveedor = (data) =>
    supabase.from('factura_items_proveedores').insert(limpiar('factura_items_proveedores', data)).select().single()

export const deleteFacturaItemProveedor = (id) =>
    supabase.from('factura_items_proveedores').delete().eq('id', id)

// ===== PROVEEDORES (empresa) =====
export const getProveedores = () => supabase.from('empresa').select('*')
export const createProveedor = (data) => supabase.from('empresa').insert(limpiar('empresa', data)).select().single()
export const updateProveedor = (id, data) => supabase.from('empresa').update(limpiar('empresa', data)).eq('id', id).select().single()
export const deleteProveedor = (id) => supabase.from('empresa').delete().eq('id', id)

// ===== DASHBOARD =====
export const getDashboard = async () => {
    const { data } = await supabase.from('productos').select('categoria_id, precio_venta, stock_actual');
    const productos = data || [];
    const bajos = productos.filter(p => p.stock_actual <= (p.stock_minimo || 0)).length;
    return { total_ventas: 0, ingresos: 0, productos_bajo_stock: bajos, movimientos_pendientes: 0 };
};

// ===== REPORTES =====
export const getReportes = () => supabase.from('reportes').select('*')
export const createReporte = (data) => supabase.from('reportes').insert(limpiar('reportes', data)).select().single()

// ===== PRODUCTOS POR PROVEEDOR =====
export const getProductosByProveedor = async (proveedorId) => {
    const { data: prods } = await supabase.from('productos')
        .select('*, categoria:categorias(nombre), unidad:unidades(nombre, simbolo)')
        .eq('contacto_id', proveedorId);
    return (prods || []).map(p => ({
        ...p,
        categoria_nombre: p.categoria_nombre || null,
        unidad_nombre: p.unidad_nombre || null,
        unidad_simbolo: p.unidad_simbolo || null,
        contacto_nombre: p.contacto_nombre || null,
        proveedor_nombre: p.proveedor_nombre || null,
    }));
};

// ===== MI EMPRESA (datos del negocio propio) - Solo en Supabase =====
export const getMiEmpresa = () => supabase.from('mi_empresa').select('*').maybeSingle()
export const updateMiEmpresa = (data) => supabase.from('mi_empresa').update(limpiar('mi_empresa', data)).eq('id', 'empresa_unica').select().single()
