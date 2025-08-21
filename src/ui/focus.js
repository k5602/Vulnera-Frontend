// Focus management helpers
const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input[type="text"], input[type="file"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])';

export function trapFocus(modalRoot) {
  if (!modalRoot) return () => {};
  const focusable = Array.from(modalRoot.querySelectorAll(FOCUSABLE_SELECTOR)).filter(el => el.offsetParent !== null);
  if (focusable.length) focusable[0].focus();
  function handleKey(e) {
    if (e.key === 'Tab') {
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    } else if (e.key === 'Escape') {
      // Close modal if escape
      const toggle = modalRoot.previousElementSibling; // checkbox
      if (toggle && toggle.type === 'checkbox') {
        toggle.checked = false;
        toggle.dispatchEvent(new Event('change'));
      }
    }
  }
  modalRoot.addEventListener('keydown', handleKey);
  return () => modalRoot.removeEventListener('keydown', handleKey);
}

export function onModalToggle(modalCheckboxId, { onOpen, onClose } = {}) {
  const checkbox = document.getElementById(modalCheckboxId);
  if (!checkbox) return;
  const modalBox = checkbox.nextElementSibling; // DaisyUI structure
  let release = null;
  let lastFocused = null;
  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      lastFocused = document.activeElement;
      if (onOpen) onOpen(modalBox);
      release = trapFocus(modalBox);
    } else {
      if (release) release();
      if (onClose && onClose(modalBox) !== false) {
        if (lastFocused && lastFocused.focus) lastFocused.focus();
      } else if (lastFocused && lastFocused.focus) {
        lastFocused.focus();
      }
    }
  });
}
