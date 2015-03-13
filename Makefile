
run ::
	node tlbcore/web/server.js oom pong

test:
	mocha --reporter list oom/test_*.js


deploy:
	git commit -am 'deploy' || echo commit failed
	git push deploy master
	cd tlbcore && make deploy
