---
title: Results and retries
description: Distinguish accepted, completed, failed, refused, stale and decided outcomes. Retry without duplicate effects.
navTitle: Results and retries
---

A response tells the client what the service recorded for a request. Successful HTTP delivery alone does not establish that the operation completed. The [outcome table](/specification/profile#outcomes) defines every state, problem code and HTTP mapping, and [decisions](/specification/profile#decisions-and-repeatable-operations) how an interaction is settled.

## Reading a result

`accepted` means the service recorded the request and may still be working; `completed` means the effect happened. `failed` always carries a reason, such as `declined`, `expired` or one the type declares, like `unavailable` for a time already taken. `pending` and `approval-required` are not yet final: read the result resource again, or wait for the person deciding at the approval link.

## Duplicate requests

A client can lose a response after the service applies an operation. It persists the original `requestId` and repeats the complete original request, and the service returns the recorded response without applying the effect again. A changed input or a different operation is a new request with a new identifier.

## Interrupted exchanges

After a timeout, the client cannot assume that the operation failed. It reads the result resource before taking any action that could duplicate the effect.

A missing retained result does not prove that no effect occurred: the service keeps enough state after a result expires to refuse the old request rather than apply it again. The profile's [idempotency and recovery](/specification/profile#idempotency-and-recovery) rules say how long each is kept.
