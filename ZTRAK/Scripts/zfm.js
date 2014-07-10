/// <reference path="ion.sound.js" />
/// <reference path="jquery.signalR-2.0.2.js" />
/// <reference path="filesize.js" />
/// <reference path="knockout-3.0.0.js" />
/// <reference path="jquery.color-2.1.2.js" />
/// <reference path="jQueryRotate.js" />
/// <reference path="jquery-2.1.0-vsdoc.js" />

//#region Global Vars and Real Time Functions

// THESE TWO VARIABLES STORE THE TIME AND DATE WHEN THE PAGE IS LOADED
//
var startDate = new Date();
var startTime = startDate.getTime();
var iOSinit = false;
var currentPickupUpdated;  // Current Pickup updated 
var lastUpdateby; // Name of Current Pickup Updated - goes in hand with CurrentPickupUpdated
var lastUpdatedPickup; // The last pickup updated
var globaltotalPickups = 0;
var globalTotalItems = 0;
var gPickupsRendered = 0;
var webSpeed = "NA";
var webAppmode = "false";
var typeaheadSource = ['John', 'Alex', 'Terry'];
var globalCurrentUserPin;
var viewAllUpdates = true;
var audioALerts = true;
var globalDisplayMode; // edit or display - used to activate or disable data entry functions
var gViewmodelChanged = false;
var gRotation = 0;
var gviewMode = 'portrait';
var gPickupUpdateBackups = [];
var globalUpdateType = '';
var gDataRequest; // Check Ajax reques status for Pickups
var gFinishedRendering = false;
var gTotalPhotosSize = 0;
var gTotalPhotosLimit = 103809024; //99Mb
var gTotalNumberOfPhotos = 0;
var gPickupPhotoUpdate; // scroll to this pickup after photo transmissions
var map = null, infobox, dataLayer, customInfobox; // Map object
var locSearchResult; // Store the latest GPS found
var activePickups = null; // All Active Pickups


//#endregion

//#region Connect to SignalR Hub

// Connect 
//
var pickupChannel = $.connection.pickupHub;

// Connection Functions
//
$.connection.hub.start();
// $.connection.hub.start({ transport: 'longPolling' });

$.connection.hub.start().done(function () {

    // Udpate Connection Status - wait 5 seconds before calling
    //
    setTimeout(function () {

        // determine speed
        webConnType();

        // Join Group
        joinGroup();

    }, 5000);


    // Only when non web sockets
    if ($.connection.hub.transport.name !== "webSockets") {
        // Ping every 30s
        intervalHandle = setInterval(function () {

            // Get the User name requesting the ping
            //
            var userRname = $('#currentUserInfo').attr('data-fullname');

            // Ensure we're connected (don't want to be pinging in any other state).
            //
            if ($.connection.hub.state === $.signalR.connectionState.connected) {

                // Get a clean date
                var cleandate1 = moment(new Date()).format('l  LT');

                pickupChannel.server.ping(userRname).fail(function () {

                    // Failed to ping the server, we could either try one more time to ensure we can't reach the server
                    // or we could fail right here.

                    $('#webTransportType').text("NA").attr("title", "No Internet Connection Detected - Last Server Check: " + cleandate1);
                    $('#webTransportType').addClass("blink-now");
                    console.log("Pickup Hub Ping Failed at: " + new Date());

                }).done(function () {

                    $('#webTransportType').text("S4").attr("title", "Slow Internet Speed Detected - Last Server Check: " + cleandate1);
                    $('#webTransportType').removeClass("blink-now");
                    console.log("Pickup Hub Ping at: " + new Date());

                });
            }
            console.log("pickupChannel ping interval of 30 seconds started. ")

        }, 300000);
    }

    // Only when  web sockets
    if ($.connection.hub.transport.name == "webSockets") {
        // Ping every 10s
        intervalHandle = setInterval(function () {

            // Get the User name requesting the ping
            //
            var userRname = $('#currentUserInfo').attr('data-fullname');

            // Ensure we're connected (don't want to be pinging in any other state).
            //
            if ($.connection.hub.state === $.signalR.connectionState.connected) {

                // Get a clean date
                var cleandate1 = moment(new Date()).format('l  LT');

                pickupChannel.server.ping(userRname).fail(function () {

                    // Failed to ping the server, we could either try one more time to ensure we can't reach the server
                    // or we could fail right here.

                    $('#webTransportType').addClass("blink-now").css('color', 'red');
                    $('#webTransportType').text("NIC").attr("title", "No Internet Connection Detected - Last Server Check: " + cleandate1);
                    console.log("Pickup Hub Ping Failed at: " + new Date());

                }).done(function () {

                    $('#webTransportType').attr("data-content", "Slow Internet Speed Detected - Last Server Check: " + cleandate1);
                    $('#webstatNV').removeClass("blink-now");
                    console.log("Pickup Hub Last Ping completed at: " + new Date());

                });
            }
            console.log("Pickup Channel ping interval of 30 seconds started. ");

        }, 30000);
    }

    console.log("pickupChannel started. ");
});

$.connection.hub.disconnected(function () {

    // Clear the handle if it was ever used
    //
    if (typeof (intervalHandle) !== 'undefined') {

        // Get Rid of the Ping Interval
        //
        clearInterval(intervalHandle);

        // Alert
        // Get a clean date
        //
        var cleandate1 = moment(new Date()).format('l  LT');
        $('#webTransportType').addClass("blink-now").css('color', 'red');
        $('#webTransportType').text("NIC");
        $('#webspeedNB').attr("data-title", "No Internet Connection Detected - Last Server Check: " + cleandate1);
        console.log("Pickup Hub Disconnected at: " + new Date());

        // reconnect to hub
        setTimeout(function () {

            // Connect and update if successful
            $.connection.hub.start().done(function () {

                // Get a clean date
                var cleandate1 = moment(new Date()).format('l  LT');
                $('#webTransportType').removeClass("blink-now").css('color', 'darkblue');
                $('#webTransportType').text("IR");
                $('#webspeedNB').attr("data-title", "Internet Connection Restored at: " + cleandate1);
                console.log('Internet Reconnection successful at: ' + cleandate1);

                // Update pop overs
                //
                enablePopOvers();

                // get fresh data
                //
                getPickups();

            });
            console.log("Pickup Hub trying to reconnect at: " + new Date());

        }, 5000); // Restart connection after 5 seconds.


    }
});

$.connection.hub.reconnected(function () {

    // Get a clean date
    var cleandate1 = moment(new Date()).format('l  LT');
    $('#webTransportType').removeClass("blink-now").css('color', 'darkblue');
    $('#webTransportType').text("IR").attr("title", "Internet Connection Restored at: " + cleandate1);
    console.log('Internet Reconnection successful at: ' + cleandate1);

});

$.connection.hub.connectionSlow(function () {

    // Get a clean date
    var cleandate1 = moment(new Date()).format('l  LT');
    var webstatElem = $('#webTransportType');
    webstatElem.text("CS").attr("title", "We are currently experiencing difficulties with the connection - Last Server Check: " + cleandate1);
    console.log('We are currently experiencing difficulties with the connection.')

});

$.connection.hub.reconnecting(function () {

    console.log("Pickup Hub trying to reconnect at: " + new Date());

});


//#endregion

//#region Hub Client Functions

pickupChannel.client.webSpeed = function (speed) {

    // Set the Speed of the web
    //
    webSpeed = speed;

    // Report
    console.log("Web Speed Reported: " + webSpeed);

}

pickupChannel.client.newDataUpdate = function (updatedBy, updatedPickup) {

    // User is in the middle of creating or editing a pickup.  Do not move screen.
    if (globalDisplayMode === 'edit')
        return;

    // Get the User's full name in order to determine if an data update is required
    //
    var userFullName = $('#currentUserInfo').attr('data-fullname');

    // Call the Send method on the hub. 
    //
    pickupChannel.server.webTransport(userFullName);

    // Update even if its trhe same user logged in multiple systems
    // otherwise they will not have updated data

    // Show Stats
    console.debug("Server Data Updated by : " + updatedBy + " - Web transport: " + webSpeed + " - Server Update Needed.");
    
    // Update Model
    //
    getPickups();

    // Record who updated a pickup 
    //
    lastUpdateby = updatedBy;

    // Flash Updated Pickup
    markUpdatedPickup(updatedPickup, 'self_update');

};

pickupChannel.client.pickupRemoved = function (updatedBy, updatedPickup) {


    // Refresh Pickups
    getPickups();

    if (audioALerts === true) {
        $.ionSound.play("pickup_deleted");
    }

    // Give a 3 second alert if View Alerts is on
    //
    if (viewAllUpdates === true) {

        // Timed Notice
        var box = bootbox.alert("<h3>PICKUP #: <span style='color: darkOrange; text-align: center; margin-top:5px' > " + updatedPickup + "</span>  HAS BEEN REMOVED BY " + updatedBy.toUpperCase() + " </h3> ");

        setTimeout(function () {
            // be careful not to call box.hide() here, which will invoke jQuery's hide method
            box.modal('hide');
        }, 3000);

    }

};

pickupChannel.client.pingReceived = function (pingBy, wspeed) {

    // Get the Speed of the web
    //
    webConnType();

    // Report
    console.log("Ping Received by server from: " + pingBy + " - web speed: " + webSpeed);

}

function joinGroup() {

    // Get Team Name
    //
    var teamName = $('#currentUserInfo').attr('data-teamname');
    var userName = $('#currentUserInfo').attr('data-username');

    // Join Groups
    pickupChannel.server.joinGroup(teamName);
    console.log("User: " + userName + " has joined group: " + teamName);

}

//#endregion

//#region Knockout ViewModel

var viewModel = {};

//#endregion

$(document).ready(function () {

    //#region  DOM Ready

    // Get Pin for user;
    //
    var pin = $('#currentUserInfo').attr('data-pincode');
    globalCurrentUserPin = decryptCypher(pin);

    // Get Data 
    //
    getPickups();

    //#region Reset the  Elapsed Time

    startDate = new Date();
    startTime = startDate.getTime();
    time_spent();

    //#endregion    

    //#region  Search and Login  Functions

    // Activate Search Box
    //
    searchPickupsBox();

    // Save iOS login Data
    //
    saveAppleinfo();


    //#endreegion

    //#endregion 

    //#region Button Activation

    // Activate Edit Button
    //
    activateEditButton();

    // Activate the Update Button
    //
    activateUpdateButton();

    // Activate Add Item Button
    //
    activateAddItemButton();

    // Activate Delete Item Button
    //
    activateDeleteItemButton();

    // Activate Cancel Button
    //
    activateCancelButton();


    // Activate Remove Pickup Item
    //
    activateRemovePickupButton();

    // Activate Photo Add Button
    //

    activatePhototButton();


    // Activate View Photos

    displayPhoto();

    // Rotate Photo
    rotatePhoto();


    //#endregion


    // Activate Sound   
    //
    initilizeSound();


    // Check if a picture was sent and bring the pickup back into view
    //
    CheckPictureUpdate();

    // Activate Photo Viewer
    //
    displayPhoto();

    // Dont Show a close button on alerts
    //
    bootbox.setDefaults({

        closeButton: false

    });

    // Handle NavBar in iOS devices when enetering data
    //
    iOSNavBarInputfix();

    // Make sure NavBar stays on top in iOS
    //
    orientationFix4iOS();

    // Enable pop overs
    //
    enablePopOvers();

    // Auto NavBar Body Ajust
    //
    autoSizeBody2NavBar();

    // Activate Find Location GPS Button
    //
    activateFindLocationGPS();


    // Activate Map Refresh
    //
    activateMapRefresh();


    //#endregion

});

//#region Map Functions

function activateViewMap() {

    // Get Locations according to Roles For Active Pickups
    //
    getLocationStartModel();
   
}

function activateMapRefresh() {


    // Update Map
    $(document).on("click", "#update-map", null, function (ev) {


        // Get the state of the map Refresh  Button
        //
        var isrefreshOn = $('#update-map').hasClass('btn-success');

        // Update current map - this option is only visible when the map is open
        //
        if (!isrefreshOn)
        {

            // Add Annimation to button
            //
            // $('.map-update').addClass("fa-spin");

            // Change color of Button
            //
            $('#update-map').addClass("btn-success");
            $('#update-map').removeClass("btn-primary");


        }
        else
        {

            // Add Annimation to button
            //
           // $('.map-update').removeClass("fa-spin");

            // Change color of Button
            //
            $('#update-map').addClass("btn-primary");
            $('#update-map').removeClass("btn-success");

        }
        
    });


}

function activateAddLocation() {

    // Hide Navbar if opened
    //
    $('.navbar-collapse').removeClass('in');
    resizeNavNow();


    // Do not Interrupt
    globalDisplayMode = "edit";
    
     
        // Create Map
        //        
        Microsoft.Maps.loadModule('Microsoft.Maps.Themes.BingTheme', {
            callback: function () {
                map = new Microsoft.Maps.Map(document.getElementById('myMap'),
                {
                    credentials: "Alsg6_wydyNTX7BpLWntLwloWLn5m3PEAuf0FjJ_kGOrtLg-PPiXSi4Ba4qzAf7F",
                    mapTypeId: window.Microsoft.Maps.MapTypeId.road,
                    theme: new Microsoft.Maps.Themes.BingTheme(),
                    zoom: 5,
                    showScalebar: true,
                    enableClickableLogo: false,
                    enableSearchLogo: false,
                    showCopyright: false,
                    showDashboard: false,
                    tileBuffer: 4,
                    showMapTypeSelector: false
                });
            }
        });
      
    // Center Map
    //
        setTimeout(function () {

            // Initial Location - California Nevada
            //
            var location = new Microsoft.Maps.Location(38.442726135253906, -119.32534790039062);


            // Set the Map View
            map.setView({ center: location, zoom: 6 });

        }, 950);


           
    // Show Window
    $('#addLocation').modal('show');

}

function activateFindLocationGPS() {

    // Find
    $(document).on("click", ".find-gps", null, function (ev) {

       
            // Build address
            //
            var Name = $('#loc-gps-name').val();
            var address = $('#address-gps').val();
            var city = $('#city-gps').val();
            var state = $('#state-gps').val();
            var zip = $('#zip-gps').val();

            // Build the Query
            //
            var query = address + ', ' + city + ', ' + state + ',' + zip;
            if (query.length < 3)
            {
                $.ionSound.play("alert");
                return;
            }
            
            // Place Request
            map.getCredentials(callSearchService);

    
    })

    // Save
    $(document).on("click", ".save-gps", null, function (ev) {

        // Build address from the address found
        //
        var name = $('#loc-gps-name').val();
        var address = locSearchResult.resourceSets[0].resources[0].address.addressLine;
        var city = locSearchResult.resourceSets[0].resources[0].address.locality;
        var state =  locSearchResult.resourceSets[0].resources[0].address.adminDistrict;
        var zip = locSearchResult.resourceSets[0].resources[0].address.postalCode;

        // Build the Query
        //
        var loc = name + ' , ' + address + ' , ' + city + ' , ' + state + ' , ' + zip + ' , ' + locSearchResult.resourceSets[0].resources[0].point.coordinates[0] + ' , ' + locSearchResult.resourceSets[0].resources[0].point.coordinates[1];

        // Make sure the address is there
        //
        if (loc.length < 3) {
            $.ionSound.play("alert");
            return;
        }


        // Save the Location
        //
        saveLocation(loc);

        // Show Pickup Updates
        globalDisplayMode = "display";

    })

    // Show Traffic
    $(document).on("click", ".traffic-show", null, function (ev) {

    
        Microsoft.Maps.loadModule('Microsoft.Maps.Traffic', { callback: trafficModuleLoaded });

        
        // show the traffic Layer - toggle on/off
        //
        if ($('#show-traffic').hasClass('btn-info')) {

            Microsoft.Maps.loadModule('Microsoft.Maps.Traffic', {
                callback: function () {

                    trafficLayer = new Microsoft.Maps.Traffic.TrafficLayer(map);
                    // map.setView({ zoom: 10, center: new Microsoft.Maps.Location(40.73, -73.98) })

                    // Show Map
                    $('#show-traffic').removeClass('btn-info');
                    $('#show-traffic').addClass('btn-success');
                    trafficLayer.show();

                }
            });
                       
        }
        else {
            // Hide Map
            $('#show-traffic').addClass('btn-info');
            $('#show-traffic').removeClass('btn-success');
            // hide the traffic Layer
            trafficLayer.hide();
        }
     

    })

}

function trafficModuleLoaded () {

    console.log('Traffic Loaded');

}

function callSearchService(credentials) {

    // Build address
    //
    var Name = $('#loc-gps-name').val();
    var address = $('#address-gps').val();
    var city = $('#city-gps').val();
    var state = $('#state-gps').val();
    var zip = $('#zip-gps').val();

    // Build the Query
    //
    var query = address + ',' + city + ',' + state + zip;
  
    var searchRequest = 'http://dev.virtualearth.net/REST/v1/Locations/' + query + '?output=json&jsonp=searchServiceCallback&key=' + credentials;
    var mapscript = document.createElement('script');
    mapscript.type = 'text/javascript';
    mapscript.src = searchRequest;
    document.getElementById('myMap').appendChild(mapscript)
}

function searchServiceCallback(result) {
   
   
    if (result &&
    result.resourceSets &&
    result.resourceSets.length > 0 &&
    result.resourceSets[0].resources &&
    result.resourceSets[0].resources.length > 0) {
        // resultsHeader.innerHTML = "Bing Maps REST Search API  <br/>  Found location " + result.resourceSets[0].resources[0].name;
        var bbox = result.resourceSets[0].resources[0].bbox;
        var viewBoundaries = Microsoft.Maps.LocationRect.fromLocations(new Microsoft.Maps.Location(bbox[0], bbox[1]), new Microsoft.Maps.Location(bbox[2], bbox[3]));
        var location = new Microsoft.Maps.Location(result.resourceSets[0].resources[0].point.coordinates[0], result.resourceSets[0].resources[0].point.coordinates[1]);
        map.setView({ bounds: viewBoundaries});

        // Store the GPS in global var
        //
        var locGPS = location;
        locSearchResult = result;

        // Get Team Name
        //
        var currentUserTeam = $('#currentUserInfo').attr('data-teamname');
        
        // Create the icon string reference
        //
        var iconUrl = "../Content/TeamIcons/" + "Flag_Processed.png";
        
        // Build address
        //
        var Name = $('#loc-gps-name').val().toUpperCase();
        var address = locSearchResult.resourceSets[0].resources[0].address.addressLine;
        var city = locSearchResult.resourceSets[0].resources[0].address.locality;
        var state = locSearchResult.resourceSets[0].resources[0].address.adminDistrict;
        var zip = locSearchResult.resourceSets[0].resources[0].address.postalCode;

        var desc1 = address + ', ' + city + ', ' + state + ' ' + zip;

        iconStartUrl = iconUrl;
        pinOptions = { text: '1', icon: iconUrl, width: 39, height: 39, textOffset: { x: 1, y: 5 } };

        var pin2 = new Microsoft.Maps.Pushpin(new Microsoft.Maps.Location(result.resourceSets[0].resources[0].point.coordinates[0], result.resourceSets[0].resources[0].point.coordinates[1]), pinOptions);
        map.entities.push(pin2);
        map.entities.push(new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(result.resourceSets[0].resources[0].point.coordinates[0], result.resourceSets[0].resources[0].point.coordinates[1]), { title: Name, description: desc1, pushpin: pin2 }));


    }
    else {
        if (typeof (response) == 'undefined' || response == null) {
            
            bootbox.alert("Location not found. Update Information and try again.");

        }
        else {
            if (typeof (response) !== 'undefined' && response && result && result.errorDetails) {
                alert(response.errorDetails[0]);
            }
            
            bootbox.alert("Error Finding Location");
        }
    }
}

function teamPinNumber(teamName) {

    switch (teamName) {

        case "Team East Bay":
            return "Team1.png"
            break;

        case "Team Fresno":
            return "Team2.png"
            break;

        case "Team Fresno":
            return "Team3.png"
            break;

        case "Team North Bay":
            return "Team4.png"
            break;

        case "Team San Francisco":
            return "Team5.png"
            break;

        case "Team San Jose":
            return "Team6.png"
            break;

        case "Team Chico":
            return "Team7.png"
            break;

        case "Team Central Coast":
            return "Team8.png"
            break;

        case "Team Sacramento":
            return "Team9.png"
            break;

        case "Team Modesto":
            return "Team10.png"
            break;

        case "Team Sacramento":
            return "Team11.png"
            break;

        case "Team Napa":
            return "Team12.png"
            break;

        case "Team Quig-Hoogie":
            return "Team13.png"
            break;
 
        case "Team Reno":
            return "Team14.png"
            break;
 
        case "Team Santa Cruz-Mont":
            return "Team15.png"
            break;
             
        default:

    }

}

function saveLocation(locDetails, overWrite) {

    // Determine the type of request
    //
    var rqType = {};

    if (typeof (overWrite) == 'undefined' || overWrite == null) {
        overWrite = 'no';
    };


    if (locDetails !== "") {
        rqType = { locInfo: locDetails + ' , ' + overWrite };
    }
    else {
        rqType = { locInfo: 'NA' };
    }

    $.ajax({

        // Get Data From Server and disable cashing
        //
        url: "/Pickup/SaveLocation",
        cache: false,
        data: rqType,
        type: "POST"

    }).done(function (data) {

        // Get name
        var name = $('#loc-gps-name').val();

        if (data.answer === 'saved!')
        {
            console.log("Location save response: " + data);

            // Timed Notice
            //
            var box = bootbox.alert("<h3>Location: <span style='color: darkOrange; text-align: center; margin-top:5px' > " + name + "</span>  saved. " +" </h3> ");

            setTimeout(function () {
                // be careful not to call box.hide() here, which will invoke jQuery's hide method
                box.modal('hide');

              
            }, 3000);
        }
        else if (data.answer === 'duplicate')
        {
   

            bootbox.confirm("<h3>Location: <span style='color: darkOrange; text-align: center; margin-top:5px' > " + name + "</span>  already exists. " + " </h3> <h4> Overwrite exiting name? </h4>", function (result) {
            if (result === true) {


                    // Build address from the address found
                    //
                    var name = $('#loc-gps-name').val();
                    var address = locSearchResult.resourceSets[0].resources[0].address.addressLine;
                    var city = locSearchResult.resourceSets[0].resources[0].address.locality;
                    var state = locSearchResult.resourceSets[0].resources[0].address.adminDistrict;
                    var zip = locSearchResult.resourceSets[0].resources[0].address.postalCode;

                    // Build the Query
                    //
                    var loc = name + ' , ' + address + ' , ' + city + ' , ' + state + ' , ' + zip + ' , ' + locSearchResult.resourceSets[0].resources[0].point.coordinates[0] + ' , ' + locSearchResult.resourceSets[0].resources[0].point.coordinates[1];


                    // Save the Location
                    //
                    saveLocation(loc,'yes');

                }
            });
                       
        }
        

    }).complete(function () {

        console.log("Location save complete.");
        
    }).error(function (ex) {

        // There was an error retrieving data from the server
        //
        var name = $('#loc-gps-name').val();
        bootbox.alert("Error saving location: " + name + "  to server.");

    });


}

function addPushpins() {

    // Create the icon string reference
    //
    var iconStar3tUrl = "../Content/TeamIcons/" + "BlueStart.png";
    var iconStar4tUrl = "../Content/TeamIcons/" + "BlueStart4.png";
    var iconStar5tUrl = "../Content/TeamIcons/" + "BlueStart5.png";
     

    // Map All Active Pickups
    //
    var locs = viewModel.locationsStartCollection;  // Location Start
    var locsEnd = viewModel.locationsEndCollection;  // Location Start
    
    // Update Map Label of Pickups Count
    //
    var activePickups = locs().length;
    var elem = $('.pickup-count-map');

    if (activePickups === 1) {

        elem.html(activePickups + ' Pickup');
    }
    else if (activePickups >= 1) {
        elem.html(activePickups + ' Pickups');
    }

    else if (activePickups === 0) {
        elem.html('No Active Pickups');
    }


  

    ko.utils.arrayForEach(locs(), function (item) {

        // GPS Location
        //
        var location = new Microsoft.Maps.Location(item.Latitude(), item.Longitude());

        // Set the Map View
        map.setView({ center: location, zoom: 6 });

    
        // Create Pushpin - determine the width bu the number of integers
        //
        
        // Icon size
        var pin = null;
       
        var pickupID = item.PickupNumber();
        var pickupChars = pickupID.toString().length;
        
        // Options
        var pinOptions = {};

        // Values
        //
        if (item.Team() === null)
            item.Team("n/a");

        if (item.SalesRep() === null)
            item.SalesRep("n/a");

        if (item.WhContact() === null)
            item.WhContact("n/a");

        if (item.Courier() === null)
            item.Courier("n/a");

        if (item.Status() === null)
            item.Status("n/a");

        // Title and Description
        //
        var title1 = item.PickupNumber() + ' - ' + item.Location().toUpperCase();
        var desc1 = 'Notes: ' + item.Notes() + '<br/>' + ' Team: ' + item.Team() + ' | ' + ' Rep: ' + item.SalesRep() + ' | ' + 'SC: ' + item.WhContact() + ' | ' + 'Courier: ' + item.Courier() + ' | ' + ' Status: ' + item.Status();

      
        if (pickupChars <= 3) {

            iconStartUrl = iconStar3tUrl;
            pinOptions = { text: '' + item.PickupNumber(), icon: iconStartUrl, width: 39, height: 39, textOffset: { x: 1, y: 5 } };
        }
        else if (pickupChars <= 4) {

            iconStartUrl = iconStar4tUrl;
            pinOptions = { icon: iconStar4tUrl, width: 52, height: 52, textOffset: { x: 0, y: 10 }, text: '' + item.PickupNumber() };
        
        }
        else if (pickupChars <= 5) {
           
            iconStartUrl = iconStar4tUrl;
            pinOptions = { icon: iconStar5tUrl, width: 82, height: 62, textOffset: { x: -10, y: 15 }, text: '' + item.PickupNumber() };

        }
      
        var pin2 = new Microsoft.Maps.Pushpin(new Microsoft.Maps.Location(item.Latitude(), item.Longitude()), pinOptions);
        map.entities.push(pin2);
        map.entities.push(new Microsoft.Maps.Infobox(new Microsoft.Maps.Location(item.Latitude(), item.Longitude()), { title: title1, description: desc1, pushpin: pin2}));

              
    });

    // End is not needed for now - remove return to plot END locations
    //
    return;

    ko.utils.arrayForEach(locsEnd(), function (item) {

        // GPS Location
        //
        var location = new Microsoft.Maps.Location(item.Latitude(), item.Longitude());

        // Set the Map View
        map.setView({ center: location, zoom: 7 });

        // Define custom properties for the pushpin class.
        //
        Microsoft.Maps.Pushpin.prototype.title = null;
        Microsoft.Maps.Pushpin.prototype.description = null;

        // Create Pushpin - using the vals
        //
        var pushpin = new Microsoft.Maps.Pushpin(location, { icon: iconEndtUrl, width: 39, height: 39, text: '' + item.PickupNumber() });
        pushpin.title = item.PickupNumber() + ' - ' + item.Destination().toUpperCase();
        pushpin.description = 'Notes: ' + item.Notes() + '<br/>' + ' Team: ' + item.Team() + ' | ' + ' Rep: ' + item.SalesRep() + ' | '
                               + 'SC: ' + item.WhContact() + ' | ' + ' Status: ' + item.Status();


        // Add Custom Infobox Options
        //
        customInfobox.setOptions({ orientation: 1, tether: true, visible: false, offset: { x: 0, y: 0 }, showArrow: false });


        // Add Pushpin to Map 
        //
        Microsoft.Maps.Events.addHandler(pushpin, 'click', displayInfobox);
        dataLayer.push(pushpin);


       
    });
        
}

function getLocationStartModel() {
 
    //#region Setup the Map

    //#region Format map area 

    // Hide Navbar if opened
    //
    $('.navbar-collapse').removeClass('in');
    resizeNavNow();


    // Get the screen size
    //
    var height = $(window).height();

    // Set the map size and include the offset so the bottom buttons can be seen
    //
    $('#mapDiv').height(height - 120 + 'px');

    // Show Map
    //
    $('#mapView').modal('show');

    // Autosize modal
    //
    setTimeout(function () {

        $('#mapView').find('.modal-dialog').css({
            width: 'auto', //probably not needed
            height: 'auto', //probably not needed 
            'max-height': '100%',
            'margin-top': '10px'
        });


    }, 2000);


    //#endregion

    // Clear the map if already created
    //
    if (typeof (map) !== 'undefined' && map !== null) {
        map.dispose();
        map = null;
    }


    // Check if iPhone is Present and Show or Remove Dashboard
    if (navigator.userAgent.match(/(iPod|iPhone)/)) {

        // Load the Bing theme for iPhone
        //
        Microsoft.Maps.loadModule('Microsoft.Maps.Themes.BingTheme', {
            callback: function () {
                map = new Microsoft.Maps.Map(document.getElementById('mapDiv'),
                {
                    credentials: "Alsg6_wydyNTX7BpLWntLwloWLn5m3PEAuf0FjJ_kGOrtLg-PPiXSi4Ba4qzAf7F",
                    theme: new Microsoft.Maps.Themes.BingTheme(),
                    zoom: 6,
                    tileBuffer: 4,
                    mapTypeId: window.Microsoft.Maps.MapTypeId.road,
                    enableClickableLogo: false,
                    enableSearchLogo: false,
                    showCopyright: false,
                    showDashboard: false,
                    showMapTypeSelector: false
                });
            }
        });

    }
    else {
        // Load the Bing theme for Desktops and tablets
        //
        Microsoft.Maps.loadModule('Microsoft.Maps.Themes.BingTheme', {
            callback: function () {
                map = new Microsoft.Maps.Map(document.getElementById('mapDiv'),
                {
                    credentials: "Alsg6_wydyNTX7BpLWntLwloWLn5m3PEAuf0FjJ_kGOrtLg-PPiXSi4Ba4qzAf7F",
                    theme: new Microsoft.Maps.Themes.BingTheme(),
                    zoom: 6,
                    tileBuffer: 4,
                    mapTypeId: window.Microsoft.Maps.MapTypeId.road,
                    enableClickableLogo: false,
                    enableSearchLogo: false,
                    showCopyright: false,
                    showDashboard: true,
                    showMapTypeSelector: true
                });
            }
        });

    }


    // Center Map
    //
    setTimeout(function () {

        // Initial Location - California Nevada
        //
        var location = new Microsoft.Maps.Location(38.442726135253906, -119.32534790039062);


        // Set the Map View
        map.setView({ center: location, zoom: 6 });

    }, 950);

    //#endregion


    getLocations('start');

}
   
function getLocationEndModel() {

    // ajax complete callback
    //
    getLocations('end');

}

//#endregion

//#region Server Data Retrieval Functions

function getPickups(requestType) {

    //#region Get data for Knockout Model
    //
    // Hide Navbar if opened
    //
    $('.navbar-collapse').removeClass('in');
    resizeNavNow();

    // Set Data Request to let other functions know server call is in progress
    //
    gDataRequest = "starting";
    console.log('Data Request For Pickups: ' + gDataRequest);
     

    // Determine the type of request
    //
    var rqType = {};

    if (requestType === 'completed') {
        rqType = { requestType: 'completed' };
    }
    else {
        rqType = { requestType: 'standard' };
    }



    // Determine if the current URL came from a text alert and show completed pickups only 
    //
    var mobileAlert = getUrlParameter('smsAlert');

    if (mobileAlert === 'yes') {

        // Restore the URL so it doesnt't keep showing completed pickups
        //
        var state = {
            "z-trak": true
        };
        history.pushState(state, "Z-Trak", "/Pickup");


        // Overide the Request Type so it shows completed pickups only
        //
        rqType = { requestType: 'completed' };

    }
    

    // Start downloading pickups
    $('#pullPickups').addClass("fa-spin");


    $.ajax({

        // Get Data From Server and disable cashing
        //
        url: "/Pickup/GetPickups",
        cache: false,
        data: rqType,
        type: "GET"

    }).done(function (data) {

        
        // Update Global Counter
        //
        globaltotalPickups = data.length;

        // Log
        console.log("Retrieved " + globaltotalPickups + " Pickups From Server.");

        // Create the model if needed and then update it
        //
        if (!viewModel.pickupCollection) {

            // Populate Model
            //
            viewModel.pickupCollection = ko.mapping.fromJS(data);

            // Bind it to the View
            //
            ko.applyBindings(viewModel);

        }
        else {

            // Update the ViewModel with the data from the server
            //
            ko.mapping.fromJS(data, viewModel.pickupCollection)
        }

    }).complete(function () {

        //#region Data Formatting
        //

        // Reset Elapsed Time
        //
        resetElapsedTimer();

        // Clean Dates - Placed here because it needs to run after all fields are updated
        formatAllDates();

        //Convert title to uppercase
        //
        convertLocTile2Uppercase();

        // Apply any active search filter
        searchPickupsNow();

        // Check for priority status
        //
        priorityAlert();

        //#endregion

        // End of transmission - Perform This Actions After DOM is built
        //
        setTimeout(function () {

            // Stop Refresh Icon From Spinning
            //
            $('#pullPickups').removeClass('fa-spin');
            gDataRequest = "done";

            //#region Scroll to Recent Photo Upload
            //
            scrollAfterPhotoUpload();

            //#endregion

            //#region Fix Nav Bar
            //
            resizeNavNow();

            //#endregion

            //#region  Check if labels should be off
            //
            var showLabels = localStorage.getItem('showLabels');

            if (showLabels === 'no')
                toggleFieldLabels();
            
            //#endregion

            //#region Scroll Completed Pickups List to the top
            //
            if (requestType === 'completed') {

                setTimeout(function () {

                    // Nabvbar size
                    //
                    var targetOffset = $('.navbar').height() - 40;

                    // Bring item into view
                    $('html,body').animate({ scrollTop: targetOffset }, 800);


                }, 1000);

            }

            //#endregion

            //#region Update Map Locations if Refresh Button is Active
            //
            var isrefreshOn = $('#update-map').hasClass('btn-success');

            if (isrefreshOn)
                getLocationStartModel();

            //#endregion


            console.log('Data Request For Pickups: ' + gDataRequest);

        }, 1000);


    }).error(function (ex) {

        // There was an error retrieving data from the server
        //
        bootbox.alert("Error retrieving data from server...");

    });

    //#endregion

}

function getLocations(requestType) {

    //#region Get data for Knockout Model
    //
    // Hide Navbar if opened
    //
    $('.navbar-collapse').removeClass('in');
    resizeNavNow();

    // Set Data Request to let other functions know server call is in progress
    //
    console.log('Data Request For Locations: ' + gDataRequest);

    // Determine the type of request
    //
    var rqType = {};

    if (requestType === 'start') {
        rqType = { requestType: 'start' };
    }
    else {
        rqType = { requestType: 'end' };
    }

    // Start downloading pickups
    $('#pullPickups').addClass("fa-spin");


    $.ajax({

        // Get Data From Server and disable cashing
        //
        url: "/Pickup/GetLocations",
        cache: false,
        data: rqType,
        type: "GET"

    }).done(function (data) {

        // Log
        console.log("Retrieved " + data.length + " Locations From Server.");

        // Create the model if needed 
        //
        if (requestType == 'start') {

                // Populate Model
                viewModel.locationsStartCollection = ko.mapping.fromJS(data);
            
        } 
        else if (requestType === 'end') {

                // Populate Model
                viewModel.locationsEndCollection = ko.mapping.fromJS(data);
         
        }

    }).complete(function () {

       
        // End of transmission
        //
        $('#pullPickups').removeClass('fa-spin');
        resizeNavNow();
        console.log('Data request for locations done.');
     
        // Get Data For Start
        if (requestType == 'start') {
            getLocationEndModel();
        }
        else if (requestType === 'end') {
                    
                // Data for End Received, plot pins
                addPushpins();

        }


    }).error(function (ex) {

        // There was an error retrieving data from the server
        //
        bootbox.alert("Error retrieving locations from server: " + ex.messageS);

    });

    //#endregion

}

function removePickup(id) {

    // Send a request to the server to remove the pickup
    //

    // Call the server
    ///
    $.ajax(
	{
	    url: '/Pickup/RemovePickup',
	    cache: false,
	    type: 'GET',
	    data: { pickupID: id },
	    success: function (result) {

	        // Update the model
	        //
	        if (result == "success") {
	            getPickups();

	        }




	    }

	});



};

//#endregion

//#region Button Commands

function activateEditButton() {

    $(document).on("click", ".zfm-edit", null, function (ev) {

        // get the current Pickup Record
        //
        var current = ko.dataFor(this);

        // Make a backup copy of this Pickup
        //
        var pickupBackup = ko.mapping.fromJS(ko.mapping.toJS(current));

        // Add this to the Global backup object
        //
        gPickupUpdateBackups.push(pickupBackup);


        // Detect if object moved and bring it into view if it did
        //
        var currentPossition = $('#pu' + current.PickupNumber()).offset().top;

        // What Role is the user and choose edit template accordingly
        //
        var thisUserRole = $('#currentUserInfo').attr('data-userrole').toLocaleLowerCase();

        if (thisUserRole.indexOf('courier') >= 0 || thisUserRole.indexOf('warehouse') >= 0) {
            // Now change to edit mode for Couriers and Warehouse users
            //
            current.Mode("editAdmin");
        } else {
            // Now change to edit mode for normal team users.  
            //
            current.Mode("edit");
        }



        // Update Refference  so user is not interrupted by other events
        //
        globalDisplayMode = "edit";

        // Wait a second to make sure DOM is ready
        //
        setTimeout(function () {

            // Fix all the Dates
            //
            formatAllDates();

            //  Now check if the position of the Record Moved
            //
            var newPossition = $('#pu' + current.PickupNumber()).offset().top;

            // Move the Record into View if it moved
            //
            if (typeof (currentPossition) !== 'undefined' && typeof (newPossition) !== 'undefined') {

                // If the elements postion was succsfully determined than compare
                //
                if (currentPossition !== newPossition) {

                    var elemID = '#pu' + current.PickupNumber();

                    scrollToID(elemID, 750, 'go');

                }
            }

        }, 250);

    })
}

function activatePhototButton() {

    $(document).on("click", ".zfm-photo", null, function (ev) {

        var current = ko.dataFor(this);
        current.Mode("photo");
       
        if (current.Items().length === 0) {


            var currentUserName = $('#currentUserInfo').attr('data-fullname');

            //  Create a new Item
            //
            var newItem = {
                ID: ko.observable("0"),
                Description: ko.observable("PHOTO UPLOAD"),
                Qty: ko.observable("1"),
                Notes: ko.observable(""),
                PickupReff: ko.observable(current.PickupNumber()),
                AddedBy: ko.observable(currentUserName),
                AddedDate: ko.observable(moment(new Date()).format('l  LT')),
                Picture1: ko.observable("none"),
                Picture2: ko.observable("")
            }

            // Add Item to current Pickup
            current.Items().push(newItem);

            // Update Model
            ko.mapping.fromJS(viewModel.pickupCollection, viewModel.pickupCollection);

        }

        // Wait half a second and attach photo save button
        //
        setTimeout(function () {

            // Activate Send Photos
            //
            sendPhotos();

            // Fix Dates
            formatAllDates();

            // Update input name
            checkFileB4Uoload();

            // Check if labels should be off
            //
            var showLabels = localStorage.getItem('showLabels');

            if (showLabels === 'no')
                toggleFieldLabels();


        }, 950);



    })
}

function activateCancelButton() {

    $(document).on("click", ".zfm-cancel", null, function (ev) {

        // Get calling Pickup
        //
        var current = ko.dataFor(this);

        // Detect if object moved and bring it into view if it did
        //
        var currentPossition = $('#pu' + current.PickupNumber()).offset().top;

        var pickupID = current.PickupNumber();

        //Remove Pickup

        // Give  a chance to cancel the pickup delete
        // To do Test
        // TODO: Use a dialog alert to change the colors of the ok or cancel buttons

        bootbox.confirm("<h3>Cancel Changes to Pickup #: " + "<span style='color: darkOrange'>" + pickupID + "</span>" + "?</h3>", function (result) {

            if (result === true) {


                if (pickupID === 'NEW') {
                    // Remove current Pickup;

                    // Get a copy of the Pickup that has the Item to Delete
                    //
                    var pickup2edit = ko.utils.arrayFirst(viewModel.pickupCollection(), function (item) {

                        return item.PickupNumber() === pickupID;

                    });

                    // Now Delete the Item From The Pickup
                    //
                    ko.utils.arrayRemoveItem(viewModel.pickupCollection(), pickup2edit);

                    //Update Model
                    ko.mapping.fromJS(viewModel.pickupCollection, viewModel.pickupCollection);


                }

                //- Cancel changes to an exisitng Pickup

                // Get the backup copy and use it tpo restore this pickup to its original state
                //
                // Use this method to extract  items from an array
                var searchInput, i;


                searchInput = gPickupUpdateBackups;
                i = searchInput.length;
                while (i--) {

                    // Get the current values 
                    var currentPickupID = searchInput[i].PickupNumber();;

                    //  Restore Backup Pickup Record 
                    //
                    if (searchInput[i].PickupNumber() === pickupID) {

                        // Restore Backup Pickup
                        //
                        var backupPU = ko.mapping.fromJS(ko.mapping.toJS(searchInput[i]));

                        // Map all the values here 

                        current.LocationName(backupPU.LocationName());
                        current.Destination(backupPU.Destination());
                        current.Rep(backupPU.Rep());
                        current.Manager(backupPU.Manager());
                        current.Status(backupPU.Status());
                        current.TransporterName(backupPU.TransporterName());
                        current.Notes(backupPU.Notes());
                        current.Mode(backupPU.Mode());
                        current.LocationName(backupPU.LocationName());
                        current.PickupNumber(backupPU.PickupNumber());
                        current.TransporterName(backupPU.TransporterName());
                        current.Rep(backupPU.Rep());
                        current.Manager(backupPU.Manager());
                        current.Account(backupPU.Account());
                        current.ShipCode(backupPU.ShipCode());
                        current.Team(backupPU.Team());
                        current.Contact(backupPU.Contact());
                        current.Fax(backupPU.Fax());
                        current.CreatedBy(backupPU.CreatedBy());
                        current.Created(backupPU.Created());
                        current.Closed(backupPU.Closed());
                        current.ClosedBy(backupPU.ClosedBy());
                        current.CancelledBy(backupPU.CancelledBy());
                        current.Cancelled(backupPU.Cancelled());
                        current.LastModified(backupPU.LastModified());
                        current.Notes(backupPU.Notes());
                        current.SortOrder(backupPU.SortOrder());
                        current.Temp(backupPU.Temp());
                        current.LastEditBy(backupPU.LastEditBy());
                        current.Mode(backupPU.Mode());

                        // Now Replace the current Items with the ones in the backup
                        //
                        var items2Remove = current.Items().length;  // Number of items to delete
                        var items2Get = backupPU.Items().length;
                        current.Items.splice(0, items2Remove); // empty all the items

                        for (var p = 0; p < items2Get; p++) {

                            // Add each item from the backup to the current
                            //
                            var item = backupPU.Items()[p];
                            current.Items.push(item);

                        }

                        // Delete from the backup array for future updates
                        //
                        searchInput.splice(i, 1);
                    }
                }

                // Now change to edit mode
                //
                current.Mode("display");

                // Update Refference  so user is not interrupted by other events
                //
                globalDisplayMode = "display";

                // Bring exiting pickup into view and set the update type
                //
                globalUpdateType = 'update-cancelled';

                // The PickupID is actually the PickupNumber
                currentPickupUpdated = pickupID;

                // Wait a second to make sure DOM is ready
                //
                setTimeout(function () {

                    // Fix all the Dates
                    //
                    formatAllDates();
                    markUpdatedPickup(pickupID, 'cancel');


                }, 500);

            }
        });

    })



}

function activateDeleteItemButton() {

    $(document).on("click", ".zfm-delete-item", null, function (ev) {

        // Get calling Pickup
        //
        var current = ko.dataFor(this);

        // Get Row
        var itemID = current.PickupID();

        // Now Take the row out using animation
        // TODO: Fix animated item remove
        var rowElem = $('tr[id=' + itemID + ']');
        rowElem.animate({ backgroundColor: '#C94040' }, 750).fadeOut(750, function () { });

        // Now take row out of model
        current.Qty("0");

        // Get a copy of the Pickup that has the Item to Delete
        //
        var pickup2edit = ko.utils.arrayFirst(viewModel.pickupCollection(), function (item) {

            return item.PickupNumber() == current.PickupID();

        });

        // Now Delete the Item From The Pickup
        //
        ko.utils.arrayRemoveItem(pickup2edit.Items(), current);

        //Update Model
        ko.mapping.fromJS(viewModel.pickupCollection, viewModel.pickupCollection);

    })

}

function togleSoundAlerts() {


    // Get Nav Bar icon 
    //
    var soundIcon = $('#toggleSoundIcon');
    var soundBarIcon = $('#soundAlert');



    if (audioALerts === true) {
        // Turn it off and sign too
        //
        soundBarIcon.fadeOut(500);

        audioALerts = false;

        // Turn off Sound icon
        //
        soundIcon.removeClass('fa-volume-up');
        soundIcon.addClass('fa-volume-off');

        soundBarIcon.removeClass('fa-volume-up');
        soundBarIcon.addClass('fa-volume-off');


    }
    else {
        // Turn it on
        //
        audioALerts = true;
        soundBarIcon.fadeIn(500);

        // Remove the SOund On iCon
        //
        soundIcon.removeClass('fa-volume-off');
        soundIcon.addClass('fa-volume-up');

        soundBarIcon.removeClass('fa-volume-off');
        soundBarIcon.addClass('fa-volume-up');

    }

    // Hide Navbar if opened
    //
    $('.navbar-collapse').removeClass('in');
    resizeNavNow();

}

function ViewAllPickupUdpdates() {

    // Get NavBar Icon  element

    var viewIcon = $('#toggleViewIcon');

    // Get the Badge Icon
    //
    var viewNavElem = $('#updateViewer');

    if (viewAllUpdates === true) {
        // Turn it off and bar icon too
        //
        viewNavElem.fadeOut(500);
        viewAllUpdates = false;


    }
    else {
        // Turn it on
        //
        viewNavElem.fadeIn(500);
        viewAllUpdates = true;

    }

    // Hide Title bar if opened
    //
    $('.navbar-collapse').collapse('hide');
    resizeNavNow();
        
}

function activateAddItemButton() {


    $(document).on("click", ".zfm-addPhoto", null, function (ev) {

        // Get Pointer to current Pickup
        //
        var current = ko.dataFor(this);
        var currentUserName = $('#currentUserInfo').attr('data-fullname');

        //  Create a new Item
        //
        var newItem = {
            ID: ko.observable("0"),
            Description: ko.observable("PHOTO UPLOAD"),
            Qty: ko.observable("1"),
            Notes: ko.observable(""),         
            PickupID: ko.observable(current.ID()),
            PickupReff: ko.observable(current.PickupNumber()),
            AddedBy: ko.observable(currentUserName),
            AddedDate: ko.observable(moment(new Date()).format('l  LT')),
            Picture1: ko.observable("none"),
            Picture2: ko.observable("")
        }

        // Add Item to current Pickup
        current.Items().push(newItem);

        // Update Model
        ko.mapping.fromJS(viewModel.pickupCollection, viewModel.pickupCollection);

        
    });

}

function activateAddPickupButton() {


    // Hide Navbar if opened
    //
    $('.navbar-collapse').collapse('hide');
    resizeNavNow();

    // Populate new fields
    //
    var currentUserName = $('#currentUserInfo').attr('data-fullname');
    var currentUserTeam = $('#currentUserInfo').attr('data-teamname');

    if (currentUserTeam === 'Courier' || currentUserTeam === 'Warehouse')
        currentUserTeam = '';


    // What Role is the user and choose edit template accordingly
    //
    var editMode;
    var thisUserRole = $('#currentUserInfo').attr('data-userrole').toLocaleLowerCase();

    if (thisUserRole.indexOf('courier') >= 0 || thisUserRole.indexOf('warehouse') >= 0) {
        // Now change to edit mode for Couriers and Warehouse users
        //
        editMode = "editAdmin";
    }
    else {
        // Now change to edit mode for normal team users
        //
        editMode = "edit";

    }


    //- create an empty Pickup
    //
    var newPickup = {

        ID: ko.observable("NEW"),
        PickupNumber: ko.observable("NEW"),
        LocationName: ko.observable(""),
        Destination: ko.observable(""),
        TransporterName: ko.observable(""),
        Rep: ko.observable(""),
        Manager: ko.observable(""),
        Account: ko.observable(""),
        ShipCode: ko.observable(""),
        Team: ko.observable(currentUserTeam),
        Contact: ko.observable(""),
        Phone: ko.observable(""),
        Fax: ko.observable(""),
        CreatedBy: ko.observable(currentUserName),
        Created: ko.observable(moment(new Date()).format('l  LT')),
        Closed: ko.observable(""),
        Status: ko.observable("OPEN"),
        ClosedBy: ko.observable(""),
        CancelledBy: ko.observable(""),
        Cancelled: ko.observable(""),
        LastModified: ko.observable(moment(new Date()).format('l  LT')),
        Notes: ko.observable(""),
        SortOrder: ko.observable(""),
        Temp: ko.observable(""),
        LastEditBy: ko.observable(currentUserName),
        Mode: ko.observable(editMode),
        Items: ko.observableArray()
    }

    // Create an empty Item
    //
    //var newItem = {
    //    ID: ko.observable("0"),
    //    Description: ko.observable(""),
    //    Qty: ko.observable(""),
    //    Notes: ko.observable(""),
    //    PickupID: ko.observable(""),
    //    AddedBy: ko.observable(currentUserName),
    //    AddedDate: ko.observable(moment(new Date()).format('l  LT')),
    //    Picture1: ko.observable("none"),
    //    Picture2: ko.observable("")
    //}

    //// Add the Items Collection to the Items Collection
    //newPickup.Items.push(newItem);

    // Set Edit Mode to prevent unwanted Focus
    //
    globalDisplayMode = "edit";

    // Add the Pickup the Model
    //
    viewModel.pickupCollection.unshift(newPickup);

    // Update the model
    //
    // Update Model
    ko.mapping.fromJS(viewModel.pickupCollection, viewModel.pickupCollection);


    // Bring item into view
    $('html,body').animate({ scrollTop: 1 }, 1000);

    //--

    // Update Format after a quarter of a second has pased by to give time to render DOM
    //
    setTimeout(function () {

        // Fix all Dates if needed
        formatAllDates();

        //Activate iOS NAVBAR fix
        iOSNavBarInputfix();



    }, 250);


}

function activateRemovePickupButton() {

    $(document).on("click", ".zfm-delete", null, function (ev) {

        // Get calling Pickup
        //
        var current = ko.dataFor(this);

        // alert("Delete Pickup Clicked!");

        // Get the owner of the Pickup and the Role to determine if this user is able to delete
        //
        var currentUserName = $('#currentUserInfo').attr('data-fullname');
        var currentUserTeam = $('#currentUserInfo').attr('data-teamname');
        var currentUserRole = $('#currentUserInfo').attr('data-userrole');

        // Get the pickup credentials
        //
        var pickupCreatedBy = current.CreatedBy();

        // Check credentials before allowing delete
        //
        if (currentUserName === pickupCreatedBy || currentUserRole === "Courier Admin" || currentUserRole === "Team Admin" || currentUserRole === "Warehouse Admin" || currentUserRole === "Warehouse" || currentUserRole === "Courier") {
            // Give a warning and ask for pincode
            //
            bootbox.dialog({
                message: "<input id='pinCode' class='bootbox-input bootbox-input-text form-control' autocomplete='off' type='password'></input><span id='passmsg' style='font-size: large; color: lightcoral' class='blink-now' ></span>",
                title: "<h4>PIN CODE TO REMOVE PICKUP #: " + "<h3 style='color: orangered; text-align: center;' >" + current.PickupNumber() + "</h3> </h4>",
                closeButton: false,
                buttons: {
                    accept: {
                        label: "REMOVE",
                        className: "btn-primary btn-danger",

                        callback: function () {

                            // Check code and proceed as needed
                            //
                            var pin = $('#pinCode').val();
                            var pickuipID = current.PickupNumber();


                            if (globalCurrentUserPin === pin) {

                                // Mark this pickup as erased
                                //
                                removePickup(current.PickupNumber());
                            }
                            else {
                                $('#passmsg').text("PIN CODE NOT VALID. TRY AGAIN OR CANCEL TO DISMISS.");
                                $('#pinCode').val('');
                                return false;
                            }

                        }
                    },
                    cancel: {
                        label: "CANCEL",
                        className: "btn-default",

                        callback: function () {

                            // Do nothing - wait for input

                        }
                    }
                }
            });

        }
        else {
            bootbox.alert("<h3>YOU DO NOT HAVE PERMISSION TO REMOVE PICKUP #: <p style='color: darkOrange; text-align: center; margin-top:5px' > " + current.PickupNumber() + "</p></h3>");

        }

    })

}

function activateUpdateButton() {

    $(document).on("click", ".zfm-update", null, function (ev) {

        // Get calling Pickup
        //
        var current = ko.dataFor(this);
        var currentItems = current.Items;

        var pickupID = current.PickupNumber();


        bootbox.confirm("<h3>Update Pickup #: " + "<span style='color: darkOrange'>" + pickupID + "</span>" + "?</h3>", function (result) {

            if (result === true) {

                //Clean up empty items before saving

                // Use this method to extract  items from an array
                //var searchInput, i;

                searchInput = currentItems; // Make a refference to the items array
                i = searchInput().length;
                while (i--) {

                    // Get the current values 
                    var qtyValue = searchInput()[i].Qty();
                    var decValue = searchInput()[i].Description();

                    // Test condition and erase if needed
                    //
                    if (qtyValue === "" || decValue === "") {

                        searchInput.splice(i, 1);
                    }
                }


                // Switch Template
                //
                current.Mode("display");
                globalDisplayMode = 'display';



                // Bring exiting pickup into view and set the update type
                //
                globalUpdateType = 'pickup_updated';

                currentPickupUpdated = pickupID;


                // Wait a second to make sure DOM is ready
                //

                // Convert current Pickup to JSON data for server update
                //
                var submitData = ko.mapping.toJS(current);

                // Send Updated Pickup to the Server for Update
                //
                $.ajax({

                    type: "POST",
                    contentType: "application/json",
                    url: "/Pickup/UpdatePickup",
                    data: JSON.stringify(submitData)

                }).done(function (id) {

                    // Check server response mark the new updated Pickup
                    //
                    var newpID = parseFloat(id);

                    if (!isNaN(newpID)) {
                        {
                            // Mark new Update
                            //
                            currentPickupUpdated = newpID;

                            // Update Model
                            //
                            getPickups();

                        }



                    }

                }).complete(function (id) {

                    // Update Last Udpated Pickup Pointer
                    //
                    // currentPickupUpdated = id.responseJSON;

                    // Log
                    console.log("Updated Pickup " + currentPickupUpdated + " on server");

                    // Change Edit Mode toisplay mode so updates can be received again
                    //
                    globalDisplayMode = 'display';

                    // Apply any active search filter
                    searchPickupsNow();

              
                }).error(function (ex) {

                    alert("ERROR Saving Pickup #: " + " to server.");

                })

            }
        });

    })

}

function activateHelpButton() {

    // Show Help Menu
    //
    // Hide Navbar if opened
    //
    $('.navbar-collapse').removeClass('in');
    resizeNavNow();


    $('#techSupport').modal('show')

}

//#endregion

//#region File Upload Event Handlers


function sendPhotos() {

    // Send Form with photos
    //
    $(document).on("click", ".zfm-send-photo", null, function (ev) {

        //- Send File
        //
        var pickupRecord = ko.dataFor(this);

        gPickupPhotoUpdate = pickupRecord.PickupNumber();


        $('#photoUpload').modal('show');

        $('#numberOfpics').text(' ' + gTotalNumberOfPhotos + ' ');

        if (gTotalNumberOfPhotos === 1) {

            $('#singleOrmore').text(' ' + 'PHOTO' + ' ');
        }
        else {

            $('#singleOrmore').text(' ' + 'PHOTOS' + ' ');
        }


        $('#photoUploadSize').text(filesize(gTotalPhotosSize));

        $('#photoUploadSpeed').text(webSpeed.toLocaleUpperCase());


        // send photos to server
        //
        //#region AJAX form submission

        /*
        $("#photos").submit(function (e) {

            var formObj = $(this);
            var formURL = formObj.attr("action");
            var formData = new FormData(this);
            $.ajax({
                url: formURL,
                type: 'POST',
                data: formData,
                mimeType: "multipart/form-data",
                contentType: false,
                cache: false,
                processData: false,
                success: function (data, textStatus, jqXHR) {

                    // bootbox.alert("Server response: " + data);
                    bootbox.hideAll();

                    console.log('Photo update for Pickup #: ' + data);

                },
                error: function (jqXHR, textStatus, errorThrown) {

                    // bootbox.alert("Server response: " + data);
                    console.log('Photo update error for Pickup #: ' + textStatus);
                }
            });
            e.preventDefault(); //Prevent Default action. 
           
        }); // define form
        
        $("#photos").submit(); //Submit the form
        */


        //#endregion

        //#region Form File Upload with Progress bar

        var form = document.getElementById('photos');
        var formData = new FormData(form);

        var xhr = new XMLHttpRequest();

        // Set up events
        xhr.upload.addEventListener('loadstart', onloadstartHandler, false);
        xhr.upload.addEventListener('progress', onprogressHandler, false);
        xhr.upload.addEventListener('load', onloadHandler, false);
        xhr.addEventListener('readystatechange', onreadystatechangeHandler, false);

        // Begin transmission
        xhr.open('POST', '/Pickup/Files', true);
        xhr.send(formData);


        //#endregion

    });


}

// Handle the start of the transmission
function onloadstartHandler(evt) {

    //var div = document.getElementById('upload-status');
    //div.innerHTML = 'Upload started!';
    console.log('Upload started!');

}

// Handle the end of the transmission
function onloadHandler(evt) {

    // reset values
    //
    allPhotos = 0;
    numberOfPhotos = 0;
    lastPhotoName = "";

    // Save the refference to the Pickup so it can be scrolled to after the page reloads
    localStorage.setItem('pickupPhotoUpate', gPickupPhotoUpdate);
    console.log('Upload successful!');
    document.location.href = '/Pickup';

}

// Handle the progress
function onprogressHandler(evt) {

    var elem = document.getElementById('uploadProgress');
    if (elem === null)
        return;

    var percent = Math.round(evt.loaded / evt.total * 100);
    elem.innerHTML = percent + '%';
    elem.style.width = percent + '%';
    console.log('Progress: ' + percent + '%');
}

// Handle the response from the server
function onreadystatechangeHandler(evt) {
    var status = null;

    try {
        status = evt.target.status;
    }
    catch (e) {
        return;
    }

    if (status == '200' && evt.target.responseText) {
        //var result = document.getElementById('result');
        //result.innerHTML = '<p>The server saw it as:</p><pre>' + evt.target.responseText + '</pre>';
        console.log('The server saw it as: ' + evt.target.responseText);
    }
}

function checkFileB4Uoload() {

    $(document).on("change", ":file", function (event) {

        // No need to update globals because the page reloads after upload is done

        // Check all the inputs
        //
        gTotalPhotosSize = 0;
        gTotalNumberOfPhotos = 0;

        $.each($("input[type='file']"), function (k, v) {

            // Get file info
            //
            var file = this.files[0];

            // Check if file is empty
            //
            if (file === null)
                return true;
           
            var name = file.name;
            var picsize = file.size;
            var type = file.type;

            // Only Update if the photo is there
            //
            if (picsize > 1)
            {

                // check file upload limit
                //
                if (gTotalPhotosSize > gTotalPhotosLimit) {

                    bootbox.alert("<h3>PHOTO SIZE LIMIT DETECTED:</h3> </br>" +
                        "<span style='text-align: center; font-size: x-large; display: block;'><span style='width: auto; text-align: center; color: orangered;'>" + filesize(gTotalPhotoSize) + " USED: </span><span>LIMIT: 100MB </span></span>"
                        + "<br/><h3> PLEASE SELECT ANOTHER PHOTO.</h3>", function () {

                            // go back
                            event.preventDefault();
                            event.stopPropagation();
                            return false;
                        });
                }

                // Update Sizes
                //
                gTotalPhotosSize = gTotalPhotosSize + picsize;
                gTotalNumberOfPhotos++;

                var elem = this;
                var labelElem = $(this).parent()

                //update label - do this last - will trigger change event again
                $(labelElem).text(name).prepend(elem);
                
            }
            
        });

        
    });


}

function displayPhoto() {

    $(document).on("click", ".zfm-display-photo", null, function (ev) {

        // Get Pointer to current Pickup Items Collection 
        //
        var current = ko.dataFor(this);

        // If there is no picture exit
        //
        if (current.Picture1() === "none")
            return;

        // Populate Modal and show the right picture
        //
        $('#imgView').attr('src', current.Picture1());

        // Set the title and description
        //
        $('#myModalLabel').text("PICKUP #: " + current.PickupID() + "  [ " + current.Qty() + " - " + current.Description() + " ]");

        $('#picModal').modal('show')




    });
}

function rotatePhoto() {

    $(document).on("click", ".btn-rotate-photo", null, function (ev) {

        // Start from Global var at zero

        gRotation += 90;
        $("#imgView").rotate({ animateTo: gRotation })


    });



}

function scrollAfterPhotoUpload() {

    // First Check if a pointer exits using Local Storage
    //
    var pickupPhotoUpdated = localStorage.getItem('pickupPhotoUpate');

    if (pickupPhotoUpdated !== null) {


        // Remove the marker
        setTimeout(function () {

            // Scroll to this location
            markUpdatedPickup(pickupPhotoUpdated, 'photo_uploaded');
            localStorage.removeItem('pickupPhotoUpate');

        }, 1000);

    }


}

//#endregion

//#region Pickup Highlight && Template Rendering Detection

function doneRenderingItem() {

   
    // Start the Rendering counter
    gPickupsRendered++;
    console.log("Number of Pickups Rendered: " + gPickupsRendered);
    console.log("Rendering Flag set to: " + gFinishedRendering);



    // Let other fucntions know rendring is in processs
    //
    if (gFinishedRendering === true)
        gFinishedRendering = false;



    // Get current user and the User That Updated the Pickup;
    //
    var currentUser = $('#currentUserInfo').attr('data-fullname');

    // Count Pickups actually rendered
    //
    var pickupsRendered = $('.panel-primary').length;
    var editLocationsRendered = $('.loc-typeahead').length;
    var itemsRendered = $('.item-typeahead').length;
    var repsLinesRendered = $('.rep-typeahead').length;
    var couriersLinesRendered = $('.courier-typeahead').length;
    var statusLinesRendered = $('.status-typeahead').length;
    var warehouseLinesRendered = $('.warehouse-typeahead').length;
    var teamLinesRendered = $('.teams-typeahead').length;
    var destinationLinesRendered = $('.des-typeahead').length;
    var photoUploads = $(':file').length;

    // Update the counter and allow UI to update
    //
    $('numberOfPickups').text(gPickupsRendered);


    //#region  Detect the edit mode and count the number of Items have been rendered and how many are total in the selected Pickup
    //

    if (photoUploads > 0) {

        checkFileB4Uoload();

    }

    if (editLocationsRendered > 0) {

        lookupTypeahead();
        formatAllDates();

    }

    if (destinationLinesRendered > 0) {

        destinationTypeahead();
        formatAllDates();

    }

    if (repsLinesRendered > 0) {
        repsTypeahead();
        formatAllDates();

    }

    if (itemsRendered > 0) {
        itemsTypeahead();
        formatAllDates();
    }

    if (couriersLinesRendered > 0) {

        courierTypeahead();
        formatAllDates();
    }

    if (statusLinesRendered > 0) {

        statusTypeahead();
        formatAllDates();
    }

    if (warehouseLinesRendered > 0) {

        warehouseTypeahead();
        formatAllDates();

    }

    if (teamLinesRendered > 0) {

        teamsTypeahead();
        formatAllDates();

    }


    //#endregion

    // LAST ITEM RENDERED SECTION
    //
    if (pickupsRendered === globaltotalPickups) {

        //#region Update Counters and Log
        //
        console.log("Last Item Rendered: " + gPickupsRendered);
        // Let other fucntions know rendring is in processs
        //
        if (gFinishedRendering === false)
            gFinishedRendering = true;

        console.log("Redering Flag set to: " + gFinishedRendering);

        // Reset the counter
        //
        gPickupsRendered = 0;
        console.log("Item Counter reset to: " + gPickupsRendered);
        //#endregion


        //#region Mark the Last Updated Pickup
        //
        if ((gFinishedRendering) && currentPickupUpdated !== lastUpdatedPickup && globalUpdateType === '') {


            if (currentUser !== lastUpdateby) {

                // Mark Updated Pickup
                //
                lastUpdatedPickup = currentPickupUpdated;
                markUpdatedPickup(currentPickupUpdated, 'yes', 'pickup_updated');
                console.log("Done Rendering! Last Pickup updated: " + currentPickupUpdated);
            }
        }
        //
        //#endregion


        //#region Run when the same pickup is edited again
        //
        if ((gFinishedRendering) && (currentPickupUpdated === lastUpdatedPickup && globalUpdateType === '')) {

            // Make sure the values are good
            //
            if (typeof (currentPickupUpdated) === 'undefined' || typeof (lastUpdatedPickup) === 'undefined')
                return; // Exit

            // Need to check this in order to make sure we only fire for the display template
            if (globalDisplayMode === "edit")
                return;

            // Give a slight notification if its the sane item to the user
            //
            markUpdatedPickup(currentPickupUpdated, 'pickup_updated');
            
        }
        //
        //#endregion


        //#region Show Updates made locally by the Current User
        //
        if (globalUpdateType === 'pickup_updated' && typeof (currentPickupUpdated) !== 'undefined') {

                // Need to check this in order to make sure we only fire for the display template
                if (globalDisplayMode === "edit")
                    return;

                // Give a slight notification if its the sane item to the user
                //
                markUpdatedPickup(currentPickupUpdated, globalUpdateType);
                //

                // Reset Message
                //
                globalUpdateType = '';
        }
         //
        //#endregion
        
    }
   
}

function markUpdatedPickup(currentPickupUpdated, soundName) {

    // Log
    console.log("Mark Pickup For " + currentPickupUpdated + " called...");

    // Get the Alert Section of the Pickup  Item
    //
    var alertSection = $('#alert' + currentPickupUpdated);

    // If the Alert Section doesnt doesn't exist because the user is in the wrong Team exit
    //
    if (alertSection.length === 0)
        return;


    if (viewAllUpdates === true) {

        // Get the complete ID
        var viewThisPickupID = '#pu' + currentPickupUpdated;

        // Bring Pickup into View First
        $.when(
            // Bring Pickupinto View
            //
            scrollToID(viewThisPickupID, 250)).then(

            // Highlite the Pickup
            //
            markPickup(alertSection)

            ).then(

            // Play Sound
             playSound(soundName)

            );
    }

}

//#endregion

//#region Typeahead Functions

function lookupTypeahead() {

    var elem = $('.loc-typeahead');
    $('.loc-typeahead').typeahead({

        ajax: {

            url: "/Pickup/SearchAgent",
            timeout: 100,
            contentType: "application/json",
            triggerLength: 2,
            dataType: "json",
            traditional: true,
            method: "get",
            loadingClass: "loading-wait",
            preDispatch: function (query) {

                // Create a custom object for the search controller
                var postData = query + "-" + "location";

                return {
                    // search: query
                    search: postData
                }
            },
            preProcess: function (data) {

                if (data.success === false || data.length == 0) {
                    // Hide the list, there was some error
                    return false;
                }
                // We good!
                // Format data to JS Object

                // Clear the source
                //
                typeaheadSource = [];

                $(data).each(function (index, element) {

                    typeaheadSource[index] = element.label;

                });

                return (typeaheadSource);
            }
        }
    });

    console.log("Location autocomplete call finished.");

}

function destinationTypeahead() {

    var elem = $('.des-typeahead');
    $('.des-typeahead').typeahead({

        ajax: {

            url: "/Pickup/SearchAgent",
            timeout: 100,
            contentType: "application/json",
            triggerLength: 2,
            dataType: "json",
            traditional: true,
            method: "get",
            loadingClass: "loading-wait",
            preDispatch: function (query) {

                // Create a custom object for the search controller
                var postData = query + "-" + "destination";

                return {
                    // search: query
                    search: postData
                }
            },
            preProcess: function (data) {

                if (data.success === false || data.length == 0) {
                    // Hide the list, there was some error
                    return false;
                }
                // We good!
                // Format data to JS Object

                // Clear the source
                //
                typeaheadSource = [];

                $(data).each(function (index, element) {

                    typeaheadSource[index] = element.label;

                });

                return (typeaheadSource);
            }
        }
    });

    console.log("Location autocomplete call finished.");

}

function itemsTypeahead() {

    $('#SearchAgent').typeahead({
        ajax: '/Pickup/LocationTypeahead'
    });

    var elem = $('.item-typeahead');
    $('.item-typeahead').typeahead({

        ajax: {

            url: "/Pickup/SearchAgent",
            timeout: 100,
            contentType: "application/json",
            triggerLength: 2,
            dataType: "json",
            traditional: true,
            method: "get",
            loadingClass: "loading-wait",
            preDispatch: function (query) {

                // Create a custom object for the search controller
                var postData = query + "-" + "items";

                return {
                    // search: query
                    search: postData
                }
            },
            preProcess: function (data) {

                if (data.success === false || data.length == 0) {
                    // Hide the list, there was some error
                    return false;
                }
                // We good!
                // Format data to JS Object

                // Clear the source
                //
                typeaheadSource = [];

                $(data).each(function (index, element) {

                    typeaheadSource[index] = element.label;

                });

                return (typeaheadSource);
            }
        }

    });

    console.log("Items autocomplete call finished.");

}

function repsTypeahead() {

    //$('#SearchAgent').typeahead({
    //    ajax: '/Pickup/LocationTypeahead'
    //});

    var elem = $('.rep-typeahead');
    var teamName = $('#currentUserInfo').attr("data-teamname");
    $('.rep-typeahead').typeahead({

        ajax: {

            url: "/Pickup/SearchAgent",
            timeout: 100,
            contentType: "application/json",
            triggerLength: 2,
            dataType: "json",
            traditional: true,
            method: "get",
            loadingClass: "loading-wait",
            preDispatch: function (query) {

                // Create a custom object for the search controller
                var postData = query + "-" + "reps" + "-" + teamName;

                return {
                    // search: query
                    search: postData
                }
            },
            preProcess: function (data) {

                if (data.success === false || data.length == 0) {
                    // Hide the list, there was some error
                    return false;
                }
                // We good!
                // Format data to JS Object

                // Clear the source
                //
                typeaheadSource = [];

                $(data).each(function (index, element) {

                    typeaheadSource[index] = element.label;

                });

                return (typeaheadSource);
            }
        }


    });

    console.log("Reps autocomplete call finished.");

}

function courierTypeahead() {

    //$('#SearchAgent').typeahead({
    //    ajax: '/Pickup/LocationTypeahead'
    //});

    var elem = $('.courier-typeahead');
    var teamName = $('#currentUserInfo').attr("data-teamname");
    $('.courier-typeahead').typeahead({

        ajax: {

            url: "/Pickup/SearchAgent",
            timeout: 100,
            contentType: "application/json",
            triggerLength: 2,
            dataType: "json",
            traditional: true,
            method: "get",
            loadingClass: "loading-wait",
            preDispatch: function (query) {

                // Create a custom object for the search controller
                var postData = query + "-" + "couriers" + "-" + teamName;

                return {
                    // search: query
                    search: postData
                }
            },
            preProcess: function (data) {

                if (data.success === false || data.length == 0) {
                    // Hide the list, there was some error
                    return false;
                }
                // We good!
                // Format data to JS Object

                // Clear the source
                //
                typeaheadSource = [];

                $(data).each(function (index, element) {

                    typeaheadSource[index] = element.label;

                });

                return (typeaheadSource);
            }
        }


    });

}

function statusTypeahead() {

    //$('#SearchAgent').typeahead({
    //    ajax: '/Pickup/LocationTypeahead'
    //});

    var elem = $('.status-typeahead');
    var teamName = $('#currentUserInfo').attr("data-teamname");
    $('.status-typeahead').typeahead({

        ajax: {

            url: "/Pickup/SearchAgent",
            timeout: 100,
            contentType: "application/json",
            triggerLength: 2,
            dataType: "json",
            traditional: true,
            method: "get",
            loadingClass: "loading-wait",
            preDispatch: function (query) {

                // Create a custom object for the search controller
                var postData = query + "-" + "status" + "-" + teamName;

                return {
                    // search: query
                    search: postData
                }
            },
            preProcess: function (data) {

                if (data.success === false || data.length == 0) {
                    // Hide the list, there was some error
                    return false;
                }
                // We good!
                // Format data to JS Object

                // Clear the source
                //
                typeaheadSource = [];

                $(data).each(function (index, element) {

                    typeaheadSource[index] = element.label;

                });

                return (typeaheadSource);
            }
        }


    });

}

function warehouseTypeahead() {

    //$('#SearchAgent').typeahead({
    //    ajax: '/Pickup/LocationTypeahead'
    //});

    var elem = $('.warehouse-typeahead');
    var teamName = $('#currentUserInfo').attr("data-teamname");
    $('.warehouse-typeahead').typeahead({

        ajax: {

            url: "/Pickup/SearchAgent",
            timeout: 100,
            contentType: "application/json",
            triggerLength: 2,
            dataType: "json",
            traditional: true,
            method: "get",
            loadingClass: "loading-wait",
            preDispatch: function (query) {

                // Create a custom object for the search controller
                var postData = query + "-" + "warehouse" + "-" + teamName;

                return {
                    // search: query
                    search: postData
                }
            },
            preProcess: function (data) {

                if (data.success === false || data.length == 0) {
                    // Hide the list, there was some error
                    return false;
                }
                // We good!
                // Format data to JS Object

                // Clear the source
                //
                typeaheadSource = [];

                $(data).each(function (index, element) {

                    typeaheadSource[index] = element.label;

                });

                return (typeaheadSource);
            }
        }


    });

}

function teamsTypeahead() {

    //$('#SearchAgent').typeahead({
    //    ajax: '/Pickup/LocationTypeahead'
    //});

    var elem = $('.teams-typeahead');
    var teamName = $('#currentUserInfo').attr("data-teamname");
    $('.teams-typeahead').typeahead({

        ajax: {

            url: "/Pickup/SearchAgent",
            timeout: 100,
            contentType: "application/json",
            triggerLength: 2,
            dataType: "json",
            traditional: true,
            method: "get",
            loadingClass: "loading-wait",
            preDispatch: function (query) {

                // Create a custom object for the search controller
                var postData = query + "-" + "teams" + "-" + teamName;

                return {
                    // search: query
                    search: postData
                }
            },
            preProcess: function (data) {

                if (data.success === false || data.length == 0) {
                    // Hide the list, there was some error
                    return false;
                }
                // We good!
                // Format data to JS Object

                // Clear the source
                //
                typeaheadSource = [];

                $(data).each(function (index, element) {

                    typeaheadSource[index] = element.label;

                });

                return (typeaheadSource);
            }
        }


    });

}

//#endregion

//#region General Utilities

function clearPickup(elem){

    
    {
        if (elem.nodeType === 1) {

             $(elem).slideUp('slow', function () { $(elem).remove(); });
             console.log('Hide Pickup Called');
        }
    }

}

function showPickup(elem) {

    
    {
        if (elem.nodeType === 1) $(elem).hide().slideDown('slow');
        console.log('Show Pickup Called');
    }
}

function resizeNavNow() {

    setTimeout(function () {

        var newPad = $('.navbar').height() + 10;

        // adjust body according to navbar
        $('body').animate({ 'padding-top': newPad + 'px' }, 500, function () { /* /on completefunction */ });

    }, 100);
}

function autoSizeBody2NavBar() {

    // Adjust body padding according to navbar height
    //
    $('.navbar').on('shown.bs.collapse', function () {

        setTimeout(function () {

            var newPad = $('.navbar').height() + 10;

            // adjust body according to navbar
            $('body').animate({ 'padding-top': newPad + 'px' }, 500, function () { /* /on completefunction */ });

        }, 250);

    });

    $('.navbar').on('hidden.bs.collapse', function () {

        setTimeout(function () {

            var newPad = $('.navbar').height() + 10;

            // adjust body according to navbar
            $('body').animate({ 'padding-top': newPad + 'px' }, 500, function () { /* /on completefunction */ });

        }, 250);

    });


}

function priorityAlert() {

    // Find any Priority Status and make them blink and change color
    //
    $('.status-field').each(function (i, obj) {


        var status = $(this).text().toLocaleLowerCase();

        if (status.indexOf('priority') >= 0) {

            $(this).addClass('blink-now priority-status').removeClass('pickup-item-headers-2').text(status.toUpperCase());

        }

    })

    // Log
    console.log('Check for priority status complete.');

}

function convertLocTile2Uppercase() {

    $('.location-name-title, .destination-name-title').each(function (i, obj) {

        // Get the string for the date
        //
        var locName = $(this).text();

        // Convert text
        locName = locName.toUpperCase();

        // Update the title
        //
        $(this).text(locName);



    });

    // Log
    console.log('Convert Location to upper case complete.');

}

function toggleFieldLabels() {

    // Hide Navbar if opened
    //
    $('.navbar-collapse').removeClass('in');
    resizeNavNow();

    $('.field-label').each(function (i, obj) {

        // Get the string for the date
        //

        var displayValue = $(this).css('display');

        if (displayValue === 'none') {

            // Show Labels
            //
            $(this).show('slow');
            localStorage.setItem('showLabels', 'yes');

           
        }
        else
        {
            // Hide Labels
            //
            $(this).hide('slow');
            localStorage.setItem('showLabels', 'no');
                                               
        }
              

    });

    // Log
    console.log('Convert Location to upper case complete.');


}

function formatAllDates() {

    // Get all date-field elements and change value
    //
    $('.date-field').each(function (i, obj) {

        // Get the string for the date
        //
        var datenow = $(this).text();
        var width = $(window).width();

        // Convert to normal date but don't change it if it's already converted
        // and take screen size into account

        if (width > 738) {

            var cleandate = moment(datenow).format('M-D-YY LT'); //format date
            if (cleandate === "Invalid date") // The data was already formatted so leave it alone.
                return true;

            // Replace the date on the object
            //
            $(this).text(cleandate);

        }
        else {

            var cleandate = moment(datenow).format('M-D-YY h:mma'); //format date
            if (cleandate === "Invalid date") // The data was already formatted so leave it alone.
                return true;

            // Replace the date on the object
            //
            $(this).text(cleandate);


        }


    });

    // Log
    console.log('Format all dates complete.');

}

function webConnection(status) {

    switch (status) {

        default:

        case 'high':

            // Clear and Set status
            //
            $('#iStatus').removeClass();
            $('#iStatus').addClass("internet-high-speed");
            break;

        case 'medium':

            // Clear and Set status
            //
            $('#iStatus').removeClass();
            $('#iStatus').addClass("internet-medium-speed");
            break;

        case 'off':

            // Clear and Set status
            //
            $('#iStatus').removeClass();
            $('#iStatus').addClass("internet-disconnected");
            break;
    }
}

function getUsername() {

    // Get the current user name
    //
    var currentUserName = $('#userName').attr('data-username');

    return currentUserName;

}

function orientationFix4iOS() {

    if (!navigator.userAgent.match(/(iPod|iPhone|iPad)/))
        return;


    $(window).resize(function () {


        var windowSize = $(window).width();
        var height = $(window).height();
        var width = $(window).width();

        if (width > height) {

            // Landscape
            //				

            // Indicate mode to other functions
            gviewMode = 'landscape';


            setTimeout(function () {

                // Bring item into view
                //
                $(window).scrollTop($(window).scrollTop() + 1);

            }, 10);




        } else {

            gviewMode = 'portrait';

            // Portrait
            //	

            // Render Viewmodel again to active responsive tables - after landscape they wont move unless they get rendered again
            //
            setTimeout(function () {

                // Bring item into view
                //
                $(window).scrollTop($(window).scrollTop() + 1);


            }, 50);

        }

    });
}

function saveAppleinfo() {

    // Get the current info from the user
    //
    var userName = $('#currentUserInfo').attr('data-username');
    var userPassword = $('#currentUserInfo').attr('data-code');
    var userExp = $('#currentUserInfo').attr('data-codeexp');

    // Save it to the local browser
    //

    localStorage.setItem('name', userName);
    localStorage.setItem('code', userPassword);
    localStorage.setItem('exp', userExp);
}

function logUserOut() {

    // Remove all User Info From Local storage
    //
    localStorage.removeItem('name');
    localStorage.removeItem('code');
    localStorage.removeItem('exp');

    document.getElementById('logoutForm').submit();


}

function decryptCypher(cypherData) {

    var answer;

    // Call the server
    ///
    $.ajax(
    {
        url: '/Pickup/Decode',
        cache: false,
        type: 'GET',
        data: { cypher: cypherData },
        success: function (result) {

            // Do something if needed with the value

            answer = result.answer;

            globalCurrentUserPin = answer;

        }

    });


}

function scrollToID(id, speed, request) {

    // Log
    console.log("Scroll function for  Pickup " + id + " called...");

    // Wait until the rendering is complete
    //
    if (gFinishedRendering === false) {//Wait for it..

        console.log("Waiting for Rendering to finish. Pickup to process when ready:" + id);
        setTimeout(scrollToID(id, speed, request), 500);//wait half a second then recheck
        return;

    }
    else {
        setTimeout(function () {

            // Wait until DOM is Ready
            //

            // Hide Navbar if opened
            //
            $('.navbar-collapse').removeClass('in');
            resizeNavNow();


            // check if a new pickup has been created
            //
            var newpickupcreated = $('#NEW');


            // User is in the middle of creating or editing a pickup.  Do not move screen.
            // Unless it's an edit and the user is local than move the pickup into view
            //
            if (request !== 'go' && (globalDisplayMode === 'edit') || newpickupcreated.length > 0)
                return;

            var offSet = $('.navbar').height() ;

            // check if element exists and show it if valid
            //
            var elem = $(id);

            // Try to get the offset of the element
            //
            if (elem.length > 0) {

                // Get Location
                //
                var targetOffset = $(elem).offset().top - offSet;

                // If the target is available go to it
                //
                if (typeof (targetOffset) !== 'undefined') {

                    // Bring item into view
                    $('html,body').animate({ scrollTop: targetOffset }, speed);
                    
                }
            }

        }, 1500);
    }

}

function markPickup(alertElem) {

    // Log
    console.log("Highlight Pickup function called...");

    // Compute random colors for the alert
    var hue = 'rgb(' + (Math.floor(Math.random() * 256)) + ',' + (Math.floor(Math.random() * 256)) + ',' +
        (Math.floor(Math.random() * 256)) + ')';


    var highlightBg = hue;
    var animateMs = 3000;
    var originalBg = alertElem.css("backgroundColor");
    alertElem.stop().css("background-color", highlightBg).animate({ backgroundColor: originalBg }, animateMs);


}

function playSound(soundID) {


    // Play a sound if activated
    //
    if (audioALerts === true) {

        $.ionSound.play(soundID);
        // Log
        console.log("Played Sound: " + soundID + " for Pickup #: " + currentPickupUpdated);


    }

    // Reset the Pickup Counter
    currentPickupUpdated = '';

}

function initilizeSound() {

    $.ionSound({
        sounds: [                       // set needed sounds names

            "pickup_updated",
            "pickup_deleted",
            "photo_uploaded",
            "pickup_completed",
            "priority_pickup",
            "self_update",
            "cancel",
            "alert"

        ],
        path: "/Content/sounds/",                // set path to sounds
        multiPlay: false,               // playing only 1 sound at once
        volume: "1"                   // all the way up please
    });
}

function CheckPictureUpdate() {

    // Get the value of the Show this attribute to determine if a certain pickup needs to be shown
    //

    setTimeout(function () {

        var showpickup = $('#currentUserInfo').attr('data-goto');

        var value = parseFloat(showpickup);

        // Scroll 
        // 
        if (!isNaN(value)) {

            // convert string to json object
            //
            var obj = '#' + value;

            //var pickupElem = $('#' + showpickup);
            scrollToID(obj, 1000);


            // play picture update sound
            //
            if (audioALerts === true) {
                $.ionSound.play("photo_uploaded");
            }

            // clear  pickup from url so it doesnt show up again
            //
            var state = {
                "z-trak": true
            };
            history.pushState(state, "Z-Trak", "/Pickup");

        }


    }, 2000);

}

function iOSNavBarInputfix() {

    // Attach to each input element to prevent the NAVBAR from blocking data input
    // only on iOS devices
    //
    // Check version and iOS
    if (navigator.userAgent.match(/(iPod|iPhone|iPad)/)) {

        //-- Attach to events to hide navbar

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
            if (displayValue !== 'none') {
                $('.navbar').css('display', 'none');
            }
        });



    }

}

function getUrlParameter(sParam) {

    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
}

//#endregion

//#region Navbar Search Box 

function searchPickupsNow() {


    // Get the search string, if empty exit
    //
    var searchString = $('#searchFilter').val();

    if (searchString.length > 0) {

        // Activate Search Status
        //
        $('#searchSign').show().attr('title', 'Searching for: ' + searchString);

        // Execute Search Filter
        //
        $('#pickupsContainer li:not(.item-line)').hide().filter(function () {
            return $(this).text().toLowerCase().indexOf($('#searchFilter').val().toLowerCase()) !== -1;
        }).show();

        // Count how many where found and Place them on the pickup counter
        //
        var pickupsRendered = $('.panel-primary').length;

        $('#numberOfPickups:visible').val(pickupsRendered);

    }
    else {
        $('#searchSign').hide();
    }

}

function searchPickupsBox() {

    /* filter pickups as you type */
    $('#searchFilter').on('keyup click input', function () {
        if (this.value.length > 0) {

            // This line is needed to make sure items show up
            $('#pickupsContainer li:not(.item-line)').hide().filter(function () {

                // Activate Search Filter Status
                $('#searchSign').show().attr('title', 'Searching for: ' + $('#searchFilter').val());

                // Execute Search Filter
                //
                return $(this).text().toLowerCase().indexOf($('#searchFilter').val().toLowerCase()) !== -1;
            }).show();

            // Count how many where found and Place them on the pickup counter
            //
            var pickupsRendered = $('.panel-primary:visible').length;
            console.log("Pickups found with criteria: " + $('#searchFilter').val() + " = " + pickupsRendered);

            $('#numberOfPickups').text(pickupsRendered);

        }
        else {
            $('#pickupsContainer li').show();
            $('#searchSign').hide();
        }
    });


}

function activateSearchButton() {


    // Clear box if needed
    //
    var searchFilterContent = $('#searchFilter').val();


    // Check if the Search Bar is Visible
    if ($('.zfm-search-bar').is(':visible')) {

        // Turn it off
        $('.zfm-search-bar').fadeOut('slow', function () {

            setTimeout(function () {

                var newPad = $('.navbar').height() + 10;

                // adjust body according to navbar
                $('body').animate({ 'padding-top': newPad + 'px' }, 500, function () { /* /on completefunction */ });

            }, 100);



        });

        if (searchFilterContent.length > 0) {

            // Clear Search Box
            $('#searchFilter').val('');

            // Execute Empty Search Filter to show all pickups
            //
            $('#pickupsContainer li:not(.item-line)').hide().filter(function () {
                return $(this).text().toLowerCase().indexOf($('#searchFilter').val().toLowerCase()) !== -1;
            }).show();


            // Count how many where found and Place them on the pickup counter
            //
            var pickupsRendered = $('.panel-primary').length;
            console.log("Pickups found " + " = " + pickupsRendered);

            // show how many were found
            $('#numberOfPickups').text(pickupsRendered);

            // turn the icon off
            $('#searchSign').hide();

        }

    }
    else {

        // Turn it back on
        //
        $('.zfm-search-bar').fadeIn('slow', function () {

            setTimeout(function () {

                var newPad = $('.navbar').height() + 10;

                // adjust body according to navbar
                $('body').animate({ 'padding-top': newPad + 'px' }, 500, function () { /* /on completefunction */ });

            }, 100);

        });




    }




}

function enablePopOvers() {

    // Enable Popovers for all the NavBar buttons

    // Clear all
    $('.info-menu').popover('destroy');
    // Wait and build
    setTimeout(function () { $('.info-menu').popover(); }, 500);


}

//#endregion

//#region Show Elpased Time Since Data was retrived

// Calculate elapsed time since dta was retrieved from server in minutes
//
function seconds_elapsed() {
    var date_now = new Date();
    var time_now = date_now.getTime();
    var time_diff = time_now - startTime;
    var seconds_elapsed = Math.floor(time_diff / 1000);

    return (seconds_elapsed);
}

// Format seconds elapsed and format the output
//
function time_spent() {
    // TAKE THE SECONDS ELAPSED
    var secs = seconds_elapsed();

    // CONVERT SECONDS TO MINUTES AND SECONDS
    var mins = Math.floor(secs / 60);
    secs -= mins * 60;

    // CONVERT MINUTES TO HOURS AND MINUTES
    var hour = Math.floor(mins / 60);
    mins -= hour * 60;

    // Build the string so it only shows non zero units
    //
    var time2Show = "";

    if (secs > 0) { time2Show = secs } else { time2Show = "-" };
    if (mins > 0) { time2Show = mins + ":" + secs };
    if (hour > 0) { time2Show = hour + ":" + mins + ":" + secs };



    // DISPLAY THE FINAL OUTPUT TIME STRING
    //
    $('#timeElapsed').html(time2Show);

    // RECURSIVELY RE-RUN THE FUNCTION EVERY SECOND
    setTimeout("time_spent ()", 10000);
}

// Insert Leading Zero if Necesaary
function pad(num) {
    return ((num > 9) ? num : "0" + num);
}

function resetElapsedTimer() {
    startDate = new Date();
    startTime = startDate.getTime();
    $('#timeElapsed').html("-");
}


//#endregion

//#region Signal R Functions

function webConnType() {

    //#region Determine Connection Speed, Get handle on Status Elem
    //
    var webstatElem = $('#webTransportType');

    setTimeout(function () {

        if ($.connection.hub.transport.name === "webSockets") {
            webSpeed = "fast";
            webstatElem.text("F").attr("title", "Fast Internet Detected");
        }
        else if ($.connection.hub.transport.name === "forverFrame") {
            webSpeed = "ie";
            webstatElem.text("S3").attr("title", "Medium Internet Speed Detected - Internet Explorer");
        }
        else if ($.connection.hub.transport.name === "serverSentEvents") {
            webSpeed = "ss";
            webstatElem.text("S2").attr("title", "Slow Internet Speed Detected");
        }
        else if ($.connection.hub.transport.name === "longPolling") {
            webSpeed = "slow";
            webstatElem.text("S1").attr("title", "Slow Internet Speed Detected - LP");;
        }

    }, 5000);

}

//#endregion


//#endregion

function Library() {


    // Helpful snippets that can be reused
    //


    // Extract or manipulate knockout or any array

    //#region Use this method to extract  items from an array

    // remember that all arrays are refferenced in javasript so to
    // use this function with a deep copy of another array you will need to
    // use knockout utility


    // Make a deep backup copy of this Pickup
    //
    var pickupBackup = ko.mapping.fromJS(ko.mapping.toJS(current));


    // get the current Pickup Record
    //
    var current = ko.dataFor(this);

    // Make a backup copy of this Pickup
    //
    var pickupBackup = ko.mapping.fromJS(ko.mapping.toJS(current));

    // Add this to the Global backup object
    //
    gPickupUpdateBackups.push(pickupBackup);

    var searchInput, i;

    searchInput = currentItems;
    i = searchInput.length;
    while (i--) {

        // Get the current values 
        var qtyValue = searchInput()[i].Qty();
        var decValue = searchInput()[i].Description();

        // Test condition and erase if needed
        //
        if (searchInput()[i].Qty() == "") {

            searchInput.splice(i, 1);
        }
    }


    // Full sample
    bootbox.confirm("<h3>Cancel Changes?</h3>", function (result) {

        if (result === true) {

            // Get the backup copy and use it tpo restore this pickup to its original state
            //
            // Use this method to extract  items from an array
            var searchInput, i;


            searchInput = gPickupUpdateBackups;
            i = searchInput.length;
            while (i--) {

                // Get the current values 
                var currentPickupID = searchInput[i].PickupNumber();;

                //  Restore Backup Pickup Record 
                //
                if (searchInput[i].PickupNumber() === pickupID) {

                    // Restore Backup Pickup
                    //
                    var backupPU = ko.mapping.fromJS(ko.mapping.toJS(searchInput[i]));

                    // Map all the values here 

                    current.LocationName(backupPU.LocationName());
                    current.Rep(backupPU.Rep());
                    current.Manager(backupPU.Manager());
                    current.Status(backupPU.Status());
                    current.TransporterName(backupPU.TransporterName());
                    current.Notes(backupPU.Notes());
                    current.Mode(backupPU.Mode());
                    current.LocationID(backupPU.LocationID());
                    current.LocationName(backupPU.LocationName());
                    current.ID(backupPU.PickupNumber());
                    current.TransporterID(backupPU.TransporterID());
                    current.TransporterName(backupPU.TransporterName());
                    current.Rep(backupPU.Rep());
                    current.Manager(backupPU.Manager());
                    current.Account(backupPU.Account());
                    current.ShipCode(backupPU.ShipCode());
                    current.Team(backupPU.Team());
                    current.Contact(backupPU.Contact());
                    current.Fax(backupPU.Fax());
                    current.CreatedBy(backupPU.CreatedBy());
                    current.Created(backupPU.Created());
                    current.Closed(backupPU.Closed());
                    current.ClosedBy(backupPU.ClosedBy());
                    current.CancelledBy(backupPU.CancelledBy());
                    current.Cancelled(backupPU.Cancelled());
                    current.LastModified(backupPU.LastModified());
                    current.Notes(backupPU.Notes());
                    current.SortOrder(backupPU.SortOrder());
                    current.Temp(backupPU.Temp());
                    current.LastEditBy(backupPU.LastEditBy());
                    current.Mode(backupPU.Mode());

                    // Now Replace the current Items with the ones in the backup
                    //
                    var items2Remove = current.Items().length;  // Number of items to delete
                    var items2Get = backupPU.Items().length;
                    current.Items.splice(0, items2Remove); // empty all the items

                    for (var p = 0; p < items2Get; p++) {

                        // Add each item from the backup to the current
                        //
                        var item = backupPU.Items()[p];
                        current.Items.push(item);

                    }

                    // Delete from the backup array for future updates
                    //
                    searchInput.splice(i, 1);
                }
            }

            // Now change to edit mode
            //
            current.Mode("display");

            // Update Refference  so user is not interrupted by other events
            //
            globalDisplayMode = "display";

            // Bring exiting pickup into view and set the update type
            //
            globalUpdateType = 'update-cancelled';

            currentPickupUpdated = pickupID;

            // Wait a second to make sure DOM is ready
            //
            setTimeout(function () {

                // #region Format all dates and move pickup into view

                // Fix all the Dates
                //
                formatAllDates();
                markUpdatedPickup(pickupID, 'yes', 'cancel');


            }, 500);

        }
    });


    //#endregion


}