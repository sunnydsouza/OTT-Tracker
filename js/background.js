const dateMap = {};
const hourMap = {};
const hourlyWindowMap = {};
const windowStatsMap = {};
const defaultSyncApiTime = 900;
const defaultMonitorTime = 30;

function findAudioTabs() {
  chrome.tabs.query({ audible: !0 }, function (tabs) {
    tabs.forEach((element) => {
      let eventDateTime = new Date().toLocaleString();
      const eventDate = eventDateTime.substring(0, 10);
      const hour = eventDateTime.substring(12, 14);
      const windowTitle = element.title;
      console.log(
        "Processing for tab ->" +
          windowTitle +
          " -> eventDate:" +
          eventDate +
          ", hour:" +
          hour
      );

      if (!(windowTitle in getHourlyWindow(hour))) {
        windowStatsMap[windowTitle] = []; //reset for the hour
      }
      getWindowExistingStats(windowTitle).push(eventDateTime);
      getHourlyWindow(hour)[windowTitle] = getWindowExistingStats(windowTitle);
      //   getHour(hour)[hour] = getHourlyWindow(hour);
      getDate(eventDate)[eventDate] = hourlyWindowMap;

      console.log(
        "current value of dateMap is:" + JSON.stringify(getDate(eventDate))
      );
    });
  });
}

const getDate = (date) => {
  if (!(date in dateMap)) dateMap[date] = {};

  return dateMap[date];
};

const getHour = (hour) => {
  if (!(hour in hourMap)) hourMap[hour] = {};
  return hourMap[hour];
};
const getHourlyWindow = (hour) => {
  if (!(hour in hourlyWindowMap)) hourlyWindowMap[hour] = {};
  return hourlyWindowMap[hour];
};
const getWindowExistingStats = (window) => {
  if (!(window in windowStatsMap)) {
    windowStatsMap[window] = [];
  }
  return windowStatsMap[window];
};

//Get settings from storage
function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      {
        syncTime: defaultSyncApiTime,
        monitorTime: defaultMonitorTime,
        useApiEndpoint: false,
        apiEndpoint: "",
      },
      function (items) {
        return resolve(JSON.parse(JSON.stringify(items)));
      }
    );
  });
}

function getCurrentStorageValue() {
  chrome.storage.local.get(["hourlyStats"], function (items) {
    var result = JSON.stringify(items);
    // console.log("Storage results:" + result);
  });
}

function setChromeStorgeValue() {
  chrome.storage.local.set({ hourlyStats: dateMap }, function () {
    // console.log("Set Storage Value: 'hourlyStats' is set to \n" + dateMap);
  });
}

/**
 * Loop and keep polling for the presence of audio tabs
 */
var pollAudioTabs = function () {
  const settings = getSettings().then(function (settings) {
    console.log("Settings:" + JSON.stringify(settings));
    findAudioTabs();
    setChromeStorgeValue();
    getCurrentStorageValue();
    let timeout = setTimeout(pollAudioTabs, settings.monitorTime * 1000);
  });
};

/**
 * Initial function to start the background polling of audio tabs
 */
var initialPollAudioTabs = setTimeout(pollAudioTabs, defaultSyncApiTime);

/**
 * Helper function to send out post request to api endpoint
 * @param {string} url
 * @param {} data
 * @returns
 */
async function postData(url = "", data = {}) {
  // Default options are marked with *
  const response = await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    mode: "cors", // no-cors, *cors, same-origin
    cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
    credentials: "same-origin", // include, *same-origin, omit
    headers: {
      "Content-Type": "application/json",
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    redirect: "follow", // manual, *follow, error
    referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    body: JSON.stringify(data), // body data type must match "Content-Type" header
  });
  return response.json(); // parses JSON response into native JavaScript objects
}

/**
 * Helper function that checks if sync is enabled and if yes, send a post request to the API endpoint
 * @param {boolean} useEndpoint
 * @param {string} endpoint
 */
function syncToApi(useEndpoint, endpoint) {
  // console.log(JSON.stringify(dateMap));

  if (useEndpoint) {
    if (endpoint.trim() != "") {
      postData(endpoint, {
        tracker: dateMap,
      }).then((data) => {
        console.log(data); // JSON data parsed by `data.json()` call
      });
    } else {
      console.log("There is no api endpoint to sync!");
    }
  } else {
    console.log("Sync to API is disabled! Hence nothing to sync!");
  }
}

/**
 * Loop and post data to the API endpoint
 */
var pollSyncApi = function () {
  const settings = getSettings().then(function (settings) {
    console.log("Settings:" + JSON.stringify(settings));
    syncToApi(settings.useApiEndpoint, settings.apiEndpoint);
    let timeout = setTimeout(pollSyncApi, settings.syncTime * 1000);
  });
};

/**
 * initial sync to the API endpoint
 */
var initialPollSyncApi = setTimeout(pollSyncApi, defaultSyncApiTime);

/**
 * #######  Below code is to restrict from the chrome background service worker from going inactive #######
 */

let lifeline;

keepAlive();

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepAlive") {
    lifeline = port;
    setTimeout(keepAliveForced, 295e3); // 5 minutes minus 5 seconds
    port.onDisconnect.addListener(keepAliveForced);
  }
});

function keepAliveForced() {
  lifeline?.disconnect();
  lifeline = null;
  keepAlive();
}

async function keepAlive() {
  if (lifeline) return;
  for (const tab of await chrome.tabs.query({ url: "*://*/*" })) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => chrome.runtime.connect({ name: "keepAlive" }),
        // `function` will become `func` in Chrome 93+
      });
      chrome.tabs.onUpdated.removeListener(retryOnTabUpdate);
      return;
    } catch (e) {}
  }
  chrome.tabs.onUpdated.addListener(retryOnTabUpdate);
}

async function retryOnTabUpdate(tabId, info, tab) {
  if (info.url && /^(file|https?):/.test(info.url)) {
    keepAlive();
  }
}
