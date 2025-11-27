import { apiClient } from "../utils";
import { organization, OrgData } from "./orgData";

export class Settings {
    orgData: OrgData = organization;

    async changeOrgName(newName: string) {
        const id = this.orgData.orgId;

        if (!newName || newName.trim() === "") {
            window.alert("Organization name cannot be empty.");
            return;
        }

        if (newName === this.orgData.orgName) {
            window.alert("New organization name is the same as the current one.");
            return;
        }

        const req = await apiClient.put(`api/v1/organizations/${id}`, {
            name: newName
        });

        if (req.success) {
            this.orgData.orgName = newName;
            window.alert("Organization name updated successfully.");
            window.location.reload();
        }
    }

    async inviteMember(email: string) {
        const id = this.orgData.orgId;

        if (!email || email.trim() === "") {
            window.alert("Email cannot be empty.");
            return;
        }

        const req = await apiClient.post(`api/v1/organizations/${id}/members`, {
            email: email
        });

        if (req.success) {
            this.orgData.membersCount += 1;
            window.alert("Member invited successfully.");
        }
    }

    async transferOwnership(new_id: string) {
        const id = this.orgData.orgId;

        if (!new_id || new_id.trim() === "") {
            window.alert("New owner ID cannot be empty.");
            return;
        }

        const req = await apiClient.post(`api/v1/organizations/${id}/transfer`, {
            new_owner_id: new_id
        });

        if (req.success) {
            this.orgData.ownerId = new_id;
            window.alert("Ownership transferred successfully.");
        } else {
            window.alert("Failed to transfer ownership.");
        }
    }

    async removeMember(member_id: string) {
        const id = this.orgData.orgId;

        if (!member_id || member_id.trim() === "") {
            window.alert("Member ID cannot be empty.");
            return;
        }

        const req = await apiClient.delete(`api/v1/organizations/${id}/members/${member_id}`);

        if (req.success) {
            this.orgData.membersCount -= 1;
            window.alert("Member removed successfully.");
        } else {
            window.alert("Failed to remove member.");
        }
    }

    async leaveOrganization() {
        const id = this.orgData.orgId;

        const req = await apiClient.post(`api/v1/organizations/${id}/leave`, {
            id: id,
        });

        if (req.success) {
            window.alert("Left the organization successfully.");
            window.location.reload();
        } else {
            window.alert("Failed to leave the organization.");
        }
    }

    async deleteOrganization() {
        const id = this.orgData.orgId;

        const req = await apiClient.delete(`api/v1/organizations/${id}`);

        if (req.success) {
            organization.falseIsOrganization();
            window.alert("Organization deleted successfully.");
            window.location.reload();
        } else {
            window.alert("Failed to delete organization.");
        }
    }
}