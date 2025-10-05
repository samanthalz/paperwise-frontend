'use server'

import {createClient} from '@/utils/supabase/server'
import {createClient as createSupabaseClient} from '@supabase/supabase-js'

type FormState = {
    error?: string
    success?: boolean
}

export async function registerUser(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    console.log('START registerUser')
    console.log({fullName, email, password, confirmPassword})

    if (password !== confirmPassword) {
        console.log('Passwords do not match')
        return {error: 'Passwords do not match'}
    }

    const supabase = await createClient()

    console.log('Supabase client created')

    // Create auth user
    const {data, error} = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {full_name: fullName}, // custom metadata
        },
    })
    console.log('Signup result', {data, error})

    if (error || !data.user) {
        console.log('Signup failed', error)
        return {error: error?.message ?? 'Signup failed'}
    }

    const userId = data.user.id
    console.log('User created with ID:', userId)

    // ✅ Use service role client to insert into "users" table
    const supabaseAdmin = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY! // 🔑 service role key
    )

    const {error: dbError} = await supabaseAdmin.from('users').insert({
        id: userId,
        full_name: fullName,
    })
    console.log('Insert result', dbError)

    if (dbError) {
        return {error: dbError.message}
    }

    console.log('Returning success')
    return {success: true}
}
