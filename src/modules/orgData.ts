import {message} from './message';
import { apiClient } from '../utils';


export class OrgSignupData {
    formData: {
        orgName: string;
        orgDescription: string;
        adminEmail: string;
        password: string;
        confirmPassword: string;
        terms: boolean;
    };
    successDiv: HTMLElement;
    errorDiv: HTMLElement;
    submitBtn: HTMLButtonElement;
    passwordElement: HTMLInputElement;
    confirmPasswordElement: HTMLInputElement;
    togglePassword: HTMLButtonElement;
    toggleConfirmPassword: HTMLButtonElement;

    validateInputs() {
        const messageHandler = new message(
            this.errorDiv,
            this.successDiv
        );

        if (!this.formData.adminEmail || !this.formData.orgName || !this.formData.password || !this.formData.confirmPassword || !this.formData.orgDescription) {
            messageHandler.showError("Please fill out all required fields.");
            return;
        }

        if (!this.formData.adminEmail.includes("@")) {
            messageHandler.showError("Invalid email address.");
            return;
        }

        if (this.formData.password !== this.formData.confirmPassword) {
            messageHandler.showError("Passwords do not match.");
            return;
        }

        if (!this.formData.terms) {
            messageHandler.showError("You must accept the terms.");
            return;
        }

        this.submitBtn.disabled = true;
        this.submitBtn.textContent = "CREATING_ORG...";
    }

    togglePasswordVisibility() {
        if (this.passwordElement.type === "password") {
                this.passwordElement.type = "text";
                this.togglePassword.textContent = "[HIDE]";
            } else {
                this.passwordElement.type = "password";
                this.togglePassword.textContent = "[SHOW]";
            }
    }

    toggleConfirmPasswordVisibility() {
        if (this.confirmPasswordElement.type === "password") {
                this.confirmPasswordElement.type = "text";
                this.toggleConfirmPassword.textContent = "[HIDE]";
            } else {
                this.confirmPasswordElement.type = "password";
                this.toggleConfirmPassword.textContent = "[SHOW]";
            }
    }

    async sendSignupRequest() {
        const messageHandler = new message(
            this.errorDiv,
            this.successDiv
        );

        const adminRes = await apiClient.post("/api/v1/auth/register", {
            email: this.formData.adminEmail,
            password: this.formData.password,
            roles: ["user"]
        });

        const orgRes = await apiClient.post("/api/v1/organizations", {
            description: this.formData.orgDescription,
            name: this.formData.orgName,
        });

        if (!adminRes.ok) {
            messageHandler.showError(adminRes.data?.message || "Admin Registration failed.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "CREATE_ORG";
            return;
        }
        if (!orgRes.ok) {
            messageHandler.showError(orgRes.data?.message || "Organization creation failed.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "CREATE_ORG";
            return;
        }

        messageHandler.showSuccess("Organization created! Redirecting...");
        setTimeout(() => {
            window.location.replace("/dashboard");
        }, 800);
    }

    constructor(formData: {
        orgName: string;
        orgDescription: string;
        adminEmail: string;
        password: string;
        confirmPassword: string;
        terms: boolean;
    },
    successDiv: HTMLElement,
    errorDiv: HTMLElement,
    submitBtn: HTMLButtonElement,
    passwordElement: HTMLInputElement,
    confirmPasswordElement: HTMLInputElement,
    togglePassword: HTMLButtonElement,
    toggleConfirmPassword: HTMLButtonElement,
) {
        this.formData = formData;
        this.successDiv = successDiv;
        this.errorDiv = errorDiv;
        this.submitBtn = submitBtn;
        this.passwordElement = passwordElement;
        this.confirmPasswordElement = confirmPasswordElement;
        this.togglePassword = togglePassword;
        this.toggleConfirmPassword = toggleConfirmPassword;
    }
}