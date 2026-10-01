# Internet-Draft source

`draft-mailschema-mail-action-protocol-00.xml` is the generated individual-submission candidate for MAP 0.3. It describes an email action description, existing-service HTTP mappings, and an optional experimental capability binding. It defines no universal execution API. It is not submitted or adopted.

The canonical text and four contracts are in [specifications/map-0.3](../specifications/map-0.3/README.md). `npm run spec:generate` validates and regenerates the examples, contract projection, draft inventory, and RFCXML. `npm run spec:check` and `npm run draft:check` detect drift. Do not edit generated XML.

Build locally with the IETF `xml2rfc` author tool:

```sh
python3 -m venv .release/xml2rfc
.release/xml2rfc/bin/pip install -r ietf/requirements.txt
mkdir -p .release/ietf/map-0.3
.release/xml2rfc/bin/xml2rfc --text --html --path .release/ietf/map-0.3 ietf/draft-mailschema-mail-action-protocol-00.xml
npx --yes @ietf-tools/idnits@3.1.0 --mode submission --offline --output json .release/ietf/map-0.3/draft-mailschema-mail-action-protocol-00.txt
```

CI renders both formats with the pinned tool. Output lives under `.release/`, outside the public site's artifacts. The RFCXML `consensus="true"` attribute is required by xml2rfc for an intended Standards Track RFC; it is not evidence of current IETF consensus. The draft requests no IANA action: the 0.2 proposal for `map_services` metadata is not part of this design. Long displayed code lines use RFC 8792 folding; the actual JSON files are unchanged.

`archive/map-0.2.xml` preserves the previous unsubmitted candidate byte for byte. Its template and generation from the live 0.2 specification remain checked so current-profile validation stays intact. This is an archive of a drafting candidate, not a second `-00` submission.

The [IETF 127 submission cutoff](https://datatracker.ietf.org/meeting/127/important-dates/) is 2 November 2026 at 23:59 UTC. Before upload, review the author details, date, durable artifact link, latest SML dependency, and implementation feedback, then rerun the checks. Rendering does not submit the document or establish interoperability.
