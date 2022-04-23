fetch("../README.md")
  .then((response) => response.text())
  .then((data) => {
    // Do something with your data
    console.log(data);
  });

const dateMap = new Map();
const hourMap = new Map();
const hourlyWindowMap = new Map();
const windowStatsMap = new Map();

function findAudioTabs() {
  chrome.tabs.query({ audible: !0 }, function (tabs) {
    tabs.forEach((element) => {
      let eventDateTime = new Date().toLocaleString();
      const eventDate = eventDateTime.substr(0, 10);
      const hour = eventDateTime.substr(12, 2);
      const windowTitle = element.title;
      console.log(
        "Processing for tab ->" +
          windowTitle +
          "eventDate:" +
          eventDate +
          " hour:" +
          hour
      );
      getWindowExistingStats(windowTitle).push(eventDateTime);

      getHourlyWindow(hour)[windowTitle] = getWindowExistingStats(windowTitle);
      getHour(hour)[hour] = getHourlyWindow(hour);
      getDate(eventDate)[eventDate] = getHour(hour);

      //   console.log(
      //     "current value of windowStatsMap is:" +
      //       JSON.stringify(getWindowExistingStats(windowTitle))
      //   );
      //   console.log(
      //     "current value of hourMap is:" + JSON.stringify(getHour(hour))
      //   );
      console.log(
        "current value of dateMap is:" + JSON.stringify(getDate(eventDate))
      );

      //   console.log(
      //     eventDateTime + " => " + element.url + " => " + element.title
      //   );
      //   chrome.storage.sync.set({ hourlyStats: eventDateTime }, function () {
      //     console.log("Value is set to " + eventDateTime);
      //   });

      //   chrome.storage.sync.get(['key'], function(result) {
      //     console.log('Value currently is ' + result.key);
      //   });
    });
    // var url = tabs[0].url;
    // console.log(url);
  });
}

// const getDate = (date) => dateMap.get(date) || dateMap.get("new");
// const getHour = (hour) => hourMap.get(hour) || hourMap.get("new");
// const getHourlyWindow = (hour) =>
//   hourlyWindowMap.get(hour) || hourlyWindowMap.get("new");
const getDate = (date) => {
  if (!dateMap.has(date)) dateMap.set(date, {});

  return dateMap.get(date);
};
const getHour = (hour) => {
  if (!hourMap.has(hour)) hourMap.set(hour, {});
  return hourMap.get(hour);
};
const getHourlyWindow = (hour) => {
  if (!hourlyWindowMap.has(hour)) hourlyWindowMap.set(hour, {});
  return hourlyWindowMap.get(hour);
};
const getWindowExistingStats = (window) => {
  if (!windowStatsMap.has(window)) windowStatsMap.set(window, []);
  return windowStatsMap.get(window);
};

function getCurrentStorageValue() {
  chrome.storage.sync.get(null, function (items) {
    var result = JSON.stringify(items);
    console.log("Storage results:" + result);
  });
}

setInterval(function () {
  findAudioTabs();
  getCurrentStorageValue();
}, 60000);

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
  console.log(JSON.stringify(Object.fromEntries(dateMap)));
  console.log(
    "Outer value of dateMap for 22/04/2022:" +
      JSON.stringify(getDate("22/04/2022"))
  );
  postData("http://192.168.0.109:1880/answer", { answer: Object.fromEntries(dateMap) }).then(
    (data) => {
      console.log(data); // JSON data parsed by `data.json()` call
    }
  );
}, 900000);
// chrome.storage.local.get(null, function(items) { // null implies all items
//     // Convert object to a string.
//     var result = JSON.stringify(items);

//     // Save as file
//     var url = 'data:application/json;base64,' + btoa(result);
//     chrome.downloads.download({
//         url: url,
//         filename: 'filename_of_exported_file.json'
//     });
// });

//  logFile = path.join(userhome('.active-win-log'), 'test234.json')
// async function getLogFileData() {
//     const logFile = await readFileAsync(logFile);
//     return JSON.parse(logFile);
//   };

//   async function setLogFileData(jsObj) {
//     await writeFileAsync(logFile, JSON.stringify(jsObj, null, '\t'));
//   }
// $(document).ready(findAudioTabs);
// chrome.tabs.onUpdated.addListener(findAudioTabs);
// chrome.tabs.onCreated.addListener(findAudioTabs);
// chrome.tabs.query(
//     {
//       audible: !0,
//     },
//     a => {
//         a.sort((c, a) => a.id - c.id), document.querySelector(".tabs__title").textContent = 0 < a.length ? "Tabs playing audio right now" : "No tabs playing audio right now", a.forEach(a => {
//             const b = document.getElementById("template-tab")
//                 .content;
//             b.querySelector(".tab")
//                 .dataset.tabId = a.id, b.querySelector(".tab__icon-image")
//                 .src = a.favIconUrl, b.querySelector(".tab__title")
//                 .textContent = a.title, document.querySelector(".tabs__list").appendChild(document.importNode(b, !0))
//         })
//     });


let lifeline;

keepAlive();

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepAlive') {
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
  for (const tab of await chrome.tabs.query({ url: '*://*/*' })) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: () => chrome.runtime.connect({ name: 'keepAlive' }),
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