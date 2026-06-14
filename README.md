# FIAS Plugin Quickstart

A starter template for building plugins on the FIAS platform. Scaffolded automatically — you can develop entirely in your browser via GitHub Codespaces, or locally with VS Code Dev Containers.

## Quick start (Codespaces)

1. Click **Use this template** at the top of this page → **Create a new repository**, and pick a name for your plugin (e.g. `my-plugin`).
2. From your new repo, click **Code → Codespaces → Create codespace on main**.
3. Wait ~2 minutes while the dev environment provisions, your plugin is scaffolded, and dependencies are installed.
4. In the Codespace terminal, authenticate the CLI:

   ```sh
   npx fias-dev login --manual
   ```

   This prints a URL and a short code. Open the URL in your browser, paste the code, approve, and your CLI is authenticated.
5. Start the dev server:

   ```sh
   npm start
   ```

   Then open the forwarded port (3000) and start editing files in your workspace — they're your plugin source. The scaffolder set up the project layout for you; the README it dropped in explains the project conventions.

## Local development (Dev Containers)

Prefer to develop locally? You'll get the same scaffolded environment without leaving your machine.

1. Install [Docker](https://www.docker.com/) and [VS Code](https://code.visualstudio.com/).
2. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).
3. Clone your repo and open it in VS Code. When prompted, choose **Reopen in Container** — Dev Containers reads `.devcontainer/devcontainer.json` and gives you the same setup as a Codespace.
4. Run `fias-dev login --manual` in the integrated terminal to authenticate.

## What's in this template

- **`.devcontainer/devcontainer.json`** — Defines the dev environment. On first launch, runs `npx @fias/create-fias-plugin@latest --in-place`, which scaffolds your plugin directly into the workspace root (without overwriting this README, the LICENSE, or your `.gitignore`).
- **`LICENSE`** — MIT. Update for your plugin if MIT isn't appropriate.
- **`.gitignore`** — Sensible defaults for a Node-based project.

After the scaffolder runs, your plugin's own files (e.g. `package.json`, `src/`) appear alongside these template files. The scaffolder's own README, if any, will sit next to this one.

## Next steps

- Read the FIAS plugin development docs for project conventions and the SDK reference.
- Use `fias-dev --help` to see CLI commands for building, testing, and publishing your plugin.
- Open an issue on this template repo if you hit problems with the bootstrap, or on the FIAS platform if the issue is product-related.

## License

MIT — see [LICENSE](LICENSE).
