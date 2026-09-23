---
title: Results and retries
description: Reporting operation state and recovering from an interrupted exchange.
navTitle: Results and retries
---

A result tells the client what happened to the requested operation. Successful delivery of a request is insufficient to establish that the operation completed.

## Operation states

The draft requires the following distinctions where they apply. The type defines which states its operations use. Wire values and HTTP status mappings remain to be specified.

| State             | Meaning                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Accepted          | The service accepted the request. Further work, such as an edit following recorded feedback, may remain. |
| Completed         | The requested effect occurred. For Content Review approval, this means the review decision was recorded. |
| Refused           | The operation was not performed because permission or another required condition was absent.             |
| Stale revision    | The request referred to an outdated revision and was not applied to the current content.                 |
| Approval required | An additional decision is needed before the operation can proceed.                                       |
| Pending           | The work is outstanding. The result provides any available status or follow-up reference.                |
| Uncertain         | The client cannot determine whether the effect occurred.                                                 |

These distinctions describe operation meaning. In particular, an uncertain state may result from a lost response; it need not be a state returned by the service.

## Request and target references

The result identifies the request and the target it concerns. Where the type binds operations to revisions, the result identifies the affected revision. A service may also provide a reference through which an authorised client can inspect the recorded result.

For Content Review, an approval result without an identifiable content revision is insufficient.

## Duplicate requests

A client may lose the response after the service has performed an operation. Retrying that request must not apply the same effect a second time.

The execution profile must define how a service recognises a retry and how a client retrieves the original result. It must also distinguish a retry from a request with changed inputs or a different target revision.

## Interrupted exchanges

After a timeout, the client cannot assume that the request failed. It should recover the authoritative result before retrying in a way that could duplicate the operation.

Request identifiers, retention periods, recovery routes and status mappings remain open requirements for the wire profile.
