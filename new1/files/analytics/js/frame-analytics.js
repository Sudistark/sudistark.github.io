console.log("top.location.href: ",top.location.href)
console.log("self.location.href: ",self.location.href)

if (top.location.href != self.location.href)
     top.location.href = self.location.href;

alert(document.domain)
