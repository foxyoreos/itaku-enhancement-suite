import LayoutSection from "./components/LayoutSection.js";
import InputToggle from "./components/InputToggle.js";
import InputNewlineList from "./components/InputNewlineList.js";


(async function () {

  /* Load */
  console.log('what is happening here: ');
  const settings = await browser.storage.sync.get();
  console.log(settings);
  settings.positive_regexes = settings.positive_regexes || [];
  settings.negative_regexes = settings.negative_regexes || [];


  /* Add listeners to settings */
  const settingElements = document.querySelectorAll('layout-section > *');
  settingElements.forEach((setting) => {
    const attribute = setting.getAttribute('setting');
    const set = setting.bind((value) => {
      settings[attribute] = value;

      /* We can actually just set this directly now :3 */
      console.log('setting: ', attribute, value);
      browser.storage.sync.set(settings);
    });

    console.log(attribute, settings[attribute])
    set(settings[attribute]);
  });

}());
