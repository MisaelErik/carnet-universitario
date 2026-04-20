/**
 * app.js — Controlador principal (Actualizado con Soporte de Borrador)
 */

(function () {
    'use strict';
    lucide.createIcons();

    const el = {
        fileInput: document.getElementById('fileInput'),
        dropZone: document.getElementById('dropZone'),
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
        valTolerance: document.getElementById('valTolerance'),
        manualMode: document.getElementById('manualMode'),
        btnResetManual: document.getElementById('btnResetManual'),
        btnSkipBg: document.getElementById('btnSkipBg'),
        btnConfirmBg: document.getElementById('btnConfirmBg'),
        
        // Nuevos controles manuales
        btnToolWand: document.getElementById('btnToolWand'),
        btnToolEraser: document.getElementById('btnToolEraser'),
        boxTolerance: document.getElementById('boxTolerance'),
        boxBrushSize: document.getElementById('boxBrushSize'),
        brushSlider: document.getElementById('brushSlider'),
        valBrush: document.getElementById('valBrush'),

        imageCropper: document.getElementById('imageCropper'),
        cropContainer: document.getElementById('cropContainer'),
        zoomSlider: document.getElementById('zoomSlider'),
        btnApplyCrop: document.getElementById('btnApplyCrop'),
        btnBackTo2: document.getElementById('btnBackTo2'),
        btnBackTo3: document.getElementById('btnBackTo3'),
        previewFinal: document.getElementById('previewFinal'),
        docType: document.getElementById('docType'),
        docNumber: document.getElementById('docNumber'),
        docNumberError: document.getElementById('docNumberError'),
        btnGenerate: document.getElementById('btnGenerate'),
        suneduBox: document.getElementById('suneduBox'),
    };

    let originalImageSrc = '';
    let workingImageSrc = '';
    let finalCroppedDataUrl = '';
    let activeManualTool = 'wand'; // 'wand' o 'eraser'
    let isDrawing = false;

    StepManager.init();
    CropManager.init(el.imageCropper, el.cropContainer, el.zoomSlider);

    // --- SUBIDA ---
    el.fileInput.addEventListener('change', (e) => { if (e.target.files[0]) _handleFileUpload(e.target.files[0]); });
    function _handleFileUpload(file) {
        if (!file.type.startsWith('image/')) { Toast.error('Archivo no válido'); return; }
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImageSrc = e.target.result;
            workingImageSrc = originalImageSrc;
            el.previewStep2.src = workingImageSrc;
            BackgroundRemoval.initManualCanvas(originalImageSrc, el.manualCanvas);
            StepManager.goTo(2);
        };
        reader.readAsDataURL(file);
    }

    // --- HERRAMIENTAS MANUALES ---
    el.btnToolWand.addEventListener('click', () => {
        activeManualTool = 'wand';
        el.btnToolWand.classList.add('bg-brand-100', 'text-brand-700');
        el.btnToolEraser.classList.remove('bg-brand-100', 'text-brand-700');
        el.boxTolerance.classList.remove('hidden');
        el.boxBrushSize.classList.add('hidden');
    });

    el.btnToolEraser.addEventListener('click', () => {
        activeManualTool = 'eraser';
        el.btnToolEraser.classList.add('bg-brand-100', 'text-brand-700');
        el.btnToolWand.classList.remove('bg-brand-100', 'text-brand-700');
        el.boxBrushSize.classList.remove('hidden');
        el.boxTolerance.classList.add('hidden');
    });

    el.toleranceSlider.addEventListener('input', () => el.valTolerance.innerText = el.toleranceSlider.value);
    el.brushSlider.addEventListener('input', () => el.valBrush.innerText = el.brushSlider.value);

    // Eventos del Canvas
    el.manualCanvas.addEventListener('mousedown', (e) => {
        if (activeManualTool === 'wand') {
            const rect = el.manualCanvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) * (el.manualCanvas.width / rect.width));
            const y = Math.floor((e.clientY - rect.top) * (el.manualCanvas.height / rect.height));
            const newSrc = BackgroundRemoval.processWand(x, y, el.manualCanvas, parseInt(el.toleranceSlider.value), el.manualMode.value);
            if (newSrc) { workingImageSrc = newSrc; el.previewStep2.src = newSrc; }
        } else {
            isDrawing = true;
            _handleEraser(e);
        }
    });

    window.addEventListener('mousemove', (e) => { if (isDrawing) _handleEraser(e); });
    window.addEventListener('mouseup', () => { isDrawing = false; });

    function _handleEraser(e) {
        const rect = el.manualCanvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (el.manualCanvas.width / rect.width);
        const y = (e.clientY - rect.top) * (el.manualCanvas.height / rect.height);
        const newSrc = BackgroundRemoval.processEraser(x, y, el.manualCanvas, parseInt(el.brushSlider.value));
        if (newSrc) { workingImageSrc = newSrc; el.previewStep2.src = newSrc; }
    }

    // IA
    el.btnRemoveBg.addEventListener('click', () => {
        BackgroundRemoval.removeWithAI(originalImageSrc, el.btnRemoveBg, el.aiStatus, el.previewStep2, (newSrc) => {
            workingImageSrc = newSrc;
            BackgroundRemoval.initManualCanvas(workingImageSrc, el.manualCanvas);
        });
    });

    el.btnResetManual.addEventListener('click', () => {
        workingImageSrc = originalImageSrc; el.previewStep2.src = originalImageSrc;
        BackgroundRemoval.initManualCanvas(originalImageSrc, el.manualCanvas);
        Toast.info('Imagen restaurada');
    });

    el.btnConfirmBg.addEventListener('click', () => { CropManager.setupImage(workingImageSrc); StepManager.goTo(3); });
    el.btnSkipBg.addEventListener('click', () => { CropManager.setupImage(originalImageSrc); StepManager.goTo(3); });

    // CROP y EXPORT
    el.btnApplyCrop.addEventListener('click', () => {
        finalCroppedDataUrl = CropManager.generateCrop();
        if (finalCroppedDataUrl) { el.previewFinal.src = finalCroppedDataUrl; StepManager.goTo(4); }
    });

    el.btnGenerate.addEventListener('click', () => {
        const doc = el.docNumber.value.trim();
        if (!doc) { el.docNumber.classList.add('input-error'); return; }
        Exporter.downloadPhoto({
            croppedDataUrl: finalCroppedDataUrl, docType: el.docType.value, docNumber: doc,
            width: 240, height: 288,
            onSuccess: () => { el.suneduBox.classList.remove('hidden'); }
        });
    });

    el.btnBackTo1.addEventListener('click', () => StepManager.goTo(1));
    el.btnBackTo2.addEventListener('click', () => StepManager.goTo(2));
    el.btnBackTo3.addEventListener('click', () => StepManager.goTo(3));

})();
