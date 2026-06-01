# Ghost AI

A real-time collaborative system design workspace used as an internal tool by a trusted team—not a public, multi-tenant product.

## Language

**Internal tool**:
Software meant for use inside the organization on a trusted network, not sold or opened to arbitrary external users.
_Avoid_: Private app, internal-only SaaS

**Authentication**:
Not part of this product. Users are not identified, signed in, or authorized by the application.
_Avoid_: Auth, login, sign-in (as product features)

**User** (reserved):
Do not use for signed-in accounts or Clerk identities. If a term is needed later for Liveblocks presence or audit trails, define it separately—do not reuse this label until then.
