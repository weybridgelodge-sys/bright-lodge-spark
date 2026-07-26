import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHeader from "@/components/PageHeader";
import SEO from "@/components/SEO";
import { Link } from "react-router-dom";

const DataProtection = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Data Protection Policy"
        description="Data protection and privacy policy for Weybridge Lodge No. 6787 website."
        canonical="/data-protection"
      />
      <a href="#main-content" className="skip-to-content">Skip to main content</a>
      <Header />
      <main id="main-content">
        <PageHeader title="Data Protection Policy" />

        <section className="py-20 md:py-28 bg-warm-white">
          <div className="container mx-auto px-6 max-w-3xl prose prose-sm prose-headings:font-serif prose-headings:text-foreground prose-p:text-muted-foreground prose-p:font-sans prose-li:text-muted-foreground prose-li:font-sans">
            <h2>Who we are</h2>
            <p>Weybridge Lodge No. 6787 meets at the Guildford Masonic Centre, Weybourne House, Hitherbury Close, Guildford, GU2 4DR. Our website address is: https://weybridgelodge.org.uk</p>
            <p>Weybridge Lodge No. 6787 is registered with the Information Commissioner's Office, registration reference ZC194126.</p>

            <h2>Data Protection Officer</h2>
            <p>Our Data Protection Officer can be contacted at webmaster@weybridgelodge.org.uk.</p>

            <h2>What data we collect and why</h2>
            <p>Weybridge Lodge No. 6787 processes member names, addresses, phone numbers, and email addresses by computer. This data is used solely to distribute information, print address labels, and update membership lists for the Provincial Grand Secretary's office.</p>
            <p>If you make an enquiry through our website's contact or enquiry forms, we collect the name, email address, and any message content you provide, solely to respond to your enquiry.</p>
            <p>When you make a booking or send an enquiry through this website, we may send you confirmation, reply, and follow-up emails relating to that booking or enquiry.</p>

            <h2>The Members Portal and mobile app</h2>
            <p>Members of Weybridge Lodge No. 6787 who register for the Members Portal and its companion mobile app provide us with additional information beyond what is described above, in order to run the Lodge and support its members. This includes:</p>
            <ul>
              <li><strong>Membership record details:</strong> rank, office, initiation and progression dates, and attendance at meetings, Lodge of Instruction sessions, and social events.</li>
              <li><strong>Mentoring and development records:</strong> a member's progress through the Lodge's mentoring checklist, ritual learning record, and related notes made by their assigned Mentor or the Director of Ceremonies.</li>
              <li><strong>Welfare records:</strong> where a member is supported by the Lodge's Almoner, records of contact, welfare status, and any referrals to Masonic charitable bodies such as the Masonic Charitable Foundation are kept. These records are strictly confidential and are visible only to the Almoner and the current Worshipful Master — access is revoked automatically once a new Master is installed. Welfare records are never shared with other members, and are held separately from general membership records.</li>
              <li><strong>Financial records:</strong> dues subscription and payment records, where a member pays Lodge subscriptions through the Portal.</li>
              <li><strong>Device and notification data:</strong> if you enable push notifications in the mobile app, we store a device token to deliver reminders (such as meeting and booking deadlines) to your device. This token is not linked to any advertising identifier and is not shared with third parties for marketing.</li>
            </ul>
            <p>This information is used solely for the internal administration of the Lodge, its charitable and welfare activities, and its statutory and Masonic reporting obligations (including to the Provincial Grand Secretary's office). It is not used for any commercial purpose and is not sold or shared outside the Lodge's officers acting in their official capacity, except where welfare records are shared with Masonic charitable bodies (such as the Masonic Charitable Foundation) as part of a referral you or the Almoner have agreed to.</p>
            <p>Access to different categories of this data is restricted by role — for example, welfare records are visible only to the Almoner and current Worshipful Master, and financial records only to the Treasurer and relevant auditing officers — rather than being available to all Portal administrators.</p>

            <h2>Who we share your data with</h2>
            <p>We will not share your information with third parties or use it for any other automated processing beyond what is described on this page.</p>

            <h2>Where your data is stored</h2>
            <p>Member and enquiry data submitted through this website is stored securely using Supabase, our database provider. Email communications sent from the website (such as summonses and notifications) are delivered using Resend. Where payment is involved (for example, event bookings), payment processing is handled securely by Stripe, and we do not store your card details ourselves.</p>

            <h2>How long we retain your data</h2>
            <p>Membership data is retained for as long as you remain a member of the Lodge, and for a reasonable period afterwards for administrative and historical record purposes consistent with the Lodge's obligations to the Provincial Grand Secretary's office.</p>
            <p>General welfare and Almoner contact records are retained for active members throughout their membership, and for 7 years after a member leaves the Lodge or the welfare support in question ends. Financial and charitable transaction records are retained for 6 years, in line with standard record-keeping requirements. Any sensitive health-related notes recorded by the Almoner are kept only for as long as operationally necessary to support the member, and are reviewed and removed once no longer needed for that purpose.</p>

            <h2>What rights you have over your data</h2>
            <p>You have the right to request a copy of the personal data we hold about you, and to request that it be corrected or erased. Please notify the Data Protection Officer in writing if your details are inaccurate or if you object to your data being stored electronically.</p>
            <p>If you ask us to erase your personal data, we will delete it from the Portal's live database and connected storage, and from routine system backups as those backups naturally cycle. Where a record has been shared with another Lodge officer or a Masonic charitable body as part of a welfare referral, we will ask that party to delete their copy too. Some information may need to be retained beyond an erasure request where we have a legal or regulatory obligation to keep it (for example, financial records within their statutory retention period) — where this applies, we will tell you what is being retained and why.</p>

            <h2>Cookies</h2>
            <p>This website does not use comment or login systems, and does not set tracking cookies for these purposes. Any cookies used are limited to essential website functionality.</p>
          </div>

          <div className="text-center mt-12">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center border border-border text-foreground px-8 py-4 rounded-sm text-sm font-sans uppercase tracking-widest hover:border-gold hover:text-gold transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default DataProtection;
