import {message} from './message';
import { apiClient } from '../utils';

export class OrgData {
    orgId: string;
    orgName: string;
    orgDescription: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    membersCount: number;
    tier: string;

    constructor(data: {
        id: string;
        name: string;
        description: string;
        created_at: string;
        updated_at: string;
        owner_id: string;
        members_count: number;
        tier: string;
    }) {
        this.orgId = data.id;
        this.orgName = data.name;
        this.orgDescription = data.description;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.ownerId = data.owner_id;
        this.membersCount = data.members_count;
        this.tier = data.tier;
    }
}

let organization: OrgData = new OrgData({
    id: "",
    name: "",
    description: "",
    created_at: "",
    updated_at: "",
    owner_id: "",
    members_count: 0,
    tier: "",
});

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
        },
        {
            "X-API-Key": "my-secure-dehlish-key-6969"
        });

        console.log(adminRes);

        if (!adminRes.ok) {
            messageHandler.showError(adminRes.data?.message || "Admin Registration failed.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "CREATE_ORG";
            return;
        }

        const csrfToken = adminRes.data.csrf_token;

        const orgRes = await apiClient.post("/api/v1/organizations",{
            description: this.formData.orgDescription,
            name: this.formData.orgName,
        },
        {
            "X-CSRF-Token": csrfToken,
        });

        console.log(orgRes);

        if (!orgRes.ok) {
            messageHandler.showError(orgRes.data?.message || "Organization creation failed.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "CREATE_ORG";
            return;
        }

        organization = new OrgData(orgRes.data);

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

export { organization };