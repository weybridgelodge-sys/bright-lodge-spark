# Email send log: findings and recommendation (report only, nothing built)

## 1. Where the newsletter emails are recorded
- **Confirm email** (newsletter-subscribe) and **welcome email** (newsletter-confirm) call the lower-level sender `sendTemplateEmail` directly. That sender writes nothing to the lodge's database. The only record is the email service's own delivery log. It shows mentor@weybridgelodge.org.uk "sent" at 18 Oct 22:03:19 UTC (confirm) and 19 Oct 12:32:44 UTC (welcome, 13:32 UK). That log is kept for 14 days on the current plan.
- **Monthly Chronicle** (broadcast-newsletter) calls the email service directly in a loop. It doesn't write to email_send_log either. It only records the broadcast itself in newsletter_broadcasts.
- **Why email_send_log misses them:** only sends that go through the wrapper `sendTransactionalEmail` (_shared/send-email.ts) are logged. These are summons, reminders, bookings, enquiries, polls and returns. Columns: message_id (always empty), template_name, recipient_email, status (sent/suppressed/failed), error_message, metadata, created_at. There is no unit_id. The 314 "pending" and 5 "dlq" rows are left over from the old queue system, last written in September.
- Two more paths aren't logged anywhere in our database: **send-summons-to-visitors** and **send-event-invite**. They go out through the separate Resend connection, not the lodge's email service.

## 2. Delivery results (delivered, bounced, complained)
- The receiver handle-email-events is already in place. When an email bounces, gets a spam complaint or the person unsubscribes, it adds a row to email_send_log (status bounced/complained/suppressed, with message_id) and to suppressed_emails. It works: there are 5 bounced rows, the latest on 18 Oct.
- **"Delivered" and "opened" can't be tracked.** The email service never reports them.
- Resend sends (visitor summons, event invites) have no receiver. Adding one would need a separate Resend webhook with its own signing secret. A simpler fix is to move those two paths onto the lodge's email service, so the existing receiver covers them.
- **Per unit:** each event carries a message_id. Once the send log stores message_id and unit_id at send time, the receiver can find the unit from the original send row. Nothing extra is needed per lodge.

## 3. Does suppressed_emails fill itself?
- Yes. Hard bounces, complaints and unsubscribes are added automatically by handle-email-events. So far it holds 3 bounces.
- The email service also blocks suppressed addresses itself at send time. Our list is a copy for display only. It should never decide whether we send.

## 4. Recommendation: one send log for every kind of email
- **One table for every send** (could be email_send_log extended, or a new email_events table). Columns: unit_id (text, default 'weybridge'), message_id, idempotency_key, template_name, category (transactional / booking / newsletter / summons / invite), recipient_email, status (sent/suppressed/failed/bounced/complained/unsubscribed), error_message, related_type plus related_id (booking, broadcast, summons), created_at. Only server-side functions can write to it. Admins and the Secretary can read it.
- **One way in:** route every send through `sendTransactionalEmail`, including the newsletter confirm and welcome emails, Monthly Chronicle and the two Resend paths. Make it record the message_id the service returns and the unit_id.
- **Results attached to the original send:** handle-email-events records each bounce, complaint or unsubscribe against the original send's message_id, and takes unit_id from that row.
- **Tidy-up:** mark or archive the old pending/dlq queue rows. Show a simple "Email history" on the Secretary screen. Make clear in the wording that delivered/opened isn't available.
- **Risks:** Monthly Chronicle sends one email per subscriber, so it would add many rows. Old records should be cleared after a set period, for example 12 months, to keep personal data to a minimum.

Nothing was changed or sent. Everything above was checked against the code, the database and the email service's delivery log.
