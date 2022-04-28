function saveOptions() {
    var syncTime = document.getElementById('sync_time').value;
    var monitorTime = document.getElementById('monitor_time').value;
    var useApiEndpoint = document.getElementById('use_api_endpoint').checked;
    var apiEndpoint = document.getElementById('api_endpoint').value;
    var manualDownloadData = document.getElementById('manual_download_data').value;

    chrome.storage.sync.set({
        syncTime: syncTime,
        monitorTime: monitorTime,
        useApiEndpoint: useApiEndpoint,
        apiEndpoint: apiEndpoint
    });
}

function restore_options() {
   
    chrome.storage.sync.get({
        syncTime: 900,
        monitorTime: 90,
        useApiEndpoint: false,
        apiEndpoint: ""

    }, function (items) {
        document.getElementById('sync_time').value = items.syncTime;
        document.getElementById('monitor_time').value = items.monitorTime;
        document.getElementById('use_api_endpoint').checked = items.useApiEndpoint;
        document.getElementById('api_endpoint').value = items.apiEndpoint;
        

        //Api endpoint sync
        // if (document.getElementById('use_api_endpoint').checked == false ) {
        //     document.getElementById('change_slack_status').disabled = true;   
        // }
    });
    //Set listeners

    document.getElementById('use_api_endpoint').addEventListener('change', function () {
        if (this.checked) {
            //validate the api endpoint cannot be empty
            document.getElementById('api_endpoint').setAttribute('required', 'required');
          

            document.getElementById('options').classList.add("was-validated");
        } else {
            document.getElementById('api_endpoint').value = "";
            document.getElementById('api_endpoint').removeAttribute('required');
            document.getElementById('options').classList.remove("was-validated");
        }
    });

    document.getElementById('sync_time').addEventListener('change', function () {
        if (this.value < 1 || this.value !="") {
            //validate the api endpoint cannot be empty
            document.getElementById('options').classList.add("was-validated");
        } else {
            document.getElementById('options').classList.remove("was-validated");
        }
    });

    document.getElementById('monitor_time').addEventListener('change', function () {
        if (this.value < 1 || this.value !="") {
            //validate the api endpoint cannot be empty
            document.getElementById('monitor_time').classList.add("was-validated");
        } else {
            document.getElementById('monitor_time').classList.remove("was-validated");
        }
    });

    
    
}


restore_options();
//save settings
var inputElements = document.getElementsByTagName("input");
for (i = 0; i < inputElements.length; i++) {
    inputElements[i].addEventListener("change", function(){
        console.log("Save options triggered")
        saveOptions();
    })
}