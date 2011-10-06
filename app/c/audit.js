module.exports = AuditController = function() {
  Controller.call(this);

  this.start = function() {
    this._socket.emit("current", { action: "getting initial document" });
  }
}
inherits(AuditController, Controller);
