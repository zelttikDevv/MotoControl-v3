let ventasData = [];
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    inicializarMenuMovil();
    await cargarDatos();
});

function inicializarMenuMovil() {
    const menuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
}

async function cargarDatos() {
    Utils.mostrarLoader('Cargando datos del dashboard...');
    
    try {
        const cacheKey = 'dashboard_ventas';
        let datos = Cache.get(cacheKey);
        
        if (!datos) {
            datos = await API.obtenerVentas();
            Cache.set(cacheKey, datos);
        }
        
        ventasData = datos;
        
        if (ventasData.length === 0) {
            mostrarEstadoVacio();
            return;
        }
        
        calcularKPIs();
        crearGraficas();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        Utils.mostrarNotificacion('Error al cargar los datos del dashboard', 'error');
    } finally {
        Utils.ocultarLoader();
    }
}

function mostrarEstadoVacio() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <header class="page-header fade-in">
            <h1 class="page-title">Dashboard Ejecutivo</h1>
            <p class="page-subtitle">Resumen general de ventas de motocicletas</p>
        </header>
        <div class="empty-state fade-in">
            <div class="empty-state-icon">📊</div>
            <p class="empty-state-text">No hay ventas registradas aún</p>
            <p style="margin-top: 1rem; color: var(--texto-terciario);">
                Comience registrando su primera venta en la sección "Registrar Venta"
            </p>
            <a href="captura.html" class="btn btn-primary" style="margin-top: 2rem;">
                ➕ Registrar Primera Venta
            </a>
        </div>
    `;
}

function calcularKPIs() {
    const totalVentas = ventasData.length;
    document.getElementById('kpiTotalVentas').textContent = Utils.formatearNumero(totalVentas);

    const totalMotocicletas = totalVentas;
    document.getElementById('kpiMotocicletas').textContent = Utils.formatearNumero(totalMotocicletas);

    const totalConIVA = Utils.sumar(ventasData, 'PrecioConIVA');
    document.getElementById('kpiTotalIVA').textContent = Utils.formatearMoneda(totalConIVA);

    const totalSinIVA = Utils.sumar(ventasData, 'PrecioSinIVA');
    document.getElementById('kpiTotalSinIVA').textContent = Utils.formatearMoneda(totalSinIVA);

    const ticketPromedio = totalVentas > 0 ? totalConIVA / totalVentas : 0;
    document.getElementById('kpiTicketPromedio').textContent = Utils.formatearMoneda(ticketPromedio);

    const marcaTop = Utils.masFrecuente(ventasData, 'Marca');
    const ventasMarcaTop = ventasData.filter(v => v.Marca === marcaTop).length;
    document.getElementById('kpiMarcaTop').textContent = marcaTop || '-';
    document.getElementById('kpiMarcaTopVentas').textContent = `${ventasMarcaTop} ventas`;

    const modeloTop = Utils.masFrecuente(ventasData, 'Modelo');
    const ventasModeloTop = ventasData.filter(v => v.Modelo === modeloTop).length;
    document.getElementById('kpiModeloTop').textContent = modeloTop || '-';
    document.getElementById('kpiModeloTopVentas').textContent = `${ventasModeloTop} ventas`;

    const cilindrajeTop = Utils.masFrecuente(ventasData, 'Cilindraje');
    const ventasCilindrajeTop = ventasData.filter(v => v.Cilindraje == cilindrajeTop).length;
    document.getElementById('kpiCilindrajeTop').textContent = cilindrajeTop ? `${cilindrajeTop}cc` : '-';
    document.getElementById('kpiCilindrajeTopVentas').textContent = `${ventasCilindrajeTop} ventas`;

    calcularTendencias();
}

function calcularTendencias() {
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();
    
    const ventasMesActual = ventasData.filter(v => {
        const fecha = new Date(v.FechaVenta);
        return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
    });
    
    const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
    const añoAnterior = mesActual === 0 ? añoActual - 1 : añoActual;
    
    const ventasMesAnterior = ventasData.filter(v => {
        const fecha = new Date(v.FechaVenta);
        return fecha.getMonth() === mesAnterior && fecha.getFullYear() === añoAnterior;
    });
    
    const totalActual = ventasMesActual.length;
    const totalAnterior = ventasMesAnterior.length;
    
    const variacion = Utils.calcularVariacion(totalActual, totalAnterior);
    const esPositivo = variacion >= 0;
    
    const trendElements = document.querySelectorAll('.kpi-trend .trend-up, .kpi-trend .trend-down');
    trendElements.forEach(el => {
        el.className = esPositivo ? 'trend-up' : 'trend-down';
        el.textContent = `${esPositivo ? '↑' : '↓'} ${Math.abs(variacion)}%`;
    });
}

function crearGraficas() {
    crearGraficaVentasSemanales();
    crearGraficaDistribucionMarca();
    crearGraficaDistribucionCilindraje();
    crearGraficaIngresos();
}

function crearGraficaVentasSemanales() {
    const ctx = document.getElementById('chartVentasSemanales');
    if (!ctx) return;

    const ventasPorSemana = {};
    ventasData.forEach(venta => {
        const fecha = new Date(venta.FechaVenta);
        const semana = Utils.obtenerSemana(fecha);
        const año = fecha.getFullYear();
        const key = `${año}-S${semana}`;
        
        if (!ventasPorSemana[key]) {
            ventasPorSemana[key] = 0;
        }
        ventasPorSemana[key]++;
    });

    const labels = Object.keys(ventasPorSemana).sort();
    const data = labels.map(label => ventasPorSemana[label]);

    if (charts.ventasSemanales) {
        charts.ventasSemanales.destroy();
    }

    charts.ventasSemanales = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas por Semana',
                data: data,
                borderColor: CONFIG.COLORES.primario,
                backgroundColor: `${CONFIG.COLORES.primario}33`,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            ...CONFIG.CHART_OPTIONS,
            plugins: {
                ...CONFIG.CHART_OPTIONS.plugins,
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

function crearGraficaDistribucionMarca() {
    const ctx = document.getElementById('chartDistribucionMarca');
    if (!ctx) return;

    const ventasPorMarca = {};
    ventasData.forEach(venta => {
        const marca = venta.Marca;
        if (!ventasPorMarca[marca]) {
            ventasPorMarca[marca] = 0;
        }
        ventasPorMarca[marca]++;
    });

    const labels = Object.keys(ventasPorMarca);
    const data = Object.values(ventasPorMarca);

    if (charts.distribucionMarca) {
        charts.distribucionMarca.destroy();
    }

    charts.distribucionMarca = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: CONFIG.COLORES.colores,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#e5e7eb',
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(2);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function crearGraficaDistribucionCilindraje() {
    const ctx = document.getElementById('chartDistribucionCilindraje');
    if (!ctx) return;

    const ventasPorCilindraje = {};
    ventasData.forEach(venta => {
        let cilindraje = venta.Cilindraje;
        
        if (!CONFIG.CILINDRAJES.includes(parseInt(cilindraje))) {
            cilindraje = 'Otros';
        }
        
        if (!ventasPorCilindraje[cilindraje]) {
            ventasPorCilindraje[cilindraje] = 0;
        }
        ventasPorCilindraje[cilindraje]++;
    });

    const labels = Object.keys(ventasPorCilindraje).sort((a, b) => {
        if (a === 'Otros') return 1;
        if (b === 'Otros') return -1;
        return parseInt(a) - parseInt(b);
    });
    const data = labels.map(label => ventasPorCilindraje[label]);

    if (charts.distribucionCilindraje) {
        charts.distribucionCilindraje.destroy();
    }

    charts.distribucionCilindraje = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels.map(l => l === 'Otros' ? l : `${l}cc`),
            datasets: [{
                data: data,
                backgroundColor: CONFIG.COLORES.azul,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: '#e5e7eb',
                        padding: 15
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(2);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function crearGraficaIngresos() {
    const ctx = document.getElementById('chartIngresos');
    if (!ctx) return;

    const totalConIVA = Utils.sumar(ventasData, 'PrecioConIVA');
    const totalSinIVA = Utils.sumar(ventasData, 'PrecioSinIVA');

    if (charts.ingresos) {
        charts.ingresos.destroy();
    }

    charts.ingresos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Con IVA', 'Sin IVA'],
            datasets: [{
                label: 'Ingresos',
                data: [totalConIVA, totalSinIVA],
                backgroundColor: [CONFIG.COLORES.primario, CONFIG.COLORES.secundario],
                borderRadius: 8
            }]
        },
        options: {
            ...CONFIG.CHART_OPTIONS,
            plugins: {
                ...CONFIG.CHART_OPTIONS.plugins,
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return Utils.formatearMoneda(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                ...CONFIG.CHART_OPTIONS.scales,
                y: {
                    ...CONFIG.CHART_OPTIONS.scales.y,
                    ticks: {
                        ...CONFIG.CHART_OPTIONS.scales.y.ticks,
                        callback: function(value) {
                            return Utils.formatearMoneda(value);
                        }
                    }
                }
            }
        }
    });
    }
