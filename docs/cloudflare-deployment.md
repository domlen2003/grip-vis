# Cloudflare Workers deployment

Prepared on 2026-11-04 for automatic deployment of the `grip-vis` Worker at `https://grip.dominiklenz.com`. Publishing happens through the connected GitHub repository when changes reach `main`.

## Connect once, deploy on push

Connect `domlen2003/grip-vis` to Cloudflare Workers Builds once, selecting `main` as the production branch and the repository root as the project root. Keep Cloudflare's default deployment workflow and leave the optional separate build step empty. The application build is already part of the committed Wrangler configuration.

After connection, a push to `main` triggers the build and deployment automatically. Cloudflare manages deployment authorization through the GitHub connection. The current app needs no application secrets or database bindings. See [Cloudflare's Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/) for the repository connection.

Preparing the repository does not create the Cloudflare connection, publish a Worker or change DNS. The Cloudflare account must have access to the GitHub repository and the active domain zone.

## Configuration in the repository

`wrangler.jsonc` defines the `grip-vis` Worker and runs `npm run build` before packaging it. SvelteKit 3 uses `@sveltejs/adapter-cloudflare` in `vite.config.ts` to produce `.svelte-kit/cloudflare/_worker.js` and the static assets in `.svelte-kit/cloudflare`, exposed through the `ASSETS` binding. The runtime compatibility date is `2026-11-04` with `nodejs_compat`. See the [SvelteKit Cloudflare adapter documentation](https://svelte.dev/docs/kit/adapter-cloudflare).

`.nvmrc` selects Node.js 24 for the Cloudflare build and local tooling. The lockfile records the npm dependencies. Cloudflare supports `.nvmrc` for Node version selection; see its [build image documentation](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/). Generated `.svelte-kit/` output stays outside Git and is rebuilt from the source files.

The same Wrangler file declares `grip.dominiklenz.com` with `custom_domain: true`. When Cloudflare deploys and attaches that Custom Domain, it provisions the associated DNS record and TLS certificate. See [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

## Domain prerequisites

The `dominiklenz.com` zone must be active in the Cloudflare account that owns the Worker. The connected build must have permission to deploy the Worker and attach its Custom Domain. The configured hostname covers every path on `grip.dominiklenz.com`.

If domain attachment reports a DNS conflict, inspect the existing records for that hostname and determine what they currently serve. An existing CNAME explicitly prevents Custom Domain creation; an existing A or AAAA record also needs review if Cloudflare reports a conflict. Resolve only the named hostname's conflict once its existing use is understood. Do not preemptively remove records or change the parent domain's DNS. If the zone is unavailable to the deployment account, correct the account or zone setup first.

## Local checks and preview

From the repository root:

```sh
npm ci
npm run check
npm test
npm run check:worker
npm run preview -- --port 4173
```

`check:worker` uses Wrangler's dry run to build and check deployment packaging locally without publishing or configuring the domain. Preview runs the configured build, then serves it at [127.0.0.1:4173](http://127.0.0.1:4173) through Wrangler's local Workers runtime. It needs no Cloudflare login. `npm start -- --port 4173` runs the same local preview; stop either command with Ctrl+C. Use `npm run dev -- --port 4173` for Vite development with live updates.

A local check does not verify Cloudflare account permissions, domain ownership, DNS or HTTPS. Confirm the public app after the automatic deployment succeeds.

## Verify the deployed app

Inspect the connected Worker's build status and domain status after the push. Once Cloudflare reports a successful deployment and an active domain, open `https://grip.dominiklenz.com` and check:

1. The main diagram renders and sliders update it.
2. A scenario plays, pauses and scrubs through its timeline.
3. A 3D explanation opens and closes; use its text fallback on a browser without WebGL.
4. Export a session, change a control and import the session to restore it.
5. Reload the page and confirm the saved session returns.

Browser sessions use `localStorage`, scoped to their origin and browser profile. Data from `localhost`, `127.0.0.1`, a Workers preview hostname and `grip.dominiklenz.com` is separate. Move it explicitly with **Export session** and **Import session**. There is no cloud session database, account authentication, server telemetry capture or simulator connection in this deployment.
