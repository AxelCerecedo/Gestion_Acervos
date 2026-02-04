
// analytics.js

document.addEventListener('DOMContentLoaded', () => {
    // 🔥 Variables globales de las gráficas
    let usersByDeviceChartInstance = null;
    let sessionsOverTimeChartInstance = null;
    let newVsReturningChartInstance = null;
    let trafficSourcesChartInstance = null;

    let allAnalyticsDataCache = null;
    let currentDataToRender = null;
    let currentSelectedRepo = 'all'; 
    window.geminiReportRepoId = null;
    window.geminiReportText = "";

    const MODEL = "models/gemini-2.5-flash";
    const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/${MODEL}:generateContent?key=`;
    const API_KEY = "AIzaSyBfbb2nNqiuhwIGQ2AvumLRfMo07-Va-l8"; 
    const geminiBtn = document.getElementById("gemini-button");
    const downloadPdfButton = document.getElementById("downloadPdfButton");

    const historyButton = document.getElementById('history-button');
    const reportsHistoryModal = new bootstrap.Modal(document.getElementById('reportsHistoryModal'));
    const reportsHistoryTableBody = document.getElementById('reportsHistoryTableBody');
    const historyRepoNameDisplay = document.getElementById('historyRepoNameDisplay');
    const historyLoading = document.getElementById('historyLoading');



    // Base URL del API backend:
      window.API_BASE_URL = "http://172.17.175.137:3000";

    const translations = {
        'mobile': 'Móvil',
        'desktop': 'Escritorio',
        'tablet': 'Tablet',
        'smart tv': 'Smart TV',
        'new': 'Nuevo',
        'returning': 'Recurrente',
        'organic search': 'Búsqueda Orgánica',
        'direct': 'Directo',
        'referral': 'Referido',
        'organic social': 'Redes Sociales',
        'unassigned': 'Sin Asignar',
        '(not set)': 'Sin definir'
    };

    // --- Función para calcular rangos de fechas ---
    function getDateRange(option) {
        const today = new Date();
        let start, end = new Date(today);

        switch (option) {
            case "today": 
                start = new Date(end);
                break;
            case "last7": 
                start = new Date(end);
                start.setDate(end.getDate() - 6); 
                break;
            case "last28": 
                start = new Date(end);
                start.setDate(end.getDate() - 27); 
                break;
            case "last30": 
                start = new Date(end);
                start.setDate(end.getDate() - 29); 
                break;
            case "last90": 
                start = new Date(end);
                start.setDate(end.getDate() - 89); 
                break;
            case "last365": 
                start = new Date(end);
                start.setDate(end.getDate() - 364); 
                break;
            case "custom": 
                return null;
        }

        const dateRange = {
            startDate: start.toISOString().split("T")[0],
            endDate: end.toISOString().split("T")[0]
        };

        console.log("Rango de fechas seleccionado:", dateRange);
        return dateRange;
    }

    function showLoader() {
    document.getElementById("loadingOverlay").classList.remove("d-none");
    }
    function hideLoader() {
    document.getElementById("loadingOverlay").classList.add("d-none");
    }


    // analytics.js

async function fetchAndRenderDashboard(startDate, endDate, repoIdToKeep = 'all') {
    showLoader(); 

    try {
        // 1. Definir la clave de caché
        const cacheKey = `analytics_${startDate || 'default'}_${endDate || 'default'}`;
        
        // 2. Intentar obtener de la caché local (sessionStorage)
        const cachedData = JSON.parse(sessionStorage.getItem(cacheKey) || "null");

        if (cachedData) {
            console.log("⚡ Usando datos en sessionStorage");
            allAnalyticsDataCache = cachedData;
            populateRepoSelector(allAnalyticsDataCache);
            currentSelectedRepo = repoIdToKeep;
            document.getElementById('repo-selector').value = currentSelectedRepo;
            updateDashboard(currentSelectedRepo);
        } else {
            // 3. Si no hay caché local: Llamar al backend para obtener los datos
            // La ruta /analytics/data se encargará de:
            // a) Llamar a Analytics (lenta) si no hay caché en DB.
            // b) LUEGO guardar la respuesta en la DB.
            const url = new URL('http://172.17.175.137:3000/analytics/data');
            
            // 🚨 Añadir los parámetros al URL
            let rangeOption = null;
            const dateRangeSelect = document.getElementById('date-range');
            const selectedValue = dateRangeSelect.value;
            
            if (startDate && endDate) {
                url.searchParams.append('startDate', startDate);
                url.searchParams.append('endDate', endDate);
                // Si la opción seleccionada es una de las predefinidas, la mandamos al backend
                if (["today", "last7", "last28", "last30", "last90", "last365"].includes(selectedValue)) {
                    url.searchParams.append('rangeOption', selectedValue);
                }
            }

            console.log("🌐 Solicitando datos a la URL:", url.toString());
            const response = await fetch(url);
            if (!response.ok) throw new Error('No se pudo obtener la información de Analytics desde el servidor.');

            const data = await response.json();
            
            // 4. Guardar en caché local y renderizar
            sessionStorage.setItem(cacheKey, JSON.stringify(data));

            allAnalyticsDataCache = data;
            populateRepoSelector(allAnalyticsDataCache);
            currentSelectedRepo = repoIdToKeep;
            document.getElementById('repo-selector').value = currentSelectedRepo;
            updateDashboard(currentSelectedRepo);
        }

    } catch (error) {
        console.error('❌ Error al cargar el dashboard de Analytics:', error);
    } finally {
        hideLoader();
    }
}

/// =======================================================
// 🚀 Precarga global: Intenta desde DB, si falla usa el original
// =======================================================
async function preloadAllRangesFromDB() {
    if (sessionStorage.getItem("preloadDone")) {
        console.log("⚡ Precarga ya completada anteriormente — omitida.");
        return;
    }

    console.time("Precarga total desde DB");
    let precargados = 0;
    
    try {
        console.log("➡️ [CLIENTE] Intentando cargar el caché desde el ENDPOINT RÁPIDO: /api/cache/all");
        const response = await fetch("http://172.17.175.137:3000/api/cache/all"); 
        
        if (response.ok) {
            const cachedItems = await response.json(); 

            // 1. Log de ÉXITO
            console.log(`✅ [CLIENTE] **ÉXITO** al obtener datos de la DB. Total de rangos recibidos: ${cachedItems.length}.`);
            
            // 2. Procesar y guardar en sessionStorage
            for (const item of cachedItems) {
                sessionStorage.setItem(item.range_key, JSON.stringify(item.data));
                // Log de GUARDADO LOCAL
                console.log(`💾 [CLIENTE] **Guardando localmente** el rango: ${item.range_name} (Clave: ${item.range_key}).`);
                precargados++;
            }
            
            //showToast("✅ Precarga completada (Base de Datos)");

        } else {
            // 3. Log de FALLO de DB
            console.warn(`⚠️ [CLIENTE] **FALLO** de la carga desde el ENDPOINT RÁPIDO (${response.status}). Iniciando Modo de Respaldo.`);
            await preloadOriginalFallback(); 
        }

    } catch (err) {
        // 4. Log de FALLO de Red
        console.warn("⚠️ [CLIENTE] **FALLO de RED** al intentar conectar con la DB. Iniciando Modo de Respaldo.", err);
        await preloadOriginalFallback(); 
    }
    
    console.timeEnd("Precarga total desde DB");
    
    if (precargados > 0) {
        sessionStorage.setItem("preloadDone", "true");
    }
}


// =======================================================
// ⬇️ FUNCIÓN DE RESPALDO (Su lógica original, con logs) ⬇️
// =======================================================

async function preloadOriginalFallback() {
    const rangesToPreload = ["today", "last7", "last28", "last30", "last90", "last365"];
    let precargados = 0;
    
    console.log("➡️ [CLIENTE - RESPALDO] Iniciando llamadas individuales a la fuente lenta de datos.");
    
    for (const key of rangesToPreload) {
        const range = getDateRange(key);
        const cacheKey = `analytics_${range.startDate}_${range.endDate}`;

        if (sessionStorage.getItem(cacheKey)) continue; 

        try {
            const url = new URL("http://172.17.175.137:3000/analytics/data");
            url.searchParams.append("startDate", range.startDate);
            url.searchParams.append("endDate", range.endDate);
            
            // Log de origen LENTO
            console.log(`   ➡️ [CLIENTE - RESPALDO] Solicitando rango ${key} desde la fuente LENTA: ${url.toString()}`);
            
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
                // Log de GUARDADO LENTO
                console.log(`   ✅ [CLIENTE - RESPALDO] **Guardado con éxito** ${key} en sessionStorage.`);
                precargados++;
            } else {
                console.warn(`   ⚠️ [CLIENTE - RESPALDO] Falló la obtención de ${key}: ${response.status}`);
            }
        } catch (err) {
            console.warn(`   ⚠️ [CLIENTE - RESPALDO] Error de red al obtener ${key}:`, err);
        }
    }
    
    /*if (precargados > 0) {
        showToast("✅ Precarga completada (Modo de Respaldo)");
    } */
}


// =======================================================
// 🚀 Ejecutar automáticamente al cargar la página (Nueva función)
// =======================================================
window.removeEventListener("load", () => { preloadAllRangesOnce(); }); // Eliminar la vieja
window.addEventListener("load", () => {
    preloadAllRangesFromDB(); // Usar la nueva función
});

// =======================================================
// 💬 Toast flotante reutilizable
// =======================================================
function showToast(message) {
    let toast = document.getElementById("toastMessage");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toastMessage";
        toast.style.position = "fixed";
        toast.style.bottom = "20px";
        toast.style.right = "20px";
        toast.style.padding = "10px 20px";
        toast.style.background = "#16a34a";
        toast.style.color = "white";
        toast.style.fontWeight = "bold";
        toast.style.borderRadius = "10px";
        toast.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
        toast.style.zIndex = 9999;
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = "1";

    // Ocultar automáticamente después de 3 segundos
    setTimeout(() => {
        toast.style.transition = "opacity 0.5s";
        toast.style.opacity = "0";
    }, 3000);
}


    // --- Selector de repositorios ---
    function populateRepoSelector(data) {
    const selector = document.getElementById('repo-selector');
    selector.innerHTML = '<option value="all">Todos los repositorios</option>';
    for (const propertyId in data) {
        const option = document.createElement('option');
        option.value = propertyId;
        option.textContent = data[propertyId].name;
        selector.appendChild(option);
    }
    }

   function updateDashboard(selectedId) {
    if (!allAnalyticsDataCache) return;

    // 🚨 Guardar el ID del repositorio seleccionado
    currentSelectedRepo = selectedId;

    // Preparar los datos según repositorio seleccionado
    if (selectedId === 'all') {
        // 1. Para las gráficas (Suma total)
        currentDataToRender = combineAnalyticsData(allAnalyticsDataCache);

        // ---------------------------------------------------------
        // ✅ CORRECCIÓN PARA GEMINI: Crear la lista comparativa
        // ---------------------------------------------------------
        // Transformamos el objeto de cache en un Array ligero solo con los datos clave
        // Esto soluciona el error "Datos faltantes" y evita que se cuelgue por exceso de datos.
        window.currentDataToRenderAll = Object.values(allAnalyticsDataCache).map(repo => ({
            nombre: repo.name,
            usuarios: repo.data?.summary?.totalUsers || 0,
            sesiones: repo.data?.summary?.totalSessions || 0,
            rebote: (repo.data?.summary?.bounceRate || 0).toFixed(1) + '%',
            duracion: (repo.data?.summary?.avgSessionDuration || 0).toFixed(0) + 's'
        }));

        console.log("✅ Datos listos para Gemini (Todos):", window.currentDataToRenderAll);

    } else {
        // Limpiamos la variable de "Todos" para evitar confusiones
        window.currentDataToRenderAll = null;

        const repo = allAnalyticsDataCache[selectedId];
        if (!repo || !repo.data) {
            currentDataToRender = null;
        } else {
            const translatedUsersByDevice = repo.data.usersByDevice.map(item => ({
                ...item,
                device: translations[item.device?.toLowerCase().trim()] || item.device
            }));
            
            const translatedTrafficSources = repo.data.trafficSources.map(item => ({
                ...item,
                source: translations[item.source?.toLowerCase().trim()] || item.source
            }));
            
            const translatedNewVsReturning = repo.data.newVsReturning.map(item => ({
                ...item,
                type: translations[item.type?.toLowerCase().trim()] || item.type
            }));

            currentDataToRender = {
                summary: repo.data.summary,
                topPages: repo.data.topPages.filter(p => p.page && p.page.toLowerCase() !== "(not set)"),
                usersByDevice: translatedUsersByDevice,
                sessionsOverTime: repo.data.sessionsOverTime || [],
                newVsReturning: translatedNewVsReturning,
                trafficSources: translatedTrafficSources,
                usersByCountry: repo.data.usersByCountry
            };
        }
    }

    if (!currentDataToRender) return;

    // 🚀 Actualizar etiquetas de métricas
    const dateRangeSelect = document.getElementById('date-range');
    const selectedOption = dateRangeSelect.options[dateRangeSelect.selectedIndex];
    const newLabel = selectedOption.dataset.label || "Últimos 30 días";

    document.querySelectorAll('.metric-label').forEach(label => {
        label.textContent = newLabel;
    });

    // Actualizar métricas
    document.getElementById('totalUsers').textContent = currentDataToRender.summary.totalUsers.toLocaleString();
    document.getElementById('totalSessions').textContent = currentDataToRender.summary.totalSessions.toLocaleString();
    document.getElementById('bounceRate').textContent = `${currentDataToRender.summary.bounceRate.toFixed(1)}%`;
    document.getElementById('avgSessionDuration').textContent = `${currentDataToRender.summary.avgSessionDuration.toFixed(0)}s`;

    // Renderizar gráficos
    const usersByDeviceChartType = document.querySelector('.btn-group-usersbydevice .btn.active')?.dataset.chartType || 'bar';
    renderUsersByDeviceChart(currentDataToRender.usersByDevice, usersByDeviceChartType);

    const newVsReturningChartType = document.querySelector('.btn-group-newvsreturning .btn.active')?.dataset.chartType || 'doughnut';
    renderNewVsReturningChart(currentDataToRender.newVsReturning, newVsReturningChartType);

    renderSessionsOverTimeChart(allAnalyticsDataCache, selectedId);
    renderTrafficSourcesChart(currentDataToRender.trafficSources);

    // Llenar tablas
    const topPagesDataForTable = selectedId === 'all' 
        ? combineTopPages(allAnalyticsDataCache) 
        : [{ repo: allAnalyticsDataCache[selectedId]?.name, pages: currentDataToRender.topPages }];
    fillTopPagesTable(topPagesDataForTable);
    fillUsersByCountryTable(currentDataToRender.usersByCountry);

    // Renderizar mapa
    const mapContainer = document.getElementById("usersByCountryMap");
    mapContainer.innerHTML = "";
    if (currentDataToRender.usersByCountry && currentDataToRender.usersByCountry.length > 0) {
        renderUsersByCountryChoropleth(currentDataToRender.usersByCountry);
    } else {
        mapContainer.innerHTML = '⚠️ No hay datos de países para este repositorio.';
    }
}

    function combineTopPages(data) {
        const combined = [];
        for (const propertyId in data) {
            const propertyData = data[propertyId].data;
            if (propertyData && propertyData.topPages) {
                combined.push({
                    repo: data[propertyId].name,
                    pages: propertyData.topPages.filter(p => p.page && p.page.toLowerCase() !== "(not set)")
                });
            }
        }
        return combined;
    }

    function combineAnalyticsData(data) {
        let totalUsers = 0, totalSessions = 0;
        let bounceRates = [], avgSessionDurations = [];
        const topPages = [], usersByDevice = {}, sessionsOverTime = {};
        const newVsReturning = {}, trafficSources = {}, usersByCountry = {};
    
        for (const propertyId in data) {
            const propertyData = data[propertyId].data;
            if (!propertyData || !propertyData.summary) continue;
    
            totalUsers += propertyData.summary.totalUsers;
            totalSessions += propertyData.summary.totalSessions;
            bounceRates.push(propertyData.summary.bounceRate);
            avgSessionDurations.push(propertyData.summary.avgSessionDuration);
    
            // Top Pages con repo y sin "(not set)"
            if (propertyData.topPages) {
                propertyData.topPages
                    .filter(p => p.page && p.page.toLowerCase() !== "(not set)")
                    .forEach(p => {
                        topPages.push({
                            repo: data[propertyId].name,
                            page: p.page,
                            visits: p.visits
                        });
                    });
            }
    
            // Usuarios por dispositivo (acumulado)
            if (propertyData.usersByDevice) {
                propertyData.usersByDevice.forEach(item => {
                    const d = translations[item.device?.toLowerCase().trim()] || item.device;
                    usersByDevice[d] = (usersByDevice[d] || 0) + item.users;
                });
            }
    
            // Sesiones por día (acumular todas en un solo array)
            if (propertyData.sessionsOverTime) {
                propertyData.sessionsOverTime.forEach(item => {
                    const date = item.date;
                    sessionsOverTime[date] = (sessionsOverTime[date] || 0) + item.sessions;
                });
            }
    
            // Nuevos vs Recurrentes
            if (propertyData.newVsReturning) {
                propertyData.newVsReturning.forEach(item => {
                    const t = translations[item.type?.toLowerCase().trim()] || item.type;
                    newVsReturning[t] = (newVsReturning[t] || 0) + item.users;
                });
            }
    
            // Fuentes de tráfico
            if (propertyData.trafficSources) {
                propertyData.trafficSources.forEach(item => {
                    const s = translations[item.source?.toLowerCase().trim()] || item.source;
                    trafficSources[s] = (trafficSources[s] || 0) + item.sessions;
                });
            }
    
            // Usuarios por país
            if (propertyData.usersByCountry) {
                propertyData.usersByCountry.forEach(item => {
                    usersByCountry[item.country] = (usersByCountry[item.country] || 0) + item.users;
                });
            }
        }
    
        // Calcular promedios
        const avgBounceRate = bounceRates.length ? bounceRates.reduce((a,b)=>a+b,0)/bounceRates.length : 0;
        const avgSessionDuration = avgSessionDurations.length ? avgSessionDurations.reduce((a,b)=>a+b,0)/avgSessionDurations.length : 0;
    
        // Preparar datos combinados
        const combinedTopPages = topPages.sort((a,b)=>b.visits-a.visits);
        const combinedUsersByDevice = Object.keys(usersByDevice).map(k=>({device:k,users:usersByDevice[k]}));
        const combinedSessionsOverTime = Object.keys(sessionsOverTime).sort().map(date => ({ date, sessions: sessionsOverTime[date] }));
        const combinedNewVsReturning = Object.keys(newVsReturning).map(k=>({type:k,users:newVsReturning[k]}));
        const combinedTrafficSources = Object.keys(trafficSources).map(k=>({source:k,sessions:trafficSources[k]})).sort((a,b)=>b.sessions-a.sessions);
        const combinedUsersByCountry = Object.keys(usersByCountry).map(k=>({country:k,users:usersByCountry[k]})).sort((a,b)=>b.users-a.users);
    
        return {
            summary: { totalUsers, totalSessions, bounceRate: avgBounceRate, avgSessionDuration },
            topPages: combinedTopPages,
            usersByDevice: combinedUsersByDevice,
            sessionsOverTime: combinedSessionsOverTime,
            newVsReturning: combinedNewVsReturning,
            trafficSources: combinedTrafficSources,
            usersByCountry: combinedUsersByCountry
        };
    }

    // -- GRAFICAS --

    // Definimos una paleta de colores para unificar el diseño.
    const chartColors = {
        red: '#a41623',
        green: '#28a745',
        yellow: '#ffc107',
        blue: '#007bff',
        cyan: '#17a2b8',
        solidRed: '#7c1225',
    };

    // Función para crear un degradado dinámico (opcional, pero útil para barras)
    function createGradient(ctx) {
        const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
        gradient.addColorStop(0, chartColors.solidRed);
        gradient.addColorStop(1, 'rgba(255, 0, 47, 0.2)'); // Versión semitransparente para el efecto "sombra"
        return gradient;
    }
    
    function renderUsersByDeviceChart(data, type) {
    const ctx = document.getElementById('usersByDeviceChart').getContext('2d');
    if (usersByDeviceChartInstance) usersByDeviceChartInstance.destroy();

    const labels = data.map(item => item.device);
    const values = data.map(item => item.users);

    let backgroundColor;
    let borderColor = 'white';
    let borderWidth = 2;

    if (type === 'bar') {
        // Usamos un color sólido o el degradado si lo prefieres para la barra
        backgroundColor = [chartColors.solidRed, chartColors.green, chartColors.blue, chartColors.yellow, chartColors.cyan];
        borderColor = 'transparent'; // Las barras no suelen tener borde
        borderWidth = 0;
    } else {
        // Colores sólidos para los gráficos de pastel/doughnut
        backgroundColor = [chartColors.solidRed, chartColors.green, chartColors.blue, chartColors.yellow, chartColors.cyan];
        borderColor = '#fff';
        borderWidth = 2;
    }

    usersByDeviceChartInstance = new Chart(ctx, {
        type: type,
        data: {
            labels,
            datasets: [{
                label: "Usuarios",
                data: values,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                borderWidth: borderWidth,
                borderRadius: type === 'bar' ? 12 : 0,
                hoverOffset: type !== 'bar' ? 15 : 0
            }]
        },
        options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: {
                callbacks: {
                    label: ctx => `${ctx.label}: ${ctx.raw.toLocaleString()} usuarios`
                }
            },

            // 🔥 Agregamos porcentajes visibles en gráfico tipo pie/doughnut
            datalabels: type !== 'bar' ? {
                color: "#fff",
                font: { weight: "bold", size: 12 },
                formatter: (value) => {
                    const total = values.reduce((a,b)=>a+b,0);
                    return ((value / total) * 100).toFixed(1) + "%";
                }
            } : false
        },
        }
    });
    }

    function renderNewVsReturningChart(data, type) {
        const ctx = document.getElementById('newVsReturningChart').getContext('2d');
        if (newVsReturningChartInstance) newVsReturningChartInstance.destroy();

        const filteredData = data.filter(item => item.type && item.type.toLowerCase() !== 'sin definir');
        const labels = filteredData.map(item => item.type);
        const values = filteredData.map(item => item.users);

        let backgroundColor;
        let borderColor = 'white';
        let borderWidth = 2;

        if (type === 'bar') {
            // Usamos colores sólidos para las barras, al igual que en el gráfico anterior
            backgroundColor = [chartColors.solidRed, chartColors.green];
            borderColor = 'transparent';
            borderWidth = 0;
        } else {
            // Colores sólidos para los gráficos de pastel/doughnut, igual que en el otro gráfico
            backgroundColor = [chartColors.solidRed, chartColors.green];
            borderColor = '#fff';
            borderWidth = 2;
        }

        newVsReturningChartInstance = new Chart(ctx, {
            type: type,
            data: {
                labels,
                datasets: [{
                    data: values,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: borderWidth,
                    hoverOffset: type !== 'bar' ? 15 : 0
                }]
            },
            options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.raw.toLocaleString()} usuarios`
                    }
                },
                datalabels: type !== 'bar' ? {
                    color: "#fff",
                    font: { weight: "bold", size: 12 },
                    formatter: (value) => {
                        const total = values.reduce((a,b)=>a+b,0);
                        return ((value / total) * 100).toFixed(1) + "%";
                    }
                } : false
            },
            }
        });
    }

    function renderSessionsOverTimeChart(allData, selectedId) {
        const ctx = document.getElementById('sessionsOverTimeChart').getContext('2d');
        if (sessionsOverTimeChartInstance) sessionsOverTimeChartInstance.destroy();
        if (!allData) return;

        let datasets = [], allDates = [];

        if (selectedId === 'all') {
            const colors = ['#ff0015','#000000','#28a745','#937417','#17a2b8','#6f42c1','#f88900','#f003ad','#fff700','#0400ff','#00ffbb'];
            allDates = [...new Set(Object.values(allData).flatMap(repo => repo.data.sessionsOverTime.map(v => v.date)))].sort();

            datasets = Object.values(allData).map((repo, index) => {
                const sessionsMap = {};
                repo.data.sessionsOverTime.forEach(v => sessionsMap[v.date] = v.sessions);
                const sessionsArray = allDates.map(date => sessionsMap[date] || 0);
                return {
                    label: repo.name,
                    data: sessionsArray,
                    borderColor: colors[index % colors.length],
                    backgroundColor: colors[index % colors.length] + '33',
                    fill: true,
                    tension: 0.4, // curva tipo wave
                    pointRadius: 5,
                    pointHoverRadius: 8
                };
            });
        } else {
            const repo = allData[selectedId];
            if (!repo || !repo.data || !repo.data.sessionsOverTime) return;
            allDates = repo.data.sessionsOverTime.map(item => item.date).sort();
            const sessionsData = repo.data.sessionsOverTime.map(item => item.sessions);

            datasets.push({
                label: repo.name,
                data: sessionsData,
                borderColor: '#7c1225',
                backgroundColor: '#7c122533',
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointHoverRadius: 8
            });
        }

        sessionsOverTimeChartInstance = new Chart(ctx, {
            type: 'line',
            data: { labels: allDates.map(d => `${d.substring(6,8)}/${d.substring(4,6)}/${d.substring(0,4)}`), datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let value = context.raw || 0;
                                let label = context.dataset.label || '';
                                return `${label}: ${value.toLocaleString()} sesiones`;
                            }
                        }
                    }
                },
                scales: {
                    x: { ticks: { maxRotation: 45, minRotation: 45 } },
                    y: { beginAtZero: true, ticks: { callback: val => val.toLocaleString() } }
                }
            }
        });
    }


    function renderTrafficSourcesChart(data) {
        const ctx = document.getElementById('trafficSourcesChart').getContext('2d');
        if (trafficSourcesChartInstance) trafficSourcesChartInstance.destroy();

        const labels = data.map(item => item.source);
        const values = data.map(item => item.sessions);

        trafficSourcesChartInstance = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets: [{ data: values, backgroundColor: '#7c1225', borderRadius: 12 }] },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                    callbacks: {
                        label: function(context) {
                            let value = context.raw || 0;
                            let label = context.label || '';
                            return `${label}: ${value.toLocaleString()} sesiones`;
                        }
                    }
                }
                },
                scales: {
                    x: { beginAtZero: true, ticks: { callback: val => val.toLocaleString() } },
                    y: { ticks: { color: '#555' } }
                }
            }
        });
    }

    function fillTopPagesTable(topPagesData = []) {
        const tbody = document.getElementById('topPagesTableBody'); 
        tbody.innerHTML = '';

        if (topPagesData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">⚠️ No hay páginas registradas</td></tr>';
            return;
        }

        topPagesData.forEach(repoData => {
            if (repoData.pages && repoData.pages.length > 0) {
                const headerRow = document.createElement('tr');
                headerRow.innerHTML = `
                    <td colspan="2" class="fw-bold bg-light text-danger">
                        ${repoData.repo}
                    </td>
                `;
                tbody.appendChild(headerRow);

                repoData.pages.forEach(item => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.page}</td>
                        <td>${item.visits.toLocaleString()}</td>
                    `;
                    tbody.appendChild(row);
                });
            }
        });
    }

    function fillUsersByCountryTable(usersByCountry = []) {
        const tbody = document.getElementById('usersByCountryTableBody'); 
        tbody.innerHTML = '';

        if (usersByCountry.length === 0) {
            tbody.innerHTML = '<tr><td colspan="2">⚠️ No hay datos de países</td></tr>';
            return;
        }

        usersByCountry.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${item.country}</td>
                <td>${item.users.toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    async function renderUsersByCountryChoropleth(usersByCountry) {

    const countryNameMap = {
        "united states": "United States of America",
        "united kingdom": "United Kingdom",
        "türkiye": "Turkey",
        "costa rica": "Costa Rica",
        "brazil": "Brazil",
        "peru": "Peru",
        "spain": "Spain",
        "china": "China",
        "india": "India",
        "mexico": "Mexico",
        "argentina": "Argentina",
        "colombia": "Colombia",
        "chile": "Chile",
        "france": "France",
        "guatemala": "Guatemala",
        "canada": "Canada",
        "germany": "Germany",
        "ireland": "Ireland",
        "uruguay": "Uruguay",
        "singapore": "Singapore",
        "ecuador": "Ecuador",
        "japan": "Japan",
        "sweden": "Sweden",
        "italy": "Italy",
    };

    const container = document.getElementById("usersByCountryMap");
    container.innerHTML = "";
    d3.selectAll(".tooltip-map").remove();

    if (!usersByCountry || usersByCountry.length === 0) {
        container.innerHTML = '⚠️ No hay datos de países para este repositorio.';
        return;
    }

    const usersDict = {};
    let totalUsers = 0;
    usersByCountry.forEach(d => {
        if (d.country && d.users) {
            const lowerCaseCountry = d.country.toLowerCase().trim();
            // Usa el mapa de traducción para obtener el nombre estandarizado
            const standardizedName = countryNameMap[lowerCaseCountry] || lowerCaseCountry;
            usersDict[standardizedName.toLowerCase()] = d.users; // Almacena el nombre estandarizado en minúsculas
            totalUsers += d.users;
        }
    });

    const width = container.offsetWidth;
    const height = 600;

    const world = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json");
    const countries = topojson.feature(world, world.objects.countries).features;

    const projection = d3.geoNaturalEarth1().scale(width / 6).translate([width / 2, height / 2]);
    const path = d3.geoPath().projection(projection);
    const colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, d3.max(Object.values(usersDict))]);

    const svg = d3.select(container).append("svg").attr("width", width).attr("height", height);
    const tooltip = d3.select("body").append("div").attr("class", "tooltip-map")
        .style("position", "absolute").style("background", "rgba(0,0,0,0.7)").style("color", "#fff")
        .style("padding", "5px 10px").style("border-radius", "4px")
        .style("pointer-events", "none").style("opacity", 0);

    svg.append("g").selectAll("path").data(countries).join("path")
        .attr("d", path)
        .attr("fill", d => {
            const name = d.properties.name?.toLowerCase();
            const value = usersDict[name];
            return value ? colorScale(value) : "#eee";
        })
        .attr("stroke", "#333").attr("stroke-width", 0.5).attr("cursor", "pointer")
        .on("mouseover", function(event, d) {
            const name = d.properties.name;
            // El nombre del mapa (d.properties.name) ya debe coincidir con las claves de usersDict
            const users = usersDict[name?.toLowerCase()] || 0;
            const percentage = totalUsers > 0 ? ((users / totalUsers) * 100).toFixed(1) : 0;
            
            d3.select(this)
              .transition()
              .duration(200)
              .attr("stroke", "#a41623")
              .attr("stroke-width", 2);

            tooltip.transition().duration(200).style("opacity", 1);
            tooltip.html(`
                <strong>${name}</strong><br>
                Usuarios: ${users.toLocaleString()}<br>
                Porcentaje: ${percentage}%
            `);
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
              .transition()
              .duration(200)
              .attr("stroke", "#333")
              .attr("stroke-width", 0.5);

            tooltip.transition().duration(500).style("opacity", 0);
        });
    }

    const dateRangeSelect = document.getElementById('date-range');
    dateRangeSelect.addEventListener('change', async () => {
    const selectedKey = dateRangeSelect.value;
    const range = getDateRange(selectedKey);
    if (!range) return alert("Mostrar selector de fechas personalizado");

    // 🚀 Carga principal del rango seleccionado
    await fetchAndRenderDashboard(range.startDate, range.endDate, currentSelectedRepo);

    });

    // Selector de repositorio
    document.getElementById('repo-selector').addEventListener('change', (event) => {
        const selectedId = event.target.value;
        updateDashboard(selectedId);
    });

    // Botones de Usuarios por Dispositivo
    document.querySelectorAll('.btn-group-usersbydevice .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const chartType = btn.dataset.chartType;
            renderUsersByDeviceChart(currentDataToRender.usersByDevice, chartType);
        });
    });

    // Botones de Usuarios Nuevos vs. Recurrentes
    document.querySelectorAll('.btn-group-newvsreturning .btn').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const chartType = btn.dataset.chartType;
            renderNewVsReturningChart(currentDataToRender.newVsReturning, chartType);
        });
    });


    //===========================================
    // 🚀 Funcionalidad y Logica de Gemini 
    //===========================================

   // Función auxiliar para preparar los datos para Gemini
        function simplifyDataForGemini(data, isAllRepos) {
            if (!data) return null;

            // CASO 1: "Todos los repositorios" (Es un Array)
            if (Array.isArray(data)) {
                return data.map(repo => {
                // Aquí está la corrección:
                // Primero verifica si ya tiene las claves en español (nombre, usuarios...),
                // si no, busca las claves originales en inglés (name, users...).
                return {
                    nombre:   repo.nombre   || repo.name     || "Desconocido",
                    usuarios: repo.usuarios !== undefined ? repo.usuarios : (repo.activeUsers || repo.users || 0),
                    sesiones: repo.sesiones !== undefined ? repo.sesiones : (repo.sessions || 0),
                    rebote:   repo.rebote   || repo.bounceRate || "0%",
                    duracion: repo.duracion || repo.avgSessionDuration || "0s"
                };
            });
        } 
        
        // CASO 2: Un solo repositorio (Es un Objeto grande)
        // Aquí extraemos solo lo vital para no saturar a Gemini
        return {
            resumen: {
                usuarios: data.summary?.totalUsers || 0,
                sesiones: data.summary?.totalSessions || 0,
                rebote: (data.summary?.bounceRate || 0).toFixed(1) + '%',
                duracion: (data.summary?.avgSessionDuration || 0).toFixed(0) + 's'
            },
            fuentes: (data.trafficSources || []).slice(0, 5).map(s => `${s.source}: ${s.users}`), // Top 5 fuentes
            paginas: (data.topPages || []).slice(0, 5).map(p => `${p.page}: ${p.views}`) // Top 5 páginas
        };
    }

        if (geminiBtn && downloadPdfButton) {
    geminiBtn.addEventListener("click", async () => {
    
    // 1. Validación inicial más robusta
    // Verificamos qué variable usar dependiendo de la selección
    const selectedRepoId = document.getElementById('repo-selector').value;
    let dataToAnalyze = null;

    if (selectedRepoId === "all") {
        // Asegúrate de que currentDataToRenderAll esté definida globalmente
        dataToAnalyze = typeof currentDataToRenderAll !== 'undefined' ? currentDataToRenderAll : null;
    } else {
        dataToAnalyze = currentDataToRender;
    }

    if (!dataToAnalyze || (Array.isArray(dataToAnalyze) && dataToAnalyze.length === 0)) {
        console.error("Datos faltantes:", { selectedRepoId, dataToAnalyze });
        alert("⚠️ No hay datos cargados para analizar. Por favor, asegúrate de que la tabla/gráfica se haya renderizado primero.");
        return;
    }

    // 2. Preparar UI
    const modalBody = document.getElementById("analysisModalBody");
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center py-4">
                <div class="spinner-border text-danger mb-2" role="status"></div>
                <span class="text-muted">Gemini está analizando los datos...</span>
            </div>
        `;
    }

    const modal = new bootstrap.Modal(document.getElementById('analysisModal'));
    modal.show();

    // --------------------------------------------------------------------------------------
    // ✅ CORRECCIÓN DE LA FECHA: Llamamos a la función getDateRange para obtener el rango exacto
    // --------------------------------------------------------------------------------------
    const dateSelect = document.getElementById('date-range');
    const selectedOption = dateSelect.value; 
    
    let selectedRange = "Fecha no especificada";

    const rangeObj = getDateRange(selectedOption);

    if (rangeObj) {
        // Formatea las fechas
        selectedRange = `${rangeObj.startDate} al ${rangeObj.endDate}`;
    } else if (selectedOption === 'custom') {
        // Maneja el rango personalizado (asumiendo IDs start-date y end-date)
        const startInput = document.getElementById('start-date')?.value || "";
        const endInput = document.getElementById('end-date')?.value || "";
        if(startInput && endInput) {
            selectedRange = `${startInput} al ${endInput}`;
        } else {
            selectedRange = "Rango personalizado";
        }
    } else {
        // Fallback para opciones como "Últimos 7 días"
        selectedRange = dateSelect.options[dateSelect.selectedIndex].text;
    }
    // --------------------------------------------------------------------------------------

    const selectedRepoName = document.getElementById('repo-selector').selectedOptions[0].textContent;

    // 3. OPTIMIZACIÓN: Reducir el JSON antes de enviarlo
    const simplifiedJson = JSON.stringify(simplifyDataForGemini(dataToAnalyze, selectedRepoId === "all"), null, 2);

    let prompt;

    if (selectedRepoId === "all") {
        console.log("Enviando datos simplificados a Gemini (Todos):", simplifiedJson);

        prompt = `
        Actúa como un analista de datos experto, especialista en métricas de tráfico web (Google Analytics). Genera un informe ejecutivo basado en los siguientes datos consolidados de varios repositorios, en español de formato neutral.

        **CONTEXTO DE MÉTRICAS (TRÁFICO WEB):**
        - **Usuarios y Sesiones:** Indicadores de volumen de tráfico.
        - **Rebote:** Un porcentaje bajo (idealmente < 50%) indica buena calidad y retención del usuario.
        - **Duración:** Un valor alto indica mayor compromiso del usuario con el contenido.

        **DATOS (Resumidos):**
        ${simplifiedJson}

        **Instrucciones estrictas:**
        1. Usa el formato Markdown exacto indicado abajo.
        2. Si los datos están vacíos, indica que no hay información suficiente.
        3. Enfócate en comparar el rendimiento entre los diferentes repositorios listados.

        ## Resumen general
         <p align="left"><strong>Fecha del Informe:</strong> ${selectedRange}</p> 

        (Breve párrafo sobre el volumen total de tráfico sumando todos los repositorios).

        ## Comparativa de rendimiento
        1. **Mayor Tráfico:** (Nombre del repo con más usuarios/sesiones y sus cifras).
        2. **Mejor Retención:** (Repo con menor tasa de rebote o mayor duración).
        3. **Áreas de oportunidad:** (Repositorios con rendimiento bajo notable).

        ## Hallazgos clave
        1. (Hallazgo 1)
        2. (Hallazgo 2)
        3. (Hallazgo 3)

        ## Recomendaciones Estratégicas
        1. (Recomendación 1)
        2. (Recomendación 2)
        3. (Recomendación 3)
        `;
    
    } else {
        // Lógica para un solo repo (incluyendo los datos en el prompt también)
        prompt = `
        Genera un informe ejecutivo para el repositorio: "${selectedRepoName}" en el rango ${selectedRange}. Eres un analista experto en tráfico web.

        **CONTEXTO DE MÉTRICAS:**
        - **Rebote:** Porcentaje bajo = bueno (retención).
        - **Duración:** Valor alto = bueno (compromiso).

        **DATOS DEL REPOSITORIO:**
        ${simplifiedJson}

        **Instrucciones específicas:**
        1. Analiza el **Top 5 de Fuentes** y **Top 5 de Páginas** junto con las métricas de resumen.
        2. Identifica si alguna fuente de tráfico trae un comportamiento anómalo (muy buen o muy mal rebote/duración).

        **Formato Requerido:**
        
        ## Resumen de Métricas - ${selectedRepoName}

        <p align="left"><strong>Fecha del Informe:</strong> ${selectedRange}</p> 

        (Análisis de usuarios, sesiones y comportamiento).

        ## Hallazgos Principales
        1. (Punto clave 1)
        2. (Punto clave 2)
        3. (Punto clave 3)

        ## Recomendaciones
        1. (Acción recomendada 1)
        2. (Acción recomendada 2)
        `;
    }

    try {
        const response = await fetch(GEMINI_API_URL + API_KEY, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Error desconocido en API Gemini");
        }

        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se recibió respuesta de Gemini.";

        // Limpieza y formateo del texto (Igual que tu código original)
        text = text.replace(/^Aquí tienes el informe.*?---\s*/i, '');
        const formatted = text
            .replace(/^### (.*$)/gim, "<h5>$1</h5>")
            .replace(/^## (.*$)/gim, "<h4>$1</h4>")
            .replace(/^# (.*$)/gim, "<h3>$1</h3>")
            .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
            .replace(/\n(\d+)\. (.*)/gim, '<p>$1. $2</p>');

        // Guardar en variables globales para el PDF
        window.geminiReportText = formatted;
        window.geminiReportRepoId = selectedRepoId;

        const reportContent = `
            <div id="pdfContent" style="font-family: 'Roboto', sans-serif; color: #333;">
                    <div style="display: flex; align-items: center; gap: 10px; border-bottom: 2px solid #7c1225; padding-bottom: 8px; margin-bottom: 15px;">
                        <img src="Imagenes/Logos/logo.png" alt="Logo Secretaría de Cultura" style="height: 40px; width: auto;">
                        
                        <div style="display: flex; flex-direction: column; justify-content: center; flex-grow: 1; text-align: center; padding-right: 100px;">
                            <div style="font-size: 1.25rem; font-weight: 700; color: #7c1225;">Análisis de Tráfico Web</div>
                            <div style="font-size: 0.85rem; color: #555;">Generado el ${new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        </div>
                    </div>
                <div class="analysis-text" style="padding-right: 10px;">
                    ${formatted}
                </div>
            </div>
        `;

        if (modalBody) modalBody.innerHTML = reportContent;
        downloadPdfButton.style.display = 'block';

    } catch (err) {
        console.error("❌ Error Gemini:", err);
        if (modalBody) {
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <strong>Error al generar el reporte:</strong><br>
                    ${err.message}
                </div>
            `;
        }
        downloadPdfButton.style.display = 'none';
    }
});
}
       // ===========================================
    // 🚀 Funcionalidad de Reportes de Gemini
    // ===========================================

    async function sendReport() {
    console.log("📤 Iniciando envío de reporte Gemini...");
    console.log("🧩 geminiReportRepoId:", window.geminiReportRepoId);
    console.log("🧩 geminiReportText:", window.geminiReportText ? "[HTML]" : "VACÍO");

    const repoIdToSend = window.geminiReportRepoId;
    const analysisText = window.geminiReportText;

    if (!repoIdToSend || repoIdToSend === 'all' || !analysisText) {
        console.warn("⚠️ No se puede enviar: faltan datos requeridos.");
        alert("⚠️ El análisis no fue generado para un repositorio individual. Por favor, selecciona un repositorio individual y genera el análisis primero.");
        return;
    }

    console.log("🚀 Enviando reporte para repoId:", repoIdToSend);

    const sendEmailButton = document.getElementById('sendEmailButton');
    const spinner = sendEmailButton.querySelector('.spinner-border');
    const originalText = sendEmailButton.querySelector('.btn-text').textContent;

    spinner.classList.remove('d-none');
    sendEmailButton.querySelector('.btn-text').textContent = "Enviando...";
    sendEmailButton.disabled = true;

    try {
        const response = await fetch(`http://172.17.175.137:3000/api/reports/send-and-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            repoId: repoIdToSend,
            analysisContentHtml: analysisText
        }),
        });

        const data = await response.json();
        console.log("📨 Respuesta del backend:", data);

        if (data.success) {
        showToast(`✅ El reporte se envió correctamente a ${data.recipient || 'el destinatario.'}`, 'success');
        const modalInstance = bootstrap.Modal.getInstance(document.getElementById('analysisModal'));
        if (modalInstance) modalInstance.hide();
        } else {
        showToast(`❌ Error al enviar/guardar reporte: ${data.message}`, 'error');
        }

    } catch (error) {
        console.error("💥 Error en sendReport():", error);
        showToast("❌ Error de conexión con el servidor al intentar enviar el reporte.", 'error');
    } finally {
        spinner.classList.add('d-none');
        sendEmailButton.querySelector('.btn-text').textContent = originalText;
        sendEmailButton.disabled = false;
    }
    }


    // 🧩 Helper para corregir formato de fecha MySQL
    function parseMySQLDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString.replace(' ', 'T'));
    }

    // 💡 LISTENERS AGREGADOS

    // 1. Listener para el botón "Enviar por Correo"
    if (sendEmailButton) {
    sendEmailButton.addEventListener('click', sendReport);
    }

    function showToast(message, type = 'success') {
    const toast = document.getElementById('toastAlert');
    toast.textContent = message;

    toast.className = `toast-alert show ${type === 'error' ? 'error' : type === 'info' ? 'info' : ''}`;
    toast.classList.remove('d-none');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
        toast.classList.add('d-none');
        }, 300);
    }, 4000);
    }

    // ✅ Listener principal del botón de historial
    if (historyButton) {
    historyButton.addEventListener('click', async () => {
        const repoSelector = document.getElementById('repo-selector');
        const repoId = repoSelector.value;
        const repoName = repoSelector.options[repoSelector.selectedIndex]?.text || 'Repositorio desconocido';
        historyRepoNameDisplay.textContent = repoName;
        reportsHistoryModal?.show();

        if (repoId === 'all') {
        reportsHistoryTableBody.innerHTML = `
            <tr><td colspan="5" class="text-center text-muted">
            Seleccione un repositorio específico para ver su historial.
            </td></tr>`;
        return;
        }

        historyLoading.classList.remove('d-none');
        reportsHistoryTableBody.innerHTML = '';

        try {
        const response = await fetch(`http://172.17.175.137:3000/api/reports/repository/${repoId}`);
        const data = await response.json();

        if (!data.success) throw new Error(data.message || 'Error al obtener el historial');

        const reports = data.reports || [];
        if (reports.length === 0) {
            reportsHistoryTableBody.innerHTML = `
            <tr><td colspan="5" class="text-center text-muted">
                No hay reportes guardados para este repositorio.
            </td></tr>`;
            return;
        }

        reportsHistoryTableBody.innerHTML = reports.map(rep => {
        const rawDate = rep.createdAt || rep.timestamp || rep.created_at || rep.sentAt || rep.sent_at;
        console.log("🧾 Reporte en tabla:", rep);
        console.log("   📅 Fecha detectada:", rawDate);

        const fecha = parseMySQLDate(rawDate);
        const fechaFormateada = fecha
            ? fecha.toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
            : 'Sin fecha';

            const estadoClass = rep.status === 'ENVIADO'
            ? 'text-success fw-bold'
            : rep.status === 'PENDIENTE'
            ? 'text-warning fw-bold'
            : 'text-danger fw-bold';

            return `
            <tr>
                <td>${fechaFormateada}</td>
                <td>${rep.repositoryName}</td>
                <td>${rep.recipientEmail}</td>
                <td class="${estadoClass}">${rep.status}</td>
                <td>
                <button class="btn btn-sm btn-outline-primary ver-reporte-btn" data-id="${rep.id}">
                    Ver Reporte
                </button>
                </td>
            </tr>`;
        }).join('');

        // Sub-listener para ver reporte
        document.querySelectorAll('.ver-reporte-btn').forEach(btn => {
            btn.addEventListener('click', e => verReporteGuardado(e.target.dataset.id));
        });

        } catch (err) {
        console.error('❌ Error al cargar historial:', err);
        reportsHistoryTableBody.innerHTML = `
            <tr><td colspan="5" class="text-center text-danger">
            Error al cargar historial: ${err.message}
            </td></tr>`;
        } finally {
        historyLoading.classList.add('d-none');
        }
    });
    }

    // ====================================================
    // 🧾 FUNCIÓN: Ver reporte guardado (usa #savedReportModal)
    // ====================================================

  async function verReporteGuardado(reportId) {
  console.log("📄 Cargando reporte con ID:", reportId);

  try {
    const response = await fetch(`http://172.17.175.137:3000/api/reports/view/${reportId}`);
    const data = await response.json();
    console.log("✅ Reporte obtenido correctamente:", data);

    // 🧩 Extraer datos y asegurar compatibilidad de nombres de campos
    const report = data.report || {};
    window.geminiSavedReportId = report.id;
    window.geminiReportRepoId = report.repositoryId;
    window.geminiReportText = report.analysisHtml;
    // 🔥 Datos para regenerar las gráficas en reportes antiguos
    window.geminiSavedAnalytics = report.analyticsData || null;
    window.geminiSavedWordpress = report.wordpressData || null;
    window.geminiSavedRange = report.dateRange || null;


    // ✅ Fallback de fechas (maneja varios nombres posibles)
    const createdAt = report.createdAt || report.created_at || report.timestamp || null;
    const sentAt = report.sentAt || report.sent_at || null;

    // Guardar globalmente
    window.geminiCreatedAt = createdAt;
    window.geminiSentAt = sentAt;

    if (!data.success || !data.report || !data.report.analysisHtml) {
      alert("⚠️ No hay contenido disponible para este reporte.");
      return;
    }

    // 🔹 Cerrar modal de historial antes de abrir este
    const historyModal = bootstrap.Modal.getInstance(document.getElementById('reportsHistoryModal'));
    if (historyModal) historyModal.hide();

    // 🔹 Referencias del modal
    const modalBody = document.getElementById("savedReportModalBody");
    const modalLabel = document.getElementById("savedReportModalLabel");

    const repoName = report.repositoryName || "Repositorio sin nombre";

    // 🧠 Manejo de fechas (corregido)
    let createdDate = "Fecha desconocida";
    let sentDate = null;

    console.log("🧮 Intentando convertir fechas...");

    // Función para parsear fechas de forma segura
    function parseDateSafe(str) {
    if (!str) return null;
    const normalized = str.includes('T') ? str : str.replace(' ', 'T');
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
    }

    const parsedCreated = parseDateSafe(createdAt);
    const parsedSent = parseDateSafe(sentAt);

    // Formatear creación
    if (parsedCreated) {
    createdDate = parsedCreated.toLocaleString("es-MX", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
    }

    // Formatear envío
    if (parsedSent) {
    sentDate = parsedSent.toLocaleString("es-MX", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit"
    });
    }

    console.log("📅 Fecha formateada (creación):", createdDate);
    console.log("📅 Fecha formateada (envío):", sentDate);

    // Convertir a timestamps numéricos
    const createdTS = parsedCreated ? parsedCreated.getTime() : null;
    const sentTS = parsedSent ? parsedSent.getTime() : null;

    // Mostrar solo si realmente son diferentes
    const showSentInfo =
    sentTS !== null &&
    createdTS !== null &&
    sentTS !== createdTS;

    const dateInfo = showSentInfo
    ? `<div style="font-size: 0.85rem; color: #777;">Último envío: ${sentDate}</div>`
    : "";


    // 🔹 Guardar variables globales por si se reenvía
    window.geminiReportText = report.analysisHtml;
    window.geminiReportRepoId = report.repositoryId || null;

    // 🔹 Estructura visual igual que el análisis generado con Gemini
    const formattedContent = `
      <div id="pdfContentSaved" style="font-family: 'Roboto', sans-serif; color: #333;">
        <!-- Cabecera -->
        <div style="
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 2px solid #7c1225;
          padding-bottom: 8px;
          margin-bottom: 15px;
        ">
          <img src="Imagenes/Logos/logo.png" alt="Logo Secretaría de Cultura"
            style="height: 40px; width: auto;">
          <div style="display: flex; flex-direction: column; justify-content: center; margin-left: 80px;">
            <div style="font-size: 1.25rem; font-weight: 700; color: #7c1225;">
              Análisis de Tráfico Web - ${repoName}
            </div>
            <div style="font-size: 0.85rem; color: #555;">
              Reporte generado el ${createdDate}
            </div>
            ${dateInfo}
          </div>
        </div>

        <!-- Contenido -->
        <div class="analysis-text" style="
          max-height: 60vh;
          overflow-y: auto;
          padding-right: 10px;
          line-height: 1.6;
          font-size: 0.95rem;
        ">
          ${report.analysisHtml}
        </div>

        <!-- 🔥 Gráficas aquí -->
    <div id="savedChartsContainer" class="pdf-chart-container" style="margin-top: 25px;">
      <h5 style="color:#7c1225; font-weight:700;">Gráficas del análisis</h5>
      <div id="savedChartsInner"></div>
    </div>

      </div>
    `;

    modalBody.innerHTML = formattedContent;
    modalLabel.textContent = `Reporte Guardado (Gemini)`;

    const savedModal = new bootstrap.Modal(document.getElementById('savedReportModal'));
    savedModal.show();

    renderSavedCharts(
    window.geminiSavedAnalytics,
    window.geminiSavedWordpress,
    window.geminiSavedRange
    );


  } catch (error) {
    console.error("💥 Error general en verReporteGuardado:", error);
    alert("❌ Ocurrió un error al intentar cargar el reporte guardado.");
  }
}


function renderSavedCharts(analytics, wordpress, range) {
  const container = document.getElementById("savedChartsInner");
  if (!container) return;

  container.innerHTML = "";

  if (!analytics) {
    container.innerHTML = "<p>No hay datos históricos de tráfico para este reporte.</p>";
    return;
  }

  // Contenedor base para 4 gráficas
  container.innerHTML = `
    <canvas id="savedChartUsers"></canvas>
    <canvas id="savedChartSessions"></canvas>
    <canvas id="savedChartTrafficSources"></canvas>
    <canvas id="savedChartDevices"></canvas>
  `;

  // 🔥 Crear gráficas recicladas de tus funciones originales
  buildUsersChart("savedChartUsers", analytics);
  buildSessionsChart("savedChartSessions", analytics);
  buildTrafficChart("savedChartTrafficSources", analytics);
  buildDevicesChart("savedChartDevices", analytics);
}


// 📨 Reenvío del reporte guardado
const sendSavedReportButton = document.getElementById("sendSavedReportEmailButton");

if (!sendSavedReportButton) {
  console.warn("⚠️ No se encontró el botón #sendSavedReportEmailButton en el DOM.");
} else {
  sendSavedReportButton.addEventListener("click", async () => {
  const reportId = window.geminiSavedReportId;

  if (!reportId) {
    alert("⚠️ No hay reporte cargado. Vuelve a abrir uno desde el historial.");
    return;
  }

  // 🔄 Estado visual (se mantiene igual)
  const spinnerHtml = `
    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
    Enviando...
  `;
  const originalText = sendSavedReportButton.innerHTML;
  sendSavedReportButton.disabled = true;
  sendSavedReportButton.innerHTML = spinnerHtml;

  try {
    // ✅ USAR ENDPOINT DE REENVÍO
    const response = await fetch(
      `http://172.17.175.137:3000/api/reports/resend/${reportId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      }
    );

    const data = await response.json();
    console.log("📨 Respuesta del backend (reenvío):", data);

    if (data.success) {
      showToast(
        `✅ El reporte se reenvi\u00f3 correctamente a ${data.recipient || "el destinatario"}.`,
        "success"
      );

      // 🔒 Cerrar modal si todo salió bien
      const savedModal = bootstrap.Modal.getInstance(
        document.getElementById("savedReportModal")
      );
      if (savedModal) savedModal.hide();

    } else {
      showToast(`❌ Error al reenviar reporte: ${data.message}`, "error");
    }

  } catch (error) {
    console.error("💥 Error al reenviar reporte guardado:", error);
    showToast(
      "❌ Error de conexión con el servidor al intentar reenviar el reporte.",
      "error"
    );
  } finally {
    // 🔓 Restaurar botón SIEMPRE
    sendSavedReportButton.disabled = false;
    sendSavedReportButton.innerHTML = originalText;
  }
});

}

});
