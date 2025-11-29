import { message } from './message';
import { organizationService } from '../utils/api/organization-service';
import { logger } from '../utils/logger';
import { getCurrentUser } from '../utils/api/auth-store';

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
    signOrg: boolean;
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
    signOrg: boolean;

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
        this.signOrg = data.signOrg;
    }
}

function setId(id: string) {
    localStorage.setItem('orgId', id);
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

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

async function loadOrgData(orgId: string | null) {
    // Skip if orgId is not available
    if (!orgId || orgId === 'null' || orgId === 'undefined') {
        logger.debug('Organization ID not available, skipping organization data load');
        return;
    }

    const result = await organizationService.get(orgId);
    if (result.success && result.data) {
        const data = result.data;
        organization.orgName = data.name;
        organization.orgDescription = data.description || '';
        organization.createdAt = formatDate(data.created_at.toString());
        organization.updatedAt = formatDate(data.updated_at.toString());
        organization.ownerId = data.owner_id;
        organization.membersCount = data.member_count || 0;
        organization.tier = 'free'; // Default tier, not in Organization type
        organization.orgId = data.id;

        organization.trueIsOrganization();
    }
}


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

        const result = await organizationService.create({
            name: this.formData.orgName,
            description: this.formData.orgDescription
        });

        logger.debug('Organization creation response', { success: result.success, status: result.status });

        if (!result.success) {
            messageHandler.showError(result.error || "Organization creation failed.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "CREATE_ORG";
            return;
        }

        if (result.data) {
            setId(result.data.id);
            loadOrgData(result.data.id);
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


export async function loadUserOrganization() {
    try {
        const result = await organizationService.list();
        logger.debug('loadUserOrganization response', { success: result.success, status: result.status, data: result.data });

        if (result.success && result.data && result.data.length > 0) {
            const orgList = result.data;
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
            const orgData: OrgDataInit = {
                id: targetOrg.id,
                name: targetOrg.name,
                description: targetOrg.description || '',
                created_at: targetOrg.created_at,
                updated_at: targetOrg.updated_at,
                owner_id: targetOrg.owner_id,
                members_count: targetOrg.member_count || 0,
                tier: 'free', // Default tier
                isOrganization: true,
                signOrg: false,
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

// Load organization data if orgId is available in localStorage
const storedOrgId = typeof localStorage !== 'undefined' ? localStorage.getItem('orgId') : null;
if (storedOrgId) {
    loadOrgData(storedOrgId);
}

export { organization, loadOrgData, setId };
