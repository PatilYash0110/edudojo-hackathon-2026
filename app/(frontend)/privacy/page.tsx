import Link from 'next/link';

export const metadata = { title: 'Privacy notice | EduDojo' };

export default function PrivacyPage() {
  return (
    <article
      lang="en"
      className="mx-auto max-w-3xl space-y-8 py-8 text-base leading-relaxed [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mb-3 [&_a]:underline [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
    >
      <header>
        <h1 className="mb-3 text-3xl font-semibold">Privacy notice</h1>
        <p>Updated: 25 October 2026</p>
        <p className="rounded border border-amber-500 p-4" role="note">
          Draft: details in square brackets must be completed before real student data is collected.
          This notice does not provide consent or confirm that school use is approved.
        </p>
      </header>

      <section aria-labelledby="children">
        <h2 id="children">For students: your data in simple words</h2>
        <ul>
          <li>Use a nickname. Do not use your full name.</li>
          <li>
            We save your learning progress, quiz results, and chat messages. Guest play also creates
            a saved account.
          </li>
          <li>
            AI services receive the text you send so they can prepare lessons and replies. Even the
            topic check sends your message to AI.
          </li>
          <li>
            Do not send your address, phone number, passwords, health details, or private
            information about other people. Do not upload files with this information.
          </li>
          <li>
            Your teacher can see your learning progress. People in your class can see your nickname
            and score on the class leaderboard.
          </li>
          <li>
            AI can make mistakes. Ask your teacher to check an answer or score that seems wrong.
          </li>
          <li>
            If you do not understand this notice, ask your teacher or a parent or guardian before
            you use the app.
          </li>
          <li>
            You can ask about your data or ask for a correction or deletion. Contact [PRIVACY EMAIL]
            or ask your teacher for help.
          </li>
        </ul>
      </section>

      <section aria-labelledby="controller">
        <h2 id="controller">Who is responsible for your data?</h2>
        <p>
          Service operator: [LEGAL ENTITY NAME AND POSTAL ADDRESS]. Privacy contact: [PRIVACY
          EMAIL]. Data protection officer, if appointed: [DPO CONTACT OR NOT APPLICABLE].
        </p>
        <p>
          For school use, the school and operator must confirm their roles before use. School
          controller: [SCHOOL NAME, ADDRESS, AND PRIVACY CONTACT]. Operator role: [PROCESSOR OR
          CONTROLLER, WITH PURPOSES].
        </p>
      </section>

      <section aria-labelledby="data">
        <h2 id="data">What data do we use, and why?</h2>
        <ul>
          <li>
            Teacher accounts: display name, email address, and a password hash. We use these to
            manage accounts and classes.
          </li>
          <li>
            Student and guest accounts: account ID, nickname, class membership if applicable, and
            account creation date. We use these to identify your learning session.
          </li>
          <li>
            Learning activity: topics, uploaded learning materials, chat messages, generated
            lessons, quiz records, scores, XP, and mastery records. We use these to provide lessons,
            feedback, progress views, and leaderboards.
          </li>
          <li>
            Technical data: session identifiers, request information such as IP addresses, and
            service logs as configured by the host. We use these to operate and protect the service.
            Hosting log details: [DATA FIELDS AND PURPOSES].
          </li>
        </ul>
        <p>
          You provide account details, messages, and materials. The app generates scores and
          progress records. Your teacher may provide class and lesson information.
        </p>
        <p>
          Students do not need an email address. A guest account can be created when a feature
          requires sign-in. Required data and the effect of not providing it: [CONFIRM FOR EACH
          DEPLOYMENT].
        </p>
      </section>

      <section aria-labelledby="basis">
        <h2 id="basis">Legal basis and school use</h2>
        <p>
          [INSERT THE CONFIRMED GDPR ARTICLE 6 LEGAL BASIS FOR EACH PURPOSE ABOVE. INCLUDE THE
          APPLICABLE NATIONAL SCHOOL LAW IF RELYING ON A PUBLIC TASK, AND THE INTERESTS IF RELYING
          ON LEGITIMATE INTERESTS.]
        </p>
        <p>
          A school must confirm that this service is permitted for its students. The school and
          operator must agree on data processing terms where required. A teacher account or class
          PIN does not replace this check.
        </p>
        <p>
          Parent consent is not required for every school activity. If consent is the legal basis
          for an online service offered directly to a child, the applicable age and parent or
          guardian authorisation rules must be checked. In Germany, the Article 8 age threshold is
          16.
        </p>
        <p>
          [DESCRIBE THE APPROVED AGE RANGE, SCHOOL AUTHORISATION PROCESS, AND PARENT OR GUARDIAN
          CONSENT CHECK WHERE REQUIRED.] This version does not verify age or parent authorisation.
          Reading this notice, entering a PIN, or using the app does not record consent.
        </p>
      </section>

      <section aria-labelledby="recipients">
        <h2 id="recipients">Who receives data?</h2>
        <p>
          The operator and authorised service providers process data to run the app. Teachers can
          view class progress. Class members can view the class leaderboard.
        </p>
        <p>
          The supplied Dojo configuration selects DeepSeek for AI text processing and Speaches with
          Piper for speech. AI requests can contain messages, recent conversation history, lesson
          content, and quiz text. Speech processing receives text for narration. The actual services
          depend on the deployment configuration.
        </p>
        <p>
          [LIST THE ACTIVE AI, DATABASE, HOSTING, SPEECH, AND OTHER PROVIDERS, THEIR LEGAL ENTITIES,
          PROCESSING LOCATIONS, AND PURPOSES. CONFIRM PROVIDER RETENTION AND ANY MODEL-TRAINING
          USE.]
        </p>
        <p>
          Data may be processed outside the European Economic Area depending on the providers used.
          [IDENTIFY DESTINATION COUNTRIES, THE TRANSFER MECHANISM AND SAFEGUARDS, AND HOW TO OBTAIN
          A COPY.] EU database hosting alone does not keep AI requests in the EU.
        </p>
      </section>

      <section aria-labelledby="storage">
        <h2 id="storage">Storage and deletion</h2>
        <p>
          [SET RETENTION PERIODS OR CLEAR CRITERIA FOR ACCOUNTS, LEARNING RECORDS, MESSAGES,
          UPLOADS, LOGS, BACKUPS, AND PROVIDER COPIES.]
        </p>
        <p>
          The current app stores learning and chat records without an automatic time limit for Dojo
          database records. A teacher can delete a class and its linked student records in the Dojo
          database. This does not confirm deletion from separate lesson storage, logs, backups, or
          AI providers. These require a separate deletion process.
        </p>
        <p>
          The Dojo sign-in cookie lasts up to 30 days. Signing out clears it. Browser storage also
          keeps preferences and may keep learning or workspace data. [LIST OTHER ACTIVE COOKIES AND
          STORAGE, THEIR PURPOSES, AND DURATIONS.] Closing the browser or signing out does not
          delete server records.
        </p>
      </section>

      <section aria-labelledby="automation">
        <h2 id="automation">AI scores and learning profiles</h2>
        <p>
          The app checks answers and uses results to estimate mastery, award XP, and adapt practice.
          These estimates can be wrong. They describe learning activity, not a medical or
          psychological diagnosis.
        </p>
        <p>
          [CONFIRM WHETHER RESULTS AFFECT OFFICIAL GRADES OR EDUCATION ACCESS, AND DESCRIBE HUMAN
          REVIEW AND HOW TO CONTEST A RESULT.] Teachers must review results before using them for
          decisions that significantly affect a student.
        </p>
      </section>

      <section aria-labelledby="rights">
        <h2 id="rights">Your rights and how to contact us</h2>
        <p>
          Subject to the applicable legal conditions, you can ask to access, correct, delete, or
          restrict the use of your data. You can object to certain uses and request a portable copy
          where this right applies. If processing relies on consent, you can withdraw it at any
          time. Withdrawal does not affect processing that was lawful before withdrawal.
        </p>
        <p>
          Send requests to [PRIVACY EMAIL]. For school accounts, you can also contact [SCHOOL
          PRIVACY CONTACT]. Give enough information to find your account. Do not send your password.
          We may need to verify your identity. We normally respond within one month; if a lawful
          extension is needed, we will explain it.
        </p>
        <p>
          You can complain to a data protection authority, including the authority where you live,
          work, or believe a breach occurred. Relevant authority: [AUTHORITY NAME AND CONTACT LINK].
        </p>
      </section>
      <p>
        <Link href="/">Return to EduDojo</Link>
      </p>
    </article>
  );
}
