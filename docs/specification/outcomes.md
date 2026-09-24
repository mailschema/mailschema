---
title: Results and retries
description: Reporting operation state and recovering from an interrupted exchange.
navTitle: Results and retries
---

A response tells the client what the service recorded for a request. Successful HTTP delivery alone does not establish that the operation completed. The [MAP 0.1 outcome table](/specification/profile#outcomes) defines every result state, problem code and HTTP mapping.

## Request and target references

A result identifies the request, interaction, type, operation and target it concerns. Where a type binds an operation to a revision, the result names that revision. For Content Review, an approval without an identifiable content revision is insufficient.

The response also identifies the result resource. That resource is authoritative for later state and is read with the caller's current service authorization.

## Duplicate requests

A client can lose a response after the service applies an operation. It persists the original `requestId` and reuses the complete original request when retrying. The service returns the recorded response without applying the effect again.

Changing an input, operation or target revision creates a different request and requires a new identifier. Reusing an existing identifier with changed values produces an idempotency conflict.

## Interrupted exchanges

After a timeout, the client cannot assume that the operation failed. It should retrieve the result resource before taking another action that could duplicate the effect.

A missing retained result does not prove that an effect never occurred. The service keeps enough duplicate-suppression state after the response expires to prevent an old request from being applied again. `uncertain` describes what the client knows after an interrupted exchange; it is not a service result state.

## Non-terminal work

`pending` and `approval-required` may advance once to a terminal result. Recovery and an exact retry return the latest recorded state, which can differ from the initial response. Each transition is durable before the service returns it.

Claiming a request identifier, applying or durably initiating its effect and recording recoverable state are atomic or covered by reconciliation. A service restart cannot turn a lost response into a second effect.
