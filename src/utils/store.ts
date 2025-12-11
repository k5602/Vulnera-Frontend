//this file is a centeral store of data
//stored data:
//- authentication status
//- csrf token
//- user info
//- organization info

import {atom} from 'nanostores';
import {persistentAtom} from '@nanostores/persistent';

export interface User {
    id: string;
    email: string;
    role: string[];
    isOrgMember: boolean;
}

export interface Organization {
    id: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    tier: string;
    membersCount: number;
}

export const csrfTokenStore = persistentAtom<string | null>('csrfToken', null, {encode: JSON.stringify, decode: JSON.parse});

export const isAuthenticatedStore = atom<boolean>(false);

export const userStore = persistentAtom<User | null>('user', null, {encode: JSON.stringify, decode: JSON.parse});

export const organizationStore = persistentAtom<Organization | null>('organization', null, {encode: JSON.stringify, decode: JSON.parse});

export const isLoadingStore = atom<boolean>(false);

export const clearCsrfToken = () => csrfTokenStore.set(null);

export const clearIsAuthenticated = () => isAuthenticatedStore.set(false);

export const clearUser = () => userStore.set(null);

export const clearOrganization = () => organizationStore.set(null);

export const clearStore = () => {
    clearCsrfToken();
    clearIsAuthenticated();
    clearUser();
    clearOrganization();
}