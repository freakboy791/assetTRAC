import { NextApiRequest, NextApiResponse } from 'next'
import { supabaseAdmin } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    console.log('Clear Tables API: Clearing all tables...')
    
    // Clear tables in the correct order (respecting foreign key constraints)
    const tablesToClear = [
      'activity_logs',
      'invites', 
      'company_users',
      'profiles',
      'companies'
    ]

    const results: Array<{ table: string; success: boolean; error?: string }> = []

    for (const table of tablesToClear) {
      try {
        console.log(`Clear Tables API: Clearing table: ${table}`)
        const { error } = await supabaseAdmin()
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

        if (error) {
          console.error(`Clear Tables API: Error clearing ${table}:`, error)
          results.push({ table, success: false, error: error.message })
        } else {
          console.log(`Clear Tables API: Successfully cleared ${table}`)
          results.push({ table, success: true })
        }
      } catch (tableError) {
        console.error(`Clear Tables API: Exception clearing ${table}:`, tableError)
        results.push({ table, success: false, error: tableError.message })
      }
    }

    // Check final counts
    const finalCounts = {}
    for (const table of tablesToClear) {
      try {
        const { count } = await supabaseAdmin()
          .from(table)
          .select('*', { count: 'exact', head: true })
        finalCounts[table] = count || 0
      } catch (error) {
        finalCounts[table] = 'Error'
      }
    }

    console.log('Clear Tables API: Final table counts:', finalCounts)

    return res.status(200).json({
      success: true,
      message: 'Tables cleared successfully',
      results,
      finalCounts
    })

  } catch (error) {
    console.error('Clear Tables API: Unexpected error:', error)
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    })
  }
}
