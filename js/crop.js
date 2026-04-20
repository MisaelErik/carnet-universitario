/**
 * crop.js — Sistema de recorte / encuadre de la foto
 */

const CropManager = (() => {
    const CROP_W = 240;
    const CROP_H = 288;

    let _imgObj = new Image();
    let _scale = 1;
    let _baseScale = 1;
    let _ox = 0;
    let _oy = 0;

    // Estado de drag
    let _isDragging = false;
    let _startX = 0, _startY = 0;
    let _initOx = 0, _initOy = 0;

    // Refs
    let _cropper = null;
    let _container = null;
    let _zoomSlider = null;

    /**
     * Inicializa el crop manager con los elementos del DOM
     */
    function init(cropperEl, containerEl, zoomSliderEl) {
        _cropper = cropperEl;
        _container = containerEl;
        _zoomSlider = zoomSliderEl;

        if (!_cropper || !_container || !_zoomSlider) {
            console.error('[Crop] Faltan elementos del DOM para inicializar.');
            return;
        }

        // Eventos de zoom
        _zoomSlider.addEventListener('input', _updateCrop);

        // Eventos de drag
        _container.addEventListener('mousedown', _dragStart);
        window.addEventListener('mousemove', _dragMove);
        window.addEventListener('mouseup', _dragEnd);
        _container.addEventListener('touchstart', _dragStart, { passive: false });
        window.addEventListener('touchmove', _dragMove, { passive: false });
        window.addEventListener('touchend', _dragEnd);
    }

    /**
     * Configura la imagen para recortar
     * @param {string} src - URL de la imagen a recortar
     */
    function setupImage(src) {
        _imgObj.onload = () => {
            _cropper.src = src;

            const sX = CROP_W / _imgObj.naturalWidth;
            const sY = CROP_H / _imgObj.naturalHeight;
            _baseScale = Math.max(sX, sY);

            _zoomSlider.min = 1;
            _zoomSlider.max = 3;
            _zoomSlider.value = 1;

            _updateCrop();

            // Centrar imagen
            _ox = (CROP_W - (_imgObj.naturalWidth * _scale)) / 2;
            _oy = (CROP_H - (_imgObj.naturalHeight * _scale)) / 2;
            _applyTransform();
        };

        _imgObj.onerror = () => {
            Toast.error('Error de imagen', 'No se pudo cargar la imagen para recortar.');
        };

        _imgObj.src = src;
    }

    /**
     * Genera el recorte final como Data URL
     * @returns {string} Data URL de la imagen recortada
     */
    function generateCrop() {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = CROP_W;
            canvas.height = CROP_H;
            const ctx = canvas.getContext('2d');

            // Fondo blanco
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, CROP_W, CROP_H);

            const dw = _imgObj.naturalWidth * _scale;
            const dh = _imgObj.naturalHeight * _scale;
            ctx.drawImage(_imgObj, _ox, _oy, dw, dh);

            return canvas.toDataURL('image/jpeg', 1.0);
        } catch (error) {
            console.error('[Crop] Error al generar recorte:', error);
            Toast.error('Error de recorte', 'No se pudo generar la imagen recortada. Intenta de nuevo.');
            return null;
        }
    }

    /** Obtiene las dimensiones estándar del crops */
    function getDimensions() {
        return { width: CROP_W, height: CROP_H };
    }

    // --- Internos ---

    function _updateCrop() {
        _scale = _baseScale * parseFloat(_zoomSlider.value);
        _clamp();
        _applyTransform();
    }

    function _clamp() {
        const dw = _imgObj.naturalWidth * _scale;
        const dh = _imgObj.naturalHeight * _scale;
        _ox = Math.max(CROP_W - dw, Math.min(0, _ox));
        _oy = Math.max(CROP_H - dh, Math.min(0, _oy));
    }

    function _applyTransform() {
        if (!_cropper) return;
        _cropper.style.width = `${_imgObj.naturalWidth * _scale}px`;
        _cropper.style.height = `${_imgObj.naturalHeight * _scale}px`;
        _cropper.style.transform = `translate(${_ox}px, ${_oy}px)`;
    }

    function _getPos(e) {
        return e.touches
            ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
            : { x: e.clientX, y: e.clientY };
    }

    function _dragStart(e) {
        _isDragging = true;
        const pos = _getPos(e);
        _startX = pos.x;
        _startY = pos.y;
        _initOx = _ox;
        _initOy = _oy;
    }

    function _dragMove(e) {
        if (!_isDragging) return;
        e.preventDefault();
        const pos = _getPos(e);
        _ox = _initOx + (pos.x - _startX);
        _oy = _initOy + (pos.y - _startY);
        _clamp();
        _applyTransform();
    }

    function _dragEnd() {
        _isDragging = false;
    }

    return { init, setupImage, generateCrop, getDimensions };
})();
