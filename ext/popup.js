async function run(mode) {
  const msg = document.getElementById('msg');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', files: ['capture.js'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: (m) => { window.__dcRun(m); }, args: [mode] });
    if (mode === 'pick') window.close(); else msg.textContent = 'Capturing… the .md file will download shortly.';
  } catch (e) { msg.textContent = 'Cannot run on this page: ' + e.message; }
}
document.getElementById('page').onclick = () => run('page');
document.getElementById('pick').onclick = () => run('pick');
