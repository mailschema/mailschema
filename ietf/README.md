# Internet-Draft source

`draft-mailschema-mail-action-protocol-00.xml` is the individual-submission source for Mail Action Protocol. It requests Standards Track status and describes MAP as an action vocabulary and authenticated HTTPS execution profile carried by the IETF Structured Email MIME model.

Build locally with the IETF `xml2rfc` author tool:

```sh
mkdir -p /tmp/mailschema-rfc
xml2rfc --text --html --path /tmp/mailschema-rfc ietf/draft-mailschema-mail-action-protocol-00.xml
```

CI pins `xml2rfc` 3.34.1 and renders both formats. The draft requests no new media type, DNS record or well-known URI. Its only IANA request registers the `map_services` parameter in the existing OAuth Protected Resource Metadata registry. Implementation claims must remain aligned with the public conformance manifest and linked repository evidence. Rendering is not submission or IETF adoption.
