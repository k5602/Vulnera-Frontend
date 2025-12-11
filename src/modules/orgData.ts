import { GET, POST } from '../api/api-manage';
import ENDPOINTS from '../utils/api/endpoints';
import { message } from './message';

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
        console.debug('isOrganization set to true');
    }
    falseIsOrganization() {
        this.isOrganization = false;
        localStorage.removeItem('isOrganization');
        console.debug('isOrganization set to false');
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
        console.debug('Organization ID not available, skipping organization data load');
        return;
    }

    const result = await GET(ENDPOINTS.ORGANIZATION.GET_org_details(orgId));
    if (result.status == 200 && result.data) {
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

        const result = await POST(ENDPOINTS.ORGANIZATION.POST_new_org, {
            name: this.formData.orgName,
            description: this.formData.orgDescription,
        });
        console.debug('Organization creation response', { status: result.status });

        if (result.status !== 200) {
            messageHandler.showError(result.statusText || "Organization creation failed.");
            this.submitBtn.disabled = false;
            this.submitBtn.textContent = "CREATE_ORG";
            return;
        }

        if (result.data) {
            organization.trueIsOrganization();
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
        const result = await GET(ENDPOINTS.ORGANIZATION.GET_user_org);
        console.debug('loadUserOrganization response', { status: result.status, data: result.data });

        // if (result.status == 200 && result.data && result.data.length > 0) {
        //     const orgList = result.data;
        //     const currentUser = getCurrentUser();
        //     console.debug('Current user for org matching', { currentUser });

        //     let targetOrg = orgList[0];
        //     if (currentUser) {
        //         const ownedOrg = orgList.find((o) => o.owner_id === currentUser.id);
        //         if (ownedOrg) {
        //             targetOrg = ownedOrg;
        //             console.debug('Found owned organization', { orgId: targetOrg.id });
        //         } else {
        //             console.debug('No owned organization found, using first available', { orgId: targetOrg.id });
        //         }
        //     } else {
        //         console.warn('No current user found when loading organizations');
        //     }

        //     // Update the existing organization object's properties
        //     const orgData: OrgDataInit = {
        //         id: targetOrg.id,
        //         name: targetOrg.name,
        //         description: targetOrg.description || '',
        //         created_at: targetOrg.created_at,
        //         updated_at: targetOrg.updated_at,
        //         owner_id: targetOrg.owner_id,
        //         members_count: targetOrg.member_count || 0,
        //         tier: 'free', // Default tier
        //         isOrganization: true,
        //         signOrg: false,
        //     };

        //     const newOrgData = new OrgData(orgData);
        //     Object.assign(organization, newOrgData);
        //     console.debug('Organization loaded successfully', { orgId: organization.orgId });
        //     return true;
        // } else {
        //     console.warn('No organizations found in API response');
        // }
    } catch (e) {
        console.error('Failed to load organization', { error: e instanceof Error ? e.message : String(e) });
    }
    return false;
}

// Load organization data if orgId is available in localStorage
const storedOrgId = typeof localStorage !== 'undefined' ? localStorage.getItem('orgId') : null;
if (storedOrgId) {
    loadOrgData(storedOrgId);
}

export { organization, loadOrgData, setId };
