/*
 * Animal Forest BGM
 * Main Code
 * Updated Dec. 10, 2016
 * Jessie Hildebrandt
 */

/*
 * Copyright (C) 2016 Jessie Hildebrandt
 *
 * This file is part of Animal Forest BGM.
 *
 * Animal Forest BGM is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Animal Forest BGM is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Animal Forest BGM.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * Dōbutsu no Mori / Animal Forest is Copyright © Nintendo Co., Ltd.
 * Animal Crossing: New Leaf is Copyright © 2012-2016 Nintendo Co., Ltd.
 */

// TODO : Improve transition fade-in behavior by having the fade-in occur only after the new song is fully loaded.
//      - Might need to implement callback functions for this?

// Define an array of all of the keys (and their default values) that can be set by the user.
var preferences = {

    // Playback Settings
    musicVolume : {
	defaultValue : "30",
	value : null
    },
    startPaused : {
	defaultValue : false,
	value : null
    },
    mediaDetection : {
	defaultValue : true,
	value : null
    },
    fadeOnTransition : {
	defaultValue : true,
	value : null
    },
    fadeOnPause : {
	defaultValue : true,
	value : null
    },

    // Weather Detection Settings
    weatherDetection : {
	defaultValue : false,
	value : null
    },
    WOEID : {
	defaultValue : "2347597",
	value : null
    },

    // Notification Settings
    showNotifications : {
	defaultValue : true,
	value : null
    },
    notificationFormat : {
	defaultValue : "AMPM",
	value : null
    },
    notificationResolution : {
	defaultValue : "32",
	value : null
    },

    // Appearance Settings
    iconStyle : {
	defaultValue : "grey",
	value : null
    },
    badgeColor : {
	defaultValue : "#0095DD",
	value : null
    }

};

// Declare variables to hold our audio context, our gain node, and our song source.
var audioContext, gainNode, songSource;

// Declare a variable for the noisy tab timer used to detect music playback in each tab.
var noisyTabTimer;

// Declare two variables to hold the current hour, the current song's hour, and the current weather.
var currentHour, playingHour, currentWeather;

// Declare our song fade timer and initialize our fade volume variable.
var fadeTimer;
var fadeVolume = 1;

// Declare some variables to keep track of the playback state of the music.
var pausedManually = false;
var buttonDisabled = false;

// Define a function that checks on the state of the music.
function updateMusic() {

    // Get the current hour.
    currentHour = new Date().getHours();

    // If we don't have something playing yet, fix that problem.
    if (!playingHour && playingHour != 0)
	newSong(currentHour);

    // If the hour has turned and we aren't paused, update the song.
    if (playingHour != currentHour && audioContext.state == "running") {
	if (preferences.fadeOnTransition.value && fadeVolume == 1) {
	    fadeTimer = setTimeout(function () {
		fadeOutSong(2000, function () {
		    setTimeout(function () {
			newSong();
			fadeInSong(2000);
		    }, 500);
		});
	    }, 10);
	} else if (!fadeTimer) {
	    newSong();
	}
    }

    /* TODO WEATHER ( Will  be added in version 2.1.0. )
    // If we aren't paused and weather detection is enabled, check the weather.
    if (preferences.weatherDetection.value && audioContext.state == "running") {
	getWeather();
    }
    */

}

// Define a function that loads in a new song.
function newSong() {

    // Stop the song before changing it, if one is loaded into the buffer.
    if (songSource.buffer) { songSource.stop(); }

    // Open an asynchronous XML HTTP request to load the new song data through.
    var request = new XMLHttpRequest();
    request.open("GET",  browser.extension.getURL("music/hour" + currentHour + ".mp3"), true);
    request.responseType = "arraybuffer";

    // Set the onload function of the request to process the returned data.
    request.onload = function() {
	audioContext.decodeAudioData(request.response, function(data) {
	    songSource = audioContext.createBufferSource();
	    songSource.buffer = data;
	    songSource.loop = true;
	    songSource.connect(gainNode);
	    songSource.start();
	});
    }

    // Send the data request.
    request.send();

    // Update the volume of the song.
    updateVolume();

    // Update the hour for the currently playing song.
    playingHour = currentHour;

    // If notifications are enabled send a new notification.
    if (preferences.showNotifications.value) showNotification();

}

// Define a function that handles pausing music.
function pauseMusic() {

    // Only pause the music if the song is unpaused.
    if (audioContext.state == "running") {

	// If the user wants the music to fade during pausing/resuming playback, give them fading music. Otherwise, just pause it.
	if (preferences.fadeOnPause.value)
	    fadeOutSong(300, function () {
		audioContext.suspend();
	    });
	else audioContext.suspend();

	// Put a pause label on the action button.
	browser.browserAction.setBadgeText({ text : "||" });

    }

}

// Define a function that handles unpausing music.
function unpauseMusic() {

    // Only unpause the music if the song is paused.
    if (audioContext.state === "suspended") {

	// Unpause the music.
	audioContext.resume();

	// Check to see if the user wants fading music.
	if (preferences.fadeOnPause.value) {

	    // Begin the fade in.
	    fadeInSong(750);

	} else {

	    // Make sure the music isn't faded out. This is in case the user disabled the setting after/during a fade out.
	    fadeVolume = 1;
	    updateVolume();

	}

	// Remove the pause label from the action button.
	browser.browserAction.setBadgeText({ text : "" });

    }

}

// Define a short and sweet function to update the music volume.
function updateVolume()  {

    // Set the music volume, taking any fading that's going on into account.
    gainNode.gain.value = preferences.musicVolume.value / 100 * fadeVolume

}

// Define a function that fades out the current song.
function fadeOutSong(fadeLength, callbackFunction) {

    // Clear the existing fade timer to prevent overlapping fades.
    if (fadeTimer) {
	clearInterval(fadeTimer);
	fadeTime = null;
    }

    // If we haven't faded out completely yet, call this function again in a moment.
    var fadeStep = 10 / fadeLength;
    if (fadeVolume > fadeStep) {
	fadeVolume -= fadeStep;
	updateVolume();
	fadeTimer = setTimeout(function () {
	    fadeOutSong(fadeLength, callbackFunction);
	}, 10);
    }

    // Otherwise, finish muting the volume and execute the callback function, if there is one.
    else {
	fadeVolume = 0;
	if (typeof(callbackFunction) == "function") callbackFunction();
    }

}

// Define a function that fades in the current song.
function fadeInSong(fadeLength, callbackFunction) {

    // Clear the existing fade timer to prevent overlapping fades.
    if (fadeTimer) {
	clearInterval(fadeTimer);
	fadeTime = null;
    }

    // If we haven't faded back in completely yet, call this function again in a moment.
    var fadeStep = 10 / fadeLength;
    if (fadeVolume < 1) {
	fadeVolume += fadeStep;
	updateVolume();
	fadeTimer = setTimeout(function () {
	    fadeInSong(fadeLength, callbackFunction);
	}, 10);
    }

    // Otherwise, reset the volume back to normal and execute the callback function, if there is one.
    else {
	fadeVolume = 1;
	if (typeof(callbackFunction) == "function") callbackFunction();
    }

}

// Define a function that shows a notification displaying the current hour and song.
function showNotification() {

    // Initialize a variable to store the formatted time in.
    var formattedTime = currentHour + " O'Clock";

    // If AM-PM format is enabled, format the time appropriately.
    if (preferences.notificationFormat.value == "AMPM")
	if (currentHour == 0)
	    formattedTime = "12 AM";
    else if (currentHour == 12)
	formattedTime = "12 PM";
    else if (currentHour > 12)
	formattedTime = (currentHour - 12) + " PM";
    else
	formattedTime = currentHour + " AM";

    // Initialize a variable to store the formatted message in.
    var formattedMessage = "Now Playing: ";

    // If playback is paused or 24-Hour format is enabled, change the notification message.
    if (audioContext.state == "suspended" || preferences.notificationFormat.value == "24H")
	formattedMessage = "Current Time: ";

    // Push the notification with the formatted message and time string.
    browser.notifications.create("song-notification", {
	type : "basic",
	title : "Animal Forest BGM",
	message : (formattedMessage + formattedTime),
	iconUrl : browser.extension.getURL("icon/" + preferences.notificationResolution.value + ".png")
    });

}

// Define a function that re-enables the action button and resumes the music, if it was not paused beforehand.
function enableButton() {

    // Enable the action button.
    browser.browserAction.enable();
    buttonDisabled = false;

    // Set the user's badge color back to normal.
    browser.browserAction.setBadgeBackgroundColor({ color : preferences.badgeColor.value});

}

// Define a function that temporarily disables the action button and pauses the music.
function disableButton() {

    // Disable the action button.
    browser.browserAction.disable();
    buttonDisabled = true;

    // Get the current badge color and a default desatured badge color.
    var badgeColor = preferences.badgeColor.value;
    var desaturatedBadgeColor = "#7B7B7B";

    // Find the desaturated version of the user's selected badge color.
    if (badgeColor == "#E66000") desaturatedBadgeColor = "#6D6D6D";
    else if (badgeColor == "#FFCB00") desaturatedBadgeColor = "#999999";
    else if (badgeColor == "#00539F") desaturatedBadgeColor = "#515151";
    else if (badgeColor == "#0095DD") desaturatedBadgeColor = "#7B7B7B";
    else if (badgeColor == "#002147") desaturatedBadgeColor = "#232323";

    // Apply the desaturated badge color to the action button, pausing the music as soon as that's done.
    browser.browserAction.setBadgeBackgroundColor({ color : desaturatedBadgeColor });

}

// Definte a function that triggers whenever the action button is clicked.
function handleButton() {

    // Check to make sure the button isn't disabled. (Remember, the hot key can trigger this function too.)
    if (!buttonDisabled) {

	// Toggle the playback of the music.
	if (audioContext.state == "suspended") unpauseMusic();
	else pauseMusic();
	pausedManually = !pausedManually;

    }

}

// Define a function that updates the style of the action button.
function updateButton() {

    // Initialize a variable with our icon's location.
    var iconPath = "icon/";

    // If anything but the color style was specified, adjust the file path accordingly.
    if (preferences.iconStyle.value !== "color")
	iconPath += preferences.iconStyle.value + "/";

    // Update the action button with the new icons.
    browser.browserAction.setIcon({
	path : {
	    "16" : browser.extension.getURL(iconPath + "16.png"),
	    "32" : browser.extension.getURL(iconPath + "32.png"),
	    "64" : browser.extension.getURL(iconPath + "64.png"),
	    "128" : browser.extension.getURL(iconPath + "128.png"),
	    "256" : browser.extension.getURL(iconPath + "256.png")
	}
    });

    // Set the badge color to the user's selected badge color.
    browser.browserAction.setBadgeBackgroundColor({ color: preferences.badgeColor.value });

}

// Define a function that uses the new noisy tabs in Firefox 43 to detect audio playback.
function updateNoisyTabTimer() {

    // If the noisy tab timer exists, clear it.
    if (noisyTabTimer) {
	clearInterval(noisyTabTimer);
	noisyTabTimer = null;
    }

    // Make sure we're supposed to be creating a new timer.
    if (preferences.mediaDetection.value) {

	// Create a timer that will regularly trawl through the open tabs and pause the music if any are playing audio.
	noisyTabTimer = setInterval(function () {
	    var getTabs = browser.tabs.query({});
	    getTabs.then((tabList) => {
		var audioPlaying = false;
		for (let tab = 0; tab < tabList.length; tab++)
		    if (tabList[tab].audible && !tabList[tab].mutedInfo.muted && tabList[tab].mutedInfo.reason !== "capture")
			audioPlaying = true;
		if (audioPlaying) {
		    disableButton()
		    pauseMusic();
		} else {
		    if (audioContext.state == "suspended" && !pausedManually) {
			unpauseMusic();
			enableButton();
		    } else if (audioContext.state == "suspended" && pausedManually) enableButton();
		}
	    });
	}, 250);

    }

}

/* TODO WEATHER ( Will be added in version 2.1.0. )
// Define a function that finds out what the weather is like in the user's area.
function getWeather() {

    // Assemble the URL that we will be querying for weather data.
    var queryURL = "https://query.yahooapis.com/v1/public/yql?format=json&q=select item.condition.code from weather.forecast where woeid=" + preferences.WOEID.value;

    // Open an asynchronous XML HTTP request to load the weather data through.
    var request = new XMLHttpRequest();
    request.open("GET", queryURL, true);
    request.responseType = "json";

    // Set the onload function of the request to handle the returned data.
    request.onload = function () {
	var conditionCode = request.response.query.results.channel.item.condition.code;
	reactToWeather(conditionCode));
    }

    // Send the data request.
    request.send();

}
*/

/* TODO WEATHER ( Will be added in version 2.1.0. )
// Define a function that reacts to weather condition codes retrieved from Yahoo's weather API.
function reactToWeather(conditionCode) {

    // Define two arrays with the appropriate condition codes for rain and snow.
    var raining = ["1", "2", "3", "4", "8", "9", "10", "11", "12", "37", "38", "39", "40", "45", "47"];
    var snowing = ["5", "6", "7", "13", "14", "15", "16", "17", "18", "35", "41", "42", "43", "46"];

    // React to the weather if it's raining or snowing.
    if (raining.indexOf(conditionCode) != -1)
	currentWeather = "raining";
    else if (snowing.indexOf(conditionCode) != -1)
	currentWeather = "snowing";
    else
	currentWeather = "fair";

}
*/

// Define a function that handles changes in the add-on settings.
function handleSettingsChange(changes, storageArea) {

    // Check on every recorded change and process it.
    for (var change in changes) {

	// Store the changed value in memory.
	preferences[change].value = changes[change].newValue;

	// Process the change.
	switch (change) {

	case "musicVolume": // React to a change in the music volume setting.
	    updateVolume();
	    break;

	case "mediaDetection": // React to a change in the media detection setting.
	    updateNoisyTabTimer();
	    if (!preferences.mediaDetection.value) {
		if (audioContext.state == "suspended" && !pausedManually) unpauseMusic();
		enableButton();
	    }
	    break;

	case "iconStyle": // React to a change in the icon style setting.
	    updateButton();
	    break;

	case "badgeColor": // React to a change in the badge color setting.
	    updateButton();
	    break;

	}
    }

}

// Define a function that will initialize the add-on.
function initialize() {

    // Get all of the keys in our array of preferences.
    var prefKeys = Object.keys(preferences);

    // Initialize all of the keys with their default value.
    for (let pref in preferences)
	preferences[pref].value = preferences[pref].defaultValue;

    // Attempt to load in any saved values from the browser's local storage.
    browser.storage.local.get(prefKeys).then((savedPrefs) => {

	// Define an array that we'll be using to initialize any undefined preferences.
	var toSave = {}

	// Iterate through every preference key, loading existing keys and initializing undefined keys.
	for (let pref in savedPrefs) {
	    if (typeof(savedPrefs[pref]) !== "undefined") {
		preferences[pref].value = savedPrefs[pref];
	    } else {
		toSave[pref] = preferences[pref].defaultValue;
	    }
	}

	// Save the array of default values to initialize any undefined preferences.
	browser.storage.local.set(toSave);

	// Create our audio context and the buffer source to play back the song from.
	audioContext = new AudioContext();

	// Create the gain node to control the volume of the current song with, and connect it to our audio's destination.
	gainNode = audioContext.createGain();
	gainNode.gain.value = 0;
	gainNode.connect(audioContext.destination);
	songSource = audioContext.createBufferSource();

	// Attach listeners to our handleSettingsChange function to handle settings changes.
	browser.storage.onChanged.addListener(handleSettingsChange);

	// Update the action button icon according to the user's settings and add an event handler to the action button.
	updateButton();
	browser.browserAction.onClicked.addListener(handleButton);

	// Add a handler to our hotkey. It does the same thing as the action button, so they share the same function.
	browser.commands.onCommand.addListener(handleButton);

	// Set up the noisy tab timer according to the user's settings.
	updateNoisyTabTimer();

	// If it's been specified that we should do so, pause the music now that we're done initializing.
	if (preferences.startPaused.value) {
	    audioContext.suspend();
	    fadeVolume = 0;
	    pausedManually = true;
	    browser.browserAction.setBadgeText({ text : "||" });
	}

	// Run our update function once to start up the music. We give it a bit so everything can settle in before we start playing.
	setTimeout(updateMusic, 500);

	// Start an update timer that will update the music every so often.
	setInterval(updateMusic, 10000);

    });

}

// Initialize the add-on.
initialize();
