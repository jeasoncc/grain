# Grain Documentation

Grain is transitioning from a SQLite/Lexical writing application to a local-first Org-mode desktop client. Start with the current documents below; older Novel Editor documents may describe the legacy compatibility surface rather than the default product.

## Current documentation

- [Project overview](../README.md)
- [中文项目说明](../README.zh-CN.md)
- [Desktop architecture and development](../apps/desktop/README.md)
- [Project documentation](./project/README.md)
- [Development setup](./development/README.md)
- [Desktop documentation](./desktop/README.md)
- [Desktop documentation（中文）](./desktop/README.zh-CN.md)

## Build and release

- [Release documentation](./release/)
- [Deployment](./deployment/README.md)
- [Windows installation](./windows-install-guide.md)
- [Microsoft Store publishing](./microsoft-store-guide.md)
- [AUR publishing](./AUR发布指南.md)

## Other applications

The monorepo also contains web, mobile, admin, and API applications. They do not provide the capability-scoped local filesystem boundary used by Grain Desktop.

- [Web](./web/README.md)
- [Mobile](./mobile-app.md)
- [Admin](./admin-panel.md)
- [API](./api-server.md)

## Documentation status

The repository contains historical documentation for the former Novel Editor product. During the migration:

- `.org` files are the canonical desktop content format.
- CodeMirror is the primary Org editor.
- SQLite/Lexical documentation applies only to the explicit legacy route unless stated otherwise.
- No real historical `grain.db` should be read or modified without explicit authorization.

When updating documentation, clearly label legacy-only behavior and avoid describing SQLite body storage as the current source of truth.
