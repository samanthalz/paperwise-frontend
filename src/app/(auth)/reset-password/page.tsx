'use client'

import React, {useState} from 'react'
import {useRouter} from 'next/navigation'
import {createClientComponentClient} from '@supabase/auth-helpers-nextjs'
import {Eye, EyeOff} from 'lucide-react'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [clientError, setClientError] = useState<string | undefined>()
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const supabase = createClientComponentClient()

    const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setClientError(undefined)

        // Password strength validation
        const passwordRegex =
            /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+=\-{};:'",.<>/?]{8,}$/
        if (!passwordRegex.test(password)) {
            setClientError(
                'Password must be at least 8 characters long and contain at least one letter and one number.'
            )
            return
        }

        // Confirm password check
        if (password !== confirmPassword) {
            setClientError('Passwords do not match.')
            return
        }

        //  Update user password via Supabase
        const {error} = await supabase.auth.updateUser({
            password: password,
        })

        if (error) {
            setClientError(error.message)
            return
        }

        setSuccess(true)
        setTimeout(() => {
            router.push('/login')
        }, 2000)
    }

    if (success) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-green-600 font-medium">
                    Password updated successfully. Redirecting to login...
                </p>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center h-screen bg-white">
            <form
                onSubmit={handleReset}
                className="w-full max-w-sm border rounded-2xl p-8 shadow-md space-y-6"
            >
                <h2 className="text-2xl font-semibold mb-4">Reset Password</h2>

                {/* New Password */}
                <div className="relative">
                    <label className="block text-sm mb-2 font-medium">
                        New Password
                    </label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 pr-10"
                        placeholder="Enter new password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-gray-500"
                    >
                        {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                    <label className="block text-sm mb-2 font-medium">
                        Confirm Password
                    </label>
                    <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 pr-10"
                        placeholder="Confirm new password"
                        required
                    />
                    <button
                        type="button"
                        onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-9 text-gray-500"
                    >
                        {showConfirmPassword ? (
                            <EyeOff size={18}/>
                        ) : (
                            <Eye size={18}/>
                        )}
                    </button>
                </div>

                {/* Error Message */}
                {clientError && (
                    <p className="text-sm text-red-600 -mt-2">{clientError}</p>
                )}

                {/* Submit */}
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-full text-lg"
                >
                    Reset Password
                </button>
            </form>
        </div>
    )
}
