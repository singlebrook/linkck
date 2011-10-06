var audit = (function() {
  // constructor
  $(document).ready(function() {
    update_display("form", function() {
      $("#start").click(start_audit);
    });
  });

  // private
  var socket = io.connect("http://localhost:8124/");

  function start_audit() {
    // preserve state
    var url = $("#url").val();

    // set up events
    socket.on("current", function(data) { update_current(data) });

    // send url to server
    update_display("start", function() {
      socket.emit("start", {url: url});
    });
  };

  function update_display(page, cb) {
    $("body").load("/_" + page + ".html", cb);
  };

  function update_current(data) {
    $("#current").html(data.action);
  };
})();
