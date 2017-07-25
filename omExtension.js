// Mimic extension
("use strict");
var om = om || {};
om.extension = om.extension || {};
(om.extension = function() {
  (this.initialized = false), (this.loadingElements = []), 
  (this.countOfStaticLoadingElements = -1), (this.staticCheck = 5), 
  (this.ajaxCalls = []);
}), (om.extension.prototype.log = function(txt) {
  // Log events to console, and screen (if jQuery is available).
  // Used for demonstration purposes and to clarify the timing of events only.
  var dt = new Date();
  var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
  try {
    var msg =
      "<span>" + time + "</span>&nbsp;&nbsp;<span>" + txt + "</span><br/>";
    $("#log").append(msg);
  } catch (e) {
    console.log(e);
  }
  console.log(time, txt);
}), (om.extension.prototype.aCallback = function() {
  // Sample callback function called when load complete.
  alert("Load Complete");
}), (om.extension.prototype.detectLoading = function(
  callback = this.aCallback
) {
  // Look for document.readyState complete
  // Then look for any Loading elements
  // Also look for any active ajax calls which could potentially modify the DOM
  // If we think the page is still loading, wait a sec and check again
  if (!this.initialized) {
    // Initialize listeners if not already done
    this.init();
  }
  var msg;
  var self = this;
  if (document.readyState === "complete") {
    if (this.noLoadingElements() && this.ajaxComplete()) {
      callback();
    } else {
      msg = "detectLoading: Waiting for load to complete";
      this.log(msg);
      setTimeout(function() {
        self.detectLoading(callback);
      }, 1000);
    }
  } else {
    msg = "detectLoading: page loading";
    this.log(msg);
    setTimeout(function() {
      self.detectLoading(callback);
    }, 500);
  }
}), (om.extension.prototype.noLoadingElements = function() {
  // Look for elements with text "loading" - This is not very reliable.
  // Some elements may have loading in their text but not be real loaders.
  // So I am looking for changes in the number of elements very early in 
  // the page's life. When the count appears static then stop. 
  // We could also look for elements with class name loader or even 
  // spinner, but I have not done that here.
  if (this.countOfStaticLoadingElements === -1) {
    // init
    this.loadingElements = this.findLoaders();
    this.countOfStaticLoadingElements = this.loadingElements.length;
    return false;
  }
  if (this.countOfStaticLoadingElements === this.loadingElements.length) {
    this.staticCheck--;
  } else {
    this.staticCheck = 5;
    this.countOfStaticLoadingElements = this.loadingElements.length;
  }
  return this.staticCheck <= 0 ? true : false;
}), (om.extension.prototype.findLoaders = function() {
  // Find page elements with the word "loading"
  // To avoid scripts, paragraphs, etc. look only at elements with a few 
  // words in them.
  // Words are case-sensitive so find all text elements, convert to lower
  // case, then use regex. Regex also allows us to search for multiple words
  // if we need to, ie. var re = /loading|waiting/;
  var results = [];
  var xpathResult = document.evaluate(
    ".//*[text()]",
    document.body,
    null,
    XPathResult.ORDERED_NODE_ITERATOR_TYPE,
    null
  );
  var node;
  var targetRegex = /loading/;
  while ((node = xpathResult.iterateNext()) != null) {
    if (
      node.innerText &&
      node.innerText.split(" ").length <= 4 &&
      targetRegex.test(node.innerText.toLowerCase())
    ) {
      results.push(node);
    }
  }
  return results;
}), (om.extension.prototype.ajaxComplete = function() {
  // Look for any in-progress ajax calls
  // I'm not sure if this is required but content is often loaded
  // via ajax. An additional function would be needed to hanle fetch I believe.
  this.ajaxCalls = this.getAJAXRequests();
  return this.ajaxCalls.length ? false : true;
}), (om.extension.prototype.getAJAXRequests = function() {
  // Monkey patch XMLHttpRequest send so we can keep count of
  // active ajax calls.
  var oldSend = XMLHttpRequest.prototype.send,
    currentRequests = [];

  XMLHttpRequest.prototype.send = function() {
    currentRequests.push(this); // add this request to the stack
    console.log("Number of outstanding AJAX calls", currentRequests.length);
    oldSend.apply(this, arguments); // run the original function
    // add an event listener to remove the object from the array
    // when the request is complete
    this.addEventListener(
      "readystatechange",
      function() {
        var idx;
        if (this.readyState === XMLHttpRequest.DONE) {
          idx = currentRequests.indexOf(this);
          if (idx > -1) {
            currentRequests.splice(idx, 1);
          }
        }
      },
      false
    );
  };
  return function() {
    return currentRequests;
  };
}), (om.extension.prototype.ajax = function(url, method, callback) {
  // Sample ajax call - used just for this demonstration
  var oReq = new XMLHttpRequest();
  oReq.open("GET", url, true);
  oReq.responseType = "arraybuffer";
  oReq.onload = function() {
    var blob = new Blob([oReq.response], { type: "image/png" });
    callback(blob);
  };
  oReq.send();
}), (om.extension.prototype.init = function() {
  // Set up listeners for important events
  // Monitor page readyState
  var self = this;
  document.onreadystatechange = function() {
    // When readyState is complete, add listener for DOM Modifications
    // console.log state changes for learning/informational purposes.
    var dt = new Date();
    var time = dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
    switch (document.readyState) {
      case "loading":
        // The document is still loading.
        console.log(time, "onreadystatechange: Loading ...");
        break;
      case "interactive":
        // The document has finished loading. 
        // We can now access the DOM elements.
        console.log(time, "onreadystatechange: Now Interactive.");
        break;
      case "complete":
        // The page is fully loaded.
        console.log(time, "onreadystatechange: Document Complete.");
        setTimeout(function() {
          // Look for loading elements
          document.addEventListener(
            "DOMSubtreeModified",
            function() {
              var dt = new Date();
              var time =
                dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();
              self.loadingElements = self.findLoaders();
              console.log(
                time,
                "DOMSubtreeModified: " +
                  self.loadingElements.length +
                  " loading elements."
              );
            },
            false
          );
        }, 1000);
        break;
    }
  };
  // Track ajax requests
  this.getAJAXRequests();
  // Mark initialization complete
  this.initialized = true;
});
// Instaniate the extension and try to detect when the page stops loading.
var OM = new om.extension();
try {
  OM.detectLoading();
} catch (e) {
  console.log(e);
}
