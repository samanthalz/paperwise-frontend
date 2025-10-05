type ArxivPaper = {
    id: string;
    title: string;
    summary: string;
    authors: string[];
    published: string;
    pdfUrl: string;
};

export default function SummaryTab({paper}: { paper: ArxivPaper }) {
    const arxivId = paper?.id.split("/").pop();

    const publishedDate = paper
        ? new Date(paper.published).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
        })
        : "-";

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold">{paper?.title}</h2>

            <p className="text-sm">
                <span className="font-semibold">Authors:</span>{" "}
                {paper?.authors.join(", ")}
            </p>

            <p className="text-sm">
                <span className="font-semibold">arXiv ID:</span>{" "}
                <a
                    href={`https://arxiv.org/abs/${arxivId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                >
                    {arxivId}
                </a>
            </p>

            <p className="text-sm">
                <span className="font-semibold">Published Date:</span>{" "}
                {publishedDate}
            </p>

            <p className="text-sm">
                <span className="font-semibold">Citation Count:</span> 462
            </p>

            <div>
                <p className="font-semibold">Summary:</p>
                <p className="mt-2 text-sm leading-relaxed">{paper?.summary}</p>
            </div>
        </div>
    );
}
