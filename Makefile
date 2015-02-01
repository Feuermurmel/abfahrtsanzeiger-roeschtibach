COMPILED_JS_FILES := $(patsubst src/%.coffee,out/%.js,$(shell find src -name '*.coffee'))
COMPILED_CSS_FILES := $(patsubst src/%.less,out/%.css,$(shell find src -name '*.less'))
COPIED_FILES := $(filter-out $(COMPILED_JS_FILES) $(COMPILED_CSS_FILES),$(patsubst src/%,out/%,$(shell find src -type f -not -name '.*')))
OUT_FILES := $(COMPILED_JS_FILES) $(COMPILED_CSS_FILES) $(COPIED_FILES)

.PHONY: clean all deploy

all: $(OUT_FILES)

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

out/%.js: src/%.coffee
	mkdir -p $$(dirname $@)
	cp $< $@.coffee
	coffee -cm $@.coffee
	mv $@.js $@
	mv $@.js.map $.map

out/%.css: src/%.less
	mkdir -p $$(dirname $@)
	lessc --source-map $< $@

$(COPIED_FILES): out/%: src/%
	mkdir -p $$(dirname $@)
	cp $< $@
