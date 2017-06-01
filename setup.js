/* TODO: 
                                                1.take address and convert to longitude and latitude
                                                1a.autofill geocoding of address
                                                2.make number selections into multiple selections
                                                3.add crossfilter table that filters map on selections
                                                4.add mailto functionality for Contact button
                                                5.
                                            */

// krues8dr's gist is useful here as he creates custom properties and inserts them into the markers
// https://gist.github.com/krues8dr/3040600 

// Brendan Kenney's github is useful as he incorporates Crossfilter with Google Maps
// https://github.com/brendankenny/crossfilter-and-v3/

var map;
var circles = [];
var filter;
var seatsDim;
var seatsGroup;
var latDimension;
var lngDimension;
var idDim;
var idDimension;
var idGrouping;

var center = {
        id: 0,
        lat: 38.9006,
        lng: -76.97151730000002,
        name: "Two Rivers @ Young Campus",
        address: "820 26th St NE, Washington, DC 20002"
    
}; // Two Rivers @ Young Campus

function init() {
    initMap();
    initCenter();
    initCrossfilter();

    // bind map bounds to lat/lng filter dimensions
    latDimension = filter.dimension(function(p) {
        return p.lat;
    });
    lngDimension = filter.dimension(function(p) {
        return p.lng;
    });
    google.maps.event.addListener(map, 'bounds_changed', function() {
        var bounds = this.getBounds();
        var northEast = bounds.getNorthEast();
        var southWest = bounds.getSouthWest();

        // NOTE: need to be careful with the dateline here
        lngDimension.filterRange([southWest.lng(), northEast.lng()]);
        latDimension.filterRange([southWest.lat(), northEast.lat()]);

        // NOTE: may want to debounce here, perhaps on requestAnimationFrame
        renderAll();
    });

    // dimension and group for looking up currently selected markers
    idDimension = filter.dimension(function(p, i) {
        return i;
    });
    idGrouping = idDimension.group(function(id) {
        return id;
    });

    renderAll();
}

function initMap() {
    // what does this do?
    google.maps.visualRefresh = true;

    // set the center of the map
    var myLatLng = {
        lat: center.lat,
        lng: center.lng
    }; // Two Rivers @ Young Campus
    
    // set options for the map 
    var myoption = {
        zoom: 14,
        center: myLatLng,
        mapTypeId: google.maps.MapTypeId.ROADMAP, // google maps has a list of different map types
        mapTypeControl: false, // look up this parameter; what does this do?
        streetViewControl: false, // look up this parameter; what does this do?
        panControl: false // look up this parameter; what does this do?
    };

    // initialize map
    map = new google.maps.Map(document.getElementById('map'), myoption);

    // Add circles to the map.
    // create array of circles from points and add them to the map
    // for (var i = 0; i < locations.length; i++) {
    locations.forEach(function(location, i) {        
        // var location = locations[i];

        // console.log(location);
        var content = '';
        var numKids = '';
        var numSeats = '';
        var daysAvail = '';
        var shiftAvail = '';
        var contact = '';

        if (location.kids !== undefined) {
            numKids = '<p><strong>Number of kids</strong>: ' + location.kids + '</p>';
        }

        if (location.kids !== undefined && location.numSeats !== 0) {
            daysAvail = '<p><strong>Days Available</strong>: ' + location.daysAvail.toString().split(',').join(', ') + '</p>';
            numSeats = '<p><strong>Number of open seats</strong>: ' + location.numSeats + '</p>';
            shiftAvail = '<p><strong>Pick-up or Drop-off?</strong>: ' + location.shiftAvail + '</p>';
            contact = '<br><a type="button" href="mailto:' + location.email + '?subject=Looking to Carpool?" class="btn btn-primary btn-sm">Contact</a>';
        }
        else if (location.kids !== undefined && location.numSeats === 0) {
            numSeats = '<p><strong>No open seats available</strong></p>';
        }

        var latLng = new google.maps.LatLng(parseFloat(location.lat), parseFloat(location.lng))
        var content = '<span>' + location.name + '</span></br>' +
            '<span>' + location.address + '</span></br></br>' +
            numKids +
            numSeats +
            daysAvail +
            shiftAvail +
            contact;

        var infowindow = new google.maps.InfoWindow({
            content: content
        });
    
        circles[i] = new google.maps.Circle({
            clickable: true,
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            map: map,
            center: latLng,
            radius: Math.sqrt(location.numSeats) * 100,
            position: new google.maps.LatLng(location.lat, location.lng),
        });
        
        circles[i].addListener("click", function(event) {
            // https://stackoverflow.com/questions/6584358/google-maps-v3-adding-an-info-window-to-a-circle
            infowindow.setPosition(event.latLng);
            infowindow.open(map, circles[i]);
        });

    });

}

function initCenter() {


    var marker;

    var content = '<span>' + center.name + '</span></br>' +
        '<span>' + center.address + '</span></br></br>';

    var infowindow = new google.maps.InfoWindow({
        content: content
    });

    marker = new google.maps.Marker({
        position: new google.maps.LatLng(center.lat, center.lng),
        map: map
    });
    marker.addListener("click", function(event) {
        // https://stackoverflow.com/questions/6584358/google-maps-v3-adding-an-info-window-to-a-circle
        infowindow.setPosition(event.latLng);
        infowindow.open(map, marker);
    });

}

function initCrossfilter() {
    filter = crossfilter(locations);

    // simple dimensions and groupings for major variables
    idDim = filter.dimension(function(p) {
        return p.id;
    });
    seatsDim = filter.dimension(function(p) {
        return p.seatsString;
    });
    seatsGroup = seatsDim.group().reduceSum(function(d) {
        return d.numSeats;
    });

    let seatsSelect = dc.selectMenu('#seats');
    let datatable = dc.dataTable('#datatable');
    
    seatsSelect
        .dimension(seatsDim)
        .group(seatsGroup)
        // .filterDisplayed(function () {
        //     return true;
        // })
        .multiple(false)
        .numberVisible(null)
        // .order(function (a,b) {
        //     return a.key > b.key ? 1 : b.key > a.key ? -1 : 0;
        // })
        .title(function(d) {
            return d.key;
        })
        .promptText('All Seats')
        .promptValue(null);

    seatsSelect.on('pretransition', function(chart) {
        // add styling to select input
        d3.select('#kids').classed('dc-chart', false);
        chart.select('select').classed('form-control', true);
    });

    seatsSelect.on('filtered',function(filter,i) {
       updateMarkers();
    });
    
    datatable
        .width(768)
        .height(480)
        .dimension(idDim)
        .group(function(d) {
            return d;
        })
        .showGroups(false)
        .columns(
            [{
                "label": "Name",
                "format": function(d) {
                    return d.name;
                }

            }, {
                "label": "Address",
                "format": function(d) {
                    return d.address;
                }

            }, {
                "label": "Number of Kids",
                "format": function(d) {
                    return d.kids;
                }

            }, {
                "label": "Number of Available Seats",
                "format": function(d) {
                    return d.numSeats;
                }

            }])
        .sortBy(function(d) {
            return d.numSeats;
        })
        .order(d3.descending);
        
        datatable.on('preRender',function(d) {
            
        });
}

// set visibility of markers based on crossfilter
function updateMarkers() {
  var pointIds = idGrouping.all();
  for (var i = 0; i < pointIds.length; i++) {
    var pointId = pointIds[i];
    circles[pointId.key].setVisible(pointId.value > 0);
  }
}

// Whenever the brush moves, re-render charts and map markers
function renderAll() {
  updateMarkers();
  dc.renderAll();
}

var locations = [
    {
        id: 1,
        lat: 38.888933,
        lng: -76.98249299999998,
        email: "tonmcg@gmail.com",
        name: "Ashleigh and Tony McGovern",
        address: "23 16th St SE, Washington, DC 20003",
        kidsString: "Two",
        kids: 2,
        seatsString: "None",
        numSeats: 0,
        daysAvail: ['Tu', 'Th'],
        shiftAvail: 'Drop-off'
    }, // McGovern residence
    {
        id: 2,
        lat: 38.889417,
        lng: -76.98181,
        email: "benwikler@gmail.com",
        name: "Beth and Ben Wikler",
        address: "1609 E Capitol St SE, Washington, DC 20003",
        kidsString: "Two",
        kids: 2,
        seatsString: "One",
        numSeats: 1,
        daysAvail: ['M', 'W', 'F'],
        shiftAvail: 'Drop-off'
    }, // Wikler residence
    {
        id: 3,
        lat: 38.888366,
        lng: -76.98007000000001,
        email: "babehling@gmail.com",
        name: "Bridgette and Brian Behling",
        address: "1715 A St SE, Washington, DC 20003",
        kidsString: "Two",
        kids: 2,
        seatsString: "One",
        numSeats: 1,
        daysAvail: ['F'],
        shiftAvail: 'Drop-off'
    }, // Behling residence
    {
        id: 4,
        lat: 38.894573,
        lng: -76.98435999999998,
        email: "ggdzeikan1@yahoo.com",
        name: "Ami and Gary Dziekan",
        address: "1423 D St NE, Washington, DC 20002",
        kidsString: "Two",
        kids: 2,
        seatsString: "Two",
        numSeats: 2,
        daysAvail: ['M', 'Tu', 'W', 'Th', 'F'],
        shiftAvail: 'Both'
    } // Dzeikan residence
];
