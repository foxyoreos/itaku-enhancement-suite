(async function () {
  function setClass(add) {
    document.body.classList.toggle('ItakuEnhanced--fullScreenPreviews', !!add);
  }

  async function getSettings() {
    const settings = await browser.storage.sync.get('use_enhanced_previews');
    setClass(settings.use_enhanced_previews);
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
