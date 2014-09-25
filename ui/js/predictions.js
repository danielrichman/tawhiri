// Global static objects
requestStatus = {
    NOT_STARTED: 0,
    RUNNING: 1,
    FAILED: 2,
    FINISHED: 4
};

// Global objects

// A request is a single request to the server for a path; a new Path is created
// and plotted once a request has completed. We keep the launch time on the
// Request since we need to refer to it later (the launch time inside reqParams
// has been mangled).
function Request(reqParams, launchtime, callback) {
    var _this = this;
    this.api_url = '/api/v1/';
    this.statusPollInterval = 1000; //ms
    this.statusCheckTimeout = 15000; //ms
    this.status = requestStatus.NOT_STARTED;
    this.reqParams = reqParams;
    this.launchtime = launchtime;
    this.callback = callback;
    this.predData = null;
    this.submit = function() {
        $.ajax({
            data: _this.reqParams,
            url: _this.api_url,
            type: 'GET',
            dataType: 'json',
            error: function(xhr, status, error) {
                var py_error = xhr.responseJSON.error;
                notifications.alert('Prediction error: ' + py_error.type + ' ' + py_error.description);
                console.log('Prediction error: ' + status + ' ' + error + ' ' + py_error.type + ' ' + py_error.description);
                _this.status = requestStatus.FAILED;
                _this.callback(_this);
            },
            success: function(data) {
                _this.predData = data.prediction;
                _this.status = requestStatus.FINISHED;
                _this.callback(_this);
            }
        });
    };
}

// A prediction is a collection of "requests": there may be multiple requests for one
// prediction if the user has asked for multiple "hourly" predictions.
function Prediction(predData) {
    var _this = this;
    this.predData = predData;
    this.requests = [];
    this.paths = {}; // time value: path
    this.selectedPathLaunchtime = null;
    this.runningRequests = 0;
    this.totalResponsesExpected = 0;
    this.progressBar = new ProgressBar($('#progress-bar-wrapper'));

    this.init = function() {
        _this.progressBar.show();
        _this.progressBar.makeAnimated();
    };

    this.onRequestUpdate = function(request) {
        switch (request.status) {
            case requestStatus.FINISHED:
                // success, make a path
                _this.runningRequests--;
                _this.paths[request.launchtime] = new Path(request);
                map.hourlySlider.registerTime(request.launchtime);
                break;
            case requestStatus.FAILED:
                notifications.error('Request failed.');
                _this.runningRequests--;
                break;
        }

        if (_this.progressBar.isAnimated) {
            _this.progressBar.makeStatic();
        }
        _this.progressBar.set(100 * (_this.totalResponsesExpected - _this.runningRequests) / _this.totalResponsesExpected);

        if (_this.runningRequests === 0) {
            // all responses received
            _this.progressBar.hide();
            //console.log(currentTimeouts);
            map.centerMapToBounds();
            map.hourlySlider.redraw();
        }

    };
    this.addRequest = function(predData, launchTime) {
        var request = new Request(predData, launchTime, _this.onRequestUpdate);
        _this.requests.push(request);
        _this.runningRequests++;
        _this.totalResponsesExpected++;
        request.submit();
    };

    this.dimAllPaths = function() {
        $.each(_this.paths, function(launchtime, path) {
            path.dim();
        });
    };
    this.selectPathByTime = function(launchtime) {
        //console.log(launchtime, _this.selectedPathLaunchtime, _this.paths[launchtime]);
        if (_this.selectedPathLaunchtime !== null) {
            if (_this.selectedPathLaunchtime === launchtime) {
                return;
            }
            _this.paths[_this.selectedPathLaunchtime].dim();
        } else {
            _this.dimAllPaths();
        }
        if (_this.paths[launchtime] != undefined) {
            _this.paths[launchtime].unDim();
            _this.selectedPathLaunchtime = launchtime;
        } else {
            _this.selectedPathLaunchtime = null;
        }
    };

    this.remove = function() {
        $.each(_this.paths, function(launchtime, path) {
            if (path.pathCollection) {
                for (var j = 0; j < path.pathCollection.length; j++) {
                    path.pathCollection[j].setMap(null);
                }
            }
        });
        delete _this.paths;
    };

    this.init();
    return this;
}
