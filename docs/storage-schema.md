# Local Storage Schema

Dashboard state is stored in `localStorage` buckets prefixed with `image#<session>`.
Each session id comes from `location.hash` of the form `#local:<id>` and is
also persisted to the `__lastSessionId` key. When the page loads without a hash,
this stored id is reapplied to maintain continuity.

## Bucket naming

```
image#<sessionId>
```

Every bucket contains a JSON object with a `boards` array. New sessions reuse the
same structure and legacy buckets are migrated on startup.

## Widget objects

Widgets inside a view require these fields:

- `dataid` – persistent identifier
- `url` – iframe source
- `columns` – grid column span
- `rows` – grid row span
- `order` – position order
- `type` – optional widget type
- `version` – defaults to `"1"` when missing

## Compatibility rules

Older buckets might omit the `version` property. The loader automatically sets it
to `"1"` to keep widgets functional. When new fields are introduced they must be
optional so earlier dashboards continue to load without modification.

Hash format
-----------
#local:<sessionId>[&board=<id>&view=<id>]

UI code MUST preserve the `#local:<sessionId>` prefix to avoid
creating new storage buckets.
