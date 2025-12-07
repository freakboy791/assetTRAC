import { useState, useEffect } from 'react'
import { validateTabSession, clearTabSession, getCurrentTabId as getTabId } from '../../lib/sessionValidator'
import { validateAndRefreshSession, updateActivityWithRefresh, handleSessionError } from '../../lib/enhancedSessionManager'
import { useSessionTimeout } from '../../lib/useSessionTimeout'
import SessionTimeoutWarning from '../../components/SessionTimeoutWarning'
import { getUserDisplayName } from '../../lib/userDisplayName'

interface Asset {
  id: string
  name: string
  type: string | null
  make: string | null
  model: string | null
  serial_number: string | null
  purchase_date: string | null
  cost: number | null
  depreciated_value: number | null
  note: string | null
  status: string | null
  container_id: string | null
  assigned_to: string | null
  company_id: string
  created_at: string
  updated_at: string
}

interface AssetContainer {
  id: string
  name: string
  description: string | null
}

interface DepreciationData {
  asset: Asset
  container: AssetContainer | null
  purchaseDate: Date | null
  assetCost: number
  salvageValue: number
  usefulLifeYears: number
  annualDepreciation: number
  yearsDepreciated: number
  totalDepreciation: number
  currentBookValue: number
  yearsRemaining: number
}

type SortField = 'name' | 'type' | 'purchaseDate' | 'cost' | 'annualDepreciation' | 'totalDepreciation' | 'bookValue'
type SortDirection = 'asc' | 'desc'

export default function FinancialsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [assets, setAssets] = useState<Asset[]>([])
  const [containers, setContainers] = useState<AssetContainer[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [depreciationData, setDepreciationData] = useState<DepreciationData[]>([])
  const [filterType, setFilterType] = useState<string>('')
  const [filterContainer, setFilterContainer] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [defaultSalvageValue, setDefaultSalvageValue] = useState<number>(0)
  const [defaultUsefulLife, setDefaultUsefulLife] = useState<number>(4)

  // Function to get display name for user
  const getDisplayName = () => {
    return getUserDisplayName(user)
  }

  // Session timeout management
  const {
    showWarning,
    timeRemainingFormatted,
    extendSession,
    dismissWarning
  } = useSessionTimeout({
    timeoutMinutes: 30,
    warningMinutes: 5,
    enabled: !loading && !!user
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        const tabId = getTabId()
        const { session: validatedSession, error: sessionError } = await validateAndRefreshSession(tabId)
        
        if (sessionError) {
          handleSessionError(sessionError)
          return
        }
        
        if (validatedSession) {
          setUser(validatedSession.user)
          setUserRoles(validatedSession.userData.roles || [])
          setLoading(false)
          
          const { success: activitySuccess, error: activityError } = await updateActivityWithRefresh(tabId)
          if (activityError) {
            handleSessionError(activityError)
            return
          }
          
          await loadContainers(validatedSession.accessToken)
          await loadAssets(validatedSession.accessToken)
          return
        }

        window.location.href = '/'
      } catch (error) {
        console.error('Error checking user:', error)
        window.location.href = '/'
      } finally {
        setLoading(false)
      }
    }

    checkUser()
  }, [])

  useEffect(() => {
    if (assets.length > 0 && containers.length > 0) {
      calculateDepreciation()
    }
  }, [assets, containers, defaultSalvageValue, defaultUsefulLife])

  const loadContainers = async (accessToken: string) => {
    try {
      const response = await fetch('/api/assets/containers', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setContainers(data.containers || [])
      }
    } catch (error) {
      console.error('Error loading containers:', error)
    }
  }

  const loadAssets = async (accessToken: string) => {
    try {
      setAssetsLoading(true)
      const response = await fetch('/api/assets', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || [])
      }
    } catch (error) {
      console.error('Error loading assets:', error)
    } finally {
      setAssetsLoading(false)
    }
  }

  const calculateDepreciation = () => {
    const today = new Date()
    const data: DepreciationData[] = assets.map(asset => {
      const assetCost = asset.cost || 0
      const salvageValue = defaultSalvageValue
      const usefulLifeYears = defaultUsefulLife
      
      // Calculate annual depreciation
      const annualDepreciation = usefulLifeYears > 0 
        ? (assetCost - salvageValue) / usefulLifeYears 
        : 0
      
      // Parse purchase date
      let purchaseDate: Date | null = null
      let yearsDepreciated = 0
      
      if (asset.purchase_date) {
        purchaseDate = new Date(asset.purchase_date)
        const yearsSincePurchase = (today.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
        yearsDepreciated = Math.max(0, Math.min(yearsSincePurchase, usefulLifeYears))
      }
      
      // Calculate total depreciation (capped at asset cost - salvage value)
      const totalDepreciation = Math.min(
        annualDepreciation * yearsDepreciated,
        assetCost - salvageValue
      )
      
      // Calculate current book value
      const currentBookValue = Math.max(salvageValue, assetCost - totalDepreciation)
      
      // Calculate years remaining
      const yearsRemaining = Math.max(0, usefulLifeYears - yearsDepreciated)
      
      // Get container
      const container = containers.find(c => c.id === asset.container_id) || null
      
      return {
        asset,
        container,
        purchaseDate,
        assetCost,
        salvageValue,
        usefulLifeYears,
        annualDepreciation,
        yearsDepreciated,
        totalDepreciation,
        currentBookValue,
        yearsRemaining
      }
    })
    
    setDepreciationData(data)
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const getSortedData = () => {
    const filtered = depreciationData.filter(item => {
      if (filterType && item.asset.type !== filterType) return false
      if (filterContainer && item.asset.container_id !== filterContainer) return false
      if (filterDateFrom && item.purchaseDate) {
        const fromDate = new Date(filterDateFrom)
        fromDate.setHours(0, 0, 0, 0)
        const purchaseDate = new Date(item.purchaseDate)
        purchaseDate.setHours(0, 0, 0, 0)
        if (purchaseDate < fromDate) return false
      }
      if (filterDateTo && item.purchaseDate) {
        const toDate = new Date(filterDateTo)
        toDate.setHours(23, 59, 59, 999)
        const purchaseDate = new Date(item.purchaseDate)
        purchaseDate.setHours(0, 0, 0, 0)
        if (purchaseDate > toDate) return false
      }
      return true
    })

    return [...filtered].sort((a, b) => {
      let aVal: any
      let bVal: any

      switch (sortField) {
        case 'name':
          aVal = a.asset.name.toLowerCase()
          bVal = b.asset.name.toLowerCase()
          break
        case 'type':
          aVal = (a.asset.type || '').toLowerCase()
          bVal = (b.asset.type || '').toLowerCase()
          break
        case 'purchaseDate':
          aVal = a.purchaseDate?.getTime() || 0
          bVal = b.purchaseDate?.getTime() || 0
          break
        case 'cost':
          aVal = a.assetCost
          bVal = b.assetCost
          break
        case 'annualDepreciation':
          aVal = a.annualDepreciation
          bVal = b.annualDepreciation
          break
        case 'totalDepreciation':
          aVal = a.totalDepreciation
          bVal = b.totalDepreciation
          break
        case 'bookValue':
          aVal = a.currentBookValue
          bVal = b.currentBookValue
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const getSummaryTotals = () => {
    const sorted = getSortedData()
    return {
      totalCost: sorted.reduce((sum, item) => sum + item.assetCost, 0),
      totalDepreciation: sorted.reduce((sum, item) => sum + item.totalDepreciation, 0),
      totalBookValue: sorted.reduce((sum, item) => sum + item.currentBookValue, 0),
      count: sorted.length
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'N/A'
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  const exportToExcel = async () => {
    try {
      // Dynamically import xlsx to avoid SSR issues
      const XLSX = await import('xlsx')
      
      const dataToExport = sortedData.map(item => ({
        'Asset Name': item.asset.name,
        'Type': item.asset.type || 'N/A',
        'Purchase Date': formatDate(item.purchaseDate),
        'Cost': item.assetCost,
        'Salvage Value': item.salvageValue,
        'Useful Life (Years)': item.usefulLifeYears,
        'Annual Depreciation': item.annualDepreciation,
        'Years Depreciated': parseFloat(item.yearsDepreciated.toFixed(2)),
        'Total Depreciation': item.totalDepreciation,
        'Current Book Value': item.currentBookValue,
        'Years Remaining': parseFloat(item.yearsRemaining.toFixed(2)),
        'Container': item.container?.name || 'Unassigned',
        'Make': item.asset.make || '',
        'Model': item.asset.model || '',
        'Serial Number': item.asset.serial_number || '',
        'Status': item.asset.status || ''
      }))

      // Add summary row
      const summaryRow = {
        'Asset Name': `TOTALS (${summary.count} assets)`,
        'Type': '',
        'Purchase Date': '',
        'Cost': summary.totalCost,
        'Salvage Value': '',
        'Useful Life (Years)': '',
        'Annual Depreciation': '',
        'Years Depreciated': '',
        'Total Depreciation': summary.totalDepreciation,
        'Current Book Value': summary.totalBookValue,
        'Years Remaining': '',
        'Container': '',
        'Make': '',
        'Model': '',
        'Serial Number': '',
        'Status': ''
      }

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet([...dataToExport, summaryRow])
      
      // Set column widths
      const colWidths = [
        { wch: 25 }, // Asset Name
        { wch: 15 }, // Type
        { wch: 15 }, // Purchase Date
        { wch: 12 }, // Cost
        { wch: 15 }, // Salvage Value
        { wch: 18 }, // Useful Life
        { wch: 18 }, // Annual Depreciation
        { wch: 18 }, // Years Depreciated
        { wch: 18 }, // Total Depreciation
        { wch: 18 }, // Current Book Value
        { wch: 15 }, // Years Remaining
        { wch: 20 }, // Container
        { wch: 15 }, // Make
        { wch: 15 }, // Model
        { wch: 15 }, // Serial Number
        { wch: 12 }  // Status
      ]
      ws['!cols'] = colWidths

      // Format currency columns
      const currencyColumns = ['D', 'G', 'I', 'J'] // Cost, Annual Depreciation, Total Depreciation, Current Book Value
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
      
      currencyColumns.forEach(col => {
        for (let row = 1; row <= range.e.r + 1; row++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col.charCodeAt(0) - 65 })
          if (ws[cellAddress]) {
            // Format as currency
            ws[cellAddress].z = '$#,##0.00'
          }
        }
      })

      // Create workbook
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Asset Depreciation')

      // Generate filename with current date
      const dateStr = new Date().toISOString().split('T')[0]
      const filename = `asset-depreciation-${dateStr}.xlsx`

      // Write file
      XLSX.writeFile(wb, filename)
    } catch (error) {
      console.error('Error exporting to Excel:', error)
      alert('Failed to export to Excel. Please make sure the xlsx package is installed.')
    }
  }

  const handleSignOut = async () => {
    try {
      const tabId = getTabId()
      clearTabSession(tabId)
      const { supabase: getSupabaseClient } = await import('../../lib/supabaseClient')
      const supabase = getSupabaseClient()
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (error) {
      console.error('Error signing out:', error)
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const sortedData = getSortedData()
  const summary = getSummaryTotals()
  const uniqueTypes = Array.from(new Set(assets.map(a => a.type).filter(Boolean))) as string[]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout */}
          <div className="block sm:hidden py-4">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center">
                <div className="h-6 w-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs font-bold text-white">AT</span>
                </div>
                <h1 className="text-lg font-bold text-gray-900">assetTRAC</h1>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => window.location.href = '/profile'}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <span className="text-xs text-gray-700 truncate">
                Welcome, {getDisplayName()}
              </span>
              {userRoles.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Role:</span>
                  <div className="flex flex-wrap gap-1">
                    {userRoles.map((role, index) => (
                      <span
                        key={index}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : role === 'owner'
                            ? 'bg-green-100 text-green-800'
                            : role.startsWith('manager')
                            ? 'bg-orange-100 text-orange-800'
                            : role === 'tech'
                            ? 'bg-blue-100 text-blue-800'
                            : role.startsWith('viewer')
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {role.includes('-') 
                          ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                          : role.charAt(0).toUpperCase() + role.slice(1)
                        }
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden sm:flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">AT</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">assetTRAC</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex flex-col items-end">
                <span className="text-sm text-gray-700">
                  Welcome, {getDisplayName()}
                </span>
                {userRoles.length > 0 && (
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">Role:</span>
                    <div className="flex space-x-1">
                      {userRoles.map((role, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : role === 'owner'
                              ? 'bg-green-100 text-green-800'
                              : role.startsWith('manager')
                              ? 'bg-orange-100 text-orange-800'
                              : role === 'tech'
                              ? 'bg-blue-100 text-blue-800'
                              : role.startsWith('viewer')
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {role.includes('-') 
                            ? role.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                            : role.charAt(0).toUpperCase() + role.slice(1)
                          }
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => window.location.href = '/profile'}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Profile
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSignOut}
                className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="fixed top-28 sm:top-24 left-0 right-0 z-40 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <button
                  onClick={() => window.location.href = '/dashboard'}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="flex-shrink-0 h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                  </svg>
                  <span className="sr-only">Dashboard</span>
                </button>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">Financials</span>
                </div>
              </li>
            </ol>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 pt-44 sm:pt-36">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Financials - Asset Depreciation</h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600">Straight-line depreciation analysis for all company assets</p>
          </div>

          {/* Depreciation Settings */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Depreciation Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Salvage Value
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={defaultSalvageValue}
                  onChange={(e) => setDefaultSalvageValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Useful Life (Years)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={defaultUsefulLife}
                  onChange={(e) => setDefaultUsefulLife(parseInt(e.target.value) || 4)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={calculateDepreciation}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700"
                >
                  Recalculate
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Types</option>
                  {uniqueTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Container</label>
                <select
                  value={filterContainer}
                  onChange={(e) => setFilterContainer(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">All Containers</option>
                  {containers.map(container => (
                    <option key={container.id} value={container.id}>{container.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date From</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {filterDateFrom && (
                    <button
                      onClick={() => setFilterDateFrom('')}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md border border-gray-300"
                      title="Clear date"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date To</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {filterDateTo && (
                    <button
                      onClick={() => setFilterDateTo('')}
                      className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md border border-gray-300"
                      title="Clear date"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Summary and Export */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4 sm:mb-0">Summary</h3>
              <button
                onClick={exportToExcel}
                disabled={sortedData.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export to Excel</span>
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Assets</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{summary.count}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Cost</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(summary.totalCost)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Depreciation</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900">{formatCurrency(summary.totalDepreciation)}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Book Value</p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600">{formatCurrency(summary.totalBookValue)}</p>
              </div>
            </div>
          </div>

          {/* Assets Table */}
          {assetsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : sortedData.length === 0 ? (
            <div className="text-center py-12 bg-white shadow rounded-lg">
              <p className="text-gray-500">No assets found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          className="px-4 xl:px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[180px]"
                          onClick={() => handleSort('name')}
                        >
                          Asset Name {getSortIcon('name')}
                        </th>
                        <th
                          className="px-4 xl:px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px]"
                          onClick={() => handleSort('type')}
                        >
                          Type {getSortIcon('type')}
                        </th>
                        <th
                          className="px-4 xl:px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[140px]"
                          onClick={() => handleSort('purchaseDate')}
                        >
                          Purchase Date {getSortIcon('purchaseDate')}
                        </th>
                        <th
                          className="px-4 xl:px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[120px]"
                          onClick={() => handleSort('cost')}
                        >
                          Cost {getSortIcon('cost')}
                        </th>
                        <th className="px-4 xl:px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">
                          Annual Depreciation
                        </th>
                        <th className="px-4 xl:px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                          Years Depreciated
                        </th>
                        <th
                          className="px-4 xl:px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[150px]"
                          onClick={() => handleSort('totalDepreciation')}
                        >
                          Total Depreciation {getSortIcon('totalDepreciation')}
                        </th>
                        <th
                          className="px-4 xl:px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 min-w-[150px]"
                          onClick={() => handleSort('bookValue')}
                        >
                          Current Book Value {getSortIcon('bookValue')}
                        </th>
                        <th className="px-4 xl:px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px]">
                          Years Remaining
                        </th>
                        <th className="px-4 xl:px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                          Container
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedData.map((item) => (
                        <tr key={item.asset.id} className="hover:bg-gray-50">
                          <td className="px-4 xl:px-8 py-4 text-sm font-medium text-gray-900">
                            {item.asset.name}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm text-gray-500">
                            {item.asset.type || 'N/A'}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm text-gray-500">
                            {formatDate(item.purchaseDate)}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm text-gray-900 text-right">
                            {formatCurrency(item.assetCost)}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm text-gray-900 text-right">
                            {formatCurrency(item.annualDepreciation)}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm text-gray-500 text-right">
                            {item.yearsDepreciated.toFixed(2)}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm text-gray-900 text-right">
                            {formatCurrency(item.totalDepreciation)}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm font-medium text-indigo-600 text-right">
                            {formatCurrency(item.currentBookValue)}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm text-gray-500 text-right">
                            {item.yearsRemaining.toFixed(2)}
                          </td>
                          <td className="px-4 xl:px-8 py-4 text-sm text-gray-500">
                            {item.container?.name || 'Unassigned'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td colSpan={3} className="px-4 xl:px-8 py-4 text-sm font-bold text-gray-900">
                          Totals ({summary.count} assets)
                        </td>
                        <td className="px-4 xl:px-8 py-4 text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(summary.totalCost)}
                        </td>
                        <td colSpan={2}></td>
                        <td className="px-4 xl:px-8 py-4 text-sm font-bold text-gray-900 text-right">
                          {formatCurrency(summary.totalDepreciation)}
                        </td>
                        <td className="px-4 xl:px-8 py-4 text-sm font-bold text-indigo-600 text-right">
                          {formatCurrency(summary.totalBookValue)}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Tablet/Mobile Horizontal Scroll View */}
              <div className="hidden md:block lg:hidden bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full divide-y divide-gray-200 min-w-[1000px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Dep.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Yrs Dep.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Dep.</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Book Value</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Yrs Left</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Container</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedData.map((item) => (
                        <tr key={item.asset.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.asset.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.asset.type || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(item.purchaseDate)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.assetCost)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.annualDepreciation)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.yearsDepreciated.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(item.totalDepreciation)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-indigo-600 text-right">{formatCurrency(item.currentBookValue)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500 text-right">{item.yearsRemaining.toFixed(2)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{item.container?.name || 'Unassigned'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden space-y-4">
                {sortedData.map((item) => (
                  <div key={item.asset.id} className="bg-white shadow rounded-lg p-4">
                    <div className="mb-3">
                      <h3 className="text-lg font-medium text-gray-900">{item.asset.name}</h3>
                      <p className="text-sm text-gray-500">{item.asset.type || 'N/A'} • {item.container?.name || 'Unassigned'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Purchase Date</p>
                        <p className="font-medium text-gray-900">{formatDate(item.purchaseDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Cost</p>
                        <p className="font-medium text-gray-900">{formatCurrency(item.assetCost)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Annual Depreciation</p>
                        <p className="font-medium text-gray-900">{formatCurrency(item.annualDepreciation)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Years Depreciated</p>
                        <p className="font-medium text-gray-900">{item.yearsDepreciated.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Depreciation</p>
                        <p className="font-medium text-gray-900">{formatCurrency(item.totalDepreciation)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Book Value</p>
                        <p className="font-medium text-indigo-600">{formatCurrency(item.currentBookValue)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Years Remaining</p>
                        <p className="font-medium text-gray-900">{item.yearsRemaining.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Session Timeout Warning */}
      <SessionTimeoutWarning
        show={showWarning}
        timeRemaining={timeRemainingFormatted}
        onExtend={extendSession}
        onDismiss={dismissWarning}
      />
    </div>
  )
}
