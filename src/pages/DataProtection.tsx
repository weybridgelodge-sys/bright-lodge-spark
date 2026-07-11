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

            <h2>Who we share your data with</h2>
            <p>We will not share your information with third parties or use it for any other automated processing beyond what is described on this page.</p>

            <h2>Where your data is stored</h2>
            <p>Member and enquiry data submitted through this website is stored securely using Supabase, our database provider. Email communications sent from the website (such as summonses and notifications) are delivered using Resend. Where payment is involved (for example, event bookings), payment processing is handled securely by Stripe, and we do not store your card details ourselves.</p>

            <h2>How long we retain your data</h2>
            <p>Membership data is retained for as long as you remain a member of the Lodge, and for a reasonable period afterwards for administrative and historical record purposes consistent with the Lodge's obligations to the Provincial Grand Secretary's office.</p>

            <h2>What rights you have over your data</h2>
            <p>You have the right to request a copy of the personal data we hold about you, and to request that it be corrected or erased. Please notify the Data Protection Officer in writing if your details are inaccurate or if you object to your data being stored electronically.</p>

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
