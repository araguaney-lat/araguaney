import type { LegalDoc } from "./types"

// Terms and Conditions — English mirror of terms.es.ts. First version;
// not legal advice.

export const termsEn: LegalDoc = {
  title: "Terms and Conditions",
  version: "1.0",
  updatedISO: "2026-07-02",
  updatedLabel: "July 2, 2026",
  versionLabel: "Version",
  updatedPrefix: "Last updated:",
  intro:
    "These Terms and Conditions govern the use of the Araguaney platform. By creating an account or using the platform, you accept these terms. If you do not agree, you must not use the platform.",
  sections: [
    {
      heading: "What Araguaney is",
      blocks: [
        "Araguaney is a software tool to coordinate humanitarian aid collection centers: it lets you register in-kind donations by item, pack them into homogeneous boxes with a QR code, consolidate them into pallets and shipments, generate manifests, and view aggregated inventory at a national level.",
        {
          emphasis:
            "Araguaney is a coordination and inventory-management tool. It does NOT transport, deliver or distribute aid, and does NOT guarantee that donations reach any particular destination or beneficiary. Logistics, transport and customs procedures are the sole responsibility of the centers and organizations operating the aid.",
        },
        "The service is provided on a non-profit basis, with the goal of standardizing and coordinating humanitarian aid between collection centers and their shipment destinations.",
      ],
    },
    {
      heading: "Accounts and access",
      blocks: [
        "Access to the platform is by invitation. Accounts are created by administrators or coordinators of a collection center, and each account belongs to a person identified by their email address.",
        "Accounts are restricted to adults. The coordinator of a center is responsible for who they grant access to and must verify this requirement before creating an account. Minors may take part in the physical operation of a center under supervision, but are not issued platform accounts.",
        {
          list: [
            "You are responsible for keeping your password confidential and for all activity performed under your account.",
            "You must provide truthful information and keep it up to date.",
            "You must not share your account or allow its use by unauthorized third parties.",
            "You must notify us immediately of any unauthorized use of your account.",
          ],
        },
      ],
    },
    {
      heading: "Acceptable use",
      blocks: [
        "By using the platform you agree to:",
        {
          list: [
            "Use it solely for legitimate humanitarian aid coordination purposes.",
            "Register truthful and accurate information about donations and inventory.",
            "Not enter personal data of donors or final beneficiaries (the platform is not designed for that).",
            "Not attempt to breach the platform's security, access other centers' data without authorization, or interfere with its operation.",
            "Not use the platform for unlawful, fraudulent or harmful activities.",
          ],
        },
        "Breaching these rules may result in the suspension or cancellation of your account.",
      ],
    },
    {
      heading: "Donation rejection rules",
      blocks: [
        "To ensure the quality and safety of aid, the platform applies rules based on international guidelines (including the WHO guidelines for medicine donations). In particular:",
        {
          list: [
            "Medicines must have at least 365 days of remaining shelf life at the time of intake; otherwise they are rejected.",
            "Food must meet a configurable minimum shelf life (180 days by default).",
            "Controlled substances are blocked and cannot be registered.",
            "Each box must be homogeneous: a single product type, batch and expiry date.",
          ],
        },
        "These validations are part of the service; centers are responsible for the accuracy of the data they enter and for compliance with the regulations applicable to the donations they manage.",
      ],
    },
    {
      heading: "Platform ownership",
      blocks: [
        "Araguaney is a project by Antony Delgado Casanova, who holds the copyright to the source code, the name \"Araguaney\", the logo and the araguaney.lat domain. There is no legal entity associated with the project.",
        "The source code is released as free software under the AGPL-3.0 license and is available at https://github.com/araguaney-lat/araguaney. Anyone may use, study, modify and deploy their own instance under the terms of that license.",
        "The trademark is not licensed along with the code: a derived instance must operate under a different name and domain, without presenting itself as the official instance.",
      ],
    },
    {
      heading: "Data ownership and responsibility",
      blocks: [
        "The inventory data each center records (donations, boxes, pallets, shipments and manifests) belongs to the center that captures it. Araguaney hosts and processes it to provide the service and to produce the aggregated national view that enables coordination between centers.",
        "Each center is responsible for the truthfulness, legality and accuracy of the information it enters. The platform does not independently verify the actual physical content of donations.",
        "We reserve the right to use aggregated and anonymized data (not identifying individuals) for coordination, statistics and service-improvement purposes.",
      ],
    },
    {
      heading: "Availability and limitation of liability",
      blocks: [
        "The platform is provided \"as is\" and \"as available\". We strive to keep it operational and secure, but we do not guarantee it is free of errors or interruptions.",
        {
          emphasis:
            "To the maximum extent permitted by law, Araguaney and the people who operate it shall not be liable for indirect, incidental or consequential damages arising from the use of or inability to use the platform, including loss or delay of donations, failure to deliver aid, or decisions made based on the information shown. The platform is a tool to support coordination, not a guarantor of logistical or humanitarian outcomes.",
        },
        "Nothing in these terms excludes liabilities that cannot be limited under applicable law.",
      ],
    },
    {
      heading: "Suspension and cancellation",
      blocks: [
        "We may suspend or cancel access to an account that breaches these terms, that endangers the security of the platform or other users, or where required by law. You may request the cancellation of your account at any time by writing to privacidad@araguaney.lat.",
      ],
    },
    {
      heading: "Privacy",
      blocks: [
        "The processing of your personal data is governed by our Privacy Notice, which forms an integral part of these terms. We recommend reading it to understand what data we process and how to exercise your rights.",
      ],
    },
    {
      heading: "Changes to these terms",
      blocks: [
        "We may modify these Terms and Conditions. Each version carries a number and a last-updated date shown at the top of this document. When a change is substantial, we will notify you and, where applicable, ask you to accept the terms again to continue using the platform.",
      ],
    },
    {
      heading: "Governing law and jurisdiction",
      blocks: [
        "These terms are governed by the laws of the United Mexican States. Any dispute related to the platform shall be submitted to the competent courts in Mexico, without prejudice to the rights granted by law to consumers or data subjects.",
      ],
    },
  ],
}
