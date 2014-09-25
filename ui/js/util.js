services = {
    geolocation: {
        getIPPosition: function(callback) {
            $.get('http://freegeoip.net/json/', null, function(data) {
                if (isNumber(data.latitude) && isNumber(data.longitude)) {
                    callback(new google.maps.LatLng(data.latitude, data.longitude));
                }
            }).fail(function() {
                console.log('IP Geolocation position failed');
                callback(null);
            });
        },
        gpsGeolocation: navigator.geolocation,
        getGPSPosition: function(callback) {
            navigator.geolocation.getCurrentPosition(callback);
        }
    },
    // prepare elevation service
    elevator: new google.maps.ElevationService()
};

// Global functions
function nearestMinute(date, minutes) {
    if (minutes === null) {
        minutes = 1;
    }
    var coeff = 1000 * 60 * minutes;
    return new Date(Math.round(date.getTime() / coeff) * coeff);
}
function ceilMinute(date, minutes) {
    if (minutes === null) {
        minutes = 1;
    }
    var coeff = 1000 * 60 * minutes;
    return new Date(Math.ceil(date.getTime() / coeff) * coeff);
}
function floorMinute(date, minutes) {
    if (minutes === null) {
        minutes = 1;
    }
    var coeff = 1000 * 60 * minutes;
    return new Date(Math.floor(date.getTime() / coeff) * coeff);
}
function padTwoDigits(x) {
    x = x + "";
    if (x.length === 1) {
        x = "0" + x;
    }
    return x;
}
function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}
function formatTime(d) {
    return padTwoDigits(d.getHours()) + ":" + padTwoDigits(d.getMinutes());
}
function feetToMeters(feet) {
    return 0.3048 * feet; // 1 meter == 0.3048 ft
}

// GLOBALS
var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
var shortDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
