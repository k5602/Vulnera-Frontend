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
        isOrganization = false;

    trueIsOrganization() {
    this.isOrganization = true;
    console.log(this.isOrganization);
}
    falseIsOrganization() {
    this.isOrganization = false;
    console.log(this.isOrganization);
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

        const orgRes = await apiClient.post("/api/v1/organizations",{
            name: this.formData.orgName,
            description: this.formData.orgDescription});

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