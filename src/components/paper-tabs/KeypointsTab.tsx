"use client";

import {useEffect, useState} from "react";
import {Accordion, AccordionContent, AccordionItem, AccordionTrigger} from "@/components/ui/accordion";
import {createClientComponentClient} from "@supabase/auth-helpers-nextjs";

type KeypointsTabProps = {
    arxivId: string;
};

export default function KeypointsTab({arxivId}: KeypointsTabProps) {
    const supabase = createClientComponentClient();

    const [sections, setSections] = useState<
        { title: string; content: string | null }[]
    >([]);

    const [openItems, setOpenItems] = useState<string[]>([]);

    useEffect(() => {
        if (sections.length > 0) {
            // Open all by default *after* sections are loaded
            setOpenItems(sections.map((_, i) => `item-${i}`));
        }
    }, [sections]);

    useEffect(() => {
        if (!arxivId) return;

        const channel = supabase
            .channel("papers-changes")
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "papers",
                    filter: `arxiv_id=eq.${arxivId}`,
                },
                (payload) => {
                    console.log("📡 Realtime update:", payload.new);

                    const data = payload.new;
                    const mappedSections = [
                        {title: "Problem Statement", content: data.problem_statement},
                        {title: "Objectives", content: data.objectives},
                        {title: "Methodology", content: data.methodology},
                        {title: "Results", content: data.results},
                        {title: "Discussions", content: data.discussions},
                        {title: "Limitations", content: data.limitations},
                    ];
                    setSections(mappedSections);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [arxivId, supabase]);

    useEffect(() => {
        const fetchKeypoints = async () => {
            console.log("🔍 Fetching keypoints for paper.id:", arxivId);

            const {data, error} = await supabase
                .from("papers")
                .select(
                    "problem_statement, objectives, methodology, results, discussions, limitations"
                )
                .eq("arxiv_id", arxivId)
                .single();

            if (error && error.code !== "PGRST116") {
                console.error("❌ Error fetching keypoints:", error);
                return;
            }

            if (!data) {
                // Paper exists in table but keypoints not yet processed
                const placeholderSections = [
                    {title: "Problem Statement", content: "Paper is being processed. Please wait."},
                    {title: "Objectives", content: "Paper is being processed. Please wait."},
                    {title: "Methodology", content: "Paper is being processed. Please wait."},
                    {title: "Results", content: "Paper is being processed. Please wait."},
                    {title: "Discussions", content: "Paper is being processed. Please wait."},
                    {title: "Limitations", content: "Paper is being processed. Please wait."},
                ];
                setSections(placeholderSections);
                return;
            }

            console.log("✅ Raw data from Supabase:", data);

            const mappedSections = [
                {title: "Problem Statement", content: data.problem_statement},
                {title: "Objectives", content: data.objectives},
                {title: "Methodology", content: data.methodology},
                {title: "Results", content: data.results},
                {title: "Discussions", content: data.discussions},
                {title: "Limitations", content: data.limitations},
            ];

            console.log("📌 Mapped sections:", mappedSections);
            setSections(mappedSections);
        };

        if (arxivId) fetchKeypoints();
        else console.warn("⚠️ No paper.id provided to KeypointsTab");
    }, [arxivId, supabase]);

    return (
        <div className="pb-2">
            <Accordion
                type="multiple"
                value={openItems}
                onValueChange={setOpenItems}
            >
                {sections.map((section, index) => (
                    <AccordionItem
                        key={index}
                        value={`item-${index}`}
                        className="border border-gray-300 rounded-lg shadow-md mb-4 "
                    >
                        <AccordionTrigger className="font-bold px-4 py-2">
                            {section.title}
                        </AccordionTrigger>
                        <div className="border-t border-gray-300">
                            <AccordionContent className="px-4 py-2 whitespace-pre-line">
                                {section.content || "Paper is being processed. Please wait."}
                            </AccordionContent>
                        </div>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
