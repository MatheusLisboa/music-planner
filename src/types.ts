export type UserRole = 'admin' | 'member' | 'super_admin';
export type UserType = 'vocal' | 'instrument';

export interface User {
  id: string;
  uid?: string;
  name: string;
  email: string;
  role: UserRole;
  type?: UserType;
  instrument?: string;
  tenant_id: string;
  mustChangePassword?: boolean;
}

export interface Church {
  id: string;
  name: string;
  tenant_id: string;
  status: 'active' | 'inactive';
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export interface Service {
  id: string;
  date: string;
  time: string;
  type: string;
  tenant_id: string;
}

export interface Availability {
  id: string;
  user_id: string;
  service_id: string;
  tenant_id: string;
  status: 'available' | 'unavailable' | 'maybe';
}

export interface Schedule {
  id: string;
  service_id: string;
  user_ids: string[];
  song_ids: string[];
  status: 'pending' | 'confirmed';
  tenant_id: string;
}

export interface Song {
  id: string;
  name: string;
  youtubeLink?: string;
  key?: string;
  tenant_id: string;
}

export interface Attendance {
  id: string;
  user_id: string;
  service_id: string;
  tenant_id: string;
  timestamp: string;
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}
