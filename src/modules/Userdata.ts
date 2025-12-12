import { POST } from "../api/api-manage";
import ENDPOINTS from "../utils/api/endpoints";

// User Signup Class (Refactored)
export class UserSignup {
  email: string;
  password: string;
  confirm: string;
  termsAccepted: boolean;

  constructor(
    email: string,
    password: string,
    confirm: string,
    termsAccepted: boolean
  ) {
    this.email = email;
    this.password = password;
    this.confirm = confirm;
    this.termsAccepted = termsAccepted;
  }

  validateInputs(): string | null {
    if (
      !this.email ||
      !this.password ||
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
    const res = POST(ENDPOINTS.AUTH.POST_register, {
      email: this.email,
      password: this.password,
      roles: ["user"],
    });

    return res;
  }
}
