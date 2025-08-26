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
  company_id: string
  user_id: string
  role: 'admin' | 'owner' | 'manager' | 'tech' | 'viewer'
  created_at: string
  companies?: Company
}

export interface CompanyAssociation {
  id: string
  company_id: string
  user_id: string
  role: 'admin' | 'owner' | 'manager' | 'tech' | 'viewer'
  created_at: string
  companies: Company
}
