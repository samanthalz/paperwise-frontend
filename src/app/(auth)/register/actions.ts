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
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    try {
        const supabase = await createClient()

        // 1. Create auth user
        const {data, error} = await supabase.auth.signUp({
            email,
            password,
            options: {data: {full_name: fullName}},
        })

        if (error || !data.user) {
            // Custom wording for known Supabase error
            if (error?.message === 'User already registered') {
                return {error: 'This email is already associated with an account.'}
            }

            return {error: error?.message ?? 'Signup failed'}
        }

        const userId = data.user.id

        // 2. Insert into public users table using service role key
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
        )

        const {error: dbError} = await supabaseAdmin.from('users').insert({
            id: userId,
            full_name: fullName,
        })

        if (dbError) {
            return {error: dbError.message}
        }

        return {success: true}
    } catch (err: any) {
        console.error('Unexpected error in registerUser:', err)
        return {error: 'Something went wrong. Please try again.'}
    }
}
