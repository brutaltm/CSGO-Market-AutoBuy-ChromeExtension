chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({"listingsRefreshDelay": 2000});
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    fetch(`https://api.csgofloat.com/?url=${message.inspectLink}`)
    .then(resp => resp.json()).then(json => {
        sendResponse(json.iteminfo);
    });
    
    return true;
});

