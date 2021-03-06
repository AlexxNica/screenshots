/* globals browser, communication, makeUuid, Raven, catcher, auth */

window.errorpopup = (function () {
  let exports = {};

  let messages = {
    REQUEST_ERROR: {
      title: browser.i18n.getMessage("requestErrorTitle"),
      info: browser.i18n.getMessage("requestErrorDetails")
    },
    CONNECTION_ERROR: {
      title: browser.i18n.getMessage("connectionErrorTitle"),
      info: browser.i18n.getMessage("connectionErrorDetails")
    },
    LOGIN_ERROR: {
      title: browser.i18n.getMessage("requestErrorTitle"),
      info: browser.i18n.getMessage("loginErrorDetails")
    },
    LOGIN_CONNECTION_ERROR: {
      title: browser.i18n.getMessage("connectionErrorTitle"),
      info: browser.i18n.getMessage("connectionErrorDetails")
    },
    UNSHOOTABLE_PAGE: {
      title: browser.i18n.getMessage("unshootablePageErrorTitle"),
      info: browser.i18n.getMessage("unshootablePageErrorDetails")
    },
    SHOT_PAGE: {
      title: browser.i18n.getMessage("selfScreenshotErrorTitle")
    },
    MY_SHOTS: {
      title: browser.i18n.getMessage("selfScreenshotErrorTitle")
    },
    generic: {
      title: browser.i18n.getMessage("genericErrorTitle"),
      info: browser.i18n.getMessage("genericErrorDetails"),
      showMessage: true
    }
  };

  communication.register("reportError", (sender, error) => {
    catcher.unhandled(error);
  });

  exports.showError = function (error) {
    let id = makeUuid();
    let popupMessage = error.popupMessage || "generic";
    if (! messages[popupMessage]) {
      popupMessage = "generic";
    }
    let title = messages[popupMessage].title;
    let message = messages[popupMessage].message || '';
    let showMessage = messages[popupMessage].showMessage;
    if (error.message && showMessage) {
      if (message) {
        message += "\n" + error.message;
      } else {
        message = error.message;
      }
    }
    browser.notifications.create(id, {
      type: "basic",
      // FIXME: need iconUrl for an image, see #2239
      title,
      message
    });
  };

  exports.reportError = function (e) {
    let dsn = auth.getSentryPublicDSN();
    if (! dsn) {
      console.warn("Error:", e);
      return;
    }
    if (! Raven.isSetup()) {
      Raven.config(dsn).install();
    }
    let exception = new Error(e.message);
    exception.stack = e.multilineStack || e.stack || undefined;
    let rest = {};
    for (let attr in e) {
      if (! ["name", "message", "stack", "multilineStack", "popupMessage", "version", "sentryPublicDSN", "help"].includes(attr)) {
        rest[attr] = e[attr];
      }
    }
    rest.stack = e.multilineStack || e.stack;
    Raven.captureException(exception, {
      logger: 'addon',
      tags: {version: e.version, category: e.popupMessage},
      message: exception.message,
      extra: rest
    });
  };

  catcher.registerHandler((errorObj) => {
    exports.showError(errorObj);
    if (! errorObj.noPopup) {
      exports.reportError(errorObj);
    }
  });

  return exports;
})();
