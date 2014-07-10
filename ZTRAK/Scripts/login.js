/// <reference path="jquery-2.1.0.js" />

$(document).ready(function () {

    // Login 
    //
    // iOSNavBarInputfix();
    CheckLogin();

    
});



function CheckLogin()
{

    // Detect Local Credentials and check expiration date
    //
    var userExpDate = localStorage.getItem('exp');

    // Block the UI whikle the checkup takes place
    //
    var blockUI = $('#loginForm');
    var StatusMsg = $('#loginStatus');

    // Hide the login buttons while checking
    //
    StatusMsg.text("Authentication in progress...").addClass("blink-now");
    
    blockUI.animate({
        opacity: 1,
        left: "+=50",
        height: "toggle"
    }, 1000, function () {

        // Animation complete.
        //
        console.log("Login Check started");
    });

    // Call the server
    ///
    $.ajax({
        url: '/Pickup/Decode',
        type: 'GET',
        data: { cypher: userExpDate },

        success: function (result) {

            // Get the decrypted value
            //
            userExpDate = new Date(result.answer);

        },
        complete: function () {
            ///
            // If the Date is Valid - meaning not in the past than proceed
            //
            var now = new Date();
            if (userExpDate > now) {

                // selected date is in the future so proceed
                var userName = localStorage.getItem('name');
                var code = localStorage.getItem('code');


                // Send the data and authenticate automatically
                // Call the server
                //
                $.ajax({
                    url: '/Account/iosLogin',
                    type: 'GET',
                    cache: 'false',
                    data: { userOBJ: userName + ':' + code },

                    success: function (result) {

                        // If succesful than go to pickups
                        //
                        if (result.answer == "Succes") {
                            // Goto Pickups
                            document.location.href = '/Pickup';

                        }

                    },
                    complete: function () {



                    },
                    error: function () {

                        // Credential expired
                        blockUI.animate({
                            opacity: 1,
                            left: "+=50",
                            height: "toggle"
                        }, 500, function () {

                            // Animation complete.
                            //
                            StatusMsg.text("Login").removeClass("blink-now");
                            console.log("Login Expired.");
                        });


                    }

                });
            }
            else {

                // Credential expired
                blockUI.animate({
                    opacity: 1,
                    left: "+=50",
                    height: "toggle"
                }, 500, function () {

                    // Animation complete.
                    //
                    StatusMsg.text("Login").removeClass("blink-now");
                    console.log("Login Expired.");
                });


            }
        },
        error: function () {
            alert("error");
        }


    });


}


function iOSNavBarInputfix() {

    // Attach to each input element to prevent the NAVBAR from blocking data input
    // only on iOS devices
    //
    // Check version and iOS
    if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {

        console.log("iOS Device Detected. Activating Navigation Bar Fix.")

        //#region Attach to events to hide navbar

        // Select all active inputs
        $(document).on("blur", ".ios", function (event) {

            // show the Navigation bar if its hidden
            var displayValue = $('.navbar').css('display');
            if (displayValue === 'none') {
                $('.navbar').css('display', 'block');
            }
        });

        $(document).on("focus", ".ios", function (event) {

            // Hide the NavBar if its visible
            var displayValue = $('.navbar').css('display');
            if (displayValue != 'none') {
                $('.navbar').css('display', 'none');
            }
        });

    }
    else
    {
        // iOS not detected
        console.log("iOS Device NOT Detected. Will not apply Navigation Bar Fix.")

    }
}


//#region local storage functions

// localStorage detection
function supportsLocalStorage() {
    return typeof (Storage) !== 'undefined';
}

function logUserOut() {

    // Remove all User Info From Local storage
    //
    localStorage.removeItem('name');
    localStorage.removeItem('code');
    localStorage.removeItem('exp');

    document.getElementById('logoutForm').submit();


}

//#endregion