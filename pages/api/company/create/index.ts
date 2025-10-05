import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Bypass SSL for development
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { name, street, city, state, zip, phone, email, depreciation_rate, first_name, last_name, password, selected_owner_id } = req.body

  // Trim all string fields to prevent trailing spaces
  const trimmedData = {
    name: name?.trim(),
    street: street?.trim(),
    city: city?.trim(),
    state: state?.trim(),
    zip: zip?.trim(),
    phone: phone?.trim(),
    email: email?.trim(),
    first_name: first_name?.trim(),
    last_name: last_name?.trim()
  }

  if (!trimmedData.name) {
    return res.status(400).json({ error: 'Company name is required' })
  }

  if (!trimmedData.first_name || !trimmedData.last_name) {
    return res.status(400).json({ error: 'First name and last name are required' })
  }

  try {
    console.log('Company create API: Received data:', { name, street, city, state, zip, phone, email, depreciation_rate })

    // Check if company already exists
    const { data: existingCompanies, error: fetchError } = await supabase
      .from('companies')
      .select('id')
      .eq('name', trimmedData.name)
      .limit(1)

    console.log('Company create API: Existing companies check:', { existingCompanies, fetchError })

    if (fetchError) {
      console.log('Error checking existing company:', fetchError)
      return res.status(500).json({ error: 'Failed to check existing company', details: fetchError })
    }

    if (existingCompanies && existingCompanies.length > 0) {
      return res.status(400).json({ error: 'Company with this name already exists' })
    }

    // For invitation flow, we don't create the user account yet - just create the company
    // The user account will be created later in the password setup flow
    let userData: any = null
    
    if (password) {
      // This is the invitation flow - we'll create a temporary user for company association
      // but the actual user account will be created in the password setup
      console.log('Company create API: Invitation flow - creating temporary user for company association')
      
      // Create a temporary user ID for company association
      // We'll update this when the real user account is created
      const tempUserId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      userData = { 
        user: { 
          id: tempUserId, 
          email: email,
          user_metadata: {
            company_name: trimmedData.name,
            first_name: trimmedData.first_name,
            last_name: trimmedData.last_name
          }
        } 
      }
    } else {
      // Get user from Authorization header (existing flow)
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('No authorization header found and no password provided')
        return res.status(401).json({ 
          error: 'Authorization header required', 
          details: 'No Bearer token found in request headers'
        })
      }

      const token = authHeader.split(' ')[1]
      const { data: authUserData, error: userError } = await supabase.auth.getUser(token)
      
      if (userError || !authUserData.user) {
        console.log('Error getting user from token:', userError)
        return res.status(500).json({ 
          error: 'Failed to get user from token', 
          details: userError
        })
      }

      userData = authUserData
    }

    // Create new company
    const { data, error } = await supabase
      .from('companies')
      .insert({
        name: trimmedData.name,
        street: trimmedData.street,
        city: trimmedData.city,
        state: trimmedData.state,
        zip: trimmedData.zip,
        phone: trimmedData.phone,
        email: trimmedData.email,
        depreciation_rate: depreciation_rate || 7.5 // Use provided rate or default
      })
      .select()

    if (error) {
      console.log('Error creating company:', error)
      return res.status(500).json({ 
        error: 'Failed to create company', 
        details: error,
        message: error.message
      })
    }

    const company = data[0]
    console.log('Company create API: Company created successfully:', company)

    // Create the user-company association
    if (userData.user.id && !userData.user.id.startsWith('temp_')) {
      // Check if the user is an admin
      const { data: companyUser, error: roleError } = await supabase
        .from('company_users')
        .select('role')
        .eq('user_id', userData.user.id)
        .single()

      const isAdmin = !roleError && companyUser && companyUser.role === 'admin'
      
      if (isAdmin && selected_owner_id) {
        // Admin creating company for a specific owner
        console.log('Company create API: Admin creating company for owner:', selected_owner_id)
        const { error: associationError } = await supabase
          .from('company_users')
          .insert({
            user_id: selected_owner_id,
            company_id: company.id,
            role: 'owner'
          })

        if (associationError) {
          console.log('Error creating company-owner association:', associationError)
          return res.status(500).json({ 
            error: 'Failed to create company-owner association', 
            details: associationError
          })
        }

        console.log('Company-owner association created successfully')
      } else if (!isAdmin) {
        // Owner creating their own company
        const { error: associationError } = await supabase
          .from('company_users')
          .insert({
            user_id: userData.user.id,
            company_id: company.id,
            role: 'owner'
          })

        if (associationError) {
          console.log('Error creating company-user association:', associationError)
          return res.status(500).json({ 
            error: 'Failed to create company-user association', 
            details: associationError
          })
        }

        console.log('Company-user association created successfully')
      } else {
        console.log('Company create API: Admin-created standalone company - no user association created')
      }
    } else {
      console.log('Invitation flow - storing company ID for later association')
      
      // Store the company ID in the invitation record for later use
      if (password) {
        // This is the invitation flow - update the invitation record with company ID
        const { error: updateInviteError } = await supabase
          .from('invites')
          .update({ company_id: company.id })
          .eq('invited_email', email)
          .in('status', ['pending', 'email_confirmed'])

        if (updateInviteError) {
          console.error('Company create API: Error updating invitation with company ID:', updateInviteError)
          // Don't fail the whole process if this fails
        } else {
          console.log('Company create API: Invitation updated with company ID:', company.id)
        }
      }
    }

    // Update user profile with first_name and last_name
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: trimmedData.first_name,
        last_name: trimmedData.last_name
      })
      .eq('id', userData.user.id)

    if (profileError) {
      console.log('Error updating user profile:', profileError)
      // Don't fail the request if profile update fails, but log it
    } else {
      console.log('User profile updated with first_name and last_name')
    }

    // Log the company creation activity - credit to admin who sent invitation
    try {
      let adminEmail = 'unknown@admin.com'
      let adminUserId = null
      
      // For invitation flow, get the admin who created the invitation
      if (password) {
        const { data: invitation } = await supabase
          .from('invites')
          .select('created_by')
          .eq('invited_email', email)
          .single()
        
        if (invitation?.created_by) {
          const { data: adminProfile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', invitation.created_by)
            .single()
          
          adminEmail = adminProfile?.email || 'unknown@admin.com'
          adminUserId = invitation.created_by
        }
      } else {
        // For direct company creation (not invitation flow), credit the user creating it
        adminEmail = userData.user.email
        adminUserId = userData.user.id
      }
      
      console.log('Company Create API: Logging company creation activity - crediting:', adminEmail)
      
      const activityResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/activity/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: adminUserId,
          user_email: adminEmail,
          company_id: company.id,
          action: 'COMPANY_CREATED',
          description: `Company "${company.name}" created successfully`,
          metadata: {
            company_name: company.name,
            company_id: company.id,
            created_by_email: adminEmail,
            owner_email: email, // Track who will own the company
            role: 'owner',
            invitation_flow: !!password
          }
        })
      })
      
      if (activityResponse.ok) {
        console.log('Company Create API: Company creation activity logged successfully')
      } else {
        console.error('Company Create API: Failed to log company creation activity:', activityResponse.status, await activityResponse.text())
      }
    } catch (logError) {
      console.error('Company Create API: Error logging company creation activity:', logError)
      // Don't fail the request if logging fails
    }

    return res.status(200).json({ 
      success: true, 
      company: company,
      message: 'Company created successfully'
    })
  } catch (error) {
    console.log('Error in create company API:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
