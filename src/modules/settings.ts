import { apiClient } from "../utils";
import { organization, OrgData } from "./orgData";

export class Settings {
    orgData: OrgData = organization;

    async getOrgData() {
        const id = this.orgData.orgId;

        const req = await apiClient.get(`api/v1/organizations/${id}`);
        if (req.ok) {
            const data = await req.data as any;
            this.orgData.orgName = data.name;
            this.orgData.ownerId = data.owner_id;
            this.orgData.membersCount = data.members_count;
            this.orgData.orgDescription = data.description;
            this.orgData.tier = data.tier;
            this.orgData.updatedAt = data.updated_at;
            this.orgData.createdAt = data.created_at;
            this.orgData.orgId = data.id;

            alert("Organization data updated successfully.");
        }
    }

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

        if (req.ok) {
            await this.getOrgData();
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

        if (req.ok) {
            await this.getOrgData();
            window.alert("Member invited successfully.");
        }
        switch (req.status) {
            case 409:
                window.alert("User is already a member of the organization.");
                break;
            
            case 401:
                window.alert("You are not authorized to invite members.");
                break;

            case 403:
                window.alert("Only members can invite members.");
                break;

            case 404:
                window.alert("Organization or user not found.");
                break;

            default:
                if (!req.ok) {
                    window.alert("Failed to invite member.");
                }
        }
    }

    async transferOwnership(new_id: string) {
        const id = organization.orgId;

        if (!new_id || new_id.trim() === "") {
            window.alert("New owner ID cannot be empty.");
            return;
        }

        const req = await apiClient.post(`api/v1/organizations/${id}/transfer`, {
            new_owner_id: new_id
        });

        if (req.ok) {
            await this.getOrgData();
            window.alert("Ownership transferred successfully.");
        }

        switch (req.status) {
            case 401:
                window.alert("You are not authorized to transfer ownership.");
                break;
            case 403:
                window.alert("Only the owner can transfer ownership.");
                break;
            case 404:
                window.alert("Organization or new owner not found.");
                break;
            default:
                if (!req.ok) {
                    window.alert("Failed to transfer ownership.");
                }
        }
    }

    async removeMember(member_id: string) {
        const id = this.orgData.orgId;
        console.log("Removing member with ID:", id);

        if (!member_id || member_id.trim() === "") {
            window.alert("Member ID cannot be empty.");
            return;
        }

        const req = await apiClient.delete(`api/v1/organizations/${id}/members/${member_id}`);
        console.log(req.data);
        

        if (req.ok) {
            await this.getOrgData();
            window.alert("Member removed successfully.");
        }

        switch (req.status) {
            case 401:
                window.alert("You are not authorized to transfer ownership.");
                break;
            case 403:
                window.alert("Only the owner can transfer ownership.");
                break;
            case 404:
                window.alert("Organization or new owner not found.");
                break;
            case 409:
                window.alert("Cannot remove the owner from the organization.");
                break;
            default:
                if (!req.ok) {
                    window.alert("Failed to transfer ownership.");
                }
        }

    }

    async leaveOrganization() {
        const id = this.orgData.orgId;

        const req = await apiClient.post(`api/v1/organizations/${id}/leave`, {
            id: id,
        });

        if (req.ok) {
            organization.falseIsOrganization();
            organization.falseSignOrganization();
            window.alert("Left the organization successfully.");
            window.location.reload();
        }

        switch (req.status) {
            case 401:
                window.alert("You are not authorized to transfer ownership.");
                break;
            case 403:
                window.alert("Only the owner can transfer ownership.");
                break;
            case 404:
                window.alert("Organization or new owner not found.");
                break;
            default:
                if (!req.ok) {
                    window.alert("Failed to transfer ownership.");
                }
        }

    }

    async deleteOrganization() {
        const id = this.orgData.orgId;

        const req = await apiClient.delete(`api/v1/organizations/${id}`);

        if (req.ok) {
            organization.falseIsOrganization();
            organization.falseSignOrganization();
            window.alert("Organization deleted successfully.");
            window.location.reload();
        }

        switch (req.status) {
            case 401:
                window.alert("You are not authorized to transfer ownership.");
                break;
            case 403:
                window.alert("Only the owner can transfer ownership.");
                break;
            case 404:
                window.alert("Organization or new owner not found.");
                break;
            default:
                if (!req.ok) {
                    window.alert("Failed to transfer ownership.");
                }
        }

    }
}