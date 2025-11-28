import { message } from './message';
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
    isOrganization: boolean;
    signOrg: boolean;

    trueIsOrganization() {
        this.isOrganization = true;
        localStorage.setItem('isOrganization', 'true');
        console.log(this.isOrganization);
    }
    falseIsOrganization() {
        this.isOrganization = false;
        localStorage.removeItem('isOrganization');
        console.log(this.isOrganization);
    }
    trueSignOrganization() {
        this.signOrg = true;
        localStorage.setItem('signOrg', 'true');
        console.log(this.signOrg);
    }
    falseSignOrganization() {
        this.signOrg = false;
        localStorage.removeItem('signOrg');
        console.log(this.signOrg);
    }


    constructor(data: {
        id: string;
        name: string;
        description: string;
        created_at: string;
        updated_at: string;
        owner_id: string;
        members_count: number;
        tier: string;
        isOrganization: boolean;
        signOrg: boolean;
    }) {
        this.orgId = data.id;
        this.orgName = data.name;
        this.orgDescription = data.description;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.ownerId = data.owner_id;
        this.membersCount = data.members_count;
        this.tier = data.tier;
        this.isOrganization = data.isOrganization;
        this.signOrg = data.signOrg;
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
    isOrganization: typeof localStorage !== 'undefined' && localStorage.getItem('isOrganization') === 'true',
    signOrg: typeof localStorage !== 'undefined' && localStorage.getItem('signOrg') === 'true',
});

export class OrgSignupOrgData {
    formData: {
        orgName: string;
        orgDescription: string;
    };
    successDiv: HTMLElement;
    errorDiv: HTMLElement;
    submitBtn: HTMLButtonElement;


    validateInputs() {
        const messageHandler = new message(
            this.errorDiv,
            this.successDiv
        );

        if (!this.formData.orgName || !this.formData.orgDescription) {
            messageHandler.showError("Please fill out all required fields.");
            return false;
        }

        this.submitBtn.disabled = true;
        this.submitBtn.textContent = "CREATING_ORG...";
        return true;
    }

    async sendSignupOrgRequest() {
        const messageHandler = new message(
            this.errorDiv,
            this.successDiv
        );

        const orgRes = await apiClient.post("/api/v1/organizations", {
            name: this.formData.orgName,
            description: this.formData.orgDescription
        });

        const orgResData = await orgRes.data;

        console.log(orgRes);

        if (!orgRes.ok) {
            messageHandler.showError(orgResData?.message || ", isOrganization creation failed.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "CREATE_ORG";
            return;
        }

        organization = new OrgData(orgResData);

        messageHandler.showSuccess("Organization created! Redirecting...");
        organization.isOrganization = true;
        setTimeout(() => {
            window.location.replace("/orgdashboard");
        }, 3000);
    }

    constructor(formData: {
        orgName: string;
        orgDescription: string;
    },
        successDiv: HTMLElement,
        errorDiv: HTMLElement,
        submitBtn: HTMLButtonElement,
    ) {
        this.formData = formData;
        this.successDiv = successDiv;
        this.errorDiv = errorDiv;
        this.submitBtn = submitBtn;
    }
}

export { organization };

import { getCurrentUser } from '../utils/api/auth-store';

export async function loadUserOrganization() {
    try {
        const res = await apiClient.get("/api/v1/organizations");
        if (res.ok && res.data.organizations && res.data.organizations.length > 0) {
            const orgList = res.data.organizations;
            const currentUser = getCurrentUser();

            let targetOrg = orgList[0];
            if (currentUser) {
                const ownedOrg = orgList.find((o: any) => o.owner_id === currentUser.id);
                if (ownedOrg) targetOrg = ownedOrg;
            }

            // Update the existing organization object's properties
            // We need to map API response to OrgData constructor expected format if needed
            // Assuming API response matches mostly, but let's be safe with isOrganization

            const orgData = {
                ...targetOrg,
                isOrganization: true
            };

            const newOrgData = new OrgData(orgData);
            Object.assign(organization, newOrgData);
            return true;
        }
    } catch (e) {
        console.error("Failed to load organization", e);
    }
    return false;
}