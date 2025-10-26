'use server'

import {createClient as createSupabaseAdmin} from '@supabase/supabase-js'

export async function deleteAccount(userId: string) {
    try {
        // Validate input
        if (!userId) {
            return {success: false, error: 'Missing user ID.'}
        }

        // Use the *non-public* environment variable for the service role key
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
        const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY // 🔒 safer: not exposed to client

        if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
            console.error('Missing Supabase environment variables.')
            return {success: false, error: 'Server misconfiguration.'}
        }

        // Create Supabase admin client
        const supabaseAdmin = createSupabaseAdmin(SUPABASE_URL, SERVICE_ROLE_KEY)

        // 1Delete user from Supabase Auth
        const {error: deleteAuthError} = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (deleteAuthError) {
            throw new Error(`Auth deletion failed: ${deleteAuthError.message}`)
        }

        // 2Clean up user data from your "users" table
        const {error: deleteUserError} = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId)

        if (deleteUserError) {
            throw new Error(`Database deletion failed: ${deleteUserError.message}`)
        }

        return {success: true}
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error.'
        console.error('Error deleting account:', message)
        return {success: false, error: message}
    }
}
