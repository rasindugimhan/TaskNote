const electronInstaller = require('electron-winstaller');
const path = require('path');

async function build() {
  console.log('Building installer...');
  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, 'build_dist', 'TaskNoteApp-win32-x64'),
      outputDirectory: path.join(__dirname, 'installer'),
      authors: 'Rasin',
      exe: 'TaskNoteApp.exe',
      setupIcon: path.join(__dirname, 'n.ico'),
      noMsi: true
    });
    console.log('Installer built successfully!');
  } catch (e) {
    console.log(`Error building installer: ${e.message}`);
  }
}
build();
