import Database from "@tauri-apps/plugin-sql";

let db = null;

export async function getDB() {
    if (!db) {
        db = await Database.load("sqlite:inventario.db");
        await migrarTablas();
        // Recargar la conexión para descartar los prepared statements con
        // esquema viejo. Tras ALTER TABLE, sqlx-sqlite cachea el nº de columnas
        // y luego hace panic ("index out of bounds") en los SELECT.
        try { await db.close(); } catch (_) {}
        db = await Database.load("sqlite:inventario.db");
    }
    return db;
}

async function migrarTablas() {
    try {
        await db.execute(`CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tabla TEXT NOT NULL,
            operacion TEXT NOT NULL,
            registro_id TEXT NOT NULL,
            datos TEXT NOT NULL,
            intentos INTEGER DEFAULT 0,
            estado TEXT DEFAULT 'pending',
            creado_en INTEGER NOT NULL
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS categorias (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            descripcion TEXT,
            creado_en INTEGER
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS unidades (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            simbolo TEXT
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS contactos (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            tipo TEXT DEFAULT 'cliente',
            documento TEXT,
            telefono TEXT,
            email TEXT,
            direccion TEXT,
            notas TEXT,
            creado_en INTEGER
        )`);

        try {
            const contactosCols = await db.select("PRAGMA table_info(contactos)");
            const contactosColNames = (contactosCols || []).map(c => c.name);
            if (!contactosColNames.includes('documento')) {
                await db.execute(`ALTER TABLE contactos ADD COLUMN documento TEXT`);
            }
            if (!contactosColNames.includes('notas')) {
                await db.execute(`ALTER TABLE contactos ADD COLUMN notas TEXT`);
            }
        } catch (_) { /* tabla no existe aún */ }

        await db.execute(`CREATE TABLE IF NOT EXISTS empresa (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL,
            ruc TEXT,
            direccion TEXT,
            telefono TEXT,
            email TEXT,
            logo_url TEXT,
            moneda TEXT,
            tasa_impuesto REAL DEFAULT 0,
            serie_factura TEXT,
            serie_ticket TEXT,
            created_at INTEGER,
            updated_at INTEGER
        )`);

        await db.execute(`CREATE TABLE IF NOT EXISTS movimientos (
            id TEXT PRIMARY KEY,
            producto_id TEXT NOT NULL,
            tipo TEXT NOT NULL,
            cantidad INTEGER NOT NULL,
            precio_unitario REAL NOT NULL,
            total REAL,
            fecha_movimiento TEXT,
            usuario_id TEXT,
            referencia TEXT,
            creado_en INTEGER
        )`);

        // Migración: asegurar columna referencia en movimientos (motivo del ajuste).
        try {
            const movCols = await db.select("PRAGMA table_info(movimientos)");
            const movColNames = (movCols || []).map(c => c.name);
            if (!movColNames.includes('referencia')) {
                await db.execute(`ALTER TABLE movimientos ADD COLUMN referencia TEXT`);
            }
            await db.execute(`UPDATE movimientos SET referencia = '' WHERE referencia IS NULL`);
        } catch (_) { /* tabla no existe aún */ }

        await db.execute(`CREATE TABLE IF NOT EXISTS pagos (
            id TEXT PRIMARY KEY,
            tipo TEXT NOT NULL,
            monto REAL NOT NULL,
            descripcion TEXT,
            fecha TEXT,
            usuario_id TEXT,
            contacto_id TEXT,
            creado_en INTEGER
        )`);

        // TABLA TICKETS (completa)
        await db.execute(`CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            numero_ticket TEXT NOT NULL,
            factura_id TEXT,
            productos TEXT,
            metodo_pago TEXT DEFAULT 'efectivo',
            cajero_id TEXT,
            turno TEXT,
            subtotal REAL DEFAULT 0,
            impuesto REAL DEFAULT 0,
            total REAL DEFAULT 0,
            precios_con_iva INTEGER DEFAULT 0,
            tasa_impuesto REAL DEFAULT 0,
            fecha_venta TEXT,
            creado_en INTEGER,
            sync_status TEXT DEFAULT 'pending'
        )`);

        try {
            const ticketsCols = await db.select("PRAGMA table_info(tickets)")
            const ticketColNames = (ticketsCols || []).map(c => c.name)
            if (!ticketColNames.includes('precios_con_iva')) {
                await db.execute(`ALTER TABLE tickets ADD COLUMN precios_con_iva INTEGER DEFAULT 0`)
            }
            if (!ticketColNames.includes('tasa_impuesto')) {
                await db.execute(`ALTER TABLE tickets ADD COLUMN tasa_impuesto REAL DEFAULT 0`)
            }
        } catch (_) { /* tabla no existe aún */ }

        // TABLA FACTURAS
        await db.execute(`CREATE TABLE IF NOT EXISTS facturas (
            id TEXT PRIMARY KEY,
            contacto_id TEXT,
            numero_factura TEXT UNIQUE,
            tipo TEXT DEFAULT 'factura',
            subtotal REAL DEFAULT 0,
            impuesto REAL DEFAULT 0,
            total REAL DEFAULT 0,
            estado TEXT DEFAULT 'pendiente',
            fecha_emision TEXT,
            fecha_vencimiento TEXT,
            sync_status TEXT DEFAULT 'pending'
        )`);

        // TABLA FACTURA ITEMS
        await db.execute(`CREATE TABLE IF NOT EXISTS factura_items (
            id TEXT PRIMARY KEY,
            factura_id TEXT,
            producto_id TEXT,
            cantidad INTEGER DEFAULT 0,
            precio_unitario REAL DEFAULT 0,
            total REAL DEFAULT 0,
            sync_status TEXT DEFAULT 'pending'
        )`);

        // TABLA FACTURAS PROVEEDORES
        await db.execute(`CREATE TABLE IF NOT EXISTS facturas_proveedores (
            id TEXT PRIMARY KEY,
            numero_factura TEXT NOT NULL,
            proveedor_id TEXT,
            fecha TEXT,
            total REAL,
            estado TEXT DEFAULT 'pendiente',
            precios_con_iva INTEGER DEFAULT 0,
            sync_status TEXT DEFAULT 'pending'
        )`);

        // Agregar columnas a facturas_proveedores si no existen
        try {
            const facProvCols = await db.select("PRAGMA table_info(facturas_proveedores)");
            const facProvColNames = (facProvCols || []).map(c => c.name);
            if (!facProvColNames.includes('precios_con_iva')) {
                await db.execute(`ALTER TABLE facturas_proveedores ADD COLUMN precios_con_iva INTEGER DEFAULT 0`);
            }
        } catch (e) {
            console.warn('No se pudo migrar facturas_proveedores:', e?.message);
        }

        // TABLA FACTURA ITEMS PROVEEDORES
        await db.execute(`CREATE TABLE IF NOT EXISTS factura_items_proveedores (
            id TEXT PRIMARY KEY,
            factura_proveedor_id TEXT,
            producto_id TEXT,
            cantidad INTEGER,
            precio_unitario REAL,
            subtotal REAL,
            sync_status TEXT DEFAULT 'pending'
        )`);

        // TABLA MI EMPRESA (datos del negocio propio)
        await db.execute(`CREATE TABLE IF NOT EXISTS mi_empresa (
            id TEXT PRIMARY KEY,
            nombre TEXT NOT NULL DEFAULT 'Mi Negocio',
            ruc TEXT,
            direccion TEXT,
            telefono TEXT,
            email TEXT,
            logo_url TEXT,
            moneda TEXT DEFAULT 'USD',
            tasa_impuesto REAL DEFAULT 18,
            serie_factura TEXT,
            serie_ticket TEXT,
            admin_nombre TEXT DEFAULT '',
            plantilla_ticket TEXT,
            plantilla_factura TEXT,
            plantilla_nota_credito TEXT,
            created_at INTEGER,
            updated_at INTEGER
        )`);
        
        // Agregar columnas de plantillas si no existen
        try {
            const miEmpresaCols = await db.select("PRAGMA table_info(mi_empresa)");
            const colNames = (miEmpresaCols || []).map(c => c.name);
            const miEmpresaExtras = [
                'plantilla_ticket', 'plantilla_factura', 'plantilla_nota_credito',
                'admin_nombre TEXT',
            ];
            for (const col of miEmpresaExtras) {
                const nombreCol = col.split(' ')[0];
                if (!colNames.includes(nombreCol)) {
                    await db.execute(`ALTER TABLE mi_empresa ADD COLUMN ${col}`);
                }
            }
            // Normalizar NULL -> '' para evitar problemas de lectura tras ALTER.
            await db.execute(`UPDATE mi_empresa SET admin_nombre = '' WHERE admin_nombre IS NULL`);
        } catch (e) {
            console.warn('No se pudo crear tabla productos:', e?.message);
        }

        // ── MIGRACIÓN DE UNIDADES ──────────────────────────────────
        let unidadColNames = [];
        try {
            const uCols = await db.select("PRAGMA table_info(unidades)");
            unidadColNames = (uCols || []).map(c => c.name);
        } catch (_) { /* tabla no existe */ }

        if (unidadColNames.length > 0) {
            const unidadRequeridas = ['id', 'nombre', 'simbolo', 'tipo_unidad', 'factor_conversion'];
            const unidadFaltantes = unidadRequeridas.filter(c => !unidadColNames.includes(c));
            for (const col of unidadFaltantes) {
                try {
                    if (col === 'tipo_unidad') await db.execute(`ALTER TABLE unidades ADD COLUMN tipo_unidad TEXT DEFAULT 'unidad'`);
                    else if (col === 'factor_conversion') await db.execute(`ALTER TABLE unidades ADD COLUMN factor_conversion REAL DEFAULT 1`);
                    else await db.execute(`ALTER TABLE unidades ADD COLUMN ${col} TEXT`);
                } catch (e) {
                    console.warn(`No se pudo agregar columna ${col} a unidades:`, e?.message);
                }
            }
        }
        await db.execute(`INSERT OR IGNORE INTO mi_empresa (id, nombre) VALUES ('empresa_unica', 'Mi Negocio')`);

        // TABLA CAJA (turnos de caja persistentes)
        await db.execute(`CREATE TABLE IF NOT EXISTS caja (
            id TEXT PRIMARY KEY,
            fecha_apertura TEXT NOT NULL,
            fecha_cierre TEXT,
            monto_apertura REAL DEFAULT 0,
            monto_cierre REAL,
            saldo_esperado REAL,
            diferencia REAL,
            responsable TEXT,
            estado TEXT DEFAULT 'abierta',
            sync_status TEXT DEFAULT 'pending'
        )`);

        // Migración: agregar diferencia si no existe
        try {
            const cajaCols = await db.select("PRAGMA table_info(caja)");
            const cajaColNames = (cajaCols || []).map(c => c.name);
            if (!cajaColNames.includes('diferencia')) {
                await db.execute(`ALTER TABLE caja ADD COLUMN diferencia REAL DEFAULT 0`);
            }
        } catch (e) {
            console.warn('Migración caja diferencia:', e?.message);
        }

        // TABLA MOVIMIENTOS DE CAJA (log del turno)
        await db.execute(`CREATE TABLE IF NOT EXISTS caja_movimientos (
            id TEXT PRIMARY KEY,
            caja_id TEXT NOT NULL,
            tipo TEXT NOT NULL,
            monto REAL NOT NULL,
            descripcion TEXT,
            fecha TEXT,
            sync_status TEXT DEFAULT 'pending'
        )`);

        // ── MIGRACIÓN DE PRODUCTOS ──────────────────────────────────
        let columnNames = [];
        try {
            const cols = await db.select("PRAGMA table_info(productos)");
            columnNames = (cols || []).map(c => c.name);
        } catch (_) {
            // Tabla no existe
        }

        if (columnNames.length > 0) {
            const columnasRequeridas = ['id','empresa_id','categoria_id','codigo','nombre','descripcion','unidad_id','contacto_id','proveedor_id','imagen_url','precio_venta','precio_costo','stock_actual','stock_minimo','tiene_impuesto','tasa_impuesto_producto','tiempo_entrega_dias','campos_extra','activo','creado_en','actualizado_en','sync_status'];
            const faltantes = columnasRequeridas.filter(c => !columnNames.includes(c));

            for (const col of faltantes) {
                try {
                    if (col === 'codigo')       await db.execute(`ALTER TABLE productos ADD COLUMN codigo TEXT UNIQUE`);
                    else if (col === 'nombre')  await db.execute(`ALTER TABLE productos ADD COLUMN nombre TEXT NOT NULL DEFAULT ''`);
                    else if (col === 'precio_venta') await db.execute(`ALTER TABLE productos ADD COLUMN precio_venta REAL NOT NULL DEFAULT 0`);
                    else if (col === 'precio_costo') await db.execute(`ALTER TABLE productos ADD COLUMN precio_costo REAL NOT NULL DEFAULT 0`);
                    else if (['stock_actual','stock_minimo','tiene_impuesto'].includes(col)) await db.execute(`ALTER TABLE productos ADD COLUMN ${col} INTEGER DEFAULT 0`);
                    else if (col === 'tasa_impuesto_producto') await db.execute(`ALTER TABLE productos ADD COLUMN tasa_impuesto_producto REAL DEFAULT 0`);
                    else if (col === 'tiempo_entrega_dias') await db.execute(`ALTER TABLE productos ADD COLUMN tiempo_entrega_dias INTEGER DEFAULT 0`);
                    else if (col === 'activo') await db.execute(`ALTER TABLE productos ADD COLUMN activo INTEGER DEFAULT 1`);
                    else if (['creado_en','actualizado_en'].includes(col)) await db.execute(`ALTER TABLE productos ADD COLUMN ${col} INTEGER`);
                    else if (col === 'sync_status') await db.execute(`ALTER TABLE productos ADD COLUMN sync_status TEXT DEFAULT 'synced'`);
                    else if (col === 'campos_extra') await db.execute(`ALTER TABLE productos ADD COLUMN campos_extra TEXT`);
                    else await db.execute(`ALTER TABLE productos ADD COLUMN ${col} TEXT`);
                } catch (e) {
                    console.warn(`No se pudo agregar columna ${col}:`, e?.message);
                }
            }

            // Quitar UNIQUE de codigo en la base existente (la nube ya lo
            // valida). Local debe permitir códigos vacíos/duplicados al
            // descargar; si no, el INSERT OR IGNORE falla y se pierden productos.
            try {
                const idxs = await db.select("PRAGMA index_list(productos)");
                for (const ix of (idxs || [])) {
                    if (ix.unique) {
                        const info = await db.select(`PRAGMA index_info(${ix.name})`);
                        if ((info || []).some(c => c.name === 'codigo')) {
                            await db.execute(`DROP INDEX IF EXISTS ${ix.name}`);
                        }
                    }
                }
            } catch (_) {}

        } else {
            try {
                await db.execute(`CREATE TABLE IF NOT EXISTS productos (
                    id TEXT PRIMARY KEY,
                    empresa_id TEXT,
                    categoria_id TEXT,
                    codigo TEXT,
                    nombre TEXT NOT NULL,
                    descripcion TEXT,
                    unidad_id TEXT,
                    contacto_id TEXT,
                    proveedor_id TEXT,
                    imagen_url TEXT,
                    precio_venta REAL NOT NULL,
                    precio_costo REAL NOT NULL,
                     stock_actual INTEGER DEFAULT 0,
                    stock_minimo INTEGER DEFAULT 0,
                    tiene_impuesto INTEGER DEFAULT 0,
                    tasa_impuesto_producto REAL DEFAULT 0,
                    tiempo_entrega_dias INTEGER DEFAULT 0,
                    campos_extra TEXT,
                    activo INTEGER DEFAULT 1,
                    creado_en INTEGER,
                    actualizado_en INTEGER,
                    sync_status TEXT DEFAULT 'synced'
                )`);
            } catch (e) {
                console.warn('No se pudo crear tabla productos:', e?.message);
            }
        }
    } catch (e) {
        console.warn('Error migrando tablas:', e);
    }

    try {
        const ticketCols = await db.select("PRAGMA table_info(tickets)");
        const ticketColNames = (ticketCols || []).map(c => c.name);
        if (!ticketColNames.includes('sync_status')) {
            await db.execute(`ALTER TABLE tickets ADD COLUMN sync_status TEXT DEFAULT 'pending'`);
        }

        await db.execute(`UPDATE tickets SET cajero_id = NULL WHERE cajero_id = 'dueño'`);
        await db.execute(`UPDATE caja SET responsable = NULL WHERE responsable = 'dueño'`);
    } catch (_) { /* tablas no existen todavía */ }
}

function generarUUID() {
    return crypto.randomUUID();
}

// ===== CONTACTOS =====
export async function getContactos() {
    const database = await getDB();
    return await database.select('SELECT * FROM contactos ORDER BY nombre');
}

export async function addContacto(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO contactos (id, nombre, tipo, documento, telefono, email, direccion, notas, creado_en) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, data.nombre, data.tipo || 'cliente', data.documento || '', data.telefono || '', data.email || '', data.direccion || '', data.notas || '', Date.now()]
    );
    await agregarSyncQueue('contactos', 'INSERT', id, { ...data, id });
    return id;
}

export async function addContactoSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT OR IGNORE INTO contactos (id, nombre, tipo, documento, telefono, email, direccion, notas, creado_en) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [id, data.nombre, data.tipo || 'cliente', data.documento || '', data.telefono || '', data.email || '', data.direccion || '', data.notas || '', Date.now()]
    );
    return id;
}

export async function updateContacto(id, data) {
    const database = await getDB();
    await database.execute(
        `UPDATE contactos SET nombre = $1, tipo = $2, documento = $3, telefono = $4, email = $5, direccion = $6, notas = $7 WHERE id = $8`,
        [data.nombre, data.tipo, data.documento || '', data.telefono || '', data.email || '', data.direccion || '', data.notas || '', id]
    );
    await agregarSyncQueue('contactos', 'UPDATE', id, data);
    return { id };
}

export async function deleteContactoLocal(id) {
    const database = await getDB();
    await database.execute('DELETE FROM contactos WHERE id = $1', [id]);
    await agregarSyncQueue('contactos', 'DELETE', id, { id });
}

// ===== PRODUCTOS =====
export async function getProductos() {
    const database = await getDB();
    return await database.select(`
        SELECT
            p.*,
            c.nombre as categoria_nombre,
            u.nombre as unidad_nombre,
            u.simbolo as unidad_simbolo,
            co.nombre as contacto_nombre,
            e.nombre as proveedor_nombre
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        LEFT JOIN unidades u ON p.unidad_id = u.id
        LEFT JOIN contactos co ON p.contacto_id = co.id
        LEFT JOIN empresa e ON e.id = COALESCE(p.empresa_id, p.proveedor_id)
        WHERE p.activo = 1
        ORDER BY p.creado_en DESC
    `);
}

export async function addProducto(producto) {
    const database = await getDB();
    const ahora = Date.now();
    const id = producto.id || generarUUID();
    await database.execute(
        `INSERT INTO productos (
            id, empresa_id, codigo, nombre, descripcion,
            categoria_id, unidad_id, contacto_id, proveedor_id, imagen_url,
            precio_venta, precio_costo, stock_actual, stock_minimo,
            tiene_impuesto, tasa_impuesto_producto, tiempo_entrega_dias, campos_extra,
            activo, creado_en, actualizado_en
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
            id, producto.empresa_id || null, producto.codigo, producto.nombre, producto.descripcion || '',
            producto.categoria_id || null, producto.unidad_id || null, producto.contacto_id || null, producto.proveedor_id || null, producto.imagen_url || null,
            producto.precio_venta, producto.precio_costo || 0, producto.stock_actual || 0, producto.stock_minimo || 0,
            producto.tiene_impuesto ? 1 : 0, producto.tasa_impuesto_producto || 0, producto.tiempo_entrega_dias || 0, JSON.stringify(producto.campos_extra || {}),
            1, ahora, ahora
        ]
    );
    await agregarSyncQueue('productos', 'INSERT', id, { ...producto, id });
    return id;
}

export async function updateProducto(id, data) {
    const database = await getDB();
    const ahora = Date.now();
    const campos = [];
    const valores = [];
    let idx = 1;
    const mapeo = {
        nombre: 'nombre', descripcion: 'descripcion', codigo: 'codigo',
        categoria_id: 'categoria_id', unidad_id: 'unidad_id', contacto_id: 'contacto_id', proveedor_id: 'proveedor_id',
        precio_venta: 'precio_venta', precio_costo: 'precio_costo',
        stock_actual: 'stock_actual', stock_minimo: 'stock_minimo', tiempo_entrega_dias: 'tiempo_entrega_dias',
        tiene_impuesto: 'tiene_impuesto', tasa_impuesto_producto: 'tasa_impuesto_producto',
        imagen_url: 'imagen_url'
    };
    for (const [key, col] of Object.entries(mapeo)) {
        if (data[key] !== undefined) {
            campos.push(`${col} = $${idx}`);
            valores.push(data[key]);
            idx++;
        }
    }
    if (campos.length === 0) return;
    valores.push(ahora);
    valores.push(id);
    await database.execute(
        `UPDATE productos SET ${campos.join(', ')}, actualizado_en = $${idx}, sync_status = 'pending' WHERE id = $${idx + 1}`,
        [...valores]
    );
    await agregarSyncQueue('productos', 'UPDATE', id, data);
    return { id };
}

export async function deleteProductoLocal(id) {
    const database = await getDB();
    await database.execute('UPDATE productos SET activo = 0 WHERE id = $1', [id]);
    await agregarSyncQueue('productos', 'DELETE', id, { id });
}

// Descuenta stock al vender y registra el movimiento de salida.
export async function descontarStockProducto(productoId, cantidad, datos = {}) {
    const database = await getDB();
    const ahora = Date.now();
    const cant = Number(cantidad) || 0;
    if (cant <= 0) return; // Regla: no descontar cantidades no positivas.
    // Regla de negocio: el stock nunca queda negativo (defensa en BD).
    await database.execute(
        `UPDATE productos SET stock_actual = MAX(0, stock_actual - $1), actualizado_en = $2 WHERE id = $3`,
        [cant, ahora, productoId]
    );
    await database.execute(
        `INSERT INTO movimientos (id, producto_id, tipo, cantidad, precio_unitario, total, fecha_movimiento, usuario_id, creado_en)
         VALUES ($1, $2, 'salida', $3, $4, $5, $6, $7, $8)`,
        [
            generarUUID(),
            productoId,
            cantidad,
            datos.precio_unitario || 0,
            (datos.precio_unitario || 0) * cantidad,
            datos.fecha_movimiento || new Date().toISOString(),
            datos.usuario_id || 'user-001',
            ahora
        ]
    );
    await agregarSyncQueue('movimientos', 'INSERT', productoId, { producto_id: productoId, tipo: 'salida', cantidad });
}

// Lee la tasa de impuesto configurada en mi_empresa.
export async function getTasaImpuesto() {
    try {
        const database = await getDB();
        const rows = await database.select('SELECT tasa_impuesto, moneda FROM mi_empresa LIMIT 1');
        if (rows && rows[0]) {
            return { tasa: rows[0].tasa_impuesto || 0, moneda: rows[0].moneda || 'USD' };
        }
    } catch (_) {}
    return { tasa: 0, moneda: 'USD' };
}

// ===== CATEGORÍAS =====
export async function getCategorias() {
    const database = await getDB();
    return await database.select('SELECT * FROM categorias ORDER BY nombre');
}

export async function addCategoria(data) {
    const database = await getDB();
    const ahora = Date.now();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO categorias (id, nombre, descripcion, creado_en) VALUES ($1, $2, $3, $4)`,
        [id, data.nombre, data.descripcion || '', ahora]
    );
    await agregarSyncQueue('categorias', 'INSERT', id, { ...data, id });
    return id;
}

export async function addCategoriaSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    const ahora = Date.now();
    await database.execute(
        `INSERT OR IGNORE INTO categorias (id, nombre, descripcion, creado_en) VALUES ($1, $2, $3, $4)`,
        [id, data.nombre, data.descripcion || '', ahora]
    );
    return id;
}

export async function updateCategoria(id, data) {
    const database = await getDB();
    await database.execute(
        `UPDATE categorias SET nombre = $1, descripcion = $2 WHERE id = $3`,
        [data.nombre, data.descripcion || '', id]
    );
    await agregarSyncQueue('categorias', 'UPDATE', id, data);
    return { id };
}

export async function deleteCategoriaLocal(id) {
    const database = await getDB();
    await database.execute('DELETE FROM categorias WHERE id = $1', [id]);
    await agregarSyncQueue('categorias', 'DELETE', id, { id });
}

// ===== UNIDADES =====
export async function getUnidades() {
    const database = await getDB();
    return await database.select('SELECT * FROM unidades ORDER BY nombre');
}

export async function addUnidad(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO unidades (id, nombre, simbolo, tipo_unidad, factor_conversion) VALUES ($1, $2, $3, $4, $5)`,
        [id, data.nombre, data.simbolo || '', data.tipo_unidad || 'unidad', data.factor_conversion || 1]
    );
    await agregarSyncQueue('unidades', 'INSERT', id, { ...data, id });
    return id;
}

export async function addUnidadSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT OR IGNORE INTO unidades (id, nombre, simbolo, tipo_unidad, factor_conversion) VALUES ($1, $2, $3, $4, $5)`,
        [id, data.nombre, data.simbolo || '', data.tipo_unidad || 'unidad', data.factor_conversion || 1]
    );
    return id;
}

export async function deleteUnidadLocal(id) {
    const database = await getDB();
    await database.execute('DELETE FROM unidades WHERE id = $1', [id]);
    await agregarSyncQueue('unidades', 'DELETE', id, { id });
}

// ===== PRODUCTOS (SIN SYNC) =====
export async function upsertProductoSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    const ahora = Date.now();

    const camposUpdate = [];
    const valoresUpdate = [];
    let idx = 1;

    if (data.codigo != null)         { camposUpdate.push(`codigo = $${idx}`);          valoresUpdate.push(String(data.codigo));              idx++; }
    if (data.nombre != null)         { camposUpdate.push(`nombre = $${idx}`);          valoresUpdate.push(String(data.nombre));              idx++; }
    if (data.descripcion != null)    { camposUpdate.push(`descripcion = $${idx}`);     valoresUpdate.push(String(data.descripcion));         idx++; }
    if (data.empresa_id != null)     { camposUpdate.push(`empresa_id = $${idx}`);      valoresUpdate.push(String(data.empresa_id));          idx++; }
    if (data.categoria_id != null)   { camposUpdate.push(`categoria_id = $${idx}`);    valoresUpdate.push(String(data.categoria_id));        idx++; }
    if (data.unidad_id != null)      { camposUpdate.push(`unidad_id = $${idx}`);       valoresUpdate.push(String(data.unidad_id));           idx++; }
    if (data.contacto_id != null)    { camposUpdate.push(`contacto_id = $${idx}`);     valoresUpdate.push(String(data.contacto_id));         idx++; }
    if (data.proveedor_id != null)   { camposUpdate.push(`proveedor_id = $${idx}`);    valoresUpdate.push(String(data.proveedor_id));        idx++; }
    if (data.imagen_url != null)     { camposUpdate.push(`imagen_url = $${idx}`);      valoresUpdate.push(data.imagen_url);                  idx++; }
    if (data.precio_venta != null)   { camposUpdate.push(`precio_venta = $${idx}`);    valoresUpdate.push(data.precio_venta);                idx++; }
    if (data.precio_costo != null)   { camposUpdate.push(`precio_costo = $${idx}`);    valoresUpdate.push(data.precio_costo);                idx++; }
    if (data.stock_actual != null)   { camposUpdate.push(`stock_actual = $${idx}`);    valoresUpdate.push(data.stock_actual);                idx++; }
    if (data.stock_minimo != null)   { camposUpdate.push(`stock_minimo = $${idx}`);    valoresUpdate.push(data.stock_minimo);                idx++; }
    if (data.tiempo_entrega_dias != null) { camposUpdate.push(`tiempo_entrega_dias = $${idx}`); valoresUpdate.push(data.tiempo_entrega_dias); idx++; }
    if (data.tiene_impuesto != null) { camposUpdate.push(`tiene_impuesto = $${idx}`);  valoresUpdate.push(data.tiene_impuesto ? 1 : 0);      idx++; }
    if (data.tasa_impuesto_producto != null) { camposUpdate.push(`tasa_impuesto_producto = $${idx}`); valoresUpdate.push(data.tasa_impuesto_producto); idx++; }
    if (data.campos_extra != null)   { camposUpdate.push(`campos_extra = $${idx}`);    valoresUpdate.push(JSON.stringify(data.campos_extra)); idx++; }
    if (data.activo != null)         { camposUpdate.push(`activo = $${idx}`);          valoresUpdate.push(data.activo);                      idx++; }
    camposUpdate.push(`actualizado_en = $${idx}`); valoresUpdate.push(ahora); idx++;

    const filas = await database.execute(
        `UPDATE productos SET ${camposUpdate.join(', ')} WHERE id = $${idx}`,
        [...valoresUpdate, id]
    );

    const afectadas = (filas && (filas.rowsAffected ?? filas.changes)) || 0;
    if (afectadas === 0) {
        await database.execute(
            `INSERT OR IGNORE INTO productos (
                id, empresa_id, codigo, nombre, descripcion,
                categoria_id, unidad_id, contacto_id, proveedor_id, imagen_url,
                precio_venta, precio_costo, stock_actual, stock_minimo,
                tiene_impuesto, tasa_impuesto_producto, tiempo_entrega_dias, campos_extra,
                activo, creado_en, actualizado_en
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
            [
                id,
                (data.empresa_id != null)  ? String(data.empresa_id)  : null,
                data.codigo ? String(data.codigo) : null,
                data.nombre  || '',
                data.descripcion || '',
                (data.categoria_id != null) ? String(data.categoria_id) : null,
                (data.unidad_id != null)    ? String(data.unidad_id)    : null,
                (data.contacto_id != null)  ? String(data.contacto_id)   : null,
                (data.proveedor_id != null) ? String(data.proveedor_id)  : null,
                data.imagen_url || '',
                data.precio_venta || 0,
                data.precio_costo || 0,
                data.stock_actual || 0,
                data.stock_minimo || 0,
                data.tiene_impuesto ? 1 : 0,
                data.tasa_impuesto_producto || 0,
                data.tiempo_entrega_dias || 0,
                JSON.stringify(data.campos_extra || {}),
                1, ahora, ahora
            ]
        );
    }
    return id;
}

export async function addProductoSinSync(data) {
    return upsertProductoSinSync(data);
}

// Cuando el id local de un producto divergió del id que tiene en Supabase
// (escenario offline-first "UUID A / UUID B"), al sincronizar por código
// encontramos la fila real en la nube. Para que los próximos edits dejen de
// chocar con la restricción unique(codigo), igualamos el id local al de la
// nube y arrastramos las FK que lo referencian.
export async function reconciliarProductoId(oldId, newId) {
    if (!oldId || !newId || String(oldId) === String(newId)) return;
    const database = await getDB();
    try {
        await database.execute('UPDATE movimientos SET producto_id = $1 WHERE producto_id = $2', [newId, oldId]);
        await database.execute('UPDATE factura_items SET producto_id = $1 WHERE producto_id = $2', [newId, oldId]);
        await database.execute('UPDATE factura_items_proveedores SET producto_id = $1 WHERE producto_id = $2', [newId, oldId]);
        const tickets = await database.select(
            'SELECT id, productos FROM tickets WHERE productos LIKE $1',
            [`%${oldId}%`]
        ).catch(() => []);
        for (const t of (tickets || [])) {
            try {
                const items = typeof t.productos === 'string' ? JSON.parse(t.productos) : t.productos;
                if (!Array.isArray(items)) continue;
                let cambio = false;
                const actualizados = items.map((it) => {
                    if (it.productoId === oldId || it.id === oldId) { cambio = true; return { ...it, productoId: newId, id: newId }; }
                    return it;
                });
                if (cambio) {
                    await database.execute('UPDATE tickets SET productos = $1 WHERE id = $2', [JSON.stringify(actualizados), t.id]);
                }
            } catch { /* ticket sin JSON válido */ }
        }
        await database.execute('UPDATE productos SET id = $1 WHERE id = $2', [newId, oldId]);
    } catch (e) {
        console.warn('No se pudo reconciliar id de producto:', e?.message);
    }
}

// ===== TICKETS =====
export async function getTickets() {
    const database = await getDB();
    return await database.select('SELECT * FROM tickets ORDER BY creado_en DESC');
}

export async function getTicketById(id) {
    const database = await getDB();
    const rows = await database.select('SELECT * FROM tickets WHERE id = $1 LIMIT 1', [id]);
    return rows && rows[0] ? rows[0] : null;
}

export async function addTicket(data) {
    const database = await getDB();
    const id = generarUUID();
    // Consecutividad real basada en el máximo existente (no se repite al reiniciar).
    let lastTicketNumber = 0;
    try {
        const maxRow = await database.select("SELECT MAX(CAST(REPLACE(numero_ticket, 'T-', '') AS INTEGER)) as max FROM tickets WHERE numero_ticket LIKE 'T-%'");
        if (maxRow && maxRow[0] && maxRow[0].max) lastTicketNumber = maxRow[0].max;
    } catch (_) {}
    lastTicketNumber++;
    const numero_ticket = `T-${String(lastTicketNumber).padStart(6, '0')}`;
    await database.execute(
        `INSERT INTO tickets (id, numero_ticket, productos, metodo_pago, cajero_id, turno, subtotal, impuesto, total, fecha_venta, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
            id, numero_ticket,
            JSON.stringify(data.productos || []),
            data.metodo_pago || 'efectivo',
            data.cajero_id || 'user-001',
            data.turno || 'mañana',
            data.subtotal || 0,
            data.impuesto || 0,
            data.total || 0,
            new Date().toISOString(),
            Date.now()
        ]
    );
    await agregarSyncQueue('tickets', 'INSERT', id, { ...data, id, numero_ticket });
    return { id, numero_ticket };
}

// ===== MOVIMIENTOS =====
export async function getMovimientos() {
    const database = await getDB();
    return await database.select(`
        SELECT m.*, p.nombre as producto_nombre, p.codigo as producto_codigo
        FROM movimientos m
        LEFT JOIN productos p ON m.producto_id = p.id
        ORDER BY m.fecha_movimiento DESC
    `);
}

export async function getUltimoCostoMovimiento(productoId) {
    const database = await getDB();
    const rows = await database.select(`
        SELECT precio_unitario, fecha_movimiento, referencia
        FROM movimientos
        WHERE producto_id = $1 AND tipo LIKE 'entrada%'
        ORDER BY fecha_movimiento DESC
        LIMIT 1
    `, [productoId]);
    return rows && rows[0] ? rows[0] : null;
}

export async function addMovimiento(data) {
    const database = await getDB();
    const id = generarUUID();
    await database.execute(
        `INSERT INTO movimientos (id, producto_id, tipo, cantidad, precio_unitario, total, fecha_movimiento, usuario_id, referencia, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
            id, data.producto_id, data.tipo, data.cantidad, data.precio_unitario,
            data.total || (data.cantidad * data.precio_unitario),
            data.fecha_movimiento || new Date().toISOString(),
            data.usuario_id || 'user-001', data.referencia || '', Date.now()
        ]
    );
    await agregarSyncQueue('movimientos', 'INSERT', id, data);
    return id;
}

// Ajuste de stock en bodega (ni es venta ni es compra).
// tipo: 'entrada' suma stock, 'salida' lo resta (ej. producto dañado/perdido).
export async function ajustarStockProducto(productoId, cantidad, tipo = 'salida', motivo = '', usuarioId = 'user-001') {
    const database = await getDB();
    const ahora = Date.now();
    const cant = Math.abs(Number(cantidad) || 0);
    if (cant <= 0) return;

    const operacion = tipo === 'entrada' ? '+' : '-';
    await database.execute(
        `UPDATE productos SET stock_actual = MAX(0, stock_actual ${operacion} $1), actualizado_en = $2 WHERE id = $3`,
        [cant, ahora, productoId]
    );

    const id = generarUUID();
    await database.execute(
        `INSERT INTO movimientos (id, producto_id, tipo, cantidad, precio_unitario, total, fecha_movimiento, usuario_id, referencia, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
            id, productoId, tipo, cant, 0, 0,
            new Date().toISOString(), usuarioId, motivo || '', ahora
        ]
    );
    await agregarSyncQueue('movimientos', 'INSERT', id, {
        producto_id: productoId, tipo, cantidad: cant, motivo,
    });
    return id;
}

// ===== PAGOS =====
export async function getPagos(tipo) {
    const database = await getDB();
    if (tipo) {
        return await database.select(`SELECT * FROM pagos WHERE tipo = $1 ORDER BY fecha DESC`, [tipo]);
    }
    return await database.select('SELECT * FROM pagos ORDER BY fecha DESC');
}

export async function getIngresos() {
    return getPagos('ingreso');
}

export async function getGastos() {
    return getPagos('egreso');
}

export async function addPago(data) {
    const database = await getDB();
    const id = generarUUID();
    await database.execute(
        `INSERT INTO pagos (id, tipo, monto, descripcion, fecha, usuario_id, contacto_id, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            id, data.tipo, data.monto, data.descripcion || '',
            data.fecha || new Date().toISOString().split('T')[0],
            data.usuario_id || null, data.contacto_id || null, Date.now()
        ]
    );
    await agregarSyncQueue('pagos', 'INSERT', id, { ...data, tipo: data.tipo });
    return id;
}

export async function addIngreso(data) {
    return addPago({ ...data, tipo: 'ingreso' });
}

export async function addGasto(data) {
    return addPago({ ...data, tipo: 'egreso' });
}

export async function updatePago(id, data) {
    const database = await getDB();
    const campos = [];
    const valores = [];
    let idx = 1;
    for (const key of ['monto', 'descripcion', 'fecha', 'usuario_id', 'contacto_id']) {
        if (data[key] !== undefined) {
            campos.push(`${key} = $${idx}`);
            valores.push(data[key]);
            idx++;
        }
    }
    if (campos.length === 0) return;
    valores.push(id);
    await database.execute(`UPDATE pagos SET ${campos.join(', ')} WHERE id = $${idx}`, valores);
    await agregarSyncQueue('pagos', 'UPDATE', id, data);
}

export async function deletePagoLocal(id) {
    const database = await getDB();
    await database.execute('DELETE FROM pagos WHERE id = $1', [id]);
    await agregarSyncQueue('pagos', 'DELETE', id, { id });
}

// ===== EMPRESA (PROVEEDORES) =====
export async function getEmpresas() {
    const database = await getDB();
    return await database.select('SELECT * FROM empresa ORDER BY nombre');
}

export async function addEmpresaSinSync(data) {
    const database = await getDB();
    await database.execute(
        `INSERT OR IGNORE INTO empresa (id, nombre, ruc, direccion, telefono, email, logo_url, moneda, tasa_impuesto, serie_factura, serie_ticket, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
            data.id, data.nombre, data.ruc || '', data.direccion || '', data.telefono || '',
            data.email || '', data.logo_url || '', data.moneda || '', data.tasa_impuesto || 0,
            data.serie_factura || '', data.serie_ticket || '', Date.now(), Date.now()
        ]
    );
}

export async function addEmpresa(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO empresa (id, nombre, ruc, direccion, telefono, email, logo_url, moneda, tasa_impuesto, serie_factura, serie_ticket, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
            id, data.nombre, data.ruc || '', data.direccion || '', data.telefono || '',
            data.email || '', data.logo_url || '', data.moneda || '', data.tasa_impuesto || 0,
            data.serie_factura || '', data.serie_ticket || '', Date.now(), Date.now()
        ]
    );
    await agregarSyncQueue('empresa', 'INSERT', id, { ...data, id });
    return id;
}

export async function updateEmpresa(id, data) {
    if (!id) {
        console.error('updateEmpresa: id es requerido');
        return;
    }
    if (!data) {
        console.error('updateEmpresa: data es undefined');
        return;
    }
    
    const database = await getDB();
    const campos = [];
    const valores = [];
    let idx = 1;
    
    const camposPermitidos = ['nombre', 'ruc', 'direccion', 'telefono', 'email', 'logo_url', 'moneda', 'tasa_impuesto', 'serie_factura', 'serie_ticket'];
    
    for (const key of camposPermitidos) {
        if (data[key] !== undefined && data[key] !== null) {
            campos.push(`${key} = $${idx}`);
            valores.push(data[key]);
            idx++;
        }
    }
    
    if (campos.length === 0) return;
    
    valores.push(Date.now());
    valores.push(id);
    
    await database.execute(
        `UPDATE empresa SET ${campos.join(', ')}, updated_at = $${idx} WHERE id = $${idx + 1}`,
        [...valores]
    );
    
    await agregarSyncQueue('empresa', 'UPDATE', id, data);
    return { id };
}

export async function deleteEmpresaLocal(id) {
    const database = await getDB();
    await database.execute('DELETE FROM empresa WHERE id = $1', [id]);
    await agregarSyncQueue('empresa', 'DELETE', id, { id });
}

// ===== MI EMPRESA (DATOS DEL NEGOCIO PROPIO) =====
export async function getMiEmpresa() {
    const database = await getDB();
    const rows = await database.select('SELECT * FROM mi_empresa LIMIT 1');
    if (rows.length > 0) return rows[0];
    return { 
        id: 'empresa_unica', 
        nombre: 'Mi Negocio', 
        moneda: 'USD', 
        tasa_impuesto: 18,
        plantilla_ticket: '',
        plantilla_factura: '',
        plantilla_nota_credito: ''
    };
}

export async function updateMiEmpresa(data) {
    const database = await getDB();
    const ahora = Date.now();
    await database.execute(
        `UPDATE mi_empresa SET 
            nombre = $1, ruc = $2, direccion = $3, telefono = $4, 
            email = $5, logo_url = $6, moneda = $7, tasa_impuesto = $8,
            serie_factura = $9, serie_ticket = $10, admin_nombre = $11, updated_at = $12
         WHERE id = 'empresa_unica'`,
        [data.nombre, data.ruc || '', data.direccion || '', data.telefono || '',
         data.email || '', data.logo_url || '', data.moneda || 'USD', data.tasa_impuesto || 18,
         data.serie_factura || '', data.serie_ticket || '', data.admin_nombre || '', ahora]
    );
    await agregarSyncQueue('mi_empresa', 'UPDATE', 'empresa_unica', data);
    return { id: 'empresa_unica' };
}

export async function updatePlantillas(tipo, contenido) {
    const database = await getDB();
    const campo = `plantilla_${tipo}`;
    try {
        await database.execute(
            `UPDATE mi_empresa SET ${campo} = $1, updated_at = $2 WHERE id = 'empresa_unica'`,
            [contenido, Date.now()]
        );
        return true;
    } catch (e) {
        console.error('Error guardando plantilla:', e);
        return false;
    }
}

// ===== SYNC QUEUE =====
export async function agregarSyncQueue(tabla, operacion, registroId, datos) {
    const database = await getDB();
    await database.execute(
        `INSERT OR IGNORE INTO sync_queue (tabla, operacion, registro_id, datos, creado_en, estado) VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [tabla, operacion, registroId, JSON.stringify(datos), Date.now()]
    );
}

export async function getPendientesSync() {
    const database = await getDB();
    return await database.select("SELECT * FROM sync_queue WHERE estado = 'pending' ORDER BY creado_en ASC");
}

export async function marcarSincronizado(id) {
    const database = await getDB();
    await database.execute("UPDATE sync_queue SET estado = 'completed' WHERE id = $1", [id]);
}

export async function limpiarSyncQueue() {
    const database = await getDB();
    await database.execute("DELETE FROM sync_queue");
}

export async function limpiarSyncQueueTabla(tabla) {
    const database = await getDB();
    await database.execute("DELETE FROM sync_queue WHERE tabla = $1", [tabla]);
}

// ===== FACTURAS =====
export async function addFactura(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO facturas (id, contacto_id, numero_factura, tipo, subtotal, impuesto, total, estado, fecha_emision, fecha_vencimiento, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')`,
        [id, data.contacto_id, data.numero_factura, data.tipo, data.subtotal, data.impuesto, data.total, data.estado, data.fecha_emision, data.fecha_vencimiento]
    );
    await agregarSyncQueue('facturas', 'INSERT', id, data);
    return id;
}

// ===== FACTURAS PROVEEDORES =====
export async function addFacturaProveedor(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO facturas_proveedores (id, numero_factura, proveedor_id, fecha, total, estado, precios_con_iva, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
        [id, data.numero_factura, data.proveedor_id, data.fecha, data.total, data.estado || 'pendiente', data.precios_con_iva ? 1 : 0]
    );
    await agregarSyncQueue('facturas_proveedores', 'INSERT', id, data);
    return id;
}

export async function updateFacturaProveedorSync(localId, remoteId) {
    const database = await getDB();
    await database.execute(
        `UPDATE facturas_proveedores SET id = $1 WHERE id = $2`,
        [remoteId, localId]
    );
}

// ===== FACTURA ITEMS PROVEEDOR =====
export async function addFacturaItemProveedor(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO factura_items_proveedores (id, factura_proveedor_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, data.factura_proveedor_id, data.producto_id, data.cantidad, data.precio_unitario, data.subtotal]
    );
    await agregarSyncQueue('factura_items_proveedores', 'INSERT', id, data);
    return id;
}

// ===== FACTURA ITEMS =====
export async function addFacturaItem(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO factura_items (id, factura_id, producto_id, cantidad, precio_unitario, total) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, data.factura_id, data.producto_id, data.cantidad, data.precio_unitario, data.total]
    );
    await agregarSyncQueue('factura_items', 'INSERT', id, data);
    return id;
}

// ===== TICKETS PARA FACTURA =====
export async function addTicketFactura(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT INTO tickets (id, numero_ticket, factura_id, subtotal, impuesto, total, metodo_pago, fecha_venta, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
        [id, data.numero_ticket, data.factura_id, data.subtotal, data.impuesto, data.total, data.metodo_pago, data.fecha_venta]
    );
    await agregarSyncQueue('tickets', 'INSERT', id, data);
    return id;
}
// ===== FACTURAS PROVEEDORES (SIN SYNC) =====
export async function getFacturasProveedores() {
    const database = await getDB();
    return await database.select(`
        SELECT fp.*, COALESCE(e.nombre, c.nombre) as proveedor_nombre
        FROM facturas_proveedores fp
        LEFT JOIN empresa e ON e.id = fp.proveedor_id
        LEFT JOIN contactos c ON c.id = fp.proveedor_id
        ORDER BY fp.fecha DESC
    `);
}

export async function getFacturaItemsProveedores() {
    const database = await getDB();
    return await database.select('SELECT * FROM factura_items_proveedores ORDER BY id ASC');
}

export async function getFacturas() {
    const database = await getDB();
    return await database.select('SELECT * FROM facturas ORDER BY fecha DESC');
}

export async function getFacturaItems() {
    const database = await getDB();
    return await database.select('SELECT * FROM factura_items ORDER BY id ASC');
}

export async function addFacturaProveedorSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT OR IGNORE INTO facturas_proveedores (id, numero_factura, proveedor_id, fecha, total, estado, precios_con_iva, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'synced')`,
        [id, data.numero_factura, data.proveedor_id, data.fecha, data.total, data.estado || 'pendiente', data.precios_con_iva ? 1 : 0]
    );
    return id;
}

// ===== RESTAURACIÓN DESDE SUPABASE (INSERTS SIN ENCOLAR SYNC) =====
// Estas funciones insertan datos que vienen de Supabase sin volver a
// encolarlos para subida. Usan INSERT OR IGNORE para no duplicar.

export async function addTicketSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    let productos = data.productos;
    if (typeof productos !== 'string') productos = JSON.stringify(productos || []);
    await database.execute(
        `INSERT OR IGNORE INTO tickets (id, numero_ticket, factura_id, productos, metodo_pago, cajero_id, turno, subtotal, impuesto, total, fecha_venta, creado_en, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'synced')`,
        [
            id,
            data.numero_ticket || '',
            data.factura_id || null,
            productos,
            data.metodo_pago || 'efectivo',
            data.cajero_id || data.usuario_id || null,
            data.turno || null,
            data.subtotal || 0,
            data.impuesto || 0,
            data.total || 0,
            data.fecha_venta || new Date().toISOString(),
            Date.now()
        ]
    );
    return id;
}

export async function addMovimientoSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT OR IGNORE INTO movimientos (id, producto_id, tipo, cantidad, precio_unitario, total, fecha_movimiento, usuario_id, referencia, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
            id, data.producto_id, data.tipo || 'salida', data.cantidad || 0,
            data.precio_unitario || 0, data.total || 0,
            data.fecha_movimiento || new Date().toISOString(),
            data.usuario_id || null, data.referencia || '', Date.now()
        ]
    );
    return id;
}

export async function addPagoSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT OR IGNORE INTO pagos (id, tipo, monto, descripcion, fecha, usuario_id, contacto_id, creado_en)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            id, data.tipo, data.monto || 0, data.descripcion || '',
            data.fecha || new Date().toISOString().split('T')[0],
            data.usuario_id || null, data.contacto_id || null, Date.now()
        ]
    );
    return id;
}

export async function addFacturaSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT OR IGNORE INTO facturas (id, contacto_id, numero_factura, tipo, subtotal, impuesto, total, estado, fecha_emision, fecha_vencimiento, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'synced')`,
        [
            id, data.contacto_id || null, data.numero_factura || '', data.tipo || 'factura',
            data.subtotal || 0, data.impuesto || 0, data.total || 0,
            data.estado || 'pendiente', data.fecha_emision || null, data.fecha_vencimiento || null
        ]
    );
    return id;
}

export async function addFacturaItemSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT OR IGNORE INTO factura_items (id, factura_id, producto_id, cantidad, precio_unitario, total, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'synced')`,
        [id, data.factura_id || null, data.producto_id || null, data.cantidad || 0, data.precio_unitario || 0, data.total || 0]
    );
    return id;
}

export async function addFacturaItemProveedorSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    await database.execute(
        `INSERT OR IGNORE INTO factura_items_proveedores (id, factura_proveedor_id, producto_id, cantidad, precio_unitario, subtotal, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, 'synced')`,
        [id, data.factura_proveedor_id || null, data.producto_id || null, data.cantidad || 0, data.precio_unitario || 0, data.subtotal || 0]
    );
    return id;
}

export async function addCajaSinSync(data) {
    const database = await getDB();
    const id = data.id || generarUUID();
    // Supabase usa nombres distintos; aceptamos ambos.
    const montoApertura = data.monto_apertura != null ? data.monto_apertura : (data.apertura_efectivo || 0);
    const montoCierre   = data.monto_cierre   != null ? data.monto_cierre   : (data.cierre_real ?? null);
    const saldoEsperado = data.saldo_esperado != null ? data.saldo_esperado : (data.cierre_esperado ?? null);
    const responsable   = data.responsable    != null ? data.responsable    : (data.usuario_id || null);
    await database.execute(
        `INSERT OR IGNORE INTO caja (id, fecha_apertura, fecha_cierre, monto_apertura, monto_cierre, saldo_esperado, diferencia, responsable, estado, sync_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'synced')`,
        [
            id, data.fecha_apertura || new Date().toISOString(), data.fecha_cierre || null,
            montoApertura, montoCierre, saldoEsperado, data.diferencia ?? null,
            responsable, data.estado || 'abierta'
        ]
    );
    return id;
}

// ¿La base local ya tiene datos de negocio? (para decidir si restaurar)
// Solo revisamos tablas transaccionales que el sync de fondo NO rellena
// (tickets, movimientos, pagos, facturas, caja). Así evitamos que la
// sincronización de catálogo (categorías/contactos/productos) engañe al detector.
export async function localTieneDatos() {
    const database = await getDB();
    const tablas = ['tickets', 'movimientos', 'pagos', 'facturas', 'facturas_proveedores', 'caja'];
    for (const t of tablas) {
        try {
            const rows = await database.select(`SELECT COUNT(*) as n FROM ${t}`);
            if (rows && rows[0] && Number(rows[0].n) > 0) return true;
        } catch (_) { /* tabla no existe */ }
    }
    return false;
}


// ===== CAJA (turnos persistentes) =====
export async function abrirCaja(montoApertura, responsable = 'dueño') {
    const database = await getDB();
    const id = generarUUID();
    const ahora = new Date().toISOString();
    await database.execute(
        `INSERT INTO caja (id, fecha_apertura, monto_apertura, responsable, estado)
         VALUES ($1, $2, $3, $4, 'abierta')`,
        [id, ahora, montoApertura || 0, responsable]
    );
    const idMovApertura = generarUUID();
    await database.execute(
        `INSERT INTO caja_movimientos (id, caja_id, tipo, monto, descripcion, fecha)
         VALUES ($1, $2, 'ingreso', $3, 'Apertura de caja', $4)`,
        [idMovApertura, id, montoApertura || 0, ahora]
    );
    await agregarSyncQueue('caja_movimientos', 'INSERT', idMovApertura, { id: idMovApertura, caja_id: id, tipo: 'ingreso', monto: montoApertura, descripcion: 'Apertura de caja', fecha: ahora });
    const syncData = { id, monto_apertura: montoApertura, responsable, fecha_apertura: ahora, estado: 'abierta' };
    if (typeof responsable === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(responsable)) {
        syncData.responsable = null
    }
    await agregarSyncQueue('caja', 'INSERT', id, syncData);
    return id;
}

export async function getCajaAbierta() {
    const database = await getDB();
    const rows = await database.select(
        `SELECT * FROM caja WHERE estado = 'abierta' ORDER BY fecha_apertura DESC LIMIT 1`
    );
    return rows && rows[0] ? rows[0] : null;
}

export async function getMovimientosCaja(cajaId) {
    const database = await getDB();
    return await database.select(
        `SELECT * FROM caja_movimientos WHERE caja_id = $1 ORDER BY fecha ASC`,
        [cajaId]
    );
}

export async function getCajas() {
    const database = await getDB();
    return await database.select('SELECT * FROM caja ORDER BY fecha_apertura DESC');
}

export async function addMovimientoCaja(cajaId, tipo, monto, descripcion) {
    const database = await getDB();
    const id = generarUUID();
    const ahora = new Date().toISOString();
    await database.execute(
        `INSERT INTO caja_movimientos (id, caja_id, tipo, monto, descripcion, fecha)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, cajaId, tipo, monto || 0, descripcion || '', ahora]
    );
    await agregarSyncQueue('caja_movimientos', 'INSERT', id, { caja_id: cajaId, tipo, monto, descripcion, fecha: ahora });
    return id;
}

export async function cerrarCaja(cajaId, montoCierre, saldoEsperado) {
    const database = await getDB();
    await database.execute(
        `UPDATE caja SET estado = 'cerrada', fecha_cierre = $1, monto_cierre = $2, saldo_esperado = $3 WHERE id = $4`,
        [new Date().toISOString(), montoCierre || 0, saldoEsperado || 0, cajaId]
    );
    await agregarSyncQueue('caja', 'UPDATE', cajaId, { id: cajaId, estado: 'cerrada', monto_cierre: montoCierre, saldo_esperado: saldoEsperado, fecha_cierre: new Date().toISOString() });
}
