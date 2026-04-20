/**
 * background-removal.js — Remoción de fondo (IA + Manual)
 */

const BackgroundRemoval = (() => {
    let _manualCtx = null;
    let _manualImgData = null;
    const _manualImg = new Image();

    /**
     * Carga dinámica de la librería imgly para remoción de fondo por IA
     * @param {string} originalImageSrc - Data URL de la imagen original
     * @param {HTMLElement} btnRemoveBg - Botón de remoción
     * @param {HTMLElement} aiStatus - Elemento de estado
     * @param {HTMLImageElement} previewImg - Imagen de preview
     * @param {function} onSuccess - Callback con la nueva URL de la imagen
     */
    async function removeWithAI(originalImageSrc, btnRemoveBg, aiStatus, previewImg, onSuccess) {
        btnRemoveBg.disabled = true;
        btnRemoveBg.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Cargando IA...';
        aiStatus.classList.remove('hidden');
        lucide.createIcons();

        try {
            if (!window.imglyRemoveBackground) {
                try {
                    // Importamos el módulo ESM resolviendo dependencias mediante esm.sh (soporta mejor lodash)
                    const module = await import("https://esm.sh/@imgly/background-removal@1.4.3?bundle-deps");
                    window.imglyRemoveBackground = module.default || module;
                } catch (e) {
                    throw new Error('No se pudo cargar la librería de IA: ' + e.message);
                }
            }

            btnRemoveBg.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Recortando persona...';
            lucide.createIcons();

            // Ejecutar la IA. Se descargará el modelo ONNX en caché.
            // No pasamos publicPath para que use el default (staticimgly.com)
            const imageBlob = await window.imglyRemoveBackground(originalImageSrc);

            const newSrc = URL.createObjectURL(imageBlob);

            previewImg.src = newSrc;

            btnRemoveBg.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i> ¡Fondo exterior eliminado!';
            btnRemoveBg.classList.add('btn-success');
            btnRemoveBg.classList.remove('btn-accent');
            aiStatus.classList.add('hidden');

            onSuccess(newSrc);
        } catch (error) {
            console.error("[BackgroundRemoval] Error IA:", error);
            Toast.error(
                'IA no disponible',
                'La conexión a los servidores de IA fue bloqueada. Usa la pestaña "Varita Manual" para borrar tu fondo.'
            );
            btnRemoveBg.innerHTML = '<i data-lucide="wand-2" class="w-5 h-5"></i> Recortarme Mágicamente (IA)';
            aiStatus.classList.add('hidden');
        } finally {
            btnRemoveBg.disabled = false;
            lucide.createIcons();
        }
    }

    /**
     * Inicializa el canvas manual con la imagen dada
     */
    function initManualCanvas(src, canvas) {
        _manualImg.onload = () => {
            const MAX_SIZE = 600;
            let w = _manualImg.width, h = _manualImg.height;

            if (w > MAX_SIZE || h > MAX_SIZE) {
                const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }

            canvas.width = w;
            canvas.height = h;
            _manualCtx = canvas.getContext('2d');
            _manualCtx.drawImage(_manualImg, 0, 0, w, h);
            _manualImgData = _manualCtx.getImageData(0, 0, w, h);
        };
        _manualImg.src = src;
    }

    /**
     * Procesar clic de varita mágica en el canvas
     */
    function processManualClick(e, canvas, tolerance, mode) {
        if (!_manualImgData) {
            Toast.warning('No hay imagen', 'Primero sube una foto antes de usar la varita.');
            return null;
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const startX = Math.floor((e.clientX - rect.left) * scaleX);
        const startY = Math.floor((e.clientY - rect.top) * scaleY);

        const w = canvas.width;
        const h = canvas.height;
        const data = _manualImgData.data;

        // Verificar que el clic está dentro de los límites
        if (startX < 0 || startX >= w || startY < 0 || startY >= h) {
            return null;
        }

        const targetPos = (startY * w + startX) * 4;
        const tR = data[targetPos], tG = data[targetPos + 1],
              tB = data[targetPos + 2], tA = data[targetPos + 3];

        // Ya es transparente
        if (tA === 0) return null;

        const isContiguous = mode === "contiguous";

        if (!isContiguous) {
            // Modo global: borrar todos los píxeles de ese color
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) continue;
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const dist = Math.sqrt((r - tR) ** 2 + (g - tG) ** 2 + (b - tB) ** 2);
                if (dist <= tolerance) data[i + 3] = 0;
            }
        } else {
            // Modo contiguo: flood fill
            const stack = [startX, startY];
            const visited = new Uint8Array(w * h);

            while (stack.length > 0) {
                const y = stack.pop();
                const x = stack.pop();
                const idx = y * w + x;

                if (x < 0 || x >= w || y < 0 || y >= h || visited[idx]) continue;
                visited[idx] = 1;

                const p = idx * 4;
                if (data[p + 3] === 0) continue;

                const r = data[p], g = data[p + 1], b = data[p + 2];
                const dist = Math.sqrt((r - tR) ** 2 + (g - tG) ** 2 + (b - tB) ** 2);

                if (dist <= tolerance) {
                    data[p + 3] = 0;
                    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
                }
            }
        }

        _manualCtx.putImageData(_manualImgData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    return { removeWithAI, initManualCanvas, processManualClick };
})();
