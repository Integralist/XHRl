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
			
			// Length of the stack, used to check whether all scripts were successfully loaded
			stack_length: null,
			
			// Check if we need to be in debug mode or not
			debug: false,
			
			// Errors
			errors: [],
			
			// Number of successfully loaded scripts
			success: 0,
			
			/**
			 * Basic Promise implementation.
			 * See the prototype chain
			 * 
			 * @return undefined {  } no explicitly returned value
			 */
			Promise: function() {
				this._thens = [];
			},
			
			/**
			 * Basic Error Handler
			 * 
			 * @param settings { Object } user configuration
			 * @param settings { Object } user configuration
			 * @return undefined {  } no explicitly returned value
			 */
			errorHandler: function(script, type, err) {
				
				// Keep reference to self for the following Closures
				var self = this;
				
				// The first time errorHandler is called we need to manually push the error.
				// We always push the error regardless of whether we're in debug mode or not.
				__xhrl.errors.push({ script:script, type:type, error:err });
					
				// Check whether we're in debug mode or not
				if (self.debug) {
					
					// The first time errorHandler is called we need to manually throw the error.
					throw new Error('\nBefore function rewrite\nScript: ' + script + '\nType: ' + type + '\nError: ' + err);
					
					// ...the next time errorHandler is called it will have been overwritten... (saves us checking for debug mode over & over)
					self.errorHandler = function(script, type, err) {
						// Track the error AND highlight an issue to the user
						__xhrl.errors.push({ type:type, error:err });
						throw new Error('Script: ' + script + '\nType: ' + type + '\nError: ' + err);
					};
					
				} else {
				
					// ...the next time errorHandler is called it will have been overwritten... (saves us checking for debug mode over & over)
					self.errorHandler = function(script, type, err) {
						// Track the error but otherwise don't highlight an issue to the user
						__xhrl.errors.push({ script:script, type:type, error:err });
					};
					
				}
			},
		
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
		 		var self = this, 
		 			 config,
		 			 xhr, 
		 			 url, 
		 			 requestDone, 
		 			 promise = new this.Promise(); // Create new instance of Promise constructor

		 		// Load the config object with defaults, if no values were provided by the user
				config = {
					// This is used to determine how big the stack array needs to be
					length: settings.length || 1,
					
					// The URL the request will be made to
					url: settings.url || false,
					
					// the default directory path
					base: settings.base || 'Assets/Scripts/'
				};
				
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
						// Handle error
						__xhrl.errorHandler(config.url, 'httpSuccess function', e);
					}
					
					// If checking the status failed, then assume that the request failed too
					return false;
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
						
						// We send back the Promise here (rather than outside the if/else statement)
						// because otherwise if there is only one script to load then when the else block
						// is run we'll end up executing the insert() method twice.
						promise.resolve(xhr);
					}
					else {
						// If there is only one script to be processed then we simply set the zero index to the response text
						__xhrl.stack[0] = xhr.responseText;
						
						// And we call the relevant method to insert the script into the DOM
						__xhrl.insert();
					}
					
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
				
				// Establish the connection to the server
				xhr.send(null);
				
				// Watch for when the state of the document gets updated
				xhr.onreadystatechange = function() {
					if (xhr.readyState == 4 && !requestDone) {
						// Check to see if the request was successful
						if (httpSuccess(xhr)) {
							// Execute the success handler
							onSuccess(xhr);
						}
						// Otherwise, an error occurred, so execute the error callback
						else {
							// Reject the Promise
							promise.reject({ script:config.url, type:'httpSuccess failure', error:xhr });
						}
						
						// Clean up after ourselves, to avoid memory leaks
						xhr = null;
					} else if (requestDone && xhr.readyState != 4) {
						// Reject the Promise
						promise.reject({ script:config.url, type:'timeout', error:xhr });
						
						// Bail out of the request immediately
						xhr.onreadystatechange = null;
					}
				};
				
				return promise;
				
			},
			
			/**
			 * Inserts individual script files (in correct execution order) into the DOM.
			 * 
			 * @return undefined {  } no explicitly returned value
			 */
		 	insert: function() {
				// Cache object lookup
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
					 stacklen = self.stack_length;
				
				// If no object was passed through then show corresponding error...
		 		if (typeof config === 'undefined') {
					throw new Error("You have not complied with the provided API. You need to provide a 'configuration' object literal - please check the documentation!");
				} 
				
				// If no URL was specified then throw a corresponding error...
				else if (!config.url) {
					throw new Error("You need to provide a URL for a JavaScript file to be loaded by the 'xhrl' script loader");
				}
				
				// The above two checks superseed whether debug is set to false or not.
				// This is because there MUST be a config object passed through, as the script wont function without it.
				// And because of this I think it's fair to force an error onto the developer if they haven't used the API correctly.
				
				// If an Array of URLs has been passed then we need to process each Array item individually (and then later we can execute in the correct order)
				// In the below expression we not only check for an Array but that the Array length is greater than 1 (for those users who incorrectly use the API)
				else if (Object.prototype.toString.call(config.url) === '[object Array]' && config.url.length > 1) {
					
					// Switch over to debug mode if required
					if (config.debug) {
						self.debug = true;
					}
					
					// Keep reference to length of the Array of URLs being passed in
					stacklen = __xhrl.stack_length = config.url.length;
					
					// Set the length of the stack (so the array will consist of x number of undefined items - which we'll splice() later)
					stack.length = stacklen;
					
					function loadSuccess(response) {
						// Increment the number of successfully loaded scripts
						self.success++;
						
						// If we've successfully loaded all scripts then finish/clean up
						if (self.success === stacklen) {
							// Insert the scripts
							self.insert();
						}
					}
					
					function loadFailure(response) {
						// If the script timed out then keep a log of it 
						// so the developer can query this and handle any exceptions
						__xhrl.errorHandler(response.script, response.type, response.error);
					}
					
					// Loop through Array accessing the specified scripts
					for (var i = 0, len = stacklen; i < len; i++) {
											
						// Call the ajax function individually for each script specified (pass back through the corresponding settings)
						self.ajax({ 
							length: len, // (NOT user defined) used to help with the Array Splice method (for keeping dependancy order)
							counter: i, // (NOT user defined) used for keeping dependancy order
							url: config.url[i], 
							base: config.base
						}).then(loadSuccess, loadFailure);
						
					}
					
				} 
				
				// Otherwise call ajax method and pass through configuration settings
				else {
					
					// Switch over to debug mode if required
					if (config.debug) {
						self.debug = true;
					}
					
					// Make sure the stack length is set to one (as that is the number of scripts being called)
					__xhrl.stack_length = 1;
					
					self.ajax(config);
					
				}
			
			},
			
			// Let users have access to the list of errors
			errors: __xhrl.errors,
			
			// Let users have access to the Promise implementation
			// Also means we can use the prototype chain as our method of implementation
			Promise: __xhrl.Promise
			
		};
	
	}());
	
	// Complete the basic implementation of the Promises design pattern
	XHRl.Promise.prototype = {
		/**
		 * This method stores the callback functions to be executed once a Promise is resolved/rejected.
		 * 
		 * @param onResolve { Function } method to be notified when the promise is complete
		 * @param onReject { Function } method to be notified when the promise has failed
		 * @return this { Object } the Promise constructor
		 */
		then: function (onResolve, onReject) {
			this._thens.push({ resolve: onResolve, reject: onReject });
			return this;
		},
	
		/**
		 * This method is called when a Promise is resolved.
		 * The resolved value (if any) is passed by the resolver to this method.
		 * All waiting onResolve callbacks are called and any future ones are, too, each being passed the resolved value.
		 * 
		 * @param val { Primitive } the resolved value could be any valid JavaScript primitive (Boolean, String, Number, Null, Undefined) or an Object.
		 * @return undefined {  } no explicitly returned value
		 */
		resolve: function (val) { 
			this._complete('resolve', val); 
		},
	
		/**
		 * This method is called when a Promise cannot be resolved.
		 * Typically, you'd pass an exception as the single parameter, but any other argument, including none at all, is acceptable.
		 * All waiting (and all future) onReject callbacks are called when reject() is called and are passed the exception parameter.
		 * 
		 * @param ex { x } the exception value
		 * @return undefined {  } no explicitly returned value
		 */
		reject: function (ex) { 
			this._complete('reject', ex); 
		},
	
		/**
		 * This is a private method which determines which methods to be executed.
		 * 
		 * @param which { String } either 'resolve' or 'reject'
		 * @param arg { Primitive } the resolved value could be any valid JavaScript primitive (Boolean, String, Number, Null, Undefined) or an Object.
		 * @return undefined {  } no explicitly returned value
		 */
		_complete: function (which, arg) {
			// Switch over to sync then()
			this.then = which === 'resolve' ?
				function (resolve, reject) { 
					resolve && resolve(arg); return this; 
				} :
				function (resolve, reject) { 
					reject && reject(arg); return this; 
				};
				
			// Disallow multiple calls to resolve or reject
			this.resolve = this.reject = function () { 
				throw new Error('Promise already completed.'); 
			};
				
			// Complete all waiting (async) then()s
			var aThen, i = 0;
			
			while (aThen = this._thens[i++]) { 
				aThen[which] && aThen[which](arg); 
			}
			
			delete this._thens;
		}
	}
	
	// Expose XHRl to the global object
	window.xhrl = XHRl;
	
}(this, this.document));




