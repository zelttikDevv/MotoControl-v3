const Utils = {
    formatearMoneda: (valor) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(valor);
    },

    formatearNumero: (valor) => {
        return new Intl.NumberFormat('es-MX').format(valor);
    },

    calcularPrecioSinIVA: (precioConIVA) => {
        return precioConIVA / CONFIG.IVA_FACTOR;
    },

    formatearFecha: (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    formatearFechaCorta: (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleDateString('es-MX');
    },

    obtenerSemana: (fecha) => {
        const date = new Date(fecha);
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const days = Math.floor((date - startOfYear) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + startOfYear.getDay() + 1) / 7);
    },

    sanitizar: (texto) => {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    },

    validarSKU: (sku) => {
        return sku && sku.trim().length > 0;
    },

    validarPrecio: (precio) => {
        const num = parseFloat(precio);
        return !isNaN(num) && num > 0;
    },

    validarFecha: (fecha) => {
        const date = new Date(fecha);
        return date instanceof Date && !isNaN(date);
    },

    validarMarca: (marca) => {
        return CONFIG.MARCAS.includes(marca);
    },

    mostrarNotificacion: (mensaje, tipo = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${tipo}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${tipo === 'success' ? '✓' : tipo === 'error' ? '✗' : 'ℹ'}</span>
                <span class="toast-message">${Utils.sanitizar(mensaje)}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    mostrarLoader: (mensaje = 'Cargando...') => {
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.className = 'loader-overlay';
            document.body.appendChild(loader);
        }
        
        loader.innerHTML = `
            <div class="loader-content">
                <div class="spinner"></div>
                <p>${Utils.sanitizar(mensaje)}</p>
            </div>
        `;
        loader.style.display = 'flex';
    },

    ocultarLoader: () => {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    },

    sumar: (array, propiedad) => {
        return array.reduce((sum, item) => sum + (item[propiedad] || 0), 0);
    },

    masFrecuente: (array, propiedad) => {
        const conteo = {};
        array.forEach(item => {
            const valor = item[propiedad];
            conteo[valor] = (conteo[valor] || 0) + 1;
        });
        
        return Object.keys(conteo).reduce((a, b) => 
            conteo[a] > conteo[b] ? a : b
        );
    },

    calcularVariacion: (actual, anterior) => {
        if (anterior === 0) return actual > 0 ? 100 : 0;
        return ((actual - anterior) / anterior * 100).toFixed(2);
    },

    exportarCSV: (datos, nombreArchivo = 'ventas.csv') => {
        if (!datos || datos.length === 0) {
            Utils.mostrarNotificacion('No hay datos para exportar', 'error');
            return;
        }

        const encabezados = Object.keys(datos[0]);
        const csvContent = [
            encabezados.join(','),
            ...datos.map(row => 
                encabezados.map(header => {
                    let cell = row[header] || '';
                    cell = cell.toString().replace(/"/g, '""');
                    if (cell.search(/("|,|\n)/g) >= 0) {
                        cell = `"${cell}"`;
                    }
                    return cell;
                }).join(',')
            )
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', nombreArchivo);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Utils.mostrarNotificacion('Datos exportados correctamente', 'success');
    },

    obtenerFechaHoy: () => {
        const hoy = new Date();
        const año = hoy.getFullYear();
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const dia = String(hoy.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    },

    obtenerFechaAnterior: (dias) => {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - dias);
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
    }
};
