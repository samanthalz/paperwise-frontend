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

        const {data, error} = await supabaseAdmin.auth.admin.listUsers()

        if (error) {
            console.error('Supabase admin.listUsers error:', error)
            return new Response(JSON.stringify({error: error.message}), {status: 500})
        }

        // Check if email exists in the list
        const exists = data.users.some((user) => user.email === email)

        return new Response(JSON.stringify({exists}), {status: 200})
    } catch (err) {
        console.error('Unexpected error in /api/check-email:', err)
        return new Response(JSON.stringify({error: 'Internal Server Error'}), {status: 500})
    }
}
