let ventasData = [];
let ventasFiltradas = [];
let charts = {};

document.addEventListener('DOMContentLoaded', async () => {
    inicializarMenuMovil();
    inicializarFiltros();
    await cargarDatos();
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

function inicializarFiltros() {
    const filtroMarca = document.getElementById('filtroMarca');
    if (filtroMarca) {
        CONFIG.MARCAS.forEach(marca => {
            const option = document.createElement('option');
            option.value = marca;
            option.textContent = marca;
            filtroMarca.appendChild(option);
        });
    }

    const fechaInicio = document.getElementById('filtroFechaInicio');
    const fechaFin = document.getElementById('filtroFechaFin');
    
    if (fechaInicio && fechaFin) {
        fechaFin.value = Utils.obtenerFechaHoy();
        fechaInicio.value = Utils.obtenerFechaAnterior(30);
    }

    document.getElementById('btnAplicarFiltros')?.addEventListener('click', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros')?.addEventListener('click', limpiarFiltros);
    document.getElementById('btnExportar')?.addEventListener('click', exportarDatos);
    document.getElementById('btnVerTabla')?.addEventListener('click', mostrarTablaCompleta);
}

async function cargarDatos() {
    Utils.mostrarLoader('Cargando datos de análisis...');
    
    try {
        const cacheKey = 'analisis_ventas';
        let datos = Cache.get(cacheKey);
        
        if (!datos) {
            datos = await API.obtenerVentas();
            Cache.set(cacheKey, datos);
        }
        
        ventasData = datos;
        ventasFiltradas = [...ventasData];
        
        if (ventasData.length === 0) {
            mostrarEstadoVacio();
            return;
        }
        
        actualizarAnalisis();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        Utils.mostrarNotificacion('Error al cargar los datos', 'error');
    } finally {
        Utils.ocultarLoader();
    }
}

function mostrarEstadoVacio() {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = `
        <header class="page-header fade-in">
            <h1 class="page-title">Análisis Avanzado</h1>
            <p class="page-subtitle">Análisis detallado del comportamiento comercial</p>
        </header>
        <div class="empty-state fade-in">
            <div class="empty-state-icon">📈</div>
            <p class="empty-state-text">No hay datos disponibles para analizar</p>
            <p style="margin-top: 1rem; color: var(--texto-terciario);">
                Registre ventas para ver el análisis detallado
            </p>
            <a href="captura.html" class="btn btn-primary" style="margin-top: 2rem;">
                ➕ Registrar Venta
            </a>
        </div>
    `;
}

function aplicarFiltros() {
    const fechaInicio = document.getElementById('filtroFechaInicio').value;
    const fechaFin = document.getElementById('filtroFechaFin').value;
    const marca = document.getElementById('filtroMarca').value;
    const modelo = document.getElementById('filtroModelo').value.toLowerCase().trim();
    const cilindraje = document.getElementById('filtroCilindraje').value.trim();

    ventasFiltradas = ventasData.filter(venta => {
        if (fechaInicio && new Date(venta.FechaVenta) < new Date(fechaInicio)) return false;
        if (fechaFin && new Date(venta.FechaVenta) > new Date(fechaFin)) return false;
        if (marca && venta.Marca !== marca) return false;
        if (modelo && !venta.Modelo.toLowerCase().includes(modelo)) return false;
        
        if (cilindraje) {
            const cilindrajeFiltro = parseInt(cilindraje);
            const cilindrajeVenta = parseInt(venta.Cilindraje);
            if (!isNaN(cilindrajeFiltro) && !isNaN(cilindrajeVenta)) {
                if (Math.abs(cilindrajeVenta - cilindrajeFiltro) > 10) {
                    return false;
                }
            }
        }
        
        return true;
    });

    Utils.mostrarNotificacion(`Filtros aplicados: ${ventasFiltradas.length} registros encontrados`, 'success');
    actualizarAnalisis();
}

function limpiarFiltros() {
    document.getElementById('filtroFechaInicio').value = Utils.obtenerFechaAnterior(30);
    document.getElementById('filtroFechaFin').value = Utils.obtenerFechaHoy();
    document.getElementById('filtroMarca').value = '';
    document.getElementById('filtroModelo').value = '';
    document.getElementById('filtroCilindraje').value = '';
    
    ventasFiltradas = [...ventasData];
    
    Utils.mostrarNotificacion('Filtros limpiados', 'info');
    actualizarAnalisis();
}

function exportarDatos() {
    if (ventasFiltradas.length === 0) {
        Utils.mostrarNotificacion('No hay datos para exportar', 'error');
        return;
    }

    const datosExportar = ventasFiltradas.map(v => ({
        ID: v.ID,
        SKU: v.SKU,
        Marca: v.Marca,
        Modelo: v.Modelo,
        Cilindraje: v.Cilindraje,
        PrecioConIVA: v.PrecioConIVA,
        PrecioSinIVA: v.PrecioSinIVA,
        Cliente: v.Cliente,
        FechaVenta: v.FechaVenta
    }));

    Utils.exportarCSV(datosExportar, `ventas_${Utils.obtenerFechaHoy()}.csv`);
}

function actualizarAnalisis() {
    calcularMetricasAvanzadas();
    crearTodasLasGraficas();
    crearRanking();
}

function calcularMetricasAvanzadas() {
    const marcaFiltro = document.getElementById('filtroMarca').value;
    if (marcaFiltro) {
        const ventasMarca = ventasFiltradas.filter(v => v.Marca === marcaFiltro);
        const totalMarca = Utils.sumar(ventasMarca, 'PrecioConIVA');
        const ticketPromedio = ventasMarca.length > 0 ? totalMarca / ventasMarca.length : 0;
        
        document.getElementById('metricTicketMarca').textContent = Utils.formatearMoneda(ticketPromedio);
        document.getElementById('metricTicketMarcaDetalle').textContent = `${marcaFiltro}: ${ventasMarca.length} ventas`;
    } else {
        const ticketPromedio = ventasFiltradas.length > 0 
            ? Utils.sumar(ventasFiltradas, 'PrecioConIVA') / ventasFiltradas.length 
            : 0;
        document.getElementById('metricTicketMarca').textContent = Utils.formatearMoneda(ticketPromedio);
        document.getElementById('metricTicketMarcaDetalle').textContent = 'Promedio general';
    }

    const hoy = new Date();
    const semanaActual = Utils.obtenerSemana(hoy);
    const semanaAnterior = semanaActual - 1;
    
    const ventasSemanaActual = ventasFiltradas.filter(v => 
        Utils.obtenerSemana(new Date(v.FechaVenta)) === semanaActual
    );
    
    const ventasSemanaAnterior = ventasFiltradas.filter(v => 
        Utils.obtenerSemana(new Date(v.FechaVenta)) === semanaAnterior
    );
    
    const crecimiento = Utils.calcularVariacion(
        ventasSemanaActual.length,
        ventasSemanaAnterior.length
    );
    
    const metricCrecimiento = document.getElementById('metricCrecimiento');
    const metricCrecimientoDetalle = document.getElementById('metricCrecimientoDetalle');
    
    metricCrecimiento.textContent = `${crecimiento >= 0 ? '+' : ''}${crecimiento}%`;
    metricCrecimiento.style.color = crecimiento >= 0 ? 'var(--color-exito)' : 'var(--color-peligro)';
    metricCrecimientoDetalle.textContent = `${ventasSemanaActual.length} vs ${ventasSemanaAnterior.length} ventas`;

    const ventasPorMarca = {};
    ventasFiltradas.forEach(v => {
        ventasPorMarca[v.Marca] = (ventasPorMarca[v.Marca] || 0) + 1;
    });
    
    const top3Marcas = Object.entries(ventasPorMarca)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    const participacionTop3 = top3Marcas.reduce((sum, [, count]) => sum + count, 0);
    const porcentajeParticipacion = ventasFiltradas.length > 0 
        ? (participacionTop3 / ventasFiltradas.length * 100).toFixed(2)
        : 0;
    
    document.getElementById('metricParticipacion').textContent = `${porcentajeParticipacion}%`;
    document.getElementById('metricParticipacionDetalle').textContent = 
        `Top 3: ${top3Marcas.map(([marca]) => marca).join(', ')}`;

    const diasTranscurridos = new Date().getDate();
    const totalMes = Utils.sumar(ventasFiltradas.filter(v => {
        const fecha = new Date(v.FechaVenta);
        return fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
    }), 'PrecioConIVA');
    
    const proyeccion = diasTranscurridos > 0 ? (totalMes / diasTranscurridos) * 30 : 0;
    document.getElementById('metricProyeccion').textContent = Utils.formatearMoneda(proyeccion);
    document.getElementById('metricProyeccionDetalle').textContent = 
        `Basado en ${diasTranscurridos} días del mes`;
}

function crearTodasLasGraficas() {
    crearGraficaTopModelos();
    crearGraficaTopMarcas();
    crearGraficaVentasMes();
    crearGraficaIngresosMarca();
    crearGraficaIngresosMarcaSinIVA();
    crearGraficaParticipacionCilindraje();
    crearGraficaTendenciaComercial();
}function crearGraficaTopModelos() {
    const ctx = document.getElementById('chartTopModelos');
    if (!ctx) return;

    const ventasPorModelo = {};
    ventasFiltradas.forEach(v => {
        ventasPorModelo[v.Modelo] = (ventasPorModelo[v.Modelo] || 0) + 1;
    });

    const top10 = Object.entries(ventasPorModelo)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    if (charts.topModelos) charts.topModelos.destroy();

    charts.topModelos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: top10.map(([modelo]) => modelo),
            datasets: [{
                label: 'Ventas',
                data: top10.map(([, count]) => count),
                backgroundColor: CONFIG.COLORES.primario,
                borderRadius: 8
            }]
        },
        options: {
            ...CONFIG.CHART_OPTIONS,
            indexAxis: 'y',
            plugins: {
                ...CONFIG.CHART_OPTIONS.plugins,
                legend: { display: false }
            }
        }
    });
}

function crearGraficaTopMarcas() {
    const ctx = document.getElementById('chartTopMarcas');
    if (!ctx) return;

    const ventasPorMarca = {};
    ventasFiltradas.forEach(v => {
        ventasPorMarca[v.Marca] = (ventasPorMarca[v.Marca] || 0) + 1;
    });

    const ordenado = Object.entries(ventasPorMarca)
        .sort((a, b) => b[1] - a[1]);

    if (charts.topMarcas) charts.topMarcas.destroy();

    charts.topMarcas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ordenado.map(([marca]) => marca),
            datasets: [{
                label: 'Ventas',
                data: ordenado.map(([, count]) => count),
                backgroundColor: CONFIG.COLORES.colores,
                borderRadius: 8
            }]
        },
        options: {
            ...CONFIG.CHART_OPTIONS,
            plugins: {
                ...CONFIG.CHART_OPTIONS.plugins,
                legend: { display: false }
            }
        }
    });
}

function crearGraficaVentasMes() {
    const ctx = document.getElementById('chartVentasMes');
    if (!ctx) return;

    const ventasPorMes = {};
    ventasFiltradas.forEach(v => {
        const fecha = new Date(v.FechaVenta);
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
        ventasPorMes[key] = (ventasPorMes[key] || 0) + 1;
    });

    const labels = Object.keys(ventasPorMes).sort();
    const data = labels.map(key => ventasPorMes[key]);

    if (charts.ventasMes) charts.ventasMes.destroy();

    charts.ventasMes = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ventas',
                data: data,
                borderColor: CONFIG.COLORES.primario,
                backgroundColor: `${CONFIG.COLORES.primario}33`,
                tension: 0.4,
                fill: true
            }]
        },
        options: CONFIG.CHART_OPTIONS
    });
}

function crearGraficaIngresosMarca() {
    const ctx = document.getElementById('chartIngresosMarca');
    if (!ctx) return;

    const ingresosPorMarca = {};
    ventasFiltradas.forEach(v => {
        ingresosPorMarca[v.Marca] = (ingresosPorMarca[v.Marca] || 0) + v.PrecioConIVA;
    });

    const ordenado = Object.entries(ingresosPorMarca)
        .sort((a, b) => b[1] - a[1]);

    if (charts.ingresosMarca) charts.ingresosMarca.destroy();

    charts.ingresosMarca = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ordenado.map(([marca]) => marca),
            datasets: [{
                label: 'Ingresos con IVA',
                data: ordenado.map(([, total]) => total),
                backgroundColor: CONFIG.COLORES.colores,
                borderRadius: 8
            }]
        },
        options: {
            ...CONFIG.CHART_OPTIONS,
            indexAxis: 'y',
            plugins: {
                ...CONFIG.CHART_OPTIONS.plugins,
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => Utils.formatearMoneda(context.parsed.x)
                    }
                }
            },
            scales: {
                ...CONFIG.CHART_OPTIONS.scales,
                x: {
                    ...CONFIG.CHART_OPTIONS.scales.x,
                    ticks: {
                        ...CONFIG.CHART_OPTIONS.scales.x.ticks,
                        callback: (value) => Utils.formatearMoneda(value)
                    }
                }
            }
        }
    });
}

function crearGraficaIngresosMarcaSinIVA() {
    const ctx = document.getElementById('chartIngresosMarcaSinIVA');
    if (!ctx) return;

    const ingresosPorMarca = {};
    ventasFiltradas.forEach(v => {
        ingresosPorMarca[v.Marca] = (ingresosPorMarca[v.Marca] || 0) + v.PrecioSinIVA;
    });

    const ordenado = Object.entries(ingresosPorMarca)
        .sort((a, b) => b[1] - a[1]);

    if (charts.ingresosMarcaSinIVA) charts.ingresosMarcaSinIVA.destroy();

    charts.ingresosMarcaSinIVA = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ordenado.map(([marca]) => marca),
            datasets: [{
                label: 'Ingresos sin IVA',
                data: ordenado.map(([, total]) => total),
                backgroundColor: CONFIG.COLORES.colores,
                borderRadius: 8
            }]
        },
        options: {
            ...CONFIG.CHART_OPTIONS,
            indexAxis: 'y',
            plugins: {
                ...CONFIG.CHART_OPTIONS.plugins,
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => Utils.formatearMoneda(context.parsed.x)
                    }
                }
            },
            scales: {
                ...CONFIG.CHART_OPTIONS.scales,
                x: {
                    ...CONFIG.CHART_OPTIONS.scales.x,
                    ticks: {
                        ...CONFIG.CHART_OPTIONS.scales.x.ticks,
                        callback: (value) => Utils.formatearMoneda(value)
                    }
                }
            }
        }
    });
}

function crearGraficaParticipacionCilindraje() {
    const ctx = document.getElementById('chartParticipacionCilindraje');
    if (!ctx) return;

    const ventasPorCilindraje = {};
    ventasFiltradas.forEach(v => {
        let cilindraje = v.Cilindraje;
        if (!CONFIG.CILINDRAJES.includes(parseInt(cilindraje))) {
            cilindraje = 'Otros';
        }
        ventasPorCilindraje[cilindraje] = (ventasPorCilindraje[cilindraje] || 0) + 1;
    });

    const labels = Object.keys(ventasPorCilindraje).sort((a, b) => {
        if (a === 'Otros') return 1;
        if (b === 'Otros') return -1;
        return parseInt(a) - parseInt(b);
    });
    const data = labels.map(l => ventasPorCilindraje[l]);

    if (charts.participacionCilindraje) charts.participacionCilindraje.destroy();

    charts.participacionCilindraje = new Chart(ctx, {
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
                    labels: { color: '#e5e7eb', padding: 15 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(2);
                            return `${context.label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function crearGraficaTendenciaComercial() {
    const ctx = document.getElementById('chartTendenciaComercial');
    if (!ctx) return;

    const hoy = new Date();
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    const inicioSemanaActual = new Date(hoy);
    inicioSemanaActual.setDate(hoy.getDate() - hoy.getDay());
    
    const datosSemanaActual = [];
    const datosSemanaAnterior = [];
    const labels = [];
    
    for (let i = 0; i < 7; i++) {
        const fechaActual = new Date(inicioSemanaActual);
        fechaActual.setDate(inicioSemanaActual.getDate() + i);
        
        const fechaAnterior = new Date(fechaActual);
        fechaAnterior.setDate(fechaActual.getDate() - 7);
        
        labels.push(dias[fechaActual.getDay()]);
        
        const ventasHoy = ventasFiltradas.filter(v => {
            const fecha = new Date(v.FechaVenta);
            return fecha.toDateString() === fechaActual.toDateString();
        }).length;
        
        const ventasAyer = ventasFiltradas.filter(v => {
            const fecha = new Date(v.FechaVenta);
            return fecha.toDateString() === fechaAnterior.toDateString();
        }).length;
        
        datosSemanaActual.push(ventasHoy);
        datosSemanaAnterior.push(ventasAyer);
    }

    if (charts.tendenciaComercial) charts.tendenciaComercial.destroy();

    charts.tendenciaComercial = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Semana Actual',
                    data: datosSemanaActual,
                    borderColor: CONFIG.COLORES.primario,
                    backgroundColor: `${CONFIG.COLORES.primario}33`,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Semana Anterior',
                    data: datosSemanaAnterior,
                    borderColor: CONFIG.COLORES.secundario,
                    backgroundColor: `${CONFIG.COLORES.secundario}33`,
                    tension: 0.4,
                    fill: true,
                    borderDash: [5, 5]
                }
            ]
        },
        options: CONFIG.CHART_OPTIONS
    });
}

function crearRanking() {
    const container = document.getElementById('rankingContainer');
    if (!container) return;

    const ranking = {};
    ventasFiltradas.forEach(v => {
        const key = `${v.Marca} - ${v.Modelo}`;
        if (!ranking[key]) {
            ranking[key] = {
                marca: v.Marca,
                modelo: v.Modelo,
                cilindraje: v.Cilindraje,
                ventas: 0,
                ingresos: 0
            };
        }
        ranking[key].ventas++;
        ranking[key].ingresos += v.PrecioConIVA;
    });

    const rankingArray = Object.values(ranking)
        .sort((a, b) => b.ventas - a.ventas)
        .slice(0, 10);

    if (rankingArray.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No hay datos para mostrar</p></div>';
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Cilindraje</th>
                    <th>Ventas</th>
                    <th>Ingresos</th>
                </tr>
            </thead>
            <tbody>
    `;

    rankingArray.forEach((item, index) => {
        html += `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${Utils.sanitizar(item.marca)}</td>
                <td>${Utils.sanitizar(item.modelo)}</td>
                <td>${item.cilindraje}cc</td>
                <td><span class="badge badge-success">${item.ventas}</span></td>
                <td>${Utils.formatearMoneda(item.ingresos)}</td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function mostrarTablaCompleta() {
    const container = document.getElementById('rankingContainer');
    if (!container) return;

    if (ventasFiltradas.length === 0) {
        Utils.mostrarNotificacion('No hay datos para mostrar', 'error');
        return;
    }

    let html = `
        <div style="margin-bottom: 1rem;">
            <button class="btn btn-secondary" id="btnVolverRanking">← Volver al Ranking</button>
            <span style="margin-left: 1rem; color: var(--texto-terciario);">
                Mostrando ${ventasFiltradas.length} registros
            </span>
        </div>
        <div style="overflow-x: auto;">
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>SKU</th>
                    <th>Marca</th>
                    <th>Modelo</th>
                    <th>Cilindraje</th>
                    <th>Precio Con IVA</th>
                    <th>Cliente</th>
                    <th>Fecha</th>
                </tr>
            </thead>
            <tbody>
    `;

    ventasFiltradas.forEach(v => {
        html += `
            <tr>
                <td>${Utils.sanitizar(v.ID || '-')}</td>
                <td>${Utils.sanitizar(v.SKU)}</td>
                <td>${Utils.sanitizar(v.Marca)}</td>
                <td>${Utils.sanitizar(v.Modelo)}</td>
                <td>${v.Cilindraje}cc</td>
                <td>${Utils.formatearMoneda(v.PrecioConIVA)}</td>
                <td>${Utils.sanitizar(v.Cliente)}</td>
                <td>${Utils.formatearFechaCorta(v.FechaVenta)}</td>
            </tr>
        `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;

    document.getElementById('btnVolverRanking')?.addEventListener('click', crearRanking);
                        }
