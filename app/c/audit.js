var LinkChecker = require("./../m/link_checker");

module.exports = AuditController = function() {
  Controller.call(this);

  this.start = function() {
    new LinkChecker(this._message.url, this._socket);
  }
}
inherits(AuditController, Controller);
