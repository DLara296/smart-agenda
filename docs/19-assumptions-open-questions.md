# Assumptions and Open Questions

## Assumptions
- A family may include multiple adults and children, but the system will treat each child as linked to a primary family record.
- A child is expected to belong to one active school group per session context, although future modeling may support broader attendance scenarios.
- Guest roles are individual accounts that can access only the data tied to their own family or assigned volunteer tasks.
- Family registration defaults to admin approval for MVP to minimize risk and protect privacy.
- One volunteer can cover one group per session in the initial implementation unless the product owner approves broader coverage.
- Rotation logic will support weekly group assignment with overrides for holidays and cancellations.
- The system will maintain full historical logs for cancellations, replacements, and volunteer changes.

## Open Questions for Product Owner
- Can one family belong to multiple schools at the same time?
- Can a child be part of multiple school groups in parallel?
- Is a guest account an individual account or a household account?
- What exact data may guests view outside their own family record?
- Is admin approval required for all family registrations?
- May multiple volunteers serve one group in a session?
- Can one volunteer cover multiple groups within the same session?
- What is the retention and deletion policy for child data and historical participation records?
- Who determines the reading book and when does it become mandatory?
- Are teachers required to have accounts in MVP?
- Is one teacher email per teacher or one aggregated address per group?
- How many days ahead should volunteer requests be sent?
- What escalation path is used for missing volunteers?
- Does WhatsApp become a required launch channel, or can email-first delivery be acceptable?
- Which email, SMS, and WhatsApp providers, sender identities, countries/regions, and credential owners are approved for production delivery?
- What recipient-level opt-in, opt-out, and consent-provenance rules apply per channel and locale, and how are revoked contacts suppressed at dispatch time?
- Which countries and locales are in scope for the initial release?
- What privacy and consent rules apply to child photos and media collection?
