(async function () {
  function setClass(add) {
    document.body.classList.toggle('ItakuEnhanced--stickyHeaders', !!add);
  }

  async function getSettings() {
    const settings = await browser.storage.sync.get('sticky_headers');
    setClass(settings.sticky_headers);
  }

  browser.storage.onChanged.addListener(() => {
    getSettings();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      getSettings();
    }
  });

  getSettings();
})();
