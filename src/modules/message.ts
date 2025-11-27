export class message {
  errorDiv: HTMLElement;
  successDiv: HTMLElement;

  constructor(errorDiv: HTMLElement, successDiv: HTMLElement) {
    this.errorDiv = errorDiv;
    this.successDiv = successDiv;
  }

  showError(msg: string) {
    this.errorDiv.textContent = msg;
    this.errorDiv.classList.remove("hidden");
    this.successDiv.classList.add("hidden");
  }

  showSuccess(msg: string) {
    this.successDiv.textContent = msg;
    this.successDiv.classList.remove("hidden");
    this.errorDiv.classList.add("hidden");
  }

  hideMessages() {
    this.errorDiv.classList.add("hidden");
    this.successDiv.classList.add("hidden");
  }
}
