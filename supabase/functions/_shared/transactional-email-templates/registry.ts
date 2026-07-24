import { template as enquiryConfirmation } from './enquiry-confirmation.tsx'
import { template as enquiryNotification } from './enquiry-notification.tsx'
import { template as bookingConfirmation } from './booking-confirmation.tsx'
import { template as bookingNotification } from './booking-notification.tsx'
import { template as ladiesFestivalConfirmation } from './ladies-festival-confirmation.tsx'
import { template as ladiesFestivalNotification } from './ladies-festival-notification.tsx'
import { template as summonsDistribution } from './summons-distribution.tsx'
import { template as almonerOverdueDigest } from './almoner-overdue-digest.tsx'
import { template as waitlistPromoted } from './waitlist-promoted.tsx'
import { template as waitlistRefunded } from './waitlist-refunded.tsx'

export interface TemplateEntry {
  component: any
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'enquiry-confirmation': enquiryConfirmation,
  'enquiry-notification': enquiryNotification,
  'booking-confirmation': bookingConfirmation,
  'booking-notification': bookingNotification,
  'ladies-festival-confirmation': ladiesFestivalConfirmation,
  'ladies-festival-notification': ladiesFestivalNotification,
  'summons-distribution': summonsDistribution,
  'almoner-overdue-digest': almonerOverdueDigest,
  'waitlist-promoted': waitlistPromoted,
  'waitlist-refunded': waitlistRefunded,
}
