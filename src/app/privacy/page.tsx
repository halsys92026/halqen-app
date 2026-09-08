import { LegalPage, H2, H3, P, UL, LI, Callout } from '@/components/LegalPage';

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 2026">
      <P>
        This Privacy Policy explains what information Halqen collects, how it is used, how it is protected, and
        what choices you have. It applies to the Halqen website and application (the &quot;Service&quot;),
        operated by Bill Walker, doing business as Halqen.
      </P>

      <H2>1. Information We Collect</H2>
      <H3>1.1 Account information</H3>
      <P>
        When you sign in, we collect your email address. We use passwordless, email-based sign-in links, so we do
        not store a password for your account.
      </P>
      <H3>1.2 Identity and profile information</H3>
      <P>You choose what to include in each identity you create, which may include:</P>
      <UL>
        <LI>Your name, business name, title, phone number, and email address;</LI>
        <LI>A profile photo, if you choose to upload one;</LI>
        <LI>A brand color and, where applicable, a recognized company brand mark.</LI>
      </UL>
      <H3>1.3 Credential information</H3>
      <P>
        If you choose to use the credentials feature, you may provide license numbers, insurance policy
        information, issuing state, expiration dates, and an optional label to distinguish multiple credentials.
        This information is provided voluntarily by you and is not required to use the base Service.
      </P>
      <H3>1.4 Access and security information</H3>
      <P>
        When someone scans a card and enters a code, we log that the attempt occurred, whether it succeeded, and
        a <b>cryptographically hashed version of the requester&apos;s IP address</b> — never the raw IP address
        itself. This hashing is designed so the original IP address cannot be recovered from what is stored, even
        if the underlying data were ever exposed. We also log failed code attempts, without identifying
        information beyond the same hashed IP, in order to detect and block repeated guessing.
      </P>
      <H3>1.5 Client portal information</H3>
      <P>
        If you create a Client account, we collect the company name you provide. If a vendor grants you standing
        access to their identity, our system records that grant so you can view that identity&apos;s credential
        status; this record includes which identity granted access and when.
      </P>

      <H2>2. How We Use Information</H2>
      <UL>
        <LI>To operate the core function of the Service — verifying a scanned code and displaying the associated identity;</LI>
        <LI>To allow you to manage your own identities, credentials, and access grants;</LI>
        <LI>To detect and prevent abuse, including repeated failed code attempts;</LI>
        <LI>To communicate with you about your account, including sign-in links;</LI>
        <LI>To improve the Service based on aggregate, non-identifying patterns of use.</LI>
      </UL>
      <P>We do not use your information to serve you advertising, and we do not sell your information to third parties, ever.</P>

      <H2>3. How Information Is Shared</H2>
      <P>Information is shared only in these specific circumstances:</P>
      <UL>
        <LI><b>With someone who scans your card and enters a valid code</b> — they see only the identity associated with that code, not your other identities;</LI>
        <LI><b>With a Client you have explicitly granted standing access to</b> — limited to the identity and credential status you have chosen to make visible to them, until you revoke that access;</LI>
        <LI><b>With infrastructure service providers</b> that host and run the Service on our behalf — currently Supabase (database and file storage) and Vercel (application hosting) — under their own security and confidentiality obligations;</LI>
        <LI><b>Where required by law</b>, such as in response to a valid legal request.</LI>
      </UL>
      <P>We do not otherwise share, rent, or sell your personal information to third parties.</P>

      <H2>4. How Information Is Protected</H2>
      <P>The Service is built with the following security measures:</P>
      <UL>
        <LI><b>Row-level security</b> at the database level, so an account can only read or modify its own data unless it has been explicitly granted access to someone else&apos;s;</LI>
        <LI><b>Server-side code verification</b> — access codes are never sent to or checked by a visitor&apos;s browser directly; all checking happens on a secured server;</LI>
        <LI><b>Rate limiting</b> that blocks repeated failed code-guessing attempts from the same source;</LI>
        <LI><b>Globally unique access codes</b>, enforced by the database, so two different accounts can never be assigned the same code;</LI>
        <LI><b>IP address hashing</b>, as described in Section 1.4, rather than storage of raw IP addresses;</LI>
        <LI><b>Encrypted connections</b> (HTTPS) for all traffic to and from the Service.</LI>
      </UL>
      <P>
        No system is perfectly secure, and we cannot guarantee absolute security. If we become aware of a breach
        affecting your information, we will notify you in a manner consistent with applicable law.
      </P>

      <H2>5. Data Retention</H2>
      <P>
        We retain your account and identity information for as long as your account remains active. If you
        request deletion of your account, we will delete your identities, credentials, and uploaded photos within
        a reasonable time, except where we are required to retain limited records for legal, security, or fraud-
        prevention purposes (such as a record that a given access code existed, without the personal details
        attached to it).
      </P>

      <H2>6. Your Rights and Choices</H2>
      <P>You can, at any time:</P>
      <UL>
        <LI>Edit or delete any identity, credential, or photo directly from your dashboard;</LI>
        <LI>Revoke a Client&apos;s standing access to any identity;</LI>
        <LI>Request a copy of the personal information associated with your account;</LI>
        <LI>Request deletion of your account and associated data, by contacting us at the address below.</LI>
      </UL>

      <H2>7. Children&apos;s Privacy</H2>
      <P>
        The Service is intended for use by individuals and businesses in a professional capacity and is not
        directed to, or intended for use by, anyone under the age of 18. We do not knowingly collect information
        from anyone under 18. If we learn that we have done so, we will delete that information.
      </P>

      <H2>8. Cookies and Tracking</H2>
      <P>
        The Service uses only the minimal session mechanism required to keep you signed in (managed through our
        authentication provider, Supabase). We do not use third-party advertising trackers, and we do not track
        you across other websites.
      </P>

      <H2>9. International Users</H2>
      <P>
        The Service is currently operated for users in the United States, and data is stored and processed in the
        United States. If Halqen expands to serve users in other countries, this Policy will be updated to
        reflect any additional data-protection obligations that apply, such as those under the EU&apos;s GDPR.
      </P>

      <H2>10. Changes to This Policy</H2>
      <P>
        We may update this Privacy Policy from time to time. If we make material changes, we will provide
        reasonable notice, such as by email or a notice within the Service, before the changes take effect.
      </P>

      <H2>11. Contact</H2>
      <P>
        Questions about this Privacy Policy, or requests to access or delete your data, can be sent to{' '}
        <a href="mailto:bill@halqen.com" style={{ color: '#5AA7FF' }}>bill@halqen.com</a>.
      </P>

      <Callout>
        This document was prepared to accurately describe the data Halqen actually collects and the specific
        security measures actually in place, rather than generic boilerplate. It has not been reviewed by an
        attorney or privacy professional licensed in your jurisdiction. Before relying on this Policy as a
        binding representation to real users — especially once any credential or insurance data from real
        contractors is involved — have it reviewed by a qualified attorney or privacy counsel.
      </Callout>
    </LegalPage>
  );
}
