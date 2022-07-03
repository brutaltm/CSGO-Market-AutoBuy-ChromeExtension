window.postMessage({ 
    type: "FROM_PAGE",
    transactionData: {
        sessionid: g_sessionID, 
        currency: g_rgWalletInfo['wallet_currency'],
        first_name: $J('#first_name_buynow') ? $J('#first_name_buynow').val() : '',
        last_name: $J('#last_name_buynow') ? $J('#last_name_buynow').val() : '',
        billing_address: $J('#billing_address_buynow') ? $J('#billing_address_buynow').val() : '',
        billing_address_two: $J('#billing_address_two_buynow') ? $J('#billing_address_two_buynow').val() : '',
        billing_country: $J('#billing_country_buynow') ? $J('#billing_country_buynow').val() : '',
        billing_city: $J('#billing_city_buynow') ? $J('#billing_city_buynow').val() : '',
        billing_state: g_bHasBillingStates ? ( $J('#billing_state_select_buynow') ? $J('#billing_state_select_buynow').val() : '' ) : '',
        billing_postal_code: $J('#billing_postal_code_buynow') ? $J('#billing_postal_code_buynow').val() : '',
        save_my_address: $J('#save_my_address_buynow') ? +$J('#save_my_address_buynow').prop('checked') : +false
    }
})