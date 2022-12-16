angular.module('appointmentscheduling')
    .controller('PatientAppointmentRequestsCtrl', ['$scope', '$rootScope', 'AppointmentService','filterFilter', 'ngGridHelper','$sce',
        function ($scope, $rootScope, AppointmentService, filterFilter, ngGridHelper, $sce) {

            // TODO: column widths

            $scope.showAppointmentRequests = false;
            $scope.showCancelAppointmentRequest = false;
            $scope.appointmentRequestToCancel;
            $scope.appointmentRequests = [];
            $scope.filteredAppointmentRequests = [];
            $scope.pagingOptions = {};
            $scope.canBook = false;
            $scope.hideActionButtons = false;

            // for the notes dialog
            $scope.showNotesDialog = false;
            $scope.notesDialogContent = '';

            $scope.init = function(patientUuid, loadOnInit, hideActionButtons, enablePagination, canBook) {

                $scope.enablePagination = enablePagination;
                $scope.canBook = canBook;
                $scope.hideActionButtons = hideActionButtons;

              // kind of hack to check it patient Uuid is equal to the string null
                if (patientUuid && patientUuid != 'null') {
                    $scope.patientUuid = patientUuid;
                }

                if (loadOnInit == null || loadOnInit) {
                    $scope.findAppointmentRequests();
                }
            }

            $scope.findAppointmentRequests = function() {

                var query = { status: 'PENDING' };
                if ($scope.patientUuid) {
                    query.patient = $scope.patientUuid;
                }

                AppointmentService.getAppointmentRequests(query).then(function (results) {

                    angular.forEach(results, function(result) {
                        // format time frame
                        var from = result.minTimeFrameValue ? result.minTimeFrameValue + ' ' + emr.message('appointmentschedulingui.timeframeunits.' + result.minTimeFrameUnits) : '';
                        var to = result.maxTimeFrameValue ? result.maxTimeFrameValue + ' ' + emr.message('appointmentschedulingui.timeframeunits.' + result.maxTimeFrameUnits) : '';
                        result['timeFrame'] = from + (to || from ? ' - ' : '') + to;

                        result['cancelRequestTooltip'] = emr.message("appointmentschedulingui.scheduleAppointment.cancelAppointmentRequest.tooltip");
                        result['bookAppointmentTooltip'] = emr.message("appointmentschedulingui.scheduleAppointment.bookAppointment.tooltip");
                        result['showNotesTooltip'] = emr.message("appointmentschedulingui.scheduleAppointment.showNotes.tooltip");
                    });

                    $scope.appointmentRequests = results;

                    $scope.pagingOptions.currentPage = 1;
                    updatePagination();

                    $scope.showAppointmentRequests = $scope.appointmentRequests && $scope.appointmentRequests.length > 0;
                })
                    .catch(function(e) {
                        console.log(e);
                    });
            }

            var updatePagination = function () {

                $scope.filteredAppointmentRequests = $scope.appointmentRequests;

                if (!$scope.$$phase) $scope.$apply();

            }


            $scope.cancelAppointmentRequest = function(uuid) {
                $scope.showNotesDialog = false;
                $scope.appointmentRequestToCancel = { uuid: uuid };
                $scope.showCancelAppointmentRequest = true;
                angular.element('#confirm-cancel-appointment-request .confirm').focus();
            }

            $scope.bookAppointment = function(row) {

                var appointmentRequest = row.entity;

                var eventData = {
                    appointmentRequest: appointmentRequest
                };

                // calculate dates, if min/max have been specified
                if (appointmentRequest.minTimeFrameValue && appointmentRequest.minTimeFrameUnits) {
                    appointmentRequest.startDate = moment(appointmentRequest.requestedOn)
                        .add(appointmentRequest.minTimeFrameValue, appointmentRequest.minTimeFrameUnits.toLowerCase()).startOf('day');
                    // start date can never be before today
                    if (appointmentRequest.startDate < moment().startOf('day')) {
                        appointmentRequest.startDate = moment().startOf('day');
                    }
                }

                if (appointmentRequest.maxTimeFrameValue && appointmentRequest.maxTimeFrameUnits) {
                    appointmentRequest.endDate = moment(appointmentRequest.requestedOn)
                        .add(appointmentRequest.maxTimeFrameValue, appointmentRequest.maxTimeFrameUnits.toLowerCase()).startOf('day');
                    // end date can never be before today
                    if (appointmentRequest.endDate < moment().startOf('day')) {
                        appointmentRequest.endDate = null;
                    }
                }

                // picked up by the schedule appointment controller
                $rootScope.$broadcast('appointmentscheduling.patientAppointmentRequests.requestSelected', eventData);
            }

            $scope.doCancelAppointmentRequest = function() {

                AppointmentService.cancelAppointmentRequest($scope.appointmentRequestToCancel).then(function(result) {
                    $scope.showCancelAppointmentRequest = false;
                    $scope.findAppointmentRequests();  // reload
                }).catch(function (e) {
                        // error callback
                        console.log(e);
                        $scope.appointmentRequestToCancel = null;
                        emr.errorMessage("appointmentschedulingui.scheduleAppointment.errorCancelingAppointmentRequest");
                    })
            }

            $scope.doNotCancelAppointmentRequest = function() {
                $scope.appointmentRequestToCancel = null;
                $scope.showCancelAppointmentRequest = false;
            }

            $scope.openNotesDialog = function(row) {
                $scope.showCancelAppointmentRequest = false;
                $scope.showNotesDialog = true;
                $scope.notesDialogContent =  row.entity.notes ? $sce.trustAsHtml(emr.formatAsHtml(row.entity.notes)) : '';
            }

            $scope.closeNotesDialog = function() {
                $scope.showNotesDialog = false;
                $scope.notesDialogContent = '';
            }

            // events emitted by other controllers that this controller handles

            // hide display if the schedule appointment app opens it's confirm dialog
            $scope.$on('appointmentscheduling.scheduleAppointment.openConfirmDialog', function() {
                $scope.showAppointmentRequests = false;
            });

            // show display if the schedule appointment app closes it's confirm dialog
            $scope.$on('appointmentscheduling.scheduleAppointment.cancelConfirmDialog', function(event, eventData) {
                $scope.showAppointmentRequests = true;
            });

            // due to a error I can't solve, we get caught in infinite angular digest lope if we initialize appointment requests
            // when a grid is not visible--so for use cases (like the appointments tab) where the grid may not be visible on load
            // we allow loading the requests on init to be disabled (see loadOnInit in the init method above) and provide
            // an event that other components can broadcast when the requests should be loaded
            // this does have the added benefit of not making the REST request until we actually need the data
            $scope.$on('appointmentRequests.loadAppointmentRequests', function () {
                $scope.findAppointmentRequests();
            })

        }])





















