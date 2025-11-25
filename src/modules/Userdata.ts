// UI Message Helper
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

// User Signup Class (Refactored)

import { apiClient } from "../utils/api/client";

export class UserSignup {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirm: string;
  termsAccepted: boolean;

  constructor(
    firstName: string,
    lastName: string,
    email: string,
    password: string,
    confirm: string,
    termsAccepted: boolean
  ) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.password = password;
    this.confirm = confirm;
    this.termsAccepted = termsAccepted;
  }

  validateInputs(): string | null {
    if (
      !this.email ||
      !this.password ||
      !this.firstName ||
      !this.lastName ||
      !this.termsAccepted
    ) {
      return "Please complete all fields and accept the terms.";
    }
    return null;
  }

  validateEmail(): string | null {
    if (!this.email.includes("@")) {
      return "Please enter a valid email address.";
    }
    return null;
  }

  passwordsMatch(): string | null {
    if (this.password !== this.confirm) {
      return "Passwords do not match.";
    }
    return null;
  }

  async signUp() {
    const res = await apiClient.post("/api/v1/auth/register", {
      email: this.email,
      password: this.password,
      first_name: this.firstName,
      last_name: this.lastName
    });

    return res;
  }
}
