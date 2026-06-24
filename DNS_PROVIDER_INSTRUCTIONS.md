# DNS Provider Instructions — Weybridge Lodge Email Domain

Date: 24 June 2026

## Purpose

Set up DNS delegation so Lovable email can verify and send from the project’s configured email domain.

## Current Lovable status

- Project configured sender/root domain: `email.weybridgelodge.org.uk`
- Lovable verification domain currently being checked: `notify.email.weybridgelodge.org.uk`
- Current status: **Pending / verifying DNS**

## Exact DNS records to create at the domain DNS provider

Add these records in the DNS zone for `weybridgelodge.org.uk`:

| Type | Host / Name | Value / Target |
| --- | --- | --- |
| NS | `notify.email` | `ns7.lovable.cloud` |
| NS | `notify.email` | `ns8.lovable.cloud` |

Fully qualified, these records mean:

| Type | Full record name | Value / Target |
| --- | --- | --- |
| NS | `notify.email.weybridgelodge.org.uk` | `ns7.lovable.cloud` |
| NS | `notify.email.weybridgelodge.org.uk` | `ns8.lovable.cloud` |

## Records not required at the DNS provider

Do **not** add TXT, SPF, DKIM, DMARC, MX, CNAME, or A records for this Lovable email setup at the registrar/hosting provider.

Lovable manages the internal email DNS records automatically once the `notify.email.weybridgelodge.org.uk` subdomain is delegated to Lovable’s nameservers.

## Existing records to remove if they were added only for Lovable email

If the DNS provider currently has these records, they should be removed because they do not match the domain Lovable is currently verifying:

| Type | Host / Name | Value / Target |
| --- | --- | --- |
| NS | `email` | `ns3.lovable.cloud` |
| NS | `email` | `ns4.lovable.cloud` |

These `email.weybridgelodge.org.uk` NS records are not the active verification target shown by Lovable for this project. The active target is `notify.email.weybridgelodge.org.uk` using `ns7.lovable.cloud` and `ns8.lovable.cloud`.

## Final provider request

Please delegate only this subdomain:

`notify.email.weybridgelodge.org.uk`

to these two nameservers:

`ns7.lovable.cloud`

`ns8.lovable.cloud`

No other DNS records are required for the Lovable email setup.

## Propagation

After the DNS provider makes the change, verification may still show as pending while DNS propagates. This can take from a few minutes up to 72 hours depending on the provider’s TTL and caching.