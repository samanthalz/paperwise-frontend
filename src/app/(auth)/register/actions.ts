'use server'

import {createClient} from '@/utils/supabase/server'
import {createClient as createSupabaseClient} from '@supabase/supabase-js'

type FormState = {
    error?: string
    success?: boolean
}

export async function registerUser(
    _: FormState,
    formData: FormData
): Promise<FormState> {
    const fullName = formData.get('fullName')
    const email = formData.get('email')
    const password = formData.get('password')

    // Validate types before using them
    if (
        typeof fullName !== 'string' ||
        typeof email !== 'string' ||
        typeof password !== 'string'
    ) {
        return {error: 'Invalid form submission.'}
    }

    try {
        const supabase = await createClient()

        // Create auth user
        const {data, error} = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
                data: {full_name: fullName},
            },
        })

        if (error || !data?.user) {
            if (error?.message?.includes('User already registered')) {
                return {error: 'This email is already associated with an account.'}
            }
            return {error: error?.message ?? 'Signup failed.'}
        }

        const userId = data.user.id

        // Insert into "users" table using service role key
        const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
        const SERVICE_ROLE_KEY = process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY

        if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
            console.error('Missing Supabase environment variables.')
            return {error: 'Server configuration error.'}
        }

        const supabaseAdmin = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY)

        const {error: dbError} = await supabaseAdmin.from('users').insert({
            id: userId,
            full_name: fullName,
        })

        if (dbError) {
            console.error('DB insert error:', dbError)
            return {error: 'Failed to create user profile.'}
        }

        return {
            success: true,
            message: 'Registration successful! Please verify your email before logging in.',
        };

    } catch (err) {
        console.error('Unexpected error in registerUser:', err)
        return {error: 'Something went wrong. Please try again.'}
    }
}
