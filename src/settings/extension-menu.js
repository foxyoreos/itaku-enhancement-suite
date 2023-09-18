import LayoutSection from "./components/LayoutSection.js";
import InputToggle from "./components/InputToggle.js";
import InputNewlineList from "./components/InputNewlineList.js";


(async function () {

  /* Load */
  const settings = await browser.storage.sync.get();
  settings.positive_regexes = settings.positive_regexes || [];
  settings.negative_regexes = settings.negative_regexes || [];

  /* Add listeners to settings */
  const settingElements = document.querySelectorAll('layout-section > *');
  const bindings = Array.prototype.map.call(settingElements, (setting) => {
    const attribute = setting.getAttribute('setting');
    const set = setting.bind((value) => {
      if (settings[attribute] === value) { return; }

      settings[attribute] = value;
      browser.storage.sync.set(settings);
    });

    return () => { set(settings[attribute]); }
  });

  bindings.forEach((binding) => binding());
  browser.storage.onChanged.addListener(() => {
    bindings.forEach((binding) => binding());
  });

}());
