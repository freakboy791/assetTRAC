export interface User {
  id: string
  email: string | undefined
  created_at: string
}

export interface Company {
  id: string
  name: string
  depreciation_rate: number | undefined
  street: string | undefined
  city: string | undefined
  state: string | undefined
  zip: string | undefined
  phone: string | undefined
  email: string | undefined
  note: string | undefined
  created_at: string
}

export interface CompanyUser {
  id: string
  user_id: string
  company_id: string
  role: 'owner' | 'manager' | 'tech' | 'viewer'
  created_at: string
}

export interface CompanyAssociation {
  id: string
  company_id: string
  user_id: string
  role: 'admin' | 'owner' | 'manager' | 'tech' | 'viewer'
  created_at: string
  companies: Company
}

export interface UserRole {
  id: number
  user_id: string
  role: 'owner' | 'admin' | 'manager' | 'tech' | 'viewer'
  created_at: string
}

export interface Invitation {
  id: number
  invited_email: string
  company_name: string
  message: string | null
  token: string
  expires_at: string
  used: boolean
  created_by: string
  created_at: string
  role: string
  status: 'pending' | 'email_confirmed' | 'admin_approved' | 'completed' | 'expired' | 'rejected'
  email_confirmed_at: string | null
  admin_approved_at: string | null
  admin_approved_by: string | null
  completed_at: string | null
}

export interface AdminNotification {
  id: number
  type: 'user_registration' | 'company_created' | 'user_approved'
  user_id: string
  company_id?: string
  message: string
  is_read: boolean
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  is_approved: boolean
  approved_by?: string
  approved_at?: string
  email_verified: boolean
  created_at: string
  updated_at: string
}
