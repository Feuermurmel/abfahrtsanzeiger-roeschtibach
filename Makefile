COMPILED_CSS_FILES := $(patsubst src/%.less,out/%.css,$(shell find src -name '*.less'))
COPIED_FILES := $(patsubst src/%,out/%,$(shell find src -type f -not -name '.*'))

.PHONY: clean all deploy

all: $(COMPILED_CSS_FILES) $(COPIED_FILES)

clean:
	rm -rf out deploy

deploy:
	rm -rf deploy
	mkdir deploy
	git clone . deploy
	cd deploy; \
		commit=$$(git rev-parse HEAD); \
		$(MAKE) all; \
		cd out; \
		git init; \
		git add .; \
		git commit -m "Deployed from commit $$commit."
	git fetch -f deploy/out HEAD:gh-pages
	git push -f origin gh-pages

out/%.css: out/%.less
	lessc --source-map $< $@

$(COPIED_FILES): out/%: src/%
	@ mkdir -p $$(dirname $@)
	cp $< $@
