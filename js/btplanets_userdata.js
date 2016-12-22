define(['js/lib/d3.min', 'js/btplanets', 'js/btplanets_ui'], function (d3, btplanets, ui) {
	'use strict';

  return {
    planetData : null,

    loadPlanetData : function () {

    }

//     (function () {
// var textFile = null,
//   makeTextFile = function (text) {
//     var data = new Blob([text], {type: 'text/plain'});
//
//     // If we are replacing a previously generated file we need to
//     // manually revoke the object URL to avoid memory leaks.
//     if (textFile !== null) {
//       window.URL.revokeObjectURL(textFile);
//     }
//
//     textFile = window.URL.createObjectURL(data);
//
//     return textFile;
//   };
//
//
//   var create = document.getElementById('create'),
//     textbox = document.getElementById('textbox');
//
//   create.addEventListener('click', function () {
//     var link = document.createElement('a');
//     link.setAttribute('download', 'info.txt');
//     link.href = makeTextFile(textbox.value);
//     document.body.appendChild(link);
//
//     // wait for the link to be added to the document
//     window.requestAnimationFrame(function () {
//       var event = new MouseEvent('click');
//       link.dispatchEvent(event);
//       document.body.removeChild(link);
// 		});
//
//   }, false);
// })();

  };
});
