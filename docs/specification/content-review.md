---
title: Content Review
description: Request changes or decide approval for a specific revision of content.
navTitle: Content Review
---

Content Review defines two operations on a revision of content: request changes and approve. The service owns the content and controls who can review it.

The first example is a campaign test email. The same review model could apply to a documentation draft or a company listing, provided the service supports the same operations and results.

## Target

A review identifies the content and its exact revision. The reviewer must be able to determine which version the decision concerns.

The target digest is a service-issued SHA-256 digest of that authoritative review revision. The service defines and preserves the exact bytes used to compute it. A client treats it as an opaque state validator unless the service separately publishes the representation. Interoperability depends on comparing the exact token, not reproducing another service's content serialization.

When content changes, the new revision requires its own review. An approval of an earlier revision does not carry forward automatically.

## Request changes

The reviewer submits feedback on the identified revision. The service checks permission, records the feedback and returns a result that identifies the revision.

Acceptance confirms that the feedback was recorded. Editing the content is a separate operation, performed through the service's own workflow and permission checks.

## Approve

An authorised reviewer records approval of the identified revision. The result names that revision so the client can display the decision accurately.

Approval records a review decision. Any subsequent sending, publication or other operation is subject to the service's separate permissions and workflow.

The service decides how a caller may participate. A caller with no review authority receives `refused`. A caller allowed to propose approval receives `approval-required` and a route for the service's normal human decision. A caller with decision authority may receive `completed` when the service records the approval directly. MAP does not infer authority from whether the caller is a person or an agent.

The human decision is a separate authorized act. The service may allow another reviewer in the same tenant to decide the proposal under its existing team and role rules. An unauthorized attempt does not change the proposed request. An authorized decline records a terminal `failed` result with reason `declined`.

Before recording approval, the service rechecks the interaction expiry and current target. If the interaction has expired or the content has changed, the proposal ends as `failed` with reason `expired` or `stale-target`. These are results of the already accepted approval workflow, rather than new request failures.

The service's own content and sending rules still apply when the decision is made. If they do not permit the approval, the service refuses that decision attempt and the proposal stays `approval-required`. The reviewer sees the reason and can decline it; otherwise it ends as `expired`. Content that satisfies the rules is a new revision and therefore a new interaction.

## Example exchange

1. A service sends a test email for campaign revision 3.
2. A reviewer submits feedback on revision 3.
3. The service confirms that the feedback was recorded.
4. An editor with permission creates revision 4.
5. An authorised reviewer approves revision 4, directly or through the service's approval route.
6. The service confirms that approval was recorded for revision 4.

The [interactive example](/examples/) simulates this exchange in the browser. It includes requests from a caller without permission and requests that refer to an old revision.

## Stale and repeated requests

The service returns a `stale-target` problem when a new request targets a stale revision. If a valid approval proposal becomes stale while waiting for a human decision, it ends with a `failed` result whose reason is `stale-target`. Neither path applies the decision to newer content.

A retry of the same request must not create a duplicate effect. A request with changed inputs or a different revision is a new request and uses a new request identifier. The execution profile defines identification and recovery rules.

## Service responsibilities

The service manages content storage, editing, reviewer permissions and subsequent sending or publication. It also determines which revision is current for the review.

The shared type defines the meaning of the review operations and their results. Its Registry record should identify the definition's version, examples, open issues and any implementation evidence.
