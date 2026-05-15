# TaskNote

TaskNote is a sleek, modern desktop application built with Electron for managing your tasks and notes efficiently. It features a sticky widget for quick access and a comprehensive dashboard for detailed organization.

## 🚀 Features

- **Dual Interface**: 
  - **Sticky Widget**: A compact, frameless window that stays on top for quick task tracking and note-taking.
  - **Main Dashboard**: A full-featured workspace to manage your schedule and detailed notes.
- **Advanced Task Management**:
  - Set precise custom reminders or relative ones (days, hours, minutes before expiry).
  - Sort tasks by expiry date, time added, or alphabetically.
- **Notes System**:
  - Quick note-taking with a clean editor.
  - Organization with multiple sorting options.
- **Personalization**:
  - Dark, Light, and System theme support.
  - "Pin to Top" functionality for the widget.
  - Auto-launch on system startup.
- **System Integration**:
  - Minimizes to the system tray for background operation.
  - Native desktop notifications for task reminders.

## 🛠️ Technology Stack

- **Framework**: Electron
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Logic**: Node.js
- **Storage**: Local JSON-based persistent storage

## 📦 Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v16.x or higher recommended)
- [npm](https://www.npmjs.com/)

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/rasindugimhan/TaskNote.git
   cd TaskNote
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

### Building for Windows

To generate a portable executable or installer:
```bash
npm run dist
```

## 📄 License

This project is licensed under the ISC License.
