'use strict';
const Alexa = require('alexa-sdk');
const rp = require('request-promise');

//Info from geocoder.api.here.com
const app_id = "<app_id>";
const app_code = "<app_code>";
// const locationCoordsCache = {};
// const coordsLocationCache = {};

const SKILL_NAME = 'Antipodes Finder';
const HELP_MESSAGE = 'You can ask for the antipodes of any location';
const HELP_REPROMPT = 'Where would you like to find the antipodes of?';
const STOP_MESSAGE = 'Goodbye!';


const handlers = {
    'LaunchRequest': function () {
        this.emit(':ask',HELP_MESSAGE, HELP_REPROMPT);
    },
    'findAntipodes': function () {
        const location = this.event.request.intent.slots.location.value;
        let sourceLocation;
        let output;

        //Returns the output to the Alexa Service
        const returnResult = () => {
            this.emit(':tell', output);
        };

        //Given a source location string, query the geocoder to retrieve the coordinates. Pass to the callback function
        const getCoordsOfSource = (source, callback) => {
            // //Get cached value of source
            // const cachedValue = locationCoordsCache[source];
            // if(cachedValue){
            //     sourceLocation = cachedValue;
            //     callback(cachedValue);
            // } else {

            //Get coords from source though API
            rp(`https://geocoder.api.here.com/6.2/geocode.json?searchtext=${source}&app_id=${app_id}&app_code=${app_code}`)
                .then(function (result) {
                    result = JSON.parse(result);
                    const response = result.Response.View;
                    if(response.length > 0){
                        //Use the first location result
                        const firstResponseLocation = response[0].Result[0].Location;
                        //Get source info
                        const coords = firstResponseLocation.DisplayPosition;
                        sourceLocation = firstResponseLocation.Address.Label;

                        // //Cache location and coords
                        // locationCoordsCache[source] = coords;
                        // locationCoordsCache[sourceLocation] = coords;

                        callback(coords);

                    } else {
                        output = "No location found for: " + source;
                        returnResult.call(this);
                    }
                })
                .catch(function (err) {
                    output = "Error getting location from Geocoding API";
                    returnResult.call(this);
                });
            // }
        };

        const findAntipodesCoords = coords => {
           //Find the lat and lng of the antipodes
            const antipodesCoords = {
                lat: coords.Latitude * -1,
                lng: (coords.Longitude < 0) ? (Math.abs(coords.Longitude) - 180) * -1 : (Math.abs(coords.Longitude) - 180)
            };

            //Use the anitpodes coordinates to get the antipodes location
            getLocationFromCoords(antipodesCoords);
        };

        //Given the anitpodes coordinates, query the geocoder to retrieve the antipodes location
        const getLocationFromCoords = coords => {
            // //Check cache
            // if(coordsLocationCache[JSON.stringify(coords)]){
            //     const formattedResult = coordsLocationCache[coords];
            //     output = `The antipodes of ${location} is: ${formattedResult}`;
            //     returnResult.call(this);
            //     return;
            // }
            let formattedResult;

            //Get location from coords though API
            rp(`https://reverse.geocoder.api.here.com/6.2/reversegeocode.json?&mode=retrieveAddresses&prox=${coords.lat},${coords.lng},0&app_id=${app_id}&app_code=${app_code}`)
                .then(function (result) {
                    result = JSON.parse(result);
                    const response = result.Response.View;
                    if(response.length > 0){
                        const firstResponseLocation = response[0].Result[0].Location;
                        //Get antipodes info
                        formattedResult = firstResponseLocation.Address.Label;
                    } else {
                        formattedResult = "A body of water";
                    }

                    // //Cache coords and location
                    // coordsLocationCache[JSON.stringify(coords)] = formattedResult;
                    output = `The antipodes of ${sourceLocation} is: ${formattedResult}`;
                    returnResult.call(this);
                })
                .catch(function (err) {
                    output = "Error getting location from Geocoding API";
                    returnResult.call(this);
                });
        };

        //Get the coordinates of the location, find the antipodes coordinates and translate to an address
        getCoordsOfSource(location, findAntipodesCoords);

    },
    'AMAZON.FallbackIntent': function () {
        this.emit(':ask',HELP_MESSAGE, HELP_REPROMPT);
    },
    'AMAZON.HelpIntent': function () {
        this.emit(':ask',HELP_MESSAGE, HELP_REPROMPT);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', STOP_MESSAGE);
    },
    'SessionEndedRequest': function() {
      this.emit(':tell', 'Exiting...');
    }
};

exports.handler = function (event, context, callback) {
    const alexa = Alexa.handler(event, context, callback);
    alexa.registerHandlers(handlers);
    alexa.execute();
};
