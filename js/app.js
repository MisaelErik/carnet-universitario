/**
 * app.js — Controlador principal de la aplicación Foto Carné UNAC
 * Conecta todos los módulos y maneja la lógica de la UI.
 */

(function () {
    'use strict';

    // --- Renderizar iconos iniciales ---
    lucide.createIcons();

    // --- Cache de elementos DOM ---
    const el = {
        // Paso 1
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),

        // Paso 2
        btnBackTo1: document.getElementById('btnBackTo1'),
        tabAI: document.getElementById('tabAI'),
        tabManual: document.getElementById('tabManual'),
        panelAI: document.getElementById('panelAI'),
        panelManual: document.getElementById('panelManual'),
        previewStep2: document.getElementById('previewStep2'),
        btnRemoveBg: document.getElementById('btnRemoveBg'),
        aiStatus: document.getElementById('aiStatus'),
        manualCanvas: document.getElementById('manualCanvas'),
        toleranceSlider: document.getElementById('toleranceSlider'),
        manualMode: document.getElementById('manualMode'),
        btnResetManual: document.getElementById('btnResetManual'),
        btnSkipBg: document.getElementById('btnSkipBg'),
        btnConfirmBg: document.getElementById('btnConfirmBg'),

        // Paso 3
        imageCropper: document.getElementById('imageCropper'),
        cropContainer: document.getElementById('cropContainer'),
        zoomSlider: document.getElementById('zoomSlider'),
        btnApplyCrop: document.getElementById('btnApplyCrop'),
        btnBackTo2: document.getElementById('btnBackTo2'),

        // Paso 4
        btnBackTo3: document.getElementById('btnBackTo3'),
        previewFinal: document.getElementById('previewFinal'),
        docType: document.getElementById('docType'),
        docNumber: document.getElementById('docNumber'),
        docNumberError: document.getElementById('docNumberError'),
        btnGenerate: document.getElementById('btnGenerate'),
        suneduBox: document.getElementById('suneduBox'),
    };

    // --- Estado global ---
    let originalImageSrc = '';
    let workingImageSrc = '';
    let finalCroppedDataUrl = '';

    // --- Inicializar módulos ---
    StepManager.init();
    CropManager.init(el.imageCropper, el.cropContainer, el.zoomSlider);

    // ============================
    //  PASO 1: SUBIR FOTO
    // ============================

    // Drag & Drop en la zona de subida
    if (el.dropZone) {
        ['dragenter', 'dragover'].forEach(evt => {
            el.dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                el.dropZone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(evt => {
            el.dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                el.dropZone.classList.remove('dragover');
            });
        });

        el.dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                _handleFileUpload(files[0]);
            }
        });
    }

    el.fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) _handleFileUpload(file);
    });

    function _handleFileUpload(file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            Toast.error('Archivo inválido', 'Solo se permiten archivos de imagen (JPG, PNG, etc.).');
            return;
        }

        // Validar tamaño (10 MB máx)
        const MAX_SIZE_MB = 10;
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            Toast.error('Archivo muy grande', `La imagen excede el límite de ${MAX_SIZE_MB} MB. Usa una foto más ligera.`);
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            originalImageSrc = event.target.result;
            workingImageSrc = originalImageSrc;
            el.previewStep2.src = workingImageSrc;
            BackgroundRemoval.initManualCanvas(originalImageSrc, el.manualCanvas);
            StepManager.goTo(2);
            Toast.info('Foto cargada', 'Ahora puedes quitar el fondo de tu foto.');
        };

        reader.onerror = () => {
            Toast.error('Error de lectura', 'No se pudo leer el archivo. Intenta con otra imagen.');
        };

        reader.readAsDataURL(file);
    }

    // ============================
    //  PASO 2: QUITAR FONDO
    // ============================

    // Volver al paso 1
    el.btnBackTo1.addEventListener('click', () => {
        el.fileInput.value = '';
        StepManager.goTo(1);
    });

    // Tabs: IA / Manual
    el.tabAI.addEventListener('click', () => {
        el.tabAI.className = 'tab tab-active';
        el.tabManual.className = 'tab tab-inactive';
        el.panelAI.classList.remove('hidden');
        el.panelAI.classList.add('flex');
        el.panelManual.classList.add('hidden');
        el.panelManual.classList.remove('flex');
    });

    el.tabManual.addEventListener('click', () => {
        el.tabManual.className = 'tab tab-active';
        el.tabAI.className = 'tab tab-inactive';
        el.panelManual.classList.remove('hidden');
        el.panelManual.classList.add('flex');
        el.panelAI.classList.add('hidden');
        el.panelAI.classList.remove('flex');
    });

    // IA: Quitar fondo automáticamente
    el.btnRemoveBg.addEventListener('click', () => {
        if (!originalImageSrc) {
            Toast.warning('Sin imagen', 'Primero sube una foto en el paso 1.');
            return;
        }

        BackgroundRemoval.removeWithAI(
            originalImageSrc,
            el.btnRemoveBg,
            el.aiStatus,
            el.previewStep2,
            (newSrc) => {
                workingImageSrc = newSrc;
                BackgroundRemoval.initManualCanvas(workingImageSrc, el.manualCanvas);
            }
        );
    });

    // Manual: Reset
    el.btnResetManual.addEventListener('click', () => {
        workingImageSrc = originalImageSrc;
        el.previewStep2.src = originalImageSrc;
        BackgroundRemoval.initManualCanvas(originalImageSrc, el.manualCanvas);

        // Reset botón de IA
        el.btnRemoveBg.innerHTML = '<i data-lucide="wand-2" class="w-5 h-5"></i> Recortarme Mágicamente (IA)';
        el.btnRemoveBg.classList.remove('btn-success');
        el.btnRemoveBg.classList.add('btn-accent');
        lucide.createIcons();

        Toast.info('Reseteo completado', 'Se restauró la imagen original.');
    });

    // Manual: Clic en canvas
    el.manualCanvas.addEventListener('click', (e) => {
        const tolerance = parseInt(el.toleranceSlider.value);
        const mode = el.manualMode.value;

        const newSrc = BackgroundRemoval.processManualClick(e, el.manualCanvas, tolerance, mode);
        if (newSrc) {
            workingImageSrc = newSrc;
            el.previewStep2.src = workingImageSrc;
        }
    });

    // Botones de paso 2
    el.btnSkipBg.addEventListener('click', () => {
        CropManager.setupImage(originalImageSrc);
        StepManager.goTo(3);
    });

    el.btnConfirmBg.addEventListener('click', () => {
        CropManager.setupImage(workingImageSrc);
        StepManager.goTo(3);
    });

    // ============================
    //  PASO 3: ENCUADRE
    // ============================

    el.btnBackTo2.addEventListener('click', () => StepManager.goTo(2));

    el.btnApplyCrop.addEventListener('click', () => {
        finalCroppedDataUrl = CropManager.generateCrop();
        if (finalCroppedDataUrl) {
            el.previewFinal.src = finalCroppedDataUrl;
            StepManager.goTo(4);
        }
    });

    // ============================
    //  PASO 4: EXPORTAR
    // ============================

    el.btnBackTo3.addEventListener('click', () => StepManager.goTo(3));

    // Validación inline del campo de documento
    el.docNumber.addEventListener('input', () => {
        if (el.docNumber.value.trim()) {
            _clearFieldError(el.docNumber, el.docNumberError);
        }
    });

    el.btnGenerate.addEventListener('click', () => {
        const docNumber = el.docNumber.value.trim();

        // Validar campo
        if (!docNumber) {
            _showFieldError(el.docNumber, el.docNumberError);
            return;
        }

        _clearFieldError(el.docNumber, el.docNumberError);

        // Estado de loading
        el.btnGenerate.disabled = true;
        el.btnGenerate.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Guardando...';
        lucide.createIcons();

        const { width, height } = CropManager.getDimensions();

        setTimeout(() => {
            Exporter.downloadPhoto({
                croppedDataUrl: finalCroppedDataUrl,
                docType: el.docType.value,
                docNumber: docNumber,
                width: width,
                height: height,
                onSuccess: () => {
                    el.btnGenerate.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i> Foto Descargada';
                    el.btnGenerate.classList.add('btn-success');
                    el.suneduBox.classList.remove('hidden');
                    lucide.createIcons();

                    // Resetear botón después de unos segundos
                    setTimeout(() => {
                        el.btnGenerate.disabled = false;
                        el.btnGenerate.innerHTML = '<i data-lucide="download" class="w-5 h-5"></i> Descargar Foto';
                        el.btnGenerate.classList.remove('btn-success');
                        lucide.createIcons();
                    }, 4000);
                },
                onError: () => {
                    el.btnGenerate.disabled = false;
                    el.btnGenerate.innerHTML = '<i data-lucide="download" class="w-5 h-5"></i> Descargar Foto';
                    lucide.createIcons();
                }
            });
        }, 100);
    });

    // --- Utilidades de validación ---
    function _showFieldError(input, errorEl) {
        input.classList.add('input-error');
        errorEl.classList.remove('hidden');
        input.focus();
        lucide.createIcons();
    }

    function _clearFieldError(input, errorEl) {
        input.classList.remove('input-error');
        errorEl.classList.add('hidden');
    }

})();
