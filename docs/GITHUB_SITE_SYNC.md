# GitHub and playable Site synchronization

GitHub is the canonical source. Before each requested update, fetch all branch heads, inspect commits ahead of main, merge authorized work while preserving concurrent edits, and test the combined tree. Publish from that exact merged tree; do not overwrite a newer remote head. Use a commit with both branch parents and a leased, fast-forward update of main.

The hosted Site must carry the same tracked source and assets as GitHub. Its `.openai/hosting.json` is the hosting-only addition. Compare all tracked file hashes before packaging and check remote branches again before publication. Development QA files, credentials, databases and ignored downloads must not be copied.

The Site deploys `dist/` as static assets. `server/` implements a loopback-only Node + SQLite rewards sandbox and is kept in source for local use. It is not an active service on the public Site. Music and adventure features run in the browser; use Sound on to enable the soundtrack after a user gesture. Real Collector Crypt fulfillment and fee ingestion are not configured.
