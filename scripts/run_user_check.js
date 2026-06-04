#!/usr/bin/env node

/**
 * Runner script for user consistency check
 * Usage: node scripts/run_user_check.js
 */

import { checkUserConsistency, listAllUsers } from './check_user_consistency.js'

async function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--list-all')) {
    await listAllUsers()
  } else {
    await checkUserConsistency()
  }
}

main().catch(console.error)
