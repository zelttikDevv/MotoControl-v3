const API = {
    async obtenerVentas() {
        try {
            // SIN HEADERS - esto evita el preflight CORS
            const response = await fetch(`${CONFIG.API_URL}?action=getVentas`);

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message || 'Error al obtener las ventas');
            }

            return data.data || [];
        } catch (error) {
            console.error('Error en obtenerVentas:', error);
            Utils.mostrarNotificacion('Error al cargar las ventas: ' + error.message, 'error');
            throw error;
        }
    },

    async registrarVenta(venta) {
        try {
            if (!Utils.validarSKU(venta.sku)) {
                throw new Error('SKU inválido');
            }
            if (!Utils.validarPrecio(venta.precioConIVA)) {
                throw new Error('Precio inválido');
            }
            if (!Utils.validarFecha(venta.fechaVenta)) {
                throw new Error('Fecha de venta inválida');
            }
            if (!Utils.validarMarca(venta.marca)) {
                throw new Error('Marca no permitida');
            }

            const precioSinIVA = Utils.calcularPrecioSinIVA(parseFloat(venta.precioConIVA));

            const dataToSend = {
                action: 'postVenta',
                sku: Utils.sanitizar(venta.sku.trim()),
                marca: Utils.sanitizar(venta.marca),
                modelo: Utils.sanitizar(venta.modelo.trim()),
                cilindraje: parseInt(venta.cilindraje),
                factura: Utils.sanitizar(venta.factura.trim()),
                seguro: Utils.sanitizar(venta.seguro),
                precioConIVA: parseFloat(venta.precioConIVA),
                precioSinIVA: precioSinIVA,
                cliente: Utils.sanitizar(venta.cliente.trim()),
                fechaVenta: venta.fechaVenta
            };

            // SIN HEADERS - esto evita el preflight CORS
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.message || 'Error al registrar la venta');
            }

            return result;
        } catch (error) {
            console.error('Error en registrarVenta:', error);
            Utils.mostrarNotificacion('Error al registrar la venta: ' + error.message, 'error');
            throw error;
        }
    }
};

const Cache = {
    _cache: new Map(),
    _tiempoExpiracion: 5 * 60 * 1000,

    set(key, data) {
        this._cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    },

    get(key) {
        const cached = this._cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this._tiempoExpiracion) {
            this._cache.delete(key);
            return null;
        }
        
        return cached.data;
    },

    clear() {
        this._cache.clear();
    }
};
