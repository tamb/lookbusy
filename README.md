# ocupado

Make your computer look busy with fake terminal commands, browser dashboards, and installation windows.

> **Note:** This package is purely for entertainment/demonstration purposes. It doesn't actually do any real work or modify your system.

## Features

- **Terminal Output**: Displays fake npm installs, docker pulls, git operations, webpack builds, database migrations, test runs, Kubernetes deployments, and API calls with realistic colors and spinners
- **Spawn Terminal**: Opens an additional terminal window with fake build output
- **Browser Dashboard**: Launches a browser with a fake DevOps dashboard showing deployment progress, CPU/memory charts, and live logs
- **Native Window**: Shows a native installer-style progress window
- **Stay Awake**: Prevents your screen from sleeping while running

## Quick Start

The fastest way to run ocupado is with npx (no installation required):

```bash
npx ocupado
```

## Installation

### Global Installation (Recommended)

```bash
npm install -g ocupado
```

Then run from anywhere:

```bash
ocupado
```

### Local Installation

```bash
npm install ocupado
```

Then run via npx or npm scripts:

```bash
npx ocupado
```

## Usage

### Basic Usage - All Features

Run with all features enabled (terminal output, browser, native window, spawned terminal, stay awake):

```bash
ocupado
```

### Interactive Mode - Select Features

Use the `--options` flag to interactively select which features to enable:

```bash
ocupado --options
```

This displays a checklist:

```
? Select features to enable:
 ◉ Terminal output - Fake commands with spinners and progress bars
 ◉ Spawn additional terminal - Open a new terminal window with fake output
 ◉ Browser dashboard - Launch a browser with a fake DevOps dashboard
 ◉ Native installer window - Show a native window with fake installation progress
 ◉ Stay awake - Prevent the screen from sleeping
```

Use arrow keys to navigate, space to toggle, and enter to confirm.

### Stopping

Press `Ctrl+C` to stop ocupado. All spawned processes and windows will be cleaned up automatically.

## Examples

```bash
# Run everything (default)
ocupado

# Select specific features interactively
ocupado --options

# Run via npx without installing
npx ocupado

# Run via npx with options
npx ocupado --options
```

## Platform Requirements

| Feature | Linux | macOS | Windows |
|---------|-------|-------|---------|
| Terminal Output | ✅ | ✅ | ✅ |
| Spawn Terminal | gnome-terminal, konsole, xfce4-terminal, xterm, etc. | Terminal.app, iTerm | Windows Terminal, PowerShell, cmd |
| Browser Dashboard | ✅ (Chromium auto-downloaded) | ✅ | ✅ |
| Native Window | zenity or yad | Built-in (AppleScript) | Built-in (PowerShell) |
| Stay Awake | xdg-screensaver, caffeine, xset, or gnome-session-inhibit | caffeinate | PowerShell |

### System Requirements

- **Node.js**: >= 18.0.0
- **Disk Space**: ~200MB for Playwright's Chromium browser (downloaded on first run)

### Installing Native Window Dependencies (Linux)

Most Linux desktop environments have `zenity` pre-installed. If not:

```bash
# Ubuntu/Debian
sudo apt install zenity

# Fedora
sudo dnf install zenity

# Arch
sudo pacman -S zenity
```

## How It Works

All the "work" displayed is completely fake:

- **Terminal commands** generate random realistic-looking output with package names, version numbers, file paths, etc.
- **Browser dashboard** shows animated charts and logs that look like a real deployment
- **Native window** displays fake file installation progress
- **Nothing is actually installed, built, or modified on your system**

## Security

This application is designed to be safe and non-invasive:

- **No file access**: Does not read, write, or modify any files on your system
- **No network**: Does not make any external network requests
- **No elevated privileges**: Warns if run as root/admin (not required)
- **Input validation**: All internal commands are validated against strict patterns
- **Secure temp files**: Temporary files use restrictive permissions and are cleaned up
- **Process isolation**: All spawned processes are properly tracked and terminated

See [SECURITY.md](./SECURITY.md) for full security documentation.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:

- Setting up the development environment
- Running and writing tests
- Testing the package locally
- Submitting pull requests

## Development

```bash
# Clone the repository
git clone https://github.com/yourusername/ocupado.git
cd ocupado

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Development mode (watch for changes)
npm run dev
```

## License

MIT
