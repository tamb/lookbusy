# Security Policy

## Overview

`ocupado` is designed to be a safe, non-invasive entertainment tool. This document outlines the security measures in place and what the application does and does not do.

## What ocupado Does

### Terminal Output
- Displays fake text output to the terminal
- Uses standard terminal escape codes for colors (ANSI)
- **Does NOT** execute any real commands or modify any files

### Browser Dashboard
- Opens a browser window using Playwright
- Displays a bundled HTML page with fake dashboard data
- **Does NOT** make any network requests to external servers
- **Does NOT** access any real system metrics

### Native Window
- Creates temporary script files to display progress dialogs
- Uses system tools (zenity/yad on Linux, AppleScript on macOS, PowerShell on Windows)
- Scripts only display UI elements - they don't perform any system operations
- Temporary files are created with restrictive permissions (owner-only)
- All temporary files are cleaned up on exit

### Stay Awake
- Prevents screen sleep using standard OS mechanisms
- Linux: Uses `xdg-screensaver`, `caffeine`, `xset`, or `gnome-session-inhibit`
- macOS: Uses the built-in `caffeinate` command
- Windows: Sends F15 key presses (a rarely-used key that doesn't interfere with normal operation)
- All changes are reverted when the application exits

### Terminal Spawning
- Spawns additional terminal windows
- Only runs the bundled ocupado script (no arbitrary code execution)
- Terminal processes are tracked and terminated on exit

## What ocupado Does NOT Do

- ❌ Access, read, or modify any user files
- ❌ Make network requests or send data anywhere
- ❌ Install any software or packages
- ❌ Modify system settings (except temporary screen sleep prevention)
- ❌ Access sensitive data (passwords, keys, etc.)
- ❌ Run with elevated privileges (warns if run as root)
- ❌ Execute any shell commands from user input

## Security Measures

### Input Validation
- All command names used internally are validated against a strict allowlist pattern
- No user input is ever passed to shell commands

### Process Isolation
- All spawned processes use `detached: true` and `stdio: 'ignore'`
- Process groups are properly terminated on cleanup

### Temporary Files
- Created in secure temp directories with random names
- Permissions set to owner-only (0700)
- Automatically cleaned up on exit

### Root Detection
- Warns users if running with root/administrator privileges
- The application does not require or benefit from elevated privileges

## Dependencies

The application uses the following npm dependencies:
- `commander` - CLI argument parsing
- `chalk` - Terminal colors
- `ora` - Terminal spinners
- `cli-progress` - Progress bars
- `@inquirer/prompts` - Interactive prompts
- `playwright` - Browser automation

All dependencies are from well-known, widely-used packages.

## Reporting Security Issues

If you discover a security vulnerability, please report it by:
1. Opening a GitHub issue (for non-sensitive issues)
2. Contacting the maintainers directly (for sensitive issues)

## Best Practices for Users

1. **Don't run as root** - The application will warn you, but there's no reason to run with elevated privileges
2. **Review the source** - The code is open source and can be audited
3. **Keep dependencies updated** - Run `npm audit` periodically
