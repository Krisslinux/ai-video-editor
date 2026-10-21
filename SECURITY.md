# Security and privacy

Do not disclose vulnerabilities through public issues containing private media, prompts, transcripts, credentials or session data. Use the repository owner's private security reporting route where available; no unverified email address is published here.

Use HTTPS, invitation-only local registration, encrypted server configuration and a constrained non-root worker. Never expose development auto-login or the default development worker token publicly. Production requires independently generated encryption and worker secrets. The hosted Site uses Sites sign-in and remains private by default.

The operator worker has privileged access to job media and selected provider credentials. Protect its environment and private service credential. Do not publish credentials, grant untrusted people worker access or mount unrelated personal directories into its container.

The app rejects textual playlists, unsupported signatures/containers, oversized media, private provider DNS and redirected provider HTTP. Valid media is still untrusted. Keep FFmpeg/Node dependencies patched and enforce container/firewall/resource policy. The checks are not a complete OS sandbox for malformed codecs.

This release has no automatic retention sweeper or guaranteed monetary cap. It tracks sources/committed output, jobs and provider dispatches; orphaned objects can remain after a crash. Private testing is appropriate while the operational gates in docs/TASKS.md are completed.

No Sentry or external analytics is enabled. Before enabling monitoring, scrub media, tokens, URLs, paths, transcript/prompt contents, cookies and headers, and verify an actual error event. Log only stage/error codes needed for diagnosis. This repository does not collect consumer account session cookies.
