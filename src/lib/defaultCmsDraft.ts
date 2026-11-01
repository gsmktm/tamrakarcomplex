// Default CMS pages are editorial scaffolds, not approved seller or platform policies.
// This affects newly generated drafts only; existing content_pages rows are untouched.
export const CMS_UNVERIFIED_DRAFT_MARKER = "<!-- tamrakar:unverified-default-template -->";

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char];
  });

export function buildDefaultCmsDraft(title: string): string {
  return `${CMS_UNVERIFIED_DRAFT_MARKER}
<h1>${escapeHtml(title)}</h1>
<p><strong>Editorial draft only — not approved for publication.</strong></p>
<p>Replace this placeholder with verified, seller-specific or platform-approved information before publishing. Confirm applicable terms, responsible party, evidence, and approval date with an authorized reviewer. Do not promise prices, stock, discounts, EMI terms, refunds, warranties, payment methods, or delivery times without verification.</p>`;
}

// Client-side guard for the CMS editor. Authorization and review processes still
// require server-side enforcement; this does not certify merchant approval.
export function assertCmsDraftPublicationReady(content: string, isPublished: boolean): void {
  if (isPublished && content.includes(CMS_UNVERIFIED_DRAFT_MARKER)) {
    throw new Error("Replace the unverified default draft with reviewed content before publishing.");
  }
}
