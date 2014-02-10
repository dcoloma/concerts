  // Global Attributes	
  var userLat = 41.64; // user's current latitude or null if they searched by city
  var userLng = -0.88; // user's current longitude or null if they searched by city

  // Pagination Control
  var page = 1; // current page for last.fm requests
  var newPage = 1;  // next page for last.fm reqeusts
  var totalPages = 1; // total number of pages in last.fm answer
  var lastPage = false; // are we on the last page

  // Pages containers
  var pages; // pages to be displayed for gig details
  var tweets;
  var mails;
  var smss;

   // Configuration Data
  var radio = "25"; // radio de búsqueda en km
  var amount = 30; // number of gigs per page
  var baseUrl = "http://ws.audioscrobbler.com/2.0/?method=geo.getevents&api_key=a0794c9653eaeb2f94ad10bb53fc5ea8&format=json&distance=" + radio + "&limit=" + amount;

  /* Method invoked when JQueryMobile is initialized*/
  $(document).bind("mobileinit", function(){
	  $.mobile.loadingMessage = "Loading";
	  $.mobile.page.prototype.options.addBackBtn = true;
  });

  /** AJAX callback for error while retrieving data from lastfm */
  function errorResponse(message)
  {
	  $.mobile.pageLoading(true);
	  console.log("error in AJAX request: " + message);
    // XXX - Localize
    displayError("Connection with Last.fm failed, try it later");
  }

  // Retrieves the content from last.fm for a particular page
  function getGigs()
  {
    console.log("Entering in method getGigs with page " + newPage);
    url = baseUrl + "&lat=" + encodeURI(userLat) + "&long=" + encodeURI(userLng);

    // Display loading message
    // XXX - Localize
    $.mobile.loadingMessage = "Getting concerts from last.fm";
    $.mobile.pageLoading();
			
    try 
    {
      url = url + encodeURI("&page=") + encodeURI(newPage);
      console.log("URL request is " + url);
	    ajaxRequest(showGigs, errorResponse, {requestType:"GET", uri:url}, "JSON");
	  } 
	  catch (e) 
	  {
	    console.log("Request Error: " + e.message);
      // XXX - Localize
      displayError("Connection with Last.fm failed, try it later");
	  }
  }
		
  // Shows the events, to be called when the events have been retrieved
  // the input argument (data) contains the json representation of the
  // gigs received in the XHR
  function showGigs(data)
  {
	  // This is the current content of the event list
	  text = document.getElementById('evList').innerHTML;
		
    // First we check if an error has occured
    if(data.events == null)
    {
      console.log("ERROR while retrieving the gigs with code " + data.error + " and message " + data.message);
      // XXX - Localize
      displayError("No concerts could be found. Reason: " + data.message);
    }
    else
    {
      // check what is current and next pages and prepares following one
      prepareNextPage(data.events['@attr'].page, data.events['@attr'].totalPages);
			
	    var cont = 0; // Number of items parsed
			
      // If it is the first page (first request, new location, refresh...) 
      // we need to clean-up the list
	    if (page === 1)
	    {
	      text =""; // clean-up the list
   	    pages = new Array(); // every element content the text of the detailed page event
	      tweets = new Array(); // array for tweet pages
	      mails = new Array(); // array for emails pages
        smss = new Array(); // array for sms pages
	    }
	    else
	    {
		    cont = (page-1)*amount; // Identify the position for paging next time
      }
				
      // For each event the list item is build
	    for (var i = 0; i < data.events.event.length; i++) 
	    {
        // There are many images for every last.fm event, we need to identify 
        // which to be used, the large image will be the preferred one
	      var images = data.events.event[i].image;
		    var imageToUse;
	    
        for (var j = 0; j < images.length; ++j) 
	      {
          imageToUse = images[j]["#text"];
	        if (images[j].size == "large") 
	  	      break;
	      }
	    
        if (imageToUse == "")
		      imageToUse = "images/default.jpg";

        // Process the date
		    var tokens = data.events.event[i].startDate.split(',',3);
		    var dayOfWeek = tokens[0];
		    var date = tokens[1];
		    tokens = date.split(' ');
		    var day = tokens[1];
		    var month = tokens[2];
		    var year = tokens[3];
		    var time = tokens[4];
		    tokens = time.split(":");
		    var hour = tokens[0];
		    var minute = tokens[1];
           
        // Name of the venue
        var website = "<h3 align=center>" + data.events.event[i].venue.name + "</h3>";
        // If there is a link to the website we include it
        if (data.events.event[i].venue.website != "")
           website = "<h3 align=center><a href='"+ 
            data.events.event[i].venue.website + "' target='_blank'>" + 
            data.events.event[i].venue.name + "</a></h3>";
              
        var address = "";
            
        if (data.events.event[i].venue.location.street != "")
          address += data.events.event[i].venue.location.street + ", ";  
          
        // This is the text that will be included in the gig list  
        text +="<li><a href='javascript:loadDetailsPage(" + cont + ");'>"+
          "<img src='" + imageToUse + "'  width='75' height='75'/>" + 
          "<h3>" + data.events.event[i].title + "</h3>" +
          "<p>" /*+ dayOfWeek + " "*/ + day + " " + month + " " + year + 
          "</p><p>" + data.events.event[i].venue.name + " (" + 
          data.events.event[i].venue.location.city + ")" + "</p>" + 
          "</a></li>";   
       
        // For every event we also prepare the details page to be loaded if
        // the user selects that event, and the content of the tweet and
        // e-mail buttons
        pages[cont] = "<h2 align='center'><a href='http://www.last.fm/event/" + 
                      data.events.event[i].id +"' target='_blank'>" + data.events.event[i].title + 
                      "</a></h2><h3 align='center'>" /*+ dayOfWeek + ", "*/ + day + " " + 
                      month + " " + year + "</h3>" + website + "<p align=center>"+ 
                      address + data.events.event[i].venue.location.city + ", " + 
                      data.events.event[i].venue.location.country + 
                      "</p><p align=center><a href='http://maps.google.com/?q=" + 
                      data.events.event[i].venue.location["geo:point"]["geo:lat"] + 
                      "," + data.events.event[i].venue.location["geo:point"]["geo:long"] + 
                      "' target='_blank'><img align='center' src='http://maps.google.com/maps/api/staticmap?center=" + 
                      data.events.event[i].venue.location["geo:point"]["geo:lat"] + 
                      "," + data.events.event[i].venue.location["geo:point"]["geo:long"] +
                      "&zoom=15&size=200x250&sensor=true&markers=color:blue%7Clabel:S%7C" +
                      data.events.event[i].venue.location["geo:point"]["geo:lat"] + 
                      "," + data.events.event[i].venue.location["geo:point"]["geo:long"] + 
                      "'/></a></p><h4 align=center>" + data.events.event[i].description + "</h4>";
  
        // Summary of the event to be displayed in the list of events
        var summary = encodeURI(data.events.event[i].artists.headliner + " in  " + 
                      data.events.event[i].venue.location.city + 
                      " (" + dayOfWeek + ", " + day + " " + month + ")");
                                     
        // For every event I will create a link to tweet it, when the tweet
        // button is clicked, this link is used
        // XXX - Localize
        tweets[cont] = "<a target='_blank' href='http://twitter.com/share?text=" + 
                       summary + "&url=" + encodeURI("http://www.last.fm/event/" + 
                       data.events.event[i].id) + "&via=appconcerts" +
                       "'> <img src='images/twitter.png' width='40' height='40'> </a>";
                  
        mails[cont] = "<a target='_blank' href='mailto:?body=I discovered it through the FirefoxOS Concerts application. More details about the gig are available at " + 
                      encodeURI("http://www.last.fm/event/"+data.events.event[i].id) + 
                      "&subject=" + summary +"'><img src='images/email.png' width='40' height='40'> </a>";

        smss[cont] = "<a href='sms:?body=" + summary + ". I discovered it through the FirefoxOS Concerts application. More details about the gig available at " + 
                      encodeURI("http://www.last.fm/event/"+ data.events.event[i].id)+"'><img src='images/sms.png' width='40' height='40'> </a>";

        cont++;
      }
				
      // Replace the content of the lsit
      document.getElementById("evList").innerHTML = text;
	    // equivalent to jquery way: $('#evList').html(text);

      // If there are more items we displayed the "more" options button
      if (lastPage === false)
        document.getElementById("plus").innerHTML = "<a href='javascript:getGigs()' data-role='button' data-icon='plus' data-inline='true' data-iconpos='notext' title='More' data-theme='c' class='ui-btn ui-btn-up-c ui-btn-inline ui-btn-icon-notext ui-btn-corner-all ui-shadow'span class='ui-btn-inner ui-btn-corner-all'span class='ui-btn-text'More</span><span class='ui-icon ui-icon-plus ui-icon-shadow'span></span></a>";
      else
        document.getElementById("plus").innerHTML = "";
       
      $('#evList').listview('refresh');
           
    } 
    
    // In any case we remove loading message
    $.mobile.pageLoading(true);
  }
		
  // Prepares paging, it should be invoked every time a new XHR has been
  // successfully performed. The idea is to identify if we are already
  // in the last page and identify what is the next page (if any)
  function prepareNextPage(currentPage, totalPages)
  {
    page = parseInt(currentPage);
    totalPages = parseInt(totalPages);
    newPage = page + 1;
    if (newPage > totalPages)
    { 
      newPage = totalPages;
	    lastPage = true;
	  }			
	  else
	  {
	    lastPage = false;
	  }
  }

 /**
  * Replaces the content of the details page with the detailed info
  * of the gig
  */
  function loadDetailsPage(index)
  {
    document.getElementById('detailsContent').innerHTML = pages[index];
    document.getElementById('twitterButton').innerHTML = tweets[index];
    document.getElementById('mailButton').innerHTML = mails[index];
    document.getElementById('smsButton').innerHTML = smss[index];
    $.mobile.changePage("#details");
  }

 /**
  * Shows an error message (the one passed as input argument)
  */
  function displayError(message)
  {
    document.getElementById('errorText').innerHTML = message;
    $.mobile.changePage('#errorMessage', 'pop');
  }

		 
  // Get the coords of a location
  function oncitysubmit() 
  {
    console.log("oncitysubmit with city " + document.cityform.search.value);

    try
	{		
	  geocoder = new google.maps.Geocoder();
      // Read the city from the text input
	  var city = trim(document.cityform.search.value);
			
      // Obtain the coordinates of the city
	  if (city.length > 0) 
	  {
	    geocoder.geocode( { 'address': city}, function(results, status) {
	      if (status == google.maps.GeocoderStatus.OK) {
	        userLat=results[0].geometry.location.lat();
	        userLng=results[0].geometry.location.lng();
            console.log("oncitysubmit obtained coordinates " + userLat + " , " + userLng);
            page = 1;
            newPage = 1;           
	        getGigs();
	      } else {
		      console.log("Geocode was not successful for the following reason: " + status);
          // XXX - Localize
          displayError("No coordinates have been found for the location");
        }
		  });
	  }
	  else 
	  {
      // XXX - Localize
	    displayError("Please enter a city name.");
	  }
	}
	catch(e){
      console.log("Exception while retrieving coordinates " + e.message);  
      // XXX - Localize
      displayError("No coordinates have been found for that location");
    }
  }			
			
  function trim(string)
  {
	// remove leading and trailing whitespace from text and return it.
	var result = string.replace(/^[\s]+/g, "").replace(/[\s]+$/g, "");
	return result;
  }

/**
   * Tries to retrieve the current location asynchronously
   */
  function requestLocation(){
    console.log("requestLocation")

	try {
	  $.mobile.loadingMessage = "Retrieving your location";
	  $.mobile.pageLoading();
	  navigator.geolocation.getCurrentPosition(onposition, onpositionerror, {timeout:10000, maximumAge:120000});
    }catch(e){
      onpositionerror(e);
    }
  }

  /**
   * This method is invoked in case current position is retrieved
   * successfully (see requestLocation for details how it is done)
   */
  function onposition(position){
	console.log("Location Retrieved Successfully: onposition");
				
    $.mobile.pageLoading(true);
			  
    if(position != null){
      userLat = position.coords.latitude;
      userLng = position.coords.longitude;
      console.log("With coordinates " + userLat + "," + userLng);
      // intentamos saber la correspodencia a localidad
      getAddressWithCoords(userLat, userLng);
      page = 1;
      newPage = 1;
      // Pedimos los conciertos
      getGigs();
    }else{
      // XXX - Localize
      displayError("Your position could not be retrieved, please try it again or introduce manually your location.");
    }
  }

 /**
  * This method is invoked in case current position cannot be retrieved
  *  (see requestLocation for details how it is done)
  */ 
  function onpositionerror(error)
  {
    console.log("Error while retrieving location " + error.message);
    $.mobile.pageLoading(true);
    // XXX - Localize
    displayError("Your position could not be retrieved, please try it again or introduce manually your location.");
  }

 /**
  * Obtains the address for some coordinates, in any case when the 
  * address has been retrieved or it has failed, the text input content
  * is replaced with the method updateLocation
  */
  function getAddressWithCoords(lat, lng)
  {
   	city = "Using GPS location";  
  	var latlng = new google.maps.LatLng(lat, lng);
    geocoder = new google.maps.Geocoder();      
      	
   	try 
   	{      
   	  geocoder.geocode({'latLng': latlng, 'language': 'es'}, function(results, status) {
        if (status == google.maps.GeocoderStatus.OK) 
        {
          console.log("Geocoding OK, location obtained");
          if (results[1]) 
          {
            console.log("Resultado " + results[2].formatted_address); 
            var tokens = results[2].formatted_address.split(',',2);
            city = tokens[0];
            city = trim(city.replace(/[0-9]/g,''));
            console.log("The city is " + city);    
          } 
          else 
          {
            console.log("No address found");
          }
        } 
	      else 
	      {
	        console.log("Impossible retrieving locality for your current location - Error code: " + status);
        }
	      updateLocation(city);
	    });
	  }
	  catch(e)
	  {
      console.log("Impossible retrieving locality for your current location - Error code: " + e.message);
      updateLocation(city);
    }
  }  
	
  // Refreshes the text input with the name of the city that is passed
  // as input argument
  function updateLocation(city)
  {
    document.cityform.search.value = city;
  }

