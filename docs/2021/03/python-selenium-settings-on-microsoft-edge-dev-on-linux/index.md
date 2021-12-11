# Python selenium settings on microsoft-edge-dev



## Get Correct Version

```shell
microsoft-edge-dev --version
```

The output is `Microsoft Edge 91.0.831.1 dev` in my case.


## Get Corresponding WebDriver

Find the corresponding version at [msedgewebdriverstorage](https://msedgewebdriverstorage.z22.web.core.windows.net/) and download the zip.

Extract it to you path like `/usr/local/bin` or `$HOME/.local/bin`.


## Write Code

Following is a example.

```python
from msedge.selenium_tools import EdgeOptions, Edge

options = EdgeOptions()
options.use_chromium = True
options.binary_location = r"/usr/bin/microsoft-edge-dev"
options.set_capability("platform", "LINUX")

webdriver_path = r"/home/ayamir/.local/bin/msedgewebdriver"

browser = Edge(options=options, executable_path=webdriver_path)
browser.get("http://localhost:8000")

assert "Django" in browser.title
```


## Launch it

![img](https://i.loli.net/2021/10/09/xneYFgATV6P75Hm.png)


