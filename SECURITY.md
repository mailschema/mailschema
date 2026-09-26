# Security policy

MailSchema publishes draft protocol material, schemas, Registry tooling and a static website. It does not operate an authorization service or hold implementation credentials.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for the affected repository. Include the affected profile or package version, a minimal reproduction, likely impact and any known mitigations. Do not include live credentials, private email or personal data.

For a vulnerability in an implementing service, report it to that service's security contact. A Registry listing does not make MailSchema the operator of the listed product.

## Supported versions

Before the first stable MAP profile, security fixes are applied to the current working draft and noted in its change history. Published package releases follow their own version histories. Older draft profiles may be documented for migration without receiving fixes.

## Protocol security boundary

A structured email description is untrusted input. It does not authenticate a caller, grant a permission, extend an agent's instructions or authorize an external fetch. The one exception is possession authority: a capability URL issued to the recipient, valid only for operations its contract permits, and only after the client verifies aligned DKIM, DMARC and the recipient binding the profile requires. Implementations must authenticate execution at the service, enforce current permissions and policy, bind requests to their targets and revisions, and make retries safe.
