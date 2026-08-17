// Shared helper: send booker confirmation + assistant secretary notification
// for a row in public.bookings. Safe to call multiple times (idempotent via
// idempotency keys tied to booking id + stage).

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { sendTransactionalEmail } from './send-email.ts'

export const ASSISTANT_SECRETARY_EMAIL = 'assistantsecretary@weybridgelodge.org.uk'
export const WEBMASTER_EMAIL = 'webmaster@weybridgelodge.org.uk'
const NOTIFY_RECIPIENTS = [ASSISTANT_SECRETARY_EMAIL, WEBMASTER_EMAIL]

interface SendOpts {
  stage: 'submitted' | 'paid' | 'backfill'
  overrideNotifyEmail?: string
  /** Skip the booker-facing confirmation; send only the internal notifications. */
  notifyOnly?: boolean
  /** Testing only: send the booker confirmation to this address instead of the real booker. */
  overrideBookerEmail?: string
  /** Testing only: skip the internal notification emails entirely. */
  skipNotify?: boolean
}

function formatGBP(pence?: number | null): string {
  if (!pence || pence <= 0) return ''
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100)
}

function formatDate(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Europe/London',
  })
}

function meetingOptionLabel(opt?: string): string {
  switch ((opt || '').toLowerCase()) {
    case 'meeting-and-festive-board': return 'Meeting & Festive Board'
    case 'meeting-only': return 'Meeting only'
    case 'apologies': return 'Apologies'
    case 'festive-board-only': return 'Festive Board only'
    default: return opt || ''
  }
}

function paymentMethodLabel(pm?: string): string {
  switch ((pm || '').toLowerCase()) {
    case 'card':
    case 'stripe': return 'Card (Stripe)'
    case 'bank-transfer':
    case 'bank_transfer': return 'Bank transfer'
    case 'cash-cheque':
    case 'cash': return 'Cash / cheque on the night'
    case 'complimentary': return 'Complimentary'
    default: return pm || ''
  }
}

function paymentStatusLabel(status?: string): string {
  switch ((status || '').toLowerCase()) {
    case 'paid': return 'Paid'
    case 'pending': return 'Awaiting payment'
    case 'failed': return 'Payment failed'
    case 'apologies': return 'Apologies — no payment required'
    case 'confirmed': return 'Confirmed'
    default: return status || ''
  }
}

async function lookupSecretarySignature(supabase: SupabaseClient) {
  let secretaryName = ''
  let secretaryOffice = 'Lodge Secretary'
  try {
    const now = new Date()
    const lodgeYear = now.getUTCMonth() + 1 >= 10 ? now.getUTCFullYear() : now.getUTCFullYear() - 1
    const { data: appts } = await supabase
      .from('officer_appointments')
      .select('member_id')
      .eq('position_key', 'secretary')
      .eq('lodge_year', lodgeYear)
      .limit(1)
    const memberId = (appts?.[0] as any)?.member_id
    if (memberId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, first_name, last_name, is_past_master')
        .eq('id', memberId)
        .maybeSingle()
      const p: any = prof
      if (p) {
        const fallback = `${p.is_past_master ? 'W Bro. ' : 'Bro. '}${[p.first_name, p.last_name].filter(Boolean).join(' ')}`.trim()
        secretaryName = (p.full_name && p.full_name.trim()) || fallback
      }
      const { data: posRow } = await supabase
        .from('officer_positions')
        .select('label')
        .eq('key', 'secretary')
        .maybeSingle()
      secretaryOffice = `Lodge ${(posRow as any)?.label || 'Secretary'}`
    }
  } catch (e) {
    console.error('Secretary lookup failed', e)
  }
  return { secretaryName, secretaryOffice }
}

export async function sendBookingEmails(bookingId: string, opts: SendOpts) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    console.error('Booking emails: missing service credentials')
    return
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle()
  if (error || !booking) {
    console.error('Booking emails: booking not found', bookingId, error)
    return
  }

  const b: any = booking
  const details: any = b.details || {}
  const meetingOpt: string = details.meetingOption || ''
  const isApologies = meetingOpt === 'apologies' || b.payment_status === 'apologies'
  const isLadiesFestival = typeof b.event_key === 'string' && b.event_key.startsWith('ladies_festival')

  // Resolve event date from linked festive board meeting (if any)
  let eventDate = ''
  let meetingDateISO: string | null = null
  let meetingEventKey: string | null = null
  if (b.meeting_id) {
    const { data: m } = await supabase
      .from('festive_board_meetings')
      .select('meeting_date, event_key')
      .eq('id', b.meeting_id)
      .maybeSingle()
    meetingDateISO = (m as any)?.meeting_date ?? null
    meetingEventKey = (m as any)?.event_key ?? null
    eventDate = formatDate(meetingDateISO)
  }

  // Resolve a finalised summons PDF for this meeting (signed URL, never attached).
  // Chain: bookings.meeting_id → festive_board_meetings → lodge_events
  // (event_key = lodge_events.slug, falling back to matching date) → summonses.lodge_event_id
  let summonsPdfUrl: string | undefined
  let summonsMeetingNumber: number | undefined
  if (!isLadiesFestival && (meetingEventKey || meetingDateISO)) {
    try {
      let lodgeEventId: string | null = null
      if (meetingEventKey) {
        const { data: le } = await supabase
          .from('lodge_events')
          .select('id')
          .eq('slug', meetingEventKey)
          .maybeSingle()
        lodgeEventId = (le as any)?.id ?? null
      }
      if (!lodgeEventId && meetingDateISO) {
        const { data: le2 } = await supabase
          .from('lodge_events')
          .select('id')
          .gte('event_date', `${meetingDateISO}T00:00:00`)
          .lt('event_date', `${meetingDateISO}T23:59:59`)
          .order('created_at', { ascending: false })
          .limit(1)
        lodgeEventId = (le2 as any)?.[0]?.id ?? null
      }

      if (lodgeEventId) {
        const { data: summons } = await supabase
          .from('summonses')
          .select('id, meeting_number, pdf_storage_path, status')
          .eq('lodge_event_id', lodgeEventId)
          .in('status', ['finalised', 'sent'])
          .not('pdf_storage_path', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)
        const s: any = summons?.[0]
        if (s?.pdf_storage_path) {
          const { data: signed, error: signErr } = await supabase.storage
            .from('lodge-docs')
            .createSignedUrl(s.pdf_storage_path, 60 * 60 * 24 * 30, {
              download: `summons-${s.meeting_number}.pdf`,
            })
          if (signErr) {
            console.error('Summons signed URL failed', signErr)
          } else if (signed?.signedUrl) {
            summonsPdfUrl = signed.signedUrl
            summonsMeetingNumber = s.meeting_number ?? undefined
          }
        }
      }
    } catch (e) {
      console.error('Summons lookup failed', e)
    }
  }
  if (!eventDate && isLadiesFestival) {
    eventDate = 'Saturday 22 August 2026'
  }

  const guests = Array.isArray(details.guests) ? details.guests.map((g: any) => ({
    name: g?.name || '',
    lodge: g?.lodge || '',
    dietary: g?.dietary || g?.dietaryRequirements || '',
    starter: g?.starter || '',
    main: g?.main || '',
    dessert: g?.dessert || '',
  })) : []

  const totalAmount = formatGBP(b.total_pence)
  const pmLabel = paymentMethodLabel(details.paymentMethod)
  const psLabel = paymentStatusLabel(b.payment_status)
  const lodgeName = details.lodge || ''
  const dietary = details.dietary || details.dietaryRequirements || ''
  const bookingRef = String(b.id).slice(0, 8)
  const eventLabel = b.event_label || ''
  const firstName = (details.firstName || (b.contact_name || '').split(' ')[0] || '').trim()
  const submittedAt = new Date(b.created_at).toLocaleString('en-GB', { timeZone: 'Europe/London' })

  const { secretaryName, secretaryOffice } = await lookupSecretarySignature(supabase)

  // ── Ladies Festival branch (dedicated templates) ──────────────────────────
  if (isLadiesFestival) {
    const lineItems = Array.isArray(b.line_items) ? b.line_items : []
    const drinks = Array.isArray(details.drinkItems) ? details.drinkItems : []
    const guestCount = typeof details.guestCount === 'number' ? details.guestCount : guests.length
    const seatingPreference = details.seatingPreference || ''
    const message = details.message || ''

    if (b.contact_email && !opts.notifyOnly) {
      const confRes = await sendTransactionalEmail({
          templateName: 'ladies-festival-confirmation',
          recipientEmail: b.contact_email,
          idempotencyKey: `lf-confirm-${b.id}-${opts.stage}`,
          replyTo: ASSISTANT_SECRETARY_EMAIL,
          templateData: {
            firstName,
            eventLabel: eventLabel || 'Ladies Festival 2026',
            eventDate,
            guestCount,
            guests,
            seatingPreference,
            dietary,
            message,
            lineItems,
            drinks,
            totalAmount,
            paymentStatusLabel: psLabel,
            bookingRef,
            secretaryName,
            secretaryOffice,
          },
      })
      if (confRes.error) console.error('Ladies Festival confirmation email failed', confRes.error)
    }

    const notifyRecipients = opts.overrideNotifyEmail ? [opts.overrideNotifyEmail] : NOTIFY_RECIPIENTS
    await Promise.all(notifyRecipients.map(async (notifyTo) => {
      const notifRes = await sendTransactionalEmail({
          templateName: 'ladies-festival-notification',
          recipientEmail: notifyTo,
          idempotencyKey: `lf-notify-${b.id}-${opts.stage}-${notifyTo}`,
          replyTo: b.contact_email || undefined,
          templateData: {
            bookerName: b.contact_name,
            bookerEmail: b.contact_email,
            bookerPhone: b.contact_phone,
            eventLabel: eventLabel || 'Ladies Festival 2026',
            eventDate,
            guestCount,
            guests,
            seatingPreference,
            dietary,
            message,
            lineItems,
            drinks,
            totalAmount,
            paymentStatusLabel: psLabel,
            bookingRef,
            submittedAt,
          },
      })
      if (notifRes.error) console.error('Ladies Festival notification email failed', notifyTo, notifRes.error)
    }))
    return
  }

  // 1) Booker confirmation
  if (b.contact_email && !opts.notifyOnly) {
    const confRes = await sendTransactionalEmail({
        templateName: 'booking-confirmation',
        recipientEmail: opts.overrideBookerEmail || b.contact_email,
        idempotencyKey: `booking-confirm-${b.id}-${opts.stage}${opts.overrideBookerEmail ? `-test-${crypto.randomUUID()}` : ''}`,
        replyTo: ASSISTANT_SECRETARY_EMAIL,
        templateData: {
          firstName,
          eventLabel,
          eventDate,
          meetingOptionLabel: meetingOptionLabel(meetingOpt),
          lodgeName,
          guests,
          dietary,
          totalAmount,
          paymentMethodLabel: pmLabel,
          paymentStatusLabel: psLabel,
          isApologies,
          bookingRef,
          secretaryName,
          secretaryOffice,
          summonsPdfUrl,
          summonsMeetingNumber,
        },
    })
    if (confRes.error) console.error('Booking confirmation email failed', confRes.error)
  }

  // 2) Assistant Secretary notification
  if (opts.skipNotify) return
  const notifyRecipients = opts.overrideNotifyEmail ? [opts.overrideNotifyEmail] : NOTIFY_RECIPIENTS
  await Promise.all(notifyRecipients.map(async (notifyTo) => {
    const notifRes = await sendTransactionalEmail({
        templateName: 'booking-notification',
        recipientEmail: notifyTo,
        idempotencyKey: `booking-notify-${b.id}-${opts.stage}-${notifyTo}`,
        replyTo: b.contact_email || undefined,
        templateData: {
          bookerName: b.contact_name,
          bookerEmail: b.contact_email,
          bookerPhone: b.contact_phone,
          eventLabel,
          eventDate,
          meetingOptionLabel: meetingOptionLabel(meetingOpt),
          lodgeName,
          guests,
          dietary,
          totalAmount,
          paymentMethodLabel: pmLabel,
          paymentStatusLabel: psLabel,
          isApologies,
          bookingRef,
          submittedAt,
        },
    })
    if (notifRes.error) console.error('Booking notification email failed', notifyTo, notifRes.error)
  }))
}
