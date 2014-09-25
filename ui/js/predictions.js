// Global static objects
requestStatus = {
    NOT_STARTED: 0,
    RUNNING: 1,
    FAILED: 2,
    FINISHED: 4
};

// Global objects

// A prediction is a single request to the server; a new Path is created
// and plotted once a request has completed. We keep the launch time on the
// Prediction since we need to refer to it later (the launch time inside reqParams
// has been mangled).
function Prediction(reqParams, launchtime, callback) {
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

function PredictionCollection(predData) {
    var _this = this;
    this.predData = predData;
    this.requests = [];
    this.paths = {}; // time value: path
    this.selectedPathLaunchtime = null;
    this.runningPredictions = 0;
    this.totalResponsesExpected = 0;
    this.progressBar = new ProgressBar($('#progress-bar-wrapper'));

    this.init = function() {
        _this.progressBar.show();
        _this.progressBar.set(0);
    };

    this.onPredictionUpdate = function(request) {
        switch (request.status) {
            case requestStatus.FINISHED:
                // success, make a path
                _this.runningPredictions--;
                // _this.paths[request.launchtime] = new Path(request);
                // map.hourlySlider.registerTime(request.launchtime);
                break;
            case requestStatus.FAILED:
                notifications.error('Prediction failed.');
                _this.runningPredictions--;
                break;
        }

        _this.progressBar.set(100 * (_this.totalResponsesExpected - _this.runningPredictions) / _this.totalResponsesExpected);

        if (_this.runningPredictions === 0) {
            for (var j = 0; j < _this.requests.length; j++) {
                var r = _this.requests[j];
                _this.paths[r.launchtime] = new Path(r);
                map.hourlySlider.registerTime(r.launchtime);
            }

            // all responses received
            _this.progressBar.hide();
            map.centerMapToBounds();
            map.hourlySlider.redraw();
        }

    };
    this.addPrediction = function(predData, launchTime) {
        var request = new Prediction(predData, launchTime, _this.onPredictionUpdate);
        _this.requests.push(request);
        _this.runningPredictions++;
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
