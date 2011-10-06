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
    socket.on("enqueue", function(data) { add_row(data) });
    socket.on("status", function(data) { set_status(data) });
    socket.on("error", function(data) { set_error(data) });
    socket.on("complete", function(data) { alert("done") });

    // send url to server
    update_display("start", function() {
      socket.emit("start", {url: url});
    });
  };

  function update_display(page, cb) {
    $("body").load("/_" + page + ".html", cb);
  };

  function add_row(data) {
    $("#links").append($("<tr id=\"" + encode(data) + "\">")
                       .append("<td>" + encode(data) + "</td><td class=\"center\"></td>"));
  };

  function encode(t) {
    return $("<div/>").text(t).html();
  };

  function set_status(data) {
    // jquery does not play well with urls as ids
    var row = document.getElementById(data.url)
      , cell = $($(row).children()[1]);

    if (data.code === 200) {
      cell.html("<span class=\"ok\">&#10003;</span>");
    } else if (data.code === 404) {
      cell.html("<span class=\"notfound\">X</span>");
    } else {
      cell.html(data.code);
    }
  }

  function set_error(data) {
    var row = document.getElementById(data.url)
      , cell = $($(row).children()[1]);

    cell.html(data.message);
  }
})();
