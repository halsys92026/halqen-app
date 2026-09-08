import { LegalPage, H2, H3, P, UL, LI, Callout } from '@/components/LegalPage';

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 2026">
      <P>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of Halqen, a code-gated digital
        identity card platform, including the associated website, mobile-accessible web application, and any
        related services (collectively, the &quot;Service&quot;), operated by Bill Walker, doing business as Halqen
        (&quot;Halqen,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By creating an account, accessing, or
        using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
      </P>

      <H2>1. What Halqen Is</H2>
      <P>
        Halqen provides a physical and/or digital card linked to one or more &quot;identities&quot; you configure.
        Each identity is protected by a short numeric access code you set. A person who scans your card and enters
        the correct code is shown the identity associated with that code, including any contact information,
        photo, and credential information you choose to include.
      </P>
      <P>
        Halqen also provides an optional credentials feature allowing you to record professional licenses,
        insurance information, or other credentials, and to mark them as &quot;verified.&quot; A separate section
        below explains exactly what that verification does and does not mean.
      </P>

      <H2>2. Eligibility</H2>
      <P>
        You must be at least 18 years old and capable of forming a binding contract to use the Service. The
        Service is intended for use by individuals and businesses in a professional capacity, not for personal
        social use by minors.
      </P>

      <H2>3. Your Account</H2>
      <P>
        You are responsible for maintaining the confidentiality of your account and for all activity that occurs
        under it. Halqen uses passwordless, email-based sign-in links rather than passwords; you are responsible
        for the security of the email address associated with your account.
      </P>

      <H2>4. Access Codes Are Your Responsibility</H2>
      <P>
        Each access code you create functions as a shared secret, similar to a gate code or a shared password.
        Halqen enforces that codes are unique across the platform and rate-limits repeated failed attempts, but
        Halqen has no way to distinguish between a person you intended to share a code with and a person you did
        not. <b>You are solely responsible for deciding who you share an access code with, and for revoking or
        changing a code if you believe it has been shared beyond your intent.</b> The Service provides tools to
        revoke and reissue codes; using them is your responsibility.
      </P>

      <H2>5. Verification Features — What &quot;Verified&quot; Actually Means</H2>
      <P>
        This section is important and you should read it carefully before relying on, or asking others to rely
        on, any &quot;Verified&quot; status shown through the Service.
      </P>
      <H3>5.1 Verification is performed by best-effort, manual review</H3>
      <P>
        At this stage, credential verification on Halqen is performed manually — either by you, the account
        holder, or by Halqen personnel — by checking a stated license number, insurance detail, or other
        credential against a publicly available source (such as a state licensing board&apos;s public lookup
        tool) or against a document you provide. It is not performed through an automated, real-time connection
        to any state licensing authority, insurance carrier, or background-check provider unless and until Halqen
        explicitly states otherwise for a specific credential type.
      </P>
      <H3>5.2 A &quot;Verified&quot; badge reflects a point-in-time check, not a continuous guarantee</H3>
      <P>
        A credential marked &quot;Verified&quot; was confirmed accurate as of the date shown next to that status.
        Licenses can be suspended, insurance can lapse, and information can change at any time after that date.
        Halqen does not guarantee that a &quot;Verified&quot; credential remains accurate, current, or in good
        standing after the date shown, and disclaims any obligation to detect or notify you of such changes unless
        you have separately subscribed to an automated monitoring feature that explicitly states it does so.
      </P>
      <H3>5.3 No warranty of accuracy</H3>
      <P>
        Halqen makes commercially reasonable efforts to verify what it represents as verified, but does not
        warrant the accuracy, completeness, or continued validity of any credential, license, insurance status,
        or other information displayed through the Service, whether marked &quot;Verified&quot; or not. <b>Anyone
        relying on information displayed through Halqen — including a &quot;Verified&quot; badge — to make a
        hiring, contracting, or business decision does so at their own risk, and should independently confirm any
        credential that is material to that decision</b>, particularly for anything involving significant cost,
        safety, or legal exposure.
      </P>
      <H3>5.4 Self-reported information</H3>
      <P>
        Any information you enter about yourself or your business that is not specifically marked
        &quot;Verified&quot; — including your name, business name, title, and contact information — is
        self-reported and has not been independently checked by Halqen.
      </P>

      <H2>6. Client Portal and Data Sharing</H2>
      <P>
        Halqen allows a user (a &quot;Client&quot;) to create a separate account for the purpose of receiving
        standing visibility into an identity&apos;s credential status, if and only if the identity&apos;s owner
        explicitly grants that access. Granting access is voluntary and may be revoked at any time by the
        identity&apos;s owner, at which point the Client&apos;s visibility into that identity ends. Halqen is not
        responsible for a Client&apos;s use of information after it has been lawfully shared with them while a
        grant was active.
      </P>

      <H2>7. Acceptable Use</H2>
      <P>You agree not to:</P>
      <UL>
        <LI>Provide false, misleading, or fraudulent information about your identity, business, or credentials, including falsely marking or representing a credential as verified;</LI>
        <LI>Impersonate any person or entity, or misrepresent your affiliation with any person or entity;</LI>
        <LI>Attempt to circumvent, disable, or interfere with the access-code security mechanism, rate limiting, or any other security feature of the Service;</LI>
        <LI>Use automated means to scrape, harvest, or bulk-collect information from the Service, including attempting to enumerate valid access codes;</LI>
        <LI>Use the Service to harass, stalk, or share another person&apos;s information without their consent;</LI>
        <LI>Use the Service in violation of any applicable law, including laws governing professional licensing, insurance, or consumer protection.</LI>
      </UL>

      <H2>8. Fees</H2>
      <P>
        Certain features of the Service are currently provided free of charge during an initial pilot period.
        Halqen may introduce paid subscription tiers in the future; if it does, you will be notified before any
        charge applies to your account, and continued use of free features will not retroactively incur charges
        for past use.
      </P>

      <H2>9. Termination</H2>
      <P>
        You may stop using the Service and request deletion of your account at any time by contacting us (see
        Section 15). We may suspend or terminate your access to the Service if we reasonably believe you have
        violated these Terms, provided false credential information, or used the Service in a way that creates
        risk to other users. Upon termination, your access codes will be deactivated and will no longer unlock
        any identity.
      </P>

      <H2>10. Disclaimer of Warranties</H2>
      <P>
        The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind,
        whether express, implied, or statutory, including implied warranties of merchantability, fitness for a
        particular purpose, and non-infringement. Halqen does not warrant that the Service will be uninterrupted,
        secure, or error-free, particularly given its current early-stage, pilot status.
      </P>

      <H2>11. Limitation of Liability</H2>
      <P>
        To the fullest extent permitted by law, Halqen and its founder shall not be liable for any indirect,
        incidental, special, consequential, or punitive damages, or any loss of profits, revenue, data, or
        business opportunity, arising out of or related to your use of the Service, including reliance on any
        verification status displayed through it, even if advised of the possibility of such damages. Halqen&apos;s
        total liability for any claim arising from the Service shall not exceed the amount, if any, you paid to
        Halqen in the twelve months preceding the claim.
      </P>

      <H2>12. Indemnification</H2>
      <P>
        You agree to indemnify and hold harmless Halqen and its founder from any claim, demand, loss, or damage,
        including reasonable attorneys&apos; fees, arising out of your use of the Service, your violation of these
        Terms, or your provision of false or misleading information through the Service.
      </P>

      <H2>13. Governing Law</H2>
      <P>
        These Terms are governed by the laws of the State of Oregon, without regard to its conflict of laws
        principles. Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of the
        state and federal courts located in Oregon.
      </P>

      <H2>14. Changes to These Terms</H2>
      <P>
        We may update these Terms from time to time. If we make material changes, we will provide reasonable
        notice, such as by email or a notice within the Service, before the changes take effect. Continued use of
        the Service after changes take effect constitutes acceptance of the revised Terms.
      </P>

      <H2>15. Contact</H2>
      <P>Questions about these Terms can be sent to <a href="mailto:bill@halqen.com" style={{ color: '#5AA7FF' }}>bill@halqen.com</a>.</P>

      <Callout>
        This document was prepared to accurately describe how Halqen currently operates, including the
        limitations of its manual verification process, and is intended to be genuinely protective of both users
        and the business. It has not been reviewed by an attorney licensed to practice in your jurisdiction.
        Before relying on these Terms as a binding legal agreement with real users, have them reviewed by a
        qualified attorney, particularly the verification-disclaimer and liability sections, which carry the most
        legal weight for this specific product.
      </Callout>
    </LegalPage>
  );
}
