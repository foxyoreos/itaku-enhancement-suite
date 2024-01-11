(async function () {
  const baseURL = '/IES'
  const scripts = [
    { name: 'search-fixes.js', settings: ['tag_search_copy_paste', 'tag_search_filter_duplicates'] },
    { name: 'notification-fixes.js', settings: ['fix_submission_notifs'] },
    { name: 'app-image-dialog.js', settings: ['highlight_tagMe'] },
  ];

  const settings = await browser.storage.sync.get();
  if (settings.disable_all_clientside) { /* Escape hatch in case of bugs */
    return;
  }

  scripts.forEach(async (script_meta) => {
    const script = script_meta.name;
    const dependencies = script_meta.settings;
    if (document.querySelector(`script[data-key="${script}"]`)) {
      return;
    }

    const text = await browser.runtime.sendMessage({
      type: 'get_script',
      content: { url: script }
    });

    const el = document.createElement('script');
    el.setAttribute('data-key', script);
    dependencies.forEach((dependency) => {
      el.setAttribute(`data-${dependency}`, settings[dependency]);
    });

    el.textContent = text.content;
    document.body.appendChild(el);
  });
}());
