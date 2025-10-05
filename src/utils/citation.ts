export type CitationStyle = "Harvard" | "APA7" | "Chicago" | "MLA8";

export type Citation = {
    style: CitationStyle;
    fullText: string;
    inText: string;
};

// --- Format authors ---

// Harvard: Last, F. and Last, F.
function formatAuthorsHarvard(authors: string[]): string {
    const formatted = authors.map((a) => {
        const parts = a.split(" ");
        const last = parts.pop();
        const initials = parts.map((n) => n[0].toUpperCase() + ".").join("");
        return `${last}, ${initials}`;
    });

    if (formatted.length === 1) return formatted[0];
    if (formatted.length === 2) return formatted.join(" and ");
    return formatted.slice(0, -1).join(", ") + ", and " + formatted[formatted.length - 1];
}

// Format authors for APA7: Last, FirstInitial., & Last, FirstInitial.
function formatAuthorsAPA(authors: string[]): string {
    const formatName = (fullName: string) => {
        const parts = fullName.split(" ");
        if (parts.length === 1) return fullName; // single word
        const last = parts.pop();
        const initials = parts.map((n) => n[0]).join(".") + ".";
        return `${last}, ${initials}`;
    };

    if (authors.length === 1) {
        return formatName(authors[0]);
    }

    if (authors.length === 2) {
        return `${formatName(authors[0])}, & ${formatName(authors[1])}`;
    }

    // 3+ authors
    return `${formatName(authors[0])}, et al.`;
}

// Chicago: Last, First for first author, then First Last for remaining authors
function formatAuthorsChicago(authors: string[]): string {
    if (authors.length === 1) {
        const parts = authors[0].split(" ");
        const last = parts.pop();
        return `${last}, ${parts.join(" ")}`;
    }

    const firstAuthorParts = authors[0].split(" ");
    const firstFormatted = `${firstAuthorParts.pop()}, ${firstAuthorParts.join(" ")}`;
    const restAuthors = authors.slice(1).join(", ");

    return restAuthors ? `${firstFormatted}, and ${restAuthors}` : firstFormatted;
}

// MLA8: Last, First for first author, then First Last for remaining authors
function formatAuthorsMLA(authors: string[]): string {
    if (authors.length === 1) return authors[0].split(" ").reverse().join(", "); // Last, First
    const firstAuthor = authors[0].split(" ");
    const firstFormatted = `${firstAuthor.pop()}, ${firstAuthor.join(" ")}`;
    const restAuthors = authors.slice(1).join(", ");
    return restAuthors ? `${firstFormatted}, and ${restAuthors}` : firstFormatted;
}


// --- Generate all citations ---
export function generateCitations({
                                      title,
                                      authors,
                                      arxivId,
                                      publishedDate,
                                  }: {
    title: string;
    authors: string[];
    arxivId: string;
    publishedDate: string;
}): Citation[] {
    const date = new Date(publishedDate);
    const year = date.getFullYear();
    const url = `https://arxiv.org/abs/${arxivId}`;

    // Harvard
    const harvardAuthors = formatAuthorsHarvard(authors);
    const harvardInText =
        authors.length > 2
            ? `${authors[0].split(" ").pop()} et al.`
            : authors.map((a) => a.split(" ").pop()).join(" and ");

    const harvard: Citation = {
        style: "Harvard",
        fullText: `${harvardAuthors} (${year}). ${title}. [online] arXiv.org. Available at: ${url}.`,
        inText: `(${harvardInText}, ${year})`,
    };

    const apaAuthors = formatAuthorsAPA(authors);

    const apa7: Citation = {
        style: "APA7",
        fullText: `${apaAuthors} (${year}). ${title}. ArXiv.org. https://arxiv.org/abs/${arxivId}`,
        inText:
            authors.length > 2
                ? `(${authors[0].split(" ").pop()} et al., ${year})`
                : `(${authors.map((a) => a.split(" ").pop()).join(" & ")}, ${year})`,
    };

    // Chicago
    const chicagoAuthors = formatAuthorsChicago(authors);

    const chicago: Citation = {
        style: "Chicago",
        fullText: `${chicagoAuthors}. ${year}. “${title}.” ArXiv.org. ${year}. https://arxiv.org/abs/${arxivId}.`,
        inText: `(${authors.length > 2
            ? `${authors[0].split(" ").pop()} et al. ${year}`
            : authors.map((a) => a.split(" ").pop()).join(" and ") + ` ${year}`})`,
    };

    // MLA8
    const mlaAuthors = formatAuthorsMLA(authors);

    const mla: Citation = {
        style: "MLA8",
        fullText: `${mlaAuthors}. “${title}.” ArXiv.org, ${year}, ${url}.`,
        inText: `(${authors.length > 2
            ? `${authors[0].split(" ").pop()} et al.`
            : authors.map((a) => a.split(" ").pop()).join(" and ")})`,
    };

    return [harvard, apa7, chicago, mla];
}
