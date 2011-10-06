module.exports = AuditController = function() {
  Controller.call(this);

  this.create = function() {
    return {sampe: "output"};
  }
}
inherits(AuditController, Controller);
