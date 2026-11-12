const host = 'relleu.ortogra.fi';
const website = 'a98eb37f-7201-4258-ba38-3fe42b6f7560';
const event = 'obre_galeria';

function allowed() {
  return location.protocol === 'https:' && location.hostname === host &&
    navigator.doNotTrack !== '1' && window.doNotTrack !== '1' && navigator.globalPrivacyControl !== true;
}

if (allowed()) {
  window.relleuBeforeSend = (type, payload) => {
    if (!allowed() || type !== 'event' || !payload || (payload.name && payload.name !== event)) return false;
    // Do not include the map location, selection, or URL parameters.
    return { website, hostname: host, title: 'Relleu Obert', url: '/', name: payload.name };
  };
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://maquestria.tail72bc84.ts.net:8443/script.js';
  script.dataset.websiteId = website;
  script.dataset.domains = host;
  script.dataset.excludeSearch = 'true';
  script.dataset.excludeHash = 'true';
  script.dataset.doNotTrack = 'true';
  script.dataset.beforeSend = 'relleuBeforeSend';
  document.head.append(script);

  document.querySelector('#projects-open')?.addEventListener('click', () => {
    if (!allowed()) return;
    try { window.umami?.track?.(event)?.catch?.(() => {}); } catch { /* Analytics is optional. */ }
  });
}
