import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "trqxqdxzunnbqaznmxmd.supabase.co", // your Supabase project host
                pathname: "/storage/v1/object/**", // allow both /public and /sign paths
            },
        ],
    },
};

export default nextConfig;
