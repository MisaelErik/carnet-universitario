/**
 * steps.js — Navegación entre pasos del wizard
 */

const StepManager = (() => {
    const TOTAL_STEPS = 4;

    // Referencias cacheadas
    let _stepElements = [];
    let _indicator = null;
    let _badgeNumber = null;
    let _progressBar = null;
    let _currentStep = 1;

    function init() {
        _stepElements = [
            document.getElementById('step1'),
            document.getElementById('step2'),
            document.getElementById('step3'),
            document.getElementById('step4')
        ];
        _indicator = document.getElementById('stepIndicator');
        _badgeNumber = document.getElementById('stepBadgeNumber');
        _progressBar = document.getElementById('progressBar');

        // Verificar que existen
        const missing = _stepElements.findIndex(el => !el);
        if (missing !== -1) {
            console.error(`[Steps] Falta el elemento #step${missing + 1} en el DOM.`);
        }
    }

    /**
     * Navega a un paso del wizard
     * @param {number} stepNumber - Número del paso (1-4)
     */
    function goTo(stepNumber) {
        if (stepNumber < 1 || stepNumber > TOTAL_STEPS) {
            console.error(`[Steps] Paso inválido: ${stepNumber}. Debe estar entre 1 y ${TOTAL_STEPS}.`);
            return;
        }

        _currentStep = stepNumber;

        _stepElements.forEach((section, idx) => {
            if (!section) return;
            if (idx + 1 === stepNumber) {
                section.classList.remove('step-hidden');
            } else {
                section.classList.add('step-hidden');
            }
        });

        // Actualizar indicador
        if (_indicator) {
            const spanStep = _indicator.querySelector('span:last-child');
            if (spanStep) {
                spanStep.innerHTML = `Paso ${stepNumber} <span class="opacity-60">de ${TOTAL_STEPS}</span>`;
            }
        }

        // Actualizar badge numérico
        if (_badgeNumber) {
            _badgeNumber.textContent = stepNumber;
        }

        // Actualizar barra de progreso
        if (_progressBar) {
            const percent = (stepNumber / TOTAL_STEPS) * 100;
            _progressBar.style.width = `${percent}%`;
        }

        // Scroll suave al inicio
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function getCurrent() {
        return _currentStep;
    }

    return { init, goTo, getCurrent };
})();
