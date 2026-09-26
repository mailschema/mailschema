// The one source of example data for MAP 0.2. The fixture generator and the
// conformance suite build every description, request and message from it.
import { createHash } from 'node:crypto';

/** A target digest over the bytes of a representation. */
export const digestOf = (bytes) => `sha-256:${createHash('sha256').update(bytes).digest('hex')}`;

export const describedAt = '2026-09-25T08:00:00Z';
export const expiresAt = '2026-10-02T08:00:00Z';
export const clock = () => new Date('2026-09-25T09:00:00Z');
export const retention = 604800;

export const uuid = (n) => `urn:uuid:01926a00-0000-7000-8000-${String(n).padStart(12, '0')}`;

/** Every calendar part uses CRLF line endings, as iCalendar requires. */
export const ics = (lines) => `${lines.join('\r\n')}\r\n`;

export const examples = [
  {
    slug: 'content-review',
    version: '0.3',
    authority: 'credential',
    host: 'reviews.example',
    name: 'Example Review Service',
    humanPath: '/reviews/campaign-42/revision/4',
    interaction: uuid(1),
    target: {
      id: 'https://reviews.example/content/campaign-42',
      revision: '4',
      title: 'September product update',
      representation: 'campaign-42/revision-4',
    },
    details: {
      supersedes: { revision: '3', digest: digestOf('campaign-42/revision-3') },
      addressesFeedback: ['feedback-7c1d2e3f4a5b6c7d'],
    },
    operations: [
      {
        id: 'request-changes',
        name: 'Request changes',
        description: 'Record feedback on revision 4.',
      },
      { id: 'approve', name: 'Approve', description: 'Record approval of revision 4.' },
    ],
    inputs: {
      'request-changes': { feedback: 'Add the event timezone to the opening paragraph.' },
      approve: {},
    },
  },
  {
    slug: 'action-approval',
    version: '0.1',
    authority: 'credential',
    host: 'buy.example',
    name: 'Example Purchasing',
    humanPath: '/approvals/po-881',
    interaction: uuid(2),
    target: {
      id: 'https://buy.example/proposals/po-881',
      revision: '2',
      title: 'Design tool licence, 20 seats',
      representation: 'po-881/revision-2',
    },
    details: {
      summary: 'A 12-month licence for 20 seats of a design tool, from Figment Design Ltd.',
      requester: { name: 'Priya Shah' },
      authorizationDetails: [
        {
          type: 'https://buy.example/terms/purchase',
          actions: ['purchase'],
          identifier: 'po-881',
          supplier: 'Figment Design Ltd',
          seats: 20,
          termMonths: 12,
          total: { currency: 'EUR', amount: '4800.00' },
        },
      ],
    },
    operations: [
      { id: 'approve', name: 'Approve', description: 'Approve purchase order 881 as stated.' },
      { id: 'decline', name: 'Decline', description: 'Decline purchase order 881.' },
    ],
    inputs: { approve: {}, decline: { reason: 'Use the existing enterprise licence instead.' } },
  },
  {
    slug: 'information-request',
    version: '0.1',
    authority: 'possession',
    host: 'directory.example.org',
    name: 'Example Company Directory',
    humanPath: '/listings/acme/confirm',
    interaction: uuid(3),
    capability: 'Hq7vK2mNw9Xb4Rt8Lp3sYd6fJc1gZa0e',
    recipient: 'ops@acme.example',
    target: {
      id: 'https://directory.example.org/listings/acme/requests/contact',
      revision: '1',
      title: 'Confirm contact details for Acme',
      representation: 'acme/contact-request/1',
    },
    details: {
      purpose: 'Keep the public contact details on the Acme listing current.',
      fields: {
        type: 'object',
        properties: {
          supportEmail: {
            type: 'string',
            title: 'Support email address',
            format: 'email',
            autocomplete: 'work email',
          },
          website: { type: 'string', title: 'Website', format: 'uri', autocomplete: 'url' },
          employees: {
            type: 'integer',
            title: 'Number of employees',
            minimum: 1,
            maximum: 1000000,
          },
        },
        required: ['supportEmail', 'website'],
      },
    },
    operations: [
      {
        id: 'submit-response',
        name: 'Submit response',
        description: 'Send the requested contact details.',
      },
      { id: 'decline', name: 'Decline', description: 'Decline to provide the details.' },
    ],
    inputs: {
      'submit-response': {
        values: {
          supportEmail: 'support@acme.example',
          website: 'https://acme.example',
          employees: 42,
        },
      },
      decline: {},
    },
  },
  {
    slug: 'event-response',
    version: '0.1',
    authority: 'possession',
    host: 'calendar.example.net',
    name: 'Example Calendar',
    humanPath: '/events/workshop-2026-10',
    interaction: uuid(4),
    capability: 'Wf2kR8xLq5Nv1Tz7Mb4Hc9Ds3Pj6Ya0G',
    recipient: 'alex@example.org',
    target: {
      id: 'https://calendar.example.net/events/workshop-2026-10',
      revision: '2',
      title: 'Design systems workshop',
    },
    calendar: ics([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Example Calendar//MAP fixture//EN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      'UID:workshop-2026-10@calendar.example.net',
      'SEQUENCE:2',
      'DTSTAMP:20260925T080000Z',
      'DTSTART:20261014T090000Z',
      'DTEND:20261014T120000Z',
      'SUMMARY:Design systems workshop',
      'ORGANIZER:mailto:events@calendar.example.net',
      'ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:alex@example.org',
      'END:VEVENT',
      'END:VCALENDAR',
    ]),
    details: {
      event: { uid: 'workshop-2026-10@calendar.example.net' },
      attendee: 'mailto:alex@example.org',
    },
    operations: [
      { id: 'accept', name: 'Accept', description: 'Attend the workshop.' },
      { id: 'decline', name: 'Decline', description: 'Do not attend the workshop.' },
      {
        id: 'respond-tentatively',
        name: 'Respond tentatively',
        description: 'Tentatively attend the workshop.',
      },
    ],
    inputs: {
      accept: {},
      decline: { comment: 'Travelling that week.' },
      'respond-tentatively': { comment: 'Likely, pending travel.' },
    },
  },
  {
    slug: 'meeting-scheduling',
    version: '0.1',
    authority: 'possession',
    host: 'hiring.example.net',
    name: 'Example Recruiting',
    humanPath: '/interviews/8814/schedule',
    interaction: uuid(5),
    capability: 'Zt5mQ1vB8nK3xR7wL2pH9sD4fG6jC0aY',
    recipient: 'alex@example.org',
    target: {
      id: 'https://hiring.example.net/interviews/8814',
      revision: '1',
      title: 'Interview for the platform engineer role',
      representation: 'interview-8814/offer-1',
    },
    details: {
      summary: 'A 45-minute video interview for the platform engineer role.',
      slots: [
        { id: 'tue-1400', start: '2026-09-29T14:00:00Z', end: '2026-09-29T14:45:00Z' },
        { id: 'wed-1000', start: '2026-09-30T10:00:00Z', end: '2026-09-30T10:45:00Z' },
        { id: 'wed-1530', start: '2026-09-30T15:30:00Z', end: '2026-09-30T16:15:00Z' },
      ],
      attendeeFields: {
        type: 'object',
        properties: {
          name: { type: 'string', title: 'Your name', maxLength: 200, autocomplete: 'name' },
          note: { type: 'string', title: 'Anything we should know', maxLength: 2000 },
        },
        required: ['name'],
      },
    },
    operations: [
      { id: 'book', name: 'Book', description: 'Book one of the offered interview times.' },
      { id: 'decline', name: 'Decline', description: 'Decline all of the offered times.' },
    ],
    inputs: { book: { slot: 'wed-1000', values: { name: 'Alex Doe' } }, decline: {} },
  },
  {
    slug: 'subscription-preferences',
    version: '0.1',
    authority: 'possession',
    host: 'news.example.com',
    name: 'Example Newsletters',
    humanPath: '/preferences',
    interaction: uuid(6),
    capability: 'Pd8wX2kL5vN1qT7mB4hR9cS3fJ6yG0aZ',
    recipient: 'alex@example.org',
    target: {
      id: 'https://news.example.com/subscribers/4471/updates',
      revision: '3',
      title: 'Product updates',
      representation: 'subscriber-4471/updates/3',
    },
    details: {
      listId: 'updates.news.example.com',
      fields: {
        type: 'object',
        properties: {
          frequency: {
            type: 'string',
            title: 'How often',
            oneOf: [
              { const: 'immediate', title: 'As they happen' },
              { const: 'weekly', title: 'Weekly digest' },
            ],
            default: 'immediate',
          },
          topics: {
            type: 'array',
            title: 'Topics',
            items: {
              anyOf: [
                { const: 'product', title: 'Product news' },
                { const: 'events', title: 'Events' },
              ],
            },
            uniqueItems: true,
            default: ['product', 'events'],
          },
          paused: { type: 'boolean', title: 'Pause all email', default: false },
        },
      },
    },
    operations: [
      {
        id: 'update-preferences',
        name: 'Update preferences',
        description: 'Change how often and about what we email you.',
      },
    ],
    inputs: { 'update-preferences': { values: { frequency: 'weekly' } } },
  },
  {
    slug: 'task-assignment',
    version: '0.1',
    authority: 'credential',
    host: 'tasks.example',
    name: 'Example Tasks',
    humanPath: '/tasks/link-check-3.6.9',
    interaction: uuid(7),
    target: {
      id: 'https://tasks.example/tasks/link-check-3.6.9',
      revision: '0',
      title: 'Check links in the 3.6.9 documentation',
    },
    calendar: ics([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Example Tasks//MAP fixture//EN',
      'METHOD:REQUEST',
      'BEGIN:VTODO',
      'UID:link-check-3.6.9@tasks.example',
      'SEQUENCE:0',
      'DTSTAMP:20260925T080000Z',
      'DUE:20260930T170000Z',
      'SUMMARY:Check links in the 3.6.9 documentation',
      'ORGANIZER:mailto:docs@tasks.example',
      'ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:link-checker@agents.example',
      'END:VTODO',
      'END:VCALENDAR',
    ]),
    details: {
      task: { uid: 'link-check-3.6.9@tasks.example' },
      summary: 'Check every link in the 3.6.9 documentation release.',
      due: '2026-09-30T17:00:00Z',
      completionRequirements: 'A report listing each broken link and the page it appears on.',
    },
    operations: [
      { id: 'accept', name: 'Accept', description: 'Take on the link check.' },
      { id: 'decline', name: 'Decline', description: 'Decline the link check.' },
      {
        id: 'report-progress',
        name: 'Report progress',
        description: 'Report how much of the check is done.',
      },
      {
        id: 'report-completion',
        name: 'Report completion',
        description: 'Submit the finished report.',
      },
    ],
    inputs: {
      accept: {},
      decline: { reason: 'No capacity before the due date.' },
      'report-progress': { percentComplete: 40 },
      'report-completion': {
        report:
          'Checked 412 links. Three are broken: two on the install page, one in the changelog.',
        evidence: ['https://tasks.example/reports/link-check-3.6.9'],
      },
    },
  },
  {
    slug: 'payment-request',
    version: '0.1',
    authority: 'credential',
    host: 'billing.example',
    name: 'Example Billing',
    // A billing platform asks for its customer, the creditor.
    onBehalfOf: {
      id: 'https://billing.example/creditors/northwind',
      name: 'Northwind Supplies Ltd',
    },
    humanPath: '/invoices/INV-2026-0917',
    interaction: uuid(8),
    target: {
      id: 'https://billing.example/requests/INV-2026-0917',
      revision: '1',
      title: 'Invoice INV-2026-0917',
      representation: 'INV-2026-0917/1',
    },
    details: {
      creditorName: 'Northwind Supplies Ltd',
      creditorAccount: { iban: 'GB33BUKB20201555555555', bic: 'BUKBGB22' },
      instructedAmount: { currency: 'EUR', amount: '1250.00' },
      dueDate: '2026-10-25',
      remittanceInformationUnstructured: 'Invoice INV-2026-0917',
      invoice: { id: 'INV-2026-0917', url: 'https://billing.example/invoices/INV-2026-0917' },
    },
    operations: [
      { id: 'accept', name: 'Accept', description: 'Commit to pay invoice INV-2026-0917.' },
      { id: 'decline', name: 'Decline', description: 'Refuse invoice INV-2026-0917.' },
    ],
    inputs: {
      accept: { paymentDate: '2026-10-20' },
      decline: { reason: 'The order was cancelled.' },
    },
  },
  {
    slug: 'email-confirmation',
    version: '0.1',
    authority: 'possession',
    host: 'accounts.example.com',
    name: 'Example Developer Tools',
    humanPath: '/signup/pending',
    interaction: uuid(9),
    capability: 'Kc4nV7xP2mR9wL1tB5hQ8sD3fZ6yJ0aG',
    recipient: 'alex+devtools-7f3a@example.org',
    target: {
      id: 'https://accounts.example.com/pending/signup-5520',
      revision: '1',
      title: 'Confirm your new account',
      representation: 'signup-5520/1',
    },
    details: {
      origin: 'https://devtools.example.com',
      address: 'alex+devtools-7f3a@example.org',
      purpose: 'account-creation',
      requestedAt: '2026-09-25T07:58:00Z',
    },
    operations: [
      {
        id: 'confirm',
        name: 'Confirm',
        description: 'Confirm this address and create the account.',
      },
      {
        id: 'report-unrecognized',
        name: 'Report unrecognized',
        description: 'Report that you did not sign up.',
      },
    ],
    inputs: { confirm: {}, 'report-unrecognized': {} },
  },
  {
    slug: 'account-activity',
    version: '0.1',
    authority: 'credential',
    host: 'id.example',
    name: 'Example Identity',
    humanPath: '/security/activity/9921',
    interaction: uuid(10),
    target: {
      id: 'https://id.example/accounts/7781/activity/9921',
      revision: '1',
      title: 'New sign-in from Chrome on Windows',
      representation: 'activity-9921',
    },
    details: {
      summary: 'A new sign-in from Chrome on Windows.',
      occurredAt: '2026-09-25T07:41:00Z',
      account: 'a•••@example.org',
      eventType: 'https://schemas.openid.net/secevent/caep/event-type/session-established',
      observedFrom: {
        ip: '203.0.113.24',
        userAgent: 'Chrome 141 on Windows',
        location: 'Lisbon, Portugal',
      },
    },
    operations: [
      { id: 'confirm', name: 'Confirm', description: 'Confirm that you signed in.' },
      {
        id: 'report-unrecognized',
        name: 'Report unrecognized',
        description: 'Report that the sign-in was not you.',
      },
    ],
    inputs: { confirm: {}, 'report-unrecognized': { note: 'Not me; I was asleep.' } },
  },
];

export const credentialContext = {
  principal: 'reviewer-7',
  tenant: 'tenant-example',
  actor: 'agent-client-3',
};
