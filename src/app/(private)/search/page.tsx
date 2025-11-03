"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {Search} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import SearchTopbar from "@/components/topbars/search-topbar";
import {useSidebar} from "@/components/ui/sidebar";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [isGuest, setIsGuest] = useState(true);
    const router = useRouter();
    const supabase = createClientComponentClient();
    const {setOpen} = useSidebar();
    const [initialized, setInitialized] = useState(false);

    const suggestions = [
        "Large Language Model",
        "Climate Change Impacts",
        "Computer Science",
        "Public Health Trends",
    ];

    const handleSearch = () => {
        if (query.trim()) {
            router.push(`/search/results?query=${encodeURIComponent(query)}`);
        }
    };

    // Sidebar initially closed
    useEffect(() => {
        if (!initialized) {
            setOpen(false);
            setInitialized(true);
        }
    }, [initialized, setOpen]);

    return (
        <div className="flex flex-col h-full">
            {/* Topbar */}
            <SearchTopbar/>

            {/* Search UI */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="flex flex-col items-center w-full mt-10">
                    <h1 className="text-2xl font-semibold mb-6 text-center">
                        What research are you looking for today?
                    </h1>

                    {/* Search bar */}
                    <div className="flex items-center w-full max-w-xl gap-2">
                        <div className="flex items-center w-full border rounded-md bg-muted px-3">
                            <Search className="text-muted-foreground w-5 h-5 mr-2"/>
                            <Input
                                placeholder="Article name or keywords..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                        </div>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={handleSearch}
                        >
                            Search
                        </Button>
                    </div>

                    {/* Suggestions */}
                    <div className="mt-8 w-full max-w-xl">
                        <div className="bg-white shadow-md rounded-lg p-4 space-y-2">
                            {suggestions.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="px-3 py-2 rounded-md hover:bg-muted cursor-pointer"
                                    onClick={() => {
                                        setQuery(item);
                                        router.push(`/search/results?query=${encodeURIComponent(item)}`);
                                    }}
                                >
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
