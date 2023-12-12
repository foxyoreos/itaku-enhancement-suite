(function () {
  'use strict';

  const self = document.querySelector('script[data-key="notification-fixes.js"]');
  const runFix = self.getAttribute('data-fix_submission_notifs') == "true";

  const AppHeaderParent = customElements.get('app-header') || HTMLElement;
  class AppHeader extends AppHeaderParent {
    constructor() {
      super();
      this.__ItakuES__ = {};
    }

    connectedCallback() {
      const self = this.__ItakuES__;
      if (!runFix) { return; }
      self.navElement = this.children[0];
      self.navComponent = self.navElement.__ngContext__[8];

      self.navComponent.updateTitle = function () {
        const unreadSubmissions = this.userMeta?.mute_submission_notifs ? 0 : this.numUnreadSubmissions;
        this.siteMetaService.setNotificationCount(
          this.numUnreadNotifications + this.numUnreadMessages + this.numUnreadJoinCommRequests + this.numUnresolvedTagSuggestions + unreadSubmissions);
      };

      self.navComponent.updateTitle();
    }
  }

  customElements.define('app-header', AppHeader);
})();
