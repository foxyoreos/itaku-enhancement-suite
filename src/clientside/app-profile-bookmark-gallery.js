(function () {
  'use strict';

  const self = document.querySelector('script[data-key="app-profile-bookmark-gallery.js"]');
  const showUnlistedBookmarks = self.getAttribute('data-show_unlisted_bookmarks') == "true";


  const AppProfileBookmarkGalleryParent = customElements.get('app-profile-bookmark-gallery') || HTMLElement;
  class AppProfileBookmarkGallery extends AppProfileBookmarkGalleryParent {
    constructor () {
      super();
      this.__ItakuES__ = {};
    }

    connectedCallback() {
      const self = this.__ItakuES__;
      self.galleryParentComponent = this.__ngContext__[8];
      self.galleryComponent = self.galleryParentComponent.components[0];
      if (!self.galleryComponent) {
        return;
      }

      if (showUnlistedBookmarks) {
        self.galleryComponent.visibilityFilter =
          `visibility=PUBLIC&visibility=PROFILE_ONLY&visibility=UNLISTED`;
      }
    }
  }

  customElements.define('app-profile-bookmark-gallery', AppProfileBookmarkGallery);
})();
