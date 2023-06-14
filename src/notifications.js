
/* DOM manipulation. */
function extendNotifications (notifications) {
  const targets = notifications.querySelectorAll('a.notif-wrapper');
  targets.forEach((target) => {
    const label = target.querySelector('.mat-hint');
    label.innerText = label.innerText + ': Replaced description via extension.';
  });
}


/* Actual notifications observation logic. */
let notifications;
const notificationsObserver = new MutationObserver((list, observer) => {

  /* handle mutations */
  extendNotifications(notifications);
  console.log('triggered');
});


/* Parent logic to avoid slowing down the page. */
let popup;
const parentObserver = new MutationObserver((list, observer) => {

  /* If anything has changed, disconnect the existing observer */
  const search = popup.querySelector('app-notifications .notification-menu');
  if (search != notifications) { /* Hidden */
    notificationsObserver.disconnect();
  }

  /* And reconnect (if the panel is ready to be connected) */
  if (search) {
    notifications = search;
    notificationsObserver.observe(notifications, { childList: true });
    extendNotifications(notifications); /* And run the initial replacement. */
  }
});

/* Wait for the entire app to load before we start attaching
 * scripts to things. */
const appObserver = new MutationObserver(() => {
  popup = document.querySelector('.cdk-overlay-container');
  if (!popup) { return; }

  parentObserver.observe(popup, { childList: true });
  appObserver.disconnect();
});
appObserver.observe(document.body, { childList: true });
