/**
 * background-removal.js — Remoción de fondo (IA + Manual + Borrador)
 */

const BackgroundRemoval = (() => {
    let _manualCtx = null;
    let _manualImgData = null;
    const _manualImg = new Image();

    /**
     * Remoción por IA usando Import Map
     */
    async function removeWithAI(originalImageSrc, btnRemoveBg, aiStatus, previewImg, onSuccess) {
        btnRemoveBg.disabled = true;
        btnRemoveBg.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Cargando IA...';
        aiStatus.classList.remove('hidden');
        lucide.createIcons();

        try {
            if (!window.imglyRemoveBackground) {
                try {
                    // Usamos la dirección directa pero ahora el navegador sabe resolver 'lodash' vía el Import Map
                    const module = await import("https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.4.3/dist/index.mjs");
                    window.imglyRemoveBackground = module.default || module;
                } catch (e) {
                    throw new Error('Error al inicializar modelos de IA. Prueba la Varita Manual.');
                }
            }

            btnRemoveBg.innerHTML = '<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Analizando cuerpo...';
            lucide.createIcons();

            const imageBlob = await window.imglyRemoveBackground(originalImageSrc);
            const newSrc = URL.createObjectURL(imageBlob);

            previewImg.src = newSrc;
            btnRemoveBg.innerHTML = '<i data-lucide="check" class="w-5 h-5"></i> IA Completada';
            btnRemoveBg.classList.replace('btn-accent', 'btn-success');
            aiStatus.classList.add('hidden');

            onSuccess(newSrc);
        } catch (error) {
            console.error("[BackgroundRemoval] Fallo IA:", error);
            Toast.error('IA saturada o bloqueada', 'Se ha activado el modo manual para que puedas borrar el fondo tú mismo.');
            btnRemoveBg.innerHTML = '<i data-lucide="wand-2" class="w-5 h-5"></i> Reintentar IA';
            aiStatus.classList.add('hidden');
        } finally {
            btnRemoveBg.disabled = false;
            lucide.createIcons();
        }
    }

    function initManualCanvas(src, canvas) {
        _manualImg.onload = () => {
            const MAX_SIZE = 800;
            let w = _manualImg.width, h = _manualImg.height;
            if (w > MAX_SIZE || h > MAX_SIZE) {
                const ratio = Math.min(MAX_SIZE / w, MAX_SIZE / h);
                w = Math.round(w * ratio); h = Math.round(h * ratio);
            }
            canvas.width = w; canvas.height = h;
            _manualCtx = canvas.getContext('2d');
            _manualCtx.drawImage(_manualImg, 0, 0, w, h);
            _manualImgData = _manualCtx.getImageData(0, 0, w, h);
        };
        _manualImg.src = src;
    }

    /**
     * Varita Mágica Optimizada
     */
    function processWand(startX, startY, canvas, tolerance, mode) {
        if (!_manualImgData) return null;
        const w = canvas.width, h = canvas.height;
        const data = _manualImgData.data;

        const targetPos = (startY * w + startX) * 4;
        const tR = data[targetPos], tG = data[targetPos + 1], tB = data[targetPos + 2], tA = data[targetPos + 3];

        if (tA === 0) return null;

        if (mode === "global") {
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] === 0) continue;
                const dist = Math.sqrt((data[i]-tR)**2 + (data[i+1]-tG)**2 + (data[i+2]-tB)**2);
                if (dist <= tolerance) data[i + 3] = 0;
            }
        } else {
            const stack = [startX, startY];
            const visited = new Uint8Array(w * h);
            while (stack.length > 0) {
                const y = stack.pop(), x = stack.pop();
                const idx = y * w + x;
                if (x < 0 || x >= w || y < 0 || y >= h || visited[idx]) continue;
                visited[idx] = 1;
                const p = idx * 4;
                if (data[p + 3] === 0) continue;
                const dist = Math.sqrt((data[p]-tR)**2 + (data[p+1]-tG)**2 + (data[p+2]-tB)**2);
                if (dist <= tolerance) {
                    data[p+3] = 0;
                    stack.push(x+1, y, x-1, y, x, y+1, x, y-1);
                }
            }
        }
        _manualCtx.putImageData(_manualImgData, 0, 0);
        return canvas.toDataURL('image/png');
    }

    /**
     * Goma de Borrar (Pincel)
     */
    function processEraser(x, y, canvas, size) {
        if (!_manualCtx) return null;
        _manualCtx.globalCompositeOperation = 'destination-out';
        _manualCtx.beginPath();
        _manualCtx.arc(x, y, size / 2, 0, Math.PI * 2);
        _manualCtx.fill();
        _manualCtx.globalCompositeOperation = 'source-over';
        
        // Actualizar datos de imagen actuales
        _manualImgData = _manualCtx.getImageData(0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/png');
    }

    return { removeWithAI, initManualCanvas, processWand, processEraser };
})();
