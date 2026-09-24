---
title: Results and retries
description: Reporting operation state and recovering from an interrupted exchange.
navTitle: Results and retries
---

A result tells the client what happened to the requested operation. Successful delivery of a request is insufficient to establish that the operation completed.

## Operation states

The draft requires the following distinctions where they apply. The type defines which states its operations use. MAP 0.1 assigns the service result values and HTTP status mappings in the [execution profile](/specification/profile/).

| State             | Meaning                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Accepted          | The service accepted the request. Further work, such as an edit following recorded feedback, may remain. |
| Completed         | The requested effect occurred. For Content Review approval, this means the review decision was recorded. |
| Refused           | The operation was not performed because permission or another required condition was absent.             |
| Stale revision    | The request referred to an outdated revision and was not applied to the current content.                 |
| Approval required | An additional decision is needed before the operation can proceed.                                       |
| Pending           | The work is outstanding. The result provides any available status or follow-up reference.                |
| Failed            | Work previously accepted by the service ended without completing the requested effect.                   |
| Uncertain         | The client cannot determine whether the effect occurred.                                                 |

These distinctions describe operation meaning. In particular, an uncertain state may result from a lost response; it need not be a state returned by the service.

## Request and target references

The result identifies the request and the target it concerns. Where the type binds operations to revisions, the result identifies the affected revision. A service may also provide a reference through which an authorised client can inspect the recorded result.

For Content Review, an approval result without an identifiable content revision is insufficient.

## Duplicate requests

A client may lose the response after the service has performed an operation. Retrying that request must not apply the same effect a second time.

The execution profile binds one complete request value and authenticated principal to a client-generated request ID. An exact retry returns the latest recorded result after a current access check. A changed value, including a changed target revision, produces an idempotency conflict and no effect.

## Interrupted exchanges

After a timeout, the client cannot assume that the request failed. It should recover the authoritative result before retrying in a way that could duplicate the operation.

The description advertises a result URL template and retention period. Every response identifies that result resource. An authenticated client retrieves it after an interrupted exchange before deciding whether another request is safe. Retrieval is side-effect free and rechecks current permission. The service keeps duplicate-suppression state after the response body expires so an old request cannot apply the effect again.

## Non-terminal work

`pending` and `approval-required` can advance to `accepted`, `completed` or `failed`. The result resource is authoritative, so recovery and an exact retry can return a newer state than the initial response. A service records each transition durably before returning it.

Claiming a request identifier, applying or durably initiating its effect, and recording recoverable state must be atomic or covered by a reconciliation process. A service restart cannot turn an uncertain response into a second effect.
