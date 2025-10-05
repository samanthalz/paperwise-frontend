'use client'

import {useRouter} from 'next/navigation'
import React, {useEffect} from 'react'
import {registerUser} from './actions'
import InputField from '@/components/input-field'
import Image from 'next/image'
import Link from "next/link";

const initialState = {
    error: undefined,
    success: false,
}

export default function RegisterPage() {
    const router = useRouter()

    const [state, formAction, isPending] = React.useActionState(registerUser, initialState)

    // Redirect after success
    useEffect(() => {
        if (state.success) {
            const timeout = setTimeout(() => {
                router.replace('/login')
            }, 1000) // Delay for smoother UX
            return () => clearTimeout(timeout)
        }
    }, [state.success, router])

    // Show loading state
    if (isPending) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center gap-4">
                    {/* Dual ring spinner */}
                    <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-base font-medium text-gray-600">Registering your account...</p>
                </div>
            </div>
        )
    }

    // Show redirecting state briefly
    if (state.success) {
        return (
            <div className="flex items-center justify-center h-screen bg-white">
                <div className="flex flex-col items-center gap-4">
                    {/* Green dual ring spinner */}
                    <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-base font-medium text-gray-600">Redirecting to login...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen">
            {/* Left side */}
            <div className="w-1/2 flex flex-col justify-center items-center px-16">
                <div className="w-full max-w-md">
                    <h2 className="text-3xl font-semibold mb-2">Register</h2>
                    <p className="mb-8 text-sm">
                        If you already have an account, you can{' '}
                        <Link href="/login" className="text-blue-600 font-semibold">
                            Login Here!
                        </Link>
                    </p>

                    <form action={formAction} className="space-y-8">
                        <InputField
                            label="Full Name"
                            type="text"
                            placeholder="Enter your full name"
                            icon="user"
                            name="fullName"
                            required
                        />

                        <InputField
                            label="Email"
                            type="email"
                            placeholder="Enter your email address"
                            icon="email"
                            name="email"
                            required
                        />

                        <InputField
                            label="Password"
                            type="password"
                            placeholder="Enter your password"
                            icon="lock"
                            name="password"
                            isPassword
                            required
                        />

                        <InputField
                            label="Confirm Password"
                            type="password"
                            placeholder="Re-enter your password"
                            icon="lock"
                            name="confirmPassword"
                            isPassword
                            required
                        />

                        {/* Error message below confirm password */}
                        {state.error && (
                            <div className="text-sm text-red-600 -mt-4">
                                ⚠️ {state.error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 rounded-full text-lg mt-4"
                        >
                            Register
                        </button>
                    </form>
                </div>
            </div>

            {/* Right side */}
            <div className="w-1/2 relative bg-white flex items-center justify-center overflow-hidden">
                <Image
                    src="/images/login-bg.png"
                    alt="Paper stack"
                    width={1792}
                    height={2560}
                    className="w-auto h-auto"
                    priority
                />
                <div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 border px-6 py-2 rounded-xl text-white border-white z-10">
                    PaperWise
                </div>
            </div>
        </div>
    )
}
