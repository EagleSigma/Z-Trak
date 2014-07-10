/// <reference path="jquery-2.1.0.intellisense.js" />


var viewModel = {

    userList: ko.observableArray(),
    chosenUsers: ko.observableArray(),
    lockedUsers: ko.observableArray()

};


$(document).ready(function () {

    setTimeout(function () {

        //
        ko.applyBindings(viewModel);
              
        
    }, 3000);


    setTimeout(function () {

        manageUsers('get');
        
    }, 5000);



});

function manageUsers(requestType) {

    //#region Get data for Knockout Model
    //
    // Hide Navbar if opened
    //
    $('.navbar-collapse').removeClass('in');
    //resizeNavNow();

    // Set Data Request to let other functions know server call is in progress
    //
    console.log('Data Request For User Manager started');

    
    // Start downloading pickups
    $('#pullPickups').addClass("fa-spin");


    $.ajax({

        // Get Data From Server and disable cashing
        //
        url: "/Account/UserMgr",
        cache: false,
        data: { "UserCommand": "none", "UserName": "na" },
        type: "GET"

    }).done(function (data) {

        // Log
        console.log("Retrieved " + data.length + " Locations From Server.");

        // Get User Name
        //
        var userName = $('#currentUserInfo').attr('data-fullname');

        // Load the model
        //
        if (requestType == 'get') {

            // Populate The UserList and Chosen List for Knockout
            //
            $(data).each(function (index, element) {

                if (element.Selected === true) {
                    
                    viewModel.lockedUsers.push(element.Text)
                    viewModel.userList.push(element.Text);
                }
                else if (element.Text != userName)
                {
                    viewModel.userList.push(element.Text);
                }
                

            });

            
        }
        else if (requestType === 'save') {

            // Populate Model
            viewModel.userList = ko.mapping.fromJS(data);

        }

    }).complete(function () {


        // End of transmission
        console.log('Data request for ZFM Users done.');
        
        $('#pullPickups').removeClass("fa-spin");



    }).error(function (ex) {

        // There was an error retrieving data from the server
        //
        bootbox.alert("Error retrieving locations from server: " + ex.messageS);

    });

    //#endregion

}

function lockUser() {


    // Start downloading pickups
    $('#pullPickups').addClass("fa-spin");

    var userFullname = viewModel.chosenUsers()[0];


    $.ajax({

        // Get Data From Server and disable cashing
        //
        url: "/Account/UserMgr",
        cache: false,
        data: { "UserCommand": "lockout", "UserName": userFullname },
        type: "GET"

    }).done(function (data) {

        // Log
        console.log("Retrieved " + data.length + " Locations From Server.");

        // Clear and Load Locked User  model
        //
        viewModel.lockedUsers.removeAll()

            // Populate The UserList and Chosen List for Knockout
            //
            $(data).each(function (index, element) {

                if (element.Selected === true) {

                    viewModel.lockedUsers.push(element.Text)
                    viewModel.userList.push(element.Text);
                }
                else {
                    viewModel.userList.push(element.Text);
                }


            });


      

    }).complete(function () {


        // End of transmission
        console.log('Data request for ZFM Users done.');

        $('#pullPickups').removeClass("fa-spin");



    }).error(function (ex) {

        // There was an error retrieving data from the server
        //
        bootbox.alert("Error retrieving locations from server: " + ex.messageS);

    });

}

function unlockUser() {

    // Start downloading pickups
    $('#pullPickups').addClass("fa-spin");

    var userFullname = viewModel.chosenUsers()[0];


    $.ajax({

        // Get Data From Server and disable cashing
        //
        url: "/Account/UserMgr",
        cache: false,
        data: { "UserCommand": "unlock", "UserName": userFullname },
        type: "GET"

    }).done(function (data) {

        // Log
        console.log("Retrieved " + data.length + " Locations From Server.");

        // Clear and Load Locked User  model
        //
        viewModel.lockedUsers.removeAll()

        // Populate The UserList and Chosen List for Knockout
        //
        $(data).each(function (index, element) {

            if (element.Selected === true) {

                viewModel.lockedUsers.push(element.Text)
                viewModel.userList.push(element.Text);
            }
            else {
                viewModel.userList.push(element.Text);
            }


        });




    }).complete(function () {


        // End of transmission
        console.log('Data request for ZFM Users done.');

        $('#pullPickups').removeClass("fa-spin");



    }).error(function (ex) {

        // There was an error retrieving data from the server
        //
        bootbox.alert("Error retrieving locations from server: " + ex.messageS);

    });

}