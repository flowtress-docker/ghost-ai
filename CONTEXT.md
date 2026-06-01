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

**Project**:
A saved architecture workspace (canvas + metadata + specs). Every project is visible and editable by anyone using the app.
_Avoid_: Owned project, private project, shared project

**Workspace**:
The open, flat collection of all projects—no “mine” vs “theirs” split.
_Avoid_: My Projects, Shared with me

**Owner** / **Collaborator**:
Not used. Legacy concepts from multi-tenant auth; remove from product language and data model.
_Avoid_: ownerId, invite, share by email, access control list
