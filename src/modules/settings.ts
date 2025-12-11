import { DELETE, GET, POST, PUT } from "../api/api-manage";
import ENDPOINTS from "../utils/api/endpoints";
import { organizationStore } from "../utils/store";

export class Settings {
    orgData = organizationStore.get();

    async getOrgData() {
        const id = this.orgData?.id;

        const req = await GET(ENDPOINTS.ORGANIZATION.GET_org_details(id!));
        if (req.status === 200) {
            const data = await req.data as any;
            organizationStore.set({
                id: data.id,
                name: data.name,
                description: data.description,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                ownerId: data.owner_id,
                membersCount: data.member_count,
                tier: data.tier,
            });

            alert("Organization data updated successfully.");
        }

    }

    async changeOrgName(newName: string) {
        const id = this.orgData?.id;

        if (!newName || newName.trim() === "") {
            window.alert("Organization name cannot be empty.");
            return;
        }

        if (newName === this.orgData?.name) {
            window.alert("New organization name is the same as the current one.");
            return;
        }

        const req = await PUT(ENDPOINTS.ORGANIZATION.PUT_update_org_name(id!), {
            name: newName
        });

        if (req.status === 200) {
            await this.getOrgData();
            window.alert("Organization name updated successfully.");
            return;
        }

    }

    async inviteMember(email: string) {
        const id = this.orgData?.id;

        if (!email || email.trim() === "") {
            window.alert("Email cannot be empty.");
            return;
        }

        const req = await POST(ENDPOINTS.ORGANIZATION.POST_invite_org_member(id!), {
            email: email
        });

        if (req.status === 200) {
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
                if (req.status !== 200) {
                    window.alert("Failed to invite member.");
                }
        }
    }

    async transferOwnership(new_id: string) {
        const id = this.orgData?.id;

        if (!id) {
            window.alert("Organization ID not available.");
            return;
        }

        if (!new_id || new_id.trim() === "") {
            window.alert("New owner ID cannot be empty.");
            return;
        }

        const req = await POST(ENDPOINTS.ORGANIZATION.POST_transfer_ownership(id), {
            new_owner_id: new_id,
        });

        if (req.status === 200) {
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
                if (req.status !== 200) {
                    window.alert("Failed to transfer ownership.");
                }
        }
    }

    async removeMember(member_id: string) {
        const id = this.orgData?.id;
        console.log("Removing member with ID:", id);

        if (!member_id || member_id.trim() === "") {
            window.alert("Member ID cannot be empty.");
            return;
        }

        const req = await DELETE(ENDPOINTS.ORGANIZATION.DELETE_org_member(id!, member_id));
        console.log(req.data);


        if (req.status === 200) {
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
                if (req.status !== 200) {
                    window.alert("Failed to transfer ownership.");
                }
        }

    }

    async leaveOrganization() {
        const id = this.orgData?.id;

        const req = await POST(ENDPOINTS.ORGANIZATION.POST_leave_org(id!), {
            id: id,
        });

        if (req.status === 200) {
            organizationStore.set(null);
            window.alert("Left the organization successfully.");
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
                if (req.status !== 200) {
                    window.alert("Failed to transfer ownership.");
                }
        }

    }

    async deleteOrganization() {
        const id = this.orgData?.id;

        const req = await DELETE(ENDPOINTS.ORGANIZATION.DELETE_org(id!));

        if (req.status === 200) {
            organizationStore.set(null);
            window.alert("Organization deleted successfully.");
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
                if (req.status !== 200) {
                    window.alert("Failed to transfer ownership.");
                }
        }

    }
}