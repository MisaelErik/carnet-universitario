/**
 * toast.js — Sistema de notificaciones toast
 * Reemplaza los alert() nativos por toasts elegantes.
 */

const Toast = (() => {
    const ICONS = {
        error: 'alert-triangle',
        success: 'check-circle',
        warning: 'alert-circle',
        info: 'info'
    };

    const DEFAULTS = {
        duration: 5000,
        type: 'info'
    };

    /**
     * Muestra un toast
     * @param {Object} options
     * @param {string} options.title - Título del toast (obligatorio)
     * @param {string} [options.message] - Mensaje descriptivo
     * @param {'error'|'success'|'warning'|'info'} [options.type='info'] - Tipo de toast
     * @param {number} [options.duration=5000] - Duración en ms (0 = permanente)
     */
    function show({ title, message = '', type = DEFAULTS.type, duration = DEFAULTS.duration }) {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.warn('[Toast] No se encontró #toastContainer en el DOM.');
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');

        toast.innerHTML = `
            <i data-lucide="${ICONS[type] || ICONS.info}" class="toast-icon"></i>
            <div class="toast-body">
                <div class="toast-title">${_escapeHTML(title)}</div>
                ${message ? `<div class="toast-message">${_escapeHTML(message)}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Cerrar">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;

        container.appendChild(toast);

        // Renderizar iconos del toast
        if (window.lucide) lucide.createIcons({ nodes: [toast] });

        // Cerrar manualmente
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => _dismiss(toast));

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => _dismiss(toast), duration);
        }

        return toast;
    }

    function _dismiss(toast) {
        if (!toast || toast.classList.contains('toast-exiting')) return;
        toast.classList.add('toast-exiting');
        toast.addEventListener('animationend', () => toast.remove());
    }

    function _escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Atajos
    function error(title, message) { return show({ title, message, type: 'error', duration: 7000 }); }
    function success(title, message) { return show({ title, message, type: 'success' }); }
    function warning(title, message) { return show({ title, message, type: 'warning' }); }
    function info(title, message) { return show({ title, message, type: 'info' }); }

    return { show, error, success, warning, info };
})();
