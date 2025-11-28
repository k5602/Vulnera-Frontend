import { message } from './message';
import { apiClient } from '../utils';
import { logger } from '../utils/logger';

/** Type definition for OrgData constructor parameter */
export interface OrgDataInit {
    id: string;
    name: string;
    description: string;
    created_at: string;
    updated_at: string;
    owner_id: string;
    members_count: number;
    tier: string;
    isOrganization: boolean;
}

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

    trueIsOrganization() {
        this.isOrganization = true;
        localStorage.setItem('isOrganization', 'true');
        logger.debug('isOrganization set to true');
    }
    falseIsOrganization() {
        this.isOrganization = false;
        localStorage.removeItem('isOrganization');
        logger.debug('isOrganization set to false');
    }

    constructor(data: OrgDataInit) {
        this.orgId = data.id;
        this.orgName = data.name;
        this.orgDescription = data.description;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.ownerId = data.owner_id;
        this.membersCount = data.members_count;
        this.tier = data.tier;
        this.isOrganization = data.isOrganization;
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

        const orgResData = orgRes.data as OrgDataInit | undefined;

        logger.debug('Organization creation response', { status: orgRes.status, ok: orgRes.ok });

        if (!orgRes.ok) {
            const errorData = orgResData as { message?: string } | undefined;
            messageHandler.showError(errorData?.message || "Organization creation failed.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "CREATE_ORG";
            return;
        }

        if (orgResData) {
            organization = new OrgData(orgResData);
        }

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

/** Type for the organizations API response */
interface OrganizationsResponse {
    organizations: OrgDataInit[];
}

export async function loadUserOrganization() {
    try {
        const res = await apiClient.get<OrganizationsResponse>("/api/v1/organizations");
        const data = res.data;
        logger.debug('loadUserOrganization response', { ok: res.ok, status: res.status, data });

        if (res.ok && data?.organizations && data.organizations.length > 0) {
            const orgList = data.organizations;
            const currentUser = getCurrentUser();
            logger.debug('Current user for org matching', { currentUser });

            let targetOrg = orgList[0];
            if (currentUser) {
                const ownedOrg = orgList.find((o) => o.owner_id === currentUser.id);
                if (ownedOrg) {
                    targetOrg = ownedOrg;
                    logger.debug('Found owned organization', { orgId: targetOrg.id });
                } else {
                    logger.debug('No owned organization found, using first available', { orgId: targetOrg.id });
                }
            } else {
                logger.warn('No current user found when loading organizations');
            }

            // Update the existing organization object's properties
            // We need to map API response to OrgData constructor expected format if needed
            // Assuming API response matches mostly, but let's be safe with isOrganization

            const orgData: OrgDataInit = {
                ...targetOrg,
                isOrganization: true
            };

            const newOrgData = new OrgData(orgData);
            Object.assign(organization, newOrgData);
            logger.debug('Organization loaded successfully', { orgId: organization.orgId });
            return true;
        } else {
            logger.warn('No organizations found in API response');
        }
    } catch (e) {
        logger.error('Failed to load organization', { error: e instanceof Error ? e.message : String(e) });
    }
    return false;
}