// User Signup Class (Refactored)

import { apiClient } from "../utils/api/client";
import { API_ENDPOINTS } from "../config/api";

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
    const res = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, {
      email: this.email,
      password: this.password,
      first_name: this.firstName,
      last_name: this.lastName
    });

    return res;
  }
}
