const dateMap = {};
const windowStatsMap = {};

/**
 * Find the tabs playing audio and create a map of the tabs and their details
 */
function findAudioTabs() {
  let eventDateTime = new Date().toLocaleString();
  const eventDate = eventDateTime.substring(0, 10);
  const hour = eventDateTime.substring(12, 14);
  chrome.tabs.query({ audible: !0 }, function (tabs) {
    tabs.forEach((element) => {
      const windowTitle = element.title;
      console.log(
        "Processing for tab ->" +
          windowTitle +
          " -> eventDate:" +
          eventDate +
          ", hour:" +
          hour
      );

      if (getWindowExistingStats(windowTitle).length == 0) {
        //If there is no window tracking for this window title
        getWindowExistingStats(windowTitle).push(getNewInterval(eventDateTime));
      } else if (
        getWindowExistingStats(windowTitle)[
          getWindowExistingStats(windowTitle).length - 1
        ].end_time != ""
      ) {
        //If there is an existing window tracking for this window title but if the last interval for this window title is closed, create a new interval
        getWindowExistingStats(windowTitle).push(getNewInterval(eventDateTime));
      }

      getDate(eventDate)[eventDate] = windowStatsMap;

      console.log(
        "current value of dateMap is:" + JSON.stringify(getDate2(eventDate))
      );
    });

    weedNoLongerPlayingTabs(eventDate, tabs);
  });
}

const getDate = (date) => {
  if (!(date in dateMap)) dateMap[date] = {};

  return dateMap[date];
};
const getWindowExistingStats = (window) => {
  if (!(window in windowStatsMap)) {
    windowStatsMap[window] = [];
  }
  return windowStatsMap[window];
};

/**
 * A new interval is created for each tab that is opened.
 * @param {String} eventDateTime The date the event occured. Ideally the current date/time
 * @returns
 */
function getNewInterval(eventDateTime) {
  const intervalMap = {};
  intervalMap["start_time"] = eventDateTime;
  intervalMap["end_time"] = "";
  return intervalMap;
}

/**
 * Get all the window titles for the current date
 * @param {String} eventDate The date the event occured. Ideally the current date/time
 * @returns
 */
function getAllWindowTitlesForDate(eventDate) {
  const windowTitles = Object.values(getDate(eventDate)).map((tabs) =>
    Object.keys(tabs)
  )[0]; //TODO need to check of a better way to achieve this
  return windowTitles;
}

/**
 * Get all the window details for the current date.
 * Ideally the same as {getAllWindowTitlesForDate} but this contains the window details
 * @param {String} eventDate The date the event occured. Ideally the current date/time
 * @returns
 */
function getWindowMapForDate(eventDate) {
  const windowMap = Object.values(getDate(eventDate)); //TODO need to check of a better way to achieve this
  return windowMap;
}

/**
 * Compares all the window titles for the current date and closes the window stats for any that are no longer active.
 * @param {String} eventDate The date the event occured. Ideally the current date/time
 * @param {tabs} currentActiveTabs The tabs that are currently active, passed from the callback from chrome.tabs.query
 */
function weedNoLongerPlayingTabs(eventDate, currentActiveTabs) {
  // Get all the window titles for the current date
  const currentActiveTabsTitles = currentActiveTabs.map((tab) => tab.title);

  // Check the difference between the current active tabs and the window titles for the current date
  console.log(getAllWindowTitlesForDate(eventDate));
  if (getAllWindowTitlesForDate(eventDate)!=undefined) {
    let noLongerPlayingTabs = getAllWindowTitlesForDate(eventDate).filter(
      (x) =>
        !currentActiveTabsTitles.includes(x) &&
        hasAnActiveWindowTracking(eventDate, x)
    );
    // let difference = currentActiveTabsTitles.filter(x => !getAllWindowTitlesForDate(eventDate).includes(x));

    console.log("Difference offset");
    console.log(noLongerPlayingTabs);

    //Close the window stats for any that are no longer active
    closeWindowIntervalForExistingTabs(noLongerPlayingTabs);
  } else {
    console.log("No window titles for this date. Nothing to weed out");
  }
}

/**
 * Close the window stats for any that are no longer active
 * i.e: if the intervalMap for the window has a start_time that is not empty but an end_time is empty
 * this will put the latest timestamp for the end_time for the window.(the interval is now closed!)
 * @param {Array<String>} noLongerPlayingTabs
 */
function closeWindowIntervalForExistingTabs(noLongerPlayingTabs) {
  noLongerPlayingTabs.forEach((tabTitle) => {
    console.log("Closing window stats for tab:" + tabTitle);
    getWindowExistingStats(tabTitle)[
      getWindowExistingStats(tabTitle).length - 1
    ].end_time = new Date().toLocaleString();
  });
}

/**
 * Checks if the window title has an active window tracking. i.e: if the intervalMap for the window has
 * a start_time that is not empty but an end_time is empty.(still running!)
 * @param {String} eventDate
 * @param {String} windowTitle
 * @returns
 */
function hasAnActiveWindowTracking(eventDate, windowTitle) {
  return (
    getWindowMapForDate(eventDate).filter((windowMap) => {
      if (
        windowMap[windowTitle][windowMap[windowTitle].length - 1].end_time == ""
      ) {
        console.log(
          "there is an active window session for this window title:" +
            windowTitle
        );
        return true;
      }
    }).length > 0
  );
}

//Get settings from storage
function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(
      {
        syncTime: 900,
        monitorTime: 90,
        useApiEndpoint: false,
        apiEndpoint: "",
      },
      function (items) {
        settings = JSON.parse(JSON.stringify(items));
        return resolve(settings);
      }
    );
  });
}

var settings = getSettings();

function getCurrentStorageValue() {
  chrome.storage.sync.get(["hourlyStats"], function (items) {
    var result = JSON.stringify(items);
    console.log("Storage results:" + result);
  });
}

function setChromeStorgeValue() {
  chrome.storage.sync.set({ hourlyStats: dateMap }, function () {
    console.log("Set Storage Value: 'hourlyStats' is set to \n" + dateMap);
  });
}

setInterval(function () {
  settings = getSettings(); //refresh the settings, on the go
  console.log(settings);
  findAudioTabs();
  setChromeStorgeValue();
  getCurrentStorageValue();
}, 5000);

// setInterval(function () {
//     saveToDisk();
//   }, 10000);
function saveToDisk() {
  chrome.storage.local.get(null, function (items) {
    // null implies all items
    // Convert object to a string.
    var result = JSON.stringify(items);

    // Save as file
    var url = "data:application/json;base64," + btoa(result);
    chrome.downloads.download({
      url: url,
      filename: "filename_of_exported_file.json",
    });
  });
}

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

setInterval(function () {
  console.log(JSON.stringify(dateMap));

  postData("http://192.168.0.109:1880/answer", {
    answer: dateMap,
  }).then((data) => {
    console.log(data); // JSON data parsed by `data.json()` call
  });
}, 900000);

//  #######  Below code is to restrict from the chrome background service worker from going inactive #######
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
