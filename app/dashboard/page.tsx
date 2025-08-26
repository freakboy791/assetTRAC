'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { Company, CompanyAssociation } from '@/types'

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuthAndCompany()
  }, [])

  const checkAuthAndCompany = async () => {
    try {
      // Check if user has an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.log('No active session, redirecting to login')
        router.push('/')
        return
      }

      const currentUser = session.user
      if (!currentUser) {
        console.log('No user in session, redirecting to login')
        router.push('/')
        return
      }

      setUser(currentUser)

             // Check if user has company associations (can be multiple)
       const { data: companyAssociations, error: companyError } = await supabase
         .from('company_users')
         .select('*, companies(*)')
         .eq('user_id', currentUser.id)

      if (companyError) {
        setMessage(`Error checking company associations: ${companyError.message}`)
      } else if (!companyAssociations || companyAssociations.length === 0) {
        // No company associations found - redirect to company creation
        router.push('/company/create')
        return
      } else if (companyAssociations.length === 1) {
        // Single company association
        setCompany(companyAssociations[0].companies)
      } else {
        // Multiple company associations - show company selector
        setAllCompanies(companyAssociations.map((assoc: CompanyAssociation) => assoc.companies))
        setCompany(companyAssociations[0].companies) // Default to first company
        setMessage(`You are associated with ${companyAssociations.length} companies. Currently viewing: ${companyAssociations[0].companies.name}`)
      }

    } catch (error) {
      console.error('Error in checkAuthAndCompany:', error)
      setMessage('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleCompanyChange = (companyId: string) => {
    const selectedCompany = allCompanies.find(c => c.id === companyId)
    if (selectedCompany) {
      setCompany(selectedCompany)
      setMessage(`Switched to: ${selectedCompany.name}`)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC</h1>
            </div>
            <div className="flex items-center space-x-4">
              {allCompanies.length > 1 && (
                <div className="flex items-center space-x-2">
                  <label htmlFor="company-select" className="text-sm text-gray-600">Company:</label>
                  <select
                    id="company-select"
                    value={company?.id || ''}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {allCompanies.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <span className="text-sm text-gray-600">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {message ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Company Association Required</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>{message}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Welcome to your Dashboard</h2>
            {company && (
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-700 mb-2">Company Information</h3>
                <div className="bg-gray-50 rounded-md p-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Company:</span> {company.name || 'N/A'}
                  </p>
                </div>
              </div>
            )}
            <p className="text-gray-600">Your main dashboard content will appear here.</p>
          </div>
        )}
      </main>
    </div>
  )
}
