console.log("Script executed.");
let listings = {}, listingsCount = 100, maxPrice = 10, minFloat = 0.00, maxFloat = 0.12, bought = false;
let buyQueue = [], compare = (prev,curr) => listings[curr].price < listings[prev].price ? curr : prev;
let interval = 1000, lastModifiedDate = new Date(0), refresh = refreshListingsV2;
addExtensionDiv();
injectScript();

function refreshListings(queue = []) {
    console.log("Refreshing listings...");
    return new Promise(resolve => {
        let modifiedDate;
        fetch(`${window.location.href}/render/?${searchParams}`,{cache: "no-cache"})
        .then(resp => {
            modifiedDate = new Date(resp.headers.get('Last-Modified'));
            if (modifiedDate > lastModifiedDate) {
                lastModifiedDate = modifiedDate
                return resp.json();
            } else return null;
        }).then(json => {
            let promises = [];
            if (json) {
                for(const prop in json.listinginfo)
                    if (!listings[prop] && json.listinginfo[prop].converted_price+json.listinginfo[prop].converted_fee < maxPrice)
                        promises.push(getFloatInfo(prop,json.listinginfo[prop],queue).then(() => {
                            if (queue.length > 0) {
                                buyItemFromMarket(prop);
                                resolve(modifiedDate);
                            }
                        }));
            } 
            Promise.all(promises).then(() => resolve(modifiedDate));
        });
    });
}

function refreshListingsV2(queue = []) {
    console.log("Refreshing listings...");
    return new Promise(resolve => {
        let modifiedDate;
        fetch(`${window.location.href}/render/?${searchParams}`,{cache: "no-cache"})
        .then(resp => {
            modifiedDate = new Date(resp.headers.get('Last-Modified'));
            if (modifiedDate > lastModifiedDate) {
                lastModifiedDate = modifiedDate
                return resp.json();
            } else return null;
        }).then(json => {
            let promises = [];
            if (json) {
                for(const prop in json.listinginfo)
                    if (!listings[prop] && json.listinginfo[prop].converted_price+json.listinginfo[prop].converted_fee < maxPrice)
                        promises.push(getFloatInfo(prop,json.listinginfo[prop],queue));
            } 
            Promise.all(promises).then(val => buyItemFromMarketV2(queue)).then(() => resolve(modifiedDate));
        });
    });
}

function getFloatInfo(prop, steamInfo, queue) {
    return new Promise(resolve => {
        chrome.runtime.sendMessage({
            inspectLink: steamInfo.asset.market_actions[0].link.replace(/%listingid%|%assetid%/gi,m => m.charAt(1) == 'l' ? prop : steamInfo.asset.id)
        }, resp => {
            listings[prop] = { float: resp.floatvalue, price: steamInfo.converted_price, fee: steamInfo.converted_fee };
            if (resp.floatvalue > minFloat && resp.floatvalue < maxFloat)
                queue.push(prop);
            resolve();
        });
    });
}

async function startSearchLoop(queue = []) {
    let modifiedDate = await refresh(queue);
    if(bought) return;
    let timeToWait = modifiedDate.getTime() + 90000 - new Date().getTime();
    timeToWait = timeToWait > 0 ? timeToWait : interval;
    setTimeout(startSearchLoop,timeToWait);
}

async function startInterval() {
    minFloat = parseFloat(document.getElementById("minFloatInput").value);
    maxFloat = parseFloat(document.getElementById("maxFloatInput").value);
    maxPrice = 100*parseFloat(document.getElementById("maxPriceInput").value);
    interval = await new Promise(resolve => chrome.storage.sync.get(["listingsRefreshDelay"], res => resolve(res["listingsRefreshDelay"])));
    bought = false;

    document.getElementById("currSearch").innerHTML = `<span style="color: LightSeaGreen">Currently searching for '${document.querySelector('input[name="extWhichToBuy"]:checked').value}'</span>`

    if(document.querySelector('input[name="extWhichToBuy"]:checked').value == "first") {
        for(const prop in listings) {
            if (listings[prop].price+listings[prop].fee < maxPrice && listings[prop].float > minFloat && listings[prop].float < maxFloat)
                {buyItemFromMarket(prop); return;}
        }
        startSearchLoop(); return;
    }

    let queue = [];
    for(const prop in listings)
        if (listings[prop].price+listings[prop].fee < maxPrice && listings[prop].float > minFloat && listings[prop].float < maxFloat)
            queue.push(prop);

    startSearchLoop(queue);

}

function buyItemFromMarket(listingId) {
    if (bought) return;
    console.log(listings[listingId]);
    transactionData.subtotal = listings[listingId].price;
    transactionData.fee = listings[listingId].fee;
    transactionData.total = transactionData.subtotal + transactionData.fee;
    transactionData.quantity = 1;
    fetch(`https://steamcommunity.com/market/buylisting/${listingId}`,{
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/x-www-form-urlencoded; charset=UTF-8" },
        mode: "cors",
        body: new URLSearchParams(transactionData).toString()
    }).then(resp => {
        switch(resp.status) {
            case 200:
                document.getElementById("currSearch").innerHTML = `<span style="color: green">Successfully ordered an item.</span>`;
                break;
            case 502:
                document.getElementById("currSearch").innerHTML = `<span style="color: red">Error while processing purchase.</span>`; 
                break;
            default:
                document.getElementById("currSearch").innerHTML = `<span style="color: red">Unexpected error occurred.</span>`; 
                break;
        }
        console.log(resp);
    });
    clearInterval(loop); bought = true;
}

function buyItemFromMarketV2(queue) {
    if(queue.length == 0) return;
    buyItemFromMarket(queue.reduce(compare));
}

function addExtensionDiv() {
    var div = document.createElement("div"); div.id = "extDiv";
    div.style = "margin-top: 10px; background-color: rgba(0, 0, 0, 0.2); padding: 10px; display: flex; justify-content: center;";
    div.classList.add("market_dialog_content","market_dialog_content_darker")
    div.innerHTML = `
        <div style="width: fit-content; padding-left: 10px; padding-right: 10px">
            <div style="height: 20px; text-align: center">
                Float between
            </div>
            <div class="market_dialog_right_column">
                <input id="minFloatInput" type="text" class="text" value="${minFloat}" style="width: 50px; text-align: center !important;"/>
                 - 
                <input id="maxFloatInput" type="text" class="text" value="${maxFloat}" style="width: 50px; text-align: center !important;"/>
                <p id="currSearch" style="margin: 0; margin-top: 0px; position: absolute"></p>
            </div>
        </div>
        <div style="width: fit-content; padding-left: 10px; padding-right: 10px">
            <div style="height: 20px; text-align: center">
                Max price
            </div>
            <div class="market_dialog_right_column">
                <input id="maxPriceInput" type="text" class="text" value="${(maxPrice/100.0).toFixed(2)}" style="width: 100px; text-align: center !important;"/>
            </div>
        </div>
        <div style="width: fit-content; padding-left: 10px; padding-right: 10px">
            <input type="radio" id="radioGetCheapest" name="extWhichToBuy" value="cheapest" checked>
            <label for="radioGetCheapest">Cheapest</label><br>
            <input type="radio" id="radioGetLowestFloat" name="extWhichToBuy" value="lowFloat">
            <label for="radioGetLowestFloat">Lowest Float</label><br>
            <input type="radio" id="radioGetHighestFloat" name="extWhichToBuy" value="highFloat">
            <label for="radioGetHighestFloat">Highest Float</label><br>
            <input type="radio" id="radioGetFirst" name="extWhichToBuy" value="first">
            <label for="radioGetLowestFloat">First Found</label><br>
        </div>
        <div style="display: flex; align-items: center; width: fit-content; padding-left: 10px; padding-right: 10px; min-width: 135px">
            <a id="startExtButton" class="btn_green_white_innerfade btn_medium">
                <span>Start searching</span>
            </a>
        </div>
    `
    document.getElementById("searchResultsTable").insertBefore(div,document.getElementById("searchResultsRows"));
    document.getElementById("startExtButton").addEventListener("click", () => startInterval());
    document.getElementsByName("extWhichToBuy").forEach(r => {
        switch(r.id) {
            case "radioGetCheapest":
                r.addEventListener("click",() => compare = (prev,curr) => listings[curr].price < listings[prev].price ? curr : prev);
                break;
            case "radioGetLowestFloat":
                r.addEventListener("click",() => compare = (prev,curr) => listings[curr].float < listings[prev].float ? curr : prev);
                break;
            case "radioGetHighestFloat":
                r.addEventListener("click",() => compare = (prev,curr) => listings[curr].float > listings[prev].float ? curr : prev);
                break;
            default:
                r.addEventListener("click",() => refresh = refreshListings);
                return;
        }
        r.addEventListener("click",() => refresh = refreshListingsV2);
    });
}

function injectScript() {
    window.addEventListener("message", function(event) {
        if (event.data.type && event.data.type == "FROM_PAGE_EXT") {
            transactionData = event.data.transactionData;
            urlParams = event.data.urlParams;
            urlParams.count = listingsCount;
            searchParams = new URLSearchParams(urlParams).toString();
        }
    });

    var script = document.createElement('script');
    script.setAttribute('type','text/javascript');
    script.src = chrome.runtime.getURL('getVariables.js');
    script.onload = function() { this.remove() };
    document.body.appendChild(script);
}