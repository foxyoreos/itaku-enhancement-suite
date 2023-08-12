(async function () {
  function setClass(add) {
    document.body.classList.toggle('ItakuEnhanced--hideFollowerCounts', !!add);
  }

  async function getSettings() {
    const settings = await browser.storage.sync.get('hide_follower_counts');
    setClass(settings.hide_follower_counts);
  }

  browser.runtime.onMessage.addListener((data, response) => {
    if (data.type !== 'settings_update') { return; }
    if (data.content.hide_follower_counts == null) { return; }

    setClass(data.content.hide_follower_counts);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      getSettings();
    }
  });

  getSettings();
})();
