# amazon-scraper
#prereqs: have node.js and git installed

2 install, git clone https://github.com/FDHamza/amazon-scraper.git   cd amazon-scraper

then npm install

2 use:

node index.js "[first variable]" "[second variable]"

first variable is the name of the item you are searching for, second variable is price range. An example will be shown below

Looking for a lamp under 30 bucks?
node index.js "lamp" "30<"

if your specifications were too broad, it will give the 5 highest rating items under your specifications.
