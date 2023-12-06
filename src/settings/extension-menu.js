import LayoutSection from "./components/LayoutSection.js";
import InputToggle from "./components/InputToggle.js";
import InputNewlineList from "./components/InputNewlineList.js";
import settings from "./settings.js";


(async function () {

  /* Add listeners to settings */
  const settingElements = document.querySelectorAll('layout-section > *:not(layout-section)');
  const bindings = Array.prototype.map.call(settingElements, (setting) => {
    const attribute = setting.getAttribute('setting');
    const disabledAttribute = setting.getAttribute('disable');
    const set = setting.bind((value) => {
      if (settings[attribute] === value) { return; }
      settings[attribute] = value;
    });

    return () => {
      const disabled = disabledAttribute ? settings[disabledAttribute] : false;
      set(settings[attribute], disabled);
    }
  });

  bindings.forEach((binding) => binding(settings));
  browser.storage.onChanged.addListener(async () => {
    bindings.forEach((binding) => binding());
  });
}());
