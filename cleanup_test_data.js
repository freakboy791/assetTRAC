// Cleanup script for ABC Consulting, Inc. and cmatt777@comcast.net test data
// Run this in your browser console or as a Node.js script

const { supabase } = require('@/lib/supabaseClient'); // For Node.js
// Or use the global supabase object if running in browser console

async function cleanupTestData() {
  console.log('🧹 Starting cleanup of test data...');
  
  try {
    // 1. First, let's see what we're working with
    console.log('\n📊 Current data to be cleaned up:');
    
    // Check companies
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .or('name.ilike.%ABC Consulting%,email.eq.cmatt777@comcast.net');
    
    if (companiesError) {
      console.error('Error checking companies:', companiesError);
    } else {
      console.log('Companies to delete:', companies);
    }
    
    // Check company_users
    const { data: companyUsers, error: companyUsersError } = await supabase
      .from('company_users')
      .select('*, companies(name)')
      .or('companies.name.ilike.%ABC Consulting%,companies.email.eq.cmatt777@comcast.net');
    
    if (companyUsersError) {
      console.error('Error checking company_users:', companyUsersError);
    } else {
      console.log('Company users to delete:', companyUsers);
    }
    
    // Check invites
    const { data: invites, error: invitesError } = await supabase
      .from('invites')
      .select('*')
      .or('invited_email.eq.cmatt777@comcast.net,company_name.ilike.%ABC Consulting%');
    
    if (invitesError) {
      console.error('Error checking invites:', invitesError);
    } else {
      console.log('Invites to delete:', invites);
    }
    
    // Check profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'cmatt777@comcast.net');
    
    if (profilesError) {
      console.error('Error checking profiles:', profilesError);
    } else {
      console.log('Profiles to delete:', profiles);
    }
    
    // 2. Now delete the data in the correct order
    console.log('\n🗑️ Starting deletion process...');
    
    // Delete company_users first (foreign key constraint)
    if (companyUsers && companyUsers.length > 0) {
      const companyUserIds = companyUsers.map(cu => cu.id);
      const { error: deleteCompanyUsersError } = await supabase
        .from('company_users')
        .delete()
        .in('id', companyUserIds);
      
      if (deleteCompanyUsersError) {
        console.error('Error deleting company_users:', deleteCompanyUsersError);
      } else {
        console.log(`✅ Deleted ${companyUsers.length} company_user records`);
      }
    }
    
    // Delete invites
    if (invites && invites.length > 0) {
      const inviteIds = invites.map(invite => invite.id);
      const { error: deleteInvitesError } = await supabase
        .from('invites')
        .delete()
        .in('id', inviteIds);
      
      if (deleteInvitesError) {
        console.error('Error deleting invites:', deleteInvitesError);
      } else {
        console.log(`✅ Deleted ${invites.length} invite records`);
      }
    }
    
    // Delete companies
    if (companies && companies.length > 0) {
      const companyIds = companies.map(company => company.id);
      const { error: deleteCompaniesError } = await supabase
        .from('companies')
        .delete()
        .in('id', companyIds);
      
      if (deleteCompaniesError) {
        console.error('Error deleting companies:', deleteCompaniesError);
      } else {
        console.log(`✅ Deleted ${companies.length} company records`);
      }
    }
    
    // Delete profiles
    if (profiles && profiles.length > 0) {
      const profileIds = profiles.map(profile => profile.id);
      const { error: deleteProfilesError } = await supabase
        .from('profiles')
        .delete()
        .in('id', profileIds);
      
      if (deleteProfilesError) {
        console.error('Error deleting profiles:', deleteProfilesError);
      } else {
        console.log(`✅ Deleted ${profiles.length} profile records`);
      }
    }
    
    // 3. Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const { count: remainingCompanies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });
    
    const { count: remainingCompanyUsers } = await supabase
      .from('company_users')
      .select('*', { count: 'exact', head: true });
    
    const { count: remainingInvites } = await supabase
      .from('invites')
      .select('*', { count: 'exact', head: true });
    
    const { count: remainingProfiles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Remaining records:`);
    console.log(`   Companies: ${remainingCompanies}`);
    console.log(`   Company Users: ${remainingCompanyUsers}`);
    console.log(`   Invites: ${remainingInvites}`);
    console.log(`   Profiles: ${remainingProfiles}`);
    
    console.log('\n🎉 Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupTestData();

// Note: You'll still need to manually delete the auth user from Supabase dashboard
// Go to Authentication > Users and delete cmatt777@comcast.net
