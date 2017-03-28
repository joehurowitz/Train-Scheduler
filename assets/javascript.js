


 // Initialize Firebase



var config = {
    apiKey: "AIzaSyCwX6nN3wLIShGFUA1Mv8ClJDrd916dumY",
    authDomain: "trainschedule-4d9f2.firebaseapp.com",
    databaseURL: "https://trainschedule-4d9f2.firebaseio.com",
    storageBucket: "trainschedule-4d9f2.appspot.com",
    messagingSenderId: "584606747114"
  };
firebase.initializeApp(config);
var database = firebase.database();


// Initialize Data as a Global Variable (so it can be accessed in the 1 Minute Refresh Function)
var data;


// ================================================================================


// Firebase change found - Pull New Data as soon as a database changes
database.ref().on("value", function(snapshot) {
  
  // Collect updated Firebase Data
  data = snapshot.val();

  // Update HTML Table on the DOM
  refreshTable();

});


// ================================================================================


// Submit Button Click - Collect values and Update Firebase
$("#addTrainButton").on('click', function(){

  // Collect values from the HTML Form
  var trainName = $("#trainName").val().trim();
  var trainDestination = $("#destination").val().trim();
  var trainInitialTime = $("#initialArrivalInput").val().trim();
  var trainFreq = $("#frequency").val().trim();


  // --------------------------- Sanity Checks for user inputs ---------------------------
  if(trainName == "" || trainName == null){
    alert("Please enter a Train Name!");
    return false;
  }
  if(trainDestination == "" || trainDestination == null){
    alert("Please enter a Train Destination!");
    return false;
  }
  if(trainInitialTime == "" || trainInitialTime == null){
    alert("Please enter a First Arrival Time!");
    return false;
  }
  if(trainFreq == "" || trainFreq == null || trainFreq < 1){
    alert("Please enter an arrival frequency (in minutes)!" + "\n" + "It must be an integer greater than zero.");
    return false;
  }
  // ------------------------------------------------------------------------------------

  // Parse the First Arrival Time to Check if its in military time
    // Check for 5 digits and semi-colon in the right place
  if(trainInitialTime.length != 5 || trainInitialTime.substring(2,3) != ":"){
    alert("Please use Military Time! \n" + "Example: 01:00 or 13:00");
    return false;
  }
    // Check for that Numbers are to the left and right of the semi-colon
  else if( isNaN(parseInt(trainInitialTime.substring(0, 2))) || isNaN(parseInt(trainInitialTime.substring(3))) ){
    alert("Please use Military Time! \n" + "Example: 01:00 or 13:00");
    return false;
  }
    // Check if left hand side is from 00 to 23 
  else if( parseInt(trainInitialTime.substring(0, 2)) < 0 || parseInt(trainInitialTime.substring(0, 2)) > 23 ){
    alert("Please use Military Time! \n" + "Example: 01:00 or 13:00");
    return false;
  }
    // Check if right hand side is from 00 to 59
  else if( parseInt(trainInitialTime.substring(3)) < 0 || parseInt(trainInitialTime.substring(3)) > 59 ){
    alert("Please use Military Time! \n" + "Example: 01:00 or 13:00");
    return false;   
  }

  // Edit the First Arrival Time to include the date of new data submission (for use in moment.js)
    // Collect the date upon user click
  var today = new Date();
  var thisMonth = today.getMonth() + 1;
  var thisDate = today.getDate();
  var thisYear = today.getFullYear();

    // Create a String from the Date 
  var dateString = "";
  var dateString = dateString.concat(thisMonth, "/", thisDate, "/", thisYear);

    // Create a Date and Time String for Storage
  var trainInitialArrival = dateString.concat(" ", trainInitialTime);


  // Push New Data to FireBase (generates new keys, adding to the database)
  database.ref().push({
    name: trainName,
    destination: trainDestination,
    firstArrival: trainInitialArrival,
    frequency: trainFreq
  });


  // Clear Input Fields After successful submission
  $("#trainName").val("");
  $("#destination").val("");
  $("#initialArrivalInput").val("");
  $("#frequency").val("");


  // Prevent Default Refresh of Submit Button
  return false;
});


// ================================================================================


// Function to Update the HTML Table on the DOM
function refreshTable(){

  // Clear Old Data from Browser Table
  $('.table-body-row').empty();

  // Initialize Array of Objects (for use in appending trains in order of departure for the HTML Table)
  var arrayOfObjects = [];

  // Initialize Array of Minutes Left to Departure (for use in appending trains in order of departure for the HTML Table)
  var arrayOfTimes = [];

  // =============================================================================================================
  
  // Parse & Scrub the Firebase Data and then Append to HTML Table
  $.each(data, function(key, value){

    
    // Collect variable (done for each value from Firebase)
    var trainName = value.name;
    var trainDestination = value.destination;
    var trainFreq = value.frequency;

    var trainInitialTime = value.firstArrival;
    

    // Initialize variables to be calculated
    var trainNextDeparture;
    var trainMinutesAway;


    // ----------------------- Calculate values using Moment.js -----------------------
    var convertedDate = moment(new Date(trainInitialTime));
    
    // Calculate Minutes Away
      // Find How Many Minutes Ago the very First Train Departed
    var minuteDiffFirstArrivalToNow = moment(convertedDate).diff( moment(), "minutes")*(-1);

      // --------------- Sanity Check for New Train Times ---------------
      // Negative Value - If the Train never arrived yet (first arrival date is later than now)
      if(minuteDiffFirstArrivalToNow <= 0){

        // Train Departure = Current Time - First Arrival Time
        trainMinutesAway = moment(convertedDate).diff( moment(), "minutes");

        // Next Depature Time = First Departure Time (since the train has yet to come)
        trainNextDepartureDate = convertedDate;

      }
      // Otherwise, the train arrvied in the past, so do the math
      else{

        // Next Train Departure = Frequency - (remainder of minutes from last departure)
        trainMinutesAway = trainFreq - (minuteDiffFirstArrivalToNow % trainFreq);

        // Next Departure Time = Current Time + Minutes Away
        var trainNextDepartureDate = moment().add(trainMinutesAway, 'minutes');
      }
      //----------------------------------------------------------------

    // Re-Format Time to AM/PM
    trainNextDeparture = trainNextDepartureDate.format("hh:mm A");
    //-----------------------------------------------------------------------------


    // Create a new Object for the train locally (for use in the HTML Table)
      // Its a little redundant, but much easier to parse through when creating the HTML Table 
    var newObject = {
      name: trainName,
      destination: trainDestination,
      freq: trainFreq,
      nextDeparture: trainNextDeparture,
      minAway: trainMinutesAway
    };

    // Push the new Object to the array of Objects
    arrayOfObjects.push(newObject);

    // Push the time left until depature to the array of Times
    arrayOfTimes.push(trainMinutesAway);

  });

  // =============================================================================================================

  // Sort the array of Time from smallest to largest
  arrayOfTimes.sort(function(a, b){return a-b});

  // Remove any duplicate values from the array (allowing for the Double For Loop to work properly)
  $.unique(arrayOfTimes)
    
  // Loop through all the time values and append the values to the HTML Table in order of departure time
  for(var i = 0; i < arrayOfTimes.length; i++){

    // First Loop checks through all the times, second loop checks if any of the objects match that time
    for(var j = 0; j < arrayOfObjects.length; j++){

      // The object's minutes to departue equals the next lowest value
      if(arrayOfObjects[j].minAway == arrayOfTimes[i]){

        // Append the Object's elements to the HTML Table
          // Append New HTML Table Row (done for each key from Firebase)
        var newRow = $('<tr>');
        newRow.addClass("table-body-row");

          // Create New HTML Data Cells (done for each value from Firebase)
        var trainNameTd = $('<td>');
        var destinationTd = $('<td>');
        var frequencyTd = $('<td>');
        var nextDepartureTd = $('<td>');
        var minutesAwayTd = $('<td>');

          // Add text to the HTML Data Cells
        trainNameTd.text(arrayOfObjects[j].name);
        destinationTd.text(arrayOfObjects[j].destination);
        frequencyTd.text(arrayOfObjects[j].freq);
        nextDepartureTd.text(arrayOfObjects[j].nextDeparture);
        minutesAwayTd.text(arrayOfObjects[j].minAway);

          // Append HTML Data Cells to the new Row
        newRow.append(trainNameTd);
        newRow.append(destinationTd);
        newRow.append(frequencyTd);
        newRow.append(nextDepartureTd);
        newRow.append(minutesAwayTd);

        // Append new Row to the HTML Table
        $('.table').append(newRow);

      }
    }
  }
}


// ================================================================================


// Update the Current Time every second
var timeStep = setInterval(currentTime, 1000);

function currentTime(){
  var timeNow = moment().format("hh:mm:ss A");
  $("#current-time").text(timeNow);

  // Refresh the Page every minute, on the minute
  var secondsNow = moment().format("ss");

  if(secondsNow == "00"){
    refreshTable();
  }

}