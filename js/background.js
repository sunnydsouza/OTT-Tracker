const dateMap = {};
const hourMap = {};
const hourlyWindowMap = {};
const windowStatsMap = {};

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
