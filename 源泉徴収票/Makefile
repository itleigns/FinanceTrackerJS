data.json: cleanse_data.js data.csv
	node cleanse_data.js

verify: verify.js data.json
	npm test -- $(shell pwd)/verify.js