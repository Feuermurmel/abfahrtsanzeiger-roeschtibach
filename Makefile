COMPILED_CSS_FILES := $(patsubst src/%.less,out/%.css,$(shell find src -name '*.less'))
COPIED_FILES := $(patsubst src/%,out/%,$(shell find src -type f -not -name '.*'))

.PHONY: clean all deploy

all: $(COMPILED_CSS_FILES) $(COPIED_FILES)

clean:
	rm -rf out deploy

deploy:
	./deploy.sh

out/%.css: out/%.less
	lessc --source-map $< $@

$(COPIED_FILES): out/%: src/%
	@ mkdir -p $$(dirname $@)
	cp $< $@
