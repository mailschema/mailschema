---
title: Results and retries
description: Reporting operation state and recovering from an interrupted exchange.
navTitle: Results and retries
---

A response tells the client what the service recorded for a request. Successful HTTP delivery alone does not establish that the operation completed. The [MAP 0.2 outcome table](/specification/profile#outcomes) defines every state, problem code and HTTP mapping.

## States

- **`accepted`**: the request was recorded, and the service may carry out further work.
- **`completed`**: the effect completed.
- **`failed`**: the operation ended without its effect. The result gives a reason, such as `declined`, `expired`, `superseded` or a reason the type declares, like `unavailable` for a time already taken.
- **`pending`** and **`approval-required`**: not yet terminal. An approval carries the link where a person decides.

## Decisions

The first decision operation that completes decides the interaction. A later decision is refused as `already-decided`, and a pending approval on it ends as `superseded`. Repeatable operations, such as feedback, progress reports, preference changes and calendar replies, stay available until the interaction expires.

## Duplicate requests

A client can lose a response after the service applies an operation. It persists the original `requestId` and repeats the complete original request, and the service returns the recorded response without applying the effect again. A changed input or a different operation is a new request with a new identifier. Reusing an identifier with changed values is an idempotency conflict.

## Interrupted exchanges

After a timeout, the client cannot assume that the operation failed. It reads the result resource before taking any action that could duplicate the effect.

A missing retained result does not prove that no effect occurred. The service keeps enough state after a result expires to refuse the old request rather than apply it again. `uncertain` describes what a client knows after an interrupted exchange; it is not a service state.

## Non-terminal work

`pending` and `approval-required` advance once, to a terminal result. An approval nobody decides becomes `failed` with reason `expired` at the interaction's expiry. Each transition is durable before the service returns it, and claiming a request identifier, applying its effect and recording its state are atomic or reconciled.
