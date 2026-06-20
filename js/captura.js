let formVenta;
let precioConIVAInput;
let precioSinIVAInput;

document.addEventListener('DOMContentLoaded', () => {
    inicializarMenuMovil();
    inicializarFormulario();
    cargarMarcas();
    configurarFechaMaxima();
});

function inicializarMenuMovil() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (menuBtn && sidebar) {
        let overlay = document.querySelector('.sidebar-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'sidebar-overlay';
            document.body.appendChild(overlay);
        }
        
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
        
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        });
        
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            }
        });
    }
}

function inicializarFormulario() {
    formVenta = document.getElementById('formVenta');
    precioConIVAInput = document.getElementById('precioConIVA');
    precioSinIVAInput = document.getElementById('precioSinIVA');

    precioConIVAInput.addEventListener('input', calcularPrecioSinIVA);

    formVenta.addEventListener('submit', manejarEnvioFormulario);

    const btnLimpiar = document.getElementById('btnLimpiar');
    if (btnLimpiar) {
        btnLimpiar.addEventListener('click', limpiarFormulario);
    }

    const fechaVentaInput = document.getElementById('fechaVenta');
    if (fechaVentaInput) {
        fechaVentaInput.value = Utils.obtenerFechaHoy();
    }
}

function cargarMarcas() {
    const marcaSelect = document.getElementById('marca');
    if (!marcaSelect) return;

    CONFIG.MARCAS.forEach(marca => {
        const option = document.createElement('option');
        option.value = marca;
        option.textContent = marca;
        marcaSelect.appendChild(option);
    });
}

function configurarFechaMaxima() {
    const fechaVentaInput = document.getElementById('fechaVenta');
    if (fechaVentaInput) {
        fechaVentaInput.max = Utils.obtenerFechaHoy();
    }
}

function calcularPrecioSinIVA() {
    const precioConIVA = parseFloat(precioConIVAInput.value);
    
    if (!isNaN(precioConIVA) && precioConIVA > 0) {
        const precioSinIVA = Utils.calcularPrecioSinIVA(precioConIVA);
        precioSinIVAInput.value = Utils.formatearMoneda(precioSinIVA);
    } else {
        precioSinIVAInput.value = '';
    }
}

async function manejarEnvioFormulario(event) {
    event.preventDefault();

    if (!validarFormulario()) {
        return;
    }

    const factura = document.getElementById('factura').value.trim();
    
    Utils.mostrarLoader('Verificando factura...');
    
    try {
        const response = await fetch(`${CONFIG.API_URL}?action=checkFactura&factura=${encodeURIComponent(factura)}`);
        const data = await response.json();
        
        if (data.existe) {
            Utils.ocultarLoader();
            Utils.mostrarNotificacion(`❌ La factura "${factura}" ya está registrada`, 'error');
            return;
        }
    } catch (error) {
        Utils.ocultarLoader();
        Utils.mostrarNotificacion('Error al verificar la factura', 'error');
        return;
    }

    const datosVenta = {
        sku: document.getElementById('sku').value,
        marca: document.getElementById('marca').value,
        modelo: document.getElementById('modelo').value,
        cilindraje: document.getElementById('cilindraje').value,
        factura: factura,
        seguro: document.getElementById('seguro').value,
        precioConIVA: document.getElementById('precioConIVA').value,
        cliente: document.getElementById('cliente').value,
        fechaVenta: document.getElementById('fechaVenta').value
    };

    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '⏳ Guardando...';

    try {
        Utils.mostrarLoader('Registrando venta...');
        
        const resultado = await API.registrarVenta(datosVenta);
        
        Utils.mostrarNotificacion('Venta registrada exitosamente', 'success');
        
        Cache.clear();
        
        limpiarFormulario();
        
        setTimeout(() => {
            if (confirm('¿Desea registrar otra venta?')) {
                document.getElementById('sku').focus();
            } else {
                window.location.href = 'index.html';
            }
        }, 1000);
        
    } catch (error) {
        console.error('Error al registrar venta:', error);
        Utils.mostrarNotificacion('Error al registrar la venta: ' + error.message, 'error');
    } finally {
        Utils.ocultarLoader();
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = '💾 Guardar Venta';
    }
}

function validarFormulario() {
    let esValido = true;
    const campos = formVenta.querySelectorAll('[required]');

    campos.forEach(campo => {
        if (!campo.checkValidity()) {
            esValido = false;
            campo.classList.add('invalid');
        } else {
            campo.classList.remove('invalid');
        }
    });

    const sku = document.getElementById('sku').value.trim();
    if (!Utils.validarSKU(sku)) {
        Utils.mostrarNotificacion('El SKU es inválido', 'error');
        esValido = false;
    }

    const precio = parseFloat(document.getElementById('precioConIVA').value);
    if (!Utils.validarPrecio(precio)) {
        Utils.mostrarNotificacion('El precio debe ser mayor a 0', 'error');
        esValido = false;
    }

    const marca = document.getElementById('marca').value;
    if (!Utils.validarMarca(marca)) {
        Utils.mostrarNotificacion('Seleccione una marca válida del catálogo', 'error');
        esValido = false;
    }

    const fechaVenta = document.getElementById('fechaVenta').value;
    if (!Utils.validarFecha(fechaVenta)) {
        Utils.mostrarNotificacion('La fecha de venta es inválida', 'error');
        esValido = false;
    }

    const fechaIngresada = new Date(fechaVenta);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    
    if (fechaIngresada > hoy) {
        Utils.mostrarNotificacion('La fecha de venta no puede ser futura', 'error');
        esValido = false;
    }

    if (!esValido) {
        Utils.mostrarNotificacion('Por favor corrija los errores en el formulario', 'error');
    }

    return esValido;
}

function limpiarFormulario() {
    formVenta.reset();
    precioSinIVAInput.value = '';
    
    document.getElementById('fechaVenta').value = Utils.obtenerFechaHoy();
    
    const campos = formVenta.querySelectorAll('.invalid');
    campos.forEach(campo => campo.classList.remove('invalid'));
    
    Utils.mostrarNotificacion('Formulario limpiado', 'info');
}

document.addEventListener('input', (e) => {
    if (e.target.matches('.form-input, .form-select')) {
        if (e.target.checkValidity()) {
            e.target.classList.remove('invalid');
        }
    }
});
