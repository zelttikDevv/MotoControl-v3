const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    
    MARCAS: [
        'Vento',
        'Bajaj',
        'Carabela',
        'Veloci',
        'BDS',
        'American Pistón'
    ],
    
    CILINDRAJES: [110, 125, 150, 200, 250, 300],
    
    IVA_PORCENTAJE: 16,
    IVA_FACTOR: 1.16,
    
    COLORES: {
        primario: '#3b82f6',
        secundario: '#06b6d4',
        exito: '#10b981',
        advertencia: '#f59e0b',
        peligro: '#ef4444',
        violeta: '#8b5cf6',
        rosa: '#ec4899',
        azul: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff'],
        colores: ['#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    },
    
    CHART_OPTIONS: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: {
                    color: '#e5e7eb'
                }
            }
        },
        scales: {
            y: {
                ticks: {
                    color: '#9ca3af'
                },
                grid: {
                    color: 'rgba(156, 163, 175, 0.1)'
                }
            },
            x: {
                ticks: {
                    color: '#9ca3af'
                },
                grid: {
                    color: 'rgba(156, 163, 175, 0.1)'
                }
            }
        }
    }
};

if (!CONFIG.API_URL || CONFIG.API_URL.includes('YOUR_SCRIPT_ID')) {
    console.warn('⚠️ Configura tu URL de Google Apps Script en js/config.js');
}
