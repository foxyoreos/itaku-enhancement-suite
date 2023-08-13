(async function () {
  function setClass(add) {
    document.body.classList.toggle('ItakuEnhanced--hideFollowerCounts', !!add);
  }

  async function getSettings() {
    const settings = await browser.storage.sync.get('hide_follower_counts');
    setClass(settings.hide_follower_counts);
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
