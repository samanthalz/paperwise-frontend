import {createClient} from '@supabase/supabase-js'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
    try {
        const {email} = await req.json()
        if (!email) {
            return new Response(JSON.stringify({error: 'Email is required'}), {status: 400})
        }

        // Check in auth.users
        const {data, error} = await supabaseAdmin
            .from('auth.users') // works only if you have auth schema exposed
            .select('id')
            .eq('email', email)
            .maybeSingle()

        if (error && !error.message.includes('permission')) {
            console.error('check-email error:', error)
            return new Response(JSON.stringify({error: error.message}), {status: 500})
        }

        if (data) {
            return new Response(JSON.stringify({exists: true}), {status: 200})
        }

        // Check custom public users table too
        const {data: userTable} = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle()

        return new Response(
            JSON.stringify({exists: !!userTable}),
            {status: 200}
        )
    } catch (err) {
        console.error('Unexpected error in /api/check-email:', err)
        return new Response(JSON.stringify({error: 'Internal Server Error'}), {status: 500})
    }
}
