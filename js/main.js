/**
 *  main.js
 *
 *  Created by Junichi Kitano, Fixstars Corporation on 2013/05/15.
 * 
 *  Copyright (c) 2013, TOSHIBA CORPORATION
 *  All rights reserved.
 *  Released under the BSD 2-Clause license.
 *   http://flashair-developers.com/documents/license.html
 */
// JavaScript Document

// Judge the card is V1 or V2.
function isV1(wlansd) {
	if (wlansd.length == undefined || wlansd.length == 0) {
		// List is empty so the card version is not detectable. Assumes as V2.
		return false;
	} else if (wlansd[0].length != undefined) {
		// Each row in the list is array. V1.
		return true;
	} else {
		// Otherwise V2.
		return false;
	}
}
// Convert data format from V1 to V2.
function convertFileList() {
	for (let i = 0; i < wlansd.length; i++) {
		const elements = wlansd[i].split(",");
		wlansd[i] = new Array();
		wlansd[i]["r_uri"] = elements[0];
		wlansd[i]["fname"] = elements[1];
		wlansd[i]["fsize"] = Number(elements[2]);
		wlansd[i]["attr"] = Number(elements[3]);
		wlansd[i]["fdate"] = Number(elements[4]);
		wlansd[i]["ftime"] = Number(elements[5]);
	}
}
// Callback Function for sort()
function cmptime(a, b) {
	if (a["fdate"] == b["fdate"]) {
		return a["ftime"] - b["ftime"];
	} else {
		return a["fdate"] - b["fdate"];
	}
}
// Show file list
function showFileList(path) {
	// Clear box.
	$("#list").html('');
	// Output a link to the parent directory if it is not the root directory.
	if (path != "/") {
		$("#list").append(
			$("<div></div>").append(
				$('<a href="javascript:void(0)" class="dir">..</a>')
			)
		);
	}
	$.each(wlansd, function() {
		const file = this;
		// Skip hidden file.
		if (file["attr"] & 0x02) {
			return;
		}
		// Make a link to directories and files.
		const filelink = $('<a href="javascript:void(0)"></a>');
		const caption = file["fname"];
		const fileobj = $("<div></div>");
		if (file["attr"] & 0x10) {
			filelink.addClass("dir");
		} else {
			filelink.addClass("file").attr('href', file["r_uri"] + '/' + file["fname"]).attr("target", "_blank");
		}
		// Append a file entry or directory to the end of the list.
		$("#list").append(
			fileobj.append(
				filelink.append(
					caption
				)
			)
		);
	});
}
//Making Path
function makePath(dir) {
	const arrPath = currentPath.split('/');
	if (currentPath == "/") {
		arrPath.pop();
	}
	if (dir == "..") {
		// Go to parent directory. Remove last fragment.
		arrPath.pop();
	} else if (dir != "" && dir != ".") {
		// Go to child directory. Append dir to the current path.
		arrPath.push(dir);
	}
	if (arrPath.length == 1) {
		arrPath.push("");
	}
	return arrPath.join("/");
}
// Get file list
function getFileList(dir) {
	// Make a path to show next.
	const nextPath = makePath(dir);
	// Make URL for CGI. (DIR must not end with '/' except if it is the root.)
	const url = "/command.cgi?op=100&DIR=" + nextPath;
	// Issue CGI command.
	$.get(url, (data) => {
		// Save the current path.
		currentPath = nextPath;
		// Split lines by new line characters.
		wlansd = data.split(/\n/g);
		// Ignore the first line (title) and last line (blank).
		wlansd.shift();
		wlansd.pop();
		// Convert to V2 format.
		convertFileList(wlansd);
		// Sort by date and time.
		wlansd.sort(cmptime);

		// Show
		showFileList(currentPath);
	});
}
//UploadProcess
function doUpload() {
	const path = makePath(".");
	const cgi = "/upload.cgi";
	const dt = new Date();
	const year = (dt.getFullYear() - 1980) << 9;
	const month = (dt.getMonth() + 1) << 5;
	const date = dt.getDate();
	const hours = dt.getHours() << 11;
	const minites = dt.getMinutes() << 5;
	const seconds = Math.floor(dt.getSeconds() / 2);
	const notification = $("#uploadStatus");
	const timestring = "0x" + (year + month + date).toString(16) + (hours + minites + seconds).toString(16);
	const uploadFiles = $("#file")[0].files;
	const uploadFileLength = uploadFiles.length
	$.get(cgi + "?WRITEPROTECT=ON&UPDIR=" + path + "&FTIME=" + timestring, async () => {
		for (let i = 0; i < uploadFileLength; i++) {
			notification.removeClass("is-hidden is-danger is-success").addClass("is-info").text(`アップロード中…(${i + 1}/${uploadFileLength})`);
			const uploadFile = uploadFiles[i];
			const fd = new FormData();
			fd.append("file", uploadFile);
			await postData(cgi, fd, notification);
		}
		notification.addClass("is-success").text("アップロードが完了しました");
		return false;
	});
}

async function postData(url, data, notificationElem) {
	return $.ajax({
		url: url,
		type: "POST",
		data: data,
		processData: false,
		contentType: false,
		success: (html) => {
			if (html.indexOf("SUCCESS")) {
				getFileList(".");
				$("#filenames").children()[0].remove();
			} else {
				notificationElem.removeClass("is-info").addClass("is-danger").text("エラーが発生しました");
				return;
			}
		}
	});
}

//Document Ready
$(function () {
	// Iniialize global variables.
	currentPath = location.pathname;
	wlansd = new Array();
	// Show the root directory.
	getFileList('');
	// Register onClick handler for <a class="dir">
	$(document).on("click", "a.dir", () => {
		getFileList(this.text);
	});
	$("#file").change((e) => {
		const files = e.target.files;
		$("#filenames").empty();
		for (const file of files) {
			$(`#filenames`).append(`<li>${file.name}</li>`);
		}
		doUpload();
	});
});

