
run ::
	node tlbcore/web/server.js oom

test:
	mocha --reporter list oom/test_*.js
