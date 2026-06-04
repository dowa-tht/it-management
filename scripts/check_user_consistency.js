'use server'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * ตรวจสอบความสอดคล้องระหว่าง user_profiles และ auth.users
 * แสดงรายการที่ไม่ตรงกันและปัญหาที่พบ
 */
export async function checkUserConsistency() {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    console.log('🔍 เริ่มตรวจสอบความสอดคล้องระหว่าง user_profiles และ auth.users...\n')
    
    // 1. ดึงข้อมูลทั้งสองตาราง
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false })
    
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (profileError) throw profileError
    if (authError) throw authError
    
    console.log(`📊 พบข้อมูล:`)
    console.log(`   - user_profiles: ${profiles.length} รายการ`)
    console.log(`   - auth.users: ${authUsers.users.length} รายการ\n`)
    
    // 2. สร้าง Map สำหรับการเปรียบเทียบ
    const profileMap = new Map(profiles.map(p => [p.id, p]))
    const authMap = new Map(authUsers.users.map(u => [u.id, u]))
    const profileEmailMap = new Map(profiles.map(p => [p.email, p]))
    const authEmailMap = new Map(authUsers.users.map(u => [u.email, u]))
    
    // 3. ตรวจสอบปัญหาต่างๆ
    const issues = []
    
    // 3.1 Profile ที่ไม่มีใน Auth
    const profilesMissingAuth = profiles.filter(p => !authMap.has(p.id))
    if (profilesMissingAuth.length > 0) {
      issues.push({
        type: 'PROFILE_MISSING_AUTH',
        count: profilesMissingAuth.length,
        details: profilesMissingAuth.map(p => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          role: p.role
        }))
      })
    }
    
    // 3.2 Auth ที่ไม่มีใน Profile
    const authMissingProfile = authUsers.users.filter(u => !profileMap.has(u.id))
    if (authMissingProfile.length > 0) {
      issues.push({
        type: 'AUTH_MISSING_PROFILE',
        count: authMissingProfile.length,
        details: authMissingProfile.map(u => ({
          id: u.id,
          email: u.email,
          created_at: u.created_at
        }))
      })
    }
    
    // 3.3 Email ที่ไม่ตรงกัน
    const emailMismatch = profiles.filter(p => {
      const authUser = authMap.get(p.id)
      return authUser && authUser.email !== p.email
    })
    if (emailMismatch.length > 0) {
      issues.push({
        type: 'EMAIL_MISMATCH',
        count: emailMismatch.length,
        details: emailMismatch.map(p => ({
          id: p.id,
          full_name: p.full_name,
          profile_email: p.email,
          auth_email: authMap.get(p.id)?.email
        }))
      })
    }
    
    // 3.4 Full_name ที่ซ้ำกันใน Profile
    const nameCounts = {}
    profiles.forEach(p => {
      nameCounts[p.full_name] = (nameCounts[p.full_name] || 0) + 1
    })
    const duplicateNames = Object.entries(nameCounts)
      .filter(([name, count]) => count > 1)
      .map(([name, count]) => ({ name, count }))
    
    if (duplicateNames.length > 0) {
      issues.push({
        type: 'DUPLICATE_NAMES',
        count: duplicateNames.length,
        details: duplicateNames
      })
    }
    
    // 4. แสดงผลลัพธ์
    console.log('🔍 ผลการตรวจสอบ:\n')
    
    if (issues.length === 0) {
      console.log('✅ ไม่พบปัญหาความสอดคล้อง')
    } else {
      issues.forEach(issue => {
        switch (issue.type) {
          case 'PROFILE_MISSING_AUTH':
            console.log(`❌ Profile ที่ไม่มีใน Auth.users (${issue.count} รายการ):`)
            issue.details.forEach(p => {
              console.log(`   - ID: ${p.id} | Name: ${p.full_name} | Email: ${p.email || 'N/A'} | Role: ${p.role}`)
            })
            break
            
          case 'AUTH_MISSING_PROFILE':
            console.log(`❌ Auth users ที่ไม่มีใน user_profiles (${issue.count} รายการ):`)
            issue.details.forEach(u => {
              console.log(`   - ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`)
            })
            break
            
          case 'EMAIL_MISMATCH':
            console.log(`❌ Email ไม่ตรงกัน (${issue.count} รายการ):`)
            issue.details.forEach(p => {
              console.log(`   - ID: ${p.id} | Name: ${p.full_name}`)
              console.log(`     Profile Email: ${p.profile_email || 'N/A'}`)
              console.log(`     Auth Email: ${p.auth_email}`)
            })
            break
            
          case 'DUPLICATE_NAMES':
            console.log(`⚠️ ชื่อซ้ำกันใน user_profiles (${issue.count} ชื่อ):`)
            issue.details.forEach(d => {
              console.log(`   - "${d.name}" (${d.count} รายการ)`)
            })
            break
        }
        console.log('')
      })
    }
    
    // 5. สรุปสถิติ
    console.log('📈 สรุปสถิติ:')
    console.log(`   - ปัญหาทั้งหมด: ${issues.length} ประเภท`)
    console.log(`   - Profile ขาด Auth: ${profilesMissingAuth.length} รายการ`)
    console.log(`   - Auth ขาด Profile: ${authMissingProfile.length} รายการ`)
    console.log(`   - Email ไม่ตรง: ${emailMismatch.length} รายการ`)
    console.log(`   - ชื่อซ้ำ: ${duplicateNames.length} ชื่อ`)
    
    return {
      success: true,
      totalProfiles: profiles.length,
      totalAuth: authUsers.users.length,
      issues,
      summary: {
        profilesMissingAuth: profilesMissingAuth.length,
        authMissingProfile: authMissingProfile.length,
        emailMismatch: emailMismatch.length,
        duplicateNames: duplicateNames.length
      }
    }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตรวจสอบ:', error)
    return { success: false, error: error.message }
  }
}

/**
 * แสดงรายการ users ทั้งหมดเพื่อตรวจสอบด้วยตา
 */
export async function listAllUsers() {
  const supabaseAdmin = getSupabaseAdmin()
  
  try {
    console.log('📋 ดึงข้อมูล users ทั้งหมด...\n')
    
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .order('created_at', { ascending: false })
    
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (profileError) throw profileError
    if (authError) throw authError
    
    console.log('👥 user_profiles:')
    profiles.forEach(p => {
      console.log(`   ${p.id} | ${p.full_name} | ${p.email || 'N/A'} | ${p.role} | Active: ${p.is_active}`)
    })
    
    console.log('\n🔐 auth.users:')
    authUsers.users.forEach(u => {
      console.log(`   ${u.id} | ${u.email} | Created: ${u.created_at}`)
    })
    
    return { profiles, authUsers: authUsers.users }
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error)
    return { error: error.message }
  }
}
