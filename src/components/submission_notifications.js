(async function () {
  function setClass(add) {
    document.body.classList.toggle('ItakuEnhanced--muteSubmissions', !!add);
  }

  async function getSettings() {
    const settings = await browser.storage.sync.get();
    setClass(settings.__INLINE__mute_submission_notifs &&
             settings.fix_submission_notifs);
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
