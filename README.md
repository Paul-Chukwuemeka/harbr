# harbr

**harbr** is a lightweight, intuitive Terminal User Interface (TUI) port manager. It allows you to effortlessly monitor active connections, identify listening ports, and manage the processes holding them — right from your terminal.

## Features

- **Real-time Monitoring:** View active network connections and listening ports.
- **Process Management:** Send SIGTERM (`t`) or SIGKILL (`Enter`) signals to processes directly from the TUI.
- **Multi-selection:** Mark multiple connections using the `Space` bar for batch process termination.
- **Filtering & Search:** Quickly find specific ports or processes by pressing `/`.
- **Sorting:** Sort connections by PID, Command, or Port (`s`), and toggle order between Ascending/Descending (`a`).
- **Security Visibility:** Automatically highlights externally exposed ports (e.g., `0.0.0.0`, `*`) with a red warning symbol (⚠).
- **Responsive Navigation:** Scroll and navigate through connection groups with arrow keys.

## Tech Stack

- **[Ink](https://github.com/vadimdemedes/ink):** Interactive CLI apps using React.
- **[React](https://reactjs.org/):** UI framework.
- **[systeminformation](https://systeminformation.io/):** For retrieving detailed network and process data cross-platform.
- **TypeScript:** For type safety.
- **esbuild & tsx:** Lightning-fast builds and execution.

## Installation

The easiest way to use **harbr** is to install it globally via npm:

```bash
npm install -g harbr
```
After installation, simply run `harbr` from anywhere in your terminal.

### Local Development Setup

If you wish to contribute or modify the codebase, you can set it up locally:

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd harbr
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run in development mode:**
   ```bash
   npm start
   ```

4. **Link globally for testing:**
   ```bash
   npm run build
   npm link
   ```
   *This compiles the application and makes the `harbr` command available globally mapping to your local repository.*

## Keybindings

| Key | Action |
| --- | --- |
| `↑` / `↓` | Navigate list up and down |
| `Space` | Mark / Unmark current process for batch actions |
| `t` | Send `SIGTERM` to marked/highlighted process(es) |
| `Enter` | Send `SIGKILL` to marked/highlighted process(es) |
| `s` | Cycle sort by PID / Command / Port |
| `a` | Toggle Ascending / Descending sort |
| `/` | Enter filter/search mode (`Enter`/`Esc` to exit) |

## Output Indicators

- `❯` : Currently selected process block
- `•` : Marked process block
- `✗` : Process killed
- `⚠` (Red Warning) : Indicates the port is exposed externally (listening on `0.0.0.0`, `*`, or `::`)

## License

ISC License
