define(['js/lib/d3.min', 'js/btplanets'], function (d3, btplanets) {
	'use strict';

  return {
    planetData : null,

	modifiedUserData : {},
	userDataSaveTimeout : null,

	textFile : null,

	scheduleUserDataSave : function (planet) {
		clearTimeout(this.userDataSaveTimeout);
		this.modifiedUserData[planet.name] = planet.userData;
		this.userDataSaveTimeout = setTimeout(this.saveModifiedUserData.bind(this), 1000);
	},

	saveModifiedUserData : function () {
		for(var key in this.modifiedUserData) {
			if(!this.modifiedUserData.hasOwnProperty(key)) {
				continue;
			}
			if(!!this.modifiedUserData[key]) {
				localStorage.setItem(key, this.modifiedUserData[key]);
			} else {
				localStorage.removeItem(key);
			}
		}
		this.modifiedUserData = {};
		this.fireEvent('userdatasaved');
	},

	exportToTextFile : function () {
		var textFile = null;
		var now = new Date();
		var timestamp = '';
		timestamp += now.getFullYear();
		timestamp += this.padInteger(now.getMonth() + 1, 2);
		timestamp += this.padInteger(now.getDate(), 2);
		timestamp += this.padInteger(now.getHours(), 2);
		timestamp += this.padInteger(now.getMinutes(), 2);
		timestamp += this.padInteger(now.getSeconds(), 2);

		var userdataJSON = JSON.stringify({obj: 'test'});

		var link = document.createElement('a');
		link.setAttribute('download', 'innersphere-userdata-'+timestamp+'.json');
		link.href = this.makeTextFile(userdataJSON);
		document.body.appendChild(link);

		// wait for the link to be added to the document
	    window.requestAnimationFrame(function () {
	      var event = new MouseEvent('click');
	      link.dispatchEvent(event);
	      document.body.removeChild(link);
		});
	},

  	makeTextFile : function (text) {
    	var data = new Blob([text], {type: 'text/plain'});

	    // If we are replacing a previously generated file we need to
	    // manually revoke the object URL to avoid memory leaks.
	    if (this.textFile !== null) {
	      window.URL.revokeObjectURL(this.textFile);
	    }
    	this.textFile = window.URL.createObjectURL(data);

    	return this.textFile;
  	},

	padInteger : function (int, totalNumChar) {
		var str = int + '';
		totalNumChar = totalNumChar || 1;
		while(str.length < totalNumChar) {
			str = '0' + str;
		}
		return str;
	}
  //
  //
  //
  //
  // var create = document.getElementById('create'),
  //   textbox = document.getElementById('textbox');
  //
  // create.addEventListener('click', function () {
  //   var link = document.createElement('a');
  //   link.setAttribute('download', 'info.txt');
  //   link.href = makeTextFile(textbox.value);
  //   document.body.appendChild(link);
  //
  //


  };
});
