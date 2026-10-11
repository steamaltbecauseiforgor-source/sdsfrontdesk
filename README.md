# SDS Front Desk Resource Hub

The entire resource hub is protected with a shared username and password using
HTTP Basic authentication. The browser displays its built-in sign-in prompt.
Access is checked by a Netlify Edge Function before any site content is served,
including requests made directly to individual files.

## Configure access

In the Netlify project, open **Project configuration → Environment variables**
and add these variables securely:

- `SITE_AUTH_USERNAME`: the shared username (must not contain a colon).
- `SITE_AUTH_PASSWORD`: a long, unique shared password.

Make both variables available to the **Functions** scope (which includes Edge
Functions), or all scopes, for production and any branch or deploy-preview
contexts that should work. Redeploy after adding or changing these variables.
Never put their values in this repository, client-side code, or build logs.

Until both variables are configured, the site denies access with a service
unavailable response rather than serving the hub publicly. Authentication errors
also deny access. HTTPS is required outside local development, and authenticated
responses are not cached.

The published directory is `public`; authentication source code and project
configuration are not published as static files. The existing resource links
remain unchanged. This gate protects the hub itself, not third-party sites it
links to or the contents of the public source repository.

## Shared access

Share the credentials with authorized staff through a secure channel. Rotate the
password when access needs to be revoked. Browser Basic authentication can retain
credentials for the browser session; close all browser windows or use a private
window on shared computers. There is no separate sign-out button or individual
staff account management.

## Local development

Run `npm install`, then use `netlify dev --port 8889` with the two environment
variables configured locally or supplied by Netlify. Keep any local `.env` file
out of version control.
