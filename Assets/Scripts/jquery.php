<?php
	
	// send the requisite header information and character set 
	header ("content-type: text/javascript; charset: UTF-8");
	
	// Prevent file from returning until set number of seconds from now
	// This is to help the loading order of dependancies
	sleep(5);
	
	// list CSS files to be included
	include('jquery.js');
?>