# Python Selenium Settings On Microsoft Edge Dev On Linux



* Get Correct Version
#+BEGIN_SRC shell
microsoft-edge-dev --version
#+END_SRC
The output is `Microsoft Edge 91.0.831.1 dev` in my case.
* Get Corresponding WebDriver
Find the corresponding version at [[https://msedgewebdriverstorage.z22.web.core.windows.net/][msedgewebdriverstorage]] and download the zip.

Extract it to you path like `/usr/local/bin` or `$HOME/.local/bin`.

* Write Code
Following is a example.
#+BEGIN_SRC python
from msedge.selenium_tools import EdgeOptions, Edge

options = EdgeOptions()
options.use_chromium = True
options.binary_location = r"/usr/bin/microsoft-edge-dev"
options.set_capability("platform", "LINUX")

webdriver_path = r"/home/ayamir/.local/bin/msedgewebdriver"

browser = Edge(options=options, executable_path=webdriver_path)
browser.get("http://localhost:8000")

assert "Django" in browser.title
#+END_SRC
* Launch it
[[file:Launch_it/2021-03-26_15-40-04_screenshot.png]]

