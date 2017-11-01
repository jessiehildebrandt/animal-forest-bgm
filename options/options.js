/*
 * Animal Forest BGM
 * Options Page Javascript Code
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

// This function will check if a setting is undefined. If it is, it returns the default for that setting.
function validateSetting(savedPref, prefElement) {

    // If the saved preference is defined, return it. Otherwise, find and return the element's default value.
    if (typeof(savedPref) != "undefined") {
	return savedPref;
    } else {
	if (prefElement.checkbox) { return prefElement.getAttribute("default") == "checked"; }
	else { return prefElement.getAttribute("default"); }
    }

}

// This function will toggle any secondary settings in a fieldset on the page if its main feature is disabled.
function toggleSecondarySettings(prefElement) {

    // Define an array of all of the primary feature keys and their secondary settings.
    features = {
	weatherDetection : ["WOEID"],
	showNotifications : ["notificationFormat", "notificationResolution"]
    };

    // Toggle any secondary settings that this key might have, given the state of the key.
    if (typeof(features[prefElement.name]) !== "undefined")
	for (let secondaryFeature in features[prefElement.name])
	    document.querySelector("[name=" + features[prefElement.name][secondaryFeature] + "]").disabled = !prefElement.checked;

}

// This function will handle any value changes on the page.
function handleChange() {

    // If we're saving the music volume option, make sure it's within range.
    if (this.name == "musicVolume") this.value = Math.max(0, Math.min(this.value, 100));

    // Toggle the disabled state of any secondary features of the preference, if necessary.
    toggleSecondarySettings(this);

    // Either store the element's value (if it's not a checkbox) or its checked attribute.
    var toSave = {};
    if (this.type == "checkbox")
	toSave[this.name] = this.checked;
    else
	toSave[this.name] = this.value;

    // Save the stored value to local storage.
    browser.storage.local.set(toSave);

}


// This function will update the page with the options saved in local storage.
function restoreOptions() {

    // Assemble a list of all of the preference keys on the page.
    var prefKeys = [];
    var prefElements = document.querySelectorAll("input, select");
    for (var element = 0; element < prefElements.length; element++)
	prefKeys[element] = prefElements[element].name;

    // Request a promise for all of the options saved in local storage.
    var gettingPrefs = browser.storage.local.get(prefKeys);

    // If the promise is fulfilled, restore all of the saved options onto the page.
    gettingPrefs.then((savedPrefs) => {

	// Iterate through every preference on the page.
	for (let pref = 0; pref < prefElements.length; pref++) {

	    // Get the element of the preference in question.
	    var prefElement = prefElements[pref];

	    // Either set the element's value (if it's not a checkbox) or check/uncheck it.
	    if (prefElement.type == "checkbox")
		prefElement.checked = validateSetting(savedPrefs[prefElement.name], prefElement);
	    else
		prefElement.value = validateSetting(savedPrefs[prefElement.name], prefElement);

	    // Toggle the disabled state of any secondary features of the preference, if necessary.
	    toggleSecondarySettings(prefElement);

	}

    });

}

// This function will prompt the user to reset all settings to their defaults.
function resetSettings() {

    // Assemble a list of all of the preference keys on the page.
    var prefKeys = [];
    var prefElements = document.querySelectorAll("input, select");
    for (var element = 0; element < prefElements.length; element++)
	prefKeys[element] = prefElements[element].name;

    // Prompt the user, and then clear their settings. Simple.
    if (confirm("Are you sure you want to reset all of the settings back to their defaults?")) {

	// Iterate through every preferences on the page.
	var toSave = {};
	for (let pref = 0; pref < prefElements.length; pref++){

	    // Get the element of the preference in question.
	    var prefElement = prefElements[pref];

	    // Either set the element's value to the default (if it's not a checkbox) or check/uncheck it.
	    if (prefElement.type == "checkbox")
		toSave[prefElement.name] = (prefElement.getAttribute("default") == "checked");
	    else
		toSave[prefElement.name] = prefElement.getAttribute("default");

	}

	// Save the settings and restore the saved options onto the page.
	browser.storage.local.set(toSave).then(restoreOptions);

    }

}

// This function will display the add-on's copyright information to the user.
function displayCopyright() {

    // Display the copyright information in a simple dialog box.
    window.alert("All music in this add-on is from Animal Crossing: New Leaf.\nSongs produced by Kazumi Totaka.\nAnimal Crossing: New Leaf is Copyright © 2012-2016 Nintendo Co., Ltd.\n\nBased on the \'Animal Crossing Music\' extension for Google Chrome by Andrex.");

}

// Add an event listener that will handle changes whenever anything on the page is changed.
var prefElements = document.querySelectorAll("input, select");
for (var element = 0; element < prefElements.length; element++)
    prefElements[element].addEventListener("change", handleChange);

// Add two "click" listeners to the buttons to trigger their respective functions.
document.querySelector("[name=resetSettings]").addEventListener("click", resetSettings);
document.querySelector("[name=displayCopyright]").addEventListener("click", displayCopyright);

// When the page is finished loading, restore the saved options.
document.addEventListener("DOMContentLoaded", restoreOptions);
