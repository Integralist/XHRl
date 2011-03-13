(function(window, doc, undef){
	
	// XHRl library
	var XHRl = (function(){
	
		// Private implementation
		var __xhrl = {
		
			/**
			 * Use the correct document accordingly with window argument (sandbox)
			 */
			win: window,
			doc: doc,
			
			/**
			 * Following property indicates whether the current rendering engine is Trident (i.e. Internet Explorer)
			 * 
			 * @return v { Integer|undefined } if IE then returns the version, otherwise returns 'undefined' to indicate NOT a IE browser
			 */
			isIE: (function() {
				var undef,
					 v = 3,
					 div = document.createElement('div'),
					 all = div.getElementsByTagName('i');
			
				while (
					div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
					all[0]
				);
			
				return v > 4 ? v : undef;
			}()),
			
			// Order of the dependancies
			stack: [],
			
			// Errors
			errors: [],
			
			// Length of the stack, used to check whether all scripts were successfully loaded
			stack_length: null,
			
			// A timer which throws an error after the allocated timeout (e.g. once all ajax calls are made, the specified scripts have 'x' seconds to load)
			timeout: null,
		
			/**
			 * XMLHttpRequest abstraction.
			 * 
			 * @return xhr { XMLHttpRequest|ActiveXObject } a new instance of either the native XMLHttpRequest object or the corresponding ActiveXObject
			 */
		 	xhr: (function() {
	
				// Create local variable which will cache the results of this function
				var xhr;
				
				return function() {
					// Check if function has already cached the value
					if (xhr) {
						// Create a new XMLHttpRequest instance
						return new xhr();
					} else {
						// Check what XMLHttpRequest object is available and cache it
						xhr = (!window.XMLHttpRequest) ? function() {
							return new ActiveXObject(
								// Internet Explorer 5 uses a different XMLHTTP object from Internet Explorer 6
								(__xhrl.isIE < 6) ? "Microsoft.XMLHTTP" : "MSXML2.XMLHTTP"
							);
						} : window.XMLHttpRequest;
						
						// Return a new XMLHttpRequest instance
						return new xhr();
					}
				};
				
			}()),
			
			/**
			 * A basic AJAX method.
			 * 
			 * @param settings { Object } user configuration
			 * @return undefined {  } no explicitly returned value
			 */
		 	ajax: function(settings) {
		 	
		 		// JavaScript engine will 'hoist' variables so we'll be specific and declare them here
		 		var xhr, url, requestDone;
		 		
		 		// Load the config object with defaults, if no values were provided by the user
				config = {
					// This is used to determine how big the stack array needs to be
					length: settings.length || 1,
					
					// The URL the request will be made to
					url: settings.url || false,
					
					// the default directory path
					base: settings.base || 'Assets/Scripts/'
				};
				
				// If we splice with an empty array then the re-insertions (dependancy order) break
				// We need the array to have the same number of elements as scripts being processed for loading
				if (config.length > 1) {
					__xhrl.stack.length = config.length;
				}
				
				// Create new cross-browser XMLHttpRequest instance
				xhr = this.xhr();
				
				// Determine the full URL based on configuration object
				url = config.base + config.url;
				
				// Open the asynchronous request
				xhr.open('GET', url, true);
				
				// Initalize a callback which will fire in 5 seconds from now, cancelling the request (if it has not already occurred)
				this.win.setTimeout(function() {
					requestDone = true;
				}, 5000);
				
				// Determine the success of the HTTP response
				function httpSuccess(r) {
					try {
						// If no server status is provided, and we're actually
						// requesting a local file, then it was successful
						return !r.status && location.protocol == 'file:' ||
						
						// Any status in the 200 range is good
						( r.status >= 200 && r.status < 300 ) ||
						
						// Successful if the document has not been modified
						r.status == 304 ||
						
						// Safari returns an empty status if the file has not been modified
						navigator.userAgent.indexOf('Safari') >= 0 && typeof r.status == 'undefined';
					} catch(e){
						// Throw a corresponding error
						throw new Error("httpSuccess = " + e);
					}
					
					// If checking the status failed, then assume that the request failed too
					return false;
				}
				
				// Throw a corresponding error when there is a problem loading the specified JavaScript file
				function onError(xhr) {
					__xhrl.errors.push(url + " { failed } ");
					throw new Error("XHR statusText = " + xhr.statusText);
				}
				
				// xhr is direct access to the XMLHttpRequest object itself
				// e.g. console.log(xhr);
				function onSuccess(xhr) {
					// Because we have to be careful with dependancy order we queue scripts in the order specified
					// We do this by passing in a reference number (settings.counter) which we use to push the returned script data into a stack Array
					// We can't store settings.counter in the config object as that is cached and so ends up just equal to the last index value
					
					// Make sure that the number of scripts being loaded is greater than one
					if (__xhrl.stack.length > 1) {
						// We don't want to splice with a 2nd argument of 1 if it's the last script to be processed (because we will end up removing the script we just inserted!)
						if (settings.counter == (__xhrl.stack.length-1)) {
							__xhrl.stack.splice(settings.counter, 0, xhr.responseText);
						} else {
							// Because we have set a length onto the Array to start off with, this means it will automatically have a set of 'undefined' items
							// The splice method allows us to insert our scripts into the Array but will remove the Array item following it because it'll be an 'undefined' item
							__xhrl.stack.splice(settings.counter, 1, xhr.responseText);
						}
					}
					else {
						// If there is only one script to be processed then we simply splice it by zero and leave it
						__xhrl.stack.splice(settings.counter, 0, xhr.responseText);
					}
					
				}
				
				// Watch for when the state of the document gets updated
				xhr.onreadystatechange = function() {
					// Wait until the data is fully loaded, and make sure that the request hasn't already timed out
					if (xhr.readyState == 4 && !requestDone) {
						// Check to see if the request was successful
						if (httpSuccess(xhr)) {
							// Execute the success callback
							onSuccess(xhr);
						}
						// Otherwise, an error occurred, so execute the error callback
						else {
							onError(xhr);
						}
						
						// Clean up after ourselves, to avoid memory leaks
						xhr = null;
					} else if (requestDone && xhr.readyState != 4) {
						// If the script timed out then keep a log of it so the developer can query this and handle any exceptions
						__xhrl.errors.push(url + " { timed out } ");
						
						// Bail out of the request immediately
						xhr.onreadystatechange = null;
					}
				};
				
				// Establish the connection to the server
				xhr.send(null);
	
			},
			
			/**
			 * Self-executing (i.e. recursive) function which checks stack Array to see if all specified scripts have been loaded
			 * 
			 * @return undefined {  } no explicitly returned value, but will throw an error if any found
			 */
		 	check: function() {
				// Do a quick check for any failures
				if (this.errors.length) {
					throw new Error("Seems there was a problem trying to load one of the provided scripts.");
					return;
				}
				
				// Cache object lookup
				var self = this,
					 i = this.stack_length,
					 stack = this.stack;
				
				// check the stack for any scripts not yet loaded
				while (i--) {
					// If a script is still undefined then break out of the loop as the scripts are still downloading...
					if (stack[i] == undefined) {
						// Check timeout limit hasn't been reached
						if (this.timeout !== null) {
							// Call this function again
							this.win.setTimeout(function() {
								self.check();
							}, 10);
							
							return;
						} 
						// Otherwise the timeout limit has been reached and we must show the developer a list of errors 
						else {
							// Does it look like a 'timeout' issue...
							if (!this.errors.length) {
								throw new Error("Looks like one of your scripts timed out.");
							} 
							// ...otherwise show a generic error and see if the 'errors' log has anything that can help
							else {
								throw new Error("Seems that not all of the scripts you requested to be loaded have been successful? \n" + this.errors);
							}
							return;
						}
					}
				}
				
				// If we've reached this point it looks like all scripts are loaded and ready to be inserted into the page
				this.insert();
				
			},
			
			/**
			 * Inserts individual script files (in correct execution order) into the DOM.
			 * 
			 * @return undefined {  } no explicitly returned value
			 */
		 	insert: function() {
				/*var scriptElem = document.createElement('script'); 
				document.getElementsByTagName('head')[0].appendChild(scriptElem); 
				scriptElem.text = xhrObj.responseText;
				*/
				var doc = this.doc,
					 findscript = doc.getElementsByTagName('script')[0],
					 stack = this.stack,
					 len = this.stack_length,
					 newscript;
				
				// Loop through the stack and insert each script in order into the DOM
				for (var i = 0; i < len; i++) {
					// Create new <script> node
					newscript = doc.createElement("script");
					
					// Find the first <script> tag in the DOM and insert the new script before it.
					// The following technique is the most effective way of locating where to insert new script tags into the DOM.
					// Mainly because for this script to even be run there MUST have been an initial <script> tag!
					findscript.parentNode.insertBefore(newscript, findscript);
					
					// Insert the loaded script content into the new <script> tag
					newscript.text = stack[i];
				}
			}
			
		};
	
		// Return public API
		return {
			/**
			 * This is the only public user API method.
			 * When called with a configuration object it will initialise the rest of the functions required to load the specified scripts
			 * 
			 * @param config { Object } user configuration
			 * @return undefined {  } no explicitly returned value
			 */
		 	load: function(config) {
		 	
		 		// Cache object lookup
				var self = __xhrl,
					 stack = self.stack,
					 seconds,
					 stacklen = self.stack_length,
					 seconds_until_timeout;
				
				// If no object was passed through then show corresponding error...
		 		if (typeof config === 'undefined') {
					throw new Error("You have not complied with the provided API. You need to provide a 'configuration' object literal - please check the documentation!");
				} 
				
				// If no URL was specified then throw a corresponding error...
				else if (!config.url) {
					throw new Error("You need to provide a URL for a JavaScript file to be loaded by the 'xhrl' script loader");
				}
				
				// If an Array of URLs has been passed then we need to process each Array item individually (and then later we can execute in the correct order)
				else if (Object.prototype.toString.call(config.url) === '[object Array]') {
				
					// Default setting for the timeout allowed for each script is 5 seconds
					seconds = config.seconds || 5;
					
					// Keep reference to length of the Array of URLs being passed in
					stacklen = __xhrl.stack_length = config.url.length;
				
					// Loop through Array accessing the specified scripts
					for (var i = 0, len = stacklen; i < len; i++) {
											
						// Call the ajax function individually for each script specified (pass back through the corresponding settings)
						self.ajax({ 
							length: len, // (NOT user defined) used to help with the Array Splice method (for keeping dependancy order)
							counter: i, // (NOT user defined) used for keeping dependancy order
							url: config.url[i], 
							base: config.base
						});
						
					}
					
					// Calculate total script wait length (each script has 5 seconds to load)
					seconds_until_timeout = (stacklen * seconds) * 1000; // Remember! timers use milliseconds, not seconds
					
					// After the allocated time has passed the 'check' function will no longer be called.
					self.timeout = self.win.setTimeout(function() {
						self.timeout = null;
					}, seconds_until_timeout);
					
					// Run a check whether the scripts are loaded (this function will recursively call itself)
					self.check();
					
				} 
				
				// Otherwise call ajax method and pass through configuration settings
				else {
					self.ajax(config);
				}
			
			}
		};
		
	}());
	
	// Expose XHRl to the global object
	window.xhrl = XHRl;
	
}(this, this.document));




