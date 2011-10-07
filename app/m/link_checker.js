/* dependencies */
var jsdom = require("jsdom");

/* constructor */
module.exports = LinkChecker = function(host, socket) {
  // state
  this._currently_running = 0;
  this._max_concurrent = 5;
  this._queue = {};

  this._host = (host[host.length - 1] === "/") ? host.substring(0, host.length - 1) : host;
  this._socket = socket;

  // start
  this.add_url_to_queue("/");
  this.run();
};

/* gets a url and adds links to queue if asked
 *
 * @param {String} abs_url
 * @api private
 */
LinkChecker.prototype.get_url = function(abs_url) {
  var self = this;

  http.get(require("url").parse(abs_url), function(response) {
    self._queue[abs_url].code = response.statusCode;
    self._socket.emit("status", { url: abs_url, code: self._queue[abs_url].code });

    var data = "";
    response.on("data", function(d) { data += d });

    response.on("end", function() {
      // exit early if document was empty or if nofollow links is on
      if (!data || !self._queue[abs_url].follow) {
        self.decrement_and_rerun();
        return;
      }

      jsdom.env(data, ['http://code.jquery.com/jquery-1.5.min.js'], function(err, window) {
        var links = window.$("a");
        for (var i = 0, l = links.length; i < l; i++) {
          var link = links[i.toString()];
          if (link._attributes && link._attributes._nodes && link._attributes._nodes.href) {
            var link_href = link._attributes._nodes.href._nodeValue;
            self.add_url_to_queue(link_href, abs_url);
          }
        }

        self.decrement_and_rerun();
      });
    });
  }).on("error", function(err) {
    self.decrement_and_rerun();
    self._socket.emit("error", { url: abs_url, message: err.message });
  });
};

/* add a url to the queue after normalization and sanity checks
 *
 * @param {String} rel_url href from anchor tag
 * @param {String} referenced_by absolute url from which anchor was pulled
 * @api private
 */
LinkChecker.prototype.add_url_to_queue = function(rel_url, referenced_by) {
  // invalid for our purposes
  if (rel_url.indexOf("mailto:") === 0 || rel_url.indexOf("javascript:") === 0 ||
     rel_url.indexOf("#") === 0 || rel_url.indexOf("/#") === 0) return;

  // href is an absolute url
  if (rel_url.indexOf("http://") === 0 || rel_url.indexOf("https://") === 0) {
    var follow = false;
    var abs_url = rel_url;

  // rel_url is, in fact, relative
  } else {
    var follow = true;

    var abs = (rel_url.indexOf("/") === 0);
    if (abs || !referenced_by) {
      var abs_url = this._host + rel_url;

    } else {
      var referenced_path = require("url").parse(referenced_by).pathname;
      var abs_url = this._host + referenced_path + "/" + rel_url;
    }
  }

  // increment reference count or add url to queue
  if (this._queue[abs_url]) {
    this._queue[abs_url].references++;
    // emit socket reference counter
  } else {
    this._queue[abs_url] = { code: null
                           , follow: follow
                           , links: []
                           , references: 0
                           }
    this._socket.emit("enqueue", abs_url);
  }
};

/* runs any pending files if not more than maximumn allowed concurrently
 *
 * @api private
 */
LinkChecker.prototype.run = function() {
  var self = this;

  // get pending urls
  var untouched = [];
  Gourdian._.each(this._queue, function(num, key) {
    if (!self._queue[key].code) untouched.push(key);
  });

  if (untouched.length === 0 && this._currently_running === 0) {
    this.finish();
    return;
  }

  while (untouched && untouched.length > 0 && this._currently_running <= this._max_concurrent) {
    this._currently_running++;

    // ensure code is truthy for next cycle
    var abs_url = untouched.pop();
    this._queue[abs_url].code = -1;

    // put it in the loop
    process.nextTick((function() {
      var bind_url = abs_url;
      return function() { self.get_url(bind_url) };
    })());
  }
};

/* decrement the running counter start running any outstandinging tests
 *
 * @api private
 */
LinkChecker.prototype.decrement_and_rerun = function() {
  this._currently_running--;
  this.run();
}

/* notify the client of processing completion
 *
 * @api private
 */
LinkChecker.prototype.finish = function() {
  this._socket.emit("complete");
};
