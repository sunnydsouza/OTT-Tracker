function saveOptions() {
  var syncTime = document.getElementById("sync_time").value;
  var monitorTime = document.getElementById("monitor_time").value;
  var useApiEndpoint = document.getElementById("use_api_endpoint").checked;
  var apiEndpoint = document.getElementById("api_endpoint").value;

  chrome.storage.sync.set({
    syncTime: syncTime,
    monitorTime: monitorTime,
    useApiEndpoint: useApiEndpoint,
    apiEndpoint: apiEndpoint,
  });
}

function restore_options() {
  chrome.storage.sync.get(
    {
      syncTime: 900,
      monitorTime: 30,
      useApiEndpoint: false,
      apiEndpoint: "",
    },
    function (items) {
      document.getElementById("sync_time").value = items.syncTime;
      document.getElementById("monitor_time").value = items.monitorTime;
      document.getElementById("use_api_endpoint").checked =
        items.useApiEndpoint;
      document.getElementById("api_endpoint").value = items.apiEndpoint;
    }
  );
  //Set listeners

  document
    .getElementById("use_api_endpoint")
    .addEventListener("change", function () {
      if (this.checked) {
        //validate the api endpoint cannot be empty
        document
          .getElementById("api_endpoint")
          .setAttribute("required", "required");

        document.getElementById("options").classList.add("was-validated");
      } else {
        document.getElementById("api_endpoint").value = "";
        document.getElementById("api_endpoint").removeAttribute("required");
        document.getElementById("options").classList.remove("was-validated");
      }
    });

  document.getElementById("sync_time").addEventListener("change", function () {
    if (this.value < 1) {
      document.getElementById("sync_time").value = 900;
      document.getElementById("options").classList.add("was-validated");
    } else {
      document.getElementById("options").classList.remove("was-validated");
    }
  });

  document
    .getElementById("monitor_time")
    .addEventListener("change", function () {
      if (this.value < 1) {
        document.getElementById("monitor_time").value = 60;
        document.getElementById("monitor_time").classList.add("was-validated");
      } else {
        document
          .getElementById("monitor_time")
          .classList.remove("was-validated");
      }
    });

  document
    .getElementById("manual_download_data")
    .addEventListener("click", function () {
      saveToDisk();
    });
}

restore_options();
//save settings
var inputElements = document.getElementsByTagName("input");
for (i = 0; i < inputElements.length; i++) {
  inputElements[i].addEventListener("change", function () {
    console.log("Save options triggered");
    saveOptions();
  });
}

//Ability to download json
function saveToDisk() {
  chrome.storage.local.get(["hourlyStats"], function (items) {
    // null implies all items
    // Convert object to a string.
    let result = JSON.stringify(items);
    let eventDateTime = new Date()
      .toLocaleString()
      .substring(0, 10)
      .replaceAll("/", "_");
    console.log(eventDateTime);
    // Save as file
    var url =
      "data:application/json;base64," +
      btoa(unescape(encodeURIComponent(result)));

    chrome.downloads.download({
      url: url,
      filename: "OTT_Tracker_" + eventDateTime + ".json",
    });
  });
}
