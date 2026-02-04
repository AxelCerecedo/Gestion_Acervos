// ====================================================================
// pdf-generator.js (Versión Estructurada Manualmente)
// ====================================================================

/**
 * Configuración de eventos para botones
 */
function setupPdfDownload(buttonId, contentId, defaultFilename) {
    const downloadBtn = document.getElementById(buttonId);
    if (!downloadBtn) return;

    const spinner = downloadBtn.querySelector(".spinner-border");
    const btnTextSpan = downloadBtn.querySelector(".btn-text");
    const originalText = btnTextSpan ? btnTextSpan.textContent : "Descargar PDF";

    downloadBtn.addEventListener("click", async () => {
        const contentElement = document.getElementById(contentId);
        if (!contentElement || !contentElement.innerHTML.trim()) return;

        // UI State: Loading
        if (spinner) spinner.classList.remove("d-none");
        if (btnTextSpan) btnTextSpan.textContent = "Generando...";
        downloadBtn.disabled = true;

        try {
            await exportarPDFReporte(contentElement.innerHTML, defaultFilename);
        } catch (err) {
            console.error(`[PDF-ERROR]`, err);
        } finally {
            if (spinner) spinner.classList.add("d-none");
            if (btnTextSpan) btnTextSpan.textContent = originalText;
            downloadBtn.disabled = false;
        }
    });
}

// Inicialización
setupPdfDownload("downloadPdfButton", "analysisModalBody", "Reporte_Analytics_Principal.pdf");
setupPdfDownload("downloadSavedReportPdfButton", "savedReportModalBody", "Reporte_Guardado.pdf");

/**
 * Función Principal de Exportación de PDF
 * Versión: Estructurada con control de saltos de página
 */
async function exportarPDFReporte(analisisHTML, filename) {
    console.log(`[PDF-CORE] 🚀 Iniciando generación: ${filename}`);

    if (!window.html2pdf || !window.html2canvas) {
        alert("❌ Error: Librerías html2pdf o html2canvas no detectadas.");
        return;
    }

    // 1. CREACIÓN DEL CONTENEDOR TEMPORAL
    const container = document.createElement("div");
    Object.assign(container.style, {
        width: "100%",
        background: "#ffffff",
        fontFamily: "'Helvetica', 'Arial', sans-serif",
        padding: "0",
        color: "#000"
    });

    // 2. PROCESAMIENTO DEL TEXTO (Evitar cortes de línea)
    const textoWrapper = document.createElement("div");
    textoWrapper.innerHTML = analisisHTML;
    
    // Estilos generales del texto
    Object.assign(textoWrapper.style, {
        fontSize: "11pt",
        lineHeight: "1.6",
        textAlign: "justify",
        marginBottom: "30px"
    });

    // Aplicar reglas "anti-corte" a párrafos y listas
    const textElements = textoWrapper.querySelectorAll("p, li, h1, h2, h3, h4, blockquote");
    textElements.forEach(el => {
        el.style.pageBreakInside = "avoid"; // Estándar antiguo
        el.style.breakInside = "avoid";      // Estándar moderno
        el.style.marginBottom = "10pt";      // Espacio entre párrafos
        el.style.display = "block";          // Asegura que no sea inline
    });

    container.appendChild(textoWrapper);

    // 3. CAPTURA DE GRÁFICAS (Canvas a Imagen)
    const chartsConfig = [
        { id: "sessionsOverTimeChart", title: "Sesiones por día", subtitle: "Número de sesiones registradas cada día.", fullWidth: true },
        { id: "usersByDeviceChart", title: "Usuarios por dispositivo", subtitle: "Distribución de usuarios según el tipo de dispositivo usado.", fullWidth: false },
        { id: "newVsReturningChart", title: "Usuarios nuevos vs. recurrentes", subtitle: "Comparación entre usuarios nuevos y usuarios que regresan.", fullWidth: false },
        { id: "trafficSourcesChart", title: "Fuentes de tráfico", subtitle: "Principales canales que generan sesiones al sistema.", fullWidth: true }
    ];

    const chartsWrapper = document.createElement("div");
    let flexRow = null;
    let halfWidthIndex = 0;

    for (const cfg of chartsConfig) {
        const element = document.getElementById(cfg.id);
        if (!element) continue;

        // Captura manual de cada gráfica
        const canvas = await html2canvas(element, {
            scale: 2, // Mayor calidad
            useCORS: true,
            backgroundColor: "#ffffff"
        });
        const imgData = canvas.toDataURL("image/png");

        // Crear bloque contenedor de la gráfica
        const chartBlock = document.createElement("div");
        chartBlock.style.pageBreakInside = "avoid";
        chartBlock.style.breakInside = "avoid";
        chartBlock.style.marginBottom = "30px";

        chartBlock.innerHTML = `
            <div style="margin-bottom: 8px;">
                <h3 style="margin:0; font-size:13pt; font-weight:bold; color:#222;">${cfg.title}</h3>
                <p style="margin:0; font-size:10pt; color:#666;">${cfg.subtitle}</p>
            </div>
            <div style="text-align:center;">
                <img src="${imgData}" style="${cfg.fullWidth ? 'width:100%; max-height:10cm;' : 'width:100%; max-height:7cm;'}">
            </div>
        `;

        if (cfg.fullWidth) {
            chartsWrapper.appendChild(chartBlock);
        } else {
            if (halfWidthIndex % 2 === 0) {
                flexRow = document.createElement("div");
                Object.assign(flexRow.style, {
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px"
                });
                chartsWrapper.appendChild(flexRow);
            }
            chartBlock.style.width = "48%";
            flexRow.appendChild(chartBlock);
            halfWidthIndex++;
        }
    }
    container.appendChild(chartsWrapper);

    // 4. CLONACIÓN DE TABLAS
    const tables = [
        { id: "topPagesTable", title: "Vistas por página", desc: "Páginas con mayor actividad." },
        { id: "usersByCountryTable", title: "Usuarios por país", desc: "Distribución geográfica." }
    ];

    tables.forEach(t => {
        const original = document.getElementById(t.id);
        if (!original) return;

        const tableBox = document.createElement("div");
        tableBox.style.pageBreakInside = "avoid";
        tableBox.style.breakInside = "avoid";
        tableBox.style.marginTop = "30px";

        tableBox.innerHTML = `
            <h3 style="margin:0; font-size:13pt; font-weight:bold;">${t.title}</h3>
            <p style="margin:0 0 10px 0; font-size:10pt; color:#666;">${t.desc}</p>
        `;

        const clone = original.cloneNode(true);
        clone.style.width = "100%";
        clone.style.borderCollapse = "collapse";
        clone.querySelectorAll("th, td").forEach(cell => {
            Object.assign(cell.style, {
                border: "1px solid #ddd",
                padding: "8px",
                fontSize: "10pt",
                textAlign: "left"
            });
        });
        
        tableBox.appendChild(clone);
        container.appendChild(tableBox);
    });

    // 5. GENERACIÓN DEL PDF
    document.body.appendChild(container); // Necesario para que html2pdf lo vea

    const options = {
        margin: [1.5, 1.5, 1.5, 1.5], // Márgenes de 1.5cm en todos los lados
        filename: filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
            scale: 2, 
            useCORS: true,
            letterRendering: true 
        },
        jsPDF: { unit: "cm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // Configuración crítica para cortes
    };

    try {
        await html2pdf().set(options).from(container).save();
        console.log("[PDF-CORE] ✔ PDF generado con éxito");
    } catch (error) {
        console.error("[PDF-CORE] ❌ Error en generación:", error);
    } finally {
        container.remove(); // Limpiar el DOM
    }
}