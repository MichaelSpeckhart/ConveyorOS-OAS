# Setup Wizard & Settings Guide

## Overview

Your Tauri app now has a complete first-time setup wizard and settings management system that guides users through database configuration.

## What Was Added

### 1. Backend (Rust/Tauri Commands)

**New Tauri Commands** (`src-tauri/src/tauri_commands.rs`):
- `save_settings_tauri` - Save app settings to persistent storage
- `test_database_connection_tauri` - Test PostgreSQL connection before saving
- `get_current_settings_tauri` - Load current settings
- `check_setup_required_tauri` - Detect if first-time setup is needed

**Graceful Startup** (`src-tauri/src/lib.rs`):
- App no longer crashes if database connection fails
- Shows warning messages but allows app to start
- Users can configure settings through the UI

### 2. Frontend (React/TypeScript)

**Setup Wizard** (`src/components/SetupWizard.tsx`):
- 3-step guided setup process
- Step 1: Welcome and requirements
- Step 2: Database configuration with connection testing
- Step 3: OPC server configuration (optional)
- Beautiful, user-friendly UI

**Enhanced Settings Page** (`src/pages/pos/PosSettings.tsx`):
- Added "Test Connection" button to database section
- Real-time connection testing
- Success/error feedback

**Settings Library** (`src/lib/settings.tsx`):
- `testDatabaseConnection()` - Test DB connection
- `checkSetupRequired()` - Check if setup needed
- `getCurrentSettings()` - Get current settings

### 3. App Integration

**Main App** (`src/App.tsx`):
- Checks for setup requirement on startup
- Shows setup wizard if needed
- Prevents app access until setup is complete

## User Flow

### First-Time Setup

1. **User launches app for the first time**
   - App detects no settings or failed DB connection
   - Setup wizard appears automatically

2. **Step 1: Welcome**
   - Shows what's needed (PostgreSQL, credentials, etc.)
   - User clicks "Get Started"

3. **Step 2: Database Configuration**
   - User enters:
     - Host (e.g., localhost)
     - Port (default: 5432)
     - Database name
     - Username
     - Password
   - User clicks "Test Connection"
   - Success message appears if connection works
   - User clicks "Continue"

4. **Step 3: OPC Configuration** (Optional)
   - User can configure OPC server URL
   - User clicks "Complete Setup"
   - Settings are saved
   - App proceeds to login screen

### Subsequent Launches

- App checks if database connection works
- If successful, proceeds to login
- If failed, shows setup wizard again

### Changing Settings Later

Users can always access Settings from the sidebar:
- Click "Settings" in navigation
- Choose section: POS, Database, or OPC
- Modify values
- Test connection (for database)
- Click "Save Settings"

## For Windows Deployment

When you build for Windows (using GitHub Actions), the app will:

1. **Install the app** - User runs the MSI/NSIS installer
2. **First launch** - Setup wizard appears
3. **User configures**:
   - PostgreSQL connection (must be installed separately)
   - Database details
   - OPC server (if applicable)
4. **App creates tables** - Migrations run automatically on next restart
5. **Ready to use** - User can log in and use the app

## Prerequisites for End Users

Users must have:
1. **PostgreSQL installed and running**
   - Download from: https://www.postgresql.org/download/
2. **Database created** (empty database)
   ```sql
   CREATE DATABASE conveyor_app;
   CREATE USER postgres WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE conveyor_app TO postgres;
   ```
3. **Network access** - If database is on another machine

## Database Tables

The app will automatically create these tables on first successful connection:
- `users` - User authentication
- `customers` - Customer data
- `tickets` - Order tickets
- `garments` - Individual garments
- `slots` - Conveyor slots
- `sessions` - User sessions
- And more...

## Testing Locally

To test the setup wizard:

1. Delete existing settings:
   ```bash
   # On macOS:
   rm -rf ~/Library/Application\ Support/com.michaelspeckhart.conveyoros-oas/

   # On Windows:
   # Delete: %APPDATA%\com.michaelspeckhart.conveyoros-oas\
   ```

2. Run the app:
   ```bash
   npm run tauri dev
   ```

3. Setup wizard should appear

## Troubleshooting

**Setup wizard doesn't appear:**
- Check browser console for errors
- Verify `check_setup_required_tauri` command is working

**Database connection fails:**
- Verify PostgreSQL is running
- Check host, port, username, password
- Ensure database exists
- Check firewall settings

**App crashes on startup:**
- Check terminal/console for error messages
- Verify all Tauri commands are registered
- Check database URL format

## Building for Distribution

Use the GitHub Actions workflow:
```bash
git push origin main
```

Or build locally:
```bash
npm run tauri build
```

The built installer will include the setup wizard, so users can configure everything on first launch.
