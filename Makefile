
run ::
	node tlbcore/web/server.js oom

test:
	mocha --reporter list oom/test_*.js


deploy:
	git commit -am 'deploy';
	git push deploy master
	cd tlbcore && make deploy
