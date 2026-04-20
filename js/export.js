/**
 * export.js — Exportación de la foto final con metadatos JPEG
 */

const Exporter = (() => {
    /**
     * Inserta metadatos de DPI en un JPEG base64
     * @param {string} base64Image - Data URL JPEG
     * @param {number} dpi - DPI deseado (ej: 300)
     * @returns {string} Data URL con DPI corregido
     */
    function setDPIInJPEG(base64Image, dpi) {
        try {
            const dataString = atob(base64Image.split(',')[1]);
            const bytes = new Uint8Array(dataString.length);
            for (let i = 0; i < dataString.length; i++) {
                bytes[i] = dataString.charCodeAt(i);
            }

            // Buscar marcador JFIF
            let found = false;
            for (let i = 0; i < Math.min(30, bytes.length - 4); i++) {
                if (bytes[i] === 0x4A && bytes[i + 1] === 0x46 &&
                    bytes[i + 2] === 0x49 && bytes[i + 3] === 0x46) {
                    bytes[i + 7] = 1; // DPI units
                    bytes[i + 8] = Math.floor(dpi / 256);
                    bytes[i + 9] = dpi % 256;
                    bytes[i + 10] = Math.floor(dpi / 256);
                    bytes[i + 11] = dpi % 256;
                    found = true;
                    break;
                }
            }

            if (!found) {
                console.warn('[Export] No se encontró marcador JFIF, DPI no fue modificado.');
            }

            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return 'data:image/jpeg;base64,' + btoa(binary);
        } catch (error) {
            console.error('[Export] Error al modificar DPI:', error);
            // Retornar imagen sin modificar
            return base64Image;
        }
    }

    /**
     * Genera y descarga la foto final
     * @param {Object} options
     * @param {string} options.croppedDataUrl - Data URL de la imagen recortada
     * @param {string} options.docType - Tipo de documento (1-4)
     * @param {string} options.docNumber - Número de documento
     * @param {number} options.width - Ancho del canvas
     * @param {number} options.height - Alto del canvas
     * @param {function} options.onSuccess - Callback al completar
     * @param {function} options.onError - Callback de error
     */
    function downloadPhoto({ croppedDataUrl, docType, docNumber, width, height, onSuccess, onError }) {
        if (!croppedDataUrl) {
            Toast.error('Sin imagen', 'No hay imagen recortada para descargar. Vuelve al paso anterior.');
            if (onError) onError();
            return;
        }

        const img = new Image();

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // Comprimir si es necesario (máximo ~49 KB)
                let quality = 0.95;
                let resultUrl = canvas.toDataURL('image/jpeg', quality);

                while (Math.round(resultUrl.length * 0.75) > 49000 && quality > 0.1) {
                    quality -= 0.05;
                    resultUrl = canvas.toDataURL('image/jpeg', quality);
                }

                // Insertar DPI de 300
                const finalUrl = setDPIInJPEG(resultUrl, 300);

                // Descargar
                const fileName = `${docType}_${docNumber.trim()}.jpg`;
                const link = document.createElement('a');
                link.download = fileName;
                link.href = finalUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                Toast.success('¡Foto descargada!', `Archivo: ${fileName}`);
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error('[Export] Error al exportar:', error);
                Toast.error('Error al exportar', 'No se pudo generar el archivo. Intenta de nuevo.');
                if (onError) onError();
            }
        };

        img.onerror = () => {
            Toast.error('Error de imagen', 'No se pudo procesar la imagen para exportar.');
            if (onError) onError();
        };

        img.src = croppedDataUrl;
    }

    return { downloadPhoto, setDPIInJPEG };
})();
