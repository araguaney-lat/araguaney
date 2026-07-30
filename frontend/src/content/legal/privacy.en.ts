import type { LegalDoc } from "./types"

// Privacy Notice — English mirror of privacy.es.ts. Framed under Mexico's
// LFPDPPP (the platform operates from Mexico). First version; not legal advice.

export const privacyEn: LegalDoc = {
  title: "Privacy Notice",
  version: "1.1",
  updatedISO: "2026-07-29",
  updatedLabel: "July 29, 2026",
  versionLabel: "Version",
  updatedPrefix: "Last updated:",
  intro:
    "This Privacy Notice describes what personal data we process, for what purposes, and how you can exercise your rights. We process data about two groups: the people who operate the platform (coordinators, volunteers and administrators) and, when they choose it, donors who ask to be registered. Araguaney still does not collect data about final beneficiaries, and anonymous donation remains the norm: registering a donor is always optional.",
  sections: [
    {
      heading: "Data controller",
      blocks: [
        "The controller of your personal data is the Araguaney project (\"Araguaney\", \"the platform\", \"we\"), a non-profit initiative to coordinate humanitarian aid collection centers.",
        "As of the date of this notice there is no legal entity associated with the project: the data controller is Antony Delgado Casanova, the project's owner, who personally handles privacy requests through the email listed below and in the Data Subject Rights section. If a legal entity is constituted in the future, this notice will be updated with its legal name and registered address.",
        "For any matter related to your personal data or this notice, contact us at: privacidad@araguaney.lat",
      ],
    },
    {
      heading: "Personal data we collect",
      blocks: [
        "We only collect the data needed to register and operate your account within a collection center. These are:",
        {
          table: {
            head: ["Data", "Purpose"],
            rows: [
              ["Name and username", "Identify you within the platform and in activity records."],
              ["Email address", "Authentication, invitations and operational communications (e.g. password reset)."],
              ["Password", "Stored only in encrypted (hashed) form; never in clear text and never known to us."],
              ["Profile photo (optional)", "Only if you choose to upload one; shown in your profile and in the app menu."],
              ["IP address", "Security, abuse prevention, rate limiting and audit logs."],
              ["Activity logs", "Actions you perform on the platform (create/seal boxes, close pallets, shipments, etc.), with date, time and user, for traceability and audit."],
              ["Role, center and campaigns", "Determine what you can see and do within the platform (access control)."],
            ],
          },
        },
        {
          emphasis:
            "We do not collect personal data of final beneficiaries. The platform manages in-kind donation inventory.",
        },
        "Donor data. A donation is anonymous by default and stays that way unless the person asks to be registered. When they do, the center captures only:",
        {
          table: {
            head: ["Donor type", "Data", "Required"],
            rows: [
              ["Individual", "First and last name; email and phone if they wish to provide them", "Name only"],
              ["Organization", "Legal name, first and last name of the person delivering the donation, email and phone", "All of them"],
            ],
          },
        },
        "This data is for the internal control of the center that captured it: it never appears on any public page, nor on the box or pallet records reachable by QR code, nor is it shared with other collection centers.",
      ],
    },
    {
      heading: "Purposes of processing",
      blocks: [
        "We process your personal data for the following primary purposes, necessary to provide the service:",
        {
          list: [
            "Create and manage your user account.",
            "Authenticate you and control your access based on your role and center.",
            "Enable platform operations: donation intake, box sealing, pallets, shipments and manifests.",
            "Ensure platform security: fraud and abuse prevention, rate limiting and detection of unauthorized access.",
            "Keep audit and traceability records of operations.",
            "Send you operational and service communications (invitation, password reset, system notifications).",
          ],
        },
        "We do not use your data for marketing purposes, nor do we sell it to third parties.",
      ],
    },
    {
      heading: "IP addresses and audit logs",
      blocks: [
        "Because this is a platform coordinating humanitarian aid in a sensitive context, we apply reinforced security measures. In particular, we record your IP address and the actions you perform, associated with your user, date and time.",
        "These records are used exclusively for security, abuse prevention and audit. They are not used to build commercial profiles.",
        "Audit and event records are retained for as long as necessary to guarantee the traceability and security of platform operations. When you request the cancellation of your account, we will delete or anonymize your personal data except for what we must retain for legal or security reasons, for the strictly necessary period.",
      ],
    },
    {
      heading: "Transfers and processors",
      blocks: [
        "To operate the platform we rely on technology providers acting as data processors on Araguaney's behalf. These providers process data solely to provide their service to us and under confidentiality obligations. Some are located outside Mexico (mainly in the United States):",
        {
          table: {
            head: ["Provider", "Service", "Data processed"],
            rows: [
              ["Vercel", "Website hosting (frontend)", "IP address, access logs"],
              ["Railway", "Backend and database hosting", "All account and operational data"],
              ["Cloudflare", "Content delivery, security (WAF/DNS), anti-abuse challenge (Turnstile) and file storage (R2)", "IP address, traffic, exports and message attachments"],
              ["Resend", "Transactional email delivery", "Email address and name"],
              ["Cloudinary", "Profile photo storage (only if you upload one)", "Profile image"],
              ["Google (optional)", "Sign-in (OAuth) and analytics on public marketing pages only — never inside the panel", "Authentication data / anonymous public-browsing metrics"],
              ["Sentry (optional)", "Error logging for technical diagnostics", "Technical error context, possibly IP address"],
            ],
          },
        },
        "Queries to reference catalogs (WHO, UNSPSC, IFRC/ICRC, IOM, GS1, COFEPRIS, RxNorm, Open Food Facts) are performed only with product data (e.g. a barcode) and do not include personal data.",
        "We do not transfer your personal data to third parties other than these processors, except where required by a competent authority under the law.",
      ],
    },
    {
      heading: "Cookies and session technologies",
      blocks: [
        "Within the application panel we only use cookies strictly necessary for it to function:",
        {
          list: [
            "Session cookie (authentication) — keeps you signed in.",
            "CSRF protection cookie — prevents cross-site request forgery attacks.",
            "Language cookie — remembers your language preference (Spanish/English).",
          ],
        },
        "We do not use tracking or advertising cookies in the authenticated panel. On public marketing pages we may use web analytics to measure visits in aggregate; this analytics is never loaded inside the panel or the studio.",
      ],
    },
    {
      heading: "Retention periods",
      blocks: [
        "We keep each type of data only for as long as the purpose that originated it requires. These are the current periods:",
        {
          table: {
            head: ["Data", "Period", "What happens when it expires"],
            rows: [
              ["Account data (name, email, photo)", "While the account exists", "Removed when you delete your account or when your center deactivates it"],
              ["Audit records (IP, action, date)", "90 days", "Automatically deleted every night"],
              ["Message attachments", "90 days", "The file is automatically removed from storage"],
              ["Export files (manifests, reports)", "1 hour", "Deleted after download; 24 hours if generation failed"],
              ["Email delivery failure records", "90 days", "Automatically deleted"],
              ["Registered donor data (name, legal name, email, phone)", "While the center keeps it", "Deleted at the donor's request or when the center removes it"],
              ["Online pre-registered donation you never confirmed by email", "7 days from the last confirmation email we sent you", "The donation expires and your contact details are deleted, unless you have another pending or delivered donation"],
              ["Link to manage your pre-registered donation", "30 days", "The link stops working and is deleted from our database; it is also deleted as soon as you deliver the donation"],
              ["Inventory events (who sealed a box, closed a pallet or dispatched a shipment)", "Indefinite", "Not deleted: they sustain the traceability of the aid that was shipped"],
            ],
          },
        },
        "Inventory events deserve an explanation. They are the reason the platform exists: they make it possible to know what each box contained and who prepared it, which is what a humanitarian shipment must be able to demonstrate to customs authorities. That is why they are not deleted. When you delete your account, those events are kept but stop identifying you: your name and email disappear, and only an identifier remains that no longer allows you to be recognized.",
        "Donation pre-registration also deserves an explanation. If you fill in the public form and never confirm your email, we have no way to know those details are yours: we let them expire and delete them. If you confirm and deliver the donation, your details stay linked to what you delivered, because the center must be able to say where each box came from.",
        "We do not automatically delete accounts for inactivity. Humanitarian volunteering is intermittent, and a person may come back months later, facing a new emergency, and need their access. It is up to each center's coordination to deactivate people who are no longer part of it, and up to each person to delete their account whenever they wish.",
      ],
    },
    {
      heading: "Data subject rights (ARCO) and consent withdrawal",
      blocks: [
        "As the owner of your personal data, you have the right to Access it, Rectify it when inaccurate, Cancel it when you consider it is no longer required for the stated purposes, and Object to its processing (ARCO rights). You may also withdraw any consent you have given us.",
        "You can exercise cancellation yourself at any time from Settings in your dashboard: the \"Delete my account\" option permanently removes your name, email, photo and credentials. The record of which boxes you sealed or which shipments you dispatched is kept without your name, because inventory traceability cannot be broken; it remains as an identifier that no longer allows you to be recognized.",
        "To exercise any of these rights, or if you prefer that we do it for you, send your request to:",
        {
          emphasis:
            "privacidad@araguaney.lat — Include your name, the email associated with your account and a clear description of your request. We will respond within a maximum of 20 business days.",
        },
        "Some data —such as certain audit records— may be retained for legal or security reasons even after a cancellation request, for the strictly necessary time. We will inform you if that is the case.",
      ],
    },
    {
      heading: "Information security",
      blocks: [
        "We apply reasonable administrative, technical and physical security measures to protect your data: encryption in transit, encrypted password storage, role-based access control, rate limiting, anti-abuse challenges and audit logs. No system is infallible; in the event of a breach that significantly affects your data, we will notify you as required by law.",
      ],
    },
    {
      heading: "Changes to this notice",
      blocks: [
        "We may update this Privacy Notice to reflect changes in the platform, our providers or applicable regulations. Each version carries a number and a last-updated date shown at the top of this document.",
        "When a change is substantial, we will notify you through available means (e.g. at sign-in or by email) and, where applicable, ask you to accept the terms again. The current version will always be published on this page.",
      ],
    },
  ],
}
