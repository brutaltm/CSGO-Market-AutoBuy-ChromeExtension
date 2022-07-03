let delay = document.getElementById("listingsRefreshDelay");
delay.value = chrome.storage.sync.get(["listingsRefreshDelay"], res => delay.value = res["listingsRefreshDelay"]);
delay.onchange = function() { chrome.storage.sync.set({ "listingsRefreshDelay": delay.value }); }