---
title: Content Review
description: Request changes or approve a specific revision of content.
navTitle: Content Review
---

Content Review defines two operations on a revision of content: request changes and approve. The service owns the content and controls who can review it.

The first example is a campaign test email. The same review model could apply to a documentation draft or a company listing, provided the service supports the same operations and results.

## Target

A review identifies the content and its exact revision. The reviewer must be able to determine which version the decision concerns.

When content changes, the new revision requires its own review. An approval of an earlier revision does not carry forward automatically.

## Request changes

The reviewer submits feedback on the identified revision. The service checks permission, records the feedback and returns a result that identifies the revision.

Acceptance confirms that the feedback was recorded. Editing the content is a separate operation, performed through the service's own workflow and permission checks.

## Approve

An authorised reviewer records approval of the identified revision. The result names that revision so the client can display the decision accurately.

Approval records a review decision. Any subsequent sending, publication or other operation is subject to the service's separate permissions and workflow.

## Example exchange

1. A service sends a test email for campaign revision 3.
2. A reviewer submits feedback on revision 3.
3. The service confirms that the feedback was recorded.
4. An editor with permission creates revision 4.
5. An authorised reviewer approves revision 4.
6. The service confirms that approval was recorded for revision 4.

The [interactive example](/examples/) simulates this exchange in the browser. It includes requests from a caller without permission and requests that refer to an old revision.

## Stale and repeated requests

The service refuses a request that targets a stale revision. It does not apply the decision to newer content.

A retry of the same request must not create a duplicate effect. A request with changed inputs or a different revision is a new request. The execution profile will define identification and recovery rules.

## Service responsibilities

The service manages content storage, editing, reviewer permissions and subsequent sending or publication. It also determines which revision is current for the review.

The shared type defines the meaning of the review operations and their results. Its Registry record should identify the definition's version, examples, open issues and any implementation evidence.
